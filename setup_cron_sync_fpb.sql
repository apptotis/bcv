-- =========================================================================
-- AUTOMAÇÃO SUPABASE (OPÇÃO A): Cron Job para Sincronização Automática FPB
-- Basket Clube de Valença (FPB ID: 656)
-- =========================================================================

-- 1. Ativar as extensões necessárias para agendamento e chamadas HTTP no Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Agendar a sincronização automática dos jogos e resultados da FPB
-- Horário: Todos os dias às 06:00 e 21:00 UTC (e no fim de semana às 12:00, 18:00 e 21:00 para capturar resultados rápidos)
-- NOTA: Substitua YOUR_PROJECT_REF pela referência do seu projeto Supabase se necessário.

SELECT cron.schedule(
    'sync-fpb-jogos-bcv-manha',
    '0 6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://mndbyptvuaqasctphmgm.supabase.co/functions/v1/sync-fpb',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
        ),
        body := jsonb_build_object('preview', false)
    );
    $$
);

SELECT cron.schedule(
    'sync-fpb-jogos-bcv-noite',
    '0 21 * * *',
    $$
    SELECT net.http_post(
        url := 'https://mndbyptvuaqasctphmgm.supabase.co/functions/v1/sync-fpb',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true)
        ),
        body := jsonb_build_object('preview', false)
    );
    $$
);

-- Para verificar os agendamentos ativos no Supabase SQL Editor:
-- SELECT * FROM cron.job;
