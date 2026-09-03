-- ==============================================================================
-- SISTEMA DE GESTÃO DE PATROCINADORES E PARCEIROS (BCV)
-- Basket Clube de Valença
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. CRIAR TABELA (CASO NÃO EXISTA)
CREATE TABLE IF NOT EXISTS public.patrocinadores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Oficial',
    epoca VARCHAR(20) DEFAULT '2026/2027',
    website TEXT,
    contacto_nome VARCHAR(150),
    contacto_telefone VARCHAR(50),
    contacto_email VARCHAR(150),
    valor NUMERIC(10,2) DEFAULT 0.00,
    expo_site BOOLEAN DEFAULT TRUE,
    expo_pavilhao BOOLEAN DEFAULT FALSE,
    expo_facebook BOOLEAN DEFAULT FALSE,
    expo_instagram BOOLEAN DEFAULT FALSE,
    expo_equipamento BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    pavilhao_img_url TEXT,
    redes_img_url TEXT,
    site_banner_url TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    ordem INT DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GARANTIR QUE TODAS AS COLUNAS EXISTEM (CASO A TABELA JÁ TIVESSE SIDO CRIADA ANTERIORMENTE)
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Oficial';
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS epoca VARCHAR(20) DEFAULT '2026/2027';
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS contacto_nome VARCHAR(150);
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS contacto_telefone VARCHAR(50);
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS contacto_email VARCHAR(150);
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS expo_site BOOLEAN DEFAULT TRUE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS expo_pavilhao BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS expo_facebook BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS expo_instagram BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS expo_equipamento BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS pavilhao_img_url TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS redes_img_url TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS site_banner_url TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS ordem INT DEFAULT 0;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.patrocinadores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. ÍNDICES DE PERFORMANCE E PESQUISA
CREATE INDEX IF NOT EXISTS idx_patrocinadores_ativo ON public.patrocinadores(ativo);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_categoria ON public.patrocinadores(categoria);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_epoca ON public.patrocinadores(epoca);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_ordem ON public.patrocinadores(ordem ASC);

-- 4. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.patrocinadores ENABLE ROW LEVEL SECURITY;

-- 4.1. Leitura pública (para visitantes do website e sócios)
DROP POLICY IF EXISTS "Leitura pública de patrocinadores ativos" ON public.patrocinadores;
CREATE POLICY "Leitura pública de patrocinadores ativos"
ON public.patrocinadores FOR SELECT
USING (true);

-- 4.2. Gestão total para utilizadores autenticados (Admin / Gestores)
DROP POLICY IF EXISTS "Gestão de patrocinadores para autenticados" ON public.patrocinadores;
CREATE POLICY "Gestão de patrocinadores para autenticados"
ON public.patrocinadores FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. BUCKET DE ARMAZENAMENTO NO SUPABASE STORAGE
-- Criação do bucket 'patrocinadores' caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrocinadores', 'patrocinadores', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket 'patrocinadores'
DROP POLICY IF EXISTS "Acesso público aos ficheiros de patrocinadores" ON storage.objects;
CREATE POLICY "Acesso público aos ficheiros de patrocinadores"
ON storage.objects FOR SELECT
USING (bucket_id = 'patrocinadores');

DROP POLICY IF EXISTS "Upload de ficheiros de patrocinadores por autenticados" ON storage.objects;
CREATE POLICY "Upload de ficheiros de patrocinadores por autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patrocinadores');

DROP POLICY IF EXISTS "Atualização e eliminação por autenticados em patrocinadores" ON storage.objects;
CREATE POLICY "Atualização e eliminação por autenticados em patrocinadores"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'patrocinadores');

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
