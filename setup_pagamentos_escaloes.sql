-- ====================================================================
-- SISTEMA DE PAGAMENTOS DE ESCALÃO (BCV)
-- Mensalidades, Equipamentos, Exames Médicos e Outros Produtos
-- Execute este script no SQL Editor do Supabase
-- ====================================================================

-- 1. Adicionar colunas de categoria e descrição à tabela public.mensalidades
ALTER TABLE public.mensalidades 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'Mensalidade';

ALTER TABLE public.mensalidades 
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 2. Remover restrição rígida de unicidade para permitir pagamentos múltiplos 
-- (ex: múltiplos equipamentos, exames médicos, ou produtos ao longo da época)
ALTER TABLE public.mensalidades 
DROP CONSTRAINT IF EXISTS uq_mensalidade_atleta_epoca_mes;

-- Criar índice para pesquisa rápida por categoria e atleta
CREATE INDEX IF NOT EXISTS idx_mensalidades_categoria ON public.mensalidades(categoria);
CREATE INDEX IF NOT EXISTS idx_mensalidades_atleta_categoria ON public.mensalidades(atleta_id, categoria);

-- 3. Garantir coluna escalao_afeto na tabela public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS escalao_afeto text DEFAULT '';

-- 4. Garantir Permissões RLS na tabela mensalidades
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissao Total Mensalidades" ON public.mensalidades;
CREATE POLICY "Permissao Total Mensalidades" ON public.mensalidades
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.mensalidades TO anon, authenticated;
