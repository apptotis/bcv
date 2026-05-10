-- Complete migration for jogos table
-- This drops the old table and creates a new one with the correct schema

-- Drop the old table (this will delete all existing games!)
DROP TABLE IF EXISTS public.jogos CASCADE;

-- Create the new jogos table with correct schema
CREATE TABLE public.jogos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    equipa_casa_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE,
    equipa_fora_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE,
    escalao TEXT,
    data_hora TIMESTAMP WITH TIME ZONE,
    campo TEXT,
    resultado_casa INTEGER DEFAULT 0,
    resultado_fora INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'Agendado'
);

-- Add comments
COMMENT ON TABLE public.jogos IS 'Games/matches table';
COMMENT ON COLUMN public.jogos.equipa_casa_id IS 'Home team ID';
COMMENT ON COLUMN public.jogos.equipa_fora_id IS 'Away team ID';
COMMENT ON COLUMN public.jogos.escalao IS 'Age group (Mini 8, Mini 10, Mini 12)';
COMMENT ON COLUMN public.jogos.data_hora IS 'Game date and time';
COMMENT ON COLUMN public.jogos.campo IS 'Field/court where the game will be played';
COMMENT ON COLUMN public.jogos.resultado_casa IS 'Home team score';
COMMENT ON COLUMN public.jogos.resultado_fora IS 'Away team score';
COMMENT ON COLUMN public.jogos.estado IS 'Game status (Agendado, Em Andamento, Finalizado)';

-- Enable RLS
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON public.jogos
    FOR SELECT USING (true);

-- Create policies for authenticated users to insert/update/delete
CREATE POLICY "Enable insert for authenticated users only" ON public.jogos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.jogos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.jogos
    FOR DELETE USING (auth.role() = 'authenticated');
