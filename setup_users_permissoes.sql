-- ====================================================================
-- ATUALIZAÇÃO DO ESQUEMA DE UTILIZADORES & PERMISSÕES GRANULARES (BCV)
-- Execute este script no SQL Editor do Supabase
-- ====================================================================

-- 1. Adicionar coluna de permissões (array de texto) na tabela public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissoes text[] DEFAULT '{}'::text[];

-- 2. Garantir que a extensão pgcrypto está disponível
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Atualizar a Função RPC para Criar Utilizador com Permissões
CREATE OR REPLACE FUNCTION admin_create_user(
    p_email text,
    p_password text,
    p_nome text,
    p_telemovel text,
    p_role text,
    p_permissoes text[] DEFAULT '{}'::text[]
) RETURNS json AS $$
DECLARE
    v_admin_role text;
    v_new_user_id uuid;
    v_user_count int;
BEGIN
    -- 3.1. Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem criar utilizadores.';
    END IF;

    -- 3.2. Verificar se o e-mail já existe
    SELECT count(*) INTO v_user_count FROM auth.users WHERE email = p_email;
    IF v_user_count > 0 THEN
        RAISE EXCEPTION 'Este e-mail já está em uso.';
    END IF;

    -- 3.3. Criar UUID para o novo utilizador
    v_new_user_id := gen_random_uuid();

    -- Desativar trigger temporariamente na tabela public.users
    ALTER TABLE public.users DISABLE TRIGGER USER;

    -- 3.4. Inserir no auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_user_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('nome', p_nome),
        now(),
        now(),
        '', '', '', ''
    );

    -- 3.5. Inserir Identidade (Obrigatório para login no Supabase)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        v_new_user_id::text,
        json_build_object('sub', v_new_user_id, 'email', p_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
    );

    -- 3.6. Inserir / Atualizar na tabela public.users
    INSERT INTO public.users (id, nome, email, telemovel, role, permissoes)
    VALUES (v_new_user_id, p_nome, p_email, p_telemovel, p_role, COALESCE(p_permissoes, '{}'::text[]))
    ON CONFLICT (id) DO UPDATE 
    SET telemovel = EXCLUDED.telemovel, 
        role = EXCLUDED.role,
        nome = EXCLUDED.nome,
        permissoes = EXCLUDED.permissoes;
        
    -- Voltar a ativar os triggers
    ALTER TABLE public.users ENABLE TRIGGER USER;

    RETURN json_build_object('status', 'success', 'user_id', v_new_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Atualizar a Função RPC para Editar Utilizador com Permissões
CREATE OR REPLACE FUNCTION admin_edit_user(
    p_user_id uuid,
    p_nome text,
    p_telemovel text,
    p_role text,
    p_password text,
    p_permissoes text[] DEFAULT '{}'::text[]
) RETURNS json AS $$
DECLARE
    v_admin_role text;
BEGIN
    -- 4.1. Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem editar utilizadores.';
    END IF;

    -- 4.2. Atualizar dados na tabela pública
    ALTER TABLE public.users DISABLE TRIGGER USER;
    
    UPDATE public.users 
    SET nome = p_nome, 
        telemovel = p_telemovel, 
        role = p_role,
        permissoes = COALESCE(p_permissoes, '{}'::text[])
    WHERE id = p_user_id;
    
    ALTER TABLE public.users ENABLE TRIGGER USER;

    -- 4.3. Atualizar password na auth.users (se fornecida)
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')), 
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    RETURN json_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
