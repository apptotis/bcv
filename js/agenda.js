// agenda.js — Calendário por equipa
// URL esperada: agenda.html?equipa=UUID

(async function () {
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ── Ícones e categorias por tipo de evento ───────────────────────────────
    const TIPO_INFO = {
        1: { icone: '🏀', titulo: 'Jogo', cat: 'tipo-jogo' },
        2: { icone: '📸', titulo: 'Sessão Fotográfica', cat: 'tipo-lazer' },
        3: { icone: '🍽️', titulo: 'Almoço', cat: 'tipo-refeicao' },
        4: { icone: '🌙', titulo: 'Jantar', cat: 'tipo-refeicao' },
        5: { icone: '☕', titulo: 'Pequeno Almoço', cat: 'tipo-refeicao' },
        6: { icone: '🎈', titulo: 'Insufláveis', cat: 'tipo-lazer' },
        7: { icone: '🏊', titulo: 'Piscina', cat: 'tipo-lazer' },
        8: { icone: '🧱', titulo: 'Passeio Muralhas', cat: 'tipo-lazer' },
        9: { icone: '🎶', titulo: 'Discoteca', cat: 'tipo-lazer' },
        10: { icone: '⚡', titulo: 'Jogo Eliminatória', cat: 'tipo-jogo' },
        11: { icone: '🏁', titulo: 'Encerramento', cat: 'tipo-cerimonia' },
        12: { icone: '🎉', titulo: 'Abertura do Torneio', cat: 'tipo-cerimonia' },
        13: { icone: '🌳', titulo: 'Arborismo', cat: 'tipo-lazer' },
    };

    const ESTADO_BADGE = {
        'Em Jogo': '<span class="badge-estado badge-em-jogo">Em Jogo</span>',
        'Agendado': '<span class="badge-estado badge-agendado">Agendado</span>',
        'Terminado': '<span class="badge-estado badge-terminado">Terminado</span>',
        'Cancelado': '<span class="badge-estado badge-cancelado">Cancelado</span>',
    };

    // ── Ler parâmetro da URL ─────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const equipaId = params.get('equipa');
    const header = document.getElementById('equipa-header');
    const lista = document.getElementById('agenda-lista');

    if (!equipaId) {
        header.innerHTML = '<div class="sem-equipa"><h2>⚠️ Equipa não especificada</h2><p>Utilize o link fornecido pela organização.</p></div>';
        return;
    }

    // ── Fetch em paralelo ────────────────────────────────────────────────────
    const [
        { data: equipa, error: errEquipa },
        { data: jogos, error: errJogos },
        { data: eventos, error: errEventos },
    ] = await Promise.all([
        // Dados da equipa
        supabase.from('equipas').select('*').eq('id', equipaId).single(),

        // Jogos da equipa (casa ou fora)
        supabase
            .from('jogos')
            .select(`
                *,
                equipa_casa:equipas!equipa_casa_id(id, nome, logo_url),
                equipa_fora:equipas!equipa_fora_id(id, nome, logo_url)
            `)
            .or(`equipa_casa_id.eq.${equipaId},equipa_fora_id.eq.${equipaId}`)
            .order('data_hora', { ascending: true }),

        // Eventos: públicos (todos) + privados desta equipa
        supabase
            .from('eventos')
            .select('*')
            .or(`is_publico.eq.true,equipa_id.eq.${equipaId}`)
            .order('data_hora', { ascending: true }),
    ]);

    if (errEquipa || !equipa) {
        header.innerHTML = '<div class="sem-equipa"><h2>❌ Equipa não encontrada</h2></div>';
        return;
    }

    // ── Renderizar header da equipa ──────────────────────────────────────────
    const escalaoGenero = [equipa.escalao, equipa.genero].filter(Boolean).join(' · ');
    header.innerHTML = `
        ${equipa.logo_url ? `<img class="equipa-logo" src="${equipa.logo_url}" alt="Logo ${equipa.nome}">` : '<div style="font-size:3rem;margin-bottom:8px">🏀</div>'}
        <h1>${equipa.nome}</h1>
        <div class="equipa-meta">${escalaoGenero}</div>
    `;
    document.title = `Agenda — ${equipa.nome}`;

    // ── Montar lista unificada ───────────────────────────────────────────────
    const items = [];

    // Adicionar jogos
    (jogos || []).forEach(j => {
        if (!j.data_hora) return;
        const ehCasa = j.equipa_casa_id === equipaId;
        items.push({
            data_hora: j.data_hora,
            tipo: 'jogo',
            jogo: j,
            ehCasa,
        });
    });

    // Adicionar eventos
    (eventos || []).forEach(e => {
        if (!e.data_hora) return;
        items.push({
            data_hora: e.data_hora,
            tipo: 'evento',
            evento: e,
        });
    });

    // Ordenar tudo por data/hora
    items.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

    if (items.length === 0) {
        lista.innerHTML = '<p class="agenda-msg">Nenhum item agendado para esta equipa.</p>';
        return;
    }

    // ── Renderizar agrupado por dia ──────────────────────────────────────────
    let diaAtual = '';
    const html = [];

    items.forEach(item => {
        const dt = new Date(item.data_hora);
        const dia = dt.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
        const hora = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        if (dia !== diaAtual) {
            diaAtual = dia;
            // Capitalizar primeira letra
            const diaLabel = dia.charAt(0).toUpperCase() + dia.slice(1);
            html.push(`<div class="agenda-dia">📅 ${diaLabel}</div>`);
        }

        if (item.tipo === 'jogo') {
            html.push(renderJogo(item, hora));
        } else {
            html.push(renderEvento(item, hora));
        }
    });

    lista.innerHTML = html.join('');

    // ── Funções de render ────────────────────────────────────────────────────
    function renderJogo({ jogo, ehCasa }, hora) {
        const casa = jogo.equipa_casa?.nome || '?';
        const fora = jogo.equipa_fora?.nome || '?';
        const estado = jogo.estado || 'Agendado';
        const badge = ESTADO_BADGE[estado] || '';

        const temResultado = jogo.resultado_casa !== null && jogo.resultado_fora !== null;
        const placar = temResultado
            ? `<div class="jogo-placar"><span class="score">${jogo.resultado_casa} – ${jogo.resultado_fora}</span></div>`
            : '';

        const campo = jogo.campo ? `🏟️ ${jogo.campo}` : '';
        const adversario = ehCasa
            ? `vs <strong>${fora}</strong> <em>(casa)</em>`
            : `vs <strong>${casa}</strong> <em>(fora)</em>`;

        return `
        <div class="agenda-item tipo-jogo">
            <div class="agenda-hora">${hora}</div>
            <div class="agenda-icone">🏀</div>
            <div class="agenda-info">
                <div class="agenda-titulo">Jogo ${badge}</div>
                <div class="agenda-subtitulo">${adversario}</div>
                ${campo ? `<div class="agenda-subtitulo">${campo}</div>` : ''}
                ${placar}
            </div>
        </div>`;
    }

    function renderEvento({ evento }, hora) {
        const info = TIPO_INFO[evento.tipo_evento_id] || { icone: '📅', titulo: 'Evento', cat: 'tipo-outro' };
        const isPrivado = !evento.is_publico;
        const localStr = evento.local ? `📍 ${evento.local}` : '';
        const descStr = evento.descricao ? `<div class="agenda-subtitulo">${evento.descricao}</div>` : '';
        const privateBadge = isPrivado ? '<span style="font-size:0.7rem;color:#8e44ad;margin-left:6px">🔒 Privado</span>' : '';

        return `
        <div class="agenda-item ${info.cat}">
            <div class="agenda-hora">${hora}</div>
            <div class="agenda-icone">${info.icone}</div>
            <div class="agenda-info">
                <div class="agenda-titulo">${info.titulo}${privateBadge}</div>
                ${localStr ? `<div class="agenda-subtitulo">${localStr}</div>` : ''}
                ${descStr}
            </div>
        </div>`;
    }

})();
