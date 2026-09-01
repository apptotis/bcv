document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Menu Drawer Toggle & Dropdown Interaction
    const hamburgerTrigger = document.getElementById('hamburger-trigger');
    const drawerMenu = document.getElementById('drawer-menu');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const drawerCloseBtn = document.getElementById('drawer-close-btn');

    function toggleMenu() {
        if (!drawerMenu || !hamburgerTrigger || !drawerOverlay) return;
        const isOpen = drawerMenu.classList.toggle('is-open');
        hamburgerTrigger.classList.toggle('is-active');
        drawerOverlay.classList.toggle('is-open');
        
        // Accessibility updates
        hamburgerTrigger.setAttribute('aria-expanded', isOpen);
        
        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        } else {
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    if (hamburgerTrigger) hamburgerTrigger.addEventListener('click', toggleMenu);
    if (drawerOverlay) drawerOverlay.addEventListener('click', toggleMenu);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', toggleMenu);

    // Dropdown toggle inside the drawer
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownToggle.classList.toggle('is-active');
            dropdownMenu.classList.toggle('is-open');
        });
    }

    const dropdownEquipasToggle = document.getElementById('dropdown-equipas-toggle');
    const dropdownEquipasMenu = document.getElementById('dropdown-equipas-menu');
    if (dropdownEquipasToggle && dropdownEquipasMenu) {
        dropdownEquipasToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownEquipasToggle.classList.toggle('is-active');
            dropdownEquipasMenu.classList.toggle('is-open');
        });
    }

    // Close drawer when clicking links (excluding expander targets)
    const menuLinks = document.querySelectorAll('.drawer-link, .drawer-dropdown-link');
    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === 'clube.html' || href === '#clube') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (dropdownToggle) dropdownToggle.click();
            });
        } else {
            link.addEventListener('click', () => {
                if (drawerMenu && drawerMenu.classList.contains('is-open')) {
                    toggleMenu();
                }
            });
        }
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawerMenu && drawerMenu.classList.contains('is-open')) {
            toggleMenu();
        }
    });

    // 3. Scroll Reveal Animations
    const revealElements = document.querySelectorAll('.reveal');

    const revealFunction = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;

        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    };

    // Run once on load
    revealFunction();

    // Run on scroll
    window.addEventListener('scroll', revealFunction);
    
    // 4. Carregar Destaques do Portal (Agenda e Aniversariantes), Notícias, Menu Equipas e Configurações
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined') {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        loadPortalHighlights(supabase);
        loadNoticiasIndex(supabase);
        loadEquipasMenu(supabase);
        loadGlobalClubConfig(supabase);
    }
});

