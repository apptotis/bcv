-- Migração de Tamanhos de Equipamento: Substituição de 14 / 14 anos por XS
-- Basket Clube de Valença

UPDATE public.atletasbcv
SET equipamento_tamanho = 'XS'
WHERE TRIM(UPPER(equipamento_tamanho)) = '14' OR TRIM(LOWER(equipamento_tamanho)) = '14 anos';

UPDATE public.atletasbcv
SET equipamento_tamanho_calcao = 'XS'
WHERE TRIM(UPPER(equipamento_tamanho_calcao)) = '14' OR TRIM(LOWER(equipamento_tamanho_calcao)) = '14 anos';
