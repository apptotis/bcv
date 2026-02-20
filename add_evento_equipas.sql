-- =====================================================================
-- Migração: equipa_id único → junction table evento_equipas
-- Executar no Supabase SQL Editor
-- =====================================================================

-- 1. Remover coluna anterior (se existir)
ALTER TABLE public.eventos
DROP COLUMN IF EXISTS equipa_id;

-- 2. Criar junction table
CREATE TABLE IF NOT EXISTS public.evento_equipas (
    evento_id  UUID   NOT NULL REFERENCES public.eventos(id)  ON DELETE CASCADE,
    equipa_id  BIGINT NOT NULL REFERENCES public.equipas(id)  ON DELETE CASCADE,
    PRIMARY KEY (evento_id, equipa_id)
);

-- 3. RLS
ALTER TABLE public.evento_equipas ENABLE ROW LEVEL SECURITY;

-- Leitura pública (agenda publica)
DROP POLICY IF EXISTS "Leitura pública evento_equipas" ON public.evento_equipas;
CREATE POLICY "Leitura pública evento_equipas"
    ON public.evento_equipas FOR SELECT
    USING (true);

-- Escrita apenas autenticados (admin)
DROP POLICY IF EXISTS "Admin gere evento_equipas" ON public.evento_equipas;
CREATE POLICY "Admin gere evento_equipas"
    ON public.evento_equipas FOR ALL
    USING (auth.role() = 'authenticated');