async function loadPortalHighlights(supabase) {
    const sectionHighlights = document.getElementById('portal-highlights');
    const cardAgenda = document.getElementById('card-agenda-desportiva');
    const cardResultados = document.getElementById('card-resultados-desportivos');
    const agendaContainer = document.getElementById('agenda-list');
    const resultadosContainer = document.getElementById('resultados-list');
    const highlightsGrid = document.querySelector('.portal-highlights-grid');

    let hasAgenda = false;
    let hasResultados = false;

    // 1. CARREGAR AGENDA (Próximos 7 dias)
    if (agendaContainer) {
        try {
            const hoje = new Date();
            const daquiA7Dias = new Date();
            daquiA7Dias.setDate(hoje.getDate() + 7);
            
            const todayStr = hoje.toISOString().split('T')[0];
            const nextWeekStr = daquiA7Dias.toISOString().split('T')[0];

            const { data: agenda, error } = await supabase
                .from('agenda_bcv')
                .select('*')
                .gte('data_jogo', todayStr)
                .lte('data_jogo', nextWeekStr)
                .order('data_jogo', { ascending: true });

            if (!error && agenda && agenda.length > 0) {
                hasAgenda = true;
                agendaContainer.innerHTML = '';
                
                agenda.forEach(jogo => {
                    const dataJogo = new Date(jogo.data_jogo).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
                    const horaJogo = jogo.hora_jogo ? jogo.hora_jogo.substring(0, 5) : '';

                    const item = document.createElement('div');
                    item.className = 'game-schedule-item';
                    item.innerHTML = `
                        <div class="game-schedule-header">
                            <span class="game-teams">${jogo.equipa_casa} vs ${jogo.equipa_fora}</span>
                            <span class="game-date-badge">${dataJogo} ${horaJogo}</span>
                        </div>
                        <div class="game-meta">
                            <span>📍 ${jogo.local || 'Pavilhão Municipal'}</span>
                            <span>🏀 ${jogo.escalao || 'BCV'}</span>
                        </div>
                    `;
                    agendaContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.warn("Aviso ao carregar agenda:", err);
        }
    }

    // 2. CARREGAR RESULTADOS (Últimos jogos)
    if (resultadosContainer) {
        try {
            const { data: resultados, error } = await supabase
                .from('resultados_bcv')
                .select('*')
                .order('data_jogo', { ascending: false })
                .limit(5);

            if (!error && resultados && resultados.length > 0) {
                hasResultados = true;
                resultadosContainer.innerHTML = '';

                resultados.forEach(resultado => {
                    const dataJogo = new Date(resultado.data_jogo).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
                    const ptsCasa = Number(resultado.pontos_casa) || 0;
                    const ptsFora = Number(resultado.pontos_fora) || 0;
                    
                    const scoreFormatted = `${ptsCasa} - ${ptsFora}`;

                    const item = document.createElement('div');
                    item.className = 'game-result-item';
                    item.innerHTML = `
                        <div class="game-result-teams">
                            <span style="flex: 1; min-width: 80px;">${resultado.equipa_casa}</span>
                            <span class="game-result-score">${scoreFormatted}</span>
                            <span style="flex: 1; text-align: right; min-width: 80px;">${resultado.equipa_fora}</span>
                        </div>
                        <div style="font-size: 0.76rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-top: 4px;">
                            <span>📅 ${dataJogo}</span>
                            <span>🏀 ${resultado.escalao || 'BCV'}</span>
                        </div>
                    `;
                    resultadosContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.warn("Aviso ao carregar resultados:", err);
        }
    }

    // 3. OCULTAÇÃO INTELIGENTE DE SECÇÕES VAZIAS
    if (!hasAgenda && cardAgenda) {
        cardAgenda.style.display = 'none';
    } else if (cardAgenda) {
        cardAgenda.style.display = 'flex';
    }

    if (!hasResultados && cardResultados) {
        cardResultados.style.display = 'none';
    } else if (cardResultados) {
        cardResultados.style.display = 'flex';
    }

    if (!hasAgenda && !hasResultados) {
        if (sectionHighlights) sectionHighlights.style.display = 'none';
    } else {
        if (sectionHighlights) sectionHighlights.style.display = 'block';
        if (highlightsGrid) {
            if (!hasAgenda || !hasResultados) {
                highlightsGrid.style.gridTemplateColumns = '1fr';
            } else {
                highlightsGrid.style.gridTemplateColumns = '';
            }
        }
    }

    const modal = document.getElementById('birthday-modal');
    const modalList = document.getElementById('birthday-modal-list');
    const closeBtn = document.getElementById('close-birthday');
    if (modal) {
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 400);
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        
        // Close on clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        try {
            const { data: atletas, error } = await supabase
                .from('atletasbcv')
                .select('nome, nickname, foto, equipa, data_nascimento')
                .not('data_nascimento', 'is', null);

            if (error) return;

            if (atletas) {
                const hoje = new Date();
                const diaHoje = hoje.getDate();
                const mesHoje = hoje.getMonth() + 1;

                const aniversariantesHoje = atletas.filter(atleta => {
                    const partes = atleta.data_nascimento.split('-');
                    if (partes.length !== 3) return false;
                    
                    const diaNasc = parseInt(partes[2]);
                    const mesNasc = parseInt(partes[1]);
                    
                    return diaNasc === diaHoje && mesNasc === mesHoje;
                });

                if (aniversariantesHoje.length > 0) {
                    modalList.innerHTML = '';
                    aniversariantesHoje.forEach(atleta => {
                        const item = document.createElement('div');
                        item.className = 'birthday-item';

                        const fotoHtml = atleta.foto 
                            ? `<img src="${atleta.foto}" alt="${atleta.nome}">` 
                            : '<div class="birthday-photo-placeholder" style="display:flex; align-items:center; justify-content:center; font-size: 3rem;">👤</div>';

                        const nomeParaMostrar = atleta.nickname ? atleta.nickname : atleta.nome;

                        item.innerHTML = `
                            <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 15px; font-family: var(--font-heading);">
                                PARABÉNS, ${nomeParaMostrar}!
                            </div>
                            ${fotoHtml}
                        `;
                        modalList.appendChild(item);
                    });
                    
                    // Show Modal
                    modal.style.display = 'flex';
                    setTimeout(() => {
                        modal.classList.add('active');
                    }, 100);
                }
            }
        } catch (err) {
            console.error("Erro no bloco de aniversariantes:", err);
        }
    } else {
        console.warn("Elemento #birthday-modal não encontrado no DOM!");
    }
}

async function loadEquipasMenu(supabase) {
    const dropdownEquipasMenu = document.getElementById('dropdown-equipas-menu');
    if (!dropdownEquipasMenu) return;

    try {
        const { data: equipas, error } = await supabase
            .from('equipasbcv')
            .select('id, nome, escalao, sexo')
            .eq('epoca', '2025-2026');
            
        if (!error && equipas && equipas.length > 0) {
            const ordemEscalao = ["Mini 8", "Mini 10", "Mini 12", "Sub-14", "Sub-16", "Sub-18", "Seniores", "Veteranos"];
            equipas.sort((a, b) => {
                let indexA = ordemEscalao.indexOf(a.escalao);
                let indexB = ordemEscalao.indexOf(b.escalao);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                if (indexA === indexB) return (a.nome || '').localeCompare(b.nome || '');
                return indexA - indexB;
            });
            
            dropdownEquipasMenu.innerHTML = ''; // Limpar o texto de carregamento

            equipas.forEach(equipa => {
                const li = document.createElement('li');
                let escalaoDisplay = equipa.escalao;
                if (equipa.sexo && equipa.sexo !== 'Todos') {
                    escalaoDisplay += ` ${equipa.sexo}`;
                }
                li.innerHTML = `<a href="equipas.html?equipaId=${equipa.id}" class="drawer-dropdown-link">${escalaoDisplay}</a>`;
                dropdownEquipasMenu.appendChild(li);
            });

            // Adicionar evento para fechar menu ao clicar nas novas opções
            const drawerMenu = document.getElementById('drawer-menu');
            const hamburgerTrigger = document.getElementById('hamburger-trigger');
            const drawerOverlay = document.getElementById('drawer-overlay');
            const newLinks = dropdownEquipasMenu.querySelectorAll('a');
            newLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (drawerMenu && drawerMenu.classList.contains('is-open')) {
                        drawerMenu.classList.remove('is-open');
                        if (hamburgerTrigger) hamburgerTrigger.classList.remove('is-active');
                        if (drawerOverlay) drawerOverlay.classList.remove('is-open');
                        document.body.style.overflow = '';
                    }
                });
            });
        }
    } catch (error) {
        console.error("Erro ao carregar menu de equipas:", error);
        if (dropdownEquipasMenu) {
            dropdownEquipasMenu.innerHTML = `<li style="padding: 10px; color: rgba(255,255,255,0.5); font-size: 0.9rem;">Falha ao carregar. Tente novamente.</li>`;
        }
    }
}

