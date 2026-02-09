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

    // --- CRUD EQUIPAS ---
    const formEquipa = document.getElementById('form-equipa');

    // Carregar lista de equipas ao iniciar
    loadEquipasAdmin();

    formEquipa.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('equipa-nome').value;
        const escalao = document.getElementById('equipa-escalao').value;
        const local = document.getElementById('equipa-local').value;
        const desc = document.getElementById('equipa-desc').value;
        const treinadores = document.getElementById('equipa-treinadores').value;
        const logoFile = document.getElementById('equipa-logo-file').files[0];
        const fotoFile = document.getElementById('equipa-foto-file').files[0];

        let logoUrl = null;
        let fotoUrl = null;

        try {
            // 1. Upload Logo (se existir)
            if (logoFile) {
                const fileName = `logo_${Date.now()}_${logoFile.name.replace(/\s/g, '_')}`;
                const { data, error } = await supabase.storage
                    .from('logos') // Requer bucket 'logos' criado no Supabase
                    .upload(fileName, logoFile);

                if (error) throw error;

                // Pegar URL pública
                const { data: publicData } = supabase.storage.from('logos').getPublicUrl(fileName);
                logoUrl = publicData.publicUrl;
            }

            // 2. Upload Foto de Grupo (se existir)
            if (fotoFile) {
                const fileName = `grupo_${Date.now()}_${fotoFile.name.replace(/\s/g, '_')}`;
                const { data, error } = await supabase.storage
                    .from('fotos') // Requer bucket 'fotos' criado
                    .upload(fileName, fotoFile);

                if (error) throw error;

                const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                fotoUrl = publicData.publicUrl;
            }

            // 3. Insert Database
            const { error: insertError } = await supabase
                .from('equipas')
                .insert([{
                    nome,
                    escalao,
                    localizacao: local,
                    descricao: desc,
                    treinadores,
                    logo_url: logoUrl,
                    foto_grupo_url: fotoUrl
                }]);

            if (insertError) throw insertError;

            alert("Equipa criada com sucesso!");
            formEquipa.reset();
            loadEquipasAdmin(); // Atualiza a lista
            loadTeamsOptions(); // Atualiza os selects

        } catch (err) {
            console.error(err);
            alert("Erro ao criar equipa: " + err.message);
        }
    });

    async function loadEquipasAdmin() {
        const listContainer = document.getElementById('admin-equipas-list');
        listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('equipas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar lista.';
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) listContainer.innerHTML = '<p>Nenhuma equipa cadastrada.</p>';

        data.forEach(equipa => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '10px 0';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            div.innerHTML = `
                <div>
                    <strong>${equipa.nome}</strong> (${equipa.escalao || '-'})
                    <br>
                    <small>${equipa.treinadores || ''}</small>
                </div>
                <button class="btn-danger btn-sm" onclick="deleteEquipa('${equipa.id}')">Excluir</button>
            `;
            listContainer.appendChild(div);
        });
    }

    // Função Global para deletar (precisa estar no window para o onclick funcionar)
    window.deleteEquipa = async (id) => {
        if (!confirm("Tem certeza que deseja apagar esta equipa?")) return;

        const { error } = await supabase.from('equipas').delete().eq('id', id);
        if (error) {
            alert("Erro ao apagar: " + error.message);
        } else {
            loadEquipasAdmin();
            loadTeamsOptions();
        }
    };

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
