// Supabase Edge Function: confirmacao-inscricao
// Envia email de confirmação ao Encarregado / Atleta via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Tratamento de CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { atleta } = await req.json();

    if (!atleta) {
      return new Response(
        JSON.stringify({ error: "Dados do atleta em falta no corpo do pedido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailDestino = atleta.encarregado_email || atleta.email;
    if (!emailDestino) {
      return new Response(
        JSON.stringify({ error: "Nenhum email de contacto encontrado (atleta ou encarregado)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY não configurada no Supabase Secrets.");
      return new Response(
        JSON.stringify({ error: "Chave do Resend não configurada no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remetente oficial (ou fallback de desenvolvimento do Resend se o domínio não estiver ativo)
    const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Basket Clube de Valença <geral@bcvalenca.pt>";
    const emailNotificacaoClube = Deno.env.get("CLUBE_NOTIF_EMAIL") || "geral@bcvalenca.pt";

    const nomeAtleta = atleta.nome || "Atleta";
    const escalao = atleta.escalao || "Não especificado";
    const encarregadoNome = atleta.encarregado_nome || "Encarregado(a) de Educação";
    const dataNascimento = atleta.data_nascimento || "-";
    const tamCamisola = atleta.equipamento_tamanho || "-";
    const tamCalcao = atleta.equipamento_tamanho_calcao || "-";
    const nomeCamisola = atleta.equipamento_nome_camisola || atleta.nickname || nomeAtleta.split(" ")[0];
    const numPref = atleta.equipamento_numero_1 ? `#${atleta.equipamento_numero_1}` : "-";

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Inscrição - Basket Clube de Valença</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Content Box -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b0764 0%, #6b21a8 100%); padding: 32px 24px; text-align: center;">
              <img src="https://bcvalenca.pt/assets/emblema_png.png" alt="Basket Clube de Valença" width="75" height="75" style="margin-bottom: 12px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: 0.5px;">BASKET CLUBE DE VALENÇA</h1>
              <p style="color: #e9d5ff; font-size: 13px; font-weight: 500; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Época Desportiva 2026/2027</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="color: #581c87; font-size: 19px; font-weight: 700; margin-top: 0; margin-bottom: 14px;">
                🎉 Inscrição Registada com Sucesso!
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
                Estimado(a) <strong>${encarregadoNome}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 24px;">
                Confirmamos a receção da inscrição do atleta <strong>${nomeAtleta}</strong> no <strong>Basket Clube de Valença</strong> para a época desportiva <strong>2026/2027</strong>.
              </p>

              <!-- Resumo da Inscrição Card -->
              <table role="presentation" width="100%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h3 style="color: #6b21a8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
                      📋 Resumo dos Dados Registados
                    </h3>
                    <table role="presentation" width="100%" style="font-size: 14px; line-height: 1.8; color: #4b5563;">
                      <tr>
                        <td width="40%" style="font-weight: 600; color: #1f2937;">Atleta:</td>
                        <td width="60%">${nomeAtleta}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #1f2937;">Escalão:</td>
                        <td style="color: #6b21a8; font-weight: 700;">${escalao}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #1f2937;">Data de Nascimento:</td>
                        <td>${dataNascimento}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #1f2937;">Encarregado(a):</td>
                        <td>${encarregadoNome} (${atleta.encarregado_qualidade || "Encarregado"})</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #1f2937;">Tamanho Equipamento:</td>
                        <td>Camisola: ${tamCamisola} | Calção: ${tamCalcao}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #1f2937;">Nome na Camisola:</td>
                        <td><strong>${nomeCamisola}</strong> (Nº Preferencial: ${numPref})</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Caixa de Informação / Próximos Passos -->
              <div style="background-color: #f8fafc; border-left: 4px solid #6b21a8; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 14px; font-weight: 700;">📌 Próximos Passos:</h4>
                <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #475569; line-height: 1.6;">
                  <li><strong>Exame Médico Desportivo (EMD):</strong> Lembre-se de realizar o exame médico oficial antes do início dos jogos oficiais da época.</li>
                  <li><strong>Comunicação e Treinos:</strong> A equipa técnica e os diretores de escalão entrarão em contacto para agendamento dos treinos e entrega de equipamentos.</li>
                </ul>
              </div>

              <!-- Botão Website -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="https://bcvalenca.pt" style="display: inline-block; background-color: #6b21a8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 3px 10px rgba(107,33,168,0.25);">
                  Aceder ao Website do BCV →
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin-bottom: 0;">
                Com os melhores cumprimentos desportivos,<br>
                <strong>A Direção do Basket Clube de Valença</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;"><strong>Basket Clube de Valença</strong> — Pavilhão Municipal de Valença</p>
              <p style="margin: 0 0 8px 0;">Email: <a href="mailto:geral@bcvalenca.pt" style="color: #6b21a8; text-decoration: none;">geral@bcvalenca.pt</a> | Web: <a href="https://bcvalenca.pt" style="color: #6b21a8; text-decoration: none;">bcvalenca.pt</a></p>
              <p style="margin: 0; font-size: 11px;">Este é um email automático de confirmação gerado aquando da submissão da ficha de inscrição.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 2. Chamada à API do Resend
    const resendPayload: any = {
      from: senderEmail,
      to: [emailDestino],
      subject: `🏀 BCV: Confirmação de Inscrição 2026/2027 - ${nomeAtleta} (${escalao})`,
      html: emailHtml,
    };

    // Adiciona o email do clube em cópia oculta (BCC) se configurado
    if (emailNotificacaoClube && emailNotificacaoClube !== emailDestino) {
      resendPayload.bcc = [emailNotificacaoClube];
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Erro da API Resend:", resendData);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email pelo Resend", details: resendData }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email de confirmação enviado para ${emailDestino} (ID: ${resendData.id})`);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id, to: emailDestino }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro inesperado na Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao processar email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
