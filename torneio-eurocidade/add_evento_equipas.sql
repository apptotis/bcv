-- =====================================================================
-- Migração Corrigida: equipa_id único → junction table evento_equipas
-- Executar no Supabase SQL Editor
-- =====================================================================

-- 1. Remover políticas antigas que dependem da coluna equipa_id
DROP POLICY IF EXISTS "Agenda pública de eventos privados por equipa" ON public.eventos;
-- Remover outras políticas que possam referenciar equipa_id, por precaução
DROP POLICY IF EXISTS "Leitura pública de eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin gere eventos" ON public.eventos;

-- Recriar políticas da tabela eventos (sem referência a equipa_id)
CREATE POLICY "Leitura pública de eventos"
    ON public.eventos FOR SELECT
    USING (true); -- Agora todos podem ler a tabela eventos, a filtragem será feita na aplicação ou via join

CREATE POLICY "Admin gere eventos"
    ON public.eventos FOR ALL
    USING (auth.role() = 'authenticated');

-- 2. Remover coluna anterior
ALTER TABLE public.eventos
DROP COLUMN IF EXISTS equipa_id;

-- 3. Criar junction table
CREATE TABLE IF NOT EXISTS public.evento_equipas (
    evento_id  UUID   NOT NULL REFERENCES public.eventos(id)  ON DELETE CASCADE,
    equipa_id  BIGINT NOT NULL REFERENCES public.equipas(id)  ON DELETE CASCADE,
    PRIMARY KEY (evento_id, equipa_id)
);

-- 4. RLS na nova tabela
ALTER TABLE public.evento_equipas ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessário para a agenda pública consultar relações)
DROP POLICY IF EXISTS "Leitura pública evento_equipas" ON public.evento_equipas;
CREATE POLICY "Leitura pública evento_equipas"
    ON public.evento_equipas FOR SELECT
    USING (true);

-- Escrita apenas autenticados (admin)
DROP POLICY IF EXISTS "Admin gere evento_equipas" ON public.evento_equipas;
CREATE POLICY "Admin gere evento_equipas"
    ON public.evento_equipas FOR ALL
    USING (auth.role() = 'authenticated');
