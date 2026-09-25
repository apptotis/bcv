-- =========================================================================
-- SETUP: Sincronização Oficial FPB (Federação Portuguesa de Basquetebol)
-- Basket Clube de Valença (Clube FPB ID: 656)
-- Tabelas: agenda_bcv e resultados_bcv
-- =========================================================================

-- 1. Garantir colunas necessárias na tabela agenda_bcv
ALTER TABLE IF EXISTS public.agenda_bcv 
    ADD COLUMN IF NOT EXISTS fpb_id TEXT,
    ADD COLUMN IF NOT EXISTS competicao TEXT;

CREATE INDEX IF NOT EXISTS idx_agenda_bcv_fpb_id ON public.agenda_bcv(fpb_id);
CREATE INDEX IF NOT EXISTS idx_agenda_bcv_data ON public.agenda_bcv(data_jogo);

-- 2. Garantir colunas necessárias na tabela resultados_bcv
ALTER TABLE IF EXISTS public.resultados_bcv 
    ADD COLUMN IF NOT EXISTS fpb_id TEXT,
    ADD COLUMN IF NOT EXISTS local TEXT,
    ADD COLUMN IF NOT EXISTS competicao TEXT;

CREATE INDEX IF NOT EXISTS idx_resultados_bcv_fpb_id ON public.resultados_bcv(fpb_id);
CREATE INDEX IF NOT EXISTS idx_resultados_bcv_data ON public.resultados_bcv(data_jogo);

-- 3. Função RPC inteligente para sincronizar jogos da FPB
CREATE OR REPLACE FUNCTION public.sincronizar_jogos_fpb(jogos_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    jogo JSONB;
    v_fpb_id TEXT;
    v_data_jogo DATE;
    v_hora_jogo TEXT;
    v_equipa_casa TEXT;
    v_equipa_fora TEXT;
    v_local TEXT;
    v_escalao TEXT;
    v_competicao TEXT;
    v_is_resultado BOOLEAN;
    v_pontos_casa INTEGER;
    v_pontos_fora INTEGER;

    v_novos_agendados INTEGER := 0;
    v_atualizados_agendados INTEGER := 0;
    v_novos_resultados INTEGER := 0;
    v_atualizados_resultados INTEGER := 0;
    v_removidos_da_agenda INTEGER := 0;

    v_existing_id UUID;
BEGIN
    FOR jogo IN SELECT * FROM jsonb_array_elements(jogos_payload)
    LOOP
        v_fpb_id := jogo->>'fpb_id';
        v_data_jogo := (jogo->>'data_jogo')::DATE;
        v_hora_jogo := jogo->>'hora_jogo';
        v_equipa_casa := TRIM(jogo->>'equipa_casa');
        v_equipa_fora := TRIM(jogo->>'equipa_fora');
        v_local := TRIM(jogo->>'local');
        v_escalao := COALESCE(jogo->>'escalao', 'BCV');
        v_competicao := TRIM(jogo->>'competicao');
        v_is_resultado := COALESCE((jogo->>'is_resultado')::BOOLEAN, false);

        IF v_is_resultado THEN
            v_pontos_casa := (jogo->>'pontos_casa')::INTEGER;
            v_pontos_fora := (jogo->>'pontos_fora')::INTEGER;

            -- A) Se for resultado, verificar se já existe em resultados_bcv
            SELECT id INTO v_existing_id 
            FROM public.resultados_bcv 
            WHERE (v_fpb_id IS NOT NULL AND fpb_id = v_fpb_id)
               OR (data_jogo = v_data_jogo AND LOWER(equipa_casa) = LOWER(v_equipa_casa) AND LOWER(equipa_fora) = LOWER(v_equipa_fora))
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                UPDATE public.resultados_bcv
                SET pontos_casa = v_pontos_casa,
                    pontos_fora = v_pontos_fora,
                    data_jogo = v_data_jogo,
                    local = COALESCE(v_local, local),
                    competicao = COALESCE(v_competicao, competicao),
                    escalao = COALESCE(v_escalao, escalao),
                    fpb_id = COALESCE(v_fpb_id, fpb_id)
                WHERE id = v_existing_id;
                v_atualizados_resultados := v_atualizados_resultados + 1;
            ELSE
                INSERT INTO public.resultados_bcv (
                    data_jogo, equipa_casa, equipa_fora, pontos_casa, pontos_fora, escalao, local, competicao, fpb_id
                ) VALUES (
                    v_data_jogo, v_equipa_casa, v_equipa_fora, v_pontos_casa, v_pontos_fora, v_escalao, v_local, v_competicao, v_fpb_id
                );
                v_novos_resultados := v_novos_resultados + 1;
            END IF;

            -- B) Remover ou limpar da agenda se este jogo ainda estiver agendado
            DELETE FROM public.agenda_bcv
            WHERE (v_fpb_id IS NOT NULL AND fpb_id = v_fpb_id)
               OR (data_jogo = v_data_jogo AND LOWER(equipa_casa) = LOWER(v_equipa_casa) AND LOWER(equipa_fora) = LOWER(v_equipa_fora));
            
            IF FOUND THEN
                v_removidos_da_agenda := v_removidos_da_agenda + 1;
            END IF;

        ELSE
            -- Se for jogo futuro (Agenda)
            SELECT id INTO v_existing_id 
            FROM public.agenda_bcv 
            WHERE (v_fpb_id IS NOT NULL AND fpb_id = v_fpb_id)
               OR (data_jogo = v_data_jogo AND LOWER(equipa_casa) = LOWER(v_equipa_casa) AND LOWER(equipa_fora) = LOWER(v_equipa_fora))
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                UPDATE public.agenda_bcv
                SET hora_jogo = COALESCE(v_hora_jogo, hora_jogo),
                    data_jogo = v_data_jogo,
                    local = COALESCE(v_local, local),
                    competicao = COALESCE(v_competicao, competicao),
                    escalao = COALESCE(v_escalao, escalao),
                    fpb_id = COALESCE(v_fpb_id, fpb_id)
                WHERE id = v_existing_id;
                v_atualizados_agendados := v_atualizados_agendados + 1;
            ELSE
                INSERT INTO public.agenda_bcv (
                    data_jogo, hora_jogo, equipa_casa, equipa_fora, local, escalao, competicao, fpb_id
                ) VALUES (
                    v_data_jogo, v_hora_jogo, v_equipa_casa, v_equipa_fora, v_local, v_escalao, v_competicao, v_fpb_id
                );
                v_novos_agendados := v_novos_agendados + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'sucesso', true,
        'novos_agendados', v_novos_agendados,
        'atualizados_agendados', v_atualizados_agendados,
        'novos_resultados', v_novos_resultados,
        'atualizados_resultados', v_atualizados_resultados,
        'removidos_da_agenda', v_removidos_da_agenda,
        'total_processados', jsonb_array_length(jogos_payload)
    );
END;
$$;

-- Permissões de execução para a função RPC
GRANT EXECUTE ON FUNCTION public.sincronizar_jogos_fpb(JSONB) TO anon, authenticated, service_role;
