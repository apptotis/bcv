-- =========================================================================
-- SETUP: Adicionar Suporte a Emblemas das Equipas da FPB
-- Tabelas: agenda_bcv e resultados_bcv
-- =========================================================================

-- 1. Adicionar colunas de logotipo na agenda_bcv
ALTER TABLE IF EXISTS public.agenda_bcv 
    ADD COLUMN IF NOT EXISTS logo_casa TEXT,
    ADD COLUMN IF NOT EXISTS logo_fora TEXT;

-- 2. Adicionar colunas de logotipo na resultados_bcv
ALTER TABLE IF EXISTS public.resultados_bcv 
    ADD COLUMN IF NOT EXISTS logo_casa TEXT,
    ADD COLUMN IF NOT EXISTS logo_fora TEXT;

-- 3. Atualizar a RPC oficial de sincronização da FPB
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
    v_logo_casa TEXT;
    v_logo_fora TEXT;
    v_is_resultado BOOLEAN;
    v_pontos_casa INTEGER;
    v_pontos_fora INTEGER;

    v_novos_agendados INTEGER := 0;
    v_atualizados_agendados INTEGER := 0;
    v_novos_resultados INTEGER := 0;
    v_atualizados_resultados INTEGER := 0;
    v_removidos_da_agenda INTEGER := 0;
    v_existing_id BIGINT;
BEGIN
    FOR jogo IN SELECT * FROM jsonb_array_elements(jogos_payload)
    LOOP
        v_fpb_id := jogo->>'fpb_id';
        v_data_jogo := (jogo->>'data_jogo')::DATE;
        v_hora_jogo := jogo->>'hora_jogo';
        v_equipa_casa := TRIM(jogo->>'equipa_casa');
        v_equipa_fora := TRIM(jogo->>'equipa_fora');
        v_local := TRIM(jogo->>'local');
        v_escalao := TRIM(jogo->>'escalao');
        v_competicao := TRIM(jogo->>'competicao');
        v_logo_casa := TRIM(jogo->>'logo_casa');
        v_logo_fora := TRIM(jogo->>'logo_fora');
        v_is_resultado := COALESCE((jogo->>'is_resultado')::BOOLEAN, false);
        v_pontos_casa := (jogo->>'pontos_casa')::INTEGER;
        v_pontos_fora := (jogo->>'pontos_fora')::INTEGER;

        IF v_is_resultado THEN
            -- É um resultado
            SELECT id INTO v_existing_id FROM public.resultados_bcv 
            WHERE (fpb_id = v_fpb_id AND v_fpb_id IS NOT NULL)
               OR (data_jogo = v_data_jogo AND equipa_casa = v_equipa_casa AND equipa_fora = v_equipa_fora)
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                UPDATE public.resultados_bcv SET
                    pontos_casa = v_pontos_casa,
                    pontos_fora = v_pontos_fora,
                    local = COALESCE(v_local, local),
                    escalao = COALESCE(v_escalao, escalao),
                    competicao = COALESCE(v_competicao, competicao),
                    logo_casa = COALESCE(v_logo_casa, logo_casa),
                    logo_fora = COALESCE(v_logo_fora, logo_fora),
                    fpb_id = COALESCE(v_fpb_id, fpb_id)
                WHERE id = v_existing_id;
                v_atualizados_resultados := v_atualizados_resultados + 1;
            ELSE
                INSERT INTO public.resultados_bcv (
                    data_jogo, hora_jogo, equipa_casa, equipa_fora,
                    pontos_casa, pontos_fora, local, escalao,
                    competicao, fpb_id, logo_casa, logo_fora, publicado
                ) VALUES (
                    v_data_jogo, v_hora_jogo, v_equipa_casa, v_equipa_fora,
                    v_pontos_casa, v_pontos_fora, v_local, v_escalao,
                    v_competicao, v_fpb_id, v_logo_casa, v_logo_fora, true
                );
                v_novos_resultados := v_novos_resultados + 1;
            END IF;

            -- Remover da agenda se existia
            DELETE FROM public.agenda_bcv 
            WHERE (fpb_id = v_fpb_id AND v_fpb_id IS NOT NULL)
               OR (data_jogo = v_data_jogo AND equipa_casa = v_equipa_casa AND equipa_fora = v_equipa_fora);
            IF FOUND THEN
                v_removidos_da_agenda := v_removidos_da_agenda + 1;
            END IF;

        ELSE
            -- É um jogo futuro / agendado
            SELECT id INTO v_existing_id FROM public.agenda_bcv 
            WHERE (fpb_id = v_fpb_id AND v_fpb_id IS NOT NULL)
               OR (data_jogo = v_data_jogo AND equipa_casa = v_equipa_casa AND equipa_fora = v_equipa_fora)
            LIMIT 1;

            IF v_existing_id IS NOT NULL THEN
                UPDATE public.agenda_bcv SET
                    hora_jogo = COALESCE(v_hora_jogo, hora_jogo),
                    local = COALESCE(v_local, local),
                    escalao = COALESCE(v_escalao, escalao),
                    competicao = COALESCE(v_competicao, competicao),
                    logo_casa = COALESCE(v_logo_casa, logo_casa),
                    logo_fora = COALESCE(v_logo_fora, logo_fora),
                    fpb_id = COALESCE(v_fpb_id, fpb_id)
                WHERE id = v_existing_id;
                v_atualizados_agendados := v_atualizados_agendados + 1;
            ELSE
                INSERT INTO public.agenda_bcv (
                    data_jogo, hora_jogo, equipa_casa, equipa_fora,
                    local, escalao, competicao, fpb_id, logo_casa, logo_fora, publicado
                ) VALUES (
                    v_data_jogo, v_hora_jogo, v_equipa_casa, v_equipa_fora,
                    v_local, v_escalao, v_competicao, v_fpb_id, v_logo_casa, v_logo_fora, true
                );
                v_novos_agendados := v_novos_agendados + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'novos_agendados', v_novos_agendados,
        'atualizados_agendados', v_atualizados_agendados,
        'novos_resultados', v_novos_resultados,
        'atualizados_resultados', v_atualizados_resultados,
        'removidos_da_agenda', v_removidos_da_agenda
    );
END;
$$;
