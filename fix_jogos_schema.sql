-- Fix jogos table schema - ensure all required columns exist
-- This script adds missing columns if they don't exist

DO $$
BEGIN
    -- Add equipa_casa_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'equipa_casa_id'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN equipa_casa_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE;
    END IF;

    -- Add equipa_fora_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'equipa_fora_id'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN equipa_fora_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE;
    END IF;

    -- Add escalao if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'escalao'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN escalao TEXT;
    END IF;

    -- Add data_hora if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'data_hora'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN data_hora TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add campo if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'campo'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN campo TEXT;
    END IF;

    -- Add resultado_casa if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'resultado_casa'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN resultado_casa INTEGER DEFAULT 0;
    END IF;

    -- Add resultado_fora if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'resultado_fora'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN resultado_fora INTEGER DEFAULT 0;
    END IF;

    -- Add estado if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jogos' 
        AND column_name = 'estado'
    ) THEN
        ALTER TABLE public.jogos ADD COLUMN estado TEXT DEFAULT 'Agendado';
    END IF;

END $$;

-- Add comments
COMMENT ON COLUMN public.jogos.equipa_casa_id IS 'Home team ID';
COMMENT ON COLUMN public.jogos.equipa_fora_id IS 'Away team ID';
COMMENT ON COLUMN public.jogos.escalao IS 'Age group (Mini 8, Mini 10, Mini 12)';
COMMENT ON COLUMN public.jogos.data_hora IS 'Game date and time';
COMMENT ON COLUMN public.jogos.campo IS 'Field/court where the game will be played';
COMMENT ON COLUMN public.jogos.resultado_casa IS 'Home team score';
COMMENT ON COLUMN public.jogos.resultado_fora IS 'Away team score';
COMMENT ON COLUMN public.jogos.estado IS 'Game status (Agendado, Em Andamento, Finalizado)';
