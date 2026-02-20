// agenda.js — Calendário por equipa com ecrã de PIN  v3

(function () {
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const TIPO_INFO = {
        1: { icone: '🏀', titulo: 'Jogo', cat: 'cat-jogo' },
        2: { icone: '📸', titulo: 'Sessão Fotográfica', cat: 'cat-lazer' },
        3: { icone: '🍽️', titulo: 'Almoço', cat: 'cat-refeicao' },
        4: { icone: '🌙', titulo: 'Jantar', cat: 'cat-refeicao' },
        5: { icone: '☕', titulo: 'Pequeno Almoço', cat: 'cat-refeicao' },
        6: { icone: '🎈', titulo: 'Insufláveis', cat: 'cat-lazer' },
        7: { icone: '🏊', titulo: 'Piscina', cat: 'cat-lazer' },
        8: { icone: '🧱', titulo: 'Passeio Muralhas', cat: 'cat-lazer' },
        9: { icone: '🎶', titulo: 'Discoteca', cat: 'cat-lazer' },
        10: { icone: '⚡', titulo: 'Jogo Eliminatória', cat: 'cat-jogo' },
        11: { icone: '🏁', titulo: 'Encerramento', cat: 'cat-cerimonia' },
        12: { icone: '🎉', titulo: 'Abertura do Torneio', cat: 'cat-cerimonia' },
        13: { icone: '🌳', titulo: 'Arborismo', cat: 'cat-lazer' },
    };

    const ESTADO_BADGE = {
        'Em Jogo': 'badge badge-em-jogo',
        'Agendado': 'badge badge-agendado',
        'Terminado': 'badge badge-terminado',
        'Cancelado': 'badge badge-cancelado',
    };

    const pinScreen = document.getElementById('pin-screen');
    const agendaScreen = document.getElementById('agenda-screen');
    const pinInput = document.getElementById('pin-input');
    const btnPin = document.getElementById('btn-pin');
    const pinError = document.getElementById('pin-error');
    const btnVoltarWrap = document.getElementById('btn-voltar-wrap');
    const btnVoltar = document.getElementById('btn-voltar');

    btnPin.addEventListener('click', carregarAgenda);
    pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') carregarAgenda(); });

    // Restaurar PIN guardado ao fazer refresh
    const pinGuardado = sessionStorage.getItem('agenda_pin');
    if (pinGuardado) {
        pinInput.value = pinGuardado;
        carregarAgenda();
    }

    async function carregarAgenda() {
        const pin = pinInput.value.trim();
        if (!pin) { pinError.textContent = 'Introduza o PIN da equipa.'; return; }

        const equipaId = parseInt(pin, 10);
        if (isNaN(equipaId)) { pinError.textContent = 'PIN inválido.'; return; }

        pinError.textContent = '';
        btnPin.textContent = 'A carregar...';
        btnPin.disabled = true;

        try {
            const [
                { data: equipa, error: e1 },
                { data: jogos, error: e2 },
                { data: eventos, error: e3 },
            ] = await Promise.all([
                supabase.from('equipas').select('*').eq('id', equipaId).single(),
                supabase
                    .from('jogos')
                    .select(`*, equipa_casa:equipas!equipa_casa_id(id,nome,logo_url), equipa_fora:equipas!equipa_fora_id(id,nome,logo_url)`)
                    .or(`equipa_casa_id.eq.${equipaId},equipa_fora_id.eq.${equipaId}`)
                    .order('data_hora', { ascending: true }),
                supabase
                    .from('eventos')
                    .select('*')
                    .or(`is_publico.eq.true,equipa_id.eq.${equipaId}`)
                    .order('data_hora', { ascending: true }),
            ]);

            if (e1 || !equipa) {
                pinError.textContent = 'PIN não encontrado. Verifique e tente novamente.';
                btnPin.textContent = 'Ver Agenda';
                btnPin.disabled = false;
                return;
            }

            renderAgenda(equipa, jogos || [], eventos || []);
            sessionStorage.setItem('agenda_pin', pin); // guardar para refresh

        } catch (err) {
            pinError.textContent = 'Erro de ligação. Tente novamente.';
            console.error(err);
            btnPin.textContent = 'Ver Agenda';
            btnPin.disabled = false;
        }
    }

    function renderAgenda(equipa, jogos, eventos) {
        // Transição de ecrã
        pinScreen.style.display = 'none';
        agendaScreen.style.display = 'flex';
        btnVoltarWrap.style.display = 'block';
        btnPin.textContent = 'Ver Agenda';
        btnPin.disabled = false;

        // Listener do botão Voltar (remover duplicados)
        const novoBtn = btnVoltar.cloneNode(true);
        btnVoltar.parentNode.replaceChild(novoBtn, btnVoltar);
        novoBtn.addEventListener('click', () => {
            agendaScreen.style.display = 'none';
            btnVoltarWrap.style.display = 'none';
            pinScreen.style.display = 'flex';
            pinInput.value = '';
            pinError.textContent = '';
            sessionStorage.removeItem('agenda_pin');
            document.title = 'Agenda da Equipa - Torneio Eurocidade';
        });

        // Banner da equipa
        const meta = [equipa.escalao, equipa.genero].filter(Boolean).join(' · ');
        document.getElementById('equipa-banner').innerHTML = `
            ${equipa.logo_url
                ? `<img src="${equipa.logo_url}" alt="Logo">`
                : '<span style="font-size:2rem">🏀</span>'}
            <div>
                <div class="equipa-nome">${equipa.nome}</div>
                ${meta ? `<div class="equipa-sub">${meta}</div>` : ''}
            </div>
        `;
        document.title = `Agenda — ${equipa.nome}`;

        // Montar lista unificada
        const items = [];
        jogos.forEach(j => {
            if (!j.data_hora) return;
            const adversario = j.equipa_casa_id === equipa.id
                ? j.equipa_fora?.nome
                : j.equipa_casa?.nome;
            items.push({ data_hora: j.data_hora, tipo: 'jogo', jogo: j, adversario: adversario || '?' });
        });
        eventos.forEach(e => {
            if (!e.data_hora) return;
            items.push({ data_hora: e.data_hora, tipo: 'evento', evento: e });
        });

        items.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

        const lista = document.getElementById('agenda-lista');
        if (items.length === 0) {
            lista.innerHTML = '<p class="agenda-vazio">Nenhum item agendado para esta equipa.</p>';
            return;
        }

        let diaAtual = '';
        const html = [];
        items.forEach(item => {
            const dt = new Date(item.data_hora);
            const dia = dt.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
            const hora = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            if (dia !== diaAtual) {
                diaAtual = dia;
                const diaLabel = dia.charAt(0).toUpperCase() + dia.slice(1);
                html.push(`<div class="agenda-dia">📅 ${diaLabel}</div>`);
            }
            html.push(item.tipo === 'jogo' ? renderJogo(item, hora) : renderEvento(item, hora));
        });

        lista.innerHTML = html.join('');
    }

    function renderJogo({ jogo, adversario }, hora) {
        const estado = jogo.estado || 'Agendado';
        const badgeClass = ESTADO_BADGE[estado] || 'badge badge-agendado';
        const campo = jogo.campo ? `🏟️ ${jogo.campo}` : '';
        return `
        <div class="agenda-card cat-jogo">
            <div class="ag-hora">${hora}</div>
            <div class="ag-icon">🏀</div>
            <div class="ag-info">
                <div class="ag-titulo">vs ${adversario} <span class="${badgeClass}">${estado}</span></div>
                ${campo ? `<div class="ag-sub">${campo}</div>` : ''}
            </div>
        </div>`;
    }

    function renderEvento({ evento }, hora) {
        const info = TIPO_INFO[evento.tipo_evento_id] || { icone: '📅', titulo: 'Evento', cat: 'cat-lazer' };
        const localStr = evento.local ? `📍 ${evento.local}` : '';
        const descStr = evento.descricao ? `<div class="ag-sub">${evento.descricao}</div>` : '';
        return `
        <div class="agenda-card ${info.cat}">
            <div class="ag-hora">${hora}</div>
            <div class="ag-icon">${info.icone}</div>
            <div class="ag-info">
                <div class="ag-titulo">${info.titulo}</div>
                ${localStr ? `<div class="ag-sub">${localStr}</div>` : ''}
                ${descStr}
            </div>
        </div>`;
    }

})();
