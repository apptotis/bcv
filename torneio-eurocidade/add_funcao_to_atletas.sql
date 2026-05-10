-- Adicionar coluna 'funcao' à tabela de atletas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atletas' AND column_name = 'funcao') THEN
        ALTER TABLE public.atletas ADD COLUMN funcao TEXT DEFAULT 'Jogador';
    END IF;
END $$;
