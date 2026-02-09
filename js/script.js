document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Supabase se as credenciais estiverem presentes
    let supabase;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase inicializado!");
    }

    // 1. Menu Mobile Toggle (Comum a todas as páginas)
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('open');
        });
    }

    // 2. Lógica Específica por Página
    const path = window.location.pathname;
    const page = path.split("/").pop();
    console.log("Current path:", path, "Detected page:", page);

    if (page.includes('equipas') && supabase) {
        console.log("Iniciando fetchEquipas...");
        fetchEquipas();
    } else if (page.includes('jogos') && supabase) {
        fetchJogos();
    } else if (page.includes('equipa') && supabase) { // 'equipa.html' singular
        fetchEquipaDetalhes();
    } else {
        console.log("Nenhuma lógica específica para esta página ou Supabase não iniciado.");
    }

    // 3. Funções de Dados
    async function fetchEquipas() {
        const container = document.getElementById('equipas-list');
        if (!container) return;

        const { data, error } = await supabase
            .from('equipas')
            .select('*')
            .order('nome');

        if (error) {
            console.error('Erro ao buscar equipas:', error);
            container.innerHTML = '<p class="error">Erro ao carregar equipas.</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhuma equipa encontrada.</p>';
            return;
        }

        container.innerHTML = '';
        data.forEach(equipa => {
            const card = document.createElement('div');
            card.classList.add('equipa-card');
            card.innerHTML = `
                <div class="equipa-logo">
                    ${equipa.logo_url ? `<img src="${equipa.logo_url}" alt="${equipa.nome}">` : '<div class="placeholder-logo">🏀</div>'}
                </div>
                <h3>${equipa.nome}</h3>
                <p>${equipa.escalao || ''}</p>
                <div class="equipa-actions">
                    <a href="equipa.html?id=${equipa.id}&view=atletas" class="btn-link">Atletas</a>
                    <a href="equipa.html?id=${equipa.id}&view=jogos" class="btn-link">Jogos</a>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async function fetchJogos() {
        const container = document.getElementById('jogos-list');
        if (!container) return;

        const { data, error } = await supabase
            .from('jogos')
            .select('*')
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('Erro ao buscar jogos:', error);
            container.innerHTML = '<p class="error">Erro ao carregar jogos.</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhum jogo agendado.</p>';
            return;
        }

        container.innerHTML = '';
        renderJogos(data, container);
    }

    function renderJogos(jogos, container) {
        jogos.forEach(jogo => {
            const item = document.createElement('div');
            item.classList.add('jogo-item');

            const date = new Date(jogo.data_hora);
            const dia = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
            const hora = date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="jogo-info">
                    <span class="jogo-data">${dia} ${hora}</span>
                    <span class="jogo-local">${jogo.campo || 'Pavilhão Municipal'}</span>
                </div>
                <div class="jogo-placar">
                    <span class="equipa-nome">${jogo.equipa_a || 'Equipa A'}</span> 
                    <span class="placar">${jogo.resultado_casa !== null ? jogo.resultado_casa : '-'}</span>
                    <span class="x">X</span>
                    <span class="placar">${jogo.resultado_fora !== null ? jogo.resultado_fora : '-'}</span>
                    <span class="equipa-nome">${jogo.equipa_b || 'Equipa B'}</span> 
                </div>
            `;
            container.appendChild(item);
        });
    }

    async function fetchEquipaDetalhes() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const view = params.get('view') || 'atletas';

        if (!id) {
            window.location.href = 'equipas.html';
            return;
        }

        const headerFn = document.getElementById('equipa-header');
        const contentFn = document.getElementById('equipa-content');

        // 1. Buscar Detalhes da Equipa
        const { data: equipa, error } = await supabase
            .from('equipas')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !equipa) {
            headerFn.innerHTML = '<p class="error">Equipa não encontrada.</p>';
            return;
        }

        // Render Header
        headerFn.innerHTML = `
            ${equipa.logo_url ? `<img src="${equipa.logo_url}" alt="${equipa.nome}">` : '<div class="placeholder-logo" style="font-size:4rem">🏀</div>'}
            <h2>${equipa.nome}</h2>
            <p>${equipa.escalao || ''}</p>
            ${equipa.treinadores ? `<small>Treinadores: ${equipa.treinadores}</small>` : ''}
        `;

        contentFn.innerHTML = '<p class="loading">A carregar...</p>';

        if (view === 'atletas') {
            document.title = `Atletas - ${equipa.nome}`;
            const { data: atletas, error: errAtletas } = await supabase
                .from('atletas')
                .select('*')
                .eq('equipa_id', id)
                .order('nome');

            if (errAtletas) {
                contentFn.innerHTML = '<p class="error">Erro ao carregar atletas.</p>';
            } else if (atletas.length === 0) {
                contentFn.innerHTML = '<p class="text-center">Nenhum atleta registado nesta equipa.</p>';
            } else {
                contentFn.innerHTML = `<h3 class="text-center mb-3">Plantel</h3><div class="athlete-list"></div>`;
                const list = contentFn.querySelector('.athlete-list');
                atletas.forEach(atleta => {
                    const div = document.createElement('div');
                    div.className = 'athlete-card';
                    div.innerHTML = `
                         ${atleta.foto_url
                            ? `<img src="${atleta.foto_url}" alt="${atleta.nome}">`
                            : '<div style="width:80px;height:80px;background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:2rem;">👤</div>'}
                        <strong>${atleta.nome}</strong>
                    `;
                    list.appendChild(div);
                });
            }

        } else if (view === 'jogos') {
            document.title = `Jogos - ${equipa.nome}`;
            // Placeholder para jogos da equipa
            // Precisaríamos filtrar jogos onde equipa_casa OR equipa_fora = id
            // Como ainda não temos estrutura de jogos linkada com IDs FKs reais (é texto por enquanto?), vamos simular ou deixar mensagem.

            // Assumindo que implementaremos FKs depois, por enquanto buscamos pelo nome ou ID se tivermos atualizado a tabela Jogo
            // Vamos deixar uma mensagem genérica por enquanto

            contentFn.innerHTML = `
                <h3 class="text-center">Jogos Agendados</h3>
                <p class="text-center">Funcionalidade de filtro de jogos por equipa em desenvolvimento.</p>
                <!-- 
                Aqui entraria o fetchJogos com filtro .or(\`equipa_casa.eq.${id},equipa_fora.eq.${id}\`)
                -->
            `;
        }
    }
});
