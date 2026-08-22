-- Script SQL para remover as colunas não utilizadas da tabela atletasbcv no Supabase
-- Execute este comando no SQL Editor do Supabase

ALTER TABLE public.atletasbcv DROP COLUMN IF EXISTS equipafpb;
ALTER TABLE public.atletasbcv DROP COLUMN IF EXISTS equipabcv1;
ALTER TABLE public.atletasbcv DROP COLUMN IF EXISTS equipabcv2;
