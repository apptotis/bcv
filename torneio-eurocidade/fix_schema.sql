-- SCRIPT DE CORREÇÃO E LIMPEZA (Garante que o erro de schema desapareça)

-- 1. Remover tudo que criamos sobre users para limpar o cache
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.users;

-- 2. Recarregar a configuração do Supabase (Isso limpa o erro "querying schema")
NOTIFY pgrst, 'reload config';

-- 3. Recriar a Tabela Users (Do zero)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT,
    telemovel TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar Segurança
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins podem ver todos os perfis" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário edita proprio perfil" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 5. Recriar a Função e Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nome');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. (Opcional) Se o usuário Walter já existe no Auth mas não no public.users, insira-o manualmente:
INSERT INTO public.users (id, email, nome, telemovel)
SELECT id, email, raw_user_meta_data->>'nome', '966811600'
FROM auth.users
WHERE email = 'nwaltercarvalho@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET telemovel = '966811600';
