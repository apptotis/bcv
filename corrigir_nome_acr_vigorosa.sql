-- ==============================================================================
-- CORREÇÃO OFICIAL: Nome da Equipa 'ACR Vigorosa' no CN2 (2ª Divisão Masculina)
-- Tabelas afetadas: clube_config (competicoes -> cn2), agenda_bcv e resultados_bcv
-- ==============================================================================

-- 1. Atualizar eventuais menções na agenda_bcv
UPDATE public.agenda_bcv
SET equipa_casa = 'ACR Vigorosa'
WHERE equipa_casa ILIKE '%vigoroso%';

UPDATE public.agenda_bcv
SET equipa_fora = 'ACR Vigorosa'
WHERE equipa_fora ILIKE '%vigoroso%';

-- 2. Atualizar eventuais menções na resultados_bcv
UPDATE public.resultados_bcv
SET equipa_casa = 'ACR Vigorosa'
WHERE equipa_casa ILIKE '%vigoroso%';

UPDATE public.resultados_bcv
SET equipa_fora = 'ACR Vigorosa'
WHERE equipa_fora ILIKE '%vigoroso%';

-- 3. Atualizar o JSON de competicoes na tabela clube_config
-- Substitui 'ACR Vigoroso' por 'ACR Vigorosa' no texto dos jogos e tabela
UPDATE public.clube_config
SET dados = REPLACE(dados::TEXT, 'ACR Vigoroso', 'ACR Vigorosa')::JSONB,
    updated_at = NOW()
WHERE chave = 'competicoes';

-- 4. Exibir confirmação
SELECT chave, updated_at FROM public.clube_config WHERE chave = 'competicoes';
