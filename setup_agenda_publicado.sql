-- =========================================================================
-- CONTROLO DE PUBLICAÇÃO DE JOGOS: agenda_bcv e resultados_bcv
-- Permite selecionar Sim ou Não para publicar cada jogo no site
-- =========================================================================

-- 1. Adicionar coluna 'publicado' na tabela agenda_bcv
ALTER TABLE IF EXISTS public.agenda_bcv 
    ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT true;

-- 2. Adicionar coluna 'publicado' na tabela resultados_bcv
ALTER TABLE IF EXISTS public.resultados_bcv 
    ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT true;

-- 3. Garantir que os jogos atuais fiquem como publicados por predefinição
UPDATE public.agenda_bcv SET publicado = true WHERE publicado IS NULL;
UPDATE public.resultados_bcv SET publicado = true WHERE publicado IS NULL;

-- 4. Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_agenda_bcv_publicado ON public.agenda_bcv(publicado);
CREATE INDEX IF NOT EXISTS idx_resultados_bcv_publicado ON public.resultados_bcv(publicado);
