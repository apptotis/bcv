-- ====================================================================
-- ADICIONAR CAMPO DE OBSERVAÇÕES AO DIÁRIO DESPORTIVO (PRESENÇAS)
-- Basket Clube de Valença (BCV)
-- Execute este script no SQL Editor do Supabase
-- ====================================================================

-- 1. Adicionar coluna 'observacoes' à tabela public.presencas se ainda não existir
ALTER TABLE public.presencas 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Comentário explicativo na coluna
COMMENT ON COLUMN public.presencas.observacoes IS 'Observações e notas pontuais do diário desportivo (atrasos, queixas físicas, destaques, etc.)';
