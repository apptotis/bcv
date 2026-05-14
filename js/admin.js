/**
 * Lógica do Painel de Administração Principal do BCV
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar Supabase a partir do config.js
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Elementos DOM
    const loginContainer = document.getElementById('admin-login-container');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');
    const btnLogin = document.getElementById('btn-login');
    const adminNameSpan = document.getElementById('admin-name');

    // 3. Verificar Sessão Atual no arranque
    async function checkSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            verifyAdminRole(session.user);
        } else {
            showLogin();
        }
    }

    // 4. Verificar Permissões (Role)
    async function verifyAdminRole(user) {
        try {
            // Consultar a tabela public.users para verificar o role
            const { data: profile, error } = await supabase
                .from('users')
                .select('nome, role')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            const allowedRoles = ['admin', 'editor', 'treinador'];

            if (profile && allowedRoles.includes(profile.role)) {
                // Acesso permitido
                if (adminNameSpan) {
                    adminNameSpan.textContent = profile.nome || 'Utilizador';
                }
                
                // Configurar permissões de visualização consoante o role
                setupRolePermissions(profile.role);
                
                showAdminPanel();
            } else {
                // Tem sessão mas o role não é permitido
                throw new Error("Acesso Negado: Não tem permissões para aceder a este portal.");
            }
        } catch (error) {
            console.error("Erro na verificação de role:", error);
            showError(error.message);
            await supabase.auth.signOut();
            showLogin();
        }
    }

    // Ocultar ou mostrar menus dependendo do role
    function setupRolePermissions(role) {
        const usersTabBtn = document.querySelector('[data-tab="tab-users"]');
        const configTabBtn = document.querySelector('[data-tab="tab-config"]');
        const galeriaTabBtn = document.querySelector('[data-tab="tab-galeria"]');
        
        // Restaurar a visibilidade por defeito (para o caso de troca de contas)
        if (usersTabBtn) usersTabBtn.closest('li').style.display = 'block';
        if (configTabBtn) configTabBtn.closest('li').style.display = 'block';
        if (galeriaTabBtn) galeriaTabBtn.closest('li').style.display = 'block';

        if (role !== 'admin') {
            // Esconder os separadores sensíveis para quem não é admin
            if (usersTabBtn) usersTabBtn.closest('li').style.display = 'none';
            if (configTabBtn) configTabBtn.closest('li').style.display = 'none';
        }

        // Galeria: Apenas admin e editor
        if (role !== 'admin' && role !== 'editor') {
            if (galeriaTabBtn) galeriaTabBtn.closest('li').style.display = 'none';
        }
    }

    // 5. Função de Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        
        // Estado de loading
        btnLogin.textContent = "A Autenticar...";
        btnLogin.disabled = true;
        hideError();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.user) {
                // Após o login, vamos verificar se tem o role correto
                await verifyAdminRole(data.user);
            }
        } catch (error) {
            showError("Credenciais inválidas ou acesso negado.");
        } finally {
            btnLogin.textContent = "Aceder";
            btnLogin.disabled = false;
        }
    });

    // 6. Função de Logout
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        showLogin();
    });

    // Utilitários de Interface
    function showLogin() {
        loginContainer.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        
        // Limpar os campos do login
        document.getElementById('admin-password').value = '';
    }

    function resetTabsToDashboard() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        // Remover estado ativo de tudo
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.add('hidden'));
        
        // Ativar o Dashboard
        const dashBtn = document.querySelector('[data-tab="tab-dashboard"]');
        const dashPane = document.getElementById('tab-dashboard');
        
        if (dashBtn) dashBtn.classList.add('active');
        if (dashPane) dashPane.classList.remove('hidden');
    }

    function showAdminPanel() {
        loginContainer.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        
        // Forçar sempre a abertura no Dashboard para evitar bugs de ecrãs escondidos
        resetTabsToDashboard();
        
        // Carregar a lista de aniversariantes do dia
        loadDashboardAniversariantes();
    }

    async function loadDashboardAniversariantes() {
        const container = document.getElementById('dashboard-aniversariantes');
        if (!container) return;
        
        try {
            // Obter todos os atletas que tenham data_nascimento
            const { data: atletas, error } = await supabase
                .from('atletasbcv')
                .select('nome, foto, equipa, data_nascimento')
                .not('data_nascimento', 'is', null);

            if (error) {
                if (error.code === '42P01') {
                    container.innerHTML = '<div style="color: #a0a0ab;">(Tabela de atletas ainda não criada)</div>';
                } else {
                    container.innerHTML = '<div style="color: #ff5252;">Erro ao carregar dados.</div>';
                }
                return;
            }

            const hoje = new Date();
            const diaHoje = hoje.getDate();
            const mesHoje = hoje.getMonth() + 1; // 0-11 -> 1-12

            const aniversariantesHoje = atletas.filter(atleta => {
                const partes = atleta.data_nascimento.split('-');
                if (partes.length !== 3) return false;
                
                const diaNasc = parseInt(partes[2]);
                const mesNasc = parseInt(partes[1]);
                
                return diaNasc === diaHoje && mesNasc === mesHoje;
            });

            container.innerHTML = '';

            if (aniversariantesHoje.length === 0) {
                container.innerHTML = '<div style="color: #a0a0ab; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">Nenhum atleta celebra o aniversário hoje.</div>';
                return;
            }

            aniversariantesHoje.forEach(atleta => {
                // Calcular idade
                const partes = atleta.data_nascimento.split('-');
                const anoNasc = parseInt(partes[0]);
                let idade = hoje.getFullYear() - anoNasc;
                
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '15px';
                item.style.padding = '10px';
                item.style.background = 'rgba(255,255,255,0.05)';
                item.style.borderRadius = '8px';

                const fotoHtml = atleta.foto 
                    ? `<img src="${atleta.foto}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;">` 
                    : '<div style="width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: 1.5rem;">👤</div>';

                item.innerHTML = `
                    ${fotoHtml}
                    <div>
                        <div style="font-weight: bold; font-size: 1.1rem; color: #fff;">${atleta.nome} 🎉</div>
                        <div style="color: #a0a0ab; font-size: 0.9rem;">${atleta.equipa} • ${idade} anos</div>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error("Erro ao verificar aniversariantes:", error);
            container.innerHTML = '<div style="color: #ff5252;">Erro ao verificar aniversários.</div>';
        }
    }

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }

    function hideError() {
        loginError.classList.add('hidden');
    }

    // ==========================================
    // 7. Lógica de Tabs (Menu Lateral)
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.add('hidden'));

            // Ativar o clicado
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'tab-users') {
                loadUsers();
                if (typeof resetUserForm === 'function') resetUserForm();
            }

            if (targetId === 'tab-galeria') {
                if (typeof loadAlbunsAdmin === 'function') loadAlbunsAdmin();
            }

            if (targetId === 'tab-atletas') {
                if (typeof loadAtletas === 'function') loadAtletas();
                if (typeof resetAtletaForm === 'function') resetAtletaForm();
            }
        });
    });

    // ==========================================
    // Mostrar/Ocultar Palavra-Passe
    // ==========================================
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🔒';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });

    // ==========================================
    // 8. Gestão de Utilizadores (Criar, Editar, Apagar)
    // ==========================================
    const usersTableBody = document.getElementById('users-table-body');
    const formCreateUser = document.getElementById('form-create-user');
    const createUserMsg = document.getElementById('create-user-msg');
    const btnCreateUser = document.getElementById('btn-create-user');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const formUserTitle = document.getElementById('form-user-title');
    const editUserIdInput = document.getElementById('edit-user-id');
    const passwordHint = document.getElementById('password-hint');
    const passwordInput = document.getElementById('new-user-password');

    function resetUserForm() {
        if(formCreateUser) formCreateUser.reset();
        editUserIdInput.value = '';
        formUserTitle.textContent = 'Criar Novo Utilizador';
        btnCreateUser.textContent = 'Criar Utilizador';
        btnCancelEdit.classList.add('hidden');
        passwordHint.style.display = 'none';
        passwordInput.required = true;
        document.getElementById('new-user-email').disabled = false;
        if(createUserMsg) createUserMsg.classList.add('hidden');
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', resetUserForm);
    }

    async function loadUsers() {
        try {
            usersTableBody.innerHTML = '<tr><td colspan="4" style="padding: 10px;">A carregar utilizadores...</td></tr>';
            
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="4" style="padding: 10px;">Nenhum utilizador encontrado.</td></tr>';
                return;
            }

            usersTableBody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                const userJson = JSON.stringify(user).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                
                tr.innerHTML = `
                    <td style="padding: 10px;">${user.nome || '-'}</td>
                    <td style="padding: 10px;">${user.email || '-'}</td>
                    <td style="padding: 10px; text-transform: capitalize;">${user.role || 'user'}</td>
                    <td style="padding: 10px;">${user.telemovel || '-'}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button class="btn-action" onclick="window.editUser('${userJson}')">✏️</button>
                        <button class="btn-action delete" onclick="window.deleteUser('${user.id}')">🗑️</button>
                    </td>
                `;
                usersTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar users:", error);
            usersTableBody.innerHTML = '<tr><td colspan="5" style="color: red; padding: 10px;">Erro ao carregar utilizadores.</td></tr>';
        }
    }

    // Funções globais para botões inline da tabela
    window.editUser = function(userStr) {
        const user = JSON.parse(userStr);
        
        editUserIdInput.value = user.id;
        document.getElementById('new-user-name').value = user.nome || '';
        document.getElementById('new-user-email').value = user.email || '';
        document.getElementById('new-user-email').disabled = true; // Não deixamos editar o email
        document.getElementById('new-user-phone').value = user.telemovel || '';
        document.getElementById('new-user-role').value = user.role || '';
        
        // Em modo edição, password não é obrigatória
        passwordInput.required = false;
        passwordInput.value = '';
        passwordHint.style.display = 'block';
        
        formUserTitle.textContent = 'Editar Utilizador: ' + user.nome;
        btnCreateUser.textContent = 'Guardar Alterações';
        btnCancelEdit.classList.remove('hidden');
        createUserMsg.classList.add('hidden');
        
        // Fazer scroll suave para o form
        formUserTitle.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteUser = async function(userId) {
        if (!confirm('Tem a certeza absoluta que deseja eliminar este utilizador? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
            if (error) throw error;
            
            alert('Utilizador eliminado com sucesso!');
            loadUsers();
            if (editUserIdInput.value === userId) {
                resetUserForm();
            }
        } catch (error) {
            console.error("Erro ao eliminar:", error);
            alert("Erro ao eliminar utilizador: " + error.message);
        }
    };

    formCreateUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = editUserIdInput.value;
        const isEditMode = !!userId;
        
        btnCreateUser.textContent = isEditMode ? "A guardar..." : "A criar...";
        btnCreateUser.disabled = true;
        createUserMsg.classList.add('hidden');

        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-password').value;
        const nome = document.getElementById('new-user-name').value;
        const telemovel = document.getElementById('new-user-phone').value;
        const role = document.getElementById('new-user-role').value;

        try {
            if (isEditMode) {
                // Editar
                const { error } = await supabase.rpc('admin_edit_user', {
                    p_user_id: userId,
                    p_nome: nome,
                    p_telemovel: telemovel,
                    p_role: role,
                    p_password: password || null
                });
                if (error) throw error;
                createUserMsg.textContent = "✅ Utilizador atualizado com sucesso!";
            } else {
                // Criar
                const { error } = await supabase.rpc('admin_create_user', {
                    p_email: email,
                    p_password: password,
                    p_nome: nome,
                    p_telemovel: telemovel,
                    p_role: role
                });
                if (error) throw error;
                createUserMsg.textContent = "✅ Utilizador criado com sucesso!";
            }

            createUserMsg.style.color = "#4caf50";
            createUserMsg.classList.remove('hidden');
            
            resetUserForm();
            loadUsers(); // Recarregar a lista

        } catch (error) {
            console.error("Erro no formulário de utilizador:", error);
            createUserMsg.textContent = "❌ Erro: " + error.message;
            createUserMsg.style.color = "#ff5252";
            createUserMsg.classList.remove('hidden');
        } finally {
            btnCreateUser.textContent = isEditMode ? "Guardar Alterações" : "Criar Utilizador";
            btnCreateUser.disabled = false;
        }
    });

    // ==========================================
    // 9. Gestão de Galeria (Álbuns e Fotos)
    // ==========================================
    const formAlbum = document.getElementById('form-album');

    if (formAlbum) {
        formAlbum.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('album-titulo').value;
            const capaFile = document.getElementById('album-capa-file').files[0];
            const btn = document.getElementById('btn-save-album');
            
            btn.disabled = true;
            btn.textContent = 'A guardar...';

            try {
                let capaUrl = null;
                if (capaFile) {
                    const fileName = `capa_${Date.now()}_${capaFile.name.replace(/\s/g, '_')}`;
                    const { data, error } = await supabase.storage.from('fotos').upload(fileName, capaFile);
                    if (error) throw error;
                    const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                    capaUrl = publicData.publicUrl;
                }

                const updates = { titulo };
                if (capaUrl) updates.capa_url = capaUrl;

                const { error } = await supabase.from('albuns').insert([updates]);
                if (error) throw error;
                
                resetAlbumForm();
                loadAlbunsAdmin();
            } catch (err) {
                console.error(err);
                alert("Erro ao guardar álbum: " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Criar Álbum';
            }
        });
    }

    function resetAlbumForm() {
        if (formAlbum) formAlbum.reset();
        document.getElementById('album-id').value = '';
    }

    window.loadAlbunsAdmin = async function() {
        const listContainer = document.getElementById('admin-albuns-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<tr><td colspan="4" style="padding: 10px;">Carregando...</td></tr>';

        const { data, error } = await supabase.from('albuns').select('*').order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = '<tr><td colspan="4" style="padding: 10px; color: red;">Erro ao carregar álbuns.</td></tr>';
            return;
        }

        listContainer.innerHTML = '';
        if (data.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="4" style="padding: 10px;">Nenhum álbum criado.</td></tr>';
            return;
        }

        data.forEach(album => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 10px;">
                    ${album.capa_url 
                        ? `<img src="${album.capa_url}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">` 
                        : '<div style="width: 60px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 4px; display:flex; align-items:center; justify-content:center;">📁</div>'}
                </td>
                <td style="padding: 10px;"><strong>${album.titulo}</strong></td>
                <td style="padding: 10px; color: #a0a0ab;">${album.id}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button class="btn-action" onclick="window.openPhotoManager(${album.id}, '${album.titulo.replace(/'/g, "\\'")}')" title="Gerir Fotos">🖼️ Fotos</button>
                    <button class="btn-action" onclick="window.renameAlbum(${album.id}, '${album.titulo.replace(/'/g, "\\'")}')" title="Renomear Álbum">✏️ Renomear</button>
                    <button class="btn-action delete" onclick="window.deleteAlbum(${album.id})" title="Apagar Álbum">🗑️ Apagar</button>
                </td>
            `;
            listContainer.appendChild(tr);
        });
    };

    window.renameAlbum = async (id, tituloAtual) => {
        const novoTitulo = window.prompt("Qual o novo nome do álbum?", tituloAtual);
        if (novoTitulo && novoTitulo.trim() !== "" && novoTitulo !== tituloAtual) {
            const { error } = await supabase.from('albuns').update({ titulo: novoTitulo.trim() }).eq('id', id);
            if (error) {
                alert("Erro ao renomear: " + error.message);
            } else {
                loadAlbunsAdmin();
            }
        }
    };

    window.deleteAlbum = async (id) => {
        if (!confirm("Tem certeza absoluta? Isto apagará o álbum e TODAS as suas fotos (a ação não pode ser desfeita).")) return;
        const { error } = await supabase.from('albuns').delete().eq('id', id);
        if (error) alert("Erro: " + error.message);
        else loadAlbunsAdmin();
    };

    window.openPhotoManager = async (albumId, titulo) => {
        document.getElementById('album-form-container').classList.add('hidden');
        document.getElementById('admin-albuns-table-container').classList.add('hidden');
        
        const manager = document.getElementById('album-photos-manager');
        manager.classList.remove('hidden');
        document.getElementById('manage-album-id').value = albumId;
        document.getElementById('current-album-name').textContent = `Fotos de: ${titulo}`;
        
        loadAlbumPhotos(albumId);
    };

    window.closePhotoManager = () => {
        document.getElementById('album-photos-manager').classList.add('hidden');
        document.getElementById('album-form-container').classList.remove('hidden');
        document.getElementById('admin-albuns-table-container').classList.remove('hidden');
    };

    async function loadAlbumPhotos(albumId) {
        const container = document.getElementById('album-photos-list');
        container.innerHTML = 'Carregando fotos...';

        // Buscar outros álbuns para o dropdown de mover
        const { data: albumsData } = await supabase.from('albuns').select('id, titulo').neq('id', albumId);

        const { data, error } = await supabase
            .from('fotos_galeria')
            .select('*')
            .eq('album_id', albumId)
            .order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = 'Erro ao carregar fotos.';
            return;
        }

        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1;">Este álbum ainda não tem fotos.</p>';
        }

        data.forEach(foto => {
            const div = document.createElement('div');
            div.style.position = 'relative';
            div.style.background = 'rgba(0,0,0,0.2)';
            div.style.padding = '8px';
            div.style.borderRadius = '8px';

            let optionsHtml = '<option value="" disabled selected>Mover para...</option>';
            if (albumsData) {
                albumsData.forEach(a => {
                    optionsHtml += `<option value="${a.id}">${a.titulo}</option>`;
                });
            }

            div.innerHTML = `
                <img src="${foto.url}" style="width:100%; aspect-ratio:1; object-fit:cover; border-radius:5px;">
                <button onclick="window.deleteFoto('${foto.id}', '${foto.url}')" style="position:absolute; top:12px; right:12px; background:rgba(255,0,0,0.9); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold;" title="Apagar Foto">&times;</button>
                <div style="margin-top: 8px; display: flex; gap: 5px;">
                    <select id="move-foto-${foto.id}" class="admin-input" style="padding: 5px; font-size: 0.8rem; width: 100%;">
                        ${optionsHtml}
                    </select>
                    <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="window.moveFoto('${foto.id}')">Ir</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    window.moveFoto = async (fotoId) => {
        const selectEl = document.getElementById(`move-foto-${fotoId}`);
        const novoAlbumId = selectEl.value;
        if (!novoAlbumId) {
            alert("Selecione um álbum de destino.");
            return;
        }

        const { error } = await supabase.from('fotos_galeria').update({ album_id: novoAlbumId }).eq('id', fotoId);
        if (error) {
            alert("Erro ao mover a foto: " + error.message);
        } else {
            const albumAtualId = document.getElementById('manage-album-id').value;
            loadAlbumPhotos(albumAtualId); // recarrega a lista, a foto vai desaparecer
        }
    };

    const formUploadFotos = document.getElementById('form-upload-fotos');
    if (formUploadFotos) {
        formUploadFotos.addEventListener('submit', async (e) => {
            e.preventDefault();
            const albumId = document.getElementById('manage-album-id').value;
            const files = document.getElementById('galeria-fotos-files').files;
            const progress = document.getElementById('upload-progress');
            
            if (!files.length) return;

            progress.classList.remove('hidden');
            progress.textContent = `A carregar 0/${files.length}...`;

            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    progress.textContent = `A carregar ${i + 1}/${files.length}...`;
                    
                    const fileName = `galeria_${albumId}_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                    const { data, error } = await supabase.storage.from('fotos').upload(fileName, file);
                    
                    if (error) {
                        console.error("Erro upload:", error);
                        continue;
                    }

                    const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                    const url = publicData.publicUrl;

                    await supabase.from('fotos_galeria').insert([{ album_id: albumId, url: url }]);
                }
                
                alert("Upload concluído!");
                formUploadFotos.reset();
                loadAlbumPhotos(albumId);
            } catch (err) {
                console.error(err);
                alert("Erro no upload: " + err.message);
            } finally {
                progress.classList.add('hidden');
            }
        });
    }

    window.deleteFoto = async (id, url) => {
        if (!confirm("Apagar esta foto permanentemente?")) return;
        
        const { error } = await supabase.from('fotos_galeria').delete().eq('id', id);
        if (error) alert("Erro: " + error.message);
        else {
            const albumId = document.getElementById('manage-album-id').value;
            loadAlbumPhotos(albumId);
        }
    };

    window.openStorageManager = () => {
        document.getElementById('album-form-container').classList.add('hidden');
        document.getElementById('admin-albuns-table-container').classList.add('hidden');
        document.getElementById('album-photos-manager').classList.add('hidden');
        document.getElementById('storage-manager').classList.remove('hidden');
        loadStorageFiles();
    };

    window.closeStorageManager = () => {
        document.getElementById('storage-manager').classList.add('hidden');
        document.getElementById('album-form-container').classList.remove('hidden');
        document.getElementById('admin-albuns-table-container').classList.remove('hidden');
    };

    async function loadStorageFiles() {
        const tbody = document.getElementById('storage-files-list');
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px;">A carregar ficheiros do Supabase...</td></tr>';

        const { data, error } = await supabase.storage.from('fotos').list('', {
            limit: 500,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; color: red;">Erro ao aceder ao Storage: ${error.message}</td></tr>`;
            return;
        }

        const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');

        if (files.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px;">O bucket está vazio.</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        files.forEach(file => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(file.name);
            const url = publicData.publicUrl;
            
            const sizeKB = file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) : 0;
            const date = new Date(file.created_at).toLocaleString('pt-PT');

            tr.innerHTML = `
                <td style="padding: 10px;">
                    <a href="${url}" target="_blank">
                        <img src="${url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #444;">
                    </a>
                </td>
                <td style="padding: 10px; word-break: break-all; font-size: 0.9rem;">${file.name}</td>
                <td style="padding: 10px; font-size: 0.9rem; color: #a0a0ab;">${date}</td>
                <td style="padding: 10px; font-size: 0.9rem;">${sizeKB} KB</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action delete" onclick="window.deleteStorageFile('${file.name.replace(/'/g, "\\'")}')" title="Apagar Fisicamente">🗑️ Apagar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.deleteStorageFile = async (fileName) => {
        if (!confirm(`Tem a certeza ABSOLUTA que deseja apagar o ficheiro "${fileName}" do servidor? Se ele estiver num álbum, a imagem ficará quebrada!`)) return;

        const { error } = await supabase.storage.from('fotos').remove([fileName]);
        if (error) {
            alert("Erro ao apagar ficheiro: " + error.message);
        } else {
            loadStorageFiles();
        }
    };

    // ==========================================
    // 10. Gestão de Atletas
    // ==========================================
    const formAtleta = document.getElementById('form-atleta');
    const btnSaveAtleta = document.getElementById('btn-save-atleta');
    const btnCancelAtleta = document.getElementById('btn-cancel-atleta');
    const atletaMsg = document.getElementById('atleta-msg');
    const formAtletaTitle = document.getElementById('form-atleta-title');
    const editAtletaIdInput = document.getElementById('edit-atleta-id');
    const atletasTableBody = document.getElementById('atletas-table-body');

    // Preview de Imagem Local e Remoção
    const fotoFileInput = document.getElementById('atleta-foto-file');
    const fotoPreviewDiv = document.getElementById('atleta-foto-preview');
    const fotoImg = document.getElementById('atleta-foto-img');
    const fotoUrlInput = document.getElementById('atleta-foto-url');
    const btnRemoveFoto = document.getElementById('btn-remove-foto');

    if (fotoFileInput) {
        fotoFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    fotoImg.src = e.target.result;
                    fotoPreviewDiv.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                fotoPreviewDiv.style.display = 'none';
            }
        });
    }

    if (btnRemoveFoto) {
        btnRemoveFoto.addEventListener('click', function() {
            fotoFileInput.value = '';
            fotoUrlInput.value = '';
            fotoPreviewDiv.style.display = 'none';
            fotoImg.src = '';
        });
    }

    window.resetAtletaForm = function() {
        if (formAtleta) formAtleta.reset();
        editAtletaIdInput.value = '';
        fotoUrlInput.value = '';
        fotoPreviewDiv.style.display = 'none';
        fotoImg.src = '';
        formAtletaTitle.textContent = 'Adicionar Novo Atleta';
        btnSaveAtleta.textContent = 'Adicionar Atleta';
        if (btnCancelAtleta) btnCancelAtleta.classList.add('hidden');
        if (atletaMsg) atletaMsg.classList.add('hidden');
    }

    if (btnCancelAtleta) {
        btnCancelAtleta.addEventListener('click', resetAtletaForm);
    }

    let currentAtletas = [];

    window.loadAtletas = async function() {
        if (!atletasTableBody) return;
        
        try {
            atletasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">A carregar atletas...</td></tr>';
            
            const { data: atletas, error } = await supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                // If the table doesn't exist yet, show a friendly message instead of a harsh error
                if (error.code === '42P01') {
                    atletasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">A tabela "atletasbcv" não existe na base de dados. Por favor, crie-a no Supabase.</td></tr>';
                    return;
                }
                throw error;
            }

            currentAtletas = atletas || [];
            renderAtletasTable(currentAtletas);
            
        } catch (error) {
            console.error("Erro ao carregar atletas:", error);
            atletasTableBody.innerHTML = `<tr><td colspan="6" style="color: red; padding: 10px;">Erro: ${error.message}</td></tr>`;
        }
    }

    function renderAtletasTable(lista) {
        atletasTableBody.innerHTML = '';
        
        if (!lista || lista.length === 0) {
            atletasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">Nenhum atleta encontrado.</td></tr>';
            return;
        }

        lista.forEach(atleta => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            const atletaJson = JSON.stringify(atleta).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            
            const fotoHtml = atleta.foto 
                ? `<img src="${atleta.foto}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">` 
                : '<div style="width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: 1.2rem;">👤</div>';

            tr.innerHTML = `
                <td style="padding: 10px;">${fotoHtml}</td>
                <td style="padding: 10px;"><strong>${atleta.nome || '-'}</strong></td>
                <td style="padding: 10px;">${atleta.equipa || '-'} <br><small style="color: #a0a0ab;">${atleta.escalao || '-'}</small></td>
                <td style="padding: 10px;">${atleta.numero_camisola || '-'}</td>
                <td style="padding: 10px;">${atleta.licenca || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action" onclick="window.editAtleta('${atletaJson}')" title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="window.deleteAtleta('${atleta.id}')" title="Apagar">🗑️</button>
                </td>
            `;
            atletasTableBody.appendChild(tr);
        });
    }

    const searchAtletaInput = document.getElementById('search-atleta');
    if (searchAtletaInput) {
        searchAtletaInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = currentAtletas.filter(a => {
                const nome = (a.nome || '').toLowerCase();
                const equipa = (a.equipa || '').toLowerCase();
                const licenca = (a.licenca || '').toLowerCase();
                
                return nome.includes(termo) || equipa.includes(termo) || licenca.includes(termo);
            });
            renderAtletasTable(filtrados);
        });
    }

    window.editAtleta = function(atletaStr) {
        const atleta = JSON.parse(atletaStr);
        
        editAtletaIdInput.value = atleta.id;
        document.getElementById('atleta-nome').value = atleta.nome || '';
        document.getElementById('atleta-equipa').value = atleta.equipa || '';
        document.getElementById('atleta-numero').value = atleta.numero_camisola || '';
        document.getElementById('atleta-escalao').value = atleta.escalao || '';
        document.getElementById('atleta-sexo').value = atleta.sexo || '';
        document.getElementById('atleta-nascimento').value = atleta.data_nascimento || '';
        document.getElementById('atleta-nacionalidade').value = atleta.nacionalidade || '';
        document.getElementById('atleta-licenca').value = atleta.licenca || '';
        
        if (atleta.foto) {
            fotoUrlInput.value = atleta.foto;
            fotoImg.src = atleta.foto;
            fotoPreviewDiv.style.display = 'block';
        } else {
            fotoUrlInput.value = '';
            fotoPreviewDiv.style.display = 'none';
        }
        
        formAtletaTitle.textContent = 'Editar Atleta: ' + atleta.nome;
        btnSaveAtleta.textContent = 'Guardar Alterações';
        if (btnCancelAtleta) btnCancelAtleta.classList.remove('hidden');
        if (atletaMsg) atletaMsg.classList.add('hidden');
        
        formAtletaTitle.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteAtleta = async function(id) {
        if (!confirm('Tem a certeza que deseja apagar este atleta?')) return;

        try {
            const { error } = await supabase.from('atletasbcv').delete().eq('id', id);
            if (error) throw error;
            
            alert('Atleta apagado com sucesso!');
            loadAtletas();
            if (editAtletaIdInput.value === id) {
                resetAtletaForm();
            }
        } catch (error) {
            console.error("Erro ao eliminar atleta:", error);
            alert("Erro ao eliminar atleta: " + error.message);
        }
    };

    if (formAtleta) {
        formAtleta.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const atletaId = editAtletaIdInput.value;
            const isEditMode = !!atletaId;
            
            btnSaveAtleta.textContent = isEditMode ? "A guardar..." : "A adicionar...";
            btnSaveAtleta.disabled = true;
            atletaMsg.classList.add('hidden');

            const atletaData = {
                nome: document.getElementById('atleta-nome').value,
                equipa: document.getElementById('atleta-equipa').value,
                numero_camisola: document.getElementById('atleta-numero').value ? parseInt(document.getElementById('atleta-numero').value) : null,
                escalao: document.getElementById('atleta-escalao').value,
                sexo: document.getElementById('atleta-sexo').value,
                data_nascimento: document.getElementById('atleta-nascimento').value || null,
                nacionalidade: document.getElementById('atleta-nacionalidade').value,
                licenca: document.getElementById('atleta-licenca').value,
                foto: fotoUrlInput.value // Default to existing or empty
            };

            try {
                // Handle Foto Upload se houver ficheiro
                const fotoFile = fotoFileInput.files[0];
                if (fotoFile) {
                    const fileName = `atleta_${Date.now()}_${fotoFile.name.replace(/\s/g, '_')}`;
                    const { error: uploadError } = await supabase.storage.from('fotos').upload(fileName, fotoFile);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                    atletaData.foto = publicData.publicUrl;
                }

                if (isEditMode) {
                    const { error } = await supabase.from('atletasbcv').update(atletaData).eq('id', atletaId);
                    if (error) throw error;
                    atletaMsg.textContent = "✅ Atleta atualizado com sucesso!";
                } else {
                    const { error } = await supabase.from('atletasbcv').insert([atletaData]);
                    if (error) throw error;
                    atletaMsg.textContent = "✅ Atleta adicionado com sucesso!";
                }

                atletaMsg.style.color = "#4caf50";
                atletaMsg.classList.remove('hidden');
                
                resetAtletaForm();
                loadAtletas();

            } catch (error) {
                console.error("Erro ao guardar atleta:", error);
                // Improve error message if table doesn't exist
                if (error.code === '42P01') {
                     atletaMsg.textContent = "❌ Erro: A tabela 'atletasbcv' não existe no Supabase.";
                } else {
                     atletaMsg.textContent = "❌ Erro: " + error.message;
                }
                atletaMsg.style.color = "#ff5252";
                atletaMsg.classList.remove('hidden');
            } finally {
                btnSaveAtleta.textContent = isEditMode ? "Guardar Alterações" : "Adicionar Atleta";
                btnSaveAtleta.disabled = false;
            }
        });
    }

    // Utilitário para converter "10 de maio de 2026" ou "10-05-2026" para "2026-05-10"
    function parsePortugueseDate(dateStr) {
        if (!dateStr) return null;
        const months = {
            'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06',
            'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
            'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };
        
        // Formato FPB: "16 MAI 2026" ou "16 maio 2026"
        const partsSpace = d.split(' ');
        if (partsSpace.length === 3) {
            const day = partsSpace[0].padStart(2, '0');
            const monthName = partsSpace[1].toLowerCase();
            const year = partsSpace[2];
            
            // Tentar nome completo ou abreviado (primeiras 3 letras)
            const month = months[monthName] || months[monthName.substring(0, 3)] || '01';
            return `${year}-${month}-${day}`;
        }

        return dateStr;
    }

    // ==========================================
    // 11. Sincronizador FPB (Calendário e Resultados)
    // ==========================================
    const btnProcessFpb = document.getElementById('btn-process-fpb');
    const fpbInput = document.getElementById('fpb-import-json');
    const fpbPreviewContainer = document.getElementById('fpb-preview-container');
    const fpbPreviewBody = document.getElementById('fpb-preview-body');
    const fpbStats = document.getElementById('fpb-stats');
    const btnSaveFpb = document.getElementById('btn-save-fpb');
    const btnClearFpb = document.getElementById('btn-clear-fpb');

    let fpbExtractedData = [];

    if (btnProcessFpb) {
        btnProcessFpb.addEventListener('click', () => {
            const rawData = fpbInput.value.trim();
            if (!rawData) {
                alert("Por favor, cole os dados JSON extraídos do site da FPB.");
                return;
            }

            try {
                fpbExtractedData = JSON.parse(rawData);
                renderFpbPreview(fpbExtractedData);
            } catch (err) {
                console.error(err);
                alert("Erro ao ler os dados. Certifique-se de que copiou o conteúdo corretamente.");
            }
        });
    }

    function renderFpbPreview(data) {
        fpbPreviewBody.innerHTML = '';
        fpbPreviewContainer.classList.remove('hidden');
        
        let agendaCount = 0;
        let resultadosCount = 0;

        data.forEach((jogo, index) => {
            const hasResult = jogo.score && jogo.score.includes('-');
            if (hasResult) resultadosCount++;
            else agendaCount++;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px;">${jogo.date}<br><small>${jogo.time}</small></td>
                <td style="padding: 10px;"><strong>${jogo.home}</strong> vs <strong>${jogo.away}</strong></td>
                <td style="padding: 10px;">${hasResult ? `<span style="background:#e91e63; padding:2px 6px; border-radius:4px;">${jogo.score}</span>` : `📍 ${jogo.local}`}</td>
                <td style="padding: 10px; font-size: 0.8rem; color: #a0a0ab;">${jogo.competition}</td>
            `;
            fpbPreviewBody.appendChild(tr);
        });

        fpbStats.innerHTML = `Identificados <strong>${agendaCount}</strong> jogos para a Agenda e <strong>${resultadosCount}</strong> resultados terminados.`;
    }

    if (btnClearFpb) {
        btnClearFpb.addEventListener('click', () => {
            fpbInput.value = '';
            fpbPreviewContainer.classList.add('hidden');
            fpbExtractedData = [];
        });
    }

    // ==========================================
    // 12. Gestão Manual de Agenda (CRUD)
    // ==========================================
    const formAgenda = document.getElementById('form-agenda');
    const agendaTableBody = document.getElementById('agenda-table-body');
    const agendaMsg = document.getElementById('agenda-form-msg');
    const btnSaveAgenda = document.getElementById('btn-save-agenda');
    const btnCancelAgenda = document.getElementById('btn-cancel-agenda');
    const btnRefreshAgenda = document.getElementById('btn-refresh-agenda');

    async function loadAgenda() {
        if (!agendaTableBody) return;
        agendaTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">A carregar jogos...</td></tr>';

        try {
            const { data, error } = await supabase
                .from('agenda_bcv')
                .select('*')
                .order('data_jogo', { ascending: true });

            if (error) throw error;

            agendaTableBody.innerHTML = '';
            if (data.length === 0) {
                agendaTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Nenhum jogo agendado.</td></tr>';
                return;
            }

            data.forEach(jogo => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                tr.innerHTML = `
                    <td style="padding: 12px;">${formatDate(jogo.data_jogo)}<br><small>${jogo.hora_jogo || '--:--'}</small></td>
                    <td style="padding: 12px;"><strong>${jogo.equipa_casa}</strong> vs <strong>${jogo.equipa_fora}</strong></td>
                    <td style="padding: 12px;">${jogo.local || '--'}</td>
                    <td style="padding: 12px;"><span style="font-size:0.8rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${jogo.escalao}</span></td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn-action edit" onclick="editGame('${jogo.id}')">✏️</button>
                        <button class="btn-action delete" onclick="deleteGame('${jogo.id}')">🗑️</button>
                    </td>
                `;
                agendaTableBody.appendChild(tr);
            });
        } catch (err) {
            console.error("Erro ao carregar agenda:", err);
            agendaTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #ff5252;">Erro ao carregar dados.</td></tr>';
        }
    }

    if (formAgenda) {
        formAgenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('agenda-id').value;
            const gameData = {
                equipa_casa: document.getElementById('agenda-casa').value,
                equipa_fora: document.getElementById('agenda-fora').value,
                data_jogo: document.getElementById('agenda-data').value,
                hora_jogo: document.getElementById('agenda-hora').value,
                local: document.getElementById('agenda-local').value,
                escalao: document.getElementById('agenda-escalao').value
            };

            btnSaveAgenda.disabled = true;
            btnSaveAgenda.textContent = "A guardar...";

            try {
                let error;
                if (id) {
                    const { error: err } = await supabase.from('agenda_bcv').update(gameData).eq('id', id);
                    error = err;
                } else {
                    const { error: err } = await supabase.from('agenda_bcv').insert([gameData]);
                    error = err;
                }

                if (error) throw error;

                agendaMsg.textContent = "✅ Jogo guardado com sucesso!";
                agendaMsg.style.color = "#4caf50";
                agendaMsg.classList.remove('hidden');
                
                resetAgendaForm();
                loadAgenda();
                setTimeout(() => agendaMsg.classList.add('hidden'), 3000);

            } catch (err) {
                console.error("Erro ao guardar jogo:", err);
                agendaMsg.textContent = "❌ Erro: " + err.message;
                agendaMsg.style.color = "#ff5252";
                agendaMsg.classList.remove('hidden');
            } finally {
                btnSaveAgenda.disabled = false;
                btnSaveAgenda.textContent = id ? "Guardar Alterações" : "Guardar Jogo";
            }
        });
    }

    function resetAgendaForm() {
        formAgenda.reset();
        document.getElementById('agenda-id').value = '';
        document.getElementById('form-agenda-title').textContent = "Adicionar Novo Jogo";
        btnSaveAgenda.textContent = "Guardar Jogo";
        btnCancelAgenda.classList.add('hidden');
    }

    if (btnCancelAgenda) btnCancelAgenda.addEventListener('click', resetAgendaForm);
    if (btnRefreshAgenda) btnRefreshAgenda.addEventListener('click', loadAgenda);

    // Expor funções globais para botões na tabela
    window.editGame = async (id) => {
        const { data, error } = await supabase.from('agenda_bcv').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('agenda-id').value = data.id;
            document.getElementById('agenda-casa').value = data.equipa_casa;
            document.getElementById('agenda-fora').value = data.equipa_fora;
            document.getElementById('agenda-data').value = data.data_jogo;
            document.getElementById('agenda-hora').value = data.hora_jogo;
            document.getElementById('agenda-local').value = data.local;
            document.getElementById('agenda-escalao').value = data.escalao;

            document.getElementById('form-agenda-title').textContent = "Editar Jogo";
            btnSaveAgenda.textContent = "Guardar Alterações";
            btnCancelAgenda.classList.remove('hidden');
            formAgenda.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteGame = async (id) => {
        if (!confirm("Tem a certeza que deseja eliminar este jogo?")) return;
        const { error } = await supabase.from('agenda_bcv').delete().eq('id', id);
        if (error) alert("Erro ao eliminar: " + error.message);
        else loadAgenda();
    };

    // Auxiliar: Formatar data DD-MM-YYYY
    function formatDate(dateStr) {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    // ==========================================
    // 13. Gestão Manual de Resultados (CRUD)
    // ==========================================
    const resultadosTableBody = document.getElementById('resultados-table-body');

    async function loadResultados() {
        if (!resultadosTableBody) return;
        resultadosTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">A carregar resultados...</td></tr>';

        try {
            const { data, error } = await supabase
                .from('resultados_bcv')
                .select('*')
                .order('data_jogo', { ascending: false });

            if (error) throw error;

            resultadosTableBody.innerHTML = '';
            if (data.length === 0) {
                resultadosTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Nenhum resultado registado.</td></tr>';
                return;
            }

            data.forEach(jogo => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                tr.innerHTML = `
                    <td style="padding: 12px;">${formatDate(jogo.data_jogo)}</td>
                    <td style="padding: 12px;"><strong>${jogo.equipa_casa}</strong> vs <strong>${jogo.equipa_fora}</strong></td>
                    <td style="padding: 12px;"><span style="background:#e91e63; padding:2px 8px; border-radius:4px; font-weight:bold;">${jogo.pontos_casa} - ${jogo.pontos_fora}</span></td>
                    <td style="padding: 12px;">${jogo.escalao}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn-action delete" onclick="deleteResultado('${jogo.id}')">🗑️</button>
                    </td>
                `;
                resultadosTableBody.appendChild(tr);
            });
        } catch (err) {
            console.error("Erro ao carregar resultados:", err);
        }
    }

    window.deleteResultado = async (id) => {
        if (!confirm("Tem a certeza que deseja eliminar este resultado?")) return;
        const { error } = await supabase.from('resultados_bcv').delete().eq('id', id);
        if (error) alert("Erro ao eliminar: " + error.message);
        else loadResultados();
    };

    // Iniciar carregamento das tabs quando ativadas
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            
            // Esconder todas as panes
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
            // Remover active de todos os botões
            tabButtons.forEach(b => b.classList.remove('active'));
            
            // Mostrar a pane destino
            const targetPane = document.getElementById(target);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                btn.classList.add('active');
            }

            if (target === 'tab-agenda') loadAgenda();
            if (target === 'tab-resultados') loadResultados();
        });
    });

    // ==========================================
    // 11. Sincronizador FPB (Lógica de Gravação)
    // ==========================================
    if (btnSaveFpb) {
        btnSaveFpb.addEventListener('click', async () => {
            if (fpbExtractedData.length === 0) return;
            
            btnSaveFpb.disabled = true;
            btnSaveFpb.textContent = "A Guardar na Base de Dados...";

            let savedCount = 0;
            let errorCount = 0;

            for (const jogo of fpbExtractedData) {
                try {
                    const hasResult = jogo.score && jogo.score.includes('-');
                    let isoDate = parsePortugueseDate(jogo.date);

                    if (hasResult) {
                        const scores = jogo.score.split('-').map(s => parseInt(s.trim()));
                        await supabase.from('resultados_bcv').insert([{
                            equipa_casa: jogo.home,
                            equipa_fora: jogo.away,
                            pontos_casa: scores[0],
                            pontos_fora: scores[1],
                            data_jogo: isoDate,
                            escalao: jogo.competition
                        }]);
                    } else {
                        await supabase.from('agenda_bcv').insert([{
                            equipa_casa: jogo.home,
                            equipa_fora: jogo.away,
                            data_jogo: isoDate,
                            hora_jogo: jogo.time,
                            local: jogo.local,
                            escalao: jogo.competition
                        }]);
                    }
                    savedCount++;
                } catch (err) {
                    errorCount++;
                }
            }

            alert(`Sincronização concluída!\nSucesso: ${savedCount}\nErros: ${errorCount}`);
            btnSaveFpb.disabled = false;
            btnSaveFpb.textContent = "Confirmar e Guardar no Site";
            
            if (errorCount === 0) {
                fpbInput.value = '';
                fpbPreviewContainer.classList.add('hidden');
            }
        });
    }
    
    // Iniciar
    checkSession();
});
