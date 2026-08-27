-- ==============================================================================
-- SCRIPT DE DETEÇÃO, FUSÃO E RESOLUÇÃO DE DUPLICADOS: TABELA atletasbcv
-- Basket Clube de Valença (BCV)
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- ==============================================================================
-- 1. CONSULTA DE AUDITORIA: IDENTIFICAR POSSÍVEIS DUPLICADOS EXISTENTES
-- ==============================================================================

-- A. Listar atletas com o mesmo Nome Completo
SELECT 
    nome, 
    COUNT(*) as total_registos,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(COALESCE(licenca, 'Sem licença'), ', ') as licencas,
    STRING_AGG(COALESCE(epoca, 'Sem época'), ', ') as epocas
FROM public.atletasbcv
GROUP BY nome
HAVING COUNT(*) > 1;

-- B. Listar atletas com o mesmo NIF (se preenchido)
SELECT 
    nif,
    COUNT(*) as total_registos,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(nome, ' | ') as nomes
FROM public.atletasbcv
WHERE nif IS NOT NULL AND TRIM(nif) != ''
GROUP BY nif
HAVING COUNT(*) > 1;

-- C. Listar atletas com o mesmo Nº de Licença FPB (se preenchido)
SELECT 
    licenca,
    COUNT(*) as total_registos,
    STRING_AGG(id::text, ', ') as ids_encontrados,
    STRING_AGG(nome, ' | ') as nomes
FROM public.atletasbcv
WHERE licenca IS NOT NULL AND TRIM(licenca) != ''
GROUP BY licenca
HAVING COUNT(*) > 1;


-- ==============================================================================
-- 2. FUSÃO AUTOMÁTICA E LIMPEZA: CASO "Diogo Miguel Mota Moreira"
--    (Transfere os novos dados de 2026/2027 para a ficha com licença e apaga o duplicado)
-- ==============================================================================

DO $$
DECLARE
    v_id_principal INT;
    v_id_duplicado INT;
    v_rec_novo RECORD;
