-- ====================================================================
-- SISTEMA DE MOVIMENTOS DE TESOURARIA & ENTREGAS DE VALORES (BCV)
-- Registo de entrega de montantes físicos em dinheiro à tesouraria do clube
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.entregas_tesouraria (
    id BIGSERIAL PRIMARY KEY,
    responsavel_id UUID,
    responsavel_nome VARCHAR(150),
    responsavel_email VARCHAR(150),
    escalao VARCHAR(50) NOT NULL,
    epoca VARCHAR(20) NOT NULL DEFAULT '2026/2027',
    valor NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    data_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
    entregue_a VARCHAR(150) NOT NULL,
    metodo VARCHAR(50) NOT NULL DEFAULT 'Dinheiro',
    recibo_codigo VARCHAR(50),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimização de consultas e auditoria
CREATE INDEX IF NOT EXISTS idx_entregas_tesouraria_escalao_epoca ON public.entregas_tesouraria(escalao, epoca);
CREATE INDEX IF NOT EXISTS idx_entregas_tesouraria_email ON public.entregas_tesouraria(responsavel_email);
CREATE INDEX IF NOT EXISTS idx_entregas_tesouraria_data ON public.entregas_tesouraria(data_entrega);

-- Ativar RLS
ALTER TABLE public.entregas_tesouraria ENABLE ROW LEVEL SECURITY;

-- Política RLS aberta (anon e authenticated) consistente com o restante sistema BCV
DROP POLICY IF EXISTS "Permissao Total Entregas Tesouraria" ON public.entregas_tesouraria;
CREATE POLICY "Permissao Total Entregas Tesouraria" ON public.entregas_tesouraria
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Atribuição de permissões às roles do Supabase
GRANT ALL ON public.entregas_tesouraria TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
