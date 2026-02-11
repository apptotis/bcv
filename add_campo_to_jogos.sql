-- Add campo column to jogos table
DO $$
BEGIN
    ALTER TABLE public.jogos ADD COLUMN IF NOT EXISTS campo TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column campo already exists in jogos.';
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN public.jogos.campo IS 'Field/court where the game will be played (e.g., Campo 1, Campo 2).';
