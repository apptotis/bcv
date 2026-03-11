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
        await loadAtletasAdmin();
        await loadJogosAdmin();
        await loadTipoEventos(); // Carregar tipos de evento
        await loadEventosAdmin();
        await loadPatrocinadoresAdmin();
        await loadGeralAdmin();
    }

    // Preencher Selects de Equipas
    async function loadTeamsOptions() {
        const { data: equipas, error } = await supabase.from('equipas').select('id, nome, escalao, genero').order('escalao').order('nome');
        if (error) return console.error(error);

        const atletaSelect = document.getElementById('atleta-equipa-id');
        const casaSelect = document.getElementById('jogo-equipa-casa');
        const foraSelect = document.getElementById('jogo-equipa-fora');
        const filtroAtletaSelect = document.getElementById('filtro-atleta-equipa');

        // Limpar e popular
        [atletaSelect, casaSelect, foraSelect].forEach(sel => {
            if (!sel) return;
            sel.innerHTML = '<option value="" disabled selected>Selecionar Equipa</option>';
            equipas.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                // Exibe Escalão, Género e Nome
                const escalao = e.escalao || 'Sem Escalão';
                const genero = e.genero ? ` ${e.genero}` : '';
                opt.textContent = `[${escalao}${genero}] ${e.nome}`;
                sel.appendChild(opt);
            });
        });

        // Popular filtro de atletas
        if (filtroAtletaSelect) {
            filtroAtletaSelect.innerHTML = '<option value="">Filtrar por Equipa (Todas)</option>';
            equipas.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                const escalao = e.escalao || 'Sem Escalão';
                const genero = e.genero ? ` ${e.genero}` : '';
                opt.textContent = `[${escalao}${genero}] ${e.nome}`;
                filtroAtletaSelect.appendChild(opt);
            });
        }
    }

    // --- CRUD ATLETAS ---
    const formAtleta = document.getElementById('form-atleta');
    let editingAtletaId = null; // Estado para edição

    formAtleta.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('atleta-nome').value;
        const numero = document.getElementById('atleta-numero').value;
        const funcaoSelect = document.getElementById('atleta-funcao');
        const funcaoCustomInput = document.getElementById('atleta-funcao-custom');
        const funcaoCustomWrap = document.getElementById('atleta-funcao-custom-wrap');
        const funcao = funcaoSelect.value === 'Outro' ? funcaoCustomInput.value : funcaoSelect.value;
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
                equipa_id: equipaId,
                numero: (numero !== '' && numero !== null) ? parseInt(numero) : null,
                funcao: funcao || 'Jogador'
            };
            if (fotoUrl) updates.foto_url = fotoUrl;

            console.log('Enviando updates para atleta:', updates);

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

            // Reset custom field wrap
            if (funcaoCustomWrap) funcaoCustomWrap.classList.add('hidden');

            loadAtletasAdmin(); // Atualiza lista

        } catch (err) {
            console.error(err);
            alert("Erro: " + err.message);
        }
    });

    async function loadAtletasAdmin() {
        const listContainer = document.getElementById('admin-atletas-list');
        if (listContainer) listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('atletas')
            .select('*, equipas(nome, escalao)')
            .order('created_at', { ascending: false });

        if (error) {
            if (listContainer) listContainer.innerHTML = 'Erro ao carregar lista de atletas.';
            console.error(error);
            return;
        }

        window.allAtletasAdmin = data || [];

        // Ligar filtros de atletas (apenas na primeira carga)
        if (!window._filtrosAtletasAdmin) {
            window._filtrosAtletasAdmin = true;

            const filtroAtletaEquipa = document.getElementById('filtro-atleta-equipa');
            if (filtroAtletaEquipa) {
                filtroAtletaEquipa.addEventListener('change', filtrarERenderizerAtletasAdmin);
            }

            const btnLimpar = document.getElementById('btn-limpar-filtros-atletas');
            if (btnLimpar) {
                btnLimpar.addEventListener('click', () => {
                    if (filtroAtletaEquipa) filtroAtletaEquipa.value = '';
                    filtrarERenderizerAtletasAdmin();
                });
            }
        }

        filtrarERenderizerAtletasAdmin();
    }

    function filtrarERenderizerAtletasAdmin() {
        const listContainer = document.getElementById('admin-atletas-list');
        if (!listContainer) return;

        const data = window.allAtletasAdmin || [];
        const filtroEquipaId = document.getElementById('filtro-atleta-equipa')?.value || '';

        const filtrados = data.filter(atleta => {
            if (filtroEquipaId && String(atleta.equipa_id) !== filtroEquipaId) return false;
            return true;
        });

        listContainer.innerHTML = '';
        if (filtrados.length === 0) {
            listContainer.innerHTML = data.length === 0 ? '<p>Nenhum atleta cadastrado.</p>' : '<p>Nenhum atleta encontrado com este filtro.</p>';
            return;
        }

        filtrados.forEach(atleta => {
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
                        <strong>${atleta.nome} ${(atleta.numero !== null && atleta.numero !== undefined) ? `<span style="color: #666;">(#${atleta.numero})</span>` : ''}</strong>
                        <br>
                        <small>${atleta.funcao || 'Jogador'} - ${nomeEquipa}</small>
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
        document.getElementById('atleta-numero').value = (atleta.numero !== null && atleta.numero !== undefined) ? atleta.numero : '';
        const funcaoSelect = document.getElementById('atleta-funcao');
        const predefinedFunctions = ["Jogador", "Treinador", "Treinador Adjunto", "Team Manager", "Fisioterapeuta"];

        if (predefinedFunctions.includes(atleta.funcao)) {
            funcaoSelect.value = atleta.funcao;
            document.getElementById('atleta-funcao-custom-wrap').classList.add('hidden');
            document.getElementById('atleta-funcao-custom').value = '';
        } else {
            funcaoSelect.value = 'Outro';
            document.getElementById('atleta-funcao-custom-wrap').classList.remove('hidden');
            document.getElementById('atleta-funcao-custom').value = atleta.funcao || '';
        }

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
        const estado = document.getElementById('jogo-estado').value;
        const campo = document.getElementById('jogo-campo').value;
        const resultadoCasaRaw = document.getElementById('jogo-resultado-casa').value;
        const resultadoForaRaw = document.getElementById('jogo-resultado-fora').value;
        const resultadoCasa = resultadoCasaRaw !== '' ? parseInt(resultadoCasaRaw) : null;
        const resultadoFora = resultadoForaRaw !== '' ? parseInt(resultadoForaRaw) : null;

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
                data_hora: dataHora ? new Date(dataHora).toISOString() : null,
                estado: estado || 'Agendado',
                campo: campo || null,
                resultado_casa: resultadoCasa,
                resultado_fora: resultadoFora
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

        const [{ data, error }, { data: equipas }] = await Promise.all([
            supabase
                .from('jogos')
                .select(`
                    *,
                    equipa_casa:equipas!equipa_casa_id(nome, escalao),
                    equipa_fora:equipas!equipa_fora_id(nome, escalao)
                `)
                .order('data_hora', { ascending: true }),
            supabase
                .from('equipas')
                .select('id, nome, escalao, genero')
                .order('nome')
        ]);

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar lista de jogos.';
            console.error(error);
            return;
        }

        window.allJogosAdmin = data || [];

        // Popular select de clubes e ligar filtros (apenas na primeira carga)
        if (!window._filtrosJogosAdmin) {
            window._filtrosJogosAdmin = true;

            const selectClube = document.getElementById('filtro-clube');
            if (selectClube && equipas) {
                equipas.forEach(e => {
                    const num = (e.escalao || '').replace(/\D/g, '');
                    const gen = e.genero === 'Masculino' ? 'M' : e.genero === 'Feminino' ? 'F' : '';
                    const abrev = num ? ` (${num}${gen})` : '';
                    const opt = document.createElement('option');
                    opt.value = e.id;
                    opt.textContent = `${e.nome}${abrev}`;
                    selectClube.appendChild(opt);
                });
            }

            ['filtro-data', 'filtro-hora', 'filtro-clube', 'filtro-estado'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', filtrarERenderizerJogosAdmin);
            });
            document.getElementById('filtro-hora')?.addEventListener('input', filtrarERenderizerJogosAdmin);

            const btnLimpar = document.getElementById('btn-limpar-filtros');
            if (btnLimpar) btnLimpar.addEventListener('click', () => {
                document.getElementById('filtro-data').value = '';
                document.getElementById('filtro-hora').value = '';
                document.getElementById('filtro-clube').value = '';
                document.getElementById('filtro-estado').value = '';
                filtrarERenderizerJogosAdmin();
            });
        }

        filtrarERenderizerJogosAdmin();
    }

    function filtrarERenderizerJogosAdmin() {
        const listContainer = document.getElementById('admin-jogos-list');
        const data = window.allJogosAdmin || [];

        const filtroData = document.getElementById('filtro-data')?.value || '';
        const filtroHora = document.getElementById('filtro-hora')?.value || '';
        const filtroClubeId = document.getElementById('filtro-clube')?.value || '';
        const filtroEstado = document.getElementById('filtro-estado')?.value || '';

        const filtrados = data.filter(jogo => {
            const dt = jogo.data_hora ? new Date(jogo.data_hora) : null;

            if (filtroData && dt) {
                const jogoData = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD
                if (jogoData !== filtroData) return false;
            }
            if (filtroHora && dt) {
                const jogoHora = dt.toTimeString().slice(0, 5); // HH:MM
                if (jogoHora !== filtroHora) return false;
            }
            if (filtroClubeId) {
                // Filtrar por ID único da equipa
                if (String(jogo.equipa_casa_id) !== filtroClubeId &&
                    String(jogo.equipa_fora_id) !== filtroClubeId) return false;
            }
            if (filtroEstado) {
                const estado = jogo.estado || 'Agendado';
                if (estado !== filtroEstado) return false;
            }
            return true;
        });

        listContainer.innerHTML = '';
        if (filtrados.length === 0) {
            listContainer.innerHTML = '<p>Nenhum jogo encontrado com estes filtros.</p>';
            return;
        }

        filtrados.forEach(jogo => {
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
            const estado = jogo.estado || 'Agendado';

            div.innerHTML = `
                <div>
                    <strong>${equipaCasa} vs ${equipaFora}</strong>
                    <br>
                    <small>${jogo.escalao || ''} | ${dataHora} | ${jogo.campo || 'Campo a definir'} | <em>${estado}</em></small>
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
        document.getElementById('jogo-estado').value = jogo.estado || 'Agendado';

        // Converter data para formato datetime-local
        if (jogo.data_hora) {
            const date = new Date(jogo.data_hora);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            document.getElementById('jogo-data').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        document.getElementById('jogo-campo').value = jogo.campo || '';
        const rc = jogo.resultado_casa;
        const rf = jogo.resultado_fora;
        document.getElementById('jogo-resultado-casa').value = rc !== null && rc !== undefined ? rc : '';
        document.getElementById('jogo-resultado-fora').value = rf !== null && rf !== undefined ? rf : '';

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
                    <span style="margin-left:8px;background:#4a148c;color:#fff;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;">PIN: ${equipa.id}</span>
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
        // Popular grid de checkboxes para eventos privados
        supabase.from('equipas').select('id, nome, escalao, genero').order('nome').then(({ data: eqs }) => {
            const grid = document.getElementById('evento-equipa-id-grid');
            if (grid && eqs) {
                grid.innerHTML = '';
                eqs.forEach(e => {
                    const num = (e.escalao || '').replace(/\D/g, '');
                    const gen = e.genero === 'Masculino' ? 'M' : e.genero === 'Feminino' ? 'F' : '';
                    const abrev = num ? ` (${num}${gen})` : '';

                    const label = document.createElement('label');
                    label.className = 'checkbox-item';
                    label.innerHTML = `
                        <input type="checkbox" value="${e.id}" name="evento-equipas">
                        <span>${e.nome}${abrev}</span>
                    `;
                    grid.appendChild(label);
                });
            }
        });

        // Mostrar/ocultar select de equipa conforme visibilidade
        const selPublico = document.getElementById('evento-publico');
        const wrapEquipa = document.getElementById('evento-equipa-wrap');
        function toggleEquipaWrap() {
            if (wrapEquipa) wrapEquipa.style.display = selPublico.value === 'false' ? 'block' : 'none';
        }
        if (selPublico) { selPublico.addEventListener('change', toggleEquipaWrap); toggleEquipaWrap(); }

        // --- LÓGICA DE FUNÇÃO CUSTOM (ATLETAS) ---
        const atletaFuncaoSelect = document.getElementById('atleta-funcao');
        const atletaFuncaoCustomWrap = document.getElementById('atleta-funcao-custom-wrap');
        if (atletaFuncaoSelect && atletaFuncaoCustomWrap) {
            atletaFuncaoSelect.addEventListener('change', () => {
                if (atletaFuncaoSelect.value === 'Outro') {
                    atletaFuncaoCustomWrap.classList.remove('hidden');
                } else {
                    atletaFuncaoCustomWrap.classList.add('hidden');
                }
            });
        }

        formEvento.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isPublico = document.getElementById('evento-publico').value === 'true';
            const tipoId = parseInt(document.getElementById('evento-tipo').value);
            const local = document.getElementById('evento-local').value.trim();
            const dataHora = document.getElementById('evento-data').value;
            const dataHoraFim = document.getElementById('evento-data-fim').value;
            const tecnicos = document.getElementById('evento-tecnicos').value.trim();
            const descricao = document.getElementById('evento-descricao').value.trim();

            // Obter múltiplas equipas selecionadas (checkboxes)
            const checkboxes = document.querySelectorAll('input[name="evento-equipas"]:checked');
            const equipaIds = Array.from(checkboxes).map(cb => cb.value);

            try {
                if (!tipoId) throw new Error('Selecione um tipo de evento.');
                if (!local) throw new Error('Indique o local do evento.');
                if (!dataHora) throw new Error('Indique a data e hora do evento.');
                if (!isPublico && equipaIds.length === 0) throw new Error('Evento privado requer pelo menos uma equipa.');

                const eventoData = {
                    is_publico: isPublico,
                    tipo_evento_id: tipoId,
                    local,
                    data_hora: dataHora ? new Date(dataHora).toISOString() : null,
                    data_hora_fim: dataHoraFim ? new Date(dataHoraFim).toISOString() : null,
                    tecnicos: tecnicos || null,
                    descricao: descricao || null
                };

                let eventoId = editingEventoId;

                if (editingEventoId) {
                    // Atualizar evento base
                    const { error } = await supabase.from('eventos').update(eventoData).eq('id', editingEventoId);
                    if (error) throw error;

                    // Atualizar equipas: apagar todas e inserir novas
                    await supabase.from('evento_equipas').delete().eq('evento_id', editingEventoId);
                } else {
                    // Criar novo evento
                    const { data, error } = await supabase.from('eventos').insert([eventoData]).select().single();
                    if (error) throw error;
                    eventoId = data.id;
                }

                // Inserir equipas na junction table (se privado e houver equipas)
                if (!isPublico && equipaIds.length > 0) {
                    const insertData = equipaIds.map(eid => ({ evento_id: eventoId, equipa_id: eid }));
                    const { error: errJun } = await supabase.from('evento_equipas').insert(insertData);
                    if (errJun) throw errJun;
                }

                if (editingEventoId) {
                    alert('Evento atualizado com sucesso!');
                } else {
                    alert('Evento adicionado com sucesso!');
                }

                formEvento.reset();
                document.getElementById('evento-data-fim').value = '';
                toggleEquipaWrap();
                editingEventoId = null;
                const btn = formEvento.querySelector('button[type="submit"]');
                if (btn) btn.textContent = 'Adicionar Evento';

                // Limpar seleção do grid
                const checkboxes = document.querySelectorAll('input[name="evento-equipas"]');
                checkboxes.forEach(cb => cb.checked = false);

                loadEventosAdmin();

            } catch (err) {
                console.error(err);
                alert('Erro: ' + err.message);
            }
        });
    }

    // Mapa de ícones por tipo
    const adminEventoIcons = {
        1: '\uD83C\uDFC0', 2: '\uD83D\uDCF8', 3: '\uD83C\uDF7D\uFE0F', 4: '\uD83C\uDF7D\uFE0F', 5: '\uD83C\uDF7D\uFE0F',
        6: '\uD83C\uDF88', 7: '\uD83C\uDFCA', 8: '\uD83E\uDDF1', 9: '\uD83C\uDFB6', 10: '\u26A1',
        11: '\uD83C\uDFC1', 12: '\uD83C\uDF89', 13: '\uD83D\uDCCB'
    };

    let allTipoEventos = []; // Store types globally for names

    async function loadTipoEventos() {
        const select = document.getElementById('evento-tipo');
        const filtroTipo = document.getElementById('filtro-evento-tipo');
        if (!select) return;

        const { data, error } = await supabase.from('tipo_eventos').select('id, nome').order('id');
        if (error) {
            console.error('Erro ao carregar tipos de evento:', error);
            select.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
            return;
        }

        allTipoEventos = data;
        select.innerHTML = '<option value="" disabled selected>Selecionar Tipo de Evento</option>';
        if (filtroTipo) filtroTipo.innerHTML = '<option value="">Todos os Tipos</option>';

        data.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.nome;
            select.appendChild(opt);

            if (filtroTipo) {
                const optFiltro = document.createElement('option');
                optFiltro.value = t.id;
                optFiltro.textContent = t.nome;
                filtroTipo.appendChild(optFiltro);
            }
        });
    }

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

        window.allEventosAdmin = data || [];

        // Ligar filtros apenas na primeira carga
        if (!window._filtrosEventosAdmin) {
            window._filtrosEventosAdmin = true;

            ['filtro-evento-tipo', 'filtro-evento-data', 'filtro-evento-hora'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', filtrarERenderizarEventosAdmin);
            });
            document.getElementById('filtro-evento-hora')?.addEventListener('input', filtrarERenderizarEventosAdmin);

            const btnLimpar = document.getElementById('btn-limpar-filtros-eventos');
            if (btnLimpar) btnLimpar.addEventListener('click', () => {
                document.getElementById('filtro-evento-tipo').value = '';
                document.getElementById('filtro-evento-data').value = '';
                document.getElementById('filtro-evento-hora').value = '';
                filtrarERenderizarEventosAdmin();
            });
        }

        filtrarERenderizarEventosAdmin();
    }

    function filtrarERenderizarEventosAdmin() {
        const listContainer = document.getElementById('admin-eventos-list');
        if (!listContainer) return;
        const data = window.allEventosAdmin || [];

        const filtroTipo = document.getElementById('filtro-evento-tipo')?.value || '';
        const filtroData = document.getElementById('filtro-evento-data')?.value || '';
        const filtroHora = document.getElementById('filtro-evento-hora')?.value || '';

        const filtrados = data.filter(evento => {
            const dt = evento.data_hora ? new Date(evento.data_hora) : null;

            if (filtroTipo) {
                if (String(evento.tipo_evento_id) !== filtroTipo) return false;
            }
            if (filtroData && dt) {
                // Obter a data local como string (YYYY-MM-DD)
                const eventoData = dt.toLocaleDateString('en-CA');
                if (eventoData !== filtroData) return false;
            }
            if (filtroHora && dt) {
                // Obter a hora local como string (HH:MM)
                const eventoHora = dt.toTimeString().slice(0, 5);
                if (eventoHora !== filtroHora) return false;
            }
            return true;
        });

        listContainer.innerHTML = '';
        if (filtrados.length === 0) {
            listContainer.innerHTML = '<p>Nenhum evento encontrado com estes filtros.</p>';
            return;
        }

        filtrados.forEach(evento => {
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
            const tipoObj = allTipoEventos.find(t => t.id === evento.tipo_evento_id);
            const tipo = tipoObj ? tipoObj.nome : 'Evento';
            const visib = evento.is_publico ? '\uD83D\uDFE2 P\u00fablico' : '\uD83D\uDD34 Privado';

            div.innerHTML = `
                <div>
                    <strong>${icone} ${tipo}</strong>
                    <span style="margin-left:8px;font-size:0.8rem;color:#666">${visib}</span>
                    <br>
                    <small>\uD83D\uDCCD ${evento.local} &nbsp; \uD83D\uDDD3\uFE0F ${dataHora}${evento.data_hora_fim ? ` - ${new Date(evento.data_hora_fim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</small>
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

        // Preencher equipas (checkboxes)
        const checkboxes = document.querySelectorAll('input[name="evento-equipas"]');
        checkboxes.forEach(cb => cb.checked = false);

        if (!evento.is_publico) {
            // Buscar equipas associadas
            const { data: relacoes } = await supabase.from('evento_equipas').select('equipa_id').eq('evento_id', id);
            if (relacoes && relacoes.length > 0) {
                const ids = relacoes.map(r => String(r.equipa_id));
                checkboxes.forEach(cb => {
                    if (ids.includes(String(cb.value))) cb.checked = true;
                });
            }
        }

        const selPub = document.getElementById('evento-publico');
        const wrap = document.getElementById('evento-equipa-wrap');
        if (wrap && selPub) wrap.style.display = selPub.value === 'false' ? 'block' : 'none';

        if (evento.data_hora) {
            const date = new Date(evento.data_hora);
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('evento-data').value = local;
        }

        if (evento.data_hora_fim) {
            const date = new Date(evento.data_hora_fim);
            const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('evento-data-fim').value = local;
        } else {
            document.getElementById('evento-data-fim').value = '';
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

    // --- ABA GERAL E EXPORTAÇÃO PDF ---
    async function loadGeralAdmin() {
        const listContainer = document.getElementById('admin-geral-equipas-list');
        if (!listContainer) return;

        const { data: equipas, error } = await supabase
            .from('equipas')
            .select('id, nome, genero, escalao')
            .order('nome');

        if (error) {
            console.error('Erro ao carregar equipas para info geral:', error);
            return;
        }

        window.allEquipasGeral = equipas || [];
        listContainer.innerHTML = '';

        equipas.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.id}</td>
                <td>${e.nome}</td>
                <td>${e.genero || '-'}</td>
                <td>${e.escalao || '-'}</td>
            `;
            listContainer.appendChild(tr);
        });
    }

    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            if (!window.allEquipasGeral || window.allEquipasGeral.length === 0) {
                alert('Nenhuma equipa para exportar.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('Lista de Equipas - Torneio Eurocidade', 14, 20);
            doc.setFontSize(11);
            doc.setTextColor(100);

            const tableData = window.allEquipasGeral.map(e => [
                String(e.id),
                e.nome,
                e.genero || '-',
                e.escalao || '-'
            ]);

            doc.autoTable({
                startY: 30,
                head: [['ID', 'Nome', 'Género', 'Escalão']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [74, 20, 140] } // #4a148c
            });

            doc.save('equipas_torneio.pdf');
        });
    }

    // --- CRUD PATROCINADORES ---
    const formPatrocinador = document.getElementById('form-patrocinador');
    let editingPatrocinadorId = null;

    if (formPatrocinador) {
        formPatrocinador.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('patrocinador-nome').value;
            const tipo = document.getElementById('patrocinador-tipo').value;
            const morada = document.getElementById('patrocinador-morada').value;
            const cp = document.getElementById('patrocinador-cp').value;
            const telefone = document.getElementById('patrocinador-telefone').value;
            const facebook = document.getElementById('patrocinador-facebook').value;
            const instagram = document.getElementById('patrocinador-instagram').value;
            const maps = document.getElementById('patrocinador-maps').value;
            const comer = document.getElementById('patrocinador-comer').checked;
            const dormir = document.getElementById('patrocinador-dormir').checked;
            const logoFile = document.getElementById('patrocinador-logo-file').files[0];

            let logoUrl = null;

            try {
                // Upload Logo if exists
                if (logoFile) {
                    const fileName = `patrocinador_${Date.now()}_${logoFile.name.replace(/\s/g, '_')}`;
                    const { data, error } = await supabase.storage.from('logos').upload(fileName, logoFile);
                    if (error) throw error;
                    const { data: publicData } = supabase.storage.from('logos').getPublicUrl(fileName);
                    logoUrl = publicData.publicUrl;
                }

                const updates = {
                    nome,
                    tipo_servico: tipo,
                    morada,
                    codigo_postal: cp || null,
                    telefone,
                    facebook,
                    instagram,
                    google_maps_url: maps,
                    comer,
                    dormir
                };

                if (logoUrl) updates.logo_url = logoUrl;

                if (editingPatrocinadorId) {
                    const { error } = await supabase.from('patrocinadores').update(updates).eq('id', editingPatrocinadorId);
                    if (error) throw error;
                    alert('Patrocinador atualizado com sucesso!');
                } else {
                    const { error } = await supabase.from('patrocinadores').insert([updates]);
                    if (error) throw error;
                    alert('Patrocinador adicionado com sucesso!');
                }

                formPatrocinador.reset();
                editingPatrocinadorId = null;
                formPatrocinador.querySelector('button[type="submit"]').textContent = 'Adicionar Patrocinador';
                loadPatrocinadoresAdmin();

            } catch (err) {
                console.error(err);
                alert('Erro: ' + err.message);
            }
        });
    }

    async function loadPatrocinadoresAdmin() {
        const listContainer = document.getElementById('admin-patrocinadores-list');
        if (!listContainer) return;

        listContainer.innerHTML = 'Carregando...';

        const { data, error } = await supabase
            .from('patrocinadores')
            .select('*')
            .order('nome');

        if (error) {
            listContainer.innerHTML = 'Erro ao carregar patrocinadores.';
            console.error(error);
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) {
            listContainer.innerHTML = '<p>Nenhum patrocinador cadastrado.</p>';
            return;
        }

        data.forEach(p => {
            const div = document.createElement('div');
            div.className = 'admin-list-item';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '10px 0';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${p.logo_url 
                        ? `<img src="${p.logo_url}" style="width: 40px; height: 40px; object-fit: contain;">` 
                        : '<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px;"></div>'}
                    <div>
                        <strong>${p.nome}</strong> (${p.tipo_servico || 'Sem tipo'})
                        <br>
                        <small>${p.morada || ''} | ${p.telefone || ''}</small>
                        <br>
                        <small>Comer: ${p.comer ? 'Sim' : 'Não'} | Dormir: ${p.dormir ? 'Sim' : 'Não'}</small>
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-success btn-sm" onclick="editPatrocinador('${p.id}')">Editar</button>
                    <button class="btn-danger btn-sm" onclick="deletePatrocinador('${p.id}')">Excluir</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    }

    window.editPatrocinador = async (id) => {
        const { data: p, error } = await supabase.from('patrocinadores').select('*').eq('id', id).single();
        if (error) {
            alert('Erro ao buscar patrocinador: ' + error.message);
            return;
        }

        document.getElementById('patrocinador-nome').value = p.nome;
        document.getElementById('patrocinador-tipo').value = p.tipo_servico || '';
        document.getElementById('patrocinador-morada').value = p.morada || '';
        document.getElementById('patrocinador-cp').value = p.codigo_postal || '';
        document.getElementById('patrocinador-telefone').value = p.telefone || '';
        document.getElementById('patrocinador-facebook').value = p.facebook || '';
        document.getElementById('patrocinador-instagram').value = p.instagram || '';
        document.getElementById('patrocinador-maps').value = p.google_maps_url || '';
        document.getElementById('patrocinador-comer').checked = p.comer;
        document.getElementById('patrocinador-dormir').checked = p.dormir;

        editingPatrocinadorId = id;
        formPatrocinador.querySelector('button[type="submit"]').textContent = 'Atualizar Patrocinador';
        formPatrocinador.scrollIntoView({ behavior: 'smooth' });
    };

    window.deletePatrocinador = async (id) => {
        if (!confirm('Tem certeza que deseja apagar este patrocinador?')) return;
        const { error } = await supabase.from('patrocinadores').delete().eq('id', id);
        if (error) {
            alert('Erro ao apagar: ' + error.message);
        } else {
            loadPatrocinadoresAdmin();
        }
    };

});
