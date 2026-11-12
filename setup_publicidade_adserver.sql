-- ==============================================================================
-- SETUP: Gestão de Espaços Publicitários e AdServer no Clube Config
-- Basket Clube de Valença (Época 2026/2027)
-- ==============================================================================

-- 1. Inserir ou atualizar configuração inicial de publicidade_adserver na tabela clube_config
INSERT INTO public.clube_config (chave, dados)
VALUES (
    'publicidade_adserver',
    '[
        {
            "id": "pub_zona_1",
            "nome": "Zona 1 - Sidebar Topo (300x250)",
            "ativo": true,
            "tipo": "adserver",
            "pub_zone_id": "pub_zn_24pynkpv1ci99t",
            "script_url": "https://pub-adserver-worker.nwaltercarvalho.workers.dev/pub.js",
            "codigo_html": "",
            "ordem": 1
        },
        {
            "id": "pub_zona_2",
            "nome": "Zona 2 - Sidebar Posição 2 (300x250)",
            "ativo": false,
            "tipo": "adserver",
            "pub_zone_id": "",
            "script_url": "https://pub-adserver-worker.nwaltercarvalho.workers.dev/pub.js",
            "codigo_html": "",
            "ordem": 2
        },
        {
            "id": "pub_zona_3",
            "nome": "Zona 3 - Sidebar Posição 3 (300x250)",
            "ativo": false,
            "tipo": "adserver",
            "pub_zone_id": "",
            "script_url": "https://pub-adserver-worker.nwaltercarvalho.workers.dev/pub.js",
            "codigo_html": "",
            "ordem": 3
        },
        {
            "id": "pub_zona_4",
            "nome": "Zona 4 - Sidebar Posição 4 (300x250)",
            "ativo": false,
            "tipo": "adserver",
            "pub_zone_id": "",
            "script_url": "https://pub-adserver-worker.nwaltercarvalho.workers.dev/pub.js",
            "codigo_html": "",
            "ordem": 4
        }
    ]'::jsonb
)
ON CONFLICT (chave) DO NOTHING;

-- 2. Garantir permissões de leitura e escrita
GRANT ALL ON TABLE public.clube_config TO anon, authenticated, service_role;
