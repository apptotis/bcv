-- SCRIPT DE DEBUG "MODO SEGURO"
-- Este script desativa temporariamente as seguranças para isolar o erro 500

-- 1. Remover Gatilhos que podem estar quebrando o Login
-- Se o gatilho falhar, o login (que atualiza o usuário) falha com erro 500
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Desativar RLS (Row Level Security) temporariamente
-- Isso valida a sua hipótese de que o erro são as permissões
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogos DISABLE ROW LEVEL SECURITY;

-- 3. Limpar cache do esquema
NOTIFY pgrst, 'reload config';

-- 4. Verificação final
SELECT count(*) as total_users FROM auth.users;
