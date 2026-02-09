-- SCRIPT DE RESTAURAÇÃO DE SEGURANÇA E AUTOMAÇÃO (CORRIGIDO)
-- Rode este script APÓS conseguir fazer login com sucesso.

-- 1. Reativar RLS (Row Level Security)
ALTER TABLE public.equipas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

-- 2. Garantir que a tabela public.users existe e tem RLS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT,
    telemovel TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Recriar Políticas de Segurança (Policies) - COM LIMPEZA PRÉVIA
-- Removemos as políticas novas e antigas para garantir que não haja conflito
DROP POLICY IF EXISTS "Ver Proprio" ON public.users;
DROP POLICY IF EXISTS "Admins Ver Tudo" ON public.users;
DROP POLICY IF EXISTS "Editar Proprio" ON public.users;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.users;
DROP POLICY IF EXISTS "Usuário edita proprio perfil" ON public.users;

-- Criar as políticas definitivas
CREATE POLICY "Ver Proprio" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins Ver Tudo" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editar Proprio" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 4. Recriar Automação (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nome');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Sincronizar o Walter (Importante!)
INSERT INTO public.users (id, email, nome, telemovel)
SELECT id, email, raw_user_meta_data->>'nome', '966811600'
FROM auth.users
WHERE email = 'nwaltercarvalho@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET telemovel = '966811600';

-- 6. Refresh do Schema
NOTIFY pgrst, 'reload config';
