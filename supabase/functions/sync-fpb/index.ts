// Supabase Edge Function: sync-fpb
// Sincronização oficial de Jogos (Agenda) e Resultados do Basket Clube de Valença (FPB ID: 656)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FPBGame {
  fpb_id: string | null;
  data_jogo: string;
  raw_data: string;
  equipa_casa: string;
  equipa_fora: string;
  hora_jogo: string | null;
  is_resultado: boolean;
  pontos_casa: number | null;
  pontos_fora: number | null;
  local: string;
  competicao: string;
  escalao: string;
}

function parseFPBCalendar(rawHtml: string): FPBGame[] {
  const games: FPBGame[] = [];
  const monthsMap: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };

  // Dividir pelos blocos de dia
  const dayBlocks = rawHtml.split(/<div class="day-wrapper[^"]*">/i);

  for (let i = 1; i < dayBlocks.length; i++) {
    const block = dayBlocks[i];

    // Data do dia (ex: "3 OUT 2026")
    const dateMatch = block.match(/<h3 class="date">([\s\S]*?)<\/h3>/i);
    const rawDate = dateMatch ? dateMatch[1].trim() : '';
    let formattedDate = '';

    if (rawDate) {
      const parts = rawDate.split(/\s+/);
      if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = monthsMap[parts[1].toUpperCase()] || '01';
        const year = parts[2];
        formattedDate = `${year}-${month}-${day}`;
      }
    }

    // Dividir pelos jogos com ficha de jogo
    const gameItems = block.split(/<a href="([^"]*ficha-de-jogo[^"]*)"/i);
    for (let j = 1; j < gameItems.length; j += 2) {
      const gameLink = gameItems[j];
      const gameContent = gameItems[j + 1];

      // ID do jogo
      const internalIdMatch = gameLink.match(/internalID=(\d+)/i);
      const internalId = internalIdMatch ? internalIdMatch[1] : null;

      // Equipa Casa
      const team1Match = gameContent.match(/class="team-container align-self-center">[\s\S]*?class="fullName">([^<]+)<\/span>/i);
      const team1 = team1Match ? team1Match[1].trim() : '';

      // Hora ou Resultado
      const hourMatch = gameContent.match(/<div class="hour align-self-center">[\s\S]*?<h3>([\s\S]*?)<\/h3>/i);
      const rawHour = hourMatch ? hourMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // Equipa Fora
      const team2Match = gameContent.match(/class="team-container right align-self-center">[\s\S]*?class="fullName">([^<]+)<\/span>/i);
      const team2 = team2Match ? team2Match[1].trim() : '';

      // Local
      const locMatch = gameContent.match(/<div class="location-wrapper[^"]*">[\s\S]*?<b>([\s\S]*?)<\/b>/i);
      const local = locMatch ? locMatch[1].replace(/\s+/g, ' ').trim() : '';

      // Competição & Escalão
      const compMatch = gameContent.match(/<div class="competition">[\s\S]*?<span>([\s\S]*?)<\/span>/i);
      const rawComp = compMatch ? compMatch[1].trim() : '';

      // Mapeamento normalizado de Escalões do BCV
      let escalao = 'BCV';
      if (/Sub\s*14/i.test(rawComp)) escalao = 'Sub 14';
      else if (/Sub\s*16/i.test(rawComp)) escalao = 'Sub 16';
      else if (/Sub\s*18/i.test(rawComp)) escalao = 'Sub 18';
      else if (/Sub\s*20/i.test(rawComp)) escalao = 'Sub 20';
      else if (/S[eé]nior|CN2|1ª Div/i.test(rawComp)) escalao = 'Seniores';
      else if (/Mini\s*12/i.test(rawComp)) escalao = 'Mini 12';
      else if (/Mini\s*10/i.test(rawComp)) escalao = 'Mini 10';
      else if (/Mini\s*8/i.test(rawComp)) escalao = 'Mini 8';
      else if (/Baby/i.test(rawComp)) escalao = 'BabyBasket';
      else if (/Veterano/i.test(rawComp)) escalao = 'Veteranos';

      // Verificar se é resultado com pontos
      const scoreMatch = rawHour.match(/(\d+)\s*[-:]\s*(\d+)/);
      const isResult = !!scoreMatch;
      let pontosCasa: number | null = null;
      let pontosFora: number | null = null;
      let horaJogo: string | null = null;

      if (isResult) {
        pontosCasa = parseInt(scoreMatch[1], 10);
        pontosFora = parseInt(scoreMatch[2], 10);
      } else {
        const hmMatch = rawHour.match(/(\d{1,2}:\d{2})/);
        horaJogo = hmMatch ? hmMatch[1] : (rawHour.toLowerCase().includes('definir') ? 'A definir' : rawHour);
      }

      games.push({
        fpb_id: internalId,
        data_jogo: formattedDate,
        raw_data: rawDate,
        equipa_casa: team1,
        equipa_fora: team2,
        hora_jogo: horaJogo,
        is_resultado: isResult,
        pontos_casa: pontosCasa,
        pontos_fora: pontosFora,
        local: local,
        competicao: rawComp,
        escalao: escalao
      });
    }
  }

  return games;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let preview = url.searchParams.get("preview") === "true";

    // Se vier no body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.preview !== undefined) preview = !!body.preview;
      } catch (_) {
        // Sem body json
      }
    }

    // 1. Obter página oficial da FPB para o BC Valença (Clube 656)
    const fpbUrl = "https://www.fpb.pt/calendario/clube_656";
    const res = await fetch(fpbUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!res.ok) {
      throw new Error(`Falha ao contactar servidor da FPB (Status ${res.status})`);
    }

    const html = await res.text();
    const jogos = parseFPBCalendar(html);

    // Se for modo preview, apenas devolvemos os jogos sem alterar a BD
    if (preview) {
      return new Response(
        JSON.stringify({
          sucesso: true,
          total: jogos.length,
          agendados: jogos.filter(j => !j.is_resultado).length,
          resultados: jogos.filter(j => j.is_resultado).length,
          jogos: jogos
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Gravar no Supabase através da função RPC
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: rpcResult, error: rpcError } = await supabase.rpc("sincronizar_jogos_fpb", {
      jogos_payload: jogos
    });

    if (rpcError) {
      throw rpcError;
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        resultado_sincronizacao: rpcResult,
        total_jogos_encontrados: jogos.length,
        jogos: jogos
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Erro na Edge Function sync-fpb:", err);
    return new Response(
      JSON.stringify({ sucesso: false, error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
