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
    let mensalidadesMap = {}; // atleta_id -> objeto mensalidade

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
    const pagamentoValor = document.getElementById('pagamento-valor');
    const pagamentoMetodo = document.getElementById('pagamento-metodo');
    const pagamentoData = document.getElementById('pagamento-data');
    const pagamentoNotas = document.getElementById('pagamento-notas');
    const btnAnularPagamento = document.getElementById('btn-anular-pagamento');

    // Plantel & SOS
    const filtroPlantel = document.getElementById('filtro-plantel');
    const listaPlantelContainer = document.getElementById('lista-plantel-container');

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

            userEscalao = (userProfile.escalao_afeto || '').trim();

            showApp();
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
        if (headerEscalaoBadge) {
            headerEscalaoBadge.innerHTML = userEscalao 
                ? `🏀 ${userEscalao}` 
                : `🏀 Geral (Todos)`;
        }
        if (drawerEscalaoName) {
            drawerEscalaoName.textContent = userEscalao ? `Escalão: ${userEscalao}` : 'Todos os Escalões';
        }
    }

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
            } else if (targetTabId === 'tab-mensalidades') {
                loadMensalidades();
            } else if (targetTabId === 'tab-plantel') {
                renderPlantel();
            }
        });
    });

    // 4. Carregar Atletas Afetos ao Escalão
    async function loadData() {
        try {
            let query = supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            // Se o utilizador tiver um escalão específico atribuído, filtrar na query
            if (userEscalao && userEscalao.toLowerCase() !== 'todos') {
                const escClean = userEscalao.replace(/[-\s]/g, '').toLowerCase();
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
            await loadMensalidades();
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
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Não há atletas associados ao escalão <strong>${userEscalao || 'selecionado'}</strong>.</p>
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
                                <span>${a.nickname ? `"${a.nickname}"` : (a.escalao || userEscalao)}</span>
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

    // Guardar Presenças na Base de Dados
    if (btnGuardarPresencas) {
        btnGuardarPresencas.addEventListener('click', async () => {
            const dataSel = presencasDataInput.value || hojeIso;
            const tipoSel = presencasTipoSelect.value || 'Treino';

            if (currentAtletas.length === 0) {
                alert("Não existem atletas para registar presenças.");
                return;
            }

            btnGuardarPresencas.textContent = "A guardar presenças...";
            btnGuardarPresencas.disabled = true;

            const payload = currentAtletas.map(a => ({
                atleta_id: a.id,
                data: dataSel,
                tipo: tipoSel,
                estado: presencasState[a.id] || 'Presente',
                escalao: a.escalao || userEscalao || 'Geral',
                registado_por: userProfile.nome || currentUser.email
            }));

            try {
                const { error } = await supabase
                    .from('presencas')
                    .upsert(payload, { onConflict: 'atleta_id, data, tipo' });

                if (error) throw error;

                btnGuardarPresencas.textContent = "✅ Presenças Guardadas com Sucesso!";
                btnGuardarPresencas.style.background = "#10b981";

                setTimeout(() => {
                    btnGuardarPresencas.textContent = "💾 Guardar Presenças";
                    btnGuardarPresencas.style.background = "";
                    btnGuardarPresencas.disabled = false;
                }, 1800);

            } catch (err) {
                console.error("Erro ao guardar presenças:", err);
                alert("Erro ao guardar presenças: " + err.message);
                btnGuardarPresencas.textContent = "💾 Guardar Presenças";
                btnGuardarPresencas.disabled = false;
            }
        });
    }

    // =======================================================
    // 6. MÓDULO DE MENSALIDADES
    // =======================================================
    async function loadMensalidades() {
        if (!listaMensalidadesContainer) return;
        const mesSel = mensalidadesMesSelect.value || '2026-09';
        const epoca = '2026/2027';

        listaMensalidadesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">A carregar estado das mensalidades...</div>';

        try {
            const { data: mensalidades, error } = await supabase
                .from('mensalidades')
                .select('*')
                .eq('epoca', epoca)
                .eq('mes', mesSel);

            if (error && error.code !== '42P01') {
                console.warn("Aviso ao carregar mensalidades:", error);
            }

            mensalidadesMap = {};
            (mensalidades || []).forEach(m => {
                mensalidadesMap[m.atleta_id] = m;
            });

            renderMensalidadesList();

        } catch (e) {
            console.error("Erro ao consultar mensalidades:", e);
            renderMensalidadesList();
        }
    }

    function renderMensalidadesList() {
        if (!listaMensalidadesContainer) return;

        let totalPago = 0;
        let qtdPago = 0;
        let qtdPendente = 0;
        const VALOR_PADRAO = 25.00;

        if (currentAtletas.length === 0) {
            listaMensalidadesContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                    <span style="font-size: 2rem;">💶</span>
                    <h3 style="margin-top: 10px; font-size: 1rem; color: var(--text-main);">Nenhum atleta encontrado</h3>
                </div>
            `;
            return;
        }

        let html = '';
        currentAtletas.forEach(a => {
            const reg = mensalidadesMap[a.id];
            const isPago = reg && reg.estado === 'Pago';
            const dorsal = a.equipamento_numero_1 || a.equipamento_numero_2 || a.dorsal || '-';

            if (isPago) {
                totalPago += Number(reg.valor || VALOR_PADRAO);
                qtdPago++;
            } else {
                qtdPendente++;
            }

            const fotoHtml = a.foto_url 
                ? `<img src="${a.foto_url}" class="atleta-avatar" alt="${a.nome}">`
                : `<div class="atleta-avatar">${(a.nome || 'A').charAt(0).toUpperCase()}</div>`;

            const badgeBtn = isPago 
                ? `<button type="button" class="badge-status pago" onclick="window.openPagamentoModal(${a.id})">
                     ✓ Pago (${Number(reg.valor || VALOR_PADRAO).toFixed(0)}€)
                   </button>`
                : `<button type="button" class="badge-status pendente" onclick="window.openPagamentoModal(${a.id})">
                     + Registar (${VALOR_PADRAO}€)
                   </button>`;

            html += `
                <div class="atleta-mensalidade-card">
                    <div class="atleta-info-row" style="flex: 1;">
                        ${fotoHtml}
                        <div class="atleta-details">
                            <div class="atleta-nome">${a.nome}</div>
                            <div class="atleta-meta">
                                <span class="badge-numero">Nº ${dorsal}</span>
                                <span>${isPago ? `📅 ${reg.data_pagamento || 'Hoje'} • ${reg.metodo_pagamento || 'Dinheiro'}` : 'Pendente'}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        ${badgeBtn}
                    </div>
                </div>
            `;
        });

        listaMensalidadesContainer.innerHTML = html;

        // Atualizar Resumo Estatístico
        if (statTotalPago) statTotalPago.textContent = `${totalPago.toFixed(0)} €`;
        if (statQtdPago) statQtdPago.textContent = `${qtdPago} Pagos`;
        if (statTotalPendente) statTotalPendente.textContent = `${(qtdPendente * VALOR_PADRAO).toFixed(0)} €`;
        if (statQtdPendente) statQtdPendente.textContent = `${qtdPendente} Pendentes`;
    }

    if (mensalidadesMesSelect) {
        mensalidadesMesSelect.addEventListener('change', loadMensalidades);
    }

    // Modal de Pagamento Rápido
    window.openPagamentoModal = function(atletaId) {
        const atleta = currentAtletas.find(a => a.id === atletaId);
        if (!atleta) return;

        const reg = mensalidadesMap[atletaId];
        const isPago = reg && reg.estado === 'Pago';

        modalAtletaNome.textContent = atleta.nome;
        pagamentoAtletaId.value = atletaId;
        pagamentoValor.value = isPago ? (reg.valor || 25.00) : 25.00;
        pagamentoMetodo.value = isPago ? (reg.metodo_pagamento || 'Dinheiro') : 'Dinheiro';
        pagamentoData.value = isPago ? (reg.data_pagamento || hojeIso) : hojeIso;
        pagamentoNotas.value = isPago ? (reg.notas || '') : '';

        if (isPago) {
            btnAnularPagamento.style.display = 'block';
            document.getElementById('btn-confirmar-pagamento').textContent = 'Atualizar Pagamento';
        } else {
            btnAnularPagamento.style.display = 'none';
            document.getElementById('btn-confirmar-pagamento').textContent = 'Confirmar Recebimento';
        }

        modalPagamentoSheet.classList.add('active');
    };

    window.closePagamentoModal = function() {
        modalPagamentoSheet.classList.remove('active');
    };

    if (formPagamentoRapido) {
        formPagamentoRapido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const atletaId = Number(pagamentoAtletaId.value);
            const mesSel = mensalidadesMesSelect.value || '2026-09';
            const epoca = '2026/2027';

            const payload = {
                atleta_id: atletaId,
                epoca: epoca,
                mes: mesSel,
                valor: Number(pagamentoValor.value) || 25.00,
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
                console.error("Erro ao registar mensalidade:", err);
                alert("Erro ao registar mensalidade: " + err.message);
            }
        });
    }

    if (btnAnularPagamento) {
        btnAnularPagamento.addEventListener('click', async () => {
            if (!confirm("Tem a certeza de que deseja anular este registo de pagamento?")) return;
            const atletaId = Number(pagamentoAtletaId.value);
            const mesSel = mensalidadesMesSelect.value || '2026-09';
            const epoca = '2026/2027';

            try {
                const { error } = await supabase
                    .from('mensalidades')
                    .delete()
                    .eq('atleta_id', atletaId)
                    .eq('epoca', epoca)
                    .eq('mes', mesSel);

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
    // 7. MÓDULO PLANTEL & SOS (CONTACTOS DE EMERGÊNCIA)
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
                                <span>${a.escalao || userEscalao}</span>
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
