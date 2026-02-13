-- Add social media and website columns to equipas table
DO $$
BEGIN
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS facebook_url TEXT;
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS instagram_url TEXT;
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS website_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'social media columns already exist in equipas.';
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN public.equipas.facebook_url IS 'URL da página do Facebook da equipa';
COMMENT ON COLUMN public.equipas.instagram_url IS 'URL do perfil do Instagram da equipa';
COMMENT ON COLUMN public.equipas.website_url IS 'URL do website da equipa';
