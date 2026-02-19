-- ============================================================
-- MIGRAÇÃO: Adicionar equipa_id à tabela eventos
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna equipa_id (nullable)
--    NULL = evento global (todas as equipas)
--    UUID = evento específico de uma equipa
ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS equipa_id UUID REFERENCES public.equipas(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.eventos.equipa_id IS
  'NULL = evento para todas as equipas; UUID = evento específico desta equipa';

-- 2. RLS: eventos privados com equipa_id são visíveis publicamente
--    (para a página de agenda por equipa sem necessidade de login)
DROP POLICY IF EXISTS "Agenda pública de eventos privados por equipa" ON public.eventos;
CREATE POLICY "Agenda pública de eventos privados por equipa"
    ON public.eventos FOR SELECT
    USING (is_publico = false AND equipa_id IS NOT NULL);

-- 3. Confirmar
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'eventos'
ORDER BY ordinal_position;
