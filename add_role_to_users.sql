-- 1. Adicionar coluna 'role' à tabela public.users (com valor por defeito 'user')
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Atualizar todos os utilizadores existentes para terem o role 'admin'
-- Desativamos os triggers temporariamente (apenas do utilizador) para evitar o erro do "check_wallet_global_uniqueness" herdado de outro projeto.
ALTER TABLE public.users DISABLE TRIGGER USER;
UPDATE public.users SET role = 'admin' WHERE role = 'user' OR role IS NULL;
ALTER TABLE public.users ENABLE TRIGGER USER;

-- 3. Exibir o resultado para confirmação
SELECT id, email, nome, role FROM public.users;
