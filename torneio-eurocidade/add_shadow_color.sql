-- Add shadow_color column to equipas table
DO $$
BEGIN
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS shadow_color TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column shadow_color already exists in equipas.';
END $$;
