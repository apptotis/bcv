-- ==============================================================================
-- CORREÇÃO OFICIAL: Classificação do CN2 (Seniores Masculinos)
-- Remover jogo espúrio de Sub 18 (SC Maria da Fonte) da série do CN2
-- Basket Clube de Valença (Época 2026/2027)
-- ==============================================================================

DO $$
DECLARE
    v_dados JSONB;
    v_comp JSONB;
    v_jogos JSONB;
    v_tabela JSONB;
    v_novo_dados JSONB := '[]'::jsonb;
    v_elem JSONB;
BEGIN
    SELECT dados INTO v_dados FROM public.clube_config WHERE chave = 'competicoes';
    
    IF v_dados IS NULL THEN
        RAISE NOTICE 'Nenhum registo encontrado para a chave competicoes.';
        RETURN;
    END IF;

    FOR v_comp IN SELECT * FROM jsonb_array_elements(v_dados)
    LOOP
        IF (v_comp->>'id' = 'cn2') OR (LOWER(v_comp->>'sigla') = 'cn2') THEN
            -- 1. Filtrar jogos_serie removendo SC Maria da Fonte
            SELECT COALESCE(jsonb_agg(j), '[]'::jsonb)
            INTO v_jogos
            FROM jsonb_array_elements(COALESCE(v_comp->'jogos_serie', '[]'::jsonb)) AS j
            WHERE NOT (
                LOWER(j->>'equipa_casa') LIKE '%maria%' OR 
                LOWER(j->>'equipa_fora') LIKE '%maria%'
            );

            -- 2. Filtrar tabela_serie removendo SC Maria da Fonte e ajustando estatísticas do BC Valença
            SELECT COALESCE(jsonb_agg(
                CASE 
                    WHEN LOWER(eq->>'nome') LIKE '%valen%' THEN
                        jsonb_build_object(
                            'pos', 6,
                            'nome', 'BC Valença',
                            'logo', COALESCE(eq->>'logo', 'https://sav2.fpb.pt/uploads/clubes/logotipo/CLU_6561737484866.png'),
                            'j', 5,
                            'v', 4,
                            'd', 1,
                            'pm', 391,
                            'ps', 348,
                            'dif', 43,
                            'pts', 9
                        )
                    ELSE eq
                END
            ), '[]'::jsonb)
            INTO v_tabela
            FROM jsonb_array_elements(COALESCE(v_comp->'tabela_serie', '[]'::jsonb)) AS eq
            WHERE NOT (LOWER(eq->>'nome') LIKE '%maria%');

            -- Reconstruir competição CN2
            v_comp := jsonb_set(v_comp, '{jogos_serie}', v_jogos);
            v_comp := jsonb_set(v_comp, '{tabela_serie}', v_tabela);
        END IF;

        v_novo_dados := v_novo_dados || jsonb_build_array(v_comp);
    END LOOP;

    -- Atualizar na base de dados
    UPDATE public.clube_config
    SET dados = v_novo_dados,
        updated_at = NOW()
    WHERE chave = 'competicoes';

    RAISE NOTICE 'Classificação do CN2 corrigida com sucesso na tabela clube_config!';
END $$;

-- Verificação:
SELECT 
    jsonb_array_length(comp->'jogos_serie') AS total_jogos_cn2,
    jsonb_array_length(comp->'tabela_serie') AS total_equipas_cn2
FROM public.clube_config,
LATERAL jsonb_array_elements(dados) AS comp
WHERE chave = 'competicoes' AND (comp->>'id' = 'cn2' OR comp->>'sigla' = 'CN2');

