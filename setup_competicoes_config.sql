-- ==============================================================================
-- SETUP: Gestão de Competições Oficiais do BC Valença (clube_config)
-- Basket Clube de Valença (Época 2026/2027)
-- ==============================================================================

-- 1. Garantir que a tabela clube_config existe
CREATE TABLE IF NOT EXISTS public.clube_config (
    chave VARCHAR(50) PRIMARY KEY,
    dados JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantir políticas RLS para leitura pública e escrita por administradores
ALTER TABLE public.clube_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de configuracoes" ON public.clube_config;
CREATE POLICY "Leitura publica de configuracoes" ON public.clube_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Gestao autenticada de configuracoes" ON public.clube_config;
CREATE POLICY "Gestao autenticada de configuracoes" ON public.clube_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.clube_config TO anon, authenticated, service_role;

-- 3. Inserir ou Inicializar as Competições Oficiais do BC Valença
INSERT INTO public.clube_config (chave, dados, updated_at)
VALUES (
    'competicoes',
    '[
        {
            "id": "cn2",
            "sigla": "CN2",
            "nome": "Campeonato Nacional da 2.ª Divisão Masculina (CN2)",
            "escalao": "Seniores",
            "sexo": "Masculino",
            "equipa_label": "Seniores Masculinos",
            "tag": "FPB • Nacional",
            "tipo": "nacional",
            "detalhe": "Zona Norte • Federação Portuguesa de Basquetebol",
            "icon": "🏀",
            "ativo": true,
            "ordem": 1
        },
        {
            "id": "taca_portugal",
            "sigla": "Taça de Portugal",
            "nome": "Taça de Portugal de Basquetebol",
            "escalao": "Seniores",
            "sexo": "Masculino",
            "equipa_label": "Seniores Masculinos",
            "tag": "FPB • Nacional",
            "tipo": "nacional",
            "detalhe": "Fases Eliminatórias Nacionais • Federação Portuguesa de Basquetebol",
            "icon": "🏆",
            "ativo": true,
            "ordem": 2
        },
        {
            "id": "sub18_masc",
            "sigla": "Sub 18 Masc",
            "nome": "Campeonato Distrital Sub 18 Masculino",
            "escalao": "Sub 18",
            "sexo": "Masculino",
            "equipa_label": "Sub 18 Masculinos",
            "tag": "ABVC • Distrital",
            "tipo": "distrital",
            "detalhe": "Fase Regular e Taça Distrital • AB Viana do Castelo",
            "icon": "🏀",
            "ativo": true,
            "ordem": 3
        },
        {
            "id": "sub16_fem",
            "sigla": "Sub 16 Fem",
            "nome": "Campeonato Distrital Sub 16 Feminino",
            "escalao": "Sub 16",
            "sexo": "Feminino",
            "equipa_label": "Sub 16 Femininos",
            "tag": "ABVC • Distrital",
            "tipo": "distrital",
            "detalhe": "Campeonato Inter-distrital • AB Viana do Castelo / FPB",
            "icon": "🏀",
            "ativo": true,
            "ordem": 4
        },
        {
            "id": "sub14_masc",
            "sigla": "Sub 14 Masc",
            "nome": "Campeonato Distrital Sub 14 Masculino",
            "escalao": "Sub 14",
            "sexo": "Masculino",
            "equipa_label": "Sub 14 Masculinos",
            "tag": "ABVC • Distrital",
            "tipo": "distrital",
            "detalhe": "Campeonato Distrital de Formação • AB Viana do Castelo",
            "icon": "🏀",
            "ativo": true,
            "ordem": 5
        },
        {
            "id": "sub14_fem",
            "sigla": "Sub 14 Fem",
            "nome": "Campeonato Distrital Sub 14 Feminino",
            "escalao": "Sub 14",
            "sexo": "Feminino",
            "equipa_label": "Sub 14 Femininos",
            "tag": "ABVC • Distrital",
            "tipo": "distrital",
            "detalhe": "Campeonato Distrital de Formação • AB Viana do Castelo",
            "icon": "🏀",
            "ativo": true,
            "ordem": 6
        },
        {
            "id": "minibasquete",
            "sigla": "Minibasquete",
            "nome": "Circuitos e Torneios de Minibasquete",
            "escalao": "Mini 12",
            "sexo": "Misto",
            "equipa_label": "Mini 12, Mini 10, Mini 8 & BabyBasket",
            "tag": "FPB / ABVC",
            "tipo": "distrital",
            "detalhe": "Festivais e Concentrações de Iniciação e Formação",
            "icon": "⭐",
            "ativo": true,
            "ordem": 7
        }
    ]'::jsonb,
    NOW()
)
ON CONFLICT (chave) DO NOTHING;
