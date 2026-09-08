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
    let observacoesState = {}; // atleta_id -> texto de observações do diário desportivo

    // Helper para escapar HTML seguro em inputs
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Helper rigoroso para filtrar apenas atletas (excluir qualquer cargo de equipa técnica / direção)
    function isStaffMember(cargo) {
        if (!cargo) return false;
        const c = String(cargo).toLowerCase().trim();
        return c.includes('treinador') || c.includes('diretor') || c.includes('seccionista') || 
               c.includes('staff') || c.includes('fisioterapeuta') || c.includes('adjunto') || 
               c.includes('preparador') || c.includes('apoio') || c.includes('coordenador') ||
               c.includes('presidente') || c.includes('vice');
    }

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

    // Plantel & Fichas de Atleta
    const filtroPlantel = document.getElementById('filtro-plantel');
    const listaPlantelContainer = document.getElementById('lista-plantel-container');
    const plantelTotalBadge = document.getElementById('plantel-total-badge');

    // Contactos SOS
    const filtroSos = document.getElementById('filtro-sos');
    const listaSosContainer = document.getElementById('lista-sos-container');

    // Modal Ficha do Atleta
    const modalFichaAtleta = document.getElementById('modal-ficha-atleta');
    const modalFichaHeaderTitle = document.getElementById('modal-ficha-header-title');
    const fichaAtletaContent = document.getElementById('ficha-atleta-content');

    // Gestão de Equipas BCV
    let userTeams = []; // Array de equipas afetadas ao treinador [ { id, nome, escalao, ... } ]
    let activeTeam = null; // Equipa ativa no momento
    const multiEscalaoBar = document.getElementById('multi-escalao-selector-bar');
    const multiEscalaoPills = document.getElementById('multi-escalao-pills');
    const drawerSectionEscaloes = document.getElementById('drawer-section-escaloes');
    const drawerEscaloesList = document.getElementById('drawer-escaloes-list');

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function calcularIdade(dataNasc) {
        if (!dataNasc) return null;
        const d = new Date(dataNasc);
        if (isNaN(d.getTime())) return null;
        const hoje = new Date();
        let idade = hoje.getFullYear() - d.getFullYear();
        const m = hoje.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) {
            idade--;
        }
        return idade >= 0 ? idade : null;
    }

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

            // Carregar equipas atribuídas ao treinador
            await loadUserTeams();

            showApp();
            renderTeamSelectors();
            await loadData();

        } catch (e) {
            console.error("Erro na verificação de sessão:", e);
            showLogin();
        }
    }

    // Carregar todas as equipas atribuídas ao treinador (estritamente via equipas_atletas)
    async function loadUserTeams() {
        try {
            // 1. Buscar todas as equipas registadas
            const { data: allTeams, error: tErr } = await supabase
                .from('equipasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (tErr) console.warn("Aviso ao carregar equipasbcv:", tErr);

            const userRole = (userProfile?.role || '').toLowerCase();
            const isAdmin = userRole === 'admin';

            // 2. Identificar ID do treinador na tabela atletasbcv
            let coachAtletaIds = [];
            const userEmail = (currentUser?.email || '').trim().toLowerCase();
            const userName = (userProfile?.nome || '').trim().toLowerCase();

            if (userEmail) {
                const { data: byEmail } = await supabase
                    .from('atletasbcv')
                    .select('id')
                    .ilike('email', userEmail);
                if (byEmail && byEmail.length > 0) {
                    byEmail.forEach(a => {
                        if (!coachAtletaIds.includes(a.id)) coachAtletaIds.push(a.id);
                    });
                }
            }
            if (userName) {
                const { data: byName } = await supabase
                    .from('atletasbcv')
                    .select('id')
                    .ilike('nome', userName);
                if (byName && byName.length > 0) {
                    byName.forEach(a => {
                        if (!coachAtletaIds.includes(a.id)) coachAtletaIds.push(a.id);
                    });
                }
            }

            // 3. Buscar equipas onde o treinador está associado em equipas_atletas
            const linkedTeamIds = new Set();
            if (coachAtletaIds.length > 0) {
                try {
                    const { data: vinculos } = await supabase
                        .from('equipas_atletas')
                        .select('equipa_id, papel')
                        .in('atleta_id', coachAtletaIds);

                    if (vinculos && vinculos.length > 0) {
                        vinculos.forEach(v => linkedTeamIds.add(String(v.equipa_id)));
                    }
                } catch (vErr) {
                    console.warn("Aviso ao consultar equipas_atletas para treinador:", vErr);
                }
            }

            // 4. Filtrar equipas estritamente vinculadas em equipas_atletas
            const matchedTeams = [];
            if (allTeams && allTeams.length > 0 && linkedTeamIds.size > 0) {
                allTeams.forEach(t => {
                    if (linkedTeamIds.has(String(t.id))) {
                        matchedTeams.push(t);
                    }
                });
            }

            // 5. Definir userTeams:
            // - Treinador: APENAS as equipas onde foi adicionado ao Plantel. Se não tiver vínculo, userTeams = [].
            // - Admin: Se tiver equipas vinculadas usa-as; caso contrário, tem acesso a todas para supervisão.
            if (matchedTeams.length > 0) {
                userTeams = matchedTeams;
            } else if (isAdmin && allTeams && allTeams.length > 0) {
                userTeams = allTeams;
            } else {
                userTeams = [];
            }

            // 6. Definir equipa ativa inicial
            if (userTeams.length > 0) {
                const savedTeamId = localStorage.getItem('bcv_treinador_active_team_id');
                const foundSaved = userTeams.find(t => String(t.id) === String(savedTeamId));
                activeTeam = foundSaved || userTeams[0];
            } else {
                activeTeam = null;
                localStorage.removeItem('bcv_treinador_active_team_id');
            }

        } catch (err) {
            console.error("Erro ao carregar equipas do treinador:", err);
            userTeams = [];
            activeTeam = null;
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

        updateTeamDisplay();
    }

    function updateTeamDisplay() {
        if (!activeTeam || userTeams.length === 0) {
            if (headerEscalaoBadge) {
                headerEscalaoBadge.textContent = '⚠️ Sem Equipa';
                headerEscalaoBadge.style.background = '#fef2f2';
                headerEscalaoBadge.style.color = '#dc2626';
                headerEscalaoBadge.style.border = '1px solid #fecaca';
            }
            if (drawerEscalaoName) drawerEscalaoName.textContent = 'Sem Equipa Atribuída';
            return;
        }
        const displayText = activeTeam.nome;
        if (headerEscalaoBadge) {
            headerEscalaoBadge.textContent = `🏀 ${displayText}`;
            headerEscalaoBadge.style.background = '';
            headerEscalaoBadge.style.color = '';
            headerEscalaoBadge.style.border = '';
        }
        if (drawerEscalaoName) drawerEscalaoName.textContent = displayText;
    }

    // Renderizar seletores de equipa (Pills no Topo e Lista no Drawer)
    function renderTeamSelectors() {
        if (userTeams.length > 1) {
            // Mostrar barra superior de alternância
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'flex';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'block';

            // 1. Gerar Pills Superiores
            if (multiEscalaoPills) {
                multiEscalaoPills.innerHTML = userTeams.map(t => {
                    const isActive = activeTeam && String(t.id) === String(activeTeam.id);
                    return `
                        <button type="button" class="pill-escalao ${isActive ? 'active' : ''}" onclick="window.switchTeam('${t.id}')">
                            <span>🏀</span>
                            <span>${t.nome}</span>
                            ${isActive ? '<span>✓</span>' : ''}
                        </button>
                    `;
                }).join('');
            }

            // 2. Gerar Lista no Drawer
            if (drawerEscaloesList) {
                drawerEscaloesList.innerHTML = userTeams.map(t => {
                    const isActive = activeTeam && String(t.id) === String(activeTeam.id);
                    return `
                        <button type="button" class="drawer-escalao-btn ${isActive ? 'active' : ''}" onclick="window.switchTeam('${t.id}')">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <span>🏀</span>
                                <span>${t.nome}</span>
                            </span>
                            ${isActive ? '<span style="color: var(--primary); font-weight: 800;">● Ativa</span>' : '<span style="color: var(--text-light); font-size: 0.75rem;">Alternar</span>'}
                        </button>
                    `;
                }).join('');
            }
        } else {
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'none';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'none';
        }
    }

    // Função global para alternar equipa ativa
    window.switchTeam = async function(teamId) {
        const found = userTeams.find(t => String(t.id) === String(teamId));
        if (!found || (activeTeam && String(activeTeam.id) === String(found.id))) {
            closeDrawer();
            return;
        }
        activeTeam = found;
        localStorage.setItem('bcv_treinador_active_team_id', String(found.id));
        
        updateTeamDisplay();
        renderTeamSelectors();
        closeDrawer();

        if (listaPresencasContainer) {
            listaPresencasContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">A carregar dados de <strong>${activeTeam.nome}</strong>...</div>`;
        }

        await loadData();
    };

    // Compatibilidade com possíveis chamadas anteriores
    window.switchEscalao = window.switchTeam;

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
            activeTeam = null;
            localStorage.removeItem('bcv_treinador_active_team_id');
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
            } else if (targetTabId === 'tab-sos') {
                renderSos();
            }
        });
    });

    // Exibir mensagem informativa quando o treinador ainda não tem nenhuma equipa associada
    function renderEmptyNoTeams() {
        const msgHtml = `
            <div style="background: white; border-radius: 14px; padding: 36px 20px; text-align: center; border: 1px dashed var(--border); margin: 20px 0; box-shadow: var(--shadow-sm);">
                <span style="font-size: 2.8rem; display: block; margin-bottom: 12px;">📋</span>
                <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700;">Nenhuma Equipa Atribuída</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 8px auto 0; max-width: 320px; line-height: 1.5;">
                    O seu utilizador ainda não tem nenhuma equipa associada.
                </p>
                <div style="margin-top: 16px; display: inline-block; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-size: 0.8rem; color: var(--text-secondary); text-align: left; line-height: 1.5; max-width: 340px;">
                    👉 <strong>Como ativar o seu acesso:</strong><br>
                    A Direção deve aceder a <strong>Equipas &gt; Plantel</strong> no Painel de Administração e adicionar o seu perfil à <strong>Equipa Técnica</strong> da respetiva equipa.
                </div>
            </div>
        `;

        if (listaPresencasContainer) listaPresencasContainer.innerHTML = msgHtml;
        if (listaPlantelContainer) listaPlantelContainer.innerHTML = msgHtml;
        if (listaSosContainer) listaSosContainer.innerHTML = msgHtml;

        const stickySaveBar = document.querySelector('.sticky-save-bar');
        if (stickySaveBar) stickySaveBar.style.display = 'none';
        if (btnMarcarTodos) btnMarcarTodos.style.display = 'none';
        const presencasControl = document.querySelector('#tab-presencas .control-card');
        if (presencasControl) presencasControl.style.display = 'none';
        const plantelControl = document.querySelector('#tab-plantel .control-card');
        if (plantelControl) plantelControl.style.display = 'none';
        const sosControl = document.querySelector('#tab-sos .control-card');
        if (sosControl) sosControl.style.display = 'none';
    }

    // 4. Carregar Atletas Afetos à Equipa Ativa
    async function loadData() {
        try {
            if (!activeTeam || userTeams.length === 0) {
                currentAtletas = [];
                renderEmptyNoTeams();
                return;
            }

            // Restaurar controlos caso estivessem ocultos
            const stickySaveBar = document.querySelector('.sticky-save-bar');
            if (stickySaveBar) stickySaveBar.style.display = '';
            if (btnMarcarTodos) btnMarcarTodos.style.display = '';
            const presencasControl = document.querySelector('#tab-presencas .control-card');
            if (presencasControl) presencasControl.style.display = '';
            const plantelControl = document.querySelector('#tab-plantel .control-card');
            if (plantelControl) plantelControl.style.display = '';

            let atletasCarregados = [];

            if (activeTeam.id !== 'geral') {
                // 1. Procurar vínculos oficiais na tabela associativa equipas_atletas
                const { data: vinculos, error: vErr } = await supabase
                    .from('equipas_atletas')
                    .select('atleta_id, numero_camisola, papel')
                    .eq('equipa_id', activeTeam.id);

                if (!vErr && vinculos && vinculos.length > 0) {
                    // Filtrar apenas jogadores (excluir estritamente equipa técnica / staff)
                    const jogadoresVinculos = vinculos.filter(v => !isStaffMember(v.papel));
                    const mapDorsalPapel = {};
                    jogadoresVinculos.forEach(v => {
                        mapDorsalPapel[v.atleta_id] = {
                            numero: v.numero_camisola,
                            papel: v.papel
                        };
                    });

                    const idsJogadores = jogadoresVinculos.map(v => v.atleta_id);

                    if (idsJogadores.length > 0) {
                        const { data: atletasDb, error: aErr } = await supabase
                            .from('atletasbcv')
                            .select('*')
                            .in('id', idsJogadores)
                            .order('nome', { ascending: true });

                        if (!aErr && atletasDb) {
                            atletasCarregados = atletasDb
                                .filter(a => !isStaffMember(a.funcao))
                                .map(a => {
                                    const extra = mapDorsalPapel[a.id];
                                    return {
                                        ...a,
                                        dorsal_equipa: extra?.numero || a.equipamento_numero_1 || a.dorsal,
                                        papel_equipa: extra?.papel || 'Jogador'
                                    };
                                });
                        }
                    }
                }
            }

            // Fallback: se a equipa ainda não tiver jogadores registados em equipas_atletas
            if (atletasCarregados.length === 0) {
                const escAlvo = (activeTeam.escalao || activeTeam.nome || '').replace(/[-\s]/g, '').toLowerCase();
                const { data: todosAtletas, error } = await supabase
                    .from('atletasbcv')
                    .select('*')
                    .order('nome', { ascending: true });

                if (error) throw error;

                atletasCarregados = (todosAtletas || []).filter(a => {
                    if (isStaffMember(a.funcao)) return false; // Apenas atletas (jogadores)
                    const aEsc = (a.escalao || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq1 = (a.equipabcv1 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq2 = (a.equipabcv2 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aFpb = (a.equipafpb || '').replace(/[-\s]/g, '').toLowerCase();
                    const aNomeEq = (activeTeam.nome || '').replace(/[-\s]/g, '').toLowerCase();
                    return aEsc.includes(escAlvo) || aEq1.includes(escAlvo) || aEq2.includes(escAlvo) || aFpb.includes(escAlvo) ||
                           aNomeEq.includes(aEsc) || aEq1.includes(aNomeEq) || aEq2.includes(aNomeEq);
                });
            }

            currentAtletas = atletasCarregados;

            // Iniciar abas
            await loadPresencas();
            renderPlantel();
            renderSos();

        } catch (error) {
            console.error("Erro ao carregar atletas da equipa:", error);
            if (listaPresencasContainer) {
                listaPresencasContainer.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">Erro ao carregar atletas: ${error.message}</div>`;
            }
        }
    }

    // =======================================================
    // 5. MÓDULO DE DIÁRIO DESPORTIVO (PRESENÇAS & OBSERVAÇÕES)
    // =======================================================
    async function loadPresencas() {
        if (!listaPresencasContainer) return;
        if (!activeTeam || userTeams.length === 0) {
            renderEmptyNoTeams();
            return;
        }
        const dataSel = presencasDataInput.value || hojeIso;
        const tipoSel = presencasTipoSelect.value || 'Treino';

        listaPresencasContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">A verificar registos do diário desportivo...</div>';

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
            const mapaObs = {};
            (gravadas || []).forEach(p => {
                mapaGravado[p.atleta_id] = p.estado;
                mapaObs[p.atleta_id] = p.observacoes || '';
            });

            // Preencher o estado local: se já gravado usa o estado da BD, caso contrário inicia como 'Presente'
            presencasState = {};
            observacoesState = {};
            currentAtletas.forEach(a => {
                presencasState[a.id] = mapaGravado[a.id] || 'Presente';
                observacoesState[a.id] = mapaObs[a.id] || '';
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
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Não há atletas associados à equipa <strong>${activeTeam ? activeTeam.nome : 'selecionada'}</strong>.</p>
                </div>
            `;
            return;
        }

        let html = '';
        currentAtletas.forEach(a => {
            const estadoAtual = presencasState[a.id] || 'Presente';
            const obsAtual = observacoesState[a.id] || '';
            const dorsal = a.dorsal_equipa || a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
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
                                <span>${a.nickname ? `"${a.nickname}"` : (activeTeam ? activeTeam.nome : a.escalao)}</span>
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

                    <div class="presenca-obs-row">
                        <input type="text" 
                               class="input-presenca-obs" 
                               id="obs-atleta-${a.id}" 
                               placeholder="📝 Observações (atraso, motivo, queixas...)" 
                               value="${escapeHtml(obsAtual)}"
                               oninput="window.setObservacao(${a.id}, this.value)">
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

    // Atualizar texto de observações no estado em tempo real
    window.setObservacao = function(atletaId, valor) {
        observacoesState[atletaId] = valor;
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

    // Guardar presenças e diário desportivo em lote
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
                observacoes: (observacoesState[a.id] || '').trim() || null,
                escalao: (activeTeam ? activeTeam.nome : a.escalao) || 'BCV',
                registado_por: userProfile.nome || currentUser.email
            }));

            try {
                let { error } = await supabase
                    .from('presencas')
                    .upsert(payload, { onConflict: 'atleta_id, data, tipo' });

                // Se a coluna 'observacoes' ainda não existir na BD (código 42703), grava sem observações e avisa
                if (error && (error.code === '42703' || (error.message && error.message.includes('observacoes')))) {
                    console.warn("Coluna 'observacoes' não encontrada na tabela presencas. A gravar sem observações...", error);
                    const fallbackPayload = payload.map(({ observacoes, ...resto }) => resto);
                    const retry = await supabase
                        .from('presencas')
                        .upsert(fallbackPayload, { onConflict: 'atleta_id, data, tipo' });
                    
                    if (retry.error) throw retry.error;

                    alert("⚠️ Presenças gravadas com sucesso!\nNota: Para gravar o texto de observações, execute o script SQL 'add_observacoes_to_presencas.sql' no Supabase.");
                } else if (error) {
                    throw error;
                }

                btnGuardarPresencas.textContent = '✅ Diário Desportivo Gravado!';
                btnGuardarPresencas.style.background = '#059669';

                setTimeout(() => {
                    btnGuardarPresencas.disabled = false;
                    btnGuardarPresencas.textContent = '💾 Guardar Diário Desportivo';
                    btnGuardarPresencas.style.background = '';
                }, 2000);

            } catch (err) {
                console.error("Erro ao guardar diário desportivo:", err);
                alert("Erro ao guardar registos: " + err.message);
                btnGuardarPresencas.disabled = false;
                btnGuardarPresencas.textContent = '💾 Guardar Diário Desportivo';
            }
        });
    }

    // =======================================================
    // 6. MÓDULO PLANTEL (FICHAS & REGISTOS DOS ATLETAS)
    // =======================================================
    function renderPlantel() {
        if (!listaPlantelContainer) return;
        if (!activeTeam || userTeams.length === 0) {
            renderEmptyNoTeams();
            return;
        }
        const filtro = (filtroPlantel?.value || '').toLowerCase().trim();

        const lista = currentAtletas.filter(a => {
            if (isStaffMember(a.funcao) || isStaffMember(a.papel_equipa)) return false;
            if (!filtro) return true;
            const dorsal = String(a.dorsal_equipa || a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '');
            return (a.nome || '').toLowerCase().includes(filtro) ||
                   (a.nickname || '').toLowerCase().includes(filtro) ||
                   dorsal.includes(filtro);
        });

        if (plantelTotalBadge) {
            plantelTotalBadge.textContent = `${lista.length} Atleta${lista.length === 1 ? '' : 's'}`;
        }

        if (lista.length === 0) {
            listaPlantelContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <span style="font-size: 2rem;">🏀</span>
                    <p style="color: var(--text-muted); margin-top: 6px;">Nenhum atleta corresponde à pesquisa.</p>
                </div>
            `;
            return;
        }

        let html = '';
        lista.forEach(a => {
            const dorsal = a.dorsal_equipa || a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${escapeHtml(a.nome)}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;
            
            const idade = calcularIdade(a.data_nascimento);

            html += `
                <div class="atleta-presenca-card atleta-plantel-card" onclick="window.openFichaAtleta(${a.id})" title="Ver ficha de ${escapeHtml(a.nome)}">
                    <div class="atleta-info-row">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${escapeHtml(a.nome)}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                ${a.nickname ? `<span>"${escapeHtml(a.nickname)}"</span>` : ''}
                                <span>${escapeHtml(activeTeam ? activeTeam.nome : (a.escalao || 'BCV'))}</span>
                                ${idade ? `<span>• ${idade} anos</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="plantel-action-row">
                        <button type="button" class="btn-plantel-ficha">
                            <span class="btn-plantel-ficha-left">
                                <span>📋</span>
                                <span>Ver Ficha & Diário Desportivo</span>
                            </span>
                            <span class="btn-plantel-ficha-arrow">➔</span>
                        </button>
                    </div>
                </div>
            `;
        });

        listaPlantelContainer.innerHTML = html;
    }

    if (filtroPlantel) {
        filtroPlantel.addEventListener('input', renderPlantel);
    }

    // =======================================================
    // 7. FICHA INDIVIDUAL DO ATLETA (MODAL / DETALHE)
    // =======================================================
    window.openFichaAtleta = async function(atletaId) {
        if (!modalFichaAtleta || !fichaAtletaContent) return;
        const atleta = currentAtletas.find(a => String(a.id) === String(atletaId));
        if (!atleta) return;

        modalFichaAtleta.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (modalFichaHeaderTitle) {
            modalFichaHeaderTitle.textContent = `Ficha • ${atleta.nome}`;
        }

        fichaAtletaContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <span style="font-size: 2rem; display: block; margin-bottom: 10px;">⏳</span>
                A carregar registos do diário desportivo...
            </div>
        `;

        const dorsal = atleta.dorsal_equipa || atleta.equipamento_numero_1 || atleta.equipamento_numero_2 || atleta.dorsal || '-';
        const idade = calcularIdade(atleta.data_nascimento);
        const dataNascFmt = atleta.data_nascimento ? atleta.data_nascimento.split('-').reverse().join('/') : null;

        const fotoHtml = atleta.foto_url 
            ? `<img src="${atleta.foto_url}" class="ficha-avatar-large" alt="${escapeHtml(atleta.nome)}">`
            : `<div class="ficha-avatar-large">${(atleta.nome || 'A').charAt(0).toUpperCase()}</div>`;

        try {
            // Consultar presenças e observações deste atleta na tabela presencas
            const { data: presencas, error } = await supabase
                .from('presencas')
                .select('*')
                .eq('atleta_id', atleta.id)
                .order('data', { ascending: false });

            if (error && error.code !== '42P01') {
                console.warn("Aviso ao carregar histórico do atleta:", error);
            }

            const listaPresencas = presencas || [];
            let cPresentes = 0, cFaltas = 0, cJustificados = 0, cLesionados = 0;

            listaPresencas.forEach(p => {
                if (p.estado === 'Presente') cPresentes++;
                else if (p.estado === 'Falta') cFaltas++;
                else if (p.estado === 'Justificado') cJustificados++;
                else if (p.estado === 'Lesionado') cLesionados++;
            });

            const total = listaPresencas.length;
            const taxa = total > 0 ? Math.round((cPresentes / total) * 100) : 0;
            const rateClass = taxa >= 80 ? 'excelente' : (taxa >= 60 ? 'bom' : 'baixo');

            // Renderizar Timeline
            let timelineHtml = '';
            if (listaPresencas.length === 0) {
                timelineHtml = `
                    <div class="ficha-empty-history">
                        🏀 Ainda não existem registos no Diário Desportivo para este atleta.
                    </div>
                `;
            } else {
                timelineHtml = '<div class="ficha-timeline">';
                listaPresencas.forEach(p => {
                    const dataFmt = p.data ? p.data.split('-').reverse().join('/') : '-';
                    let badgeEstadoHtml = '';
                    if (p.estado === 'Presente') {
                        badgeEstadoHtml = '<span style="background: rgba(16,185,129,0.12); color: #047857; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem;">🟢 Presente</span>';
                    } else if (p.estado === 'Falta') {
                        badgeEstadoHtml = '<span style="background: rgba(239,68,68,0.12); color: #dc2626; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem;">🔴 Falta</span>';
                    } else if (p.estado === 'Justificado') {
                        badgeEstadoHtml = '<span style="background: rgba(245,158,11,0.12); color: #d97706; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem;">🟡 Justificado</span>';
                    } else if (p.estado === 'Lesionado') {
                        badgeEstadoHtml = '<span style="background: rgba(99,102,241,0.12); color: #4f46e5; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem;">🏥 Lesionado</span>';
                    } else {
                        badgeEstadoHtml = `<span style="font-weight: 700; font-size: 0.78rem;">${escapeHtml(p.estado || '-')}</span>`;
                    }

                    const temObs = p.observacoes && p.observacoes.trim().length > 0;

                    timelineHtml += `
                        <div class="ficha-timeline-item">
                            <div class="ficha-timeline-top">
                                <div class="ficha-timeline-date">
                                    <span>📅 ${dataFmt}</span>
                                    <span class="ficha-timeline-badge-tipo">${escapeHtml(p.tipo || 'Treino')}</span>
                                </div>
                                <div>${badgeEstadoHtml}</div>
                            </div>
                            ${temObs ? `
                                <div class="ficha-obs-bubble">
                                    <strong>📝 Observação:</strong> ${escapeHtml(p.observacoes)}
                                    ${p.registado_por ? `<div class="ficha-obs-author">Registo: ${escapeHtml(p.registado_por)}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                timelineHtml += '</div>';
            }

            // Montar todo o HTML da ficha
            fichaAtletaContent.innerHTML = `
                <!-- Hero do Atleta -->
                <div class="ficha-hero-card">
                    ${fotoHtml}
                    <div class="ficha-hero-details">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="ficha-badge-dorsal">CAMISOLA Nº ${dorsal}</span>
                            ${atleta.posicao ? `<span style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">${escapeHtml(atleta.posicao)}</span>` : ''}
                        </div>
                        <div class="ficha-hero-nome">${escapeHtml(atleta.nome)}</div>
                        <div class="ficha-hero-meta">
                            ${atleta.nickname ? `<span>Alcunha: <strong>"${escapeHtml(atleta.nickname)}"</strong></span> • ` : ''}
                            <span>${escapeHtml(activeTeam ? activeTeam.nome : (atleta.escalao || 'BCV'))}</span>
                        </div>
                        ${idade ? `
                            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                                🎂 ${idade} anos ${dataNascFmt ? `(${dataNascFmt})` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Assiduidade / Estatísticas -->
                <div class="ficha-section-title">
                    <span>📊 Assiduidade no Clube</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: none; font-weight: normal;">${total} registo${total === 1 ? '' : 's'}</span>
                </div>

                <div class="ficha-kpi-banner">
                    <div class="ficha-rate-row">
                        <div>
                            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Taxa de Presenças</div>
                            <div class="ficha-rate-val ${rateClass}">${taxa}%</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Sessões</div>
                            <div style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">${total}</div>
                        </div>
                    </div>
                    <div class="ficha-kpi-subgrid">
                        <div class="ficha-mini-stat">
                            <div class="ficha-mini-stat-num" style="color: #047857;">${cPresentes}</div>
                            <div class="ficha-mini-stat-lbl">Presente</div>
                        </div>
                        <div class="ficha-mini-stat">
                            <div class="ficha-mini-stat-num" style="color: #dc2626;">${cFaltas}</div>
                            <div class="ficha-mini-stat-lbl">Faltas</div>
                        </div>
                        <div class="ficha-mini-stat">
                            <div class="ficha-mini-stat-num" style="color: #d97706;">${cJustificados}</div>
                            <div class="ficha-mini-stat-lbl">Justif.</div>
                        </div>
                        <div class="ficha-mini-stat">
                            <div class="ficha-mini-stat-num" style="color: #4f46e5;">${cLesionados}</div>
                            <div class="ficha-mini-stat-lbl">Lesões</div>
                        </div>
                    </div>
                </div>

                <!-- Histórico Diário Desportivo -->
                <div class="ficha-section-title">
                    <span>📖 Diário Desportivo & Observações</span>
                </div>
                ${timelineHtml}

                <div style="margin-top: 24px; text-align: center;">
                    <button type="button" class="btn-call" style="width: 100%; justify-content: center; background: #f8fafc; color: var(--text-muted); border-color: var(--border);" onclick="window.closeFichaAtleta()">
                        Fechar Ficha
                    </button>
                </div>
            `;

        } catch (err) {
            console.error("Erro ao abrir ficha do atleta:", err);
            fichaAtletaContent.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Erro ao carregar dados: ${err.message}</div>`;
        }
    };

    window.closeFichaAtleta = function() {
        if (modalFichaAtleta) modalFichaAtleta.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (modalFichaAtleta) {
        modalFichaAtleta.addEventListener('click', (e) => {
            if (e.target === modalFichaAtleta) window.closeFichaAtleta();
        });
    }

    // =======================================================
    // 8. MÓDULO CONTACTOS SOS (EMERGÊNCIA & ENCARREGADOS)
    // =======================================================
    function renderSos() {
        if (!listaSosContainer) return;
        if (!activeTeam || userTeams.length === 0) {
            listaSosContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <p style="color: var(--text-muted);">Selecione uma equipa para consultar os contactos de emergência.</p>
                </div>
            `;
            return;
        }
        const filtro = (filtroSos?.value || '').toLowerCase().trim();

        const lista = currentAtletas.filter(a => {
            if (!filtro) return true;
            return (a.nome || '').toLowerCase().includes(filtro) ||
                   (a.nickname || '').toLowerCase().includes(filtro) ||
                   (a.encarregado_nome || '').toLowerCase().includes(filtro);
        });

        if (lista.length === 0) {
            listaSosContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <p style="color: var(--text-muted);">Nenhum contacto encontrado para a pesquisa.</p>
                </div>
            `;
            return;
        }

        let html = '';
        lista.forEach(a => {
            const dorsal = a.dorsal_equipa || a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
            const telAtleta = a.telefone || a.telemovel || '';
            const telEnc = a.encarregado_telefone || a.encarregado_telemovel || '';
            const nomeEnc = a.encarregado_nome || 'Encarregado de Educação';

            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${escapeHtml(a.nome)}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-sos-card">
                    <div class="atleta-info-row">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${escapeHtml(a.nome)}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                <span>${a.nickname ? `"${escapeHtml(a.nickname)}" • ` : ''}${activeTeam ? activeTeam.nome : a.escalao}</span>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                        ${telEnc ? `
                            <a href="tel:${telEnc}" class="btn-call encarregado">
                                <span>📞</span>
                                <span>Ligar Encarregado: ${escapeHtml(nomeEnc)} (${telEnc})</span>
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

        listaSosContainer.innerHTML = html;
    }

    if (filtroSos) {
        filtroSos.addEventListener('input', renderSos);
    }

    // Inicialização da Sessão
    checkSession();
});
