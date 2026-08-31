// ====================================================================
// PORTAL DO TREINADOR (MOBILE-FIRST)
// Basket Clube de Valença (BCV)
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    let supabase = null;
    let currentUser = null;
    let userProfile = null;
    let currentAtletas = [];
    let presencasState = {}; // atleta_id -> estado ('Presente', 'Falta', 'Justificado', 'Lesionado')

    // Elementos DOM
    const loginContainer = document.getElementById('login-container');
    const appMain = document.getElementById('app-main');
    const formLogin = document.getElementById('form-login-treinador');
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-password');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const btnLogin = document.getElementById('btn-login');

    const headerUserName = document.getElementById('header-user-name');
    const headerEscalaoBadge = document.getElementById('header-escalao-badge');

    // Abas e Drawer
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerItems = document.querySelectorAll('.drawer-item');
    const btnDrawerLogout = document.getElementById('btn-drawer-logout');
    const drawerUserName = document.getElementById('drawer-user-name');
    const drawerEscalaoName = document.getElementById('drawer-escalao-name');
    const tabContents = document.querySelectorAll('.tab-content');

    // Presenças
    const presencasDataInput = document.getElementById('presencas-data');
    const presencasTipoSelect = document.getElementById('presencas-tipo');
    const listaPresencasContainer = document.getElementById('lista-presencas-container');
    const btnMarcarTodos = document.getElementById('btn-marcar-todos-presentes');
    const btnGuardarPresencas = document.getElementById('btn-guardar-presencas');

    // Plantel & SOS
    const filtroPlantel = document.getElementById('filtro-plantel');
    const listaPlantelContainer = document.getElementById('lista-plantel-container');

    // Múltiplos Escalões
    let userEscaloes = []; // Array de escalões afetos (ex: ['Mini 12', 'Sub 14'])
    let activeEscalao = ''; // Escalão ativo no momento
    const multiEscalaoBar = document.getElementById('multi-escalao-selector-bar');
    const multiEscalaoPills = document.getElementById('multi-escalao-pills');
    const drawerSectionEscaloes = document.getElementById('drawer-section-escaloes');
    const drawerEscaloesList = document.getElementById('drawer-escaloes-list');

    // 1. Inicializar Supabase
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    }

    if (!supabase) {
        console.error("Cliente Supabase não configurado. Verifique js/config.js.");
        showLogin();
        return;
    }

    // Inicializar data de hoje
    const hojeIso = new Date().toISOString().split('T')[0];
    if (presencasDataInput) presencasDataInput.value = hojeIso;

    // 2. Gestão de Sessão & Login
    async function checkSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                showLogin();
                return;
            }

            currentUser = session.user;

            // Carregar perfil do utilizador na tabela public.users
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            userProfile = profile || {
                nome: currentUser.user_metadata?.nome || currentUser.email.split('@')[0],
                role: 'treinador',
                escalao_afeto: ''
            };

            // Extrair lista de escalões (ex: "Mini 12, Sub 14" -> ['Mini 12', 'Sub 14'])
            userEscaloes = (userProfile.escalao_afeto || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            // Definir escalão ativo inicial
            const savedEscalao = localStorage.getItem('bcv_treinador_active_escalao');
            if (savedEscalao && userEscaloes.some(e => e.toLowerCase() === savedEscalao.toLowerCase())) {
                activeEscalao = savedEscalao;
            } else if (userEscaloes.length > 0) {
                activeEscalao = userEscaloes[0];
            } else {
                activeEscalao = '';
            }

            showApp();
            renderEscalaoSelectors();
            await loadData();

        } catch (e) {
            console.error("Erro na verificação de sessão:", e);
            showLogin();
        }
    }

    function showLogin() {
        if (loginContainer) loginContainer.style.display = 'block';
        if (appMain) appMain.style.display = 'none';
    }

    function showApp() {
        if (loginContainer) loginContainer.style.display = 'none';
        if (appMain) appMain.style.display = 'block';

        if (headerUserName) headerUserName.textContent = userProfile.nome || 'Treinador BCV';
        if (drawerUserName) drawerUserName.textContent = userProfile.nome || 'Treinador BCV';

        updateEscalaoDisplay();
    }

    function updateEscalaoDisplay() {
        const displayText = activeEscalao || (userEscaloes.length > 0 ? userEscaloes.join(' / ') : 'Geral BCV');
        if (headerEscalaoBadge) headerEscalaoBadge.textContent = `🏀 ${displayText}`;
        if (drawerEscalaoName) drawerEscalaoName.textContent = displayText;
    }

    // Renderizar seletores de escalão (Pills no Topo e Lista no Drawer)
    function renderEscalaoSelectors() {
        if (userEscaloes.length > 1) {
            // Mostrar barra superior de alternância
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'flex';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'block';

            // 1. Gerar Pills Superiores
            if (multiEscalaoPills) {
                multiEscalaoPills.innerHTML = userEscaloes.map(esc => {
                    const isActive = esc.toLowerCase() === (activeEscalao || '').toLowerCase();
                    return `
                        <button type="button" class="escalao-pill-btn ${isActive ? 'active' : ''}" onclick="window.switchEscalao('${esc}')">
                            🏀 ${esc}
                        </button>
                    `;
                }).join('');
            }

            // 2. Gerar Lista no Drawer
            if (drawerEscaloesList) {
                drawerEscaloesList.innerHTML = userEscaloes.map(esc => {
                    const isActive = esc.toLowerCase() === (activeEscalao || '').toLowerCase();
                    return `
                        <button type="button" class="drawer-escalao-btn ${isActive ? 'active' : ''}" onclick="window.switchEscalao('${esc}')">
                            <span>🏀 ${esc}</span>
                            ${isActive ? '<span style="font-size: 0.8rem;">✓ Ativo</span>' : ''}
                        </button>
                    `;
                }).join('');
            }
        } else {
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'none';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'none';
        }
    }

    // Função global para alternar escalão ativo
    window.switchEscalao = async function(novoEscalao) {
        if (activeEscalao === novoEscalao) return;
        activeEscalao = novoEscalao;
        localStorage.setItem('bcv_treinador_active_escalao', novoEscalao);
        
        updateEscalaoDisplay();
        renderEscalaoSelectors();
        closeDrawer();

        if (listaPresencasContainer) {
            listaPresencasContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">A carregar dados de ' + novoEscalao + '...</div>';
        }

        await loadData();
    };

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPassInput.value.trim();

            if (!email || !password) return;

            if (loginErrorMsg) loginErrorMsg.style.display = 'none';
            if (btnLogin) {
                btnLogin.disabled = true;
                btnLogin.textContent = 'A autenticar...';
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                await checkSession();
            } catch (err) {
                console.error("Erro no login:", err);
                if (loginErrorMsg) {
                    loginErrorMsg.textContent = 'Credenciais incorretas ou acesso não autorizado.';
                    loginErrorMsg.style.display = 'block';
                }
            } finally {
                if (btnLogin) {
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Entrar no Portal';
                }
            }
        });
    }

    async function handleLogout() {
        if (!confirm('Deseja realmente terminar a sessão?')) return;
        try {
            await supabase.auth.signOut();
            currentUser = null;
            userProfile = null;
            activeEscalao = '';
            localStorage.removeItem('bcv_treinador_active_escalao');
            showLogin();
        } catch (e) {
            console.error("Erro no logout:", e);
            location.reload();
        }
    }

    if (btnDrawerLogout) btnDrawerLogout.addEventListener('click', handleLogout);

    // 3. Gestão do Drawer Mobile e Abas
    function openDrawer() {
        if (drawerOverlay) drawerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        if (drawerOverlay) drawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) closeDrawer();
        });
    }

    // Navegação pelas abas através do Drawer
    drawerItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTabId = item.getAttribute('data-tab');
            if (!targetTabId) return;

            drawerItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tabContents.forEach(tab => tab.classList.remove('active'));
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) targetTab.classList.add('active');

            closeDrawer();

            // Recarregar dados da respetiva aba
            if (targetTabId === 'tab-presencas') {
                loadPresencas();
            } else if (targetTabId === 'tab-plantel') {
                renderPlantel();
            }
        });
    });

    // 4. Carregar Atletas Afetos ao Escalão Ativo
    async function loadData() {
        try {
            let query = supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            // Se existir um escalão ativo selecionado, filtrar na query
            if (activeEscalao && activeEscalao.toLowerCase() !== 'todos') {
                const escClean = activeEscalao.replace(/[-\s]/g, '').toLowerCase();
                const { data: todosAtletas, error } = await query;
                if (error) throw error;

                // Filtragem flexível de escalão
                currentAtletas = (todosAtletas || []).filter(a => {
                    const aEsc = (a.escalao || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq1 = (a.equipabcv1 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq2 = (a.equipabcv2 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aFpb = (a.equipafpb || '').replace(/[-\s]/g, '').toLowerCase();
                    return aEsc.includes(escClean) || aEq1.includes(escClean) || aEq2.includes(escClean) || aFpb.includes(escClean);
                });
            } else {
                const { data, error } = await query;
                if (error) throw error;
                currentAtletas = data || [];
            }

            // Iniciar abas
            await loadPresencas();
            renderPlantel();

        } catch (error) {
            console.error("Erro ao carregar atletas:", error);
            if (listaPresencasContainer) {
                listaPresencasContainer.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">Erro ao carregar atletas: ${error.message}</div>`;
            }
        }
    }

    // =======================================================
    // 5. MÓDULO DE PRESENÇAS
    // =======================================================
    async function loadPresencas() {
        if (!listaPresencasContainer) return;
        const dataSel = presencasDataInput.value || hojeIso;
        const tipoSel = presencasTipoSelect.value || 'Treino';

        listaPresencasContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">A verificar presenças gravadas...</div>';

        try {
            // Consultar presenças gravadas na BD para a data e tipo selecionados
            const { data: gravadas, error } = await supabase
                .from('presencas')
                .select('*')
                .eq('data', dataSel)
                .eq('tipo', tipoSel);

            if (error && error.code !== '42P01') {
                console.warn("Aviso ao carregar presenças:", error);
            }

            const mapaGravado = {};
            (gravadas || []).forEach(p => {
                mapaGravado[p.atleta_id] = p.estado;
            });

            // Preencher o estado local: se já gravado usa o estado da BD, caso contrário inicia como 'Presente'
            presencasState = {};
            currentAtletas.forEach(a => {
                presencasState[a.id] = mapaGravado[a.id] || 'Presente';
            });

            renderPresencasTable();

        } catch (e) {
            console.error("Erro ao consultar presenças:", e);
            renderPresencasTable();
        }
    }

    function renderPresencasTable() {
        if (!listaPresencasContainer) return;

        if (currentAtletas.length === 0) {
            listaPresencasContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <span style="font-size: 2rem;">🏀</span>
                    <h3 style="margin-top: 10px; font-size: 1rem; color: var(--text-main);">Nenhum atleta encontrado</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Não há atletas associados à equipa <strong>${activeEscalao || 'selecionada'}</strong>.</p>
                </div>
            `;
            return;
        }

        let html = '';
        currentAtletas.forEach(a => {
            const estadoAtual = presencasState[a.id] || 'Presente';
            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${a.nome}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-presenca-card" id="presenca-card-${a.id}">
                    <div class="atleta-info-row">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${a.nome}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                <span>${a.nickname ? `"${a.nickname}"` : (a.escalao || activeEscalao)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="presenca-actions-grid">
                        <button type="button" class="btn-presenca ${estadoAtual === 'Presente' ? 'active-presente' : ''}" onclick="window.setPresenca(${a.id}, 'Presente')">
                            <span>🟢</span>
                            <span>Presente</span>
                        </button>
                        <button type="button" class="btn-presenca ${estadoAtual === 'Falta' ? 'active-falta' : ''}" onclick="window.setPresenca(${a.id}, 'Falta')">
                            <span>🔴</span>
                            <span>Falta</span>
                        </button>
                        <button type="button" class="btn-presenca ${estadoAtual === 'Justificado' ? 'active-justificado' : ''}" onclick="window.setPresenca(${a.id}, 'Justificado')">
                            <span>🟡</span>
                            <span>Justif.</span>
                        </button>
                        <button type="button" class="btn-presenca ${estadoAtual === 'Lesionado' ? 'active-lesionado' : ''}" onclick="window.setPresenca(${a.id}, 'Lesionado')">
                            <span>🏥</span>
                            <span>Lesão</span>
                        </button>
                    </div>
                </div>
            `;
        });

        listaPresencasContainer.innerHTML = html;
    }

    // Definir estado de presença de um atleta com 1 clique
    window.setPresenca = function(atletaId, estado) {
        presencasState[atletaId] = estado;
        const card = document.getElementById(`presenca-card-${atletaId}`);
        if (!card) return;

        const btns = card.querySelectorAll('.btn-presenca');
        btns.forEach(b => {
            b.classList.remove('active-presente', 'active-falta', 'active-justificado', 'active-lesionado');
        });

        if (estado === 'Presente') btns[0]?.classList.add('active-presente');
        if (estado === 'Falta') btns[1]?.classList.add('active-falta');
        if (estado === 'Justificado') btns[2]?.classList.add('active-justificado');
        if (estado === 'Lesionado') btns[3]?.classList.add('active-lesionado');
    };

    // Marcar todos como presentes
    if (btnMarcarTodos) {
        btnMarcarTodos.addEventListener('click', () => {
            currentAtletas.forEach(a => {
                presencasState[a.id] = 'Presente';
            });
            renderPresencasTable();
        });
    }

    // Atualizar ao mudar data ou tipo
    if (presencasDataInput) presencasDataInput.addEventListener('change', loadPresencas);
    if (presencasTipoSelect) presencasTipoSelect.addEventListener('change', loadPresencas);

    // Guardar presenças em lote
    if (btnGuardarPresencas) {
        btnGuardarPresencas.addEventListener('click', async () => {
            if (currentAtletas.length === 0) return;

            const dataSel = presencasDataInput.value || hojeIso;
            const tipoSel = presencasTipoSelect.value || 'Treino';

            btnGuardarPresencas.disabled = true;
            btnGuardarPresencas.textContent = '💾 A gravar na base de dados...';

            const payload = currentAtletas.map(a => ({
                atleta_id: a.id,
                data: dataSel,
                tipo: tipoSel,
                estado: presencasState[a.id] || 'Presente',
                escalao: a.escalao || activeEscalao,
                registado_por: userProfile.nome || currentUser.email
            }));

            try {
                const { error } = await supabase
                    .from('presencas')
                    .upsert(payload, { onConflict: 'atleta_id, data, tipo' });

                if (error) throw error;

                btnGuardarPresencas.textContent = '✅ Presenças Gravadas!';
                btnGuardarPresencas.style.background = '#059669';

                setTimeout(() => {
                    btnGuardarPresencas.disabled = false;
                    btnGuardarPresencas.textContent = '💾 Guardar Presenças';
                    btnGuardarPresencas.style.background = '';
                }, 2000);

            } catch (err) {
                console.error("Erro ao guardar presenças:", err);
                alert("Erro ao guardar presenças: " + err.message);
                btnGuardarPresencas.disabled = false;
                btnGuardarPresencas.textContent = '💾 Guardar Presenças';
            }
        });
    }

    // =======================================================
    // 6. MÓDULO PLANTEL & SOS (CONTACTOS DE EMERGÊNCIA)
    // =======================================================
    function renderPlantel() {
        if (!listaPlantelContainer) return;
        const filtro = (filtroPlantel?.value || '').toLowerCase().trim();

        const lista = currentAtletas.filter(a => {
            if (!filtro) return true;
            return (a.nome || '').toLowerCase().includes(filtro) ||
                   (a.nickname || '').toLowerCase().includes(filtro) ||
                   (a.encarregado_nome || '').toLowerCase().includes(filtro);
        });

        if (lista.length === 0) {
            listaPlantelContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <p style="color: var(--text-muted);">Nenhum atleta corresponde à pesquisa.</p>
                </div>
            `;
            return;
        }

        let html = '';
        lista.forEach(a => {
            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
            const telAtleta = a.telefone || a.telemovel || '';
            const telEnc = a.encarregado_telefone || a.encarregado_telemovel || '';
            const nomeEnc = a.encarregado_nome || 'Encarregado de Educação';

            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${a.nome}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-sos-card">
                    <div class="atleta-info-row">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${a.nome}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                <span>${a.nickname ? `"${a.nickname}" • ` : ''}${a.escalao || activeEscalao}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                        ${telEnc ? `
                            <a href="tel:${telEnc}" class="btn-call encarregado">
                                <span>📞</span>
                                <span>Ligar Encarregado: ${nomeEnc} (${telEnc})</span>
                            </a>
                        ` : `
                            <div style="font-size: 0.78rem; color: var(--text-muted); padding: 4px 8px; background: #f8fafc; border-radius: 6px;">
                                ⚠️ Sem contacto de encarregado registado
                            </div>
                        `}

                        ${telAtleta ? `
                            <a href="tel:${telAtleta}" class="btn-call">
                                <span>📱</span>
                                <span>Ligar Atleta (${telAtleta})</span>
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        listaPlantelContainer.innerHTML = html;
    }

    if (filtroPlantel) {
        filtroPlantel.addEventListener('input', renderPlantel);
    }

    // Inicialização da Sessão
    checkSession();
});
