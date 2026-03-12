-- Remove the zip_format constraint from patrocinadores table
ALTER TABLE public.patrocinadores DROP CONSTRAINT IF EXISTS zip_format;
