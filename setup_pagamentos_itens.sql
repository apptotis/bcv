-- ====================================================================
-- SISTEMA INTEGRADO DE PAGAMENTOS, PREÇÁRIOS & ITENS DE COBRANÇA (BCV)
-- Suporte a Quotas: Mensal, Bianual, Anual + Produtos/Encargos de Escalão
-- ====================================================================

-- 1. Tabela de Itens de Cobrança / Produtos do Clube
-- Permite ao Admin lançar encargos para um escalão específico ou todos os atletas
CREATE TABLE IF NOT EXISTS public.itens_cobranca (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    categoria VARCHAR(50) NOT NULL DEFAULT 'Geral', -- 'Mensalidade', 'Equipamento', 'Exame Médico', 'Inscrição', 'Outro'
    escalao VARCHAR(50) DEFAULT 'Todos', -- 'Todos' ou escalão específico (ex: 'Mini 8')
    epoca VARCHAR(20) NOT NULL DEFAULT '2026/2027',
    obrigatorio BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itens_cobranca_escalao_epoca ON public.itens_cobranca(escalao, epoca);
CREATE INDEX IF NOT EXISTS idx_itens_cobranca_ativo ON public.itens_cobranca(ativo);

-- 2. Garantir colunas completas na tabela de mensalidades / recibos
ALTER TABLE public.mensalidades 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'Mensalidade';

ALTER TABLE public.mensalidades 
ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE public.mensalidades 
ADD COLUMN IF NOT EXISTS item_cobranca_id BIGINT REFERENCES public.itens_cobranca(id) ON DELETE SET NULL;

-- 3. Remover restrição rígida de unicidade antiga (para permitir múltiplos pagamentos e produtos)
ALTER TABLE public.mensalidades 
DROP CONSTRAINT IF EXISTS uq_mensalidade_atleta_epoca_mes;

-- 4. Inserir itens base padrão do clube se não existirem
INSERT INTO public.itens_cobranca (titulo, descricao, valor, categoria, escalao, epoca, obrigatorio, ativo)
SELECT 'Exame Médico Desportivo (EMD)', 'Certificação e consulta médica oficial IPDJ', 15.00, 'Exame Médico', 'Todos', '2026/2027', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.itens_cobranca WHERE titulo = 'Exame Médico Desportivo (EMD)' AND epoca = '2026/2027');

INSERT INTO public.itens_cobranca (titulo, descricao, valor, categoria, escalao, epoca, obrigatorio, ativo)
SELECT 'Equipamento Oficial BCV (Jogo + Treino)', 'Equipamento oficial do clube para a época 2026/2027', 60.00, 'Equipamento', 'Todos', '2026/2027', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.itens_cobranca WHERE titulo = 'Equipamento Oficial BCV (Jogo + Treino)' AND epoca = '2026/2027');

INSERT INTO public.itens_cobranca (titulo, descricao, valor, categoria, escalao, epoca, obrigatorio, ativo)
SELECT 'Inscrição FPB & Seguro Desportivo', 'Taxa federativa oficial da época 2026/2027', 20.00, 'Inscrição', 'Todos', '2026/2027', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.itens_cobranca WHERE titulo = 'Inscrição FPB & Seguro Desportivo' AND epoca = '2026/2027');

-- 5. RLS e Permissões
ALTER TABLE public.itens_cobranca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Itens Cobranca" ON public.itens_cobranca;
CREATE POLICY "Permissao Total Itens Cobranca" ON public.itens_cobranca
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.itens_cobranca TO anon, authenticated;
GRANT ALL ON public.mensalidades TO anon, authenticated;

-- 6. Tabela de Quotas Padrão em clube_config (se ainda não existir)
INSERT INTO public.clube_config (chave, dados)
VALUES ('tabela_quotas', '{
  "BabyBasket": {"mensal": 0.00, "bianual": 0.00, "anual": 0.00},
  "Mini 8": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Mini 10": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Mini 12": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Sub 14": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Sub 16": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Sub 18": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Sub 20": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00},
  "Seniores": {"mensal": 25.00, "bianual": 120.00, "anual": 230.00}
}'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- 7. Compatibilidade para configuracoes_clube (para garantir resiliência caso qualquer cliente ainda consulte esta tabela)
CREATE TABLE IF NOT EXISTS public.configuracoes_clube (
    chave VARCHAR(50) PRIMARY KEY,
    valor JSONB,
    dados JSONB,
    descricao TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT ALL ON TABLE public.configuracoes_clube TO anon, authenticated;

