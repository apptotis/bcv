document.addEventListener('DOMContentLoaded', () => {
    let supabase = null;

    // 1. Inicializar Supabase Client
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    }

    const sections = {
        'historia': document.getElementById('historia'),
        'orgaos-sociais': document.getElementById('orgaos-sociais'),
        'contactos': document.getElementById('contactos')
    };

    function showSection(hash) {
        // Obter ID alvo a partir do hash, ou usar 'historia' como default
        let targetId = (hash || '').replace('#', '');
        if (!sections[targetId]) {
            targetId = 'historia';
        }

        // Esconder todas as secções
        Object.values(sections).forEach(sec => {
            if (sec) sec.style.display = 'none';
        });

        // Mostrar a secção alvo
        if (sections[targetId]) {
            sections[targetId].style.display = 'block';
            
            // Forçar reflow das animações (reveal)
            const reveals = sections[targetId].querySelectorAll('.reveal');
            reveals.forEach(el => el.classList.add('active'));
        }
        
        // Fazer scroll para o topo de forma suave (após mostrar o conteúdo)
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    }

    // 1. Mostrar a secção correta no carregamento inicial
    showSection(window.location.hash);

    // 2. Intercetar cliques nos links para a própria página e fechar o menu
    window.addEventListener('hashchange', () => {
        showSection(window.location.hash);
        
        // Fechar o menu lateral caso esteja aberto (mobile)
        const drawerMenu = document.getElementById('drawer-menu');
        const drawerOverlay = document.getElementById('drawer-overlay');
        
        if (drawerMenu && drawerMenu.classList.contains('active')) {
            drawerMenu.classList.remove('active');
            if (drawerOverlay) drawerOverlay.classList.remove('active');
            
            // Repor o botão de hamburger ao estado normal
            const hamburgerBtn = document.getElementById('hamburger-trigger');
            if (hamburgerBtn) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                hamburgerBtn.classList.remove('active');
            }
        }
    });

    // =========================================================================
    // CARREGAMENTO DINÂMICO DE CONFIGURAÇÕES E ÓRGÃOS SOCIAIS (SUPABASE)
    // =========================================================================
    
    async function loadDynamicClubData() {
        if (!supabase) {
            console.warn("Cliente Supabase não inicializado no clube.js");
            return;
        }

        try {
            await Promise.all([
                loadConfiguracoesFront(),
                loadOrgaosSociaisFront()
            ]);
        } catch (e) {
            console.warn("Aviso ao carregar dados dinâmicos do clube:", e);
        }
    }

    async function loadConfiguracoesFront() {
        try {
            const { data, error } = await supabase.from('clube_config').select('*');
            if (error || !data) {
                console.warn("Aviso ao consultar clube_config:", error);
                return;
            }

            data.forEach(item => {
                const dados = item.dados || {};
                
                // 1. CONTACTOS
                if (item.chave === 'contactos') {
                    const elPavilhao = document.getElementById('contacto-pavilhao-title');
                    const elMorada = document.getElementById('contacto-morada');
                    const elEmail = document.getElementById('contacto-email');
                    const linkEmail = document.getElementById('link-email');
                    const elTel = document.getElementById('contacto-telefone');
                    const linkTel = document.getElementById('link-telefone');
                    const elHorario = document.getElementById('contacto-horario');
                    const linkMap = document.getElementById('link-google-maps');

                    if (elPavilhao && dados.pavilhao) elPavilhao.textContent = dados.pavilhao;
                    if (elMorada && dados.morada) elMorada.textContent = dados.morada;
                    
                    if (elEmail && dados.email) {
                        elEmail.textContent = dados.email;
                        if (linkEmail) linkEmail.href = `mailto:${dados.email}`;
                    }

                    if (elTel && dados.telefone) {
                        elTel.textContent = dados.telefone;
                        if (linkTel) linkTel.href = `tel:${dados.telefone.replace(/\s+/g, '')}`;
                    }

                    if (elHorario && dados.horario) {
                        elHorario.textContent = dados.horario;
                    }

                    if (linkMap) {
                        const termoPesquisa = (dados.pavilhao || '') + ' ' + (dados.morada || 'Valença');
                        linkMap.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(termoPesquisa.trim())}`;
                    }
                }

                // 2. REDES SOCIAIS
                if (item.chave === 'redes_sociais') {
                    const linksFb = document.querySelectorAll('.btn-social-fb, .social-link-fb, a[aria-label="Facebook"]');
                    const linksIg = document.querySelectorAll('.btn-social-ig, .social-link-ig, a[aria-label="Instagram"]');
                    const linksYt = document.querySelectorAll('.btn-social-yt, .social-link-yt, a[aria-label="YouTube"]');
                    const linksTt = document.querySelectorAll('.social-link-tt, a[aria-label="TikTok"]');
                    const linkWa = document.getElementById('link-whatsapp');

                    if (dados.facebook) linksFb.forEach(a => a.href = dados.facebook);
                    if (dados.instagram) linksIg.forEach(a => a.href = dados.instagram);
                    if (dados.youtube) linksYt.forEach(a => a.href = dados.youtube);
                    if (dados.tiktok) linksTt.forEach(a => a.href = dados.tiktok);

                    if (linkWa && dados.whatsapp && dados.whatsapp.trim() !== '') {
                        const cleanWa = dados.whatsapp.replace(/[^0-9]/g, '');
                        linkWa.href = `https://wa.me/${cleanWa}`;
                        linkWa.style.display = 'flex';
                    }
                }

                // 3. GERAL & INSTITUCIONAL
                if (item.chave === 'geral') {
                    const elNomeClube = document.getElementById('contacto-nome-clube');
                    const elFundacao = document.getElementById('contacto-fundacao');
                    const elNif = document.getElementById('contacto-nif');
                    const bannerEl = document.querySelector('.anniversary-banner');

                    if (elNomeClube && dados.nome_clube) elNomeClube.textContent = dados.nome_clube;
                    if (elFundacao && dados.ano_fundacao) elFundacao.textContent = dados.ano_fundacao;
                    if (elNif && dados.nif) elNif.textContent = dados.nif;

                    if (bannerEl && dados.banner_aniversario) {
                        bannerEl.innerHTML = dados.banner_aniversario;
                    }
                }

                // 4. HISTÓRIA DO CLUBE
                if (item.chave === 'historia') {
                    const elTitulo = document.getElementById('historia-titulo');
                    const elTextoContainer = document.getElementById('historia-texto-container');

                    if (elTitulo && dados.titulo) {
                        elTitulo.textContent = dados.titulo;
                    }

                    if (elTextoContainer) {
                        if (dados.texto && dados.texto.trim() !== '') {
                            const paragrafos = dados.texto.split(/\n\s*\n/).filter(p => p.trim() !== '');
                            elTextoContainer.innerHTML = paragrafos.map(p => 
                                `<p style="font-size: 1.05rem; line-height: 1.8; color: var(--text-secondary); margin-bottom: 18px;">${p.replace(/\n/g, '<br>')}</p>`
                            ).join('');
                        } else {
                            elTextoContainer.innerHTML = `
                                <div style="background: rgba(126, 34, 206, 0.04); border-left: 4px solid var(--accent-primary); padding: 24px; border-radius: 0 12px 12px 0;">
                                    <p style="font-size: 1.2rem; font-weight: 600; color: var(--accent-primary); margin-bottom: 8px;">
                                        🏀 Brevemente conheça a história do Clube...
                                    </p>
                                    <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                                        O texto oficial da história do Basket Clube de Valença está a ser preparado pela Direção.
                                    </p>
                                </div>
                            `;
                        }
                    }
                }
            });
        } catch (err) {
            console.warn("Erro ao ler clube_config:", err);
        }
    }

    async function loadOrgaosSociaisFront() {
        try {
            const { data, error } = await supabase
                .from('orgaos_sociais')
                .select('*')
                .eq('ativo', true)
                .order('ordem', { ascending: true });

            if (error || !data || data.length === 0) return;

            const container = document.getElementById('orgaos-sociais-container');
            if (!container) return;

            // Agrupar por órgão
            const grupos = {};
            data.forEach(m => {
                if (!grupos[m.orgao]) grupos[m.orgao] = [];
                grupos[m.orgao].push(m);
            });

            // Ordem recomendada dos órgãos
            const orgaosOrdem = ['Assembleia Geral', 'Conselho Fiscal', 'Direção', 'Gabinete Técnico'];
            const outrosOrgaos = Object.keys(grupos).filter(o => !orgaosOrdem.includes(o));
            const todosOrgaos = [...orgaosOrdem.filter(o => grupos[o]), ...outrosOrgaos];

            container.innerHTML = '';

            todosOrgaos.forEach(orgaoNome => {
                const membros = grupos[orgaoNome];
                if (!membros || membros.length === 0) return;

                const box = document.createElement('div');
                box.className = 'feature-box';
                box.style.textAlign = 'center';

                const gridClass = membros.length > 3 ? 'grid-4' : 'grid-3';

                let membrosHtml = '';
                membros.forEach(m => {
                    membrosHtml += `
                        <div style="margin-bottom: 15px;">
                            <strong>${m.cargo}</strong><br>
                            <span style="color: var(--text-secondary);">${m.nome}</span>
                        </div>
                    `;
                });

                box.innerHTML = `
                    <h3 style="color: var(--accent-primary); margin-bottom: 1.5rem;">${orgaoNome}</h3>
                    <div class="${gridClass}">
                        ${membrosHtml}
                    </div>
                `;

                container.appendChild(box);
            });
        } catch (err) {
            console.warn("Erro ao renderizar órgãos sociais:", err);
        }
    }

    // Carregar dados dinâmicos do clube
    loadDynamicClubData();
});
