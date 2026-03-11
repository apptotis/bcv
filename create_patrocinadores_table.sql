-- Create Patrocinadores Table
CREATE TABLE IF NOT EXISTS public.patrocinadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome TEXT NOT NULL,
    tipo_servico TEXT,
    morada TEXT,
    codigo_postal TEXT CONSTRAINT zip_format CHECK (codigo_postal ~ '^\d{4}-\d{3}$'),
    telefone TEXT,
    facebook TEXT,
    instagram TEXT,
    google_maps_url TEXT,
    comer BOOLEAN DEFAULT false,
    dormir BOOLEAN DEFAULT false,
    logo_url TEXT
);

-- Enable RLS
ALTER TABLE public.patrocinadores ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public read access
CREATE POLICY "Leitura pública de patrocinadores" ON public.patrocinadores FOR SELECT USING (true);

-- Admin (authenticated) full access
CREATE POLICY "Admin pode gerir patrocinadores" ON public.patrocinadores 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
