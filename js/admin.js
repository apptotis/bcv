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


    // Login - usar submit do form para funcionar no mobile
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir reload da página

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
    }


    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html'; // Redirecionar para página principal
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
        await loadTeamsOptions();
        await loadEquipasAdmin();
        await loadAtletasAdmin(); // Carregar atletas
        await loadJogosAdmin(); // Carregar jogos
    }

    // Preencher Selects de Equipas
    async function loadTeamsOptions() {
        const { data: equipas, error } = await supabase.from('equipas').select('id, nome, escalao');
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
                // Exibe Nome e Escalão
                opt.textContent = `${e.nome} (${e.escalao || 'Sem Escalão'})`;
                sel.appendChild(opt);
            });
        });
    }

    // --- CRUD ATLETAS ---
    const formAtleta = document.getElementById('form-atleta');
    let editingAtletaId = null; // Estado para edição

    formAtleta.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('atleta-nome').value;
        const equipaId = document.getElementById('atleta-equipa-id').value;
        const fotoFile = document.getElementById('atleta-foto-file').files[0];

        let fotoUrl = null;

        try {
            if (!equipaId) throw new Error("Selecione uma equipa.");

            // Upload Foto
            if (fotoFile) {
                const fileName = `atleta_${Date.now()}_${fotoFile.name.replace(/\s/g, '_')}`;

                // Usando mesmo bucket 'fotos' ou poderia ser um novo 'atletas'
                const { data, error } = await supabase.storage
                    .from('fotos')
                    .upload(fileName, fotoFile);

                if (error) throw error;

                const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                fotoUrl = publicData.publicUrl;
            }

            // Insert Database
            const updates = {
                nome,
                equipa_id: equipaId
            };
            if (fotoUrl) updates.foto_url = fotoUrl;

            if (editingAtletaId) {
                // UPDATE
                const { error } = await supabase.from('atletas').update(updates).eq('id', editingAtletaId);
                if (error) throw error;
                alert("Atleta atualizado com sucesso!");
            } else {
                // INSERT
                const { error } = await supabase.from('atletas').insert([updates]);
                if (error) throw error;
                alert("Atleta adicionado com sucesso!");
            }

            // Reset
            formAtleta.reset();
            editingAtletaId = null;
            const btn = formAtleta.querySelector('button[type="submit"]');
            if (btn) btn.textContent = "Adicionar Atleta";

            loadAtletasAdmin(); // Atualiza lista

        } catch (err) {
            console.error(err);
            alert("Erro: " + err.message);
        }
    });

    async function loadAtletasAdmin() {
        const listContainer = document.getElementById('admin-atletas-list');
        listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('atletas')
            .select('*, equipas(nome, escalao)')
            .order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar lista de atletas.';
            console.error(error);
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) listContainer.innerHTML = '<p>Nenhum atleta cadastrado.</p>';

        data.forEach(atleta => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '10px 0';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            // Tratamento caso a equipa tenha sido deletada
            const nomeEquipa = atleta.equipas ? `${atleta.equipas.nome} (${atleta.equipas.escalao})` : 'Equipa desconhecida';

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${atleta.foto_url
                    ? `<img src="${atleta.foto_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
                    : '<div style="width: 40px; height: 40px; background: #eee; border-radius: 50%;"></div>'}
                    <div>
                        <strong>${atleta.nome}</strong>
                        <br>
                        <small>${nomeEquipa}</small>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-success btn-sm" onclick="editAtleta('${atleta.id}')">Editar</button>
                    <button class="btn-danger btn-sm" onclick="deleteAtleta('${atleta.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    // Função Global de Edição de Atleta
    window.editAtleta = async (id) => {
        const { data: atleta, error } = await supabase.from('atletas').select('*').eq('id', id).single();
        if (error) {
            alert("Erro ao buscar atleta: " + error.message);
            return;
        }

        document.getElementById('atleta-nome').value = atleta.nome;
        document.getElementById('atleta-equipa-id').value = atleta.equipa_id;

        editingAtletaId = id;
        const btn = formAtleta.querySelector('button[type="submit"]');
        if (btn) btn.textContent = "Atualizar Atleta";

        formAtleta.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteAtleta = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este atleta?")) return;

        const { error } = await supabase.from('atletas').delete().eq('id', id);
        if (error) {
            alert("Erro ao apagar: " + error.message);
        } else {
            loadAtletasAdmin();
        }
    };

    // --- CRUD JOGOS ---
    const formJogo = document.getElementById('form-jogo');
    let editingJogoId = null;

    formJogo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const equipaCasaId = document.getElementById('jogo-equipa-casa').value;
        const equipaForaId = document.getElementById('jogo-equipa-fora').value;
        const dataHora = document.getElementById('jogo-data').value;
        const campo = document.getElementById('jogo-campo').value;

        try {
            // Validar que as equipas são diferentes
            if (equipaCasaId === equipaForaId) {
                throw new Error("As equipas devem ser diferentes!");
            }

            // Buscar escalão da equipa casa (assumindo que ambas são do mesmo escalão)
            const { data: equipaCasa, error: errorEquipa } = await supabase
                .from('equipas')
                .select('escalao')
                .eq('id', equipaCasaId)
                .single();

            if (errorEquipa) throw errorEquipa;

            const updates = {
                equipa_casa_id: equipaCasaId,
                equipa_fora_id: equipaForaId,
                escalao: equipaCasa.escalao,
                data_hora: dataHora || null,
                campo: campo || null
            };

            if (editingJogoId) {
                // UPDATE
                const { error } = await supabase.from('jogos').update(updates).eq('id', editingJogoId);
                if (error) throw error;
                alert("Jogo atualizado com sucesso!");
            } else {
                // INSERT
                const { error } = await supabase.from('jogos').insert([updates]);
                if (error) throw error;
                alert("Jogo agendado com sucesso!");
            }

            // Reset
            formJogo.reset();
            editingJogoId = null;
            const btn = formJogo.querySelector('button[type="submit"]');
            if (btn) btn.textContent = "Agendar Jogo";

            loadJogosAdmin();

        } catch (err) {
            console.error(err);
            alert("Erro: " + err.message);
        }
    });

    async function loadJogosAdmin() {
        const listContainer = document.getElementById('admin-jogos-list');
        listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('jogos')
            .select(`
                *,
                equipa_casa:equipas!equipa_casa_id(nome, escalao),
                equipa_fora:equipas!equipa_fora_id(nome, escalao)
            `)
            .order('data_hora', { ascending: true });

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar lista de jogos.';
            console.error(error);
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) listContainer.innerHTML = '<p>Nenhum jogo agendado.</p>';

        data.forEach(jogo => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '10px 0';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            const equipaCasa = jogo.equipa_casa?.nome || 'Equipa desconhecida';
            const equipaFora = jogo.equipa_fora?.nome || 'Equipa desconhecida';
            const dataHora = jogo.data_hora ? new Date(jogo.data_hora).toLocaleString('pt-PT') : 'Data a definir';

            div.innerHTML = `
                <div>
                    <strong>${equipaCasa} vs ${equipaFora}</strong>
                    <br>
                    <small>${jogo.escalao || ''} | ${dataHora} | ${jogo.campo || 'Campo a definir'}</small>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-success btn-sm" onclick="editJogo('${jogo.id}')">Editar</button>
                    <button class="btn-danger btn-sm" onclick="deleteJogo('${jogo.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    // Função Global de Edição de Jogo
    window.editJogo = async (id) => {
        const { data: jogo, error } = await supabase.from('jogos').select('*').eq('id', id).single();
        if (error) {
            alert("Erro ao buscar jogo: " + error.message);
            return;
        }

        document.getElementById('jogo-equipa-casa').value = jogo.equipa_casa_id;
        document.getElementById('jogo-equipa-fora').value = jogo.equipa_fora_id;

        // Converter data para formato datetime-local
        if (jogo.data_hora) {
            const date = new Date(jogo.data_hora);
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            document.getElementById('jogo-data').value = localDateTime;
        }

        document.getElementById('jogo-campo').value = jogo.campo || '';

        editingJogoId = id;
        const btn = formJogo.querySelector('button[type="submit"]');
        if (btn) btn.textContent = "Atualizar Jogo";

        formJogo.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteJogo = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este jogo?")) return;

        const { error } = await supabase.from('jogos').delete().eq('id', id);
        if (error) {
            alert("Erro ao apagar: " + error.message);
        } else {
            loadJogosAdmin();
        }
    };

    // --- CRUD EQUIPAS ---
    const formEquipa = document.getElementById('form-equipa');
    let editingEquipaId = null; // Estado para edição

    // Carregar lista de equipas ao iniciar
    loadEquipasAdmin();

    formEquipa.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('equipa-nome').value;
        const escalao = document.getElementById('equipa-escalao').value;
        const genero = document.getElementById('equipa-genero').value;
        const local = document.getElementById('equipa-local').value;
        const desc = document.getElementById('equipa-desc').value;
        const treinadores = document.getElementById('equipa-treinadores').value;
        const shadowColor = document.getElementById('equipa-shadow-color').value;
        const backgroundOpacity = parseInt(document.getElementById('equipa-background-opacity').value);
        const logoFile = document.getElementById('equipa-logo-file').files[0];
        const fotoFile = document.getElementById('equipa-foto-file').files[0];

        let logoUrl = null;
        let fotoUrl = null;

        try {
            // 1. Upload Logo (se existir)
            if (logoFile) {
                const fileName = `logo_${Date.now()}_${logoFile.name.replace(/\s/g, '_')}`;
                const { data, error } = await supabase.storage.from('logos').upload(fileName, logoFile);
                if (error) throw error;
                const { data: publicData } = supabase.storage.from('logos').getPublicUrl(fileName);
                logoUrl = publicData.publicUrl;
            }

            // 2. Upload Foto de Grupo (se existir)
            if (fotoFile) {
                const fileName = `grupo_${Date.now()}_${fotoFile.name.replace(/\s/g, '_')}`;
                const { data, error } = await supabase.storage.from('fotos').upload(fileName, fotoFile);
                if (error) throw error;
                const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                fotoUrl = publicData.publicUrl;
            }

            // 3. Montar Objeto de Dados
            const updates = {
                nome,
                escalao,
                genero,
                localizacao: local,
                descricao: desc,
                treinadores,
                shadow_color: shadowColor,
                background_opacity: backgroundOpacity
            };
            if (logoUrl) updates.logo_url = logoUrl;
            if (fotoUrl) updates.foto_grupo_url = fotoUrl;

            // 4. Insert ou Update
            if (editingEquipaId) {
                // UPDATE
                const { error } = await supabase.from('equipas').update(updates).eq('id', editingEquipaId);
                if (error) throw error;
                alert("Equipa atualizada com sucesso!");
            } else {
                // INSERT
                const { error } = await supabase.from('equipas').insert([updates]);
                if (error) throw error;
                alert("Equipa criada com sucesso!");
            }

            // Reset
            formEquipa.reset();
            editingEquipaId = null;
            const btn = formEquipa.querySelector('button[type="submit"]');
            if (btn) btn.textContent = "Adicionar Equipa";

            loadEquipasAdmin();
            loadTeamsOptions();

        } catch (err) {
            console.error(err);
            alert("Erro: " + err.message);
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
                    <small>${equipa.genero || 'Género não definido'} | ${equipa.treinadores || ''}</small>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-success btn-sm" onclick="editEquipa('${equipa.id}')">Editar</button>
                    <button class="btn-danger btn-sm" onclick="deleteEquipa('${equipa.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    // Função Global de Edição
    window.editEquipa = async (id) => {
        // Buscar dados atuais da equipa
        const { data: equipa, error } = await supabase.from('equipas').select('*').eq('id', id).single();

        if (error) {
            alert("Erro ao buscar equipa: " + error.message);
            return;
        }

        // Preencher formulário
        document.getElementById('equipa-nome').value = equipa.nome;
        document.getElementById('equipa-escalao').value = equipa.escalao || '';
        document.getElementById('equipa-genero').value = equipa.genero || '';
        document.getElementById('equipa-local').value = equipa.localizacao || '';
        document.getElementById('equipa-desc').value = equipa.descricao || '';
        document.getElementById('equipa-treinadores').value = equipa.treinadores || '';
        document.getElementById('equipa-shadow-color').value = equipa.shadow_color || '#3b82f6';
        const opacityValue = equipa.background_opacity || 10;
        document.getElementById('equipa-background-opacity').value = opacityValue;
        document.getElementById('opacity-value').textContent = opacityValue;

        // Alterar estado para edição
        editingEquipaId = id;
        const btn = formEquipa.querySelector('button[type="submit"]');
        if (btn) btn.textContent = "Atualizar Equipa";

        // Scroll para o topo do form para facilitar
        formEquipa.scrollIntoView({ behavior: 'smooth' });
    };

    // Função Global para deletar
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

});
