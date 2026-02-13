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
    } else if (page.includes('opinioes') && supabase) {
        initOpinioes();
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

        // Store data globally for filtering
        window.allEquipas = data;

        // Initial render
        renderEquipas(data, container);

        // Add filter event listener
        const filterSelect = document.getElementById('filter-escalao-genero');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                const filterValue = filterSelect.value;
                const filtered = filterEquipas(window.allEquipas, filterValue);
                renderEquipas(filtered, container);
            });
        }
    }

    function filterEquipas(equipas, filterValue) {
        if (!filterValue) return equipas;

        // Check if filter includes gender (format: "Mini 12|Masculino")
        if (filterValue.includes('|')) {
            const [escalao, genero] = filterValue.split('|');
            return equipas.filter(e => e.escalao === escalao && e.genero === genero);
        } else {
            // Filter by escalão only
            return equipas.filter(e => e.escalao === filterValue);
        }
    }

    function renderEquipas(data, container) {
        // Custom sort by escalao: Mini 8, Mini 10, Mini 12, then by name
        const escalaoOrder = { 'Mini 8': 1, 'Mini 10': 2, 'Mini 12': 3 };
        data.sort((a, b) => {
            const orderA = escalaoOrder[a.escalao] || 999;
            const orderB = escalaoOrder[b.escalao] || 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.nome || '').localeCompare(b.nome || '');
        });

        container.innerHTML = '';
        container.innerHTML = '';
        data.forEach(equipa => {
            const card = document.createElement('div');
            card.classList.add('equipa-card');

            // Apply custom shadow color if defined
            if (equipa.shadow_color) {
                card.style.boxShadow = `0 10px 15px -3px ${equipa.shadow_color}40, 0 4px 6px -2px ${equipa.shadow_color}60`;
            }

            // Build social media icons HTML
            let socialIcons = '';
            const iconBorderStyle = equipa.shadow_color ? `border-color: ${equipa.shadow_color};` : '';

            // Function to normalize Instagram URL for mobile compatibility
            function normalizeInstagramUrl(url) {
                if (!url) return url;

                // Extract username from various Instagram URL formats
                let username = '';

                // Handle instagram.com/username or instagram.com/username/
                const match = url.match(/instagram\.com\/([^\/\?]+)/);
                if (match && match[1]) {
                    username = match[1];
                }

                // Return normalized URL that works on both web and mobile app
                return username ? `https://www.instagram.com/${username}/` : url;
            }

            if (equipa.facebook_url) {
                socialIcons += `<a href="${equipa.facebook_url}" target="_blank" class="social-icon facebook-icon" style="${iconBorderStyle}" title="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </a>`;
            }
            if (equipa.instagram_url) {
                const normalizedInstagramUrl = normalizeInstagramUrl(equipa.instagram_url);
                socialIcons += `<a href="${normalizedInstagramUrl}" target="_blank" rel="noopener noreferrer" class="social-icon instagram-icon" style="${iconBorderStyle}" title="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                </a>`;
            }
            if (equipa.website_url) {
                socialIcons += `<a href="${equipa.website_url}" target="_blank" class="social-icon website-icon" style="${iconBorderStyle}" title="Website">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                </a>`;
            }

            // Build escalão text with gender
            let escalaoText = equipa.escalao || '';
            if (escalaoText && equipa.genero) {
                const generoText = equipa.genero === 'Masculino' ? 'Masculinos' : 'Femininos';
                escalaoText = `<strong>${escalaoText}</strong> - ${generoText}`;
            } else if (escalaoText) {
                escalaoText = `<strong>${escalaoText}</strong>`;
            }

            // Estrutura atualizada conforme sketch do usuário
            // [LOGO] | [NOME]
            //        | [ESCALÃO]
            //        | [BTN] [ICONS]
            card.innerHTML = `
                <div class="equipa-logo">
                    ${equipa.logo_url ? `<img src="${equipa.logo_url}" alt="${equipa.nome}">` : '<div class="placeholder-logo" style="font-size:2rem">🏀</div>'}
                </div>
                <div class="equipa-content-right">
                    <div class="equipa-info">
                        <h3>${equipa.nome}</h3>
                        <p>${escalaoText}</p>
                    </div>
                    <div class="equipa-actions">
                        <a href="equipa.html?id=${equipa.id}&view=atletas" class="btn-link" 
                           style="${equipa.shadow_color ? `--team-color: ${equipa.shadow_color}; border-color: ${equipa.shadow_color};` : ''}">Atletas</a>
                        ${socialIcons ? `<div class="social-icons">${socialIcons}</div>` : ''}
                    </div>
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
            .select(`
                *,
                equipa_casa:equipas!equipa_casa_id(nome, logo_url),
                equipa_fora:equipas!equipa_fora_id(nome, logo_url)
            `)
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

        // Store data globally for filtering
        window.allJogos = data;

        // Populate filters
        populateFilters(data);

        // Initial render
        container.innerHTML = '';
        renderJogos(data, container);

        // Add filter event listeners
        const equipaFilter = document.getElementById('filter-equipa');
        const escalaoFilter = document.getElementById('filter-escalao');

        if (equipaFilter) {
            equipaFilter.addEventListener('change', () => {
                const filtered = filterJogos(window.allJogos);
                container.innerHTML = '';
                renderJogos(filtered, container);
            });
        }

        if (escalaoFilter) {
            escalaoFilter.addEventListener('change', () => {
                const filtered = filterJogos(window.allJogos);
                container.innerHTML = '';
                renderJogos(filtered, container);
            });
        }
    }

    // Populate filters with unique values
    function populateFilters(jogos) {
        const equipas = new Set();
        const escaloes = new Set();

        jogos.forEach(jogo => {
            if (jogo.equipa_casa?.nome) equipas.add(jogo.equipa_casa.nome);
            if (jogo.equipa_fora?.nome) equipas.add(jogo.equipa_fora.nome);
            if (jogo.escalao) escaloes.add(jogo.escalao);
        });

        // Populate equipa filter
        const equipaFilter = document.getElementById('filter-equipa');
        if (equipaFilter) {
            Array.from(equipas).sort().forEach(equipa => {
                const option = document.createElement('option');
                option.value = equipa;
                option.textContent = equipa;
                equipaFilter.appendChild(option);
            });
        }

        // Populate escalao filter
        const escalaoFilter = document.getElementById('filter-escalao');
        if (escalaoFilter) {
            Array.from(escaloes).sort().forEach(escalao => {
                const option = document.createElement('option');
                option.value = escalao;
                option.textContent = escalao;
                escalaoFilter.appendChild(option);
            });
        }
    }

    // Filter games based on selected filters
    function filterJogos(jogos) {
        const equipaFilter = document.getElementById('filter-equipa')?.value || '';
        const escalaoFilter = document.getElementById('filter-escalao')?.value || '';

        return jogos.filter(jogo => {
            const matchEquipa = !equipaFilter ||
                jogo.equipa_casa?.nome === equipaFilter ||
                jogo.equipa_fora?.nome === equipaFilter;

            const matchEscalao = !escalaoFilter || jogo.escalao === escalaoFilter;

            return matchEquipa && matchEscalao;
        });
    }

    function renderJogos(jogos, container) {
        jogos.forEach(jogo => {
            const item = document.createElement('div');
            item.classList.add('jogo-item');

            const date = new Date(jogo.data_hora);
            const dia = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
            const hora = date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            const equipaCasa = jogo.equipa_casa?.nome || 'Equipa A';
            const equipaFora = jogo.equipa_fora?.nome || 'Equipa B';
            const logoCasa = jogo.equipa_casa?.logo_url || '';
            const logoFora = jogo.equipa_fora?.logo_url || '';
            const resultadoCasa = jogo.resultado_casa !== null ? jogo.resultado_casa : '-';
            const resultadoFora = jogo.resultado_fora !== null ? jogo.resultado_fora : '-';

            item.innerHTML = `
                <div class="jogo-linha-1">
                    <span class="jogo-data">${dia}</span>
                    <span class="jogo-hora">${hora}</span>
                    <span class="jogo-campo">${jogo.campo || 'Campo 1'}</span>
                </div>
                <div class="jogo-linha-equipa">
                    ${logoCasa ? `<img src="${logoCasa}" alt="${equipaCasa}" class="jogo-logo">` : '<div class="jogo-logo-placeholder">🏀</div>'}
                    <div class="jogo-equipa-info">
                        <div class="jogo-equipa-nome">${equipaCasa}</div>
                        ${jogo.escalao ? `<div class="jogo-equipa-escalao">${jogo.escalao}</div>` : ''}
                    </div>
                    <span class="jogo-resultado">${resultadoCasa}</span>
                </div>
                <div class="jogo-linha-equipa">
                    ${logoFora ? `<img src="${logoFora}" alt="${equipaFora}" class="jogo-logo">` : '<div class="jogo-logo-placeholder">🏀</div>'}
                    <div class="jogo-equipa-info">
                        <div class="jogo-equipa-nome">${equipaFora}</div>
                        ${jogo.escalao ? `<div class="jogo-equipa-escalao">${jogo.escalao}</div>` : ''}
                    </div>
                    <span class="jogo-resultado">${resultadoFora}</span>
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

        // Render Header (Layout Horizontal/Card)
        headerFn.innerHTML = `
            ${equipa.logo_url ? `<img src="${equipa.logo_url}" alt="${equipa.nome}">` : '<div class="placeholder-logo" style="font-size:3rem">🏀</div>'}
            <div class="equipa-header-info">
                <h2>${equipa.nome}</h2>
                <p>${equipa.escalao || ''}</p>
            </div>
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

    // Opiniões Page Functions
    function initOpinioes() {
        fetchOpinioes();

        const form = document.getElementById('opiniao-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await submitOpiniao();
            });
        }
    }

    async function submitOpiniao() {
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const opiniao = document.getElementById('opiniao').value.trim();

        if (!nome || !opiniao) {
            alert('Por favor, preencha os campos obrigatórios.');
            return;
        }

        const { data, error } = await supabase
            .from('opinioes')
            .insert([{ nome, email: email || null, opiniao }])
            .select();

        if (error) {
            console.error('Erro ao enviar opinião:', error);
            alert('Erro ao enviar opinião. Tente novamente.');
            return;
        }

        alert('Opinião enviada com sucesso!');
        document.getElementById('opiniao-form').reset();
        fetchOpinioes();
    }

    async function fetchOpinioes() {
        const container = document.getElementById('opinioes-list');
        if (!container) return;

        const { data, error } = await supabase
            .from('opinioes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar opiniões:', error);
            container.innerHTML = '<p class="error">Erro ao carregar opiniões.</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>Ainda não há opiniões. Seja o primeiro a partilhar!</p>';
            return;
        }

        container.innerHTML = '';
        renderOpinioes(data, container);
    }

    function renderOpinioes(opinioes, container) {
        opinioes.forEach(op => {
            const card = document.createElement('div');
            card.classList.add('opiniao-card');

            const date = new Date(op.created_at);
            const dateStr = date.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            card.innerHTML = `
                <div class="opiniao-header">
                    <strong>${op.nome}</strong>
                    <span class="opiniao-date">${dateStr}</span>
                </div>
                <p class="opiniao-text">${op.opiniao}</p>
            `;
            container.appendChild(card);
        });
    }
});
