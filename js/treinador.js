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
            } else if (userProfile?.escalao_afeto && allTeams && allTeams.length > 0) {
                const rawEscs = (userProfile.escalao_afeto || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                userTeams = allTeams.filter(t => {
                    const tNome = (t.nome || '').toLowerCase();
                    const tEscalao = (t.escalao || '').toLowerCase();
                    return rawEscs.some(re => tNome.includes(re) || tEscalao.includes(re));
                });
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

        // 3. Atualizar Select de Equipas na aba de Relatórios
        const relEquipaSelect = document.getElementById('relatorio-equipa-select');
        if (relEquipaSelect && userTeams.length > 0) {
            relEquipaSelect.innerHTML = userTeams.map(t => {
                const isSelected = activeTeam && String(t.id) === String(activeTeam.id);
                return `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(t.nome)}</option>`;
            }).join('');
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
            } else if (targetTabId === 'tab-relatorios') {
                loadRelatorioPresencas();
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
        const relContainer = document.getElementById('relatorio-matrix-container');
        if (relContainer) relContainer.innerHTML = msgHtml;

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
            if (document.getElementById('tab-relatorios')?.classList.contains('active')) {
                loadRelatorioPresencas();
            }

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

    // ====================================================================
    // MÓDULO 4: RELATÓRIOS (MAPA MENSAL DE PRESENÇAS, PDF & EXCEL)
    // ====================================================================
    const relatorioEquipaSelect = document.getElementById('relatorio-equipa-select');
    const relatorioMesSelect = document.getElementById('relatorio-mes-select');
    const relatorioAnoSelect = document.getElementById('relatorio-ano-select');
    const relatorioTipoSelect = document.getElementById('relatorio-tipo-select');
    const btnRelAtualizar = document.getElementById('btn-rel-atualizar');
    const btnRelExportPdf = document.getElementById('btn-rel-export-pdf');
    const btnRelExportExcel = document.getElementById('btn-rel-export-excel');
    const relatorioKpisContainer = document.getElementById('relatorio-kpis-container');
    const relatorioMatrixContainer = document.getElementById('relatorio-matrix-container');

    const NOMES_MESES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let currentRelatorioData = null; // Armazena a matriz e métricas do relatório atual para exportação

    // Inicializar Seletores de Data dos Relatórios
    function initRelatorioDateSelectors() {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1; // 1-12

        // 1. Preencher select de Anos (ano anterior, atual e seguinte)
        if (relatorioAnoSelect) {
            relatorioAnoSelect.innerHTML = '';
            for (let ano = anoAtual - 1; ano <= anoAtual + 1; ano++) {
                const opt = document.createElement('option');
                opt.value = ano;
                opt.textContent = ano;
                if (ano === anoAtual) opt.selected = true;
                relatorioAnoSelect.appendChild(opt);
            }
        }

        // 2. Definir Mês Atual
        if (relatorioMesSelect) {
            relatorioMesSelect.value = String(mesAtual);
        }
    }
    initRelatorioDateSelectors();

    // Consultar e Renderizar Mapa Mensal de Presenças
    async function loadRelatorioPresencas() {
        if (!relatorioMatrixContainer) return;

        if (!activeTeam || userTeams.length === 0) {
            renderEmptyNoTeams();
            return;
        }

        const mes = parseInt(relatorioMesSelect?.value || (new Date().getMonth() + 1), 10);
        const ano = parseInt(relatorioAnoSelect?.value || new Date().getFullYear(), 10);
        const tipoFiltro = relatorioTipoSelect?.value || 'todos';
        const nomeMes = NOMES_MESES[mes - 1] || `Mês ${mes}`;

        relatorioMatrixContainer.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                <div style="font-size: 1.8rem; margin-bottom: 8px;">⏳</div>
                A compilar mapa mensal de presenças de <strong>${escapeHtml(activeTeam.nome)}</strong> (${nomeMes} de ${ano})...
            </div>
        `;

        if (relatorioKpisContainer) {
            relatorioKpisContainer.innerHTML = '';
        }

        try {
            // Datas Limites do Mês
            const ultimoDiaMes = new Date(ano, mes, 0).getDate();
            const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
            const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

            // Consultar presenças do mês na base de dados
            let query = supabase
                .from('presencas')
                .select('*')
                .gte('data', dataInicio)
                .lte('data', dataFim)
                .order('data', { ascending: true });

            if (tipoFiltro && tipoFiltro !== 'todos') {
                query = query.eq('tipo', tipoFiltro);
            }

            const { data: presencasDb, error } = await query;
            if (error && error.code !== '42P01') {
                throw error;
            }

            // Filtrar apenas registos dos atletas que pertencem ao plantel ativo
            const idsAtletasSet = new Set((currentAtletas || []).map(a => a.id));
            const presencasFiltradas = (presencasDb || []).filter(p => idsAtletasSet.has(p.atleta_id));

            // Apurar dias únicos de sessão (treino ou jogo) registados no mês
            const sessoesMap = {}; // data -> { data, tipo, diaSemana, diaNum }
            presencasFiltradas.forEach(p => {
                if (!sessoesMap[p.data]) {
                    const dt = new Date(p.data + 'T12:00:00');
                    sessoesMap[p.data] = {
                        data: p.data,
                        tipo: p.tipo || 'Treino',
                        diaNum: p.data.split('-')[2],
                        diaSemana: isNaN(dt.getTime()) ? '' : DIAS_SEMANA_ABREV[dt.getDay()]
                    };
                }
            });

            const diasSessao = Object.keys(sessoesMap).sort();

            // Guardar dados estruturados para exportação
            currentRelatorioData = {
                equipa: activeTeam,
                ano,
                mes,
                nomeMes,
                tipoFiltro,
                atletas: currentAtletas || [],
                diasSessao: diasSessao.map(d => sessoesMap[d]),
                presencas: presencasFiltradas
            };

            // SE NÃO HOUVER NENHUMA SESSÃO REGISTADA NO MÊS
            if (diasSessao.length === 0) {
                if (relatorioKpisContainer) {
                    relatorioKpisContainer.innerHTML = `
                        <div class="rel-kpi-card" style="grid-column: 1 / -1; text-align: center; padding: 18px;">
                            <div class="rel-kpi-title">Sem Registos</div>
                            <div class="rel-kpi-value" style="font-size: 1.1rem; justify-content: center; color: var(--text-muted);">
                                Nenhuma presença registada em ${nomeMes} de ${ano}
                            </div>
                            <div class="rel-kpi-subtitle">
                                As presenças registadas no <strong>Diário Desportivo</strong> surgirão automaticamente aqui compiladas em grelha.
                            </div>
                        </div>
                    `;
                }

                relatorioMatrixContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <span style="font-size: 2.4rem; display: block; margin-bottom: 10px;">📋</span>
                        <h4 style="color: var(--text-main); margin-bottom: 6px;">Nenhuma sessão encontrada para este período</h4>
                        <p style="font-size: 0.85rem; max-width: 380px; margin: 0 auto 16px;">
                            Não existem treinos ou jogos com chamada registada em <strong>${nomeMes} de ${ano}</strong> para a equipa <strong>${escapeHtml(activeTeam.nome)}</strong>.
                        </p>
                        <button type="button" class="btn-rel-action btn-rel-pdf" onclick="document.querySelector('[data-tab=\\'tab-presencas\\']')?.click()">
                            📖 Fazer Chamada no Diário Desportivo
                        </button>
                    </div>
                `;
                return;
            }

            // PROCESSAR ESTATÍSTICAS E MATRIZ POR ATLETA
            let somaTotalPresentes = 0;
            let somaTotalFaltas = 0;
            let somaTotalJustificados = 0;
            let somaTotalLesionados = 0;

            const atletasMatriz = (currentAtletas || []).map(atleta => {
                let pCount = 0, fCount = 0, jCount = 0, lCount = 0;
                const statusPorDia = {};

                diasSessao.forEach(dia => {
                    const reg = presencasFiltradas.find(p => p.atleta_id === atleta.id && p.data === dia);
                    const st = reg ? (reg.estado || 'Presente') : '-';
                    statusPorDia[dia] = st;

                    if (st === 'Presente') pCount++;
                    else if (st === 'Falta') fCount++;
                    else if (st === 'Justificado') jCount++;
                    else if (st === 'Lesionado') lCount++;
                });

                somaTotalPresentes += pCount;
                somaTotalFaltas += fCount;
                somaTotalJustificados += jCount;
                somaTotalLesionados += lCount;

                const totalSessoes = diasSessao.length;
                const taxa = totalSessoes > 0 ? Math.round((pCount / totalSessoes) * 100) : 0;

                return {
                    atleta,
                    statusPorDia,
                    pCount,
                    fCount,
                    jCount,
                    lCount,
                    taxa
                };
            });

            // Adicionar à estrutura de dados
            currentRelatorioData.atletasMatriz = atletasMatriz;

            // Estatísticas Globais da Equipa
            const totalSessoesMes = diasSessao.length;
            const totalAtletasPlantel = currentAtletas.length;
            const mediaAssiduidade = atletasMatriz.length > 0 
                ? Math.round(atletasMatriz.reduce((acc, a) => acc + a.taxa, 0) / atletasMatriz.length) 
                : 0;

            currentRelatorioData.metricas = {
                totalSessoesMes,
                totalAtletasPlantel,
                mediaAssiduidade,
                somaTotalPresentes,
                somaTotalFaltas,
                somaTotalJustificados,
                somaTotalLesionados
            };

            // 1. RENDERIZAR OS KPIS DO MÊS
            if (relatorioKpisContainer) {
                const badgeColorRate = mediaAssiduidade >= 80 ? '#10b981' : (mediaAssiduidade >= 60 ? '#f59e0b' : '#ef4444');
                relatorioKpisContainer.innerHTML = `
                    <div class="rel-kpi-card">
                        <span class="rel-kpi-title">📅 Sessões no Mês</span>
                        <div class="rel-kpi-value">${totalSessoesMes}</div>
                        <span class="rel-kpi-subtitle">${tipoFiltro === 'Treino' ? 'Treinos' : (tipoFiltro === 'Jogo' ? 'Jogos' : 'Treinos & Jogos')}</span>
                    </div>

                    <div class="rel-kpi-card">
                        <span class="rel-kpi-title">👥 Plantel</span>
                        <div class="rel-kpi-value">${totalAtletasPlantel}</div>
                        <span class="rel-kpi-subtitle">Atletas Convocáveis</span>
                    </div>

                    <div class="rel-kpi-card">
                        <span class="rel-kpi-title">📈 Assiduidade Média</span>
                        <div class="rel-kpi-value" style="color: ${badgeColorRate};">
                            ${mediaAssiduidade}%
                        </div>
                        <span class="rel-kpi-subtitle">${mediaAssiduidade >= 80 ? 'Excelente assiduidade' : (mediaAssiduidade >= 60 ? 'Média estável' : 'Abaixo do esperado')}</span>
                    </div>

                    <div class="rel-kpi-card">
                        <span class="rel-kpi-title">🎯 Presenças vs Faltas</span>
                        <div class="rel-kpi-value" style="font-size: 1.15rem;">
                            <span style="color: #10b981;">${somaTotalPresentes} P</span>
                            <span style="color: var(--text-light); font-size: 0.85rem; font-weight: 400;">/</span>
                            <span style="color: #ef4444;">${somaTotalFaltas} F</span>
                        </div>
                        <span class="rel-kpi-subtitle">${somaTotalJustificados} just. • ${somaTotalLesionados} les.</span>
                    </div>
                `;
            }

            // 2. RENDERIZAR TABELA MATRICIAL
            let tableHtml = `
                <table class="relatorio-matrix-table">
                    <thead>
                        <tr>
                            <th class="th-atleta">Atleta</th>
            `;

            // Colunas de Dias
            diasSessao.forEach(dia => {
                const s = sessoesMap[dia];
                const tipoBadge = s.tipo === 'Jogo' 
                    ? '<span style="color: #7e22ce; font-weight: 800;">J</span>' 
                    : '<span style="color: #0284c7; font-weight: 800;">T</span>';
                tableHtml += `
                    <th class="th-day" title="${dia} (${s.tipo})">
                        <div>${s.diaNum}</div>
                        <div style="font-size: 0.65rem; color: var(--text-light);">${s.diaSemana}</div>
                        <div style="font-size: 0.62rem; margin-top: 1px;">${tipoBadge}</div>
                    </th>
                `;
            });

            // Colunas de Totais
            tableHtml += `
                            <th class="th-totais" title="Total Presente">P</th>
                            <th class="th-totais" title="Total Falta">F</th>
                            <th class="th-totais" title="Total Justificado">J</th>
                            <th class="th-totais" title="Total Lesionado">L</th>
                            <th class="th-totais" style="min-width: 58px;" title="Taxa de Assiduidade">%</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Linhas dos Atletas
            atletasMatriz.forEach(({ atleta, statusPorDia, pCount, fCount, jCount, lCount, taxa }) => {
                const dorsal = atleta.dorsal_equipa || atleta.equipamento_numero_1 || atleta.dorsal || '-';
                const rateClass = taxa >= 80 ? 'high' : (taxa >= 60 ? 'medium' : 'low');

                tableHtml += `
                    <tr>
                        <td class="td-atleta" title="${escapeHtml(atleta.nome)}">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span class="badge-numero" style="font-size: 0.68rem; padding: 1px 5px;">${dorsal}</span>
                                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                                    ${escapeHtml(atleta.nome)}
                                </span>
                            </div>
                        </td>
                `;

                // Células de cada dia
                diasSessao.forEach(dia => {
                    const st = statusPorDia[dia] || '-';
                    let badgeHtml = '';
                    if (st === 'Presente') badgeHtml = `<span class="badge-mini badge-p" title="Presente">P</span>`;
                    else if (st === 'Falta') badgeHtml = `<span class="badge-mini badge-f" title="Falta">F</span>`;
                    else if (st === 'Justificado') badgeHtml = `<span class="badge-mini badge-j" title="Justificado">J</span>`;
                    else if (st === 'Lesionado') badgeHtml = `<span class="badge-mini badge-l" title="Lesionado">L</span>`;
                    else badgeHtml = `<span class="badge-mini badge-none" title="Sem registo">-</span>`;

                    tableHtml += `<td>${badgeHtml}</td>`;
                });

                // Células de Totais
                tableHtml += `
                        <td class="td-totais" style="color: #15803d;">${pCount}</td>
                        <td class="td-totais" style="color: #b91c1c;">${fCount}</td>
                        <td class="td-totais" style="color: #b45309;">${jCount}</td>
                        <td class="td-totais" style="color: #7e22ce;">${lCount}</td>
                        <td class="td-taxa">
                            <span class="rate-pill-mini ${rateClass}">${taxa}%</span>
                        </td>
                    </tr>
                `;
            });

            // Linha de Rodapé com Totais de Presenças em cada sessão
            tableHtml += `
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border);">
                            <td class="td-atleta" style="background: #f8fafc; font-size: 0.75rem; text-transform: uppercase;">
                                Total Presentes
                            </td>
            `;

            diasSessao.forEach(dia => {
                let presentesNoDia = 0;
                atletasMatriz.forEach(a => {
                    if (a.statusPorDia[dia] === 'Presente') presentesNoDia++;
                });
                tableHtml += `
                    <td style="font-weight: 800; color: #15803d; font-size: 0.78rem;" title="${presentesNoDia} de ${atletasMatriz.length} atletas">
                        ${presentesNoDia}
                    </td>
                `;
            });

            tableHtml += `
                            <td class="td-totais" style="color: #15803d;">${somaTotalPresentes}</td>
                            <td class="td-totais" style="color: #b91c1c;">${somaTotalFaltas}</td>
                            <td class="td-totais" style="color: #b45309;">${somaTotalJustificados}</td>
                            <td class="td-totais" style="color: #7e22ce;">${somaTotalLesionados}</td>
                            <td class="td-taxa">
                                <span class="rate-pill-mini ${mediaAssiduidade >= 80 ? 'high' : (mediaAssiduidade >= 60 ? 'medium' : 'low')}">
                                    ${mediaAssiduidade}%
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            `;

            relatorioMatrixContainer.innerHTML = tableHtml;

        } catch (err) {
            console.error("Erro ao gerar relatório mensal:", err);
            relatorioMatrixContainer.innerHTML = `
                <div style="color: var(--danger); text-align: center; padding: 24px;">
                    ❌ Erro ao carregar relatório: ${err.message}
                </div>
            `;
        }
    }

    // -------------------------------------------------------------------------
    // EXPORTAÇÃO PDF OFICIAL (A4 Paisagem com Cabeçalho Institucional BCV)
    // -------------------------------------------------------------------------
    function exportarRelatorioPresencasPDF() {
        if (!currentRelatorioData || !currentRelatorioData.atletasMatriz || currentRelatorioData.atletasMatriz.length === 0) {
            alert('Não existem dados carregados no relatório para exportar. Por favor selecione uma equipa e mês válidos.');
            return;
        }

        const { equipa, nomeMes, ano, diasSessao, atletasMatriz, metricas } = currentRelatorioData;
        const dataEmissao = new Date().toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const treinadorNome = userProfile?.nome || currentUser?.email || 'Treinador BCV';

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert('Por favor, permita popups no seu navegador para gerar e imprimir o PDF.');
            return;
        }

        // Montar linhas da tabela HTML para o PDF
        let rowsHtml = '';
        atletasMatriz.forEach(({ atleta, statusPorDia, pCount, fCount, jCount, lCount, taxa }) => {
            const dorsal = atleta.dorsal_equipa || atleta.equipamento_numero_1 || atleta.dorsal || '-';
            const nicknameStr = atleta.nickname ? ` "${escapeHtml(atleta.nickname)}"` : '';

            rowsHtml += `
                <tr>
                    <td class="col-num">${dorsal}</td>
                    <td class="col-nome">${escapeHtml(atleta.nome)}${nicknameStr}</td>
            `;

            diasSessao.forEach(s => {
                const st = statusPorDia[s.data] || '-';
                let cls = 'badge-dash';
                let letter = '-';
                if (st === 'Presente') { cls = 'badge-p'; letter = 'P'; }
                else if (st === 'Falta') { cls = 'badge-f'; letter = 'F'; }
                else if (st === 'Justificado') { cls = 'badge-j'; letter = 'J'; }
                else if (st === 'Lesionado') { cls = 'badge-l'; letter = 'L'; }

                rowsHtml += `<td class="col-day"><span class="${cls}">${letter}</span></td>`;
            });

            rowsHtml += `
                    <td class="col-tot tot-p">${pCount}</td>
                    <td class="col-tot tot-f">${fCount}</td>
                    <td class="col-tot tot-j">${jCount}</td>
                    <td class="col-tot tot-l">${lCount}</td>
                    <td class="col-tot tot-taxa"><strong>${taxa}%</strong></td>
                </tr>
            `;
        });

        // Cabeçalhos dos Dias
        let thDaysHtml = '';
        diasSessao.forEach(s => {
            thDaysHtml += `
                <th class="th-day">
                    <div>${s.diaNum}</div>
                    <div class="th-sub">${s.diaSemana}</div>
                    <div class="th-tag">${s.tipo === 'Jogo' ? 'JOG' : 'TRE'}</div>
                </th>
            `;
        });

        // Totais de rodapé por dia
        let tfootDaysHtml = '';
        diasSessao.forEach(s => {
            let presentes = 0;
            atletasMatriz.forEach(a => {
                if (a.statusPorDia[s.data] === 'Presente') presentes++;
            });
            tfootDaysHtml += `<td class="col-day" style="font-weight: bold; color: #15803d;">${presentes}</td>`;
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Presenças - ${escapeHtml(equipa.nome)} - ${nomeMes} ${ano}</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 8mm 10mm;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; }
                    body { color: #1e293b; font-size: 10px; line-height: 1.3; background: #fff; padding: 10px; }
                    
                    /* Cabeçalho Oficial */
                    .doc-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2.5px solid #7e22ce;
                        padding-bottom: 8px;
                        margin-bottom: 10px;
                    }
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .header-logo {
                        width: 44px;
                        height: 44px;
                        object-fit: contain;
                    }
                    .doc-title {
                        font-size: 15px;
                        font-weight: 800;
                        color: #7e22ce;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .doc-subtitle {
                        font-size: 11px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-top: 2px;
                    }
                    .header-meta {
                        text-align: right;
                        font-size: 9px;
                        color: #64748b;
                        line-height: 1.4;
                    }

                    /* Barra de Metadados / Resumo */
                    .meta-bar {
                        display: flex;
                        gap: 16px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        padding: 6px 12px;
                        margin-bottom: 10px;
                        font-size: 9.5px;
                    }
                    .meta-item strong { color: #0f172a; }

                    /* Tabela Matricial */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 8.5px;
                        margin-bottom: 12px;
                    }
                    th {
                        background: #f1f5f9;
                        color: #0f172a;
                        font-weight: 700;
                        border: 1px solid #cbd5e1;
                        padding: 4px 2px;
                        text-align: center;
                    }
                    th.th-atleta { text-align: left; padding-left: 6px; }
                    th.th-day { min-width: 24px; }
                    .th-sub { font-size: 7px; color: #64748b; font-weight: normal; }
                    .th-tag { font-size: 6.5px; color: #7e22ce; font-weight: bold; }

                    td {
                        border: 1px solid #e2e8f0;
                        padding: 3.5px 2px;
                        text-align: center;
                    }
                    tr:nth-child(even) { background-color: #fbfbfe; }
                    td.col-num { width: 22px; font-weight: bold; color: #64748b; }
                    td.col-nome { text-align: left; padding-left: 6px; font-weight: 600; white-space: nowrap; max-width: 160px; overflow: hidden; }
                    
                    /* Badges nos dias */
                    .badge-p { display: inline-block; width: 14px; height: 14px; line-height: 14px; background: #dcfce7; color: #15803d; font-weight: 800; border-radius: 3px; font-size: 7.5px; }
                    .badge-f { display: inline-block; width: 14px; height: 14px; line-height: 14px; background: #fee2e2; color: #b91c1c; font-weight: 800; border-radius: 3px; font-size: 7.5px; }
                    .badge-j { display: inline-block; width: 14px; height: 14px; line-height: 14px; background: #fef3c7; color: #b45309; font-weight: 800; border-radius: 3px; font-size: 7.5px; }
                    .badge-l { display: inline-block; width: 14px; height: 14px; line-height: 14px; background: #f3e8ff; color: #7e22ce; font-weight: 800; border-radius: 3px; font-size: 7.5px; }
                    .badge-dash { color: #cbd5e1; font-weight: bold; }

                    td.col-tot { font-weight: bold; }
                    .tot-p { color: #15803d; background: #f0fdf4; }
                    .tot-f { color: #b91c1c; background: #fef2f2; }
                    .tot-j { color: #b45309; }
                    .tot-l { color: #7e22ce; }
                    .tot-taxa { background: #f8fafc; font-size: 9px; }

                    /* Rodapé e Assinaturas */
                    .doc-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin-top: 18px;
                        padding-top: 10px;
                        page-break-inside: avoid;
                    }
                    .legenda-pdf {
                        font-size: 8px;
                        color: #64748b;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    .sign-box {
                        width: 220px;
                        text-align: center;
                        border-top: 1px solid #94a3b8;
                        padding-top: 4px;
                        font-size: 9px;
                        font-weight: 600;
                        color: #334155;
                    }
                </style>
            </head>
            <body>
                <div class="doc-header">
                    <div class="header-left">
                        <img src="assets/emblema_png.png" class="header-logo" alt="BCV" onerror="this.style.display='none'">
                        <div>
                            <div class="doc-title">Basket Clube de Valença</div>
                            <div class="doc-subtitle">Relatório Mensal de Presenças • ${escapeHtml(equipa.nome)}</div>
                        </div>
                    </div>
                    <div class="header-meta">
                        <div><strong>Período:</strong> ${nomeMes} de ${ano}</div>
                        <div><strong>Emitido por:</strong> ${escapeHtml(treinadorNome)}</div>
                        <div><strong>Data:</strong> ${dataEmissao}</div>
                    </div>
                </div>

                <div class="meta-bar">
                    <div class="meta-item"><strong>Plantel:</strong> ${metricas.totalAtletasPlantel} Atletas</div>
                    <div class="meta-item"><strong>Sessões Realizadas:</strong> ${metricas.totalSessoesMes}</div>
                    <div class="meta-item"><strong>Total Presenças:</strong> <span style="color: #15803d;">${metricas.somaTotalPresentes}</span></div>
                    <div class="meta-item"><strong>Total Faltas:</strong> <span style="color: #b91c1c;">${metricas.somaTotalFaltas}</span></div>
                    <div class="meta-item"><strong>Assiduidade Média:</strong> <strong>${metricas.mediaAssiduidade}%</strong></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 20px;">Nº</th>
                            <th class="th-atleta">Nome do Atleta</th>
                            ${thDaysHtml}
                            <th style="width: 24px; background:#e2fbe8; color:#15803d;">P</th>
                            <th style="width: 24px; background:#fde8e8; color:#b91c1c;">F</th>
                            <th style="width: 24px; background:#fef3c7; color:#b45309;">J</th>
                            <th style="width: 24px; background:#f3e8ff; color:#7e22ce;">L</th>
                            <th style="width: 38px;">% Ass.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f1f5f9; font-weight: bold;">
                            <td colspan="2" style="text-align: right; padding-right: 8px; font-weight: bold;">TOTAL PRESENTES:</td>
                            ${tfootDaysHtml}
                            <td class="col-tot tot-p">${metricas.somaTotalPresentes}</td>
                            <td class="col-tot tot-f">${metricas.somaTotalFaltas}</td>
                            <td class="col-tot tot-j">${metricas.somaTotalJustificados}</td>
                            <td class="col-tot tot-l">${metricas.somaTotalLesionados}</td>
                            <td class="col-tot tot-taxa"><strong>${metricas.mediaAssiduidade}%</strong></td>
                        </tr>
                    </tfoot>
                </table>

                <div class="doc-footer">
                    <div class="legenda-pdf">
                        <span><strong>Legenda:</strong></span>
                        <span><strong style="color:#15803d;">P</strong> = Presente</span>
                        <span><strong style="color:#b91c1c;">F</strong> = Falta</span>
                        <span><strong style="color:#b45309;">J</strong> = Justificado</span>
                        <span><strong style="color:#7e22ce;">L</strong> = Lesionado</span>
                    </div>

                    <div style="display: flex; gap: 30px;">
                        <div class="sign-box">O Treinador</div>
                        <div class="sign-box">A Coordenação Desportiva</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `;

        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
    }

    // -------------------------------------------------------------------------
    // EXPORTAÇÃO EXCEL (.CSV formatado em Matriz com UTF-8 BOM)
    // -------------------------------------------------------------------------
    function exportarRelatorioPresencasExcel() {
        if (!currentRelatorioData || !currentRelatorioData.atletasMatriz || currentRelatorioData.atletasMatriz.length === 0) {
            alert('Não existem dados carregados no relatório para exportar.');
            return;
        }

        const { equipa, nomeMes, ano, diasSessao, atletasMatriz, metricas } = currentRelatorioData;
        const dataHoje = new Date().toLocaleDateString('pt-PT');
        const treinadorNome = userProfile?.nome || currentUser?.email || 'Treinador BCV';

        let csv = '\uFEFF'; // UTF-8 BOM para abrir com acentos perfeitos no Microsoft Excel

        // Metadados iniciais
        csv += `BASKET CLUBE DE VALENÇA - MAPA MENSAL DE PRESENÇAS\r\n`;
        csv += `Equipa;${equipa.nome};Mês;${nomeMes} de ${ano};Emitido em;${dataHoje};Treinador;${treinadorNome}\r\n`;
        csv += `Sessões Realizadas;${metricas.totalSessoesMes};Total Atletas;${metricas.totalAtletasPlantel};Assiduidade Média;${metricas.mediaAssiduidade}%\r\n\r\n`;

        // Cabeçalhos da Tabela
        const headers = ['Nº', 'Nome do Atleta', 'Alcunha'];
        diasSessao.forEach(s => {
            headers.push(`${s.diaNum}/${String(currentRelatorioData.mes).padStart(2, '0')} (${s.tipo})`);
        });
        headers.push('Total Presentes (P)', 'Total Faltas (F)', 'Total Justificados (J)', 'Total Lesionados (L)', 'Taxa Assiduidade (%)');
        csv += headers.join(';') + '\r\n';

        // Linhas de cada atleta
        atletasMatriz.forEach(({ atleta, statusPorDia, pCount, fCount, jCount, lCount, taxa }) => {
            const dorsal = atleta.dorsal_equipa || atleta.equipamento_numero_1 || atleta.dorsal || '';
            const row = [
                dorsal,
                `"${(atleta.nome || '').replace(/"/g, '""')}"`,
                `"${(atleta.nickname || '').replace(/"/g, '""')}"`
            ];

            diasSessao.forEach(s => {
                const st = statusPorDia[s.data] || '-';
                let code = '-';
                if (st === 'Presente') code = 'P';
                else if (st === 'Falta') code = 'F';
                else if (st === 'Justificado') code = 'J';
                else if (st === 'Lesionado') code = 'L';
                row.push(code);
            });

            row.push(pCount, fCount, jCount, lCount, `${taxa}%`);
            csv += row.join(';') + '\r\n';
        });

        // Linha de Totais da Equipa
        const totRow = ['', 'TOTAL PRESENTES NA SESSÃO', ''];
        diasSessao.forEach(s => {
            let pNoDia = 0;
            atletasMatriz.forEach(a => {
                if (a.statusPorDia[s.data] === 'Presente') pNoDia++;
            });
            totRow.push(pNoDia);
        });
        totRow.push(metricas.somaTotalPresentes, metricas.somaTotalFaltas, metricas.somaTotalJustificados, metricas.somaTotalLesionados, `${metricas.mediaAssiduidade}%`);
        csv += totRow.join(';') + '\r\n';

        // Disparar Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const equipaSlug = (equipa.nome || 'BCV').replace(/[^a-zA-Z0-9]/g, '_');
        link.href = url;
        link.download = `Mapa_Presencas_BCV_${equipaSlug}_${ano}_${String(currentRelatorioData.mes).padStart(2, '0')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    if (btnRelAtualizar) btnRelAtualizar.addEventListener('click', loadRelatorioPresencas);
    if (btnRelExportPdf) btnRelExportPdf.addEventListener('click', exportarRelatorioPresencasPDF);
    if (btnRelExportExcel) btnRelExportExcel.addEventListener('click', exportarRelatorioPresencasExcel);

    if (relatorioMesSelect) relatorioMesSelect.addEventListener('change', loadRelatorioPresencas);
    if (relatorioAnoSelect) relatorioAnoSelect.addEventListener('change', loadRelatorioPresencas);
    if (relatorioTipoSelect) relatorioTipoSelect.addEventListener('change', loadRelatorioPresencas);
    if (relatorioEquipaSelect) {
        relatorioEquipaSelect.addEventListener('change', (e) => {
            window.switchTeam(e.target.value);
        });
    }

    // Expor globalmente para uso direto
    window.loadRelatorioPresencas = loadRelatorioPresencas;
    window.exportarRelatorioPresencasPDF = exportarRelatorioPresencasPDF;
    window.exportarRelatorioPresencasExcel = exportarRelatorioPresencasExcel;

    // Inicialização da Sessão
    checkSession();
});
