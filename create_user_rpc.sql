-- Cria a extensão pgcrypto se ainda não existir
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criação da Função Segura RPC
CREATE OR REPLACE FUNCTION admin_create_user(
    p_email text,
    p_password text,
    p_nome text,
    p_telemovel text,
    p_role text
) RETURNS json AS $$
DECLARE
    v_admin_role text;
    v_new_user_id uuid;
    v_user_count int;
BEGIN
    -- 1. Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem criar utilizadores.';
    END IF;

    -- 2. Verificar se o e-mail já existe
    SELECT count(*) INTO v_user_count FROM auth.users WHERE email = p_email;
    IF v_user_count > 0 THEN
        RAISE EXCEPTION 'Este e-mail já está em uso.';
    END IF;

    -- 3. Criar UUID para o novo utilizador
    v_new_user_id := gen_random_uuid();

    -- Desativar trigger de validações extra temporariamente na tabela public.users
    -- Tem de ser ANTES do insert na auth.users, pois esse insert dispara a criação na public.users
    ALTER TABLE public.users DISABLE TRIGGER USER;

    -- 4. Inserir no auth.users (A palavra-passe é encriptada nativamente)
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

    -- 4.5. Inserir Identidade (Obrigatório para o login funcionar no Supabase)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        v_new_user_id::text, -- Nas versões recentes, provider_id é muitas vezes o UUID
        json_build_object('sub', v_new_user_id, 'email', p_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
    );

    -- 5. O trigger on_auth_user_created (se existir) disparou e criou em public.users
    -- Se o trigger on_auth_user_created falhar por algum motivo, tentamos fazer INSERT, senão fazemos UPDATE
    INSERT INTO public.users (id, nome, email, telemovel, role)
    VALUES (v_new_user_id, p_nome, p_email, p_telemovel, p_role)
    ON CONFLICT (id) DO UPDATE 
    SET telemovel = EXCLUDED.telemovel, 
        role = EXCLUDED.role,
        nome = EXCLUDED.nome;
        
    -- Voltar a ativar os triggers
    ALTER TABLE public.users ENABLE TRIGGER USER;

    RETURN json_build_object('status', 'success', 'user_id', v_new_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
