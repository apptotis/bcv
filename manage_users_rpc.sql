-- ====================================================================
-- FUNÇÃO 1: ELIMINAR UTILIZADOR
-- ====================================================================
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid) RETURNS json AS $$
DECLARE
    v_admin_role text;
BEGIN
    -- Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem apagar utilizadores.';
    END IF;

    -- Apagar identidades primeiro (para evitar bloqueios de Foreign Key do Supabase)
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    
    -- Apagar o utilizador principal (Isto deve acionar o ON DELETE CASCADE para a tabela public.users)
    DELETE FROM auth.users WHERE id = p_user_id;
    
    RETURN json_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================================
-- FUNÇÃO 2: EDITAR UTILIZADOR
-- ====================================================================
CREATE OR REPLACE FUNCTION admin_edit_user(
    p_user_id uuid,
    p_nome text,
    p_telemovel text,
    p_role text,
    p_password text
) RETURNS json AS $$
DECLARE
    v_admin_role text;
BEGIN
    -- Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem editar utilizadores.';
    END IF;

    -- Atualizar dados na tabela pública
    -- Desativamos os triggers para evitar problemas com restos do projeto antigo (wallet_service, etc)
    ALTER TABLE public.users DISABLE TRIGGER USER;
    
    UPDATE public.users 
    SET nome = p_nome, telemovel = p_telemovel, role = p_role 
    WHERE id = p_user_id;
    
    ALTER TABLE public.users ENABLE TRIGGER USER;

    -- Atualizar email e password na tabela de sistema (se fornecida nova password)
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')), 
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    RETURN json_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
