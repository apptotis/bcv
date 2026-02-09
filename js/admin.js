document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase (Mesma lógica do script.js, mas focada no admin)
    let supabase;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY !== 'SUA_SUPABASE_ANON_KEY_AQUI') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase não configurado no admin.js");
        return;
    }

    // Elementos DOM Auth
    const loginContainer = document.getElementById('admin-login-container');
    const adminPanel = document.getElementById('admin-panel');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const loginError = document.getElementById('login-error');

    // Elementos DOM Abas
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // --- AUTENTICAÇÃO ---

    // Verificar sessão atual
    const { data: { session } } = await supabase.auth.getSession();
    updateUI(session);

    // Listener para mudanças de auth
    supabase.auth.onAuthStateChange((event, session) => {
        updateUI(session);
    });

    function updateUI(session) {
        if (session) {
            loginContainer.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            loadAdminData(); // Carregar dados do dashboard
        } else {
            loginContainer.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    }

    // Login
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        loginError.classList.add('hidden');

        if (!email || !password) {
            showError("Preencha email e senha.");
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showError("Erro: " + error.message);
        } else {
            // Sucesso - o listener cuidará da UI
            emailInput.value = '';
            passwordInput.value = '';
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }

    // --- NAVEGAÇÃO DE ABAS ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de tudo
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tabPanes.forEach(p => p.classList.add('hidden'));

            // Ativar atual
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(tabId);
            targetPane.classList.remove('hidden');
            targetPane.classList.add('active');
        });
    });

    // --- CARREGAMENTO DE DADOS (Início) ---
    async function loadAdminData() {
        console.log("Carregando dados do admin...");
        // Aqui vamos chamar as funções de listar equipas, atletas e jogos
        await loadTeamsOptions(); // Preencher selects
    }

    // Preencher Selects de Equipas (para forms de atletas e jogos)
    async function loadTeamsOptions() {
        const { data: equipas, error } = await supabase.from('equipas').select('id, nome');
        if (error) return console.error(error);

        const atletaSelect = document.getElementById('atleta-equipa-id');
        const casaSelect = document.getElementById('jogo-equipa-casa');
        const foraSelect = document.getElementById('jogo-equipa-fora');

        // Limpar e popular
        [atletaSelect, casaSelect, foraSelect].forEach(sel => {
            sel.innerHTML = '<option value="" disabled selected>Selecionar Equipa</option>';
            equipas.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = e.nome;
                sel.appendChild(opt);
            });
        });
    }

    // --- CRUD EQUIPAS (Placeholder) ---
    const formEquipa = document.getElementById('form-equipa');
    formEquipa.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Criar Equipa: funcionalidade em implementação...");
        // Implementar lógica de upload + insert
    });

    // --- CRUD ATLETAS (Placeholder) ---
    const formAtleta = document.getElementById('form-atleta');
    formAtleta.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Criar Atleta: funcionalidade em implementação...");
    });

    // --- CRUD JOGOS (Placeholder) ---
    const formJogo = document.getElementById('form-jogo');
    formJogo.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Criar Jogo: funcionalidade em implementação...");
    });

});
