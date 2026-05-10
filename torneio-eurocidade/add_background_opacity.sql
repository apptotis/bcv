-- Add background_opacity column to equipas table
DO $$
BEGIN
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS background_opacity INTEGER DEFAULT 10;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column background_opacity already exists in equipas.';
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN public.equipas.background_opacity IS 'Background color opacity percentage (0-100). Default is 10%.';
