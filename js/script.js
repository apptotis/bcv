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
    } else if (page.includes('eventos') && supabase) {
        fetchEventos();
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

            if (equipa.facebook_url) {
                socialIcons += `<a href="${equipa.facebook_url}" target="_blank" rel="noopener noreferrer" class="social-icon facebook-icon" style="${iconBorderStyle}" title="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </a>`;
            }
            if (equipa.instagram_url) {
                socialIcons += `<a href="${equipa.instagram_url}" target="_blank" rel="noopener noreferrer" class="social-icon instagram-icon" style="${iconBorderStyle}" title="Instagram">
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
                           style="${equipa.shadow_color ? `--team-color: ${equipa.shadow_color}; border-color: ${equipa.shadow_color};` : ''}">Plantel</a>
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

        // Buscar jogos e TODAS as equipas em paralelo
        const [{ data, error }, { data: todasEquipas, error: erroEquipas }] = await Promise.all([
            supabase
                .from('jogos')
                .select(`
                    *,
                    equipa_casa:equipas!equipa_casa_id(id, nome, logo_url, genero),
                    equipa_fora:equipas!equipa_fora_id(id, nome, logo_url, genero)
                `)
                .order('data_hora', { ascending: true }),
            supabase
                .from('equipas')
                .select('id, nome, escalao, genero')
                .order('nome')
        ]);

        if (error) {
            console.error('Erro ao buscar jogos:', error);
            container.innerHTML = '<p class="error">Erro ao carregar jogos.</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhum jogo agendado.</p>';
            return;
        }

        // Ordenar: Terminado/Cancelado sempre no fim; dentro de cada grupo por data e estado
        const estadoOrdem = { 'Em Jogo': 0, 'Agendado': 1, 'Terminado': 2, 'Cancelado': 3 };
        const isTerminado = (j) => j.estado === 'Terminado' || j.estado === 'Cancelado';
        data.sort((a, b) => {
            // 1. Terminados/Cancelados sempre no fim
            if (isTerminado(a) !== isTerminado(b)) return isTerminado(a) ? 1 : -1;

            // 2. Data
            const dateA = a.data_hora ? new Date(a.data_hora) : new Date(0);
            const dateB = b.data_hora ? new Date(b.data_hora) : new Date(0);
            const dateDiff = dateA - dateB;
            if (dateDiff !== 0) return dateDiff;

            // 3. Estado
            const oa = estadoOrdem[a.estado] ?? 1;
            const ob = estadoOrdem[b.estado] ?? 1;
            if (oa !== ob) return oa - ob;

            // 4. Campo
            return (a.campo || '').localeCompare(b.campo || '');
        });

        // Store data globally for filtering
        window.allJogos = data;

        // Populate filters usando TODAS as equipas (não só as que têm jogos)
        populateFilters(data, todasEquipas || []);

        // Initial render
        container.innerHTML = '';
        renderJogos(data, container);

        // Add filter event listeners
        const equipaFilter = document.getElementById('filter-equipa');
        const escalaoFilter = document.getElementById('filter-escalao');
        const estadoFilter = document.getElementById('filter-estado');

        const applyFilters = () => {
            const filtered = filterJogos(window.allJogos);
            container.innerHTML = '';
            renderJogos(filtered, container);
        };

        if (equipaFilter) equipaFilter.addEventListener('change', applyFilters);
        if (escalaoFilter) escalaoFilter.addEventListener('change', applyFilters);
        if (estadoFilter) estadoFilter.addEventListener('change', applyFilters);

        // Realtime: atualizar automaticamente quando o operador guarda um resultado
        supabase
            .channel('jogos-publico-realtime')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'jogos' },
                (payload) => {
                    const idx = window.allJogos.findIndex(j => j.id === payload.new.id);
                    if (idx !== -1) {
                        // Preservar os dados joinés (equipa_casa, equipa_fora) e atualizar o resto
                        window.allJogos[idx] = { ...window.allJogos[idx], ...payload.new };
                    }
                    const filtered = filterJogos(window.allJogos);
                    container.innerHTML = '';
                    renderJogos(filtered, container);
                }
            )
            .subscribe();
    }

    // Populate filters with unique values
    function populateFilters(jogos, todasEquipas) {
        const escaloes = new Set();
        jogos.forEach(jogo => {
            if (jogo.escalao) escaloes.add(jogo.escalao);
        });

        // Helper: abreviatura do escalao+genero → ex: "(10M)", "(12F)", "(8)"
        function abrevEscalao(escalao, genero) {
            const num = (escalao || '').replace(/\D/g, ''); // "Mini 10" → "10"
            if (!num) return '';
            const gen = genero === 'Masculino' ? 'M' : genero === 'Feminino' ? 'F' : '';
            return `(${num}${gen})`;
        }

        // Populate equipa filter — usa TODAS as equipas da tabela
        const equipaFilter = document.getElementById('filter-equipa');
        if (equipaFilter && todasEquipas.length > 0) {
            todasEquipas.forEach(equipa => {
                const option = document.createElement('option');
                option.value = equipa.id; // ID único — evita ambiguidade com equipas do mesmo nome
                const abrev = abrevEscalao(equipa.escalao, equipa.genero);
                option.textContent = abrev ? `${equipa.nome} ${abrev}` : equipa.nome;
                equipaFilter.appendChild(option);
            });
        }

        // Populate escalao filter — baseado nos jogos existentes
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
        const estadoFilter = document.getElementById('filter-estado')?.value || '';

        return jogos.filter(jogo => {
            const matchEquipa = !equipaFilter ||
                String(jogo.equipa_casa_id) === equipaFilter ||
                String(jogo.equipa_fora_id) === equipaFilter;

            const matchEscalao = !escalaoFilter || jogo.escalao === escalaoFilter;

            const terminado = jogo.estado === 'Terminado' || jogo.estado === 'Cancelado';
            let matchEstado;
            if (estadoFilter === 'terminado') {
                matchEstado = terminado;
            } else if (estadoFilter === 'em-jogo') {
                matchEstado = jogo.estado === 'Em Jogo';
            } else {
                matchEstado = true; // todos (default)
            }

            return matchEquipa && matchEscalao && matchEstado;
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
            const genero = jogo.equipa_casa?.genero || jogo.equipa_fora?.genero || '';

            // Estado do jogo
            const estado = jogo.estado || 'Agendado';
            const estadoClass = {
                'Agendado': 'estado-agendado',
                'Em Jogo': 'estado-em-jogo',
                'Terminado': 'estado-terminado',
                'Cancelado': 'estado-cancelado'
            }[estado] || 'estado-agendado';

            const escalaoGenero = jogo.escalao
                ? `${jogo.escalao}${genero ? ` · ${genero}` : ''}`
                : genero || '';

            item.innerHTML = `
                <div class="jogo-linha-1">
                    <span class="jogo-data">${dia}</span>
                    <span class="jogo-hora">${hora}</span>
                    <span class="jogo-estado ${estadoClass}">${estado}</span>
                    <span class="jogo-campo">${jogo.campo || 'Campo 1'}</span>
                </div>
                <div class="jogo-linha-equipa">
                    ${logoCasa ? `<img src="${logoCasa}" alt="${equipaCasa}" class="jogo-logo">` : '<div class="jogo-logo-placeholder">🏀</div>'}
                    <div class="jogo-equipa-info">
                        <div class="jogo-equipa-nome">${equipaCasa}</div>
                        ${escalaoGenero ? `<div class="jogo-equipa-escalao">${escalaoGenero}</div>` : ''}
                    </div>
                    <span class="jogo-resultado">${resultadoCasa}</span>
                </div>
                <div class="jogo-linha-equipa">
                    ${logoFora ? `<img src="${logoFora}" alt="${equipaFora}" class="jogo-logo">` : '<div class="jogo-logo-placeholder">🏀</div>'}
                    <div class="jogo-equipa-info">
                        <div class="jogo-equipa-nome">${equipaFora}</div>
                        ${escalaoGenero ? `<div class="jogo-equipa-escalao">${escalaoGenero}</div>` : ''}
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

        // Helper to handle hex colors with alpha safely
        const hexToRgba = (hex, alpha) => {
            if (!hex || hex[0] !== '#') return `rgba(255, 255, 255, ${alpha})`;
            let h = hex.slice(1);
            if (h.length === 3) h = h.split('').map(s => s + s).join('');
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const bgUrl = 'back_plantel.png';
        const teamColor = equipa.shadow_color || '#6a1b9a';

        // Render Header (Layout Horizontal/Card - matching equipas.html)
        headerFn.className = 'equipa-card';

        // Build shadow and background style
        let headerStyle = `margin-bottom: 30px; background-image: url('${bgUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: 15px;`;
        if (equipa.shadow_color) {
            headerStyle += `box-shadow: 0 10px 15px -3px ${equipa.shadow_color}40, 0 4px 6px -2px ${equipa.shadow_color}60;`;
        }
        headerFn.setAttribute('style', headerStyle);

        // Build social media icons HTML (copy logic from renderEquipas)
        let socialIcons = '';
        const iconBorderStyle = equipa.shadow_color ? `border-color: ${equipa.shadow_color};` : '';

        if (equipa.facebook_url) {
            socialIcons += `<a href="${equipa.facebook_url}" target="_blank" rel="noopener noreferrer" class="social-icon facebook-icon" style="${iconBorderStyle}" title="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </a>`;
        }
        if (equipa.instagram_url) {
            socialIcons += `<a href="${equipa.instagram_url}" target="_blank" rel="noopener noreferrer" class="social-icon instagram-icon" style="${iconBorderStyle}" title="Instagram">
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

        // Build escalão text (simplified for header)
        let escalaoText = equipa.escalao || '';
        if (escalaoText && equipa.genero) {
            const generoText = equipa.genero === 'Masculino' ? 'Masculinos' : 'Femininos';
            escalaoText = `<strong>${escalaoText}</strong> - ${generoText}`;
        } else if (escalaoText) {
            escalaoText = `<strong>${escalaoText}</strong>`;
        }

        headerFn.innerHTML = `
            <div class="equipa-logo">
                ${equipa.logo_url ? `<img src="${equipa.logo_url}" alt="${equipa.nome}">` : '<div class="placeholder-logo" style="font-size:2rem">🏀</div>'}
            </div>
            <div class="equipa-content-right">
                <div class="equipa-info">
                    <h3>${equipa.nome}</h3>
                    <p>${escalaoText}</p>
                </div>
                <div class="equipa-actions">
                    ${socialIcons ? `<div class="social-icons">${socialIcons}</div>` : ''}
                </div>
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
                // Robust filtering: everyone whose function is NOT 'Jogador' is staff
                // Also handle potential nulls/trimming
                const jogadores = atletas.filter(a => {
                    const fn = (a.funcao || '').trim().toLowerCase();
                    return fn === '' || fn === 'jogador';
                });
                const staff = atletas.filter(a => {
                    const fn = (a.funcao || '').trim().toLowerCase();
                    return fn !== '' && fn !== 'jogador';
                });

                contentFn.innerHTML = '';
                const colorAlpha = hexToRgba(teamColor, 0.5);
                const teamStyle = `background-image: linear-gradient(${colorAlpha}, ${colorAlpha}), url('${bgUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: 15px; box-shadow: 0 10px 15px -3px ${teamColor}40, 0 4px 6px -2px ${teamColor}60;`;

                // Helper to render sections
                const renderSection = (list, title, listClass) => {
                    if (list.length === 0) return;

                    const titleEl = document.createElement('h3');
                    titleEl.className = `text-center mb-3 ${listClass === 'staff-list' ? 'mt-5' : ''}`;
                    titleEl.textContent = title;
                    contentFn.appendChild(titleEl);

                    const listDiv = document.createElement('div');
                    listDiv.className = `athlete-list ${listClass}`;
                    contentFn.appendChild(listDiv);

                    list.forEach(atleta => {
                        const div = document.createElement('div');
                        div.className = 'athlete-card';
                        if (teamStyle) div.setAttribute('style', teamStyle);

                        const isStaff = (atleta.funcao || '').trim().toLowerCase() !== 'jogador' && (atleta.funcao || '').trim() !== '';
                        // Even more robust check for jersey number
                        let tagNumero = '';
                        if (atleta.numero === 0 || (atleta.numero && String(atleta.numero).trim() !== '')) {
                            tagNumero = `<span class="athlete-number">#${atleta.numero}</span> `;
                        }

                        div.innerHTML = `
                            <div class="athlete-photo">
                                ${atleta.foto_url ? `<img src="${atleta.foto_url}" alt="${atleta.nome}">` : '<div class="placeholder-photo">👤</div>'}
                            </div>
                            <div class="athlete-content-right">
                                <div class="athlete-info">
                                    <h3>
                                        ${tagNumero}
                                        <span>${atleta.nome}</span>
                                        ${isStaff ? `<span class="staff-role">(${atleta.funcao})</span>` : ''}
                                    </h3>
                                </div>
                            </div>
                        `;
                        listDiv.appendChild(div);
                    });
                };

                renderSection(jogadores, 'Plantel', 'jogs-list');
                renderSection(staff, 'Equipa Técnica', 'staff-list');
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

    // ============================================================
    // EVENTOS - Eventos públicos
    // ============================================================
    async function fetchEventos() {
        const container = document.getElementById('eventos-list');
        if (!container) return;

        // Buscar apenas eventos públicos, ordenados por data/hora
        const { data, error } = await supabase
            .from('eventos')
            .select(`
                *,
                tipo_evento:tipo_eventos(nome)
            `)
            .eq('is_publico', true)
            .order('data_hora', { ascending: true });

        if (error) {
            console.error('Erro ao buscar eventos:', error);
            container.innerHTML = '<p class="error">Erro ao carregar eventos.</p>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhum evento público agendado.</p>';
            return;
        }

        window.allEventos = data;

        // Preencher filtro de tipos
        populateTipoFilter(data);

        // Renderizar
        container.innerHTML = '';
        renderEventos(data, container);

        // Listener do filtro
        const tipoFilter = document.getElementById('filter-tipo-evento');
        if (tipoFilter) {
            tipoFilter.addEventListener('change', () => {
                const val = tipoFilter.value;
                const filtered = val
                    ? window.allEventos.filter(e => String(e.tipo_evento_id) === val)
                    : window.allEventos;
                container.innerHTML = '';
                renderEventos(filtered, container);
            });
        }
    }

    function populateTipoFilter(eventos) {
        const tipoFilter = document.getElementById('filter-tipo-evento');
        if (!tipoFilter) return;

        const vistos = new Map();
        eventos.forEach(e => {
            if (e.tipo_evento_id && !vistos.has(e.tipo_evento_id)) {
                vistos.set(e.tipo_evento_id, e.tipo_evento?.nome || `Tipo ${e.tipo_evento_id}`);
            }
        });

        // Ordenar pelo nome do tipo
        const sorted = Array.from(vistos.entries()).sort((a, b) => a[1].localeCompare(b[1]));
        sorted.forEach(([id, nome]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = nome;
            tipoFilter.appendChild(option);
        });
    }

    // Ícones por tipo de evento
    const eventoIcons = {
        1: '🏀', 2: '📸', 3: '🍽️', 4: '🍷', 5: '🥐',
        6: '🏀', 7: '🌳', 8: '🚶', 9: '🎶', 10: '⚡',
        11: '🏆', 12: '🎉', 13: '🌲'
    };

    function renderEventos(eventos, container) {
        eventos.forEach(evento => {
            const card = document.createElement('div');
            card.classList.add('evento-card');

            const dataHora = new Date(evento.data_hora);
            const dia = dataHora.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const hora = dataHora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const tipoNome = evento.tipo_evento?.nome || 'Evento';
            const icone = eventoIcons[evento.tipo_evento_id] || '📅';

            let horaStr = hora;
            if (evento.data_hora_fim) {
                const horaFim = new Date(evento.data_hora_fim).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                horaStr = `${hora} – ${horaFim}`;
            }

            card.innerHTML = `
                <div class="evento-icon">${icone}</div>
                <div class="evento-info">
                    <h3 class="evento-tipo">${tipoNome}</h3>
                    <p class="evento-local">📍 ${evento.local || 'Local a definir'}</p>
                    <p class="evento-data">🗓️ ${dia} &nbsp; 🕐 ${horaStr}</p>
                    ${evento.descricao ? `<p class="evento-descricao">${evento.descricao}</p>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }
});
