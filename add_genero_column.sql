-- Add genero column to equipas table
DO $$
BEGIN
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS genero TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column genero already exists in equipas.';
END $$;

-- Add comment to document the column
COMMENT ON COLUMN public.equipas.genero IS 'Género da equipa: Masculino ou Feminino';