BEGIN
    -- 1. Encontrar o registo histórico/principal (que tem a licença FPB ou época anterior)
    SELECT id INTO v_id_principal
    FROM public.atletasbcv
    WHERE nome ILIKE '%Diogo Miguel Mota Moreira%'
      AND licenca IS NOT NULL AND TRIM(licenca) != ''
    ORDER BY id ASC
    LIMIT 1;

    -- Se não achou por licença, procura pelo ID mais antigo
    IF v_id_principal IS NULL THEN
        SELECT id INTO v_id_principal
        FROM public.atletasbcv
        WHERE nome ILIKE '%Diogo Miguel Mota Moreira%'
        ORDER BY id ASC
        LIMIT 1;
    END IF;

    -- 2. Encontrar o registo duplicado mais recente (criado pela nova inscrição)
    SELECT * INTO v_rec_novo
    FROM public.atletasbcv
    WHERE nome ILIKE '%Diogo Miguel Mota Moreira%'
      AND id != v_id_principal
    ORDER BY id DESC
    LIMIT 1;

    -- 3. Se existirem os 2 registos, fundir os dados no principal e remover o duplicado
    IF v_id_principal IS NOT NULL AND v_rec_novo.id IS NOT NULL THEN
        v_id_duplicado := v_rec_novo.id;
        
        RAISE NOTICE 'A fundir registos: Principal ID % <- Duplicado ID %', v_id_principal, v_id_duplicado;

        -- Copiar todos os novos dados submetidos na inscrição para o registo principal
        UPDATE public.atletasbcv
        SET
            tipo_inscricao          = COALESCE(v_rec_novo.tipo_inscricao, tipo_inscricao, 'Revalidação'),
            estatuto_fpb            = COALESCE(v_rec_novo.estatuto_fpb, estatuto_fpb),
            data_nascimento         = COALESCE(v_rec_novo.data_nascimento, data_nascimento),
            sexo                    = COALESCE(v_rec_novo.sexo, sexo),
            nacionalidade           = COALESCE(v_rec_novo.nacionalidade, nacionalidade),
            pais_nascimento         = COALESCE(v_rec_novo.pais_nascimento, pais_nascimento),
            tipo_doc_id             = COALESCE(v_rec_novo.tipo_doc_id, tipo_doc_id),
            num_doc_id             = COALESCE(v_rec_novo.num_doc_id, num_doc_id),
            validade_doc_id         = COALESCE(v_rec_novo.validade_doc_id, validade_doc_id),
            nif                     = COALESCE(v_rec_novo.nif, nif),
            telefone                = COALESCE(v_rec_novo.telefone, telefone),
            email                   = COALESCE(v_rec_novo.email, email),
            morada                  = COALESCE(v_rec_novo.morada, morada),
            codigo_postal           = COALESCE(v_rec_novo.codigo_postal, codigo_postal),
            localidade              = COALESCE(v_rec_novo.localidade, localidade),
            concelho                = COALESCE(v_rec_novo.concelho, concelho),
            distrito                = COALESCE(v_rec_novo.distrito, distrito),
            tipo_seguro             = COALESCE(v_rec_novo.tipo_seguro, tipo_seguro),
            seguro_apolice          = COALESCE(v_rec_novo.seguro_apolice, seguro_apolice),
            seguro_companhia        = COALESCE(v_rec_novo.seguro_companhia, seguro_companhia),
            encarregado_nome        = COALESCE(v_rec_novo.encarregado_nome, encarregado_nome),
            encarregado_qualidade   = COALESCE(v_rec_novo.encarregado_qualidade, encarregado_qualidade),
            encarregado_tipo_doc    = COALESCE(v_rec_novo.encarregado_tipo_doc, encarregado_tipo_doc),
            encarregado_num_doc     = COALESCE(v_rec_novo.encarregado_num_doc, encarregado_num_doc),
            encarregado_validade_doc= COALESCE(v_rec_novo.encarregado_validade_doc, encarregado_validade_doc),
            encarregado_email       = COALESCE(v_rec_novo.encarregado_email, encarregado_email),
            encarregado_telefone    = COALESCE(v_rec_novo.encarregado_telefone, encarregado_telefone),
            rgpd_politica           = COALESCE(v_rec_novo.rgpd_politica, rgpd_politica),
            rgpd_comunicacoes       = COALESCE(v_rec_novo.rgpd_comunicacoes, rgpd_comunicacoes),
            rgpd_marketing          = COALESCE(v_rec_novo.rgpd_marketing, rgpd_marketing),
            epoca                   = '2026/2027',
            escalao                 = COALESCE(v_rec_novo.escalao, escalao),
            funcao                  = COALESCE(v_rec_novo.funcao, funcao, 'Jogador'),
            emd_respostas           = COALESCE(v_rec_novo.emd_respostas, emd_respostas),
            emd_resultado_anterior  = COALESCE(v_rec_novo.emd_resultado_anterior, emd_resultado_anterior),
            equipamento_tamanho     = COALESCE(v_rec_novo.equipamento_tamanho, equipamento_tamanho),
            equipamento_tamanho_calcao = COALESCE(v_rec_novo.equipamento_tamanho_calcao, equipamento_tamanho_calcao),
            equipamento_nome_camisola  = COALESCE(v_rec_novo.equipamento_nome_camisola, equipamento_nome_camisola),
            equipamento_numero_1    = COALESCE(v_rec_novo.equipamento_numero_1, equipamento_numero_1),
            equipamento_numero_2    = COALESCE(v_rec_novo.equipamento_numero_2, equipamento_numero_2),
            nickname                = COALESCE(v_rec_novo.nickname, nickname, v_rec_novo.equipamento_nome_camisola)
        WHERE id = v_id_principal;

        -- Reencaminhar registos associados caso existam as tabelas respetivas
        IF to_regclass('public.presencas') IS NOT NULL THEN
            EXECUTE 'UPDATE public.presencas SET atleta_id = $1 WHERE atleta_id = $2' USING v_id_principal, v_id_duplicado;
        END IF;

        IF to_regclass('public.mensalidades') IS NOT NULL THEN
            EXECUTE 'UPDATE public.mensalidades SET atleta_id = $1 WHERE atleta_id = $2' USING v_id_principal, v_id_duplicado;
        END IF;

        -- Eliminar registo duplicado
        DELETE FROM public.atletasbcv WHERE id = v_id_duplicado;

        RAISE NOTICE 'Fusão concluída com sucesso! Registo mantido: ID % (Licença mantida)', v_id_principal;
    ELSE
        RAISE NOTICE 'Não foram encontrados registos duplicados para Diogo Miguel Mota Moreira ou já foram unificados.';
    END IF;
END $$;


-- ==============================================================================
-- 3. VERIFICAÇÃO FINAL APÓS A FUSÃO
-- ==============================================================================
SELECT id, nome, licenca, nif, escalao, epoca, tipo_inscricao, equipamento_nome_camisola, equipamento_numero_1
FROM public.atletasbcv
WHERE nome ILIKE '%Diogo Miguel Mota Moreira%';
