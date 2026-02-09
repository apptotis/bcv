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

    if (page === 'equipas.html' && supabase) {
        fetchEquipas();
    } else if (page === 'jogos.html' && supabase) {
        fetchJogos();
    }

    // 3. Funções de Dados
    async function fetchEquipas() {
        const container = document.getElementById('equipas-list');
        if (!container) return;

        const { data, error } = await supabase
            .from('equipas')
            .select('*');

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
        data.forEach(jogo => {
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
                    <span class="equipa-nome">${jogo.equipa_a || 'Equipa A'}</span> <!-- Melhorar com JOIN depois -->
                    <span class="placar">${jogo.resultado_casa !== null ? jogo.resultado_casa : '-'}</span>
                    <span class="x">X</span>
                    <span class="placar">${jogo.resultado_fora !== null ? jogo.resultado_fora : '-'}</span>
                    <span class="equipa-nome">${jogo.equipa_b || 'Equipa B'}</span> <!-- Melhorar com JOIN depois -->
                </div>
            `;
            container.appendChild(item);
        });
    }
});