async function loadGlobalClubConfig(supabase) {
    try {
        const { data, error } = await supabase.from('clube_config').select('*');
        if (error || !data) return;

        data.forEach(item => {
            const dados = item.dados || {};
            if (item.chave === 'redes_sociais') {
                const linksFb = document.querySelectorAll('a[aria-label="Facebook"], .nav-social-btn a[href*="facebook"], .social-links a[href*="facebook"]');
                const linksIg = document.querySelectorAll('a[aria-label="Instagram"], .nav-social-btn a[href*="instagram"], .social-links a[href*="instagram"]');
                const linksYt = document.querySelectorAll('a[aria-label="YouTube"], .nav-social-btn a[href*="youtube"], .social-links a[href*="youtube"]');
                const linksTt = document.querySelectorAll('a[aria-label="TikTok"], .nav-social-btn a[href*="tiktok"], .social-links a[href*="tiktok"]');

                if (dados.facebook) linksFb.forEach(a => a.href = dados.facebook);
                if (dados.instagram) linksIg.forEach(a => a.href = dados.instagram);
                if (dados.youtube) linksYt.forEach(a => a.href = dados.youtube);
                if (dados.tiktok) linksTt.forEach(a => a.href = dados.tiktok);
            } else if (item.chave === 'geral') {
                const bannerEl = document.querySelector('.anniversary-banner');
                if (bannerEl && dados.banner_aniversario) {
                    bannerEl.innerHTML = dados.banner_aniversario;
                }
            }
        });
    } catch (e) {
        console.warn("Aviso ao carregar clube_config global:", e);
    }
}

