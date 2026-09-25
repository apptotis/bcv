// Cloudflare Pages Function: /api/sync-fpb
// Sincronização oficial de Jogos e Resultados do Basket Clube de Valença (FPB Clube ID: 656)

interface Env {}

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8"
};

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

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Obter página oficial da FPB (com trailing slash obrigatório para evitar 301)
    const fpbUrl = "https://www.fpb.pt/calendario/clube_656/";
    const res = await fetch(fpbUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `A Federação Portuguesa de Basquetebol respondeu com o código HTTP ${res.status}.`
      }), {
        status: res.status,
        headers: corsHeaders
      });
    }

    const html = await res.text();
    const jogos = parseFPBCalendar(html);

    return new Response(JSON.stringify({
      success: true,
      total: jogos.length,
      agendados: jogos.filter(j => !j.is_resultado).length,
      resultados: jogos.filter(j => j.is_resultado).length,
      jogos: jogos
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: "Erro na comunicação com a FPB: " + (err?.message || String(err))
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
