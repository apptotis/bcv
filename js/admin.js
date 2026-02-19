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
        await loadEventosAdmin(); // Carregar eventos
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
        const tecnico = document.getElementById('equipa-tecnico').value;
        const facebookUrl = document.getElementById('equipa-facebook').value;
        const instagramUrl = document.getElementById('equipa-instagram').value;
        const websiteUrl = document.getElementById('equipa-website').value;
        const shadowColor = document.getElementById('equipa-shadow-color').value;
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
                tecnico,
                facebook_url: facebookUrl || null,
                instagram_url: instagramUrl || null,
                website_url: websiteUrl || null,
                shadow_color: shadowColor
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
                    <small>${equipa.genero || 'Género não definido'} | ${equipa.tecnico || ''}</small>
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
        document.getElementById('equipa-tecnico').value = equipa.tecnico || '';
        document.getElementById('equipa-facebook').value = equipa.facebook_url || '';
        document.getElementById('equipa-instagram').value = equipa.instagram_url || '';
        document.getElementById('equipa-website').value = equipa.website_url || '';
        document.getElementById('equipa-shadow-color').value = equipa.shadow_color || '#3b82f6';

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

    // --- CRUD EVENTOS ---
    const formEvento = document.getElementById('form-evento');
    let editingEventoId = null;

    if (formEvento) {
        formEvento.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isPublico = document.getElementById('evento-publico').value === 'true';
            const tipoId = parseInt(document.getElementById('evento-tipo').value);
            const local = document.getElementById('evento-local').value.trim();
            const dataHora = document.getElementById('evento-data').value;
            const tecnicos = document.getElementById('evento-tecnicos').value.trim();
            const descricao = document.getElementById('evento-descricao').value.trim();

            try {
                if (!tipoId) throw new Error('Selecione um tipo de evento.');
                if (!local) throw new Error('Indique o local do evento.');
                if (!dataHora) throw new Error('Indique a data e hora do evento.');

                const updates = {
                    is_publico: isPublico,
                    tipo_evento_id: tipoId,
                    local,
                    data_hora: dataHora,
                    tecnicos: tecnicos || null,
                    descricao: descricao || null
                };

                if (editingEventoId) {
                    const { error } = await supabase.from('eventos').update(updates).eq('id', editingEventoId);
                    if (error) throw error;
                    alert('Evento atualizado com sucesso!');
                } else {
                    const { error } = await supabase.from('eventos').insert([updates]);
                    if (error) throw error;
                    alert('Evento adicionado com sucesso!');
                }

                formEvento.reset();
                editingEventoId = null;
                const btn = formEvento.querySelector('button[type="submit"]');
                if (btn) btn.textContent = 'Adicionar Evento';

                loadEventosAdmin();

            } catch (err) {
                console.error(err);
                alert('Erro: ' + err.message);
            }
        });
    }

    // Mapa de ícones por tipo
    const adminEventoIcons = {
        1: '\uD83C\uDFC0', 2: '\uD83D\uDCF8', 3: '\uD83C\uDF7D\uFE0F', 4: '\uD83C\uDF77', 5: '\uD83E\uDD50',
        6: '\uD83C\uDF88', 7: '\uD83C\uDFCA', 8: '\uD83E\uDDF1', 9: '\uD83C\uDFB6', 10: '\u26A1',
        11: '\uD83C\uDFC1', 12: '\uD83C\uDF89', 13: '\uD83C\uDF32'
    };

    const tipoNomes = {
        1: 'Jogo', 2: 'Sess\u00e3o Fotogr\u00e1fica', 3: 'Almo\u00e7o', 4: 'Jantar', 5: 'Pequeno Almo\u00e7o',
        6: 'Insufl\u00e1veis', 7: 'Piscina', 8: 'Passeio Muralhas', 9: 'Discoteca',
        10: 'Jogo Elimina', 11: 'Encerramento', 12: 'Abertura Torneio', 13: 'Arborismo'
    };

    async function loadEventosAdmin() {
        const listContainer = document.getElementById('admin-eventos-list');
        if (!listContainer) return;
        listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('data_hora', { ascending: true });

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar eventos.';
            console.error(error);
            return;
        }

        listContainer.innerHTML = '';
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<p>Nenhum evento criado.</p>';
            return;
        }

        data.forEach(evento => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '10px 0';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            const dataHora = evento.data_hora
                ? new Date(evento.data_hora).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Data a definir';
            const icone = adminEventoIcons[evento.tipo_evento_id] || '\uD83D\uDCC5';
            const tipo = tipoNomes[evento.tipo_evento_id] || 'Evento';
            const visib = evento.is_publico ? '\uD83D\uDFE2 P\u00fablico' : '\uD83D\uDD34 Privado';

            div.innerHTML = `
                <div>
                    <strong>${icone} ${tipo}</strong>
                    <span style="margin-left:8px;font-size:0.8rem;color:#666">${visib}</span>
                    <br>
                    <small>\uD83D\uDCCD ${evento.local} &nbsp; \uD83D\uDDD3\uFE0F ${dataHora}</small>
                    ${evento.tecnicos ? `<br><small>\uD83D\uDC64 ${evento.tecnicos}</small>` : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-success btn-sm" onclick="editEvento('${evento.id}')">Editar</button>
                    <button class="btn-danger btn-sm" onclick="deleteEvento('${evento.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    window.editEvento = async (id) => {
        const { data: evento, error } = await supabase.from('eventos').select('*').eq('id', id).single();
        if (error) { alert('Erro ao buscar evento: ' + error.message); return; }

        document.getElementById('evento-publico').value = String(evento.is_publico);
        document.getElementById('evento-tipo').value = evento.tipo_evento_id || '';
        document.getElementById('evento-local').value = evento.local || '';
        document.getElementById('evento-tecnicos').value = evento.tecnicos || '';
        document.getElementById('evento-descricao').value = evento.descricao || '';

        if (evento.data_hora) {
            const date = new Date(evento.data_hora);
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('evento-data').value = local;
        }

        editingEventoId = id;
        const btn = formEvento.querySelector('button[type="submit"]');
        if (btn) btn.textContent = 'Atualizar Evento';
        formEvento.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteEvento = async (id) => {
        if (!confirm('Tem certeza que deseja apagar este evento?')) return;
        const { error } = await supabase.from('eventos').delete().eq('id', id);
        if (error) {
            alert('Erro ao apagar: ' + error.message);
        } else {
            loadEventosAdmin();
        }
    };

});
