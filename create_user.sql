-- Script para criar Usuário de Teste (Walter) diretamente via SQL
-- Rode este script no SQL Editor do Supabase

-- 1. Garante que a extensão de criptografia está ativa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insere o usuário na tabela de autenticação (auth.users)
-- A senha '197105' será criptografada.
-- O Trigger 'on_auth_user_created' (que criamos antes) vai rodar automaticamente e criar a entrada em public.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'nwaltercarvalho@gmail.com',
    crypt('197105', gen_salt('bf')), -- Criptografa a senha
    now(), -- Confirma o email automaticamente
    '{"nome": "Walter"}', -- Metadados que o trigger usa
    now(),
    now()
);

-- 3. Atualiza o perfil público com o telemóvel
-- O insert acima dispara o trigger que cria o user em public.users com nome e email.
-- Agora atualizamos para colocar o telefone.
UPDATE public.users
SET telemovel = '966811600'
WHERE email = 'nwaltercarvalho@gmail.com';

-- 4. Exibe o resultado para confirmar
SELECT * FROM public.users WHERE email = 'nwaltercarvalho@gmail.com';
