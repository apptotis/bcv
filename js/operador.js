document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase
    let supabase;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase não configurado.");
        return;
    }

    // --- Elementos DOM ---
    const loginContainer = document.getElementById('admin-login-container');
    const opPanel = document.getElementById('op-panel');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('btn-logout');
    const loginForm = document.getElementById('login-form');

    // --- AUTENTICAÇÃO ---
    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);

    supabase.auth.onAuthStateChange((_event, session) => updateUI(session));

    function updateUI(session) {
        if (session) {
            loginContainer.classList.add('hidden');
            opPanel.classList.remove('hidden');
            loadJogos();
        } else {
            loginContainer.classList.remove('hidden');
            opPanel.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) { showError("Preencha email e senha."); return; }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showError("Credenciais inválidas.");
        } else {
            emailInput.value = '';
            passwordInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
    });

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }

    // --- JOGOS ---
    async function loadJogos() {
        const container = document.getElementById('op-jogos-list');
        container.innerHTML = '<p class="loading">A carregar jogos...</p>';

        const { data, error } = await supabase
            .from('jogos')
            .select(`
                *,
                equipa_casa:equipas!equipa_casa_id(id, nome, logo_url),
                equipa_fora:equipas!equipa_fora_id(id, nome, logo_url)
            `)
            .order('data_hora', { ascending: true });

        if (error) {
            container.innerHTML = '<p class="error">Erro ao carregar jogos.</p>';
            console.error(error);
            return;
        }
        if (!data || data.length === 0) {
            container.innerHTML = '<p>Nenhum jogo encontrado.</p>';
            return;
        }

        // Ordenar: terminados/cancelados no fim; dentro de cada grupo por data/hora depois campo
        const isTerminado = (j) => j.estado === 'Terminado' || j.estado === 'Cancelado';
        data.sort((a, b) => {
            if (isTerminado(a) !== isTerminado(b)) return isTerminado(a) ? 1 : -1;
            const da = a.data_hora ? new Date(a.data_hora) : new Date(0);
            const db = b.data_hora ? new Date(b.data_hora) : new Date(0);
            if (da - db !== 0) return da - db;
            return (a.campo || '').localeCompare(b.campo || '');
        });

        window._opAllJogos = data;

        // Popular filtro de campos
        populateCampoFilter(data);

        // Ligar filtros (só na primeira carga)
        if (!window._opFiltrosLigados) {
            window._opFiltrosLigados = true;
            document.getElementById('op-filter-estado').addEventListener('change', renderJogos);
            document.getElementById('op-filter-campo').addEventListener('change', renderJogos);
        }

        renderJogos();
    }

    function populateCampoFilter(jogos) {
        const sel = document.getElementById('op-filter-campo');
        const campos = [...new Set(jogos.map(j => j.campo).filter(Boolean))].sort();
        while (sel.options.length > 1) sel.remove(1);
        campos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            sel.appendChild(opt);
        });
    }

    function renderJogos() {
        const container = document.getElementById('op-jogos-list');
        const allJogos = window._opAllJogos || [];
        const estadoFilt = document.getElementById('op-filter-estado')?.value || '';
        const campoFilt = document.getElementById('op-filter-campo')?.value || '';

        const filtered = allJogos.filter(j => {
            const terminado = j.estado === 'Terminado' || j.estado === 'Cancelado';
            let matchEstado;
            if (estadoFilt === 'todos') matchEstado = true;
            else if (estadoFilt === 'terminado') matchEstado = terminado;
            else if (estadoFilt === 'em-jogo') matchEstado = j.estado === 'Em Jogo';
            else matchEstado = !terminado;

            const matchCampo = !campoFilt || j.campo === campoFilt;
            return matchEstado && matchCampo;
        });

        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = '<p>Nenhum jogo corresponde aos filtros.</p>';
            return;
        }

        filtered.forEach(jogo => {
            const estado = jogo.estado || 'Agendado';
            const estadoClass = {
                'Agendado': 'estado-agendado',
                'Em Jogo': 'estado-em-jogo',
                'Terminado': 'estado-terminado',
                'Cancelado': 'estado-cancelado'
            }[estado] || 'estado-agendado';

            const badgeClass = {
                'Agendado': 'agendado',
                'Em Jogo': 'em-jogo',
                'Terminado': 'terminado',
                'Cancelado': 'cancelado'
            }[estado] || 'agendado';

            const casaNome = jogo.equipa_casa?.nome || 'Equipa A';
            const foraNome = jogo.equipa_fora?.nome || 'Equipa B';
            const rc = jogo.resultado_casa !== null && jogo.resultado_casa !== undefined ? jogo.resultado_casa : '';
            const rf = jogo.resultado_fora !== null && jogo.resultado_fora !== undefined ? jogo.resultado_fora : '';

            let dataStr = 'Data a definir';
            let horaStr = '';
            if (jogo.data_hora) {
                const dt = new Date(jogo.data_hora);
                dataStr = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                horaStr = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            }

            const card = document.createElement('div');
            card.className = `op-jogo-card ${estadoClass}`;
            card.dataset.jogoId = jogo.id;

            card.innerHTML = `
                <div class="op-jogo-header">
                    <div class="op-jogo-meta">
                        ${jogo.escalao ? `<strong>${jogo.escalao}</strong> &middot; ` : ''}
                        ${dataStr}${horaStr ? ` &middot; ${horaStr}` : ''}
                        ${jogo.campo ? ` &middot; <strong>${jogo.campo}</strong>` : ''}
                    </div>
                    <span class="op-badge ${badgeClass}">${estado}</span>
                </div>
                <div class="op-equipa-row">
                    <span class="op-equipa-nome">${casaNome}</span>
                    <input class="op-resultado-input" type="number" min="0" placeholder="−"
                        data-id="${jogo.id}" data-side="casa" value="${rc}">
                </div>
                <div class="op-equipa-row">
                    <span class="op-equipa-nome">${foraNome}</span>
                    <input class="op-resultado-input" type="number" min="0" placeholder="−"
                        data-id="${jogo.id}" data-side="fora" value="${rf}">
                </div>
                <div class="op-controls">
                    <select class="op-estado-select" data-id="${jogo.id}">
                        <option value="Agendado"  ${estado === 'Agendado' ? 'selected' : ''}>Agendado</option>
                        <option value="Em Jogo"   ${estado === 'Em Jogo' ? 'selected' : ''}>Em Jogo</option>
                        <option value="Terminado" ${estado === 'Terminado' ? 'selected' : ''}>Terminado</option>
                        <option value="Cancelado" ${estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                    <button class="op-save-btn" data-id="${jogo.id}">Guardar</button>
                    <span class="op-feedback" data-id="${jogo.id}" style="display:none"></span>
                </div>
            `;

            container.appendChild(card);
        });

        // Listeners nos botões Guardar
        container.querySelectorAll('.op-save-btn').forEach(btn => {
            btn.addEventListener('click', () => saveJogo(btn.dataset.id));
        });
    }

    async function saveJogo(id) {
        const card = document.querySelector(`.op-jogo-card[data-jogo-id="${id}"]`);
        if (!card) return;

        const btn = card.querySelector('.op-save-btn');
        const feedback = card.querySelector('.op-feedback');
        const estado = card.querySelector('.op-estado-select').value;
        const rcRaw = card.querySelector('.op-resultado-input[data-side="casa"]').value;
        const rfRaw = card.querySelector('.op-resultado-input[data-side="fora"]').value;

        const resultadoCasa = rcRaw !== '' ? parseInt(rcRaw) : null;
        const resultadoFora = rfRaw !== '' ? parseInt(rfRaw) : null;

        btn.textContent = 'A guardar...';
        btn.classList.add('saving');
        btn.disabled = true;

        const { error } = await supabase
            .from('jogos')
            .update({ estado, resultado_casa: resultadoCasa, resultado_fora: resultadoFora })
            .eq('id', id);

        btn.textContent = 'Guardar';
        btn.classList.remove('saving');
        btn.disabled = false;

        if (error) {
            feedback.textContent = '❌ Erro ao guardar';
            feedback.style.color = '#c62828';
        } else {
            feedback.textContent = '✅ Guardado!';
            feedback.style.color = '#2E7D32';
            // Atualizar no array local para que o re-render seja consistente
            const jogo = (window._opAllJogos || []).find(j => String(j.id) === String(id));
            if (jogo) {
                jogo.estado = estado;
                jogo.resultado_casa = resultadoCasa;
                jogo.resultado_fora = resultadoFora;
            }
            // Atualizar badge e classe do card sem re-render total
            const badge = card.querySelector('.op-badge');
            const badgeClass = { 'Agendado': 'agendado', 'Em Jogo': 'em-jogo', 'Terminado': 'terminado', 'Cancelado': 'cancelado' }[estado] || 'agendado';
            badge.textContent = estado;
            badge.className = `op-badge ${badgeClass}`;
            card.className = `op-jogo-card estado-${badgeClass}`;
        }

        feedback.style.display = 'inline';
        setTimeout(() => { feedback.style.display = 'none'; }, 2500);
    }
});
