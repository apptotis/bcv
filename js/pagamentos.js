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
    let activeCategoriaModal = 'Mensalidade';

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

    // Modal Registar Pagamento
    const modalPagamentoSheet = document.getElementById('modal-pagamento-sheet');
    const formRegistarPagamento = document.getElementById('form-registar-pagamento');
    const modalPagamentoAtletaNome = document.getElementById('modal-pagamento-atleta-nome');
    const pagamentoAtletaIdInput = document.getElementById('pagamento-atleta-id');
    const pagamentoIdInput = document.getElementById('pagamento-id');
    const categoryPills = document.querySelectorAll('.cat-pill');
    const blocoMensalidadeMes = document.getElementById('bloco-mensalidade-mes');
    const blocoDescricao = document.getElementById('bloco-descricao');
    const pagamentoMesSelect = document.getElementById('pagamento-mes-select');
    const pagamentoDescricaoInput = document.getElementById('pagamento-descricao');
    const pagamentoValorInput = document.getElementById('pagamento-valor');
    const pagamentoMetodoSelect = document.getElementById('pagamento-metodo');
    const pagamentoDataInput = document.getElementById('pagamento-data');
    const pagamentoReciboInput = document.getElementById('pagamento-recibo');
    const pagamentoNotasInput = document.getElementById('pagamento-notas');
    const btnAnularPagamento = document.getElementById('btn-anular-pagamento');
    const btnConfirmarPagamento = document.getElementById('btn-confirmar-pagamento');

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

    // Renderiza selector de múltiplos escalões se o utilizador tiver mais de 1 escalão
    function renderMultiEscalaoSelectors() {
        if (!userEscaloes || userEscaloes.length <= 1) {
            if (multiEscalaoBar) multiEscalaoBar.style.display = 'none';
            if (drawerSectionEscaloes) drawerSectionEscaloes.style.display = 'none';
            return;
        }

        // Barra de Pills no Topo
        if (multiEscalaoBar && multiEscalaoPills) {
            multiEscalaoBar.style.display = 'block';
            multiEscalaoPills.innerHTML = userEscaloes.map(esc => `
                <button type="button" class="pill-escalao ${esc === activeEscalao ? 'active' : ''}" data-esc="${escapeHtml(esc)}">
                    <span>🏀</span>
                    <span>${escapeHtml(esc)}</span>
                </button>
            `).join('');

            multiEscalaoPills.querySelectorAll('.pill-escalao').forEach(btn => {
                btn.addEventListener('click', () => {
                    const esc = btn.getAttribute('data-esc');
                    if (esc && esc !== activeEscalao) {
                        switchEscalao(esc);
                    }
                });
            });
        }

        // Lista no Drawer
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
    // 6. MODAL REGISTAR PAGAMENTO / MOVIMENTO
    // =======================================================
    window.openModalPagamento = function(atletaId, existingPaymentId = null) {
        const atleta = currentAtletas.find(a => a.id === atletaId);
        if (!atleta) return;

        pagamentoAtletaIdInput.value = atletaId;
        pagamentoIdInput.value = existingPaymentId || '';
        modalPagamentoAtletaNome.textContent = atleta.nome;

        const mesSel = filtroMesCobranca.value || '2026-09';
        pagamentoMesSelect.value = mesSel;
        pagamentoDataInput.value = hojeIso;
        pagamentoMetodoSelect.value = 'Dinheiro';
        pagamentoReciboInput.value = '';
        pagamentoNotasInput.value = '';
        pagamentoDescricaoInput.value = '';

        // Definir categoria padrão
        setCategory('Mensalidade');

        // Se estiver a editar um pagamento existente
        if (existingPaymentId) {
            const p = currentPagamentos.find(item => item.id === existingPaymentId);
            if (p) {
                setCategory(p.categoria || 'Mensalidade');
                if (p.mes) pagamentoMesSelect.value = p.mes;
                pagamentoDescricaoInput.value = p.descricao || '';
                pagamentoValorInput.value = p.valor || '25.00';
                pagamentoMetodoSelect.value = p.metodo_pagamento || 'Dinheiro';
                pagamentoDataInput.value = p.data_pagamento || hojeIso;
                pagamentoReciboInput.value = p.recibo_num || '';
                pagamentoNotasInput.value = p.notas || '';

                btnAnularPagamento.style.display = 'block';
                btnConfirmarPagamento.textContent = 'Atualizar Pagamento';
            }
        } else {
            // Novo pagamento: verificar se este atleta já pagou a mensalidade do mês selecionado
            const atletaPags = pagamentosAtletaMap[atletaId] || [];
            const jaPago = atletaPags.find(p => p.mes === mesSel && p.estado === 'Pago');
            if (jaPago) {
                pagamentoIdInput.value = jaPago.id;
                setCategory(jaPago.categoria || 'Mensalidade');
                pagamentoValorInput.value = jaPago.valor;
                pagamentoMetodoSelect.value = jaPago.metodo_pagamento || 'Dinheiro';
                pagamentoDataInput.value = jaPago.data_pagamento || hojeIso;
                pagamentoReciboInput.value = jaPago.recibo_num || '';
                pagamentoNotasInput.value = jaPago.notas || '';
                btnAnularPagamento.style.display = 'block';
                btnConfirmarPagamento.textContent = 'Atualizar Pagamento';
            } else {
                btnAnularPagamento.style.display = 'none';
                btnConfirmarPagamento.textContent = 'Confirmar Recebimento';
                pagamentoValorInput.value = mesSel === 'ANUAL' ? '250.00' : '25.00';
            }
        }

        modalPagamentoSheet.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalPagamento = function() {
        modalPagamentoSheet.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Alternar Categorias no Modal
    function setCategory(cat) {
        activeCategoriaModal = cat;
        categoryPills.forEach(pill => {
            if (pill.getAttribute('data-cat') === cat) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        if (cat === 'Mensalidade') {
            blocoMensalidadeMes.style.display = 'block';
            blocoDescricao.style.display = 'none';
            if (pagamentoMesSelect.value === 'ANUAL') {
                pagamentoValorInput.value = '250.00';
            } else {
                pagamentoValorInput.value = '25.00';
            }
        } else {
            blocoMensalidadeMes.style.display = 'none';
            blocoDescricao.style.display = 'block';
            if (cat === 'Equipamento') {
                pagamentoDescricaoInput.placeholder = 'Ex: Kit de Jogo Oficial BCV (ou Fato de Treino)';
                pagamentoValorInput.value = '35.00';
            } else if (cat === 'Exame Médico') {
                pagamentoDescricaoInput.placeholder = 'Ex: Exame Médico Desportivo IPDJ';
                pagamentoValorInput.value = '20.00';
            } else {
                pagamentoDescricaoInput.placeholder = 'Ex: Inscrição Torneio, Merchandising, Seguro...';
                pagamentoValorInput.value = '10.00';
            }
        }
    }

    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const cat = pill.getAttribute('data-cat');
            if (cat) setCategory(cat);
        });
    });

    if (pagamentoMesSelect) {
        pagamentoMesSelect.addEventListener('change', () => {
            if (pagamentoMesSelect.value === 'ANUAL') {
                pagamentoValorInput.value = '250.00';
            } else if (Number(pagamentoValorInput.value) === 250) {
                pagamentoValorInput.value = '25.00';
            }
        });
    }

    window.setValorPreset = function(val) {
        pagamentoValorInput.value = Number(val).toFixed(2);
    };

    // Submissão do Formulário de Pagamento
    if (formRegistarPagamento) {
        formRegistarPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const atletaId = Number(pagamentoAtletaIdInput.value);
            const paymentId = pagamentoIdInput.value ? Number(pagamentoIdInput.value) : null;
            const categoria = activeCategoriaModal;
            const isMensalidade = categoria === 'Mensalidade';
            const mesFinal = isMensalidade ? pagamentoMesSelect.value : categoria.toUpperCase();
            const descricaoFinal = isMensalidade ? (mesFinal === 'ANUAL' ? 'Quota Anual Completa' : `Mensalidade ${mesFinal}`) : (pagamentoDescricaoInput.value.trim() || categoria);
            const valor = Number(pagamentoValorInput.value) || 25.00;
            const metodo = pagamentoMetodoSelect.value;
            const dataPag = pagamentoDataInput.value || hojeIso;
            const recibo = pagamentoReciboInput.value.trim();
            const notas = pagamentoNotasInput.value.trim();
            const registadoPor = userProfile?.nome || currentUser?.email || 'Responsável Escalão';

            btnConfirmarPagamento.disabled = true;
            btnConfirmarPagamento.textContent = 'A guardar...';

            const payload = {
                atleta_id: atletaId,
                epoca: '2026/2027',
                categoria: categoria,
                descricao: descricaoFinal,
                mes: mesFinal,
                valor: valor,
                estado: 'Pago',
                metodo_pagamento: metodo,
                data_pagamento: dataPag,
                recibo_num: recibo || null,
                notas: notas || null,
                registado_por: registadoPor
            };

            try {
                if (paymentId) {
                    // Atualização
                    const { error } = await supabase
                        .from('mensalidades')
                        .update(payload)
                        .eq('id', paymentId);
                    if (error) throw error;
                } else {
                    // Inserção nova
                    const { error } = await supabase
                        .from('mensalidades')
                        .insert([payload]);
                    if (error) throw error;
                }

                closeModalPagamento();
                await loadData();

            } catch (err) {
                console.error("Erro ao guardar pagamento:", err);
                alert("Erro ao registar pagamento: " + err.message);
            } finally {
                btnConfirmarPagamento.disabled = false;
                btnConfirmarPagamento.textContent = 'Confirmar Recebimento';
            }
        });
    }

    // Anulação de Pagamento
    if (btnAnularPagamento) {
        btnAnularPagamento.addEventListener('click', async () => {
            const paymentId = pagamentoIdInput.value;
            if (!paymentId) return;

            if (!confirm("Tem a certeza absoluta de que deseja anular este registo de pagamento?")) return;

            btnAnularPagamento.disabled = true;
            btnAnularPagamento.textContent = 'A anular...';

            try {
                const { error } = await supabase
                    .from('mensalidades')
                    .delete()
                    .eq('id', paymentId);

                if (error) throw error;

                closeModalPagamento();
                await loadData();

            } catch (err) {
                console.error("Erro ao anular pagamento:", err);
                alert("Erro ao anular pagamento: " + err.message);
            } finally {
                btnAnularPagamento.disabled = false;
                btnAnularPagamento.textContent = 'Anular';
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
                        <button type="button" class="btn-anular-mini" onclick="window.openModalPagamento(${p.atleta_id}, ${p.id})">Editar ✏️</button>
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
