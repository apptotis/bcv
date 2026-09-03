-- ==============================================================================
-- SISTEMA DE GESTÃO DE PATROCINADORES E PARCEIROS DO BCV (TABELA DEDICADA)
-- Basket Clube de Valença
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. CRIAR TABELA DEDICADA: patrocinadores_bcv
CREATE TABLE IF NOT EXISTS public.patrocinadores_bcv (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Oficial', -- 'Principal', 'Ouro', 'Prata', 'Bronze', 'Apoio Institucional', 'Parceiro Desportivo'
    epoca VARCHAR(20) DEFAULT '2026/2027',
    website TEXT,
    
    -- Dados de Contacto do Responsável Comercial
    contacto_nome VARCHAR(150),
    contacto_telefone VARCHAR(50),
    contacto_email VARCHAR(150),
    valor NUMERIC(10,2) DEFAULT 0.00,
    
    -- Canais / Localizações de Exposição da Marca
    expo_site BOOLEAN DEFAULT TRUE,       -- Exibido no Site BCV (Homepage / Rodapé)
    expo_pavilhao BOOLEAN DEFAULT FALSE,  -- Painel Publicitário no Pavilhão Municipal
    expo_facebook BOOLEAN DEFAULT FALSE,  -- Postagens no Facebook
    expo_instagram BOOLEAN DEFAULT FALSE, -- Postagens no Instagram
    expo_equipamento BOOLEAN DEFAULT FALSE, -- Equipamentos de Jogo / Treino

    -- Ficheiros e Ativos Gráficos
    logo_url TEXT,            -- Logótipo da Empresa / Marca (PNG transparente, SVG ou JPEG)
    pavilhao_img_url TEXT,    -- Foto ou maquete do painel publicitário exposto no pavilhão
    redes_img_url TEXT,       -- Arte gráfica / Post preparado para Facebook e Instagram
    site_banner_url TEXT,     -- Banner ou arte específica para o site (opcional)

    -- Gestão e Ordenação
    ativo BOOLEAN DEFAULT TRUE,
    ordem INT DEFAULT 0,
    notas TEXT,               -- Observações internas, datas de vigência do acordo, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES DE PERFORMANCE E PESQUISA
CREATE INDEX IF NOT EXISTS idx_patrocinadores_bcv_ativo ON public.patrocinadores_bcv(ativo);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_bcv_categoria ON public.patrocinadores_bcv(categoria);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_bcv_epoca ON public.patrocinadores_bcv(epoca);
CREATE INDEX IF NOT EXISTS idx_patrocinadores_bcv_ordem ON public.patrocinadores_bcv(ordem ASC);

-- 3. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.patrocinadores_bcv ENABLE ROW LEVEL SECURITY;

-- 3.1. Leitura pública (para visitantes do website e sócios)
DROP POLICY IF EXISTS "Leitura pública de patrocinadores_bcv" ON public.patrocinadores_bcv;
CREATE POLICY "Leitura pública de patrocinadores_bcv"
ON public.patrocinadores_bcv FOR SELECT
USING (true);

-- 3.2. Gestão total para utilizadores autenticados (Admin / Gestores)
DROP POLICY IF EXISTS "Gestão de patrocinadores_bcv para autenticados" ON public.patrocinadores_bcv;
CREATE POLICY "Gestão de patrocinadores_bcv para autenticados"
ON public.patrocinadores_bcv FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. BUCKET DE ARMAZENAMENTO NO SUPABASE STORAGE
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrocinadores', 'patrocinadores', true)
ON CONFLICT (id) DO NOTHING;

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
