-- =========================================================================
-- SETUP: Adicionar Suporte a Links do Google Maps na Agenda e Resultados
-- Tabelas: agenda_bcv e resultados_bcv
-- =========================================================================

-- 1. Adicionar coluna local_maps_url na tabela agenda_bcv
ALTER TABLE IF EXISTS public.agenda_bcv 
    ADD COLUMN IF NOT EXISTS local_maps_url TEXT;

-- 2. Adicionar coluna local_maps_url na tabela resultados_bcv
ALTER TABLE IF EXISTS public.resultados_bcv 
    ADD COLUMN IF NOT EXISTS local_maps_url TEXT;

-- 3. Atualizar pavilhão municipal padrão do BC Valença com o link oficial do Google Maps
UPDATE public.agenda_bcv
SET local_maps_url = 'https://www.google.com/maps/search/?api=1&query=Pavilh%C3%A3o+Municipal+de+Valen%C3%A7a'
WHERE (local ILIKE '%valença%' OR local ILIKE '%municipal%') 
  AND (local_maps_url IS NULL OR local_maps_url = '');

UPDATE public.resultados_bcv
SET local_maps_url = 'https://www.google.com/maps/search/?api=1&query=Pavilh%C3%A3o+Municipal+de+Valen%C3%A7a'
WHERE (local ILIKE '%valença%' OR local ILIKE '%municipal%') 
  AND (local_maps_url IS NULL OR local_maps_url = '');

COMMENT ON COLUMN public.agenda_bcv.local_maps_url IS 'URL ou link direto do Google Maps para o pavilhão/local do jogo';
COMMENT ON COLUMN public.resultados_bcv.local_maps_url IS 'URL ou link direto do Google Maps para o pavilhão/local do jogo';
