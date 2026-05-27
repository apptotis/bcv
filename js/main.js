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
    
    // 4. Carregar Destaques do Portal (Agenda e Aniversariantes)
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined') {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        loadPortalHighlights(supabase);
    }
});

async function loadPortalHighlights(supabase) {
    const agendaContainer = document.getElementById('agenda-list');
    const aniversariantesContainer = document.getElementById('aniversariantes-list');

    if (agendaContainer) {
        try {
            const hoje = new Date();
            const daquiA7Dias = new Date();
            daquiA7Dias.setDate(hoje.getDate() + 7);
            
            const todayStr = hoje.toISOString().split('T')[0];
            const nextWeekStr = daquiA7Dias.toISOString().split('T')[0];

            // Tentar obter jogos da tabela agenda_bcv
            const { data: agenda, error } = await supabase
                .from('agenda_bcv')
                .select('*')
                .gte('data_jogo', todayStr)
                .lte('data_jogo', nextWeekStr)
                .order('data_jogo', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    agendaContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">(Tabela de agenda não existe)</div>';
                } else {
                    throw error;
                }
            } else if (!agenda || agenda.length === 0) {
                agendaContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">Nenhum jogo agendado para os próximos 7 dias.</div>';
            } else {
                agendaContainer.innerHTML = '';
                agenda.forEach(jogo => {
                    const dataJogo = new Date(jogo.data_jogo).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
                    const horaJogo = jogo.hora_jogo ? jogo.hora_jogo.substring(0, 5) : ''; // HH:MM
                    
                    const item = document.createElement('div');
                    item.style.padding = '10px';
                    item.style.background = 'rgba(255,255,255,0.05)';
                    item.style.borderRadius = '8px';
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; flex-wrap: wrap; gap: 5px;">
                            <span style="font-weight: bold; color: #fff; font-size: 0.95rem;">${jogo.equipa_casa} vs ${jogo.equipa_fora}</span>
                            <span style="color: #e91e63; font-weight: bold; font-size: 0.85rem;">${dataJogo} ${horaJogo}</span>
                        </div>
                        <div style="color: #a0a0ab; font-size: 0.8rem;">📍 ${jogo.local || 'A definir'} | 🏀 ${jogo.escalao || '-'}</div>
                    `;
                    agendaContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.error("Erro ao carregar agenda:", err);
            agendaContainer.innerHTML = '<div style="color: #ff5252; font-size: 0.9rem;">Erro ao carregar agenda.</div>';
        }
    }

    const resultadosContainer = document.getElementById('resultados-list');
    if (resultadosContainer) {
        try {
            const { data: resultados, error } = await supabase
                .from('resultados_bcv')
                .select('*')
                .order('data_jogo', { ascending: false })
                .limit(5);

            if (error) {
                if (error.code === '42P01') {
                    resultadosContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">(Tabela de resultados não existe)</div>';
                } else {
                    throw error;
                }
            } else if (!resultados || resultados.length === 0) {
                resultadosContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">Nenhum resultado registado recentemente.</div>';
            } else {
                resultadosContainer.innerHTML = '';
                resultados.forEach(resultado => {
                    const dataJogo = new Date(resultado.data_jogo).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
                    
                    const item = document.createElement('div');
                    item.style.padding = '10px';
                    item.style.background = 'rgba(255,255,255,0.05)';
                    item.style.borderRadius = '8px';
                    
                    // Highlight the winner score (simple logic)
                    let scoreCasa = resultado.pontos_casa;
                    let scoreFora = resultado.pontos_fora;
                    if (scoreCasa > scoreFora) {
                        scoreCasa = `<strong style="color: #4caf50;">${scoreCasa}</strong>`;
                    } else if (scoreFora > scoreCasa) {
                        scoreFora = `<strong style="color: #4caf50;">${scoreFora}</strong>`;
                    }

                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; flex-wrap: wrap; gap: 5px;">
                            <span style="color: #fff; font-size: 0.95rem; flex: 1; min-width: 80px;">${resultado.equipa_casa}</span>
                            <span style="font-weight: bold; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; letter-spacing: 2px; white-space: nowrap;">${scoreCasa} - ${scoreFora}</span>
                            <span style="color: #fff; font-size: 0.95rem; flex: 1; text-align: right; min-width: 80px;">${resultado.equipa_fora}</span>
                        </div>
                        <div style="color: #a0a0ab; font-size: 0.8rem; text-align: center;">📅 ${dataJogo} | 🏀 ${resultado.escalao || '-'}</div>
                    `;
                    resultadosContainer.appendChild(item);
                });
            }
        } catch (err) {
            console.error("Erro ao carregar resultados:", err);
            resultadosContainer.innerHTML = '<div style="color: #ff5252; font-size: 0.9rem;">Erro ao carregar resultados.</div>';
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
