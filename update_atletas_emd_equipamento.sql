-- Script SQL para adicionar campos de Equipamento e Exame Médico Desportivo (EMD) na tabela atletasbcv
-- Execute este comando no painel SQL Editor do seu Supabase

-- 1. Dados para Equipamentos Oficiais BCV
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_tamanho VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_tamanho_calcao VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_nome_camisola VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_numero_1 VARCHAR(10);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS equipamento_numero_2 VARCHAR(10);

-- 2. Declarações Pessoais do Exame Médico Desportivo (EMD / IPDJ)
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS emd_respostas JSONB;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS emd_resultado_anterior TEXT;
