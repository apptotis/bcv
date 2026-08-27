-- ====================================================================
-- SISTEMA DE DIRETORES DE CAMPO / SECCIONISTAS
-- Presenças, Mensalidades e Afetação de Escalão (BCV)
-- Execute este script no SQL Editor do Supabase
-- ====================================================================

-- 1. Adicionar coluna escalao_afeto à tabela public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS escalao_afeto text DEFAULT '';

-- 2. Tabela de Presenças (Chamadas de Treinos e Jogos)
CREATE TABLE IF NOT EXISTS public.presencas (
    id BIGSERIAL PRIMARY KEY,
    atleta_id BIGINT NOT NULL REFERENCES public.atletasbcv(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'Treino', -- 'Treino', 'Jogo', 'Torneio', 'Estágio'
    estado VARCHAR(30) NOT NULL DEFAULT 'Presente', -- 'Presente', 'Falta', 'Justificado', 'Lesionado'
    escalao VARCHAR(50),
    observacoes TEXT,
    registado_por VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_presenca_atleta_data_tipo UNIQUE (atleta_id, data, tipo)
);

-- Índices para pesquisa rápida de presenças
CREATE INDEX IF NOT EXISTS idx_presencas_atleta_id ON public.presencas(atleta_id);
CREATE INDEX IF NOT EXISTS idx_presencas_data ON public.presencas(data);
CREATE INDEX IF NOT EXISTS idx_presencas_escalao ON public.presencas(escalao);

-- 3. Tabela de Mensalidades (Cobrança e Quotas)
CREATE TABLE IF NOT EXISTS public.mensalidades (
    id BIGSERIAL PRIMARY KEY,
    atleta_id BIGINT NOT NULL REFERENCES public.atletasbcv(id) ON DELETE CASCADE,
    epoca VARCHAR(20) NOT NULL DEFAULT '2026/2027',
    mes VARCHAR(30) NOT NULL, -- Ex: '2026-09', '2026-10' ou 'Setembro 2026'
    valor NUMERIC(10,2) NOT NULL DEFAULT 25.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pago', -- 'Pago', 'Pendente', 'Isento'
    data_pagamento DATE,
    metodo_pagamento VARCHAR(50) DEFAULT 'Dinheiro', -- 'Dinheiro', 'MBWay', 'Transferência', 'Outro'
    recibo_num VARCHAR(50),
    notas TEXT,
    registado_por VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_mensalidade_atleta_epoca_mes UNIQUE (atleta_id, epoca, mes)
);

-- Índices para pesquisa rápida de mensalidades
CREATE INDEX IF NOT EXISTS idx_mensalidades_atleta_id ON public.mensalidades(atleta_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_epoca_mes ON public.mensalidades(epoca, mes);
CREATE INDEX IF NOT EXISTS idx_mensalidades_estado ON public.mensalidades(estado);

-- 4. Permissões e RLS (Row Level Security)
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Utilizadores Autenticados e Leitura/Escrita Anon (para o portal funcionar perfeitamente com a chave anon)
DROP POLICY IF EXISTS "Permissao Total Presencas" ON public.presencas;
CREATE POLICY "Permissao Total Presencas" ON public.presencas
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao Total Mensalidades" ON public.mensalidades;
CREATE POLICY "Permissao Total Mensalidades" ON public.mensalidades
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Atualizar Função RPC admin_create_user para suportar escalao_afeto
CREATE OR REPLACE FUNCTION admin_create_user(
    p_email text,
    p_password text,
    p_nome text,
    p_telemovel text,
    p_role text,
    p_permissoes text[] DEFAULT '{}'::text[],
    p_escalao_afeto text DEFAULT ''
) RETURNS json AS $$
DECLARE
    v_admin_role text;
    v_new_user_id uuid;
    v_user_count int;
BEGIN
    -- 5.1. Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem criar utilizadores.';
    END IF;

    -- 5.2. Verificar se o e-mail já existe
    SELECT count(*) INTO v_user_count FROM auth.users WHERE email = p_email;
    IF v_user_count > 0 THEN
        RAISE EXCEPTION 'Este e-mail já está em uso.';
    END IF;

    -- 5.3. Criar UUID para o novo utilizador
    v_new_user_id := gen_random_uuid();

    -- Desativar trigger temporariamente na tabela public.users
    ALTER TABLE public.users DISABLE TRIGGER USER;

    -- 5.4. Inserir no auth.users
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

    -- 5.5. Inserir Identidade
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

    -- 5.6. Inserir na tabela public.users com escalao_afeto
    INSERT INTO public.users (id, nome, email, telemovel, role, permissoes, escalao_afeto)
    VALUES (v_new_user_id, p_nome, p_email, p_telemovel, p_role, COALESCE(p_permissoes, '{}'::text[]), COALESCE(p_escalao_afeto, ''))
    ON CONFLICT (id) DO UPDATE 
    SET telemovel = EXCLUDED.telemovel, 
        role = EXCLUDED.role,
        nome = EXCLUDED.nome,
        permissoes = EXCLUDED.permissoes,
        escalao_afeto = EXCLUDED.escalao_afeto;
        
    -- Voltar a ativar os triggers
    ALTER TABLE public.users ENABLE TRIGGER USER;

    RETURN json_build_object('status', 'success', 'user_id', v_new_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atualizar Função RPC admin_edit_user para suportar escalao_afeto
CREATE OR REPLACE FUNCTION admin_edit_user(
    p_user_id uuid,
    p_nome text,
    p_telemovel text,
    p_role text,
    p_password text,
    p_permissoes text[] DEFAULT '{}'::text[],
    p_escalao_afeto text DEFAULT ''
) RETURNS json AS $$
DECLARE
    v_admin_role text;
BEGIN
    -- 6.1. Verificar se quem chama a função é admin
    SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas administradores podem editar utilizadores.';
    END IF;

    -- 6.2. Atualizar dados na tabela pública
    ALTER TABLE public.users DISABLE TRIGGER USER;
    
    UPDATE public.users 
    SET nome = p_nome, 
        telemovel = p_telemovel, 
        role = p_role,
        permissoes = COALESCE(p_permissoes, '{}'::text[]),
        escalao_afeto = COALESCE(p_escalao_afeto, '')
    WHERE id = p_user_id;
    
    ALTER TABLE public.users ENABLE TRIGGER USER;

    -- 6.3. Atualizar password na auth.users (se fornecida)
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE auth.users 
        SET encrypted_password = crypt(p_password, gen_salt('bf')), 
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    RETURN json_build_object('status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
