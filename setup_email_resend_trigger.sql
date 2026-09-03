-- ============================================================================
-- ALTERNATIVA VIA BANCO DE DADOS: Trigger Automático para Envio de Email via Resend
-- ============================================================================
-- Se preferir que o próprio PostgreSQL do Supabase envie o email automaticamente 
-- sempre que um atleta for inserido na tabela 'atletasbcv' (sem necessitar da Edge Function):
--
-- 1. Ative a extensão 'pg_net' no Supabase (se ainda não estiver ativa):
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Função que dispara o HTTP POST para o Resend:
CREATE OR REPLACE FUNCTION public.disparar_email_inscricao_resend()
RETURNS TRIGGER AS $$
DECLARE
    v_resend_api_key TEXT := 'SUA_RESEND_API_KEY_AQUI'; -- Substitua pela sua chave do Resend
    v_sender_email TEXT := 'Basket Clube de Valença <geral@bcvalenca.pt>';
    v_destinatario TEXT;
    v_subject TEXT;
    v_html TEXT;
    v_payload JSONB;
BEGIN
    -- Determina o destinatário
    v_destinatario := COALESCE(NEW.encarregado_email, NEW.email);
    
    -- Se não houver email de contacto, não envia
    IF v_destinatario IS NULL OR TRIM(v_destinatario) = '' THEN
        RETURN NEW;
    END IF;

    v_subject := '🏀 BCV: Confirmação de Inscrição 2026/2027 - ' || COALESCE(NEW.nome, 'Atleta') || ' (' || COALESCE(NEW.escalao, '') || ')';

    v_html := '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9d5ff; border-radius: 12px;">'
           || '<div style="background: #581c87; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">'
           || '<h2 style="margin:0;">BASKET CLUBE DE VALENÇA</h2><p style="margin:5px 0 0 0; font-size: 13px;">Época 2026/2027</p>'
           || '</div><div style="padding: 20px;">'
           || '<h3 style="color: #581c87;">Inscrição Registada com Sucesso!</h3>'
           || '<p>Confirmamos a receção da inscrição de <strong>' || COALESCE(NEW.nome, '') || '</strong> no escalão <strong>' || COALESCE(NEW.escalao, '') || '</strong>.</p>'
           || '<ul>'
           || '<li><strong>Encarregado:</strong> ' || COALESCE(NEW.encarregado_nome, 'N/A') || '</li>'
           || '<li><strong>Equipamento:</strong> Camisola: ' || COALESCE(NEW.equipamento_tamanho, '-') || ' | Calção: ' || COALESCE(NEW.equipamento_tamanho_calcao, '-') || '</li>'
           || '<li><strong>Nº Preferencial:</strong> #' || COALESCE(NEW.equipamento_numero_1, '-') || '</li>'
           || '</ul>'
           || '<p>Entraremos em contacto brevemente relativamente aos treinos e exames médicos.</p>'
           || '<p>Saudações Desportivas,<br><strong>A Direção do BCV</strong></p>'
           || '</div></div>';

    v_payload := jsonb_build_object(
        'from', v_sender_email,
        'to', jsonb_build_array(v_destinatario),
        'subject', v_subject,
        'html', v_html
    );

    -- Disparo assíncrono via pg_net (não bloqueia a gravação na base de dados)
    PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_resend_api_key,
            'Content-Type', 'application/json'
        ),
        body := v_payload
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro na rede ou chave inválida, regista aviso mas NUNCA bloqueia a inserção do atleta
    RAISE WARNING 'Erro ao enviar email no trigger Resend: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criação do Trigger na tabela atletasbcv:
DROP TRIGGER IF EXISTS trg_email_confirmacao_inscricao ON public.atletasbcv;
CREATE TRIGGER trg_email_confirmacao_inscricao
    AFTER INSERT ON public.atletasbcv
    FOR EACH ROW
    EXECUTE FUNCTION public.disparar_email_inscricao_resend();
