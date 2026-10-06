-- =========================================================================
-- CONFIGURAÇÃO: GESTÃO DE ATLETAS FEDERADOS (FPB)
-- Campo 'inscrito_fpb' na tabela atletasbcv
-- Permite indicar se o atleta já foi oficialmente validado e inscrito na FPB
-- =========================================================================

-- 1. Adicionar coluna 'inscrito_fpb' se não existir (predefinição: false)
ALTER TABLE public.atletasbcv 
    ADD COLUMN IF NOT EXISTS inscrito_fpb BOOLEAN DEFAULT false;

-- 2. Garantir que registos existentes tenham um valor booleano válido
UPDATE public.atletasbcv 
    SET inscrito_fpb = false 
    WHERE inscrito_fpb IS NULL;

-- 3. Criar índice para acelerar filtragens na tabela de atletas
CREATE INDEX IF NOT EXISTS idx_atletasbcv_inscrito_fpb 
    ON public.atletasbcv(inscrito_fpb);

-- 4. Notificar conclusão
COMMENT ON COLUMN public.atletasbcv.inscrito_fpb IS 'Indica se o atleta já foi oficialmente validado e inscrito na Federação Portuguesa de Basquetebol (FPB)';
