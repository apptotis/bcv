-- ==============================================================================
-- SISTEMA DE GESTÃO DE EQUIPAS E PLANTÉIS (N:M) - BASKET CLUBE DE VALENÇA
-- Criação da tabela de ligação equipas_atletas
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. GARANTIR A EXISTÊNCIA DA TABELA BASE DE EQUIPAS (equipasbcv)
CREATE TABLE IF NOT EXISTS public.equipasbcv (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    epoca VARCHAR(20) DEFAULT '2026/2027',
    escalao VARCHAR(50) NOT NULL,
    sexo VARCHAR(50) DEFAULT 'Todos',
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas essenciais se equipasbcv já existir
ALTER TABLE public.equipasbcv ADD COLUMN IF NOT EXISTS epoca VARCHAR(20) DEFAULT '2026/2027';
ALTER TABLE public.equipasbcv ADD COLUMN IF NOT EXISTS escalao VARCHAR(50);
ALTER TABLE public.equipasbcv ADD COLUMN IF NOT EXISTS sexo VARCHAR(50) DEFAULT 'Todos';
ALTER TABLE public.equipasbcv ADD COLUMN IF NOT EXISTS foto TEXT;

-- 2. CRIAR TABELA ASSOCIATIVA DE PLANTEL: equipas_atletas
-- Suporta ligação de atletas a múltiplas equipas (ex: Sub-14 em Sub-14 e Sub-16)
DO $$
DECLARE
    v_equipa_id_type text;
    v_atleta_id_type text;
BEGIN
    -- Detetar tipo da coluna id em equipasbcv
    SELECT data_type INTO v_equipa_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipasbcv' AND column_name = 'id';

    -- Detetar tipo da coluna id em atletasbcv
    SELECT data_type INTO v_atleta_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'atletasbcv' AND column_name = 'id';

    -- Se equipas_atletas não existir, cria com os tipos apropriados
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'equipas_atletas'
    ) THEN
        IF v_equipa_id_type = 'uuid' THEN
            CREATE TABLE public.equipas_atletas (
                id BIGSERIAL PRIMARY KEY,
                equipa_id UUID NOT NULL REFERENCES public.equipasbcv(id) ON DELETE CASCADE,
                atleta_id BIGINT NOT NULL REFERENCES public.atletasbcv(id) ON DELETE CASCADE,
                epoca VARCHAR(20) DEFAULT '2026/2027',
                numero_camisola INT,
                papel VARCHAR(50) DEFAULT 'Jogador',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_equipa_atleta UNIQUE(equipa_id, atleta_id)
            );
        ELSE
            CREATE TABLE public.equipas_atletas (
                id BIGSERIAL PRIMARY KEY,
                equipa_id BIGINT NOT NULL REFERENCES public.equipasbcv(id) ON DELETE CASCADE,
                atleta_id BIGINT NOT NULL REFERENCES public.atletasbcv(id) ON DELETE CASCADE,
                epoca VARCHAR(20) DEFAULT '2026/2027',
                numero_camisola INT,
                papel VARCHAR(50) DEFAULT 'Jogador',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_equipa_atleta UNIQUE(equipa_id, atleta_id)
            );
        END IF;
    END IF;
END $$;

-- 3. ÍNDICES DE PESQUISA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_equipas_atletas_equipa ON public.equipas_atletas(equipa_id);
CREATE INDEX IF NOT EXISTS idx_equipas_atletas_atleta ON public.equipas_atletas(atleta_id);
CREATE INDEX IF NOT EXISTS idx_equipas_atletas_epoca ON public.equipas_atletas(epoca);

-- 4. PERMISSÕES DE ACESSO
GRANT ALL ON TABLE public.equipasbcv TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.equipas_atletas TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.equipasbcv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipas_atletas ENABLE ROW LEVEL SECURITY;

-- Políticas para equipasbcv
DROP POLICY IF EXISTS "Leitura pública de equipasbcv" ON public.equipasbcv;
CREATE POLICY "Leitura pública de equipasbcv" ON public.equipasbcv FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestao total equipasbcv" ON public.equipasbcv;
CREATE POLICY "Gestao total equipasbcv" ON public.equipasbcv FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Políticas para equipas_atletas
DROP POLICY IF EXISTS "Leitura pública de equipas_atletas" ON public.equipas_atletas;
CREATE POLICY "Leitura pública de equipas_atletas" ON public.equipas_atletas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestao total equipas_atletas" ON public.equipas_atletas;
CREATE POLICY "Gestao total equipas_atletas" ON public.equipas_atletas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
