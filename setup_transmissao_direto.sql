-- ==============================================================================
-- SCRIPT: Transmissão ao Vivo (BCV TV / YouTube Streaming)
-- Basket Clube de Valença (BCV)
-- ==============================================================================

-- 1. Garantir que a tabela clube_config existe
CREATE TABLE IF NOT EXISTS public.clube_config (
    chave VARCHAR(50) PRIMARY KEY,
    dados JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS e Permissões Públicas de Leitura
ALTER TABLE public.clube_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de configuracoes" ON public.clube_config;
CREATE POLICY "Leitura publica de configuracoes" ON public.clube_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Gestao autenticada de configuracoes" ON public.clube_config;
CREATE POLICY "Gestao autenticada de configuracoes" ON public.clube_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.clube_config TO anon, authenticated, service_role;

-- 3. Inserir configuração inicial da Transmissão em Direto
INSERT INTO public.clube_config (chave, dados, updated_at)
VALUES (
    'transmissao_direto',
    '{
        "ativo": false,
        "titulo": "Campeonato Nacional da 2ª Divisão Masculina (CN2)",
        "competicao": "Federação Portuguesa de Basquetebol",
        "video_url": "",
        "canal_id": "UCEQdDGlXUdcHK5Ym5jqFQUg",
        "descricao": "Acompanha as transmissões em direto e o apoio aos atletas do Basket Clube de Valença.",
        "mostrar_chat": true
    }'::jsonb,
    NOW()
)
ON CONFLICT (chave) DO NOTHING;
