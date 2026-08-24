-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÕES DINÂMICAS E ÓRGÃOS SOCIAIS DO BCV
-- Basket Clube de Valença (BCV)
-- Execute este script no SQL Editor do Supabase
-- ==============================================================================

-- 1. CRIAR TABELA DE CONFIGURAÇÕES GERAIS (Chave-Valor com JSONB)
CREATE TABLE IF NOT EXISTS public.clube_config (
    chave VARCHAR(50) PRIMARY KEY,
    dados JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRIAR TABELA DE ÓRGÃOS SOCIAIS
CREATE TABLE IF NOT EXISTS public.orgaos_sociais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orgao VARCHAR(50) NOT NULL, -- 'Assembleia Geral', 'Conselho Fiscal', 'Direção', etc.
    cargo VARCHAR(100) NOT NULL, -- 'Presidente', 'Vice-Presidente', 'Secretário', 'Tesoureira', 'Vogal', etc.
    nome VARCHAR(255) NOT NULL,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSERIR DADOS INICIAIS DE CONFIGURAÇÃO (Se ainda não existirem)
INSERT INTO public.clube_config (chave, dados)
VALUES 
    ('contactos', '{
        "pavilhao": "Pavilhão Municipal de Valença",
        "morada": "Av. Tito Fontes, 4930-610 Valença",
        "email": "geral@bcv.pt",
        "telefone": "+351 900 000 000",
        "horario": "Segunda a Sexta: 17h00 - 21h30"
    }'::jsonb),
    ('redes_sociais', '{
        "facebook": "https://www.facebook.com/profile.php?id=100039859278453",
        "instagram": "https://www.instagram.com/bcvalenca",
        "youtube": "https://www.youtube.com/@BCValenca",
        "tiktok": "https://www.tiktok.com/@bcvalenca",
        "whatsapp": ""
    }'::jsonb),
    ('geral', '{
        "nome_clube": "Basket Clube de Valença",
        "sigla": "BCV",
        "ano_fundacao": "1996",
        "nif": "500000000",
        "banner_aniversario": "1996 - 2026 | Celebramos 30 Anos de História e Paixão pelo Basquetebol! 🏀"
    }'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- 4. INSERIR DADOS INICIAIS DOS ÓRGÃOS SOCIAIS (Se a tabela estiver vazia)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.orgaos_sociais LIMIT 1) THEN
        -- Assembleia Geral
        INSERT INTO public.orgaos_sociais (orgao, cargo, nome, ordem) VALUES
            ('Assembleia Geral', 'Presidente', 'Ana Patrícia Viana da Costa', 1),
            ('Assembleia Geral', 'Vice-Presidente', 'Arabella Severino', 2),
            ('Assembleia Geral', 'Secretária', 'Tatiana Gonzalez Viana', 3);

        -- Conselho Fiscal
        INSERT INTO public.orgaos_sociais (orgao, cargo, nome, ordem) VALUES
            ('Conselho Fiscal', 'Presidente', 'André Salvador Fernandes', 1),
            ('Conselho Fiscal', 'Secretário', 'Ricardo José Marinho Pereira', 2),
            ('Conselho Fiscal', 'Relator', 'Bruno Manuel de Sousa Fernandes', 3);

        -- Direção
        INSERT INTO public.orgaos_sociais (orgao, cargo, nome, ordem) VALUES
            ('Direção', 'Presidente', 'Carl Michael da Costa', 1),
            ('Direção', 'Vice-Presidente', 'Henrique Manuel Gonçalves Moreira', 2),
            ('Direção', 'Secretário', 'Gonçalo Moreira Garcez', 3),
            ('Direção', 'Tesoureira', 'Ana Maria Ferreira Pestana', 4),
            ('Direção', 'Vogal', 'Tiago Filipe Rodrigues Seixas', 5),
            ('Direção', 'Vogal', 'Custódia Manuela Oliveira Pereira', 6),
            ('Direção', 'Vogal', 'Hugo Manuel Neto Alves da Silva', 7),
            ('Direção', 'Vogal', 'Miguel Ángel González Martínez', 8),
            ('Direção', 'Vogal', 'Teresa Maria Martins de Carvalho', 9),
            ('Direção', 'Vogal', 'Ana Luísa Malheiro de Sousa Domingues', 10),
            ('Direção', 'Vogal', 'Natália Parciu', 11),
            ('Direção', 'Vogal', 'Clara Marina Andrade Palhares Domingues', 12),
            ('Direção', 'Vogal', 'Sara Manuela Reis Mota', 13);
    END IF;
END $$;

-- 5. CONFIGURAR PERMISSÕES RLS
ALTER TABLE public.clube_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgaos_sociais ENABLE ROW LEVEL SECURITY;

-- Leitura pública (Anon e Authenticated)
DROP POLICY IF EXISTS "Leitura publica de configuracoes" ON public.clube_config;
CREATE POLICY "Leitura publica de configuracoes" ON public.clube_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Leitura publica de orgaos sociais" ON public.orgaos_sociais;
CREATE POLICY "Leitura publica de orgaos sociais" ON public.orgaos_sociais FOR SELECT TO anon, authenticated USING (true);

-- Modificação por utilizadores autenticados (Admins)
DROP POLICY IF EXISTS "Gestao autenticada de configuracoes" ON public.clube_config;
CREATE POLICY "Gestao autenticada de configuracoes" ON public.clube_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestao autenticada de orgaos sociais" ON public.orgaos_sociais;
CREATE POLICY "Gestao autenticada de orgaos sociais" ON public.orgaos_sociais FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões de tabelas
GRANT ALL ON TABLE public.clube_config TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.orgaos_sociais TO anon, authenticated, service_role;
