// ====================================================================
// PORTAL DO DIRETOR DE CAMPO / SECCIONISTA (MOBILE-FIRST)
// Basket Clube de Valença (BCV)
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    let supabase = null;
    let currentUser = null;
    let userProfile = null;
    let userEscalao = '';
    let currentAtletas = [];
    let presencasState = {}; // atleta_id -> estado ('Presente', 'Falta', 'Justificado', 'Lesionado')
    let observacoesState = {}; // atleta_id -> texto de observações do diário desportivo
    let mensalidadesMap = {}; // atleta_id -> objeto mensalidade

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

    // Helper rigoroso para filtrar apenas atletas (excluir equipa técnica e direção)
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
    const formLogin = document.getElementById('form-login-diretor');
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-password');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const btnLogout = document.getElementById('btn-logout');

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

    // Mensalidades
    const mensalidadesMesSelect = document.getElementById('mensalidades-mes');
    const statTotalPago = document.getElementById('stat-total-pago');
    const statQtdPago = document.getElementById('stat-qtd-pago');
    const statTotalPendente = document.getElementById('stat-total-pendente');
    const statQtdPendente = document.getElementById('stat-qtd-pendente');
    const listaMensalidadesContainer = document.getElementById('lista-mensalidades-container');

    // Modal Pagamento
    const modalPagamentoSheet = document.getElementById('modal-pagamento-sheet');
    const formPagamentoRapido = document.getElementById('form-pagamento-rapido');
    const modalAtletaNome = document.getElementById('modal-atleta-nome');
    const pagamentoAtletaId = document.getElementById('pagamento-atleta-id');
    const pagamentoTipoCobranca = document.getElementById('pagamento-tipo-cobranca');
    const pagamentoValor = document.getElementById('pagamento-valor');
    const pagamentoMetodo = document.getElementById('pagamento-metodo');
    const pagamentoData = document.getElementById('pagamento-data');
    const pagamentoNotas = document.getElementById('pagamento-notas');
    const btnAnularPagamento = document.getElementById('btn-anular-pagamento');

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

    // 1. Inicializar Supabase a partir do config.js
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
    if (pagamentoData) pagamentoData.value = hojeIso;

    let userEscaloes = []; // Array de escalões afetos (ex: ['Mini 12', 'Sub 14'])
    let activeEscalao = ''; // Escalão ativo no momento

    // Elementos de Múltiplos Escalões
    const multiEscalaoBar = document.getElementById('multi-escalao-selector-bar');
    const multiEscalaoPills = document.getElementById('multi-escalao-pills');
    const drawerSectionEscaloes = document.getElementById('drawer-section-escaloes');
    const drawerEscaloesList = document.getElementById('drawer-escaloes-list');

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
                role: 'diretor',
                escalao_afeto: ''
            };

            const userRole = (userProfile.role || 'diretor').toLowerCase();
            const isAdmin = userRole === 'admin';

            // Carregar equipas estritamente onde o diretor está associado em equipas_atletas
            userEscaloes = [];
            try {
                let staffAtletaIds = [];
                const userEmail = (currentUser?.email || '').trim().toLowerCase();
                const userName = (userProfile?.nome || '').trim().toLowerCase();

                if (userEmail) {
                    const { data: byEmail } = await supabase
                        .from('atletasbcv')
                        .select('id')
                        .ilike('email', userEmail);
                    if (byEmail && byEmail.length > 0) {
                        byEmail.forEach(a => {
                            if (!staffAtletaIds.includes(a.id)) staffAtletaIds.push(a.id);
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
                            if (!staffAtletaIds.includes(a.id)) staffAtletaIds.push(a.id);
                        });
                    }
                }

                if (staffAtletaIds.length > 0) {
                    const { data: vinculos } = await supabase
                        .from('equipas_atletas')
                        .select('equipa_id')
                        .in('atleta_id', staffAtletaIds);

                    if (vinculos && vinculos.length > 0) {
                        const eqIds = vinculos.map(v => v.equipa_id);
                        const { data: eqs } = await supabase
                            .from('equipasbcv')
                            .select('escalao, nome')
                            .in('id', eqIds);
                        if (eqs && eqs.length > 0) {
                            userEscaloes = [...new Set(eqs.map(e => e.nome || e.escalao).filter(Boolean))];
                        }
                    }
                }
            } catch (eRel) {
                console.warn("Aviso ao carregar equipas vinculadas do diretor:", eRel);
            }

            // Se for Admin e não tiver equipa específica no plantel, tem acesso global
            if (userEscaloes.length === 0 && isAdmin) {
                try {
                    const { data: allEqs } = await supabase
                        .from('equipasbcv')
                        .select('escalao, nome');
                    if (allEqs && allEqs.length > 0) {
                        userEscaloes = [...new Set(allEqs.map(e => e.nome || e.escalao).filter(Boolean))];
                    }
                } catch (eAll) {
                    console.warn("Aviso ao carregar todas equipas para admin:", eAll);
                }
            }

            // Definir escalão ativo inicial
            if (userEscaloes.length > 0) {
                const savedEscalao = localStorage.getItem('bcv_diretor_active_escalao');
                if (savedEscalao && userEscaloes.some(e => e.toLowerCase() === savedEscalao.toLowerCase())) {
                    activeEscalao = savedEscalao;
                } else {
                    activeEscalao = userEscaloes[0];
                }
            } else {
                activeEscalao = '';
                localStorage.removeItem('bcv_diretor_active_escalao');
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

        if (headerUserName) {
            headerUserName.textContent = userProfile.nome || 'Diretor';
        }
        if (drawerUserName) {
            drawerUserName.textContent = userProfile.nome || 'Diretor';
        }
        updateHeaderBadge();
    }

    function updateHeaderBadge() {
        if (!activeEscalao || userEscaloes.length === 0) {
            if (headerEscalaoBadge) {
                headerEscalaoBadge.textContent = '⚠️ Sem Equipa';
                headerEscalaoBadge.style.background = '#fef2f2';
                headerEscalaoBadge.style.color = '#dc2626';
                headerEscalaoBadge.style.border = '1px solid #fecaca';
            }
            if (drawerEscalaoName) {
                drawerEscalaoName.textContent = 'Sem Equipa Atribuída';
            }
            return;
        }
        if (headerEscalaoBadge) {
            headerEscalaoBadge.innerHTML = `🏀 ${activeEscalao}`;
            headerEscalaoBadge.style.background = '';
            headerEscalaoBadge.style.color = '';
            headerEscalaoBadge.style.border = '';
        }
        if (drawerEscalaoName) {
            drawerEscalaoName.textContent = `Equipa: ${activeEscalao}`;
        }
    }

    // Renderizar seletores de equipa quando o diretor tem 2 ou mais escalões
    function renderEscalaoSelectors() {
        if (userEscaloes.length <= 1) {
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'none';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'none';
            return;
        }

        // 1. Renderizar Barra Horizontal no Topo
        if (multiEscalaoBar && multiEscalaoPills) {
            multiEscalaoBar.style.display = 'flex';
            multiEscalaoPills.innerHTML = userEscaloes.map(esc => {
                const isActive = esc.toLowerCase() === activeEscalao.toLowerCase();
                return `
                    <button type="button" class="pill-escalao ${isActive ? 'active' : ''}" onclick="window.switchEscalao('${esc}')">
                        <span>🏀</span>
                        <span>${esc}</span>
                        ${isActive ? '<span>✓</span>' : ''}
                    </button>
                `;
            }).join('');
        }

        // 2. Renderizar no Drawer Menu
        if (drawerSectionEscaloes && drawerEscaloesList) {
            drawerSectionEscaloes.style.display = 'block';
            drawerEscaloesList.innerHTML = userEscaloes.map(esc => {
                const isActive = esc.toLowerCase() === activeEscalao.toLowerCase();
                return `
                    <button type="button" class="drawer-escalao-btn ${isActive ? 'active' : ''}" onclick="window.switchEscalao('${esc}')">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <span>🏀</span>
                            <span>${esc}</span>
                        </span>
                        ${isActive ? '<span style="color: var(--primary); font-weight: 800;">● Ativa</span>' : '<span style="color: var(--text-light); font-size: 0.75rem;">Alternar</span>'}
                    </button>
                `;
            }).join('');
        }
    }

    // Função Global para Alternar a Equipa em Gestão com 1 Toque
    window.switchEscalao = async function(novoEscalao) {
        if (activeEscalao.toLowerCase() === novoEscalao.toLowerCase()) {
            closeDrawer();
            return;
        }

        activeEscalao = novoEscalao;
        localStorage.setItem('bcv_diretor_active_escalao', novoEscalao);
        
        updateHeaderBadge();
        renderEscalaoSelectors();
        closeDrawer();

        // Recarregar os dados dos atletas imediatamente para a nova equipa selecionada
        await loadData();
    };

    // Controlo do Drawer Menu
    function openDrawer() {
        if (drawerOverlay) drawerOverlay.classList.add('active');
    }

    function closeDrawer() {
        if (drawerOverlay) drawerOverlay.classList.remove('active');
    }

    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) closeDrawer();
        });
    }

    // Evento Login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPassInput.value;
            const btnLogin = document.getElementById('btn-login');

            btnLogin.textContent = "A entrar...";
            btnLogin.disabled = true;
            if (loginErrorMsg) loginErrorMsg.style.display = 'none';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                await checkSession();
            } catch (err) {
                console.error("Erro ao autenticar:", err);
                if (loginErrorMsg) {
                    loginErrorMsg.textContent = "❌ Email ou palavra-passe incorretos.";
                    loginErrorMsg.style.display = 'block';
                }
            } finally {
                btnLogin.textContent = "Entrar no Portal";
                btnLogin.disabled = false;
            }
        });
    }

    // Evento Logout
    if (btnDrawerLogout) {
        btnDrawerLogout.addEventListener('click', async () => {
            if (confirm("Deseja terminar a sessão?")) {
                closeDrawer();
                await supabase.auth.signOut();
                showLogin();
            }
        });
    }

    // 3. Navegação entre Abas através do Drawer
    drawerItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTabId = item.getAttribute('data-tab');

            drawerItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) targetTab.classList.add('active');

            closeDrawer();

            // Recarregar dados da respetiva aba
            if (targetTabId === 'tab-presencas') {
                loadPresencas();
            } else if (targetTabId === 'tab-plantel') {
                renderPlantel();
            } else if (targetTabId === 'tab-mensalidades') {
                loadMensalidades();
            } else if (targetTabId === 'tab-sos') {
                renderSos();
            }
        });
    });

    // Exibir mensagem informativa quando o diretor ainda não tem nenhuma equipa associada
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
                    A Direção deve aceder a <strong>Equipas &gt; Plantel</strong> no Painel de Administração e adicionar o seu perfil à <strong>Equipa Técnica / Staff</strong> da respetiva equipa.
                </div>
            </div>
        `;

        if (listaPresencasContainer) listaPresencasContainer.innerHTML = msgHtml;
        if (listaMensalidadesContainer) listaMensalidadesContainer.innerHTML = msgHtml;
        if (listaPlantelContainer) listaPlantelContainer.innerHTML = msgHtml;
        if (listaSosContainer) listaSosContainer.innerHTML = msgHtml;

        const stickySaveBar = document.querySelector('.sticky-save-bar');
        if (stickySaveBar) stickySaveBar.style.display = 'none';
        if (btnMarcarTodos) btnMarcarTodos.style.display = 'none';
        const presencasControl = document.querySelector('#tab-presencas .control-card');
        if (presencasControl) presencasControl.style.display = 'none';
        const mensalidadesControl = document.querySelector('#tab-mensalidades .control-card');
        if (mensalidadesControl) mensalidadesControl.style.display = 'none';
        const mensalidadesResumo = document.querySelector('.resumo-grid');
        if (mensalidadesResumo) mensalidadesResumo.style.display = 'none';
        const plantelControl = document.querySelector('#tab-plantel .control-card');
        if (plantelControl) plantelControl.style.display = 'none';
        const sosControl = document.querySelector('#tab-sos .control-card');
        if (sosControl) sosControl.style.display = 'none';
    }

    // 4. Carregar Atletas Afetos ao Escalão Ativo
    async function loadData() {
        try {
            if (!activeEscalao || userEscaloes.length === 0) {
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
            const mensalidadesControl = document.querySelector('#tab-mensalidades .control-card');
            if (mensalidadesControl) mensalidadesControl.style.display = '';
            const mensalidadesResumo = document.querySelector('.resumo-grid');
            if (mensalidadesResumo) mensalidadesResumo.style.display = '';
            const plantelControl = document.querySelector('#tab-plantel .control-card');
            if (plantelControl) plantelControl.style.display = '';

            let query = supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            // Se existir um escalão ativo selecionado, filtrar na query
            if (activeEscalao && activeEscalao.toLowerCase() !== 'todos') {
                const escClean = activeEscalao.replace(/[-\s]/g, '').toLowerCase();
                const { data: todosAtletas, error } = await query;
                if (error) throw error;

                // Consultar atletas convocados para equipas deste escalão em equipas_atletas
                let atletasPlantelIds = new Set();
                try {
                    const { data: eqs } = await supabase
                        .from('equipasbcv')
                        .select('id, escalao, nome');
                    if (eqs) {
                        const eqsMatch = eqs.filter(e => {
                            const eEsc = (e.escalao || '').replace(/[-\s]/g, '').toLowerCase();
                            const eNom = (e.nome || '').replace(/[-\s]/g, '').toLowerCase();
                            return eEsc.includes(escClean) || eNom.includes(escClean);
                        });
                        if (eqsMatch.length > 0) {
                            const eqIds = eqsMatch.map(e => e.id);
                            const { data: vinculos } = await supabase
                                .from('equipas_atletas')
                                .select('atleta_id, papel')
                                .in('equipa_id', eqIds);
                            if (vinculos) {
                                vinculos.forEach(v => {
                                    if (!isStaffMember(v.papel)) {
                                        atletasPlantelIds.add(String(v.atleta_id));
                                    }
                                });
                            }
                        }
                    }
                } catch (eRel) {
                    // Fallback silencioso
                }

                // Filtragem flexível de escalão + atletas convocados (Apenas Jogadores)
                currentAtletas = (todosAtletas || []).filter(a => {
                    if (isStaffMember(a.funcao)) return false; // Excluir treinadores/diretores
                    const aEsc = (a.escalao || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq1 = (a.equipabcv1 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aEq2 = (a.equipabcv2 || '').replace(/[-\s]/g, '').toLowerCase();
                    const aFpb = (a.equipafpb || '').replace(/[-\s]/g, '').toLowerCase();
                    return aEsc.includes(escClean) || aEq1.includes(escClean) || aEq2.includes(escClean) || aFpb.includes(escClean) || atletasPlantelIds.has(String(a.id));
                });
            } else {
                const { data, error } = await query;
                if (error) throw error;
                currentAtletas = (data || []).filter(a => !isStaffMember(a.funcao));
            }

            // Iniciar abas
            await loadPresencas();
            await loadMensalidades();
            renderPlantel();
            renderSos();

        } catch (error) {
            console.error("Erro ao carregar atletas:", error);
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
        if (!activeEscalao || userEscaloes.length === 0) {
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
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Não há atletas associados à equipa <strong>${activeEscalao || 'selecionada'}</strong>.</p>
                </div>
            `;
            return;
        }

        let html = '';
        currentAtletas.forEach(a => {
            const estadoAtual = presencasState[a.id] || 'Presente';
            const obsAtual = observacoesState[a.id] || '';
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

    // Definir presença de 1 atleta
    window.setPresenca = function(atletaId, estado) {
        presencasState[atletaId] = estado;
        const card = document.getElementById(`presenca-card-${atletaId}`);
        if (card) {
            const btns = card.querySelectorAll('.btn-presenca');
            btns.forEach(b => {
                b.className = 'btn-presenca';
            });
            if (estado === 'Presente') btns[0].classList.add('active-presente');
            if (estado === 'Falta') btns[1].classList.add('active-falta');
            if (estado === 'Justificado') btns[2].classList.add('active-justificado');
            if (estado === 'Lesionado') btns[3].classList.add('active-lesionado');
        }
    };

    // Atualizar texto de observações no estado em tempo real
    window.setObservacao = function(atletaId, valor) {
        observacoesState[atletaId] = valor;
    };

    // Marcar Todos Presentes
    if (btnMarcarTodos) {
        btnMarcarTodos.addEventListener('click', () => {
            currentAtletas.forEach(a => {
                presencasState[a.id] = 'Presente';
            });
            renderPresencasTable();
        });
    }

    // Eventos de alteração de data ou tipo de evento
    if (presencasDataInput) presencasDataInput.addEventListener('change', loadPresencas);
    if (presencasTipoSelect) presencasTipoSelect.addEventListener('change', loadPresencas);

    // Guardar Diário Desportivo / Presenças na Base de Dados
    if (btnGuardarPresencas) {
        btnGuardarPresencas.addEventListener('click', async () => {
            const dataSel = presencasDataInput.value || hojeIso;
            const tipoSel = presencasTipoSelect.value || 'Treino';

            if (currentAtletas.length === 0) {
                alert("Não existem atletas para registar no diário desportivo.");
                return;
            }

            btnGuardarPresencas.textContent = "💾 A gravar na base de dados...";
            btnGuardarPresencas.disabled = true;

            const payload = currentAtletas.map(a => ({
                atleta_id: a.id,
                data: dataSel,
                tipo: tipoSel,
                estado: presencasState[a.id] || 'Presente',
                observacoes: (observacoesState[a.id] || '').trim() || null,
                escalao: a.escalao || activeEscalao || 'Geral',
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

                btnGuardarPresencas.textContent = "✅ Diário Desportivo Gravado!";
                btnGuardarPresencas.style.background = "#10b981";

                setTimeout(() => {
                    btnGuardarPresencas.textContent = "💾 Guardar Diário Desportivo";
                    btnGuardarPresencas.style.background = "";
                    btnGuardarPresencas.disabled = false;
                }, 1800);

            } catch (err) {
                console.error("Erro ao guardar diário desportivo:", err);
                alert("Erro ao guardar registos: " + err.message);
                btnGuardarPresencas.textContent = "💾 Guardar Diário Desportivo";
                btnGuardarPresencas.disabled = false;
            }
        });
    }

    // =======================================================
    // 6. MÓDULO DE MENSALIDADES
    // =======================================================
    let currentTargetMes = '2026-09';

    async function loadMensalidades() {
        if (!listaMensalidadesContainer) return;
        if (!activeEscalao || userEscaloes.length === 0) {
            renderEmptyNoTeams();
            return;
        }
        const mesSel = mensalidadesMesSelect.value || '2026-09';
        const epoca = '2026/2027';

        listaMensalidadesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">A carregar estado das mensalidades...</div>';

        try {
            // Carregamos todos os registos da época para cruzar pagamentos mensais e quotas anuais
            const { data: mensalidades, error } = await supabase
                .from('mensalidades')
                .select('*')
                .eq('epoca', epoca);

            if (error && error.code !== '42P01') {
                console.warn("Aviso ao carregar mensalidades:", error);
            }

            // Mapa: atleta_id -> { '2026-09': m, 'ANUAL': m, ... }
            mensalidadesMap = {};
            (mensalidades || []).forEach(m => {
                if (!mensalidadesMap[m.atleta_id]) {
                    mensalidadesMap[m.atleta_id] = {};
                }
                mensalidadesMap[m.atleta_id][m.mes] = m;
            });

            renderMensalidadesList();

        } catch (e) {
            console.error("Erro ao consultar mensalidades:", e);
            renderMensalidadesList();
        }
    }

    function renderMensalidadesList() {
        if (!listaMensalidadesContainer) return;

        const mesSel = mensalidadesMesSelect.value || '2026-09';
        const isFiltroAnual = mesSel === 'ANUAL';
        let totalPago = 0;
        let qtdPago = 0;
        let qtdPendente = 0;
        const VALOR_PADRAO_MENSAL = 25.00;
        const VALOR_PADRAO_ANUAL = 250.00;

        if (currentAtletas.length === 0) {
            listaMensalidadesContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <span style="font-size: 2rem;">💶</span>
                    <h3 style="margin-top: 10px; font-size: 1rem; color: var(--text-main);">Nenhum atleta encontrado</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Não há atletas associados à equipa ativa.</p>
                </div>
            `;
            return;
        }

        let html = '';
        currentAtletas.forEach(a => {
            const atletaRegs = mensalidadesMap[a.id] || {};
            const regAnual = atletaRegs['ANUAL'];
            const isAnualPago = regAnual && regAnual.estado === 'Pago';
            const regMes = atletaRegs[mesSel];
            const isMesPago = regMes && regMes.estado === 'Pago';
            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';

            let statusTexto = '';
            let badgeBtn = '';

            if (isFiltroAnual) {
                // Modo: Visualização da Quota Anual
                if (isAnualPago) {
                    totalPago += Number(regAnual.valor || VALOR_PADRAO_ANUAL);
                    qtdPago++;
                    statusTexto = `⭐ Quota Anual Liquidada • ${regAnual.metodo_pagamento || 'Dinheiro'}`;
                    badgeBtn = `
                        <button type="button" class="badge-status pago-anual" onclick="window.openPagamentoModal(${a.id}, 'ANUAL')">
                            ⭐ Quota Anual Paga (${Number(regAnual.valor || VALOR_PADRAO_ANUAL).toFixed(0)}€)
                        </button>
                    `;
                } else {
                    qtdPendente++;
                    statusTexto = `Pendente (Quota Anual Completa)`;
                    badgeBtn = `
                        <button type="button" class="badge-status pendente" onclick="window.openPagamentoModal(${a.id}, 'ANUAL')">
                            + Registar Quota Anual (${VALOR_PADRAO_ANUAL}€)
                        </button>
                    `;
                }
            } else {
                // Modo: Mês Regular (ex: 2026-09)
                if (isAnualPago) {
                    // Se pagou anuidade, o mês está automaticamente coberto
                    totalPago += VALOR_PADRAO_MENSAL;
                    qtdPago++;
                    statusTexto = `⭐ Coberto por Quota Anual (${regAnual.metodo_pagamento || 'Dinheiro'})`;
                    badgeBtn = `
                        <button type="button" class="badge-status pago-anual" onclick="window.openPagamentoModal(${a.id}, 'ANUAL')">
                            ⭐ Quota Anual Paga (${Number(regAnual.valor || VALOR_PADRAO_ANUAL).toFixed(0)}€)
                        </button>
                    `;
                } else if (isMesPago) {
                    totalPago += Number(regMes.valor || VALOR_PADRAO_MENSAL);
                    qtdPago++;
                    statusTexto = `📅 Pago em ${regMes.data_pagamento || 'Hoje'} • ${regMes.metodo_pagamento || 'Dinheiro'}`;
                    badgeBtn = `
                        <button type="button" class="badge-status pago" onclick="window.openPagamentoModal(${a.id}, '${mesSel}')">
                            ✓ Pago (${Number(regMes.valor || VALOR_PADRAO_MENSAL).toFixed(0)}€)
                        </button>
                    `;
                } else {
                    qtdPendente++;
                    statusTexto = `Pendente`;
                    badgeBtn = `
                        <button type="button" class="badge-status pendente" onclick="window.openPagamentoModal(${a.id}, '${mesSel}')">
                            + Registar Mensalidade (${VALOR_PADRAO_MENSAL}€)
                        </button>
                    `;
                }
            }

            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${a.nome}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-mensalidade-card">
                    <div class="atleta-info-row">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${a.nome}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                <span>${statusTexto}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mensalidade-action-row">
                        ${badgeBtn}
                    </div>
                </div>
            `;
        });

        listaMensalidadesContainer.innerHTML = html;

        // Atualizar Resumo Estatístico
        const valorRefPendente = isFiltroAnual ? VALOR_PADRAO_ANUAL : VALOR_PADRAO_MENSAL;
        if (statTotalPago) statTotalPago.textContent = `${totalPago.toFixed(0)} €`;
        if (statQtdPago) statQtdPago.textContent = `${qtdPago} Pagos`;
        if (statTotalPendente) statTotalPendente.textContent = `${(qtdPendente * valorRefPendente).toFixed(0)} €`;
        if (statQtdPendente) statQtdPendente.textContent = `${qtdPendente} Pendentes`;
    }

    if (mensalidadesMesSelect) {
        mensalidadesMesSelect.addEventListener('change', loadMensalidades);
    }

    // Modal de Pagamento Rápido
    window.openPagamentoModal = function(atletaId, targetMes) {
        const atleta = currentAtletas.find(a => a.id === atletaId);
        if (!atleta) return;

        const mesSel = targetMes || mensalidadesMesSelect.value || '2026-09';
        currentTargetMes = mesSel;

        const atletaRegs = mensalidadesMap[atletaId] || {};
        const isAnual = mesSel === 'ANUAL';
        const reg = atletaRegs[mesSel];
        const isPago = reg && reg.estado === 'Pago';

        modalAtletaNome.textContent = atleta.nome;
        pagamentoAtletaId.value = atletaId;
        
        if (pagamentoTipoCobranca) {
            pagamentoTipoCobranca.value = isAnual ? 'ANUAL' : 'MENSAL';
        }

        const valorPadrao = isAnual ? 250.00 : 25.00;
        pagamentoValor.value = isPago ? (reg.valor || valorPadrao) : valorPadrao;
        pagamentoMetodo.value = isPago ? (reg.metodo_pagamento || 'Dinheiro') : 'Dinheiro';
        pagamentoData.value = isPago ? (reg.data_pagamento || hojeIso) : hojeIso;
        pagamentoNotas.value = isPago ? (reg.notas || '') : '';

        if (isPago) {
            btnAnularPagamento.style.display = 'block';
            document.getElementById('btn-confirmar-pagamento').textContent = 'Atualizar Registo';
        } else {
            btnAnularPagamento.style.display = 'none';
            document.getElementById('btn-confirmar-pagamento').textContent = 'Confirmar Pagamento';
        }

        modalPagamentoSheet.classList.add('active');
    };

    if (pagamentoTipoCobranca) {
        pagamentoTipoCobranca.addEventListener('change', () => {
            if (pagamentoTipoCobranca.value === 'ANUAL') {
                if (Number(pagamentoValor.value) === 25 || !pagamentoValor.value) {
                    pagamentoValor.value = '250.00';
                }
            } else {
                if (Number(pagamentoValor.value) === 250 || !pagamentoValor.value) {
                    pagamentoValor.value = '25.00';
                }
            }
        });
    }

    window.closePagamentoModal = function() {
        modalPagamentoSheet.classList.remove('active');
    };

    if (formPagamentoRapido) {
        formPagamentoRapido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const atletaId = Number(pagamentoAtletaId.value);
            const tipoCobranca = pagamentoTipoCobranca?.value || 'MENSAL';
            
            let mesFinal = (tipoCobranca === 'ANUAL') ? 'ANUAL' : currentTargetMes;
            if (mesFinal === 'ANUAL' && tipoCobranca !== 'ANUAL') {
                mesFinal = mensalidadesMesSelect.value !== 'ANUAL' ? mensalidadesMesSelect.value : '2026-09';
            }

            const epoca = '2026/2027';

            const payload = {
                atleta_id: atletaId,
                epoca: epoca,
                mes: mesFinal,
                valor: Number(pagamentoValor.value) || (tipoCobranca === 'ANUAL' ? 250.00 : 25.00),
                estado: 'Pago',
                metodo_pagamento: pagamentoMetodo.value,
                data_pagamento: pagamentoData.value || hojeIso,
                notas: pagamentoNotas.value || '',
                registado_por: userProfile.nome || currentUser.email
            };

            try {
                const { error } = await supabase
                    .from('mensalidades')
                    .upsert(payload, { onConflict: 'atleta_id, epoca, mes' });

                if (error) throw error;

                closePagamentoModal();
                await loadMensalidades();

            } catch (err) {
                console.error("Erro ao registar pagamento:", err);
                alert("Erro ao registar pagamento: " + err.message);
            }
        });
    }

    if (btnAnularPagamento) {
        btnAnularPagamento.addEventListener('click', async () => {
            if (!confirm("Tem a certeza de que deseja anular este registo de pagamento?")) return;
            const atletaId = Number(pagamentoAtletaId.value);
            const tipoCobranca = pagamentoTipoCobranca?.value || 'MENSAL';
            const mesFinal = (tipoCobranca === 'ANUAL') ? 'ANUAL' : currentTargetMes;
            const epoca = '2026/2027';

            try {
                const { error } = await supabase
                    .from('mensalidades')
                    .delete()
                    .eq('atleta_id', atletaId)
                    .eq('epoca', epoca)
                    .eq('mes', mesFinal);

                if (error) throw error;

                closePagamentoModal();
                await loadMensalidades();

            } catch (err) {
                console.error("Erro ao anular pagamento:", err);
                alert("Erro ao anular: " + err.message);
            }
        });
    }

    // =======================================================
    // 7. MÓDULO PLANTEL (FICHAS & REGISTOS DOS ATLETAS)
    // =======================================================
    function renderPlantel() {
        if (!listaPlantelContainer) return;
        if (!activeEscalao || userEscaloes.length === 0) {
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
                                <span>${escapeHtml(a.escalao || activeEscalao)}</span>
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
    // 8. FICHA INDIVIDUAL DO ATLETA (MODAL / DETALHE)
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
                            <span>${escapeHtml(atleta.escalao || activeEscalao)}</span>
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
    // 9. MÓDULO CONTACTOS SOS (EMERGÊNCIA & ENCARREGADOS)
    // =======================================================
    function renderSos() {
        if (!listaSosContainer) return;
        if (!activeEscalao || userEscaloes.length === 0) {
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
            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
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
                                <span>${a.escalao || activeEscalao}</span>
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
