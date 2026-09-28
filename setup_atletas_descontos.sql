-- ==============================================================================
-- ATLETAS COM DESCONTO NAS MENSALIDADES (BCV)
-- Script para adicionar colunas de desconto na tabela de atletas
-- ==============================================================================

-- 1. Adicionar colunas na tabela atletasbcv
ALTER TABLE public.atletasbcv 
ADD COLUMN IF NOT EXISTS desconto_mensalidade NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.atletasbcv 
ADD COLUMN IF NOT EXISTS desconto_motivo VARCHAR(150) DEFAULT NULL;

COMMENT ON COLUMN public.atletasbcv.desconto_mensalidade IS 'Percentagem de desconto nas mensalidades (ex: 50.00 para 50%)';
COMMENT ON COLUMN public.atletasbcv.desconto_motivo IS 'Justificação do desconto atribuído (ex: Irmão no clube, Apoio Social, etc.)';

-- 2. Garantir permissões públicas/autenticadas
GRANT SELECT, INSERT, UPDATE ON TABLE public.atletasbcv TO anon, authenticated, service_role;

-- 3. Assegurar registo na tabela clube_config para descontos_atletas (redundância e persistência direta)
INSERT INTO public.clube_config (chave, dados)
VALUES ('descontos_atletas', '{}'::jsonb)
ON CONFLICT (chave) DO NOTHING;
