-- ==============================================================================
-- SETUP: Suporte a Torneios / Concentrações / Festivais na Agenda do BCV
-- Basket Clube de Valença (Época 2026/2027)
-- ==============================================================================

-- 1. Adicionar colunas de suporte a Torneios e Eventos na tabela agenda_bcv
ALTER TABLE IF EXISTS public.agenda_bcv 
    ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(20) DEFAULT 'jogo',
    ADD COLUMN IF NOT EXISTS nome_evento TEXT,
    ADD COLUMN IF NOT EXISTS equipas_participantes TEXT,
    ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 2. Garantir permissões de acesso
GRANT ALL ON TABLE public.agenda_bcv TO anon, authenticated, service_role;

-- 3. Confirmação das colunas da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agenda_bcv';

