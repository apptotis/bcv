-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO COMPLETA: TABELA atletasbcv (INSCRIÇÕES 2026/2027)
-- Basket Clube de Valença (BCV)
-- Execute este script no SQL Editor do seu painel Supabase
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DA FEDERAÇÃO PORTUGUESA DE BASQUETEBOL (FPB - MODELO 1)
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_inscricao VARCHAR(50) DEFAULT 'Revalidação';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS estatuto_fpb VARCHAR(50) DEFAULT 'FBP';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS pais_nascimento VARCHAR(100) DEFAULT 'Portugal';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_doc_id VARCHAR(50) DEFAULT 'Cartão Cidadão';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS num_doc_id VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS validade_doc_id DATE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS nif VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS morada TEXT;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS localidade VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS concelho VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS distrito VARCHAR(100);

-- Seguro Desportivo
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_seguro VARCHAR(50) DEFAULT 'Seguro FPB';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS seguro_apolice VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS seguro_companhia VARCHAR(100);

-- RGPD
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_politica BOOLEAN DEFAULT TRUE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_comunicacoes BOOLEAN DEFAULT TRUE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_marketing BOOLEAN DEFAULT TRUE;

-- Encarregado de Educação
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_nome VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_qualidade VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_tipo_doc VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_num_doc VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_validade_doc DATE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_email VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_telefone VARCHAR(30);

-- 2. ADICIONAR COLUNAS DE EXAME MÉDICO DESPORTIVO (EMD / IPDJ)
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS emd_respostas JSONB;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS emd_resultado_anterior TEXT DEFAULT 'Apto sem restrições';

-- 3. ADICIONAR COLUNAS DE EQUIPAMENTO OFICIAL BCV
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_tamanho VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_tamanho_calcao VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_nome_camisola VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_numero_1 VARCHAR(10);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_numero_2 VARCHAR(10);

-- 4. GARANTIR PERMISSÕES DE ACESSO PÚBLICO (ANON) PARA INSCRIÇÃO ONLINE
GRANT ALL ON TABLE public.atletasbcv TO anon, authenticated, service_role;

-- 5. CONFIGURAR POLÍTICAS RLS (ROW LEVEL SECURITY)
ALTER TABLE public.atletasbcv ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Permitir INSERT para utilizadores anónimos e autenticados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'atletasbcv' AND policyname = 'Permitir insercao de inscricoes online'
    ) THEN
        CREATE POLICY "Permitir insercao de inscricoes online" ON public.atletasbcv
        FOR INSERT TO anon, authenticated
        WITH CHECK (true);
    END IF;

    -- Permitir SELECT para pesquisa e validação
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'atletasbcv' AND policyname = 'Permitir leitura de atletas'
    ) THEN
        CREATE POLICY "Permitir leitura de atletas" ON public.atletasbcv
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;

    -- Permitir UPDATE para revalidação de inscrições
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'atletasbcv' AND policyname = 'Permitir atualizacao de inscricoes online'
    ) THEN
        CREATE POLICY "Permitir atualizacao de inscricoes online" ON public.atletasbcv
        FOR UPDATE TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;
