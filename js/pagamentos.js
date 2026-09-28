/**
 * Basket Clube de Valença (BCV) - Portal de Pagamentos de Escalão
 * Mobile-First: Registo e Gestão de Quotas, Equipamentos e Exames Médicos
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Cliente Supabase
    let supabase = null;
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
        supabase = window.supabaseClient;
    } else if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Erro crítico: Biblioteca Supabase ou credenciais não encontradas.");
        alert("Erro ao conectar à base de dados. Por favor recarregue a página.");
        return;
    }

    // Estado da Aplicação
    let currentUser = null;
    let userProfile = null;
    let userEscaloes = []; // Array de escalões atribuídos a este utilizador (ex: ['Mini 8', 'Mini 10'])
    let activeEscalao = ''; // Escalão selecionado no momento
    let currentAtletas = []; // Atletas do escalão ativo
    let currentPagamentos = []; // Todos os pagamentos dos atletas deste escalão
    let pagamentosAtletaMap = {}; // atleta_id -> [ pagamentos ]
    let tabelaPrecosQuotas = {}; // Configuração de preços por escalão { mensal, bianual, anual }
    let currentItensCobranca = []; // Itens adicionais da época (ex: EMD, Equipamentos)
    let currentAtletaModal = null; // Atleta aberto no modal
    let activeQuotaMode = 'meses'; // 'meses' | 'bianual' | 'anual'
    let selectedCobrancaItems = new Map(); // key -> item object
    let currentEntregasTesouraria = []; // Histórico de entregas de tesouraria do escalão ativo
    let saldoNumerarioEmPosse = 0; // Saldo em numerário pendente de entrega

    const hojeIso = new Date().toISOString().split('T')[0];

    // Elementos DOM Principais
    const loginContainer = document.getElementById('login-container');
    const appMain = document.getElementById('app-main');
    const formLogin = document.getElementById('form-login-pagamentos');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const btnLogin = document.getElementById('btn-login');

    // Header & Drawer
    const headerUserName = document.getElementById('header-user-name');
    const headerEscalaoBadge = document.getElementById('header-escalao-badge');
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerUserName = document.getElementById('drawer-user-name');
    const drawerEscalaoName = document.getElementById('drawer-escalao-name');
    const drawerEscaloesList = document.getElementById('drawer-escaloes-list');
    const drawerSectionEscaloes = document.getElementById('drawer-section-escaloes');
    const btnDrawerLogout = document.getElementById('btn-drawer-logout');
    const drawerItems = document.querySelectorAll('.drawer-item');

    // Multi-escalão bar no topo
    const multiEscalaoBar = document.getElementById('multi-escalao-bar');
    const multiEscalaoPills = document.getElementById('multi-escalao-pills');

    // Tab Atletas & Cobrança
    const kpiTotalArrecadado = document.getElementById('kpi-total-arrecadado');
    const kpiTotalMovimentos = document.getElementById('kpi-total-movimentos');
    const kpiTotalAtletas = document.getElementById('kpi-total-atletas');
    const kpiEscalaoLabel = document.getElementById('kpi-escalao-label');
    const kpiMesPagos = document.getElementById('kpi-mes-pagos');
    const kpiMesPagosLbl = document.getElementById('kpi-mes-pagos-lbl');
    const kpiMesPendentes = document.getElementById('kpi-mes-pendentes');
    const kpiMesPendentesLbl = document.getElementById('kpi-mes-pendentes-lbl');
    const filtroPesquisaAtleta = document.getElementById('filtro-pesquisa-atleta');
    const filtroMesCobranca = document.getElementById('filtro-mes-cobranca');
    const filtroEstadoPagamento = document.getElementById('filtro-estado-pagamento');
    const listaAtletasContainer = document.getElementById('lista-atletas-container');

    // Tab Movimentos de Tesouraria
    const tesourariaSaldoEmPosse = document.getElementById('tesouraria-saldo-em-posse');
    const tesourariaHeroDesc = document.getElementById('tesouraria-hero-desc');
    const btnAbrirModalEntrega = document.getElementById('btn-abrir-modal-entrega');
    const tesourariaTotalEntregue = document.getElementById('tesouraria-total-entregue');
    const tesourariaTotalCobrado = document.getElementById('tesouraria-total-cobrado');
    const tesourariaContagemEntregas = document.getElementById('tesouraria-contagem-entregas');
    const btnRecarregarTesouraria = document.getElementById('btn-recarregar-tesouraria');
    const listaEntregasContainer = document.getElementById('lista-entregas-container');

    // Modais de Entrega à Tesouraria & Comprovativo
    const modalEntregaSheet = document.getElementById('modal-entrega-sheet');
    const formRegistarEntrega = document.getElementById('form-registar-entrega');
    const modalEntregaSub = document.getElementById('modal-entrega-sub');
    const modalEntregaSaldoDisponivel = document.getElementById('modal-entrega-saldo-disponivel');
    const entregaValorInput = document.getElementById('entrega-valor');
    const btnPreencherTotalPosse = document.getElementById('btn-preencher-total-posse');
    const entregaDataInput = document.getElementById('entrega-data');
    const entregaMetodoSelect = document.getElementById('entrega-metodo');
    const entregaDestinatarioInput = document.getElementById('entrega-destinatario');
    const entregaNotasInput = document.getElementById('entrega-notas');
    const btnSubmeterEntrega = document.getElementById('btn-submeter-entrega');
    const btnSubmeterEntregaTxt = document.getElementById('btn-submeter-entrega-txt');

    const modalComprovativoSheet = document.getElementById('modal-comprovativo-sheet');
    const modalComprovativoContent = document.getElementById('modal-comprovativo-content');

    // Modal Registar Pagamento Multi-Item
    const modalPagamentoSheet = document.getElementById('modal-pagamento-sheet');
    const formRegistarPagamento = document.getElementById('form-registar-pagamento');
    const modalPagamentoAtletaNome = document.getElementById('modal-pagamento-atleta-nome');
    const modalPagamentoAtletaSub = document.getElementById('modal-pagamento-atleta-sub');
    const pagamentoAtletaIdInput = document.getElementById('pagamento-atleta-id');
    const cobrancaQuotasContainer = document.getElementById('cobranca-quotas-container');
    const cobrancaProdutosContainer = document.getElementById('cobranca-produtos-container');
    const cobrancaLiquidadosWrapper = document.getElementById('cobranca-liquidados-wrapper');
    const contagemLiquidados = document.getElementById('contagem-liquidados');
    const cobrancaLiquidadosContainer = document.getElementById('cobranca-liquidados-container');
    const checkoutTotalDisplay = document.getElementById('checkout-total-display');
    const checkoutItensContagem = document.getElementById('checkout-itens-contagem');
    const pagamentoMetodoSelect = document.getElementById('pagamento-metodo');
    const pagamentoDataInput = document.getElementById('pagamento-data');
    const pagamentoNotasInput = document.getElementById('pagamento-notas');
    const btnConfirmarPagamento = document.getElementById('btn-confirmar-pagamento');
    const btnConfirmarPagamentoTxt = document.getElementById('btn-confirmar-pagamento-txt');

    // Modal Extrato Individual
    const modalExtratoSheet = document.getElementById('modal-extrato-sheet');
    const modalExtratoAtletaNome = document.getElementById('modal-extrato-atleta-nome');
    const modalExtratoContent = document.getElementById('modal-extrato-content');

    // Helper: Sanitização HTML simples
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Helper: Limpeza de escalão para comparação resiliente
    function normalizeEscalao(esc) {
        if (!esc) return '';
        return esc.toString().toLowerCase().replace(/[-\s]/g, '').trim();
    }

    // Helper: Remove sufixos de género para comparar escalões base (ex: "Sub 14 Masculino" -> "sub14")
    function baseEscalao(esc) {
        if (!esc) return '';
        return normalizeEscalao(esc).replace(/masculin[oa]s?|feminin[oa]s?|masc|fem/gi, '').trim();
    }

    // Helper: Verifica se dois escalões correspondem (ex: "Sub 14" e "Sub 14 Masculino", ou "Todos")
    function matchesEscalao(escA, escB) {
        if (!escA || !escB) return false;
        const normA = normalizeEscalao(escA);
        const normB = normalizeEscalao(escB);
        if (normA === 'todos' || normB === 'todos') return true;
        if (normA === normB) return true;
        const bA = baseEscalao(escA);
        const bB = baseEscalao(escB);
        return bA === bB && bA.length > 0;
    }

    // Helper para verificar se um membro é staff (não jogador)
    function isStaffMember(funcao) {
        if (!funcao) return false;
        const f = funcao.toLowerCase().trim();
        return f === 'treinador' || f === 'diretor' || f === 'seccionista' || f === 'coordenador' || f === 'staff' || f === 'preparador físico';
    }

    // =======================================================
    // 2. CONTROLO DE SESSÃO & AUTENTICAÇÃO
    // =======================================================
    async function checkSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                showLogin();
                return;
            }

            currentUser = session.user;

            // Obter perfil na tabela pública public.users (por ID ou por Email)
            let profile = null;
            try {
                const { data: byId } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                if (byId) profile = byId;
            } catch (e) {
                console.warn("Consulta users por ID falhou:", e);
            }

            if (!profile && currentUser.email) {
                try {
                    const { data: byEmail } = await supabase
                        .from('users')
                        .select('*')
                        .ilike('email', currentUser.email.trim())
                        .maybeSingle();
                    if (byEmail) profile = byEmail;
                } catch (e) {
                    console.warn("Consulta users por Email falhou:", e);
                }
            }

            userProfile = profile || {
                nome: currentUser.user_metadata?.nome || currentUser.email.split('@')[0],
                role: 'pagamentos',
                escalao_afeto: ''
            };

            const userRole = (userProfile.role || '').toLowerCase();
            const userPerms = Array.isArray(userProfile.permissoes) ? userProfile.permissoes : [];
            const allowedRoles = ['pagamentos', 'tesoureiro', 'diretor_pagamentos', 'diretor', 'seccionista', 'admin', 'editor', 'personalizado'];

            const hasAccess = allowedRoles.includes(userRole) || 
                              userPerms.includes('financeira') || 
                              userRole === 'admin' ||
                              (userProfile.escalao_afeto && userProfile.escalao_afeto.trim().length > 0);

            if (!hasAccess) {
                alert("Acesso Restrito: A sua conta não tem perfil de Responsável de Pagamentos de Escalão.");
                await supabase.auth.signOut();
                showLogin();
                return;
            }

            // Lista completa de todos os escalões padrão do clube para pagamentos
            const ESCALOES_PADRAO_BCV = [
                'BabyBasket',
                'Mini 8',
                'Mini 10',
                'Mini 12',
                'Sub 14 Masculino',
                'Sub 14 Feminino',
                'Sub 16 Masculino',
                'Sub 16 Feminino',
                'Sub 18 Masculino',
                'Sub 18 Feminino'
            ];

            const ESCALOES_REMOVIDOS = ['sub20', 'sub-20', 'seniores', 'senioresmasculinos', 'senioresfemininos', 'veteranos'];

            // Processar escalões atribuídos (separados por vírgula em escalao_afeto)
            const rawEscaloes = (userProfile.escalao_afeto || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .filter(esc => !ESCALOES_REMOVIDOS.includes(normalizeEscalao(esc)));
            
            if (userRole === 'admin') {
                // Administrador tem sempre acesso total e irrestrito a todos os escalões do clube
                userEscaloes = ESCALOES_PADRAO_BCV;
            } else if (rawEscaloes.length > 0) {
                userEscaloes = rawEscaloes.map(esc => {
                    if (esc.toLowerCase().includes('baby')) return 'BabyBasket';
                    return esc;
                });
            } else {
                // Tentar carregar escalões vinculados no plantel (equipas_atletas) se não houver escalao_afeto explícito
                userEscaloes = [];
                try {
                    let staffAtletaIds = [];
                    const uEmail = (currentUser?.email || '').trim().toLowerCase();
                    const uName = (userProfile?.nome || '').trim().toLowerCase();
                    if (uEmail) {
                        const { data: byEmail } = await supabase.from('atletasbcv').select('id').ilike('email', uEmail);
                        if (byEmail) byEmail.forEach(a => { if (!staffAtletaIds.includes(a.id)) staffAtletaIds.push(a.id); });
                    }
                    if (uName) {
                        const { data: byName } = await supabase.from('atletasbcv').select('id').ilike('nome', uName);
                        if (byName) byName.forEach(a => { if (!staffAtletaIds.includes(a.id)) staffAtletaIds.push(a.id); });
                    }
                    if (staffAtletaIds.length > 0) {
                        const { data: vinculos } = await supabase.from('equipas_atletas').select('equipa_id').in('atleta_id', staffAtletaIds);
                        if (vinculos && vinculos.length > 0) {
                            const eqIds = vinculos.map(v => v.equipa_id);
                            const { data: eqs } = await supabase.from('equipasbcv').select('escalao, nome').in('id', eqIds);
                            if (eqs && eqs.length > 0) {
                                userEscaloes = [...new Set(eqs.map(e => e.nome || e.escalao).filter(Boolean))];
                            }
                        }
                    }
                } catch (eFallback) {
                    console.warn("Aviso ao carregar escalões vinculados em pagamentos:", eFallback);
                }
            }

            // Fallback: se ainda não tiver escalões definidos e for admin/diretor/pagamentos, disponibilizar padrão
            if (userEscaloes.length === 0 && (userRole === 'admin' || userRole === 'diretor_pagamentos' || userRole === 'pagamentos' || userRole === 'diretor')) {
                userEscaloes = ESCALOES_PADRAO_BCV;
            }

            // Definir escalão ativo inicial (lembrando seleção anterior se válida)
            const savedEsc = localStorage.getItem('bcv_pagamentos_active_escalao');
            if (savedEsc && userEscaloes.includes(savedEsc)) {
                activeEscalao = savedEsc;
            } else if (userEscaloes.length > 0) {
                activeEscalao = userEscaloes[0];
            }

            showApp();

        } catch (e) {
            console.error("Erro na verificação de sessão:", e);
            showLogin();
        }
    }

    function showLogin() {
        loginContainer.style.display = 'block';
        appMain.style.display = 'none';
    }

    function showApp() {
        loginContainer.style.display = 'none';
        appMain.style.display = 'block';

        // Atualizar nomes no cabeçalho e drawer
        const uNome = userProfile.nome || currentUser.email.split('@')[0];
        if (headerUserName) headerUserName.textContent = uNome;
        if (drawerUserName) drawerUserName.textContent = uNome;

        // Exibir atalho para Portal do Diretor se tiver perfil de diretor ou admin
        const uRole = (userProfile.role || '').toLowerCase();
        const drawerLinkDir = document.getElementById('drawer-link-diretor-container');
        if (drawerLinkDir) {
            if (uRole === 'diretor_pagamentos' || uRole === 'diretor' || uRole === 'admin') {
                drawerLinkDir.style.display = 'block';
            } else {
                drawerLinkDir.style.display = 'none';
            }
        }

        updateEscalaoDisplay();
        renderMultiEscalaoSelectors();

        // Carregar dados do escalão ativo
        loadData();
    }

    // Atualiza badges com o nome do escalão ativo
    function updateEscalaoDisplay() {
        const escName = activeEscalao || 'Sem Escalão';
        if (headerEscalaoBadge) headerEscalaoBadge.textContent = `🏀 ${escName}`;
        if (drawerEscalaoName) drawerEscalaoName.textContent = `Escalão ${escName}`;
        if (kpiEscalaoLabel) kpiEscalaoLabel.textContent = escName;
    }

    // Renderiza seletor de múltiplos escalões no Drawer se o utilizador tiver mais de 1 escalão
    function renderMultiEscalaoSelectors() {
        if (!userEscaloes || userEscaloes.length <= 1) {
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'none';
            return;
        }

        // Lista de troca de escalão no Drawer Lateral
        if (drawerSectionEscaloes && drawerEscaloesList) {
            drawerSectionEscaloes.style.display = 'block';
            drawerEscaloesList.innerHTML = userEscaloes.map(esc => `
                <button type="button" class="pill-escalao ${esc === activeEscalao ? 'active' : ''}" style="width: 100%; justify-content: flex-start;" data-esc="${escapeHtml(esc)}">
                    <span>🏀</span>
                    <span>${escapeHtml(esc)}</span>
                </button>
            `).join('');

            drawerEscaloesList.querySelectorAll('.pill-escalao').forEach(btn => {
                btn.addEventListener('click', () => {
                    const esc = btn.getAttribute('data-esc');
                    if (esc && esc !== activeEscalao) {
                        switchEscalao(esc);
                        closeDrawer();
                    }
                });
            });
        }
    }

    function switchEscalao(novoEscalao) {
        activeEscalao = novoEscalao;
        try {
            localStorage.setItem('bcv_pagamentos_active_escalao', novoEscalao);
        } catch(e) {}
        updateEscalaoDisplay();
        renderMultiEscalaoSelectors();
        loadData();
    }

    // Login Form Submit
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim().toLowerCase();
            const password = loginPasswordInput.value;

            btnLogin.disabled = true;
            btnLogin.textContent = 'A entrar...';
            loginErrorMsg.style.display = 'none';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                await checkSession();
            } catch (err) {
                console.error("Erro no login:", err);
                let msg = err.message || 'Erro ao autenticar.';
                if (msg.includes('Invalid login credentials')) {
                    msg = 'Email ou palavra-passe incorretos.';
                } else if (msg.includes('Email not confirmed')) {
                    msg = 'O email da conta ainda não foi confirmado.';
                }
                loginErrorMsg.textContent = '❌ ' + msg;
                loginErrorMsg.style.display = 'block';
            } finally {
                btnLogin.disabled = false;
                btnLogin.textContent = 'Entrar no Portal';
            }
        });
    }

    // Logout
    if (btnDrawerLogout) {
        btnDrawerLogout.addEventListener('click', async () => {
            if (confirm("Deseja realmente terminar sessão?")) {
                await supabase.auth.signOut();
                location.reload();
            }
        });
    }

    // Drawer Toggle
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

    // Tabs Navigation
    drawerItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            if (!targetTab) return;

            drawerItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const activeSec = document.getElementById(targetTab);
            if (activeSec) activeSec.classList.add('active');

            if (targetTab === 'tab-precos') {
                updatePrecosTab();
            } else if (targetTab === 'tab-tesouraria') {
                renderTesouraria();
            }

            closeDrawer();
        });
    });

    // =======================================================
    // 3. CARREGAMENTO DE DADOS (ATLETAS E PAGAMENTOS)
    // =======================================================
    async function loadData() {
        if (!activeEscalao) {
            renderEmptyState("Nenhum escalão atribuído à sua conta.");
            return;
        }

        if (listaAtletasContainer) listaAtletasContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">A carregar atletas do escalão...</div>';
        if (listaEntregasContainer) listaEntregasContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.85rem;">A carregar movimentos de tesouraria...</div>';

        try {
            // 1. Carregar atletas cujo escalão coincide com o escalão ativo
            const { data: todosAtletas, error: aError } = await supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (aError) throw aError;

            const cleanActive = normalizeEscalao(activeEscalao);
            const activeIsMasc = cleanActive.includes('masc');
            const activeIsFem = cleanActive.includes('fem');
            const baseActive = cleanActive.replace(/masculin[oa]|feminin[oa]|masc|fem/gi, '').trim();

            currentAtletas = (todosAtletas || []).filter(a => {
                if (isStaffMember(a.funcao)) return false; // apenas atletas jogadores

                // Apenas atletas inscritos na época 2026/2027
                const ep = (a.epoca || '').trim();
                const isEpocaAtiva = ep === '2026/2027' || ep.includes('2026/2027') || ep.includes('2026-2027');
                if (!isEpocaAtiva) return false;

                // Validação estrita de género quando o escalão selecionado especifica Masculino ou Feminino
                const atletaSexo = (a.sexo || '').toUpperCase();
                const isAtletaMasc = atletaSexo === 'M' || atletaSexo.startsWith('MASC');
                const isAtletaFem = atletaSexo === 'F' || atletaSexo.startsWith('FEM');

                if (activeIsMasc && !isAtletaMasc) return false;
                if (activeIsFem && !isAtletaFem) return false;

                const cleanAtletaEsc = normalizeEscalao(a.escalao);
                const baseAtletaEsc = cleanAtletaEsc.replace(/masculin[oa]|feminin[oa]|masc|fem/gi, '').trim();
                const cleanFpb = normalizeEscalao(a.equipafpb).replace(/masculin[oa]|feminin[oa]|masc|fem/gi, '').trim();

                // Correspondência pelo escalão etário base (ex: sub14, sub16, sub18, etc.)
                return baseAtletaEsc.includes(baseActive) || baseActive.includes(baseAtletaEsc) ||
                       cleanFpb.includes(baseActive);
            });

            if (currentAtletas.length === 0) {
                renderEmptyState(`Não foram encontrados atletas inscritos na época 2026/2027 no escalão "${activeEscalao}".`);
                currentPagamentos = [];
                renderTesouraria();
                updateKpis();
                return;
            }

            const atletaIds = currentAtletas.map(a => a.id);

            // 2. Carregar movimentos / pagamentos destes atletas na época 2026/2027
            const { data: pagamentos, error: pError } = await supabase
                .from('mensalidades')
                .select('*')
                .eq('epoca', '2026/2027')
                .in('atleta_id', atletaIds)
                .order('data_pagamento', { ascending: false });

            if (pError && pError.code !== '42P01') {
                console.warn("Aviso ao carregar pagamentos:", pError);
            }

            currentPagamentos = pagamentos || [];

            // Indexar pagamentos por atleta_id
            pagamentosAtletaMap = {};
            currentPagamentos.forEach(p => {
                if (!pagamentosAtletaMap[p.atleta_id]) {
                    pagamentosAtletaMap[p.atleta_id] = [];
                }
                pagamentosAtletaMap[p.atleta_id].push(p);
            });

            // 3. Carregar Tabela de Preços configurada
            try {
                const localQuotas = localStorage.getItem('bcv_tabela_quotas');
                if (localQuotas) {
                    const parsed = JSON.parse(localQuotas);
                    if (parsed && typeof parsed === 'object') tabelaPrecosQuotas = parsed;
                }
            } catch (_) {}

            try {
                const { data: cfgRow } = await supabase
                    .from('clube_config')
                    .select('dados')
                    .eq('chave', 'tabela_quotas')
                    .maybeSingle();
                if (cfgRow && cfgRow.dados) {
                    tabelaPrecosQuotas = typeof cfgRow.dados === 'string' ? JSON.parse(cfgRow.dados) : cfgRow.dados;
                    try { localStorage.setItem('bcv_tabela_quotas', JSON.stringify(tabelaPrecosQuotas)); } catch (_) {}
                }
            } catch (e) { console.warn("Tabela de quotas:", e); }

            // 4. Carregar Itens de Cobrança ativos da época 2026/2027
            try {
                const { data: itens } = await supabase
                    .from('itens_cobranca')
                    .select('*')
                    .eq('epoca', '2026/2027')
                    .eq('ativo', true)
                    .order('created_at', { ascending: true });
                currentItensCobranca = itens || [];
            } catch (e) { console.warn("Itens de cobrança:", e); }

            // 5. Carregar Entregas de Tesouraria do escalão ativo (época 2026/2027)
            try {
                const { data: entregas, error: eError } = await supabase
                    .from('entregas_tesouraria')
                    .select('*')
                    .eq('epoca', '2026/2027')
                    .eq('escalao', activeEscalao)
                    .order('data_entrega', { ascending: false })
                    .order('id', { ascending: false });
                
                if (!eError) {
                    currentEntregasTesouraria = entregas || [];
                } else if (eError.code !== '42P01' && eError.code !== 'PGRST205') {
                    console.warn("Aviso ao carregar entregas tesouraria:", eError);
                } else {
                    currentEntregasTesouraria = [];
                }
            } catch (e) {
                console.warn("entregas_tesouraria:", e);
                currentEntregasTesouraria = [];
            }

            updatePrecosTab();

            // Renderizar interface
            renderAtletas();
            renderTesouraria();
            updateKpis();

        } catch (err) {
            console.error("Erro ao carregar dados do portal:", err);
            listaAtletasContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Erro ao carregar dados: ${err.message}</div>`;
        }
    }

    function renderEmptyState(msg) {
        listaAtletasContainer.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 36px 20px; text-align: center; border: 1px dashed var(--border); margin: 20px 0;">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">🏀</span>
                <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-main); font-weight: 700;">Sem Atletas Encontrados</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 6px auto 0; max-width: 300px; line-height: 1.5;">${escapeHtml(msg)}</p>
            </div>
        `;
    }

    // =======================================================
    // 3.1 ATUALIZAR TABELA DE PREÇOS OFICIAIS (TAB 3)
    // =======================================================
    function updatePrecosTab(targetEscalao) {
        const subLabel = document.getElementById('tabela-precos-escalao-sub');
        const quotasContainer = document.getElementById('tabela-precos-quotas-list');
        const produtosContainer = document.getElementById('tabela-precos-produtos-list');
        const selectEscalao = document.getElementById('select-precos-escalao');

        const currentTarget = targetEscalao || (selectEscalao ? selectEscalao.value : null) || activeEscalao || 'Sub 14 Masculino';

        // Preencher o seletor de escalões se estiver vazio
        if (selectEscalao) {
            if (selectEscalao.options.length === 0) {
                const listToUse = [
                    'BabyBasket', 'Mini 8', 'Mini 10', 'Mini 12',
                    'Sub 14 Masculino', 'Sub 14 Feminino',
                    'Sub 16 Masculino', 'Sub 16 Feminino',
                    'Sub 18 Masculino', 'Sub 18 Feminino'
                ];
                selectEscalao.innerHTML = listToUse.map(e => `
                    <option value="${e}" ${matchesEscalao(e, currentTarget) ? 'selected' : ''}>${e}</option>
                `).join('');

                selectEscalao.addEventListener('change', () => {
                    updatePrecosTab(selectEscalao.value);
                });
            } else if (targetEscalao) {
                selectEscalao.value = targetEscalao;
            }
        }

        if (subLabel) {
            subLabel.textContent = `Escalão Selecionado: ${currentTarget} • Época 2026/2027`;
        }

        const precos = getPrecosAtleta({ escalao: currentTarget });

        // 1. Quotas Oficiais do Escalão
        if (quotasContainer) {
            quotasContainer.innerHTML = `
                <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 0.9rem; color: var(--text-main);">📅 Mensalidade Regular</strong>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">Setembro a Junho (10 mensalidades)</div>
                    </div>
                    <span style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">${Number(precos.mensal || 0).toFixed(2)} €</span>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 0.9rem; color: #166534;">🌓 Quota Bianual (2 Prestações)</strong>
                        <div style="font-size: 0.78rem; color: #15803d;">Pagamento semestral (Setembro e Fevereiro)</div>
                    </div>
                    <span style="font-size: 1.15rem; font-weight: 800; color: #16a34a;">${Number(precos.bianual || 0).toFixed(2)} €</span>
                </div>

                <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 0.9rem; color: #581c87;">⭐ Quota Anual Completa</strong>
                        <div style="font-size: 0.78rem; color: #7e22ce;">Pagamento único integral de toda a época</div>
                    </div>
                    <span style="font-size: 1.15rem; font-weight: 800; color: #6b21a8;">${Number(precos.anual || 0).toFixed(2)} €</span>
                </div>
            `;
        }

        // 2. Produtos do escalão configurados pelo Admin
        if (produtosContainer) {
            const prods = (currentItensCobranca || []).filter(item => {
                if (item.ativo === false) return false;
                return matchesEscalao(item.escalao, currentTarget) || !item.escalao;
            });

            if (prods.length === 0) {
                produtosContainer.innerHTML = `
                    <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 0.82rem; background: #f8fafc; border-radius: 8px; border: 1px dashed var(--border);">
                        Sem outros produtos ou encargos configurados para este escalão.
                    </div>
                `;
            } else {
                let htmlProds = '';
                prods.forEach(prod => {
                    const cat = prod.categoria || 'Geral';
                    let catIcon = '📦';
                    let catColor = '#0284c7';
                    let catBg = '#f0f9ff';
                    let catBorder = '#bae6fd';

                    if (cat.toLowerCase().includes('exame') || cat.toLowerCase().includes('médico') || cat.toLowerCase().includes('emd')) {
                        catIcon = '🩺';
                        catColor = '#047857';
                        catBg = '#ecfdf5';
                        catBorder = '#a7f3d0';
                    } else if (cat.toLowerCase().includes('equipamento')) {
                        catIcon = '🎽';
                        catColor = '#7c2d12';
                        catBg = '#fff7ed';
                        catBorder = '#fed7aa';
                    } else if (cat.toLowerCase().includes('inscrição') || cat.toLowerCase().includes('seguro')) {
                        catIcon = '📄';
                        catColor = '#4338ca';
                        catBg = '#eef2ff';
                        catBorder = '#c7d2fe';
                    }

                    const obrigatorioBadge = prod.obrigatorio 
                        ? `<span style="background: #fee2e2; color: #dc2626; font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Obrigatório</span>` 
                        : '';

                    htmlProds += `
                        <div style="background: ${catBg}; border: 1px solid ${catBorder}; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; padding-right: 12px;">
                                <div style="display: flex; align-items: center; flex-wrap: wrap;">
                                    <strong style="font-size: 0.9rem; color: var(--text-main);">${catIcon} ${escapeHtml(prod.titulo || prod.nome || 'Produto')}</strong>
                                    ${obrigatorioBadge}
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                                    ${escapeHtml(prod.descricao || prod.categoria || 'Artigo Oficial')}
                                    ${prod.escalao && prod.escalao.toLowerCase() !== 'todos' ? `• <em>${escapeHtml(prod.escalao)}</em>` : ''}
                                </div>
                            </div>
                            <span style="font-size: 1.15rem; font-weight: 800; color: ${catColor}; white-space: nowrap;">
                                ${Number(prod.valor || 0).toFixed(2)} €
                            </span>
                        </div>
                    `;
                });
                produtosContainer.innerHTML = htmlProds;
            }
        }
    }

    // =======================================================
    // 4. ATUALIZAR KPIS E ESTATÍSTICAS
    // =======================================================
    function updateKpis() {
        if (!kpiTotalArrecadado) return;

        let total = 0;
        let countMovs = currentPagamentos.length;
        currentPagamentos.forEach(p => {
            total += Number(p.valor || 0);
        });

        kpiTotalArrecadado.textContent = `${total.toFixed(2)} €`;
        kpiTotalMovimentos.textContent = `${countMovs} recebimento${countMovs === 1 ? '' : 's'} registado${countMovs === 1 ? '' : 's'}`;
        kpiTotalAtletas.textContent = currentAtletas.length;

        // Análise do Mês Atual ou Selecionado
        const curYm = new Date().toISOString().slice(0, 7);
        const mesSel = filtroMesCobranca?.value || (curYm >= '2026-09' && curYm <= '2027-06' ? curYm : '2026-09');
        let pagosMes = 0;
        let pendentesMes = 0;

        currentAtletas.forEach(a => {
            const atletaPags = pagamentosAtletaMap[a.id] || [];
            const hasAnual = atletaPags.some(p => p.mes === 'ANUAL' && p.estado === 'Pago');
            const hasMes = atletaPags.some(p => p.mes === mesSel && p.estado === 'Pago');

            if (hasAnual || hasMes) {
                pagosMes++;
            } else {
                pendentesMes++;
            }
        });

        if (kpiMesPagos) kpiMesPagos.textContent = pagosMes;
        if (kpiMesPendentes) kpiMesPendentes.textContent = pendentesMes;

        // Subtítulos informativos
        const nomeMesMap = {
            '2026-09': 'Setembro', '2026-10': 'Outubro', '2026-11': 'Novembro', '2026-12': 'Dezembro',
            '2027-01': 'Janeiro', '2027-02': 'Fevereiro', '2027-03': 'Março', '2027-04': 'Abril',
            '2027-05': 'Maio', '2027-06': 'Junho', 'ANUAL': 'Quota Anual'
        };
        const lblMes = nomeMesMap[mesSel] || mesSel;
        if (kpiMesPagosLbl) kpiMesPagosLbl.textContent = `${lblMes} liquidado`;
        if (kpiMesPendentesLbl) kpiMesPendentesLbl.textContent = `${lblMes} pendente`;
    }

    // =======================================================
    // 5. RENDERIZAÇÃO DA LISTA DE ATLETAS (TAB 1)
    // =======================================================
    function renderAtletas() {
        if (!listaAtletasContainer) return;

        const termo = (filtroPesquisaAtleta?.value || '').toLowerCase().trim();
        const mesSel = filtroMesCobranca?.value || '2026-09';
        const estadoSel = filtroEstadoPagamento?.value || 'todos';

        const filtrados = currentAtletas.filter(a => {
            // Filtro por texto (Nome ou Alcunha)
            const matchNome = (a.nome || '').toLowerCase().includes(termo);
            const matchNick = (a.nickname || '').toLowerCase().includes(termo);
            if (termo && !matchNome && !matchNick) return false;

            // Filtro por Estado no Mês Selecionado
            const atletaPags = pagamentosAtletaMap[a.id] || [];
            const hasAnual = atletaPags.some(p => p.mes === 'ANUAL' && p.estado === 'Pago');
            const hasMes = atletaPags.some(p => p.mes === mesSel && p.estado === 'Pago');
            const isPago = hasAnual || hasMes;

            if (estadoSel === 'pago' && !isPago) return false;
            if (estadoSel === 'pendente' && isPago) return false;

            return true;
        });

        if (filtrados.length === 0) {
            listaAtletasContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <p style="color: var(--text-muted); font-size: 0.88rem;">Nenhum atleta corresponde aos filtros selecionados.</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtrados.forEach(a => {
            const atletaPags = pagamentosAtletaMap[a.id] || [];
            const avatarHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${escapeHtml(a.nome)}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-card">
                    <div class="atleta-top-row">
                        ${avatarHtml}
                        <div class="atleta-info">
                            <div class="atleta-nome">${escapeHtml(a.nome)}</div>
                        </div>
                    </div>
                    <div class="atleta-actions-row">
                        <button type="button" class="btn-action-primary" onclick="window.openModalPagamento(${a.id})">
                            <span>💶</span>
                            <span>Registar Pagamento</span>
                        </button>
                        <button type="button" class="btn-action-secondary" onclick="window.openModalExtrato(${a.id})">
                            <span>📄</span>
                            <span>Extrato</span>
                        </button>
                    </div>
                </div>
            `;
        });

        listaAtletasContainer.innerHTML = html;
    }

    if (filtroPesquisaAtleta) filtroPesquisaAtleta.addEventListener('input', renderAtletas);
    if (filtroMesCobranca) {
        filtroMesCobranca.addEventListener('change', () => {
            renderAtletas();
            updateKpis();
        });
    }
    if (filtroEstadoPagamento) filtroEstadoPagamento.addEventListener('change', renderAtletas);

    // =======================================================
    // 6. MODAL REGISTAR PAGAMENTO MULTI-ITEM / COBRANÇA
    // =======================================================
    const MESES_EPOCA = [
        { key: '2026-09', label: 'Setembro 2026', sem: '1' },
        { key: '2026-10', label: 'Outubro 2026', sem: '1' },
        { key: '2026-11', label: 'Novembro 2026', sem: '1' },
        { key: '2026-12', label: 'Dezembro 2026', sem: '1' },
        { key: '2027-01', label: 'Janeiro 2027', sem: '1' },
        { key: '2027-02', label: 'Fevereiro 2027', sem: '2' },
        { key: '2027-03', label: 'Março 2027', sem: '2' },
        { key: '2027-04', label: 'Abril 2027', sem: '2' },
        { key: '2027-05', label: 'Maio 2027', sem: '2' },
        { key: '2027-06', label: 'Junho 2027', sem: '2' }
    ];

    function getPrecosAtleta(atleta) {
        const esc = atleta?.escalao || activeEscalao || '';
        let match = null;

        if (Array.isArray(tabelaPrecosQuotas)) {
            match = tabelaPrecosQuotas.find(p => matchesEscalao(p.escalao, esc));
        } else if (typeof tabelaPrecosQuotas === 'object' && tabelaPrecosQuotas !== null) {
            if (tabelaPrecosQuotas[esc]) {
                match = tabelaPrecosQuotas[esc];
            } else {
                const foundKey = Object.keys(tabelaPrecosQuotas).find(k => matchesEscalao(k, esc));
                if (foundKey) match = tabelaPrecosQuotas[foundKey];
            }
        }

        const isBaby = normalizeEscalao(esc).includes('baby');
        const defMensal = isBaby ? 0.00 : 25.00;
        const defBianual = isBaby ? 0.00 : 120.00;
        const defAnual = isBaby ? 0.00 : 230.00;

        return {
            mensal: (match?.mensal !== undefined && match?.mensal !== null && match?.mensal !== '') ? Number(match.mensal) : defMensal,
            bianual: (match?.bianual !== undefined && match?.bianual !== null && match?.bianual !== '') ? Number(match.bianual) : defBianual,
            anual: (match?.anual !== undefined && match?.anual !== null && match?.anual !== '') ? Number(match.anual) : defAnual
        };
    }

    window.openModalPagamento = function(atletaId) {
        const atleta = currentAtletas.find(a => a.id === atletaId);
        if (!atleta) return;

        currentAtletaModal = atleta;
        pagamentoAtletaIdInput.value = atletaId;
        modalPagamentoAtletaNome.textContent = atleta.nome || 'Atleta';
        modalPagamentoAtletaSub.textContent = `${atleta.escalao || activeEscalao} ${atleta.nr_camisola ? '• Nº ' + atleta.nr_camisola : ''}`;

        pagamentoDataInput.value = hojeIso;
        pagamentoMetodoSelect.value = 'Dinheiro';
        pagamentoNotasInput.value = '';

        selectedCobrancaItems.clear();

        renderModalCobrancaItens();
        updateCheckoutBar();

        modalPagamentoSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalPagamento = function() {
        modalPagamentoSheet.classList.remove('active');
        document.body.style.overflow = '';
        currentAtletaModal = null;
        selectedCobrancaItems.clear();
    };

    function renderModalCobrancaItens() {
        if (!currentAtletaModal) return;
        const atleta = currentAtletaModal;
        const precos = getPrecosAtleta(atleta);
        const atletaPags = pagamentosAtletaMap[atleta.id] || [];

        const hasAnual = atletaPags.some(p => (p.mes === 'ANUAL' || p.categoria === 'Quota Anual') && p.estado === 'Pago');
        const hasBianual1 = atletaPags.some(p => p.mes === 'BIANUAL_1' && p.estado === 'Pago');
        const hasBianual2 = atletaPags.some(p => p.mes === 'BIANUAL_2' && p.estado === 'Pago');

        // Itens liquidados para o histórico recolhível
        const itensLiquidados = [];

        // 1. SECÇÃO QUOTAS & MENSALIDADES PENDENTES (Suporte a Mensal, Bianual e Anual)
        let htmlQuotas = '';

        if (hasAnual) {
            htmlQuotas = `
                <div class="cobranca-item-row paid" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
                    <div class="cobranca-item-left">
                        <span class="cobranca-item-check-icon" style="background: #16a34a; color: white;">✓</span>
                        <div>
                            <div class="cobranca-item-name" style="color: #166534; font-weight: 700;">⭐ Quota Anual Integral Liquidada</div>
                            <div class="cobranca-item-desc" style="color: #15803d;">Todas as mensalidades da época 2026/2027 estão 100% regularizadas.</div>
                        </div>
                    </div>
                    <div class="cobranca-item-right">
                        <span class="cobranca-item-badge-pago">Liquidado</span>
                    </div>
                </div>
            `;
            itensLiquidados.push({
                nome: '⭐ Quota Anual Completa (2026/2027)',
                categoria: 'Quota Anual',
                valor: precos.anual
            });
        } else {
            // Verificar quais meses estão por pagar
            const mesesPendentes = [];
            MESES_EPOCA.forEach(m => {
                const mesPago = atletaPags.some(p => p.mes === m.key && p.estado === 'Pago');
                const cobertoPorBianual = (hasBianual1 && m.sem === '1') || (hasBianual2 && m.sem === '2');
                
                if (mesPago || cobertoPorBianual) {
                    itensLiquidados.push({
                        nome: `Mensalidade ${m.label}`,
                        categoria: 'Mensalidade',
                        valor: precos.mensal
                    });
                } else {
                    mesesPendentes.push(m);
                }
            });

            if (hasBianual1) {
                itensLiquidados.push({
                    nome: '🌓 1ª Prestação Bianual (Set-Jan)',
                    categoria: 'Quota Bianual',
                    valor: precos.bianual
                });
            }
            if (hasBianual2) {
                itensLiquidados.push({
                    nome: '🌓 2ª Prestação Bianual (Fev-Jun)',
                    categoria: 'Quota Bianual',
                    valor: precos.bianual
                });
            }

            const pendentesS1 = mesesPendentes.filter(m => m.sem === '1');
            const pendentesS2 = mesesPendentes.filter(m => m.sem === '2');

            if (mesesPendentes.length === 0) {
                htmlQuotas = `
                    <div class="cobranca-item-row paid" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
                        <div class="cobranca-item-left">
                            <span class="cobranca-item-check-icon" style="background: #16a34a; color: white;">✓</span>
                            <div>
                                <div class="cobranca-item-name" style="color: #166534; font-weight: 700;">✓ Mensalidades em Dia</div>
                                <div class="cobranca-item-desc" style="color: #15803d;">Todas as mensalidades da época estão liquidadas.</div>
                            </div>
                        </div>
                        <div class="cobranca-item-right">
                            <span class="cobranca-item-badge-pago">Em dia</span>
                        </div>
                    </div>
                `;
            } else {
                // OPÇÃO A: QUOTA ANUAL COMPLETA
                const isAnualSelected = selectedCobrancaItems.has('quota_ANUAL');
                htmlQuotas += `
                    <div style="font-size: 0.72rem; font-weight: 700; color: #6b21a8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.3px;">
                        Opção A: Quota Anual Integral (10 meses)
                    </div>
                    <div class="cobranca-item-row selectable quota-anual-row ${isAnualSelected ? 'selected' : ''}" 
                         data-key="quota_ANUAL" 
                         data-tipo="quota_anual" 
                         data-mes="ANUAL" 
                         data-cat="Quota Anual" 
                         data-desc="Quota Anual Completa (2026/2027)" 
                         data-valor="${precos.anual}"
                         style="background: #faf5ff; border: 1.5px solid #d8b4fe;">
                        <div class="cobranca-item-left">
                            <input type="checkbox" class="cobranca-item-checkbox" ${isAnualSelected ? 'checked' : ''}>
                            <div>
                                <div class="cobranca-item-name" style="color: #581c87; font-weight: 700;">⭐ Quota Anual Completa</div>
                                <div class="cobranca-item-desc" style="color: #7e22ce;">Liquidar a época inteira num único pagamento</div>
                            </div>
                        </div>
                        <div class="cobranca-item-right">
                            <span class="cobranca-item-price" style="color: #6b21a8; font-weight: 800;">${precos.anual.toFixed(2)} €</span>
                        </div>
                    </div>
                `;

                // OPÇÃO B: QUOTA BIANUAL (2 Prestações Semestrais)
                const showB1 = !hasBianual1 && pendentesS1.length > 0;
                const showB2 = !hasBianual2 && pendentesS2.length > 0;

                if (showB1 || showB2) {
                    htmlQuotas += `
                        <div style="font-size: 0.72rem; font-weight: 700; color: #166534; text-transform: uppercase; margin: 12px 0 4px 0; letter-spacing: 0.3px;">
                            Opção B: Quota Bianual (Prestações Semestrais)
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                    `;

                    if (showB1) {
                        const isB1Sel = selectedCobrancaItems.has('quota_BIANUAL_1');
                        htmlQuotas += `
                            <div class="cobranca-item-row selectable ${isB1Sel ? 'selected' : ''}"
                                 data-key="quota_BIANUAL_1"
                                 data-tipo="quota_bianual"
                                 data-semestre="1"
                                 data-mes="BIANUAL_1"
                                 data-cat="Quota Bianual"
                                 data-desc="1ª Prestação Bianual (Setembro a Janeiro)"
                                 data-valor="${precos.bianual}"
                                 style="background: #f0fdf4; border: 1.5px solid #86efac;">
                                <div class="cobranca-item-left">
                                    <input type="checkbox" class="cobranca-item-checkbox" ${isB1Sel ? 'checked' : ''}>
                                    <div>
                                        <div class="cobranca-item-name" style="color: #166534; font-weight: 700;">🌓 1ª Prestação Bianual (5 meses)</div>
                                        <div class="cobranca-item-desc" style="color: #15803d;">Cobre Setembro 2026 a Janeiro 2027</div>
                                    </div>
                                </div>
                                <div class="cobranca-item-right">
                                    <span class="cobranca-item-price" style="color: #16a34a; font-weight: 800;">${precos.bianual.toFixed(2)} €</span>
                                </div>
                            </div>
                        `;
                    }

                    if (showB2) {
                        const isB2Sel = selectedCobrancaItems.has('quota_BIANUAL_2');
                        htmlQuotas += `
                            <div class="cobranca-item-row selectable ${isB2Sel ? 'selected' : ''}"
                                 data-key="quota_BIANUAL_2"
                                 data-tipo="quota_bianual"
                                 data-semestre="2"
                                 data-mes="BIANUAL_2"
                                 data-cat="Quota Bianual"
                                 data-desc="2ª Prestação Bianual (Fevereiro a Junho)"
                                 data-valor="${precos.bianual}"
                                 style="background: #f0fdf4; border: 1.5px solid #86efac;">
                                <div class="cobranca-item-left">
                                    <input type="checkbox" class="cobranca-item-checkbox" ${isB2Sel ? 'checked' : ''}>
                                    <div>
                                        <div class="cobranca-item-name" style="color: #166534; font-weight: 700;">🌓 2ª Prestação Bianual (5 meses)</div>
                                        <div class="cobranca-item-desc" style="color: #15803d;">Cobre Fevereiro 2027 a Junho 2027</div>
                                    </div>
                                </div>
                                <div class="cobranca-item-right">
                                    <span class="cobranca-item-price" style="color: #16a34a; font-weight: 800;">${precos.bianual.toFixed(2)} €</span>
                                </div>
                            </div>
                        `;
                    }

                    htmlQuotas += `</div>`;
                }

                // OPÇÃO C: MENSALIDADES INDIVIDUAIS (Mês a Mês)
                htmlQuotas += `
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 12px 0 4px 0; letter-spacing: 0.3px;">
                        Opção C: Mensalidades Individuais (Mês a Mês)
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                `;

                mesesPendentes.forEach(m => {
                    const itemKey = `quota_${m.key}`;
                    const isSelected = selectedCobrancaItems.has(itemKey);
                    htmlQuotas += `
                        <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                             data-key="${itemKey}" 
                             data-tipo="quota_mes" 
                             data-semestre="${m.sem}"
                             data-mes="${m.key}" 
                             data-cat="Mensalidade" 
                             data-desc="Mensalidade ${m.label}" 
                             data-valor="${precos.mensal}">
                            <div class="cobranca-item-left">
                                <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''}>
                                <div>
                                    <div class="cobranca-item-name">${m.label}</div>
                                    <div class="cobranca-item-desc">Mensalidade Regular</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-price">${precos.mensal.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                });

                htmlQuotas += `</div>`;
            }
        }

        if (cobrancaQuotasContainer) cobrancaQuotasContainer.innerHTML = htmlQuotas;

        // 2. SECÇÃO PRODUTOS & ENCARGOS PENDENTES
        let htmlProdutos = '';
        const escAtleta = atleta.escalao || activeEscalao || '';

        const prodsEscalao = (currentItensCobranca || []).filter(item => {
            if (item.ativo === false) return false;
            return matchesEscalao(item.escalao, escAtleta) || !item.escalao;
        });

        // Filtrar quais produtos já estão pagos vs pendentes
        const prodsPendentes = [];
        prodsEscalao.forEach(prod => {
            const isPago = atletaPags.some(p => p.item_cobranca_id === prod.id && p.estado === 'Pago');
            const valorProd = Number(prod.valor || 0);
            const itemNome = prod.titulo || prod.nome || 'Produto';

            if (isPago) {
                itensLiquidados.push({
                    nome: itemNome,
                    categoria: prod.categoria || 'Produto',
                    valor: valorProd
                });
            } else {
                prodsPendentes.push(prod);
            }
        });

        if (prodsPendentes.length === 0) {
            htmlProdutos = `
                <div style="text-align: center; padding: 14px 10px; color: #15803d; font-size: 0.82rem; background: #f0fdf4; border-radius: 8px; border: 1px dashed #bbf7d0;">
                    ✓ Não existem outros produtos ou encargos pendentes para este atleta.
                </div>
            `;
        } else {
            prodsPendentes.forEach(prod => {
                const itemKey = `prod_${prod.id}`;
                const isSelected = selectedCobrancaItems.has(itemKey);
                const valorProd = Number(prod.valor || 0);
                const itemNome = prod.titulo || prod.nome || 'Produto';

                htmlProdutos += `
                    <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                         data-key="${itemKey}" 
                         data-tipo="produto" 
                         data-prod-id="${prod.id}" 
                         data-cat="${escapeHtml(prod.categoria || 'Produto')}" 
                         data-desc="${escapeHtml(itemNome)}" 
                         data-valor="${valorProd}">
                        <div class="cobranca-item-left">
                            <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''}>
                            <div>
                                <div class="cobranca-item-name">${escapeHtml(itemNome)}</div>
                                <div class="cobranca-item-desc">${escapeHtml(prod.descricao || prod.categoria || 'Artigo Oficial')}</div>
                            </div>
                        </div>
                        <div class="cobranca-item-right">
                            <span class="cobranca-item-price">${valorProd.toFixed(2)} €</span>
                        </div>
                    </div>
                `;
            });
        }

        if (cobrancaProdutosContainer) cobrancaProdutosContainer.innerHTML = htmlProdutos;

        // 3. SECÇÃO C: ITENS JÁ LIQUIDADOS (Recolhível)
        if (cobrancaLiquidadosWrapper && cobrancaLiquidadosContainer) {
            if (itensLiquidados.length > 0) {
                cobrancaLiquidadosWrapper.style.display = 'block';
                if (contagemLiquidados) contagemLiquidados.textContent = itensLiquidados.length;

                let htmlLiquidados = '';
                itensLiquidados.forEach(it => {
                    htmlLiquidados += `
                        <div class="cobranca-item-row paid" style="padding: 8px 10px; opacity: 0.85;">
                            <div class="cobranca-item-left">
                                <span class="cobranca-item-check-icon" style="font-size: 0.75rem;">✓</span>
                                <div>
                                    <div class="cobranca-item-name" style="font-size: 0.82rem;">${escapeHtml(it.nome)}</div>
                                    <div class="cobranca-item-desc" style="font-size: 0.72rem;">${escapeHtml(it.categoria)} • Liquidado</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-badge-pago" style="font-size: 0.68rem; padding: 2px 6px;">Pago</span>
                                <span class="cobranca-item-price" style="font-size: 0.82rem;">${it.valor.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                });
                cobrancaLiquidadosContainer.innerHTML = htmlLiquidados;
            } else {
                cobrancaLiquidadosWrapper.style.display = 'none';
                cobrancaLiquidadosContainer.innerHTML = '';
            }
        }

        // Associar eventos de clique às linhas interativas
        bindCobrancaRowListeners();
    }

    function bindCobrancaRowListeners() {
        const rows = document.querySelectorAll('.cobranca-item-row.selectable');
        rows.forEach(row => {
            row.onclick = () => {
                const key = row.getAttribute('data-key');
                const tipo = row.getAttribute('data-tipo');
                const mes = row.getAttribute('data-mes') || 'PRODUTO';
                const cat = row.getAttribute('data-cat') || 'Produto';
                const desc = row.getAttribute('data-desc') || 'Item';
                const valor = parseFloat(row.getAttribute('data-valor')) || 0;
                const prodId = row.getAttribute('data-prod-id') ? Number(row.getAttribute('data-prod-id')) : null;
                const checkbox = row.querySelector('.cobranca-item-checkbox');

                if (selectedCobrancaItems.has(key)) {
                    // Desmarcar este item
                    selectedCobrancaItems.delete(key);
                    row.classList.remove('selected');
                    if (checkbox) checkbox.checked = false;
                } else {
                    // 1. Se marcou 'quota_anual', desmarcar todas as outras quotas (bianual e meses)
                    if (tipo === 'quota_anual') {
                        for (const [k, v] of selectedCobrancaItems.entries()) {
                            if (v.tipo === 'quota_mes' || v.tipo === 'quota_bianual') {
                                selectedCobrancaItems.delete(k);
                                const otherRow = document.querySelector(`.cobranca-item-row[data-key="${k}"]`);
                                if (otherRow) {
                                    otherRow.classList.remove('selected');
                                    const otherCb = otherRow.querySelector('.cobranca-item-checkbox');
                                    if (otherCb) otherCb.checked = false;
                                }
                            }
                        }
                    }

                    // 2. Se marcou 'quota_bianual', desmarcar quota_anual e meses do mesmo semestre
                    if (tipo === 'quota_bianual') {
                        const sem = row.getAttribute('data-semestre');
                        if (selectedCobrancaItems.has('quota_ANUAL')) {
                            selectedCobrancaItems.delete('quota_ANUAL');
                            const anualRow = document.querySelector('.cobranca-item-row[data-key="quota_ANUAL"]');
                            if (anualRow) {
                                anualRow.classList.remove('selected');
                                const anualCb = anualRow.querySelector('.cobranca-item-checkbox');
                                if (anualCb) anualCb.checked = false;
                            }
                        }
                        for (const [k, v] of selectedCobrancaItems.entries()) {
                            if (v.tipo === 'quota_mes') {
                                const mesRow = document.querySelector(`.cobranca-item-row[data-key="${k}"]`);
                                if (mesRow && mesRow.getAttribute('data-semestre') === sem) {
                                    selectedCobrancaItems.delete(k);
                                    mesRow.classList.remove('selected');
                                    const mesCb = mesRow.querySelector('.cobranca-item-checkbox');
                                    if (mesCb) mesCb.checked = false;
                                }
                            }
                        }
                    }

                    // 3. Se marcou 'quota_mes', desmarcar quota_anual e a quota_bianual do mesmo semestre
                    if (tipo === 'quota_mes') {
                        const sem = row.getAttribute('data-semestre');
                        if (selectedCobrancaItems.has('quota_ANUAL')) {
                            selectedCobrancaItems.delete('quota_ANUAL');
                            const anualRow = document.querySelector('.cobranca-item-row[data-key="quota_ANUAL"]');
                            if (anualRow) {
                                anualRow.classList.remove('selected');
                                const anualCb = anualRow.querySelector('.cobranca-item-checkbox');
                                if (anualCb) anualCb.checked = false;
                            }
                        }
                        const bianualKey = `quota_BIANUAL_${sem}`;
                        if (selectedCobrancaItems.has(bianualKey)) {
                            selectedCobrancaItems.delete(bianualKey);
                            const bRow = document.querySelector(`.cobranca-item-row[data-key="${bianualKey}"]`);
                            if (bRow) {
                                bRow.classList.remove('selected');
                                const bCb = bRow.querySelector('.cobranca-item-checkbox');
                                if (bCb) bCb.checked = false;
                            }
                        }
                    }

                    // 4. Se for produto (Seguro, EMD, etc.), NUNCA mexe nas quotas! Ambas coexistem!
                    selectedCobrancaItems.set(key, {
                        key: key,
                        tipo: tipo,
                        mes: mes,
                        categoria: cat,
                        descricao: desc,
                        valor: valor,
                        item_cobranca_id: prodId
                    });
                    row.classList.add('selected');
                    if (checkbox) checkbox.checked = true;
                }

                updateCheckoutBar();
            };
        });
    }

    function updateCheckoutBar() {
        let total = 0;
        let count = 0;

        for (const item of selectedCobrancaItems.values()) {
            total += Number(item.valor || 0);
            count++;
        }

        if (checkoutTotalDisplay) checkoutTotalDisplay.textContent = `${total.toFixed(2)} €`;

        if (checkoutItensContagem) {
            checkoutItensContagem.textContent = count === 0 ? '0 itens selecionados' : (count === 1 ? '1 item selecionado' : `${count} itens selecionados`);
        }

        if (btnConfirmarPagamento && btnConfirmarPagamentoTxt) {
            if (count === 0) {
                btnConfirmarPagamento.disabled = true;
                btnConfirmarPagamentoTxt.textContent = 'Selecione itens para receber';
            } else {
                btnConfirmarPagamento.disabled = false;
                btnConfirmarPagamentoTxt.textContent = `Receber ${total.toFixed(2)} € (${count} ${count === 1 ? 'item' : 'itens'})`;
            }
        }
    }

    // Submissão do Formulário de Pagamento Multi-Item
    if (formRegistarPagamento) {
        formRegistarPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentAtletaModal || selectedCobrancaItems.size === 0) {
                alert("Por favor selecione pelo menos um item para receber.");
                return;
            }

            const atleta = currentAtletaModal;
            const metodo = pagamentoMetodoSelect.value || 'Dinheiro';
            const dataPag = pagamentoDataInput.value || hojeIso;
            const notas = pagamentoNotasInput.value.trim() || null;
            const registadoPor = userProfile?.nome || currentUser?.email || 'Responsável Escalão';

            btnConfirmarPagamento.disabled = true;
            if (btnConfirmarPagamentoTxt) btnConfirmarPagamentoTxt.textContent = 'A registar pagamentos...';

            const batch = Array.from(selectedCobrancaItems.values()).map(item => ({
                atleta_id: atleta.id,
                epoca: '2026/2027',
                categoria: item.categoria,
                descricao: item.descricao,
                mes: item.mes,
                valor: Number(item.valor),
                item_cobranca_id: item.item_cobranca_id || null,
                estado: 'Pago',
                metodo_pagamento: metodo,
                data_pagamento: dataPag,
                notas: notas,
                registado_por: registadoPor
            }));

            try {
                const { error } = await supabase
                    .from('mensalidades')
                    .insert(batch);

                if (error) throw error;

                closeModalPagamento();
                await loadData();

            } catch (err) {
                console.error("Erro ao registar pagamentos:", err);
                alert("Erro ao registar pagamento: " + err.message);
                btnConfirmarPagamento.disabled = false;
                updateCheckoutBar();
            }
        });
    }

    // =======================================================
    // 7. MOVIMENTOS DE TESOURARIA & ENTREGAS DE VALORES (TAB 2)
    // =======================================================
    function renderTesouraria() {
        if (!listaEntregasContainer) return;

        // 1. Somar todo o dinheiro recebido dos atletas deste escalão na época ativa (100% numerário)
        let totalDinheiroCobrado = 0;
        currentPagamentos.forEach(p => {
            totalDinheiroCobrado += Number(p.valor || 0);
        });

        // 2. Somar todas as entregas já registadas à tesouraria para este escalão
        let totalJaEntregue = 0;
        currentEntregasTesouraria.forEach(ent => {
            totalJaEntregue += Number(ent.valor || 0);
        });

        // 3. Saldo em numerário pendente de entrega
        saldoNumerarioEmPosse = Math.max(0, totalDinheiroCobrado - totalJaEntregue);

        // 4. Atualizar KPIs do cabeçalho de tesouraria
        if (tesourariaSaldoEmPosse) {
            tesourariaSaldoEmPosse.textContent = `${saldoNumerarioEmPosse.toFixed(2)} €`;
        }
        if (tesourariaTotalEntregue) {
            tesourariaTotalEntregue.textContent = `${totalJaEntregue.toFixed(2)} €`;
        }
        if (tesourariaTotalCobrado) {
            tesourariaTotalCobrado.textContent = `${totalDinheiroCobrado.toFixed(2)} €`;
        }
        if (tesourariaContagemEntregas) {
            tesourariaContagemEntregas.textContent = currentEntregasTesouraria.length;
        }

        if (tesourariaHeroDesc) {
            if (saldoNumerarioEmPosse > 0) {
                tesourariaHeroDesc.innerHTML = `<span style="color: #fef08a; font-weight: 700;">⚠️ Valores em numerário aguardando entrega ao clube.</span>`;
            } else if (totalDinheiroCobrado > 0) {
                tesourariaHeroDesc.innerHTML = `<span style="color: #bbf7d0; font-weight: 700;">✓ Todas as cobranças em dinheiro já foram entregues à tesouraria!</span>`;
            } else {
                tesourariaHeroDesc.textContent = "Nenhuma cobrança em numerário registada até ao momento.";
            }
        }

        // 5. Renderizar Lista de Movimentos / Histórico de Entregas
        if (currentEntregasTesouraria.length === 0) {
            listaEntregasContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 36px 20px; text-align: center; border: 1px dashed var(--border);">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">🏛️</div>
                    <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: var(--text-main); font-weight: 700;">Nenhuma entrega registada</h4>
                    <p style="color: var(--text-muted); font-size: 0.8rem; max-width: 320px; margin: 0 auto;">
                        Quando entregar valores em dinheiro à tesouraria do clube, clique no botão acima para registar a entrega e gerar o comprovativo oficial.
                    </p>
                </div>
            `;
            return;
        }

        let html = '';
        currentEntregasTesouraria.forEach(ent => {
            const dataFmt = ent.data_entrega || '-';
            const valorFmt = Number(ent.valor || 0).toFixed(2);
            const destinatario = ent.entregue_a || 'Tesouraria BCV';
            const recibo = ent.recibo_codigo || `REC-${ent.id}`;
            const responsavel = ent.responsavel_nome || 'Responsável';

            html += `
                <div class="entrega-item">
                    <div class="entrega-left">
                        <div class="entrega-icon">🤝</div>
                        <div class="entrega-info">
                            <div class="entrega-title">
                                <span>Entregue a: ${escapeHtml(destinatario)}</span>
                                <span class="badge-recibo-tes">✓ Entregue ao Clube</span>
                            </div>
                            <div class="entrega-meta">
                                <span>📅 ${dataFmt}</span> • <span>👤 ${escapeHtml(responsavel)}</span>
                                <div style="margin-top: 2px;">
                                    <span style="font-family: monospace; font-size: 0.72rem; color: #059669; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; border: 1px solid #a7f3d0;">${escapeHtml(recibo)}</span>
                                    ${ent.notas ? ` • <span style="font-style: italic; color: #475569;">"${escapeHtml(ent.notas)}"</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="entrega-right">
                        <div class="entrega-valor">${valorFmt} €</div>
                        <button type="button" class="btn-recibo-view" onclick="window.openModalComprovativo(${ent.id})">
                            <span>📄 Recibo</span>
                        </button>
                    </div>
                </div>
            `;
        });

        listaEntregasContainer.innerHTML = html;
    }

    // Modal de Registo de Entrega
    window.openModalEntrega = function() {
        if (!modalEntregaSheet) return;

        if (modalEntregaSub) {
            modalEntregaSub.textContent = `${activeEscalao} • Saldo em posse: ${saldoNumerarioEmPosse.toFixed(2)} €`;
        }
        if (modalEntregaSaldoDisponivel) {
            modalEntregaSaldoDisponivel.textContent = `${saldoNumerarioEmPosse.toFixed(2)} €`;
        }
        if (entregaValorInput) {
            entregaValorInput.value = saldoNumerarioEmPosse > 0 ? saldoNumerarioEmPosse.toFixed(2) : '';
        }
        if (entregaDataInput) {
            entregaDataInput.value = hojeIso;
        }
        if (entregaDestinatarioInput && !entregaDestinatarioInput.value) {
            entregaDestinatarioInput.value = 'Tesouraria BCV';
        }
        if (entregaNotasInput) {
            entregaNotasInput.value = '';
        }

        modalEntregaSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalEntrega = function() {
        if (modalEntregaSheet) modalEntregaSheet.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (btnAbrirModalEntrega) {
        btnAbrirModalEntrega.addEventListener('click', window.openModalEntrega);
    }

    if (btnPreencherTotalPosse) {
        btnPreencherTotalPosse.addEventListener('click', () => {
            if (entregaValorInput) {
                entregaValorInput.value = saldoNumerarioEmPosse.toFixed(2);
            }
        });
    }

    if (btnRecarregarTesouraria) {
        btnRecarregarTesouraria.addEventListener('click', async () => {
            btnRecarregarTesouraria.disabled = true;
            btnRecarregarTesouraria.textContent = '⏳ A carregar...';
            await loadData();
            btnRecarregarTesouraria.disabled = false;
            btnRecarregarTesouraria.textContent = '🔄 Atualizar';
        });
    }

    // Submissão do Registo de Entrega à Tesouraria
    if (formRegistarEntrega) {
        formRegistarEntrega.addEventListener('submit', async (e) => {
            e.preventDefault();

            const valorNum = parseFloat(entregaValorInput?.value || '0');
            if (isNaN(valorNum) || valorNum <= 0) {
                alert("Por favor indique um valor válido a entregar.");
                return;
            }

            if (valorNum > saldoNumerarioEmPosse && saldoNumerarioEmPosse > 0) {
                const conf = confirm(`Atenção: O valor de ${valorNum.toFixed(2)} € é superior ao saldo registado em posse (${saldoNumerarioEmPosse.toFixed(2)} €).\nDeseja continuar mesmo assim?`);
                if (!conf) return;
            }

            const dataEntrega = entregaDataInput?.value || hojeIso;
            const destinatario = (entregaDestinatarioInput?.value || 'Tesouraria BCV').trim();
            const metodo = entregaMetodoSelect?.value || 'Dinheiro';
            const notas = (entregaNotasInput?.value || '').trim();

            // Gerar código único de auditoria do recibo
            const siglaEscalao = (activeEscalao || 'BCV').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const codigoRecibo = `REC-TES-${siglaEscalao}-${Date.now().toString().slice(-4)}${randomSuffix}`;

            const responsavelNome = (userProfile && userProfile.nome) || (currentUser && currentUser.email) || 'Responsável de Escalão';
            const responsavelEmail = (currentUser && currentUser.email) || '';
            const responsavelId = currentUser ? currentUser.id : null;

            if (btnSubmeterEntrega) btnSubmeterEntrega.disabled = true;
            if (btnSubmeterEntregaTxt) btnSubmeterEntregaTxt.textContent = 'A registar entrega...';

            try {
                const payload = {
                    responsavel_id: responsavelId,
                    responsavel_nome: responsavelNome,
                    responsavel_email: responsavelEmail,
                    escalao: activeEscalao,
                    epoca: '2026/2027',
                    valor: valorNum,
                    data_entrega: dataEntrega,
                    entregue_a: destinatario,
                    metodo: metodo,
                    recibo_codigo: codigoRecibo,
                    notas: notas
                };

                const { data: inserted, error: iErr } = await supabase
                    .from('entregas_tesouraria')
                    .insert([payload])
                    .select();

                if (iErr) {
                    if (iErr.code === '42P01' || iErr.code === 'PGRST205') {
                        throw new Error("A tabela 'entregas_tesouraria' ainda não foi criada no Supabase. Por favor execute o script setup_movimentos_tesouraria.sql.");
                    }
                    throw iErr;
                }

                closeModalEntrega();
                await loadData();

                // Abrir o comprovativo oficial do registo efetuado
                const novaEntregaId = (inserted && inserted[0] && inserted[0].id) ? inserted[0].id : null;
                if (novaEntregaId) {
                    window.openModalComprovativo(novaEntregaId);
                } else {
                    alert(`✓ Entrega de ${valorNum.toFixed(2)} € registada com sucesso à tesouraria!\nCódigo: ${codigoRecibo}`);
                }

            } catch (err) {
                console.error("Erro ao registar entrega:", err);
                alert("Erro ao registar entrega à tesouraria: " + err.message);
            } finally {
                if (btnSubmeterEntrega) btnSubmeterEntrega.disabled = false;
                if (btnSubmeterEntregaTxt) btnSubmeterEntregaTxt.textContent = 'Confirmar Entrega à Tesouraria';
            }
        });
    }

    // Modal de Comprovativo / Recibo Oficial de Entrega
    window.openModalComprovativo = function(entregaId) {
        if (!modalComprovativoSheet || !modalComprovativoContent) return;

        const entrega = currentEntregasTesouraria.find(e => e.id === entregaId);
        if (!entrega) {
            alert("Registo de entrega não encontrado.");
            return;
        }

        const dataFmt = entrega.data_entrega || '-';
        const valorFmt = Number(entrega.valor || 0).toFixed(2);
        const reciboCodigo = entrega.recibo_codigo || `REC-${entrega.id}`;
        const responsavel = entrega.responsavel_nome || 'Responsável';
        const destinatario = entrega.entregue_a || 'Tesouraria BCV';
        const escalao = entrega.escalao || activeEscalao;
        const notas = entrega.notas ? escapeHtml(entrega.notas) : 'Sem observações adicionais.';

        modalComprovativoContent.innerHTML = `
            <div class="recibo-card">
                <div class="recibo-card-header">
                    <div class="recibo-card-logo">
                        <img src="assets/emblema_png.png" alt="BCV">
                        <div>
                            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">Basket Clube de Valença</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Comprovativo de Tesouraria</div>
                        </div>
                    </div>
                    <div class="recibo-num-code">${escapeHtml(reciboCodigo)}</div>
                </div>

                <div class="recibo-highlight-valor">
                    <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #166534;">Montante Entregue</div>
                    <div class="recibo-highlight-num">${valorFmt} €</div>
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 600;">✓ Entregue & Confirmado no Clube</div>
                </div>

                <div style="margin-top: 10px;">
                    <div class="recibo-detail-row">
                        <span class="recibo-detail-label">Escalão:</span>
                        <span class="recibo-detail-val">${escapeHtml(escalao)}</span>
                    </div>
                    <div class="recibo-detail-row">
                        <span class="recibo-detail-label">Data da Entrega:</span>
                        <span class="recibo-detail-val">${dataFmt}</span>
                    </div>
                    <div class="recibo-detail-row">
                        <span class="recibo-detail-label">Entregue por:</span>
                        <span class="recibo-detail-val">${escapeHtml(responsavel)}</span>
                    </div>
                    <div class="recibo-detail-row">
                        <span class="recibo-detail-label">Recebido por:</span>
                        <span class="recibo-detail-val">${escapeHtml(destinatario)}</span>
                    </div>
                    <div class="recibo-detail-row">
                        <span class="recibo-detail-label">Método:</span>
                        <span class="recibo-detail-val">${escapeHtml(entrega.metodo || 'Dinheiro')}</span>
                    </div>
                    <div class="recibo-detail-row" style="border-bottom: none;">
                        <span class="recibo-detail-label">Observações:</span>
                        <span class="recibo-detail-val" style="font-style: italic;">${notas}</span>
                    </div>
                </div>

                <div class="recibo-carimbo-box">
                    <div>🏛️ <strong>Basket Clube de Valença • Tesouraria Central</strong></div>
                    <div style="font-size: 0.68rem; margin-top: 2px; color: #64748b;">
                        Registado no sistema BCV em ${entrega.created_at ? new Date(entrega.created_at).toLocaleString('pt-PT') : dataFmt} • Época 2026/2027
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button type="button" class="btn-primary" onclick="window.print()" style="flex: 1; padding: 10px; font-size: 0.85rem; font-weight: 700; background: #059669; border: none; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>🖨️</span>
                        <span>Imprimir / Guardar</span>
                    </button>
                    <button type="button" class="btn-secondary" onclick="window.closeModalComprovativo()" style="padding: 10px 16px; font-size: 0.85rem; font-weight: 700; border-radius: 8px; cursor: pointer;">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        modalComprovativoSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalComprovativo = function() {
        if (modalComprovativoSheet) modalComprovativoSheet.classList.remove('active');
        document.body.style.overflow = '';
    };

    // =======================================================
    // 8. MODAL EXTRATO INDIVIDUAL DO ATLETA
    // =======================================================
    window.openModalExtrato = function(atletaId) {
        const atleta = currentAtletas.find(a => a.id === atletaId);
        if (!atleta) return;

        modalExtratoAtletaNome.textContent = atleta.nome;
        const atletaPags = pagamentosAtletaMap[atletaId] || [];

        let totalPago = 0;
        atletaPags.forEach(p => totalPago += Number(p.valor || 0));

        let itensHtml = '';
        if (atletaPags.length === 0) {
            itensHtml = `<div style="text-align: center; padding: 25px; color: var(--text-muted); font-size: 0.85rem;">Nenhum pagamento registado para este atleta até ao momento.</div>`;
        } else {
            itensHtml = atletaPags.map(p => {
                const cat = p.categoria || 'Mensalidade';
                const desc = p.descricao || p.mes || cat;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 6px;">
                        <div>
                            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">${escapeHtml(desc)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.data_pagamento || '-'} • ${p.metodo_pagamento || 'Dinheiro'} • Recetor: ${p.registado_por || 'Secretaria'}</div>
                        </div>
                        <div style="font-size: 1rem; font-weight: 800; color: var(--primary);">
                            ${Number(p.valor || 0).toFixed(2)} €
                        </div>
                    </div>
                `;
            }).join('');
        }

        modalExtratoContent.innerHTML = `
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px;">
                <div style="font-size: 0.75rem; color: #7e22ce; font-weight: 700; text-transform: uppercase;">Total Liquidado 2026/2027</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #581c87; margin-top: 2px;">${totalPago.toFixed(2)} €</div>
            </div>
            
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Histórico de Transações:</div>
            <div style="max-height: 50vh; overflow-y: auto;">
                ${itensHtml}
            </div>
        `;

        modalExtratoSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalExtrato = function() {
        modalExtratoSheet.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Fechar modais ao clicar no overlay
    if (modalPagamentoSheet) {
        modalPagamentoSheet.addEventListener('click', (e) => {
            if (e.target === modalPagamentoSheet) closeModalPagamento();
        });
    }
    if (modalExtratoSheet) {
        modalExtratoSheet.addEventListener('click', (e) => {
            if (e.target === modalExtratoSheet) closeModalExtrato();
        });
    }
    if (modalEntregaSheet) {
        modalEntregaSheet.addEventListener('click', (e) => {
            if (e.target === modalEntregaSheet) closeModalEntrega();
        });
    }
    if (modalComprovativoSheet) {
        modalComprovativoSheet.addEventListener('click', (e) => {
            if (e.target === modalComprovativoSheet) closeModalComprovativo();
        });
    }

    // Iniciar verificação de sessão
    checkSession();
});
