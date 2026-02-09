-- 1. Atualizar Tabela de Equipas (Adicionar colunas se faltarem)
DO $$
BEGIN
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS foto_grupo_url TEXT; -- Foto de grupo
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS localizacao TEXT;    -- Cidade/Origem
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS descricao TEXT;      -- Breve descrição
    ALTER TABLE public.equipas ADD COLUMN IF NOT EXISTS treinadores TEXT;    -- Nomes dos treinadores
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column already exists in equipas.';
END $$;

-- 2. Tabela de Atletas (Compatível com ID numérico da equipa)
-- Se a tabela equipas usa ID numérico (bigint), a foreign key deve ser BIGINT.
CREATE TABLE IF NOT EXISTS public.atletas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome TEXT NOT NULL,
    foto_url TEXT,
    equipa_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE
);

-- 3. Tabela de Jogos
CREATE TABLE IF NOT EXISTS public.jogos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    equipa_casa_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE,
    equipa_fora_id BIGINT REFERENCES public.equipas(id) ON DELETE CASCADE,
    escalao TEXT, -- Mini 8, Mini 10, Mini 12
    data_hora TIMESTAMP WITH TIME ZONE,
    campo TEXT, -- Campo 1, Campo 2, etc.
    resultado_casa INTEGER DEFAULT 0,
    resultado_fora INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'Agendado' -- Agendado, Em Andamento, Finalizado
);

-- Habilitar RLS e criar Policies
ALTER TABLE public.equipas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policies de Leitura (Públicas)
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'equipas' AND policyname = 'Leitura pública de equipas') THEN
        CREATE POLICY "Leitura pública de equipas" ON public.equipas FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'atletas' AND policyname = 'Leitura pública de atletas') THEN
        CREATE POLICY "Leitura pública de atletas" ON public.atletas FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'jogos' AND policyname = 'Leitura pública de jogos') THEN
        CREATE POLICY "Leitura pública de jogos" ON public.jogos FOR SELECT USING (true);
    END IF;

    -- Policies de Escrita (Apenas Autenticados)
    -- Equipas
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'equipas' AND policyname = 'Admin pode inserir equipas') THEN
        CREATE POLICY "Admin pode inserir equipas" ON public.equipas FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'equipas' AND policyname = 'Admin pode atualizar equipas') THEN
        CREATE POLICY "Admin pode atualizar equipas" ON public.equipas FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'equipas' AND policyname = 'Admin pode deletar equipas') THEN
        CREATE POLICY "Admin pode deletar equipas" ON public.equipas FOR DELETE TO authenticated USING (true);
    END IF;

    -- Atletas
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'atletas' AND policyname = 'Admin pode inserir atletas') THEN
        CREATE POLICY "Admin pode inserir atletas" ON public.atletas FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'atletas' AND policyname = 'Admin pode atualizar atletas') THEN
        CREATE POLICY "Admin pode atualizar atletas" ON public.atletas FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'atletas' AND policyname = 'Admin pode deletar atletas') THEN
        CREATE POLICY "Admin pode deletar atletas" ON public.atletas FOR DELETE TO authenticated USING (true);
    END IF;

    -- Jogos
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'jogos' AND policyname = 'Admin pode inserir jogos') THEN
        CREATE POLICY "Admin pode inserir jogos" ON public.jogos FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'jogos' AND policyname = 'Admin pode atualizar jogos') THEN
        CREATE POLICY "Admin pode atualizar jogos" ON public.jogos FOR UPDATE TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'jogos' AND policyname = 'Admin pode deletar jogos') THEN
        CREATE POLICY "Admin pode deletar jogos" ON public.jogos FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- 4. Tabela de Perfis de Usuários (Ligada ao Supabase Auth)
-- Esta tabela estende os dados do auth.users (Tabela de sistema do Supabase)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nome TEXT,
    telemovel TEXT,
    email TEXT, -- Copia do email para facilitar leitura
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
-- Usuário pode ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users FOR SELECT USING (auth.uid() = id);
-- Usuário pode atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.users FOR UPDATE USING (auth.uid() = id);
-- Admins (todos nessa tabela) podem ver todos os outros users (opcional, para listar gestores)
CREATE POLICY "Admins podem ver todos os perfis" ON public.users FOR SELECT TO authenticated USING (true);


-- 5. Função e Trigger para criar perfil automaticamente ao cadastrar
-- Quando um usuário é criado no menu "Authentication", esta função roda e cria a entrada em public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nome');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
-- Drop para garantir que não duplique se rodar o script de novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
