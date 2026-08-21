-- Script SQL para adicionar todos os campos necessários para o Modelo 1 da FPB na tabela atletasbcv
-- Execute este comando no painel SQL Editor do seu Supabase

ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_inscricao VARCHAR(50) DEFAULT 'Revalidação';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS estatuto_fpb VARCHAR(50) DEFAULT 'FBP';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS pais_nascimento VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_doc_id VARCHAR(50) DEFAULT 'Cartão Cidadão';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS num_doc_id VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS validade_doc_id DATE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS nif VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS morada TEXT;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS localidade VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS concelho VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS distrito VARCHAR(100);

-- Seguro Desportivo
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS tipo_seguro VARCHAR(50) DEFAULT 'Seguro FPB';
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS seguro_apolice VARCHAR(100);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS seguro_companhia VARCHAR(100);

-- Tratamento de Dados Pessoais / RGPD
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_politica BOOLEAN DEFAULT TRUE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_comunicacoes BOOLEAN DEFAULT TRUE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS rgpd_marketing BOOLEAN DEFAULT TRUE;

-- Encarregado de Educação (Menores)
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_nome VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_qualidade VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_tipo_doc VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_num_doc VARCHAR(50);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_validade_doc DATE;
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_email VARCHAR(255);
ALTER TABLE public.atletasbcv ADD COLUMN IF NOT EXISTS encarregado_telefone VARCHAR(30);