// =========================================================================
// CARREGAMENTO DINÂMICO DE NOTÍCIAS NO INDEX (HOMEPAGE)
// =========================================================================
let publicNoticiasCache = [];

async function loadNoticiasIndex(supabase) {
    const sectionNoticias = document.getElementById('noticias');
    const featuredCard = document.getElementById('noticia-featured-card');
    if (!featuredCard) return;

    try {
        const { data: noticias, error } = await supabase
            .from('noticias')
            .select('*')
            .eq('publicada', true)
            .order('destaque', { ascending: false })
            .order('data_publicacao', { ascending: false })
            .limit(6);

        if (error || !noticias || noticias.length === 0) {
            if (sectionNoticias) sectionNoticias.style.display = 'none';
            return;
        }

        if (sectionNoticias) sectionNoticias.style.display = 'block';
        publicNoticiasCache = noticias;

        // 1. Notícia Principal em Destaque
        const principal = noticias[0];
        const elCat = document.getElementById('noticia-feat-cat');
        const elData = document.getElementById('noticia-feat-data');
        const elTitle = document.getElementById('noticia-feat-title');
        const elDesc = document.getElementById('noticia-feat-desc');
        const elBtn = document.getElementById('noticia-feat-btn');
        const elImg = document.getElementById('noticia-feat-img');

        if (elCat) elCat.textContent = principal.categoria || 'Clube';
        if (elData && principal.data_publicacao) {
            elData.textContent = new Date(principal.data_publicacao).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        if (elTitle) elTitle.textContent = principal.titulo;
        if (elDesc) elDesc.textContent = principal.subtitulo || (principal.conteudo ? principal.conteudo.substring(0, 160) + '...' : '');

        if (elImg) {
            if (principal.imagem_url) {
                elImg.style.backgroundImage = `url('${principal.imagem_url}')`;
                elImg.style.display = 'block';
            } else {
                elImg.style.display = 'none';
            }
        }

        if (elBtn) {
            elBtn.textContent = 'Ler Artigo Completo →';
            elBtn.removeAttribute('href');
            elBtn.style.cursor = 'pointer';
            elBtn.onclick = (e) => {
                e.preventDefault();
                openPublicNoticiaModal(principal.id);
            };
        }

        // 2. Notícias Secundárias (Grelha)
        const gridSecondary = document.getElementById('noticias-grid-secondary');
        if (gridSecondary && noticias.length > 1) {
            gridSecondary.innerHTML = '';
            gridSecondary.style.display = 'grid';

            for (let i = 1; i < noticias.length; i++) {
                const n = noticias[i];
                const dataFmt = n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                const imgHtml = n.imagem_url 
                    ? `<img src="${n.imagem_url}" class="noticia-mini-img" alt="${n.titulo}">`
                    : `<div class="noticia-mini-img" style="display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #94a3b8;">🏀</div>`;

                const card = document.createElement('div');
                card.className = 'noticia-mini-card';
                card.innerHTML = `
                    ${imgHtml}
                    <div class="noticia-mini-body">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span class="badge-category" style="background: rgba(126, 34, 206, 0.08); color: #7e22ce; font-weight: 700; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem;">${n.categoria || 'Clube'}</span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary);">${dataFmt}</span>
                            </div>
                            <h3 class="noticia-mini-title">${n.titulo}</h3>
                            <p class="noticia-mini-desc">${n.subtitulo || (n.conteudo ? n.conteudo.substring(0, 120) + '...' : '')}</p>
                        </div>
                        <button type="button" class="btn btn-secondary" style="width: 100%; padding: 8px 14px; font-size: 0.85rem; cursor: pointer;" onclick="openPublicNoticiaModal(${n.id})">
                            Ler Notícia →
                        </button>
                    </div>
                `;
                gridSecondary.appendChild(card);
            }
        }

    } catch (err) {
        console.warn("Aviso ao carregar notícias no index:", err);
    }
}

window.openPublicNoticiaModal = function(id) {
    const n = publicNoticiasCache.find(item => item.id === id);
    if (!n) return;

    const modal = document.getElementById('modal-noticia-publica');
    const content = document.getElementById('modal-noticia-publica-content');
    if (!modal || !content) return;

    const dataFmt = n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const imgHtml = n.imagem_url ? `<img src="${n.imagem_url}" style="width: 100%; max-height: 340px; object-fit: cover;" alt="${n.titulo}">` : '';

    const isInscricoesTopic = (n.titulo && n.titulo.toLowerCase().includes('inscriç')) || 
                              (n.subtitulo && n.subtitulo.toLowerCase().includes('inscriç')) || 
                              (n.conteudo && n.conteudo.toLowerCase().includes('inscriç')) ||
                              (n.categoria && n.categoria.toLowerCase() === 'formação');

    const ctaInscricaoHtml = isInscricoesTopic ? `
        <div style="margin-top: 25px; padding: 22px; background: linear-gradient(135deg, rgba(126, 34, 206, 0.08) 0%, rgba(217, 70, 239, 0.08) 100%); border: 1px solid rgba(126, 34, 206, 0.2); border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 6px;">🏀</div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 6px;">Queres fazer parte da nossa equipa?</h3>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">Inscrições abertas para a época 2026/2027! Processo 100% online, simples e rápido.</p>
            <a href="inscricao.html" class="btn btn-primary" style="display: inline-block; padding: 12px 28px; font-weight: 800; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(126,34,206,0.3);">
                📝 Iniciar Inscrição Online →
            </a>
        </div>
    ` : ``;

    content.innerHTML = `
        ${imgHtml}
        <div style="padding: 24px;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                <span class="badge-category" style="background: rgba(126, 34, 206, 0.1); color: #7e22ce; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 0.78rem;">${n.categoria || 'Clube'}</span>
                <span style="font-size: 0.82rem; color: var(--text-secondary);">📅 ${dataFmt}</span>
                <span style="font-size: 0.82rem; color: var(--text-secondary);">✍️ ${n.autor || 'BCV Comunicação'}</span>
            </div>
            <h1 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; line-height: 1.3;">${n.titulo}</h1>
            ${n.subtitulo ? `<p style="font-size: 1rem; color: var(--text-secondary); font-weight: 500; margin-bottom: 16px; line-height: 1.4;">${n.subtitulo}</p>` : ''}
            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 16px 0;">
            <div style="font-size: 0.95rem; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap;">${n.conteudo}</div>
            ${ctaInscricaoHtml}
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closePublicNoticiaModal = function() {
    const modal = document.getElementById('modal-noticia-publica');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

const btnClosePublicNoticia = document.getElementById('btn-close-noticia-publica');
if (btnClosePublicNoticia) {
    btnClosePublicNoticia.addEventListener('click', closePublicNoticiaModal);
}

const modalNoticiaPublica = document.getElementById('modal-noticia-publica');
if (modalNoticiaPublica) {
    modalNoticiaPublica.addEventListener('click', (e) => {
        if (e.target === modalNoticiaPublica) closePublicNoticiaModal();
    });
}


