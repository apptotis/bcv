-- Script SQL para adicionar o campo 'nickname' à tabela de atletas
-- Execute este comando no painel SQL Editor do seu Supabase

ALTER TABLE public.atletasbcv ADD COLUMN nickname VARCHAR(255);
