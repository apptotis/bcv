-- ============================================================
-- MIGRAÇÃO: Reestruturação da Base de Dados - Eventos
-- Data: 2026-02-19
-- ============================================================


-- ============================================================
-- 1. TABELA EQUIPAS - Renomear coluna treinadores -> tecnico
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'equipas'
          AND column_name = 'treinadores'
    ) THEN
        ALTER TABLE public.equipas RENAME COLUMN treinadores TO tecnico;
        RAISE NOTICE 'Coluna "treinadores" renomeada para "tecnico" com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna "treinadores" não existe (pode já ter sido renomeada).';
    END IF;
END $$;


-- ============================================================
-- 2. TABELA USERS - Adicionar coluna role
-- ============================================================
DO $$
BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    RAISE NOTICE 'Coluna "role" adicionada à tabela users.';
END $$;

COMMENT ON COLUMN public.users.role IS 'Papel do utilizador: user, tecnico, admin';


-- ============================================================
-- 3. TABELA TIPO_EVENTOS - Tipos de evento disponíveis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tipo_eventos (
    id   SMALLINT PRIMARY KEY,
    nome TEXT     NOT NULL
);

-- Preencher com os tipos de evento (INSERT OR IGNORE equivalente)
INSERT INTO public.tipo_eventos (id, nome) VALUES
    (1,  'Jogo'),
    (2,  'Sessão Fotográfica'),
    (3,  'Almoço'),
    (4,  'Jantar'),
    (5,  'Pequeno Almoço'),
    (6,  'Insufláveis'),
    (7,  'Piscina'),
    (8,  'Passeio Muralhas'),
    (9,  'Discoteca'),
    (10, 'Jogo Elimina'),
    (11, 'Encerramento'),
    (12, 'Abertura Torneio')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. TABELA EVENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eventos (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_publico       BOOLEAN NOT NULL DEFAULT true,   -- true = Público / false = Privado
    tipo_evento_id   SMALLINT REFERENCES public.tipo_eventos(id) ON DELETE SET NULL,
    local            TEXT NOT NULL,
    data_hora        TIMESTAMP WITH TIME ZONE NOT NULL,
    tecnicos         TEXT,  -- Nomes dos técnicos envolvidos (texto livre)
    descricao        TEXT   -- Descrição opcional do evento
);

COMMENT ON COLUMN public.eventos.is_publico    IS 'true = visível a todos; false = só técnicos/admins';
COMMENT ON COLUMN public.eventos.tipo_evento_id IS 'Referência à tabela tipo_eventos';
COMMENT ON COLUMN public.eventos.tecnicos       IS 'Nomes dos técnicos responsáveis pelo evento';


-- ============================================================
-- 5. SEGURANÇA (RLS) - Tabela TIPO_EVENTOS
-- ============================================================
ALTER TABLE public.tipo_eventos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'tipo_eventos' AND policyname = 'Leitura pública de tipo_eventos'
    ) THEN
        CREATE POLICY "Leitura pública de tipo_eventos"
            ON public.tipo_eventos FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'tipo_eventos' AND policyname = 'Admin pode gerir tipo_eventos'
    ) THEN
        CREATE POLICY "Admin pode gerir tipo_eventos"
            ON public.tipo_eventos FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid() AND role IN ('admin')
                )
            );
    END IF;
END $$;


-- ============================================================
-- 6. SEGURANÇA (RLS) - Tabela EVENTOS
-- ============================================================
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Leitura de eventos públicos (qualquer pessoa, incluindo anónimos)
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Leitura de eventos públicos'
    ) THEN
        CREATE POLICY "Leitura de eventos públicos"
            ON public.eventos FOR SELECT
            USING (is_publico = true);
    END IF;

    -- Leitura de eventos privados (só técnicos e admins autenticados)
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Técnicos e admins veem eventos privados'
    ) THEN
        CREATE POLICY "Técnicos e admins veem eventos privados"
            ON public.eventos FOR SELECT
            TO authenticated
            USING (
                is_publico = false AND
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid() AND role IN ('tecnico', 'admin')
                )
            );
    END IF;

    -- Inserir eventos (só admins)
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Admin pode inserir eventos'
    ) THEN
        CREATE POLICY "Admin pode inserir eventos"
            ON public.eventos FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Atualizar eventos (só admins)
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Admin pode atualizar eventos'
    ) THEN
        CREATE POLICY "Admin pode atualizar eventos"
            ON public.eventos FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Eliminar eventos (só admins)
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'Admin pode eliminar eventos'
    ) THEN
        CREATE POLICY "Admin pode eliminar eventos"
            ON public.eventos FOR DELETE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;


-- ============================================================
-- 7. CONFIRMAR RESULTADO
-- ============================================================
SELECT 'Migração concluída com sucesso!' AS status;

SELECT 'Tipos de evento inseridos:' AS info, COUNT(*) AS total FROM public.tipo_eventos;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'eventos'
ORDER BY ordinal_position;
