document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Supabase se as credenciais estiverem presentes
    let supabase;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase inicializado!");
    } else {
        console.warn("Supabase não inicializado. Verifique js/config.js");
        document.getElementById('equipas-list').innerHTML = '<p class="error">Erro de configuração: Chave de API não encontrada.</p>';
        document.getElementById('jogos-list').innerHTML = '<p class="error">Erro de configuração: Chave de API não encontrada.</p>';
    }

    // Referências do DOM
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('.page-section');

    // 1. Menu Mobile Toggle
    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('open');
    });

    // 2. Navegação SPA
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Se for link externo (não tiver data-target), segue normalmente
            if (!link.getAttribute('data-target')) return;

            e.preventDefault();

            if (window.innerWidth < 768) {
                mainNav.classList.remove('open');
            }

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetId = link.getAttribute('data-target');

            sections.forEach(section => {
                section.classList.remove('active');
                section.classList.add('hidden');
            });

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('active');
            }
        });
    });

    // 3. Funções de Dados
    async function fetchEquipas() {
        if (!supabase) return;

        const { data, error } = await supabase
            .from('equipas')
            .select('*');

        const container = document.getElementById('equipas-list');

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
            // Assume que existe 'nome', 'logo_url', 'escalao'
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
        if (!supabase) return;

        const { data, error } = await supabase
            .from('jogos')
            .select('*')
            .order('data_hora', { ascending: true });

        const container = document.getElementById('jogos-list');

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

            // Formatar data
            const date = new Date(jogo.data_hora);
            const dia = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
            const hora = date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="jogo-info">
                    <span class="jogo-data">${dia} ${hora}</span>
                    <span class="jogo-local">${jogo.local || 'Pavilhão Municipal'}</span>
                </div>
                <div class="jogo-placar">
                    <span class="equipa-nome">${jogo.equipa_a}</span>
                    <span class="placar">${jogo.resultado_a !== null ? jogo.resultado_a : '-'}</span>
                    <span class="x">X</span>
                    <span class="placar">${jogo.resultado_b !== null ? jogo.resultado_b : '-'}</span>
                    <span class="equipa-nome">${jogo.equipa_b}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // Carregar dados iniciais apenas se estivermos na aba e supabase ok
    // Por simplicidade, carregamos tudo ao iniciar se supabase estiver pronto
    if (supabase) {
        fetchEquipas();
        fetchJogos();
    }
});
