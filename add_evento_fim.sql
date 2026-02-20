-- Adicionar coluna de hora de fim aos eventos
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS data_hora_fim TIMESTAMP WITH TIME ZONE;
