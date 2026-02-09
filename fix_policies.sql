-- SCRIPT DE CORREÇÃO DE PERMISSÕES (POLICIES)
-- Este script garante que usuários logados possam Criar, Editar e Apagar dados.

-- 1. EQUIPAS
ALTER TABLE public.equipas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de equipas" ON public.equipas;
DROP POLICY IF EXISTS "Admin pode inserir equipas" ON public.equipas;
DROP POLICY IF EXISTS "Admin pode atualizar equipas" ON public.equipas;
DROP POLICY IF EXISTS "Admin pode deletar equipas" ON public.equipas;

CREATE POLICY "Leitura pública de equipas" ON public.equipas FOR SELECT USING (true);
CREATE POLICY "Admin pode inserir equipas" ON public.equipas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin pode atualizar equipas" ON public.equipas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin pode deletar equipas" ON public.equipas FOR DELETE TO authenticated USING (true);

-- 2. ATLETAS
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de atletas" ON public.atletas;
DROP POLICY IF EXISTS "Admin pode inserir atletas" ON public.atletas;
DROP POLICY IF EXISTS "Admin pode atualizar atletas" ON public.atletas;
DROP POLICY IF EXISTS "Admin pode deletar atletas" ON public.atletas;

CREATE POLICY "Leitura pública de atletas" ON public.atletas FOR SELECT USING (true);
CREATE POLICY "Admin pode inserir atletas" ON public.atletas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin pode atualizar atletas" ON public.atletas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin pode deletar atletas" ON public.atletas FOR DELETE TO authenticated USING (true);

-- 3. JOGOS
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de jogos" ON public.jogos;
DROP POLICY IF EXISTS "Admin pode inserir jogos" ON public.jogos;
DROP POLICY IF EXISTS "Admin pode atualizar jogos" ON public.jogos;
DROP POLICY IF EXISTS "Admin pode deletar jogos" ON public.jogos;

CREATE POLICY "Leitura pública de jogos" ON public.jogos FOR SELECT USING (true);
CREATE POLICY "Admin pode inserir jogos" ON public.jogos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin pode atualizar jogos" ON public.jogos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin pode deletar jogos" ON public.jogos FOR DELETE TO authenticated USING (true);

-- 4. Confirmação
NOTIFY pgrst, 'reload config';
