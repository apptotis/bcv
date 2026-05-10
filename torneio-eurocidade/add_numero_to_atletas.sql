-- Adicionar coluna 'numero' à tabela de atletas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atletas' AND column_name = 'numero') THEN
        ALTER TABLE public.atletas ADD COLUMN numero INTEGER;
    END IF;
END $$;
