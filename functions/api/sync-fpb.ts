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
  logo_casa?: string | null;
  logo_fora?: string | null;
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

      // Equipa Casa & Logo
      const team1Match = gameContent.match(/class="team-container align-self-center">[\s\S]*?class="fullName">([^<]+)<\/span>/i);
      const team1 = team1Match ? team1Match[1].trim() : '';
      const logo1Match = gameContent.match(/class="team-container align-self-center">[\s\S]*?<img[^>]+src="([^">]+)"/i);
      const logo1 = logo1Match ? logo1Match[1].trim() : null;

      // Hora ou Resultado
      const hourMatch = gameContent.match(/<div class="hour align-self-center">[\s\S]*?<h3>([\s\S]*?)<\/h3>/i);
      const rawHour = hourMatch ? hourMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // Equipa Fora & Logo
      const team2Match = gameContent.match(/class="team-container right align-self-center">[\s\S]*?class="fullName">([^<]+)<\/span>/i);
      const team2 = team2Match ? team2Match[1].trim() : '';
      const logo2Match = gameContent.match(/class="team-container right align-self-center">[\s\S]*?<img[^>]+src="([^">]+)"/i);
      const logo2 = logo2Match ? logo2Match[1].trim() : null;

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

      // Verificar se é resultado com pontos (bloco oficial .results_wrapper ou .hour)
      let isResult = false;
      let pontosCasa: number | null = null;
      let pontosFora: number | null = null;
      let horaJogo: string | null = null;

      const resMatch = gameContent.match(/class="results_wrapper[^"]*"[\s\S]*?class="results_text[^"]*">\s*(\d+)\s*<\/h3>[\s\S]*?class="results_text[^"]*">\s*(\d+)\s*<\/h3>/i);
      if (resMatch) {
        isResult = true;
        pontosCasa = parseInt(resMatch[1], 10);
        pontosFora = parseInt(resMatch[2], 10);
      } else {
        // Hora ou Resultado na div.hour
        const hourMatch = gameContent.match(/<div class="hour align-self-center">[\s\S]*?<h3>([\s\S]*?)<\/h3>/i);
        const rawHour = hourMatch ? hourMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const scoreMatch = rawHour.match(/(\d+)\s*[-:]\s*(\d+)/);

        if (scoreMatch) {
          isResult = true;
          pontosCasa = parseInt(scoreMatch[1], 10);
          pontosFora = parseInt(scoreMatch[2], 10);
        } else {
          const hmMatch = rawHour.match(/(\d{1,2})[:Hh](\d{2})/i);
          if (hmMatch) {
            horaJogo = `${hmMatch[1].padStart(2, '0')}:${hmMatch[2]}`;
          } else {
            horaJogo = rawHour.toLowerCase().includes('definir') ? 'A definir' : (rawHour || null);
          }
        }
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
        escalao: escalao,
        logo_casa: logo1,
        logo_fora: logo2
      });
    }
  }

  return games;
}

function mergeFPBGames(calendarGames: FPBGame[], resultGames: FPBGame[]): FPBGame[] {
  const map = new Map<string, FPBGame>();

  function getKey(g: FPBGame) {
    if (g.fpb_id) return 'id_' + g.fpb_id;
    const c = (g.equipa_casa || '').trim().toLowerCase();
    const f = (g.equipa_fora || '').trim().toLowerCase();
    return `${g.data_jogo}_${c}_${f}`;
  }

  // 1. Inserir todos os jogos de calendário (têm a hora oficial marcada pela FPB)
  for (const g of calendarGames) {
    map.set(getKey(g), { ...g });
  }

  // 2. Mesclar jogos de resultados sem apagar as horas ou detalhes do calendário
  for (const g of resultGames) {
    const key = getKey(g);
    const existing = map.get(key);
    const hasValidScore = g.pontos_casa !== null && g.pontos_casa !== undefined && g.pontos_fora !== null && g.pontos_fora !== undefined;

    if (existing) {
      // Preservar hora oficial: a página de resultados não lista hora para jogos futuros ou decorridos sem placar
      const horaFinal = (g.hora_jogo && g.hora_jogo !== 'A definir') 
        ? g.hora_jogo 
        : (existing.hora_jogo || g.hora_jogo || null);

      const localFinal = (g.local && g.local.trim()) ? g.local : (existing.local || '');
      const competicaoFinal = (g.competicao && g.competicao.trim()) ? g.competicao : (existing.competicao || '');
      const escalaoFinal = (g.escalao && g.escalao !== 'BCV') ? g.escalao : (existing.escalao || g.escalao || 'BCV');
      const logoCasaFinal = g.logo_casa || existing.logo_casa || null;
      const logoForaFinal = g.logo_fora || existing.logo_fora || null;

      map.set(key, {
        ...existing,
        ...g,
        hora_jogo: horaFinal,
        local: localFinal,
        competicao: competicaoFinal,
        escalao: escalaoFinal,
        logo_casa: logoCasaFinal,
        logo_fora: logoForaFinal,
        is_resultado: hasValidScore ? true : existing.is_resultado,
        pontos_casa: hasValidScore ? g.pontos_casa : existing.pontos_casa,
        pontos_fora: hasValidScore ? g.pontos_fora : existing.pontos_fora
      });
    } else {
      map.set(key, {
        ...g,
        is_resultado: hasValidScore
      });
    }
  }

  return Array.from(map.values());
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fpbHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7"
    };

    // 1. Obter em paralelo tanto a Agenda como os Resultados oficiais do BC Valença (Clube 656)
    const [calRes, resRes] = await Promise.allSettled([
      fetch("https://www.fpb.pt/calendario/clube_656/", { headers: fpbHeaders }),
      fetch("https://www.fpb.pt/resultados/clube_656/", { headers: fpbHeaders })
    ]);

    let calHtml = "";
    let resHtml = "";

    if (calRes.status === "fulfilled" && calRes.value.ok) {
      calHtml = await calRes.value.text();
    }
    if (resRes.status === "fulfilled" && resRes.value.ok) {
      resHtml = await resRes.value.text();
    }

    if (!calHtml && !resHtml) {
      return new Response(JSON.stringify({
        success: false,
        error: "Não foi possível obter os dados da FPB (Agenda e Resultados indisponíveis no momento)."
      }), {
        status: 502,
        headers: corsHeaders
      });
    }

    const calGames = calHtml ? parseFPBCalendar(calHtml) : [];
    const resGames = resHtml ? parseFPBCalendar(resHtml) : [];
    const jogos = mergeFPBGames(calGames, resGames);

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
