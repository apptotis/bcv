document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
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

            // Tentar obter jogos da tabela agenda
            const { data: agenda, error } = await supabase
                .from('agenda')
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
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
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
                .from('resultados')
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
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span style="color: #fff; font-size: 0.95rem; flex: 1;">${resultado.equipa_casa}</span>
                            <span style="font-weight: bold; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; letter-spacing: 2px;">${scoreCasa} - ${scoreFora}</span>
                            <span style="color: #fff; font-size: 0.95rem; flex: 1; text-align: right;">${resultado.equipa_fora}</span>
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

    if (aniversariantesContainer) {
        try {
            const { data: atletas, error } = await supabase
                .from('atletasbcv')
                .select('nome, foto, equipa, data_nascimento')
                .not('data_nascimento', 'is', null);

            if (error) {
                if (error.code === '42P01') {
                    aniversariantesContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">(Tabela de atletas não existe)</div>';
                } else {
                    throw error;
                }
            } else {
                const hoje = new Date();
                const diaHoje = hoje.getDate();
                const mesHoje = hoje.getMonth() + 1;

                const aniversariantesHoje = atletas.filter(atleta => {
                    const dataNasc = new Date(atleta.data_nascimento);
                    return dataNasc.getDate() === diaHoje && (dataNasc.getMonth() + 1) === mesHoje;
                });

                if (aniversariantesHoje.length === 0) {
                    aniversariantesContainer.innerHTML = '<div style="color: #a0a0ab; font-size: 0.9rem;">Nenhum atleta celebra o aniversário hoje.</div>';
                } else {
                    aniversariantesContainer.innerHTML = '';
                    aniversariantesHoje.forEach(atleta => {
                        const dataNasc = new Date(atleta.data_nascimento);
                        let idade = hoje.getFullYear() - dataNasc.getFullYear();
                        
                        const item = document.createElement('div');
                        item.style.display = 'flex';
                        item.style.alignItems = 'center';
                        item.style.gap = '12px';
                        item.style.padding = '10px';
                        item.style.background = 'rgba(255,255,255,0.05)';
                        item.style.borderRadius = '8px';

                        const fotoHtml = atleta.foto 
                            ? `<img src="${atleta.foto}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">` 
                            : '<div style="width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: 1.2rem;">👤</div>';

                        item.innerHTML = `
                            ${fotoHtml}
                            <div>
                                <div style="font-weight: bold; font-size: 0.95rem; color: #fff;">${atleta.nome} 🎉</div>
                                <div style="color: #a0a0ab; font-size: 0.8rem;">${atleta.equipa} • ${idade} anos</div>
                            </div>
                        `;
                        aniversariantesContainer.appendChild(item);
                    });
                }
            }
        } catch (err) {
            console.error("Erro ao verificar aniversariantes:", err);
            aniversariantesContainer.innerHTML = '<div style="color: #ff5252; font-size: 0.9rem;">Erro ao verificar aniversários.</div>';
        }
    }
}
