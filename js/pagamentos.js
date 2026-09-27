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

    // Tab Extrato
    const extratoKpiDinheiro = document.getElementById('extrato-kpi-dinheiro');
    const extratoKpiMbway = document.getElementById('extrato-kpi-mbway');
    const extratoKpiBanco = document.getElementById('extrato-kpi-banco');
    const extratoKpiTotal = document.getElementById('extrato-kpi-total');
    const filtroExtratoCategoria = document.getElementById('filtro-extrato-categoria');
    const filtroExtratoMetodo = document.getElementById('filtro-extrato-metodo');
    const listaMovimentosContainer = document.getElementById('lista-movimentos-container');

    // Modal Registar Pagamento Multi-Item
    const modalPagamentoSheet = document.getElementById('modal-pagamento-sheet');
    const formRegistarPagamento = document.getElementById('form-registar-pagamento');
    const modalPagamentoAtletaNome = document.getElementById('modal-pagamento-atleta-nome');
    const modalPagamentoAtletaSub = document.getElementById('modal-pagamento-atleta-sub');
    const pagamentoAtletaIdInput = document.getElementById('pagamento-atleta-id');
    const cobrancaQuotasContainer = document.getElementById('cobranca-quotas-container');
    const cobrancaProdutosContainer = document.getElementById('cobranca-produtos-container');
    const checkoutTotalDisplay = document.getElementById('checkout-total-display');
    const checkoutItensContagem = document.getElementById('checkout-itens-contagem');
    const pagamentoMetodoSelect = document.getElementById('pagamento-metodo');
    const pagamentoDataInput = document.getElementById('pagamento-data');
    const pagamentoNotasInput = document.getElementById('pagamento-notas');
    const btnConfirmarPagamento = document.getElementById('btn-confirmar-pagamento');
    const btnConfirmarPagamentoTxt = document.getElementById('btn-confirmar-pagamento-txt');
    const tabQuotaModeBtns = document.querySelectorAll('.tab-quota-mode-btn');

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

            // Obter perfil na tabela pública public.users
            const { data: profile, error: pError } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            if (pError) console.warn("Aviso ao carregar perfil:", pError);

            userProfile = profile || {
                nome: currentUser.user_metadata?.nome || currentUser.email.split('@')[0],
                role: 'pagamentos',
                escalao_afeto: ''
            };

            const userRole = (userProfile.role || '').toLowerCase();
            const allowedRoles = ['pagamentos', 'tesoureiro', 'admin', 'editor'];

            if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
                alert("Acesso Restrito: A sua conta não tem perfil de Responsável de Pagamentos de Escalão.");
                await supabase.auth.signOut();
                showLogin();
                return;
            }

            // Processar escalões atribuídos (separados por vírgula em escalao_afeto)
            const rawEscaloes = (userProfile.escalao_afeto || '').split(',').map(s => s.trim()).filter(Boolean);
            
            if (rawEscaloes.length > 0) {
                userEscaloes = rawEscaloes;
            } else if (userRole === 'admin') {
                // Se for Admin total e não tiver escalão específico, permitir escolher todos os escalões padrão
                userEscaloes = ['Mini 8', 'Mini 10', 'Mini 12', 'Sub 14 Masculino', 'Sub 14 Feminino', 'Sub 16 Masculino', 'Sub 16 Feminino', 'Sub 18 Masculino', 'Sub 18 Feminino', 'Sub 20', 'Seniores'];
            } else {
                // Responsável sem escalão ainda definido pelo admin
                userEscaloes = [];
            }

            // Definir escalão ativo inicial
            if (!activeEscalao && userEscaloes.length > 0) {
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
        updateEscalaoDisplay();
        renderMultiEscalaoSelectors();
        loadData();
    }

    // Login Form Submit
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
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
                loginErrorMsg.textContent = err.message.includes('Invalid login credentials')
                    ? 'Email ou palavra-passe incorretos.'
                    : 'Erro ao autenticar: ' + err.message;
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

        listaAtletasContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">A carregar atletas do escalão...</div>';
        listaMovimentosContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">A carregar extrato...</div>';

        try {
            // 1. Carregar atletas cujo escalão coincide com o escalão ativo
            const { data: todosAtletas, error: aError } = await supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (aError) throw aError;

            const cleanActive = normalizeEscalao(activeEscalao);

            currentAtletas = (todosAtletas || []).filter(a => {
                if (isStaffMember(a.funcao)) return false; // apenas atletas jogadores

                // Apenas atletas inscritos na época 2026/2027
                const ep = (a.epoca || '').trim();
                const isEpocaAtiva = ep === '2026/2027' || ep.includes('2026/2027') || ep.includes('2026-2027');
                if (!isEpocaAtiva) return false;

                const cleanAtletaEsc = normalizeEscalao(a.escalao);
                const cleanEq1 = normalizeEscalao(a.equipabcv1);
                const cleanEq2 = normalizeEscalao(a.equipabcv2);
                const cleanFpb = normalizeEscalao(a.equipafpb);

                // Correspondência normalizada pelo escalão direto do atleta
                return cleanAtletaEsc.includes(cleanActive) || cleanActive.includes(cleanAtletaEsc) ||
                       cleanEq1.includes(cleanActive) || cleanEq2.includes(cleanActive) || cleanFpb.includes(cleanActive);
            });

            if (currentAtletas.length === 0) {
                renderEmptyState(`Não foram encontrados atletas inscritos na época 2026/2027 no escalão "${activeEscalao}".`);
                currentPagamentos = [];
                renderExtrato();
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
                const { data: cfgRow } = await supabase
                    .from('configuracoes_clube')
                    .select('valor')
                    .eq('chave', 'tabela_quotas')
                    .maybeSingle();
                if (cfgRow && cfgRow.valor) {
                    tabelaPrecosQuotas = typeof cfgRow.valor === 'string' ? JSON.parse(cfgRow.valor) : cfgRow.valor;
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

            updatePrecosTab();

            // Renderizar interface
            renderAtletas();
            renderExtrato();
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

        // Análise do Mês Selecionado no filtro
        const mesSel = filtroMesCobranca.value || '2026-09';
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
            const hasAnual = atletaPags.some(p => p.mes === 'ANUAL' && p.estado === 'Pago');
            const regMes = atletaPags.find(p => p.mes === mesSel && p.estado === 'Pago');

            // Total acumulado pago por este atleta na época
            let totalPagoAtleta = 0;
            atletaPags.forEach(p => totalPagoAtleta += Number(p.valor || 0));

            // Status badge do mês selecionado
            let badgeHtml = '';
            if (hasAnual) {
                badgeHtml = `<span class="atleta-badge-status anual">⭐ Quota Anual Paga</span>`;
            } else if (regMes) {
                badgeHtml = `<span class="atleta-badge-status pago">✓ Pago (${Number(regMes.valor || 25).toFixed(0)}€)</span>`;
            } else {
                badgeHtml = `<span class="atleta-badge-status pendente">⏳ Pendente</span>`;
            }

            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';
            const nickDisplay = a.nickname ? `"${escapeHtml(a.nickname)}"` : '';

            const avatarHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${escapeHtml(a.nome)}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            html += `
                <div class="atleta-card">
                    <div class="atleta-top-row">
                        ${avatarHtml}
                        <div class="atleta-info">
                            <div class="atleta-nome">
                                ${escapeHtml(a.nome)}
                                ${nickDisplay ? `<span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;"> ${nickDisplay}</span>` : ''}
                            </div>
                            <div class="atleta-meta">
                                <span style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 700;">Nº ${dorsal}</span>
                                <span>Total Pago: <strong>${totalPagoAtleta.toFixed(0)} €</strong></span>
                                ${badgeHtml}
                            </div>
                        </div>
                    </div>
                    <div class="atleta-actions-row">
                        <button type="button" class="btn-action-primary" onclick="window.openModalPagamento(${a.id})">
                            <span>💶</span>
                            <span>Registar Pagamento</span>
                        </button>
                        <button type="button" class="btn-action-secondary" onclick="window.openModalExtrato(${a.id})">
                            <span>📄</span>
                            <span>Extrato (${atletaPags.length})</span>
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
        { key: '2026-09', label: 'Setembro 2026' },
        { key: '2026-10', label: 'Outubro 2026' },
        { key: '2026-11', label: 'Novembro 2026' },
        { key: '2026-12', label: 'Dezembro 2026' },
        { key: '2027-01', label: 'Janeiro 2027' },
        { key: '2027-02', label: 'Fevereiro 2027' },
        { key: '2027-03', label: 'Março 2027' },
        { key: '2027-04', label: 'Abril 2027' },
        { key: '2027-05', label: 'Maio 2027' },
        { key: '2027-06', label: 'Junho 2027' }
    ];

    function getPrecosAtleta(atleta) {
        const esc = atleta?.escalao || activeEscalao;
        let match = null;
        if (Array.isArray(tabelaPrecosQuotas)) {
            match = tabelaPrecosQuotas.find(p => normalizeEscalao(p.escalao) === normalizeEscalao(esc));
        } else if (typeof tabelaPrecosQuotas === 'object' && tabelaPrecosQuotas !== null) {
            match = tabelaPrecosQuotas[esc] || Object.values(tabelaPrecosQuotas).find(p => normalizeEscalao(p?.escalao) === normalizeEscalao(esc));
        }

        return {
            mensal: Number(match?.mensal) || 25.00,
            bianual: Number(match?.bianual) || 120.00,
            anual: Number(match?.anual) || 230.00
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
        activeQuotaMode = 'meses';

        if (tabQuotaModeBtns) {
            tabQuotaModeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-mode') === activeQuotaMode);
            });
        }

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

    // Alternar modo de quota (Mensal / Bianual / Anual)
    if (tabQuotaModeBtns) {
        tabQuotaModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                if (!mode || mode === activeQuotaMode) return;
                activeQuotaMode = mode;
                tabQuotaModeBtns.forEach(b => b.classList.toggle('active', b === btn));

                // Limpar seleções de quota anteriores para evitar conflito de planos
                for (const [key, item] of selectedCobrancaItems.entries()) {
                    if (item.tipo === 'quota') {
                        selectedCobrancaItems.delete(key);
                    }
                }

                renderModalCobrancaItens();
                updateCheckoutBar();
            });
        });
    }

    function renderModalCobrancaItens() {
        if (!currentAtletaModal) return;
        const atleta = currentAtletaModal;
        const precos = getPrecosAtleta(atleta);
        const atletaPags = pagamentosAtletaMap[atleta.id] || [];

        const hasAnual = atletaPags.some(p => (p.mes === 'ANUAL' || p.categoria === 'Quota Anual') && p.estado === 'Pago');

        // 1. SECÇÃO QUOTAS / MENSALIDADES
        let htmlQuotas = '';

        if (activeQuotaMode === 'meses') {
            MESES_EPOCA.forEach(m => {
                const isPago = hasAnual || atletaPags.some(p => p.mes === m.key && p.estado === 'Pago');
                const itemKey = `quota_${m.key}`;
                const isSelected = selectedCobrancaItems.has(itemKey);

                if (isPago) {
                    htmlQuotas += `
                        <div class="cobranca-item-row paid">
                            <div class="cobranca-item-left">
                                <span class="cobranca-item-check-icon">✓</span>
                                <div>
                                    <div class="cobranca-item-name">${m.label}</div>
                                    <div class="cobranca-item-desc">${hasAnual ? 'Liquidado via Quota Anual' : 'Mensalidade Liquidada'}</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-badge-pago">Pago</span>
                                <span class="cobranca-item-price">${precos.mensal.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                } else {
                    htmlQuotas += `
                        <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                             data-key="${itemKey}" 
                             data-tipo="quota" 
                             data-mes="${m.key}" 
                             data-cat="Mensalidade" 
                             data-desc="Mensalidade ${m.label}" 
                             data-valor="${precos.mensal}">
                            <div class="cobranca-item-left">
                                <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
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
                }
            });
        } else if (activeQuotaMode === 'bianual') {
            const planosBianual = [
                {
                    key: 'BIANUAL_1',
                    nome: '1ª Prestação Bianual',
                    desc: 'Setembro a Janeiro (5 meses)',
                    valor: precos.bianual
                },
                {
                    key: 'BIANUAL_2',
                    nome: '2ª Prestação Bianual',
                    desc: 'Fevereiro a Junho (5 meses)',
                    valor: precos.bianual
                }
            ];

            planosBianual.forEach(b => {
                const isPago = hasAnual || atletaPags.some(p => p.mes === b.key && p.estado === 'Pago');
                const itemKey = `quota_${b.key}`;
                const isSelected = selectedCobrancaItems.has(itemKey);

                if (isPago) {
                    htmlQuotas += `
                        <div class="cobranca-item-row paid">
                            <div class="cobranca-item-left">
                                <span class="cobranca-item-check-icon">✓</span>
                                <div>
                                    <div class="cobranca-item-name">${b.nome}</div>
                                    <div class="cobranca-item-desc">${hasAnual ? 'Liquidado via Quota Anual' : b.desc}</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-badge-pago">Pago</span>
                                <span class="cobranca-item-price">${b.valor.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                } else {
                    htmlQuotas += `
                        <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                             data-key="${itemKey}" 
                             data-tipo="quota" 
                             data-mes="${b.key}" 
                             data-cat="Quota Bianual" 
                             data-desc="${b.nome} (2026/2027)" 
                             data-valor="${b.valor}">
                            <div class="cobranca-item-left">
                                <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
                                <div>
                                    <div class="cobranca-item-name">${b.nome}</div>
                                    <div class="cobranca-item-desc">${b.desc}</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-price">${b.valor.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                }
            });
        } else if (activeQuotaMode === 'anual') {
            const isPago = hasAnual;
            const itemKey = `quota_ANUAL`;
            const isSelected = selectedCobrancaItems.has(itemKey);

            if (isPago) {
                htmlQuotas += `
                    <div class="cobranca-item-row paid">
                        <div class="cobranca-item-left">
                            <span class="cobranca-item-check-icon">✓</span>
                            <div>
                                <div class="cobranca-item-name">⭐ Quota Anual Integral</div>
                                <div class="cobranca-item-desc">Época Completa 2026/2027</div>
                            </div>
                        </div>
                        <div class="cobranca-item-right">
                            <span class="cobranca-item-badge-pago">Liquidado</span>
                            <span class="cobranca-item-price">${precos.anual.toFixed(2)} €</span>
                        </div>
                    </div>
                `;
            } else {
                htmlQuotas += `
                    <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                         data-key="${itemKey}" 
                         data-tipo="quota" 
                         data-mes="ANUAL" 
                         data-cat="Quota Anual" 
                         data-desc="Quota Anual Integral (2026/2027)" 
                         data-valor="${precos.anual}">
                        <div class="cobranca-item-left">
                            <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
                            <div>
                                <div class="cobranca-item-name">⭐ Quota Anual Integral</div>
                                <div class="cobranca-item-desc">Pagamento único para toda a época 2026/2027</div>
                            </div>
                        </div>
                        <div class="cobranca-item-right">
                            <span class="cobranca-item-price">${precos.anual.toFixed(2)} €</span>
                        </div>
                    </div>
                `;
            }
        }

        if (cobrancaQuotasContainer) cobrancaQuotasContainer.innerHTML = htmlQuotas;

        // 2. SECÇÃO PRODUTOS / EXAMES / EQUIPAMENTOS
        let htmlProdutos = '';
        const escAtleta = normalizeEscalao(atleta.escalao || activeEscalao);

        const prodsEscalao = currentItensCobranca.filter(item => {
            if (item.ativo === false) return false;
            const itemEsc = normalizeEscalao(item.escalao);
            return itemEsc === 'todos' || itemEsc === escAtleta || !item.escalao;
        });

        if (prodsEscalao.length === 0) {
            htmlProdutos = `
                <div style="text-align: center; padding: 14px 10px; color: var(--text-muted); font-size: 0.82rem; background: #f8fafc; border-radius: 8px; border: 1px dashed var(--border);">
                    Sem produtos ou encargos adicionais registados para este escalão.
                </div>
            `;
        } else {
            prodsEscalao.forEach(prod => {
                const isPago = atletaPags.some(p => p.item_cobranca_id === prod.id && p.estado === 'Pago');
                const itemKey = `prod_${prod.id}`;
                const isSelected = selectedCobrancaItems.has(itemKey);
                const valorProd = Number(prod.valor || 0);
                const itemNome = prod.titulo || prod.nome || 'Produto';

                if (isPago) {
                    htmlProdutos += `
                        <div class="cobranca-item-row paid">
                            <div class="cobranca-item-left">
                                <span class="cobranca-item-check-icon">✓</span>
                                <div>
                                    <div class="cobranca-item-name">${escapeHtml(itemNome)}</div>
                                    <div class="cobranca-item-desc">${escapeHtml(prod.categoria || 'Produto')} • Liquidado</div>
                                </div>
                            </div>
                            <div class="cobranca-item-right">
                                <span class="cobranca-item-badge-pago">Pago</span>
                                <span class="cobranca-item-price">${valorProd.toFixed(2)} €</span>
                            </div>
                        </div>
                    `;
                } else {
                    htmlProdutos += `
                        <div class="cobranca-item-row selectable ${isSelected ? 'selected' : ''}" 
                             data-key="${itemKey}" 
                             data-tipo="produto" 
                             data-prod-id="${prod.id}" 
                             data-cat="${escapeHtml(prod.categoria || 'Produto')}" 
                             data-desc="${escapeHtml(itemNome)}" 
                             data-valor="${valorProd}">
                            <div class="cobranca-item-left">
                                <input type="checkbox" class="cobranca-item-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
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
                }
            });
        }

        if (cobrancaProdutosContainer) cobrancaProdutosContainer.innerHTML = htmlProdutos;

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
                const valor = Number(row.getAttribute('data-valor')) || 0;
                const prodId = row.getAttribute('data-prod-id') ? Number(row.getAttribute('data-prod-id')) : null;
                const checkbox = row.querySelector('.cobranca-item-checkbox');

                if (selectedCobrancaItems.has(key)) {
                    selectedCobrancaItems.delete(key);
                    row.classList.remove('selected');
                    if (checkbox) checkbox.checked = false;
                } else {
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
    // 7. RENDERIZAÇÃO DO EXTRATO DO ESCALÃO (TAB 2)
    // =======================================================
    function renderExtrato() {
        if (!listaMovimentosContainer) return;

        let totalDinheiro = 0;
        let totalMbway = 0;
        let totalBanco = 0;
        let totalGeral = 0;

        currentPagamentos.forEach(p => {
            const val = Number(p.valor || 0);
            totalGeral += val;
            const met = (p.metodo_pagamento || '').toLowerCase();
            if (met.includes('dinheiro')) totalDinheiro += val;
            else if (met.includes('mbway')) totalMbway += val;
            else if (met.includes('transf')) totalBanco += val;
        });

        if (extratoKpiDinheiro) extratoKpiDinheiro.textContent = `${totalDinheiro.toFixed(0)} €`;
        if (extratoKpiMbway) extratoKpiMbway.textContent = `${totalMbway.toFixed(0)} €`;
        if (extratoKpiBanco) extratoKpiBanco.textContent = `${totalBanco.toFixed(0)} €`;
        if (extratoKpiTotal) extratoKpiTotal.textContent = `${totalGeral.toFixed(2)} €`;

        const catFiltro = filtroExtratoCategoria?.value || 'todas';
        const metFiltro = filtroExtratoMetodo?.value || 'todos';

        const filtrados = currentPagamentos.filter(p => {
            if (catFiltro !== 'todas') {
                const pCat = p.categoria || 'Mensalidade';
                if (pCat !== catFiltro) return false;
            }
            if (metFiltro !== 'todos') {
                const pMet = (p.metodo_pagamento || '').toLowerCase();
                if (!pMet.includes(metFiltro.toLowerCase())) return false;
            }
            return true;
        });

        if (filtrados.length === 0) {
            listaMovimentosContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <p style="color: var(--text-muted); font-size: 0.88rem;">Nenhum movimento encontrado para os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtrados.forEach(p => {
            const atleta = currentAtletas.find(a => a.id === p.atleta_id) || { nome: 'Atleta' };
            const cat = p.categoria || 'Mensalidade';
            
            let iconClass = 'mensalidade';
            let iconSymbol = '📅';
            if (cat === 'Equipamento') { iconClass = 'equipamento'; iconSymbol = '🎽'; }
            else if (cat === 'Exame Médico') { iconClass = 'exame'; iconSymbol = '🩺'; }
            else if (cat === 'Outro') { iconClass = 'outro'; iconSymbol = '📦'; }

            const descText = p.descricao || p.mes || cat;
            const dataFmt = p.data_pagamento || 'Data N/D';

            html += `
                <div class="movimento-item">
                    <div class="movimento-left">
                        <div class="movimento-icon ${iconClass}">${iconSymbol}</div>
                        <div class="movimento-info">
                            <div class="movimento-atleta">${escapeHtml(atleta.nome)}</div>
                            <div class="movimento-desc">
                                <span>${escapeHtml(descText)}</span> • <span style="color: var(--text-light);">${dataFmt}</span>
                            </div>
                        </div>
                    </div>
                    <div class="movimento-right">
                        <div class="movimento-valor">${Number(p.valor || 0).toFixed(2)} €</div>
                        <div class="movimento-metodo">${p.metodo_pagamento || 'Dinheiro'}</div>
                        <button type="button" class="btn-anular-mini" onclick="window.openModalExtrato(${p.atleta_id})">Ver Ficha 👁️</button>
                    </div>
                </div>
            `;
        });

        listaMovimentosContainer.innerHTML = html;
    }

    if (filtroExtratoCategoria) filtroExtratoCategoria.addEventListener('change', renderExtrato);
    if (filtroExtratoMetodo) filtroExtratoMetodo.addEventListener('change', renderExtrato);

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
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.75rem; color: #7e22ce; font-weight: 700; text-transform: uppercase;">Total Liquidado 2026/2027</div>
                    <div style="font-size: 1.4rem; font-weight: 800; color: #581c87;">${totalPago.toFixed(2)} €</div>
                </div>
                <button type="button" class="btn-action-primary" style="padding: 8px 14px; font-size: 0.82rem;" onclick="closeModalExtrato(); window.openModalPagamento(${atletaId});">
                    + Registar
                </button>
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

    // Iniciar verificação de sessão
    checkSession();
});
