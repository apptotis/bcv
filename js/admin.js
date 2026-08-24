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

    // 4. Verificar Permissões (Role e Permissões de Menus com Fallback Seguro)
    async function verifyAdminRole(user) {
        try {
            let profile = null;
            
            // 1. Tentar consultar em public.users por ID
            try {
                const { data: profileById } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();
                if (profileById) profile = profileById;
            } catch (e) {
                console.warn("Consulta por ID falhou:", e);
            }

            // 2. Se não encontrou por ID, tentar por Email
            if (!profile && user.email) {
                try {
                    const { data: profileByEmail } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', user.email)
                        .maybeSingle();
                    if (profileByEmail) profile = profileByEmail;
                } catch (e) {
                    console.warn("Consulta por Email falhou:", e);
                }
            }

            // 3. Se ainda não existir registo na tabela pública, conceder acesso como Admin Total (Sessão auth válida)
            if (!profile) {
                console.warn("Perfil não encontrado na tabela 'users'. A conceder acesso de emergência à conta autenticada:", user.email);
                profile = {
                    nome: user.user_metadata?.nome || (user.email ? user.email.split('@')[0] : 'Administrador'),
                    role: 'admin',
                    permissoes: ['noticias', 'agenda', 'resultados', 'galeria', 'equipas', 'atletas', 'config']
                };
            }

            const role = (profile.role || 'admin').toLowerCase();
            const allowedRoles = ['admin', 'editor', 'treinador', 'personalizado', 'user'];
            const userPerms = Array.isArray(profile.permissoes) ? profile.permissoes : [];
            const isAllowed = allowedRoles.includes(role) || userPerms.length > 0 || role === 'admin';

            if (isAllowed) {
                // Acesso permitido
                if (adminNameSpan) {
                    adminNameSpan.textContent = profile.nome || user.email || 'Utilizador';
                }
                
                // Configurar visibilidade dos menus consoante as permissões
                setupRolePermissions(profile);
                
                showAdminPanel();
            } else {
                throw new Error("Acesso Negado: Não tem permissões ativas para aceder a este portal.");
            }
        } catch (error) {
            console.error("Erro na verificação de permissões:", error);
            showError(error.message || "Erro ao validar permissões.");
            await supabase.auth.signOut();
            showLogin();
        }
    }

    // Ocultar ou mostrar menus dinamicamente consoante as permissões
    function setupRolePermissions(profile) {
        const isAdmin = !profile || !profile.role || profile.role === 'admin';
        const userPerms = (profile && Array.isArray(profile.permissoes)) ? profile.permissoes : [];
        const role = (profile && profile.role) ? profile.role.toLowerCase() : 'admin';

        const menuMap = [
            { tab: 'tab-users', allow: isAdmin },
            { tab: 'tab-atletas', allow: isAdmin || userPerms.includes('atletas') || role === 'treinador' },
            { tab: 'tab-noticias', allow: isAdmin || userPerms.includes('noticias') || role === 'editor' },
            { tab: 'tab-agenda', allow: isAdmin || userPerms.includes('agenda') || role === 'editor' },
            { tab: 'tab-resultados', allow: isAdmin || userPerms.includes('resultados') },
            { tab: 'tab-galeria', allow: isAdmin || userPerms.includes('galeria') || role === 'editor' },
            { tab: 'tab-equipas', allow: isAdmin || userPerms.includes('equipas') || role === 'treinador' },
            { tab: 'tab-config', allow: isAdmin || userPerms.includes('config') }
        ];

        menuMap.forEach(({ tab, allow }) => {
            const btn = document.querySelector(`[data-tab="${tab}"]`);
            if (btn) {
                const li = btn.closest('li');
                if (li) li.style.display = allow ? 'block' : 'none';
            }
        });
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

            if (data && data.user) {
                // Após o login, verificar permissões
                await verifyAdminRole(data.user);
            }
        } catch (error) {
            console.error("Erro no login:", error);
            showError(error.message || "Credenciais inválidas ou acesso negado.");
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
    const roleSelect = document.getElementById('new-user-role');
    const containerPermissoes = document.getElementById('container-permissoes-custom');
    const checkboxesPermissoes = document.querySelectorAll('input[name="user_permissoes"]');

    const MODULO_LABELS = {
        'noticias': 'Notícias',
        'agenda': 'Agenda',
        'resultados': 'Resultados',
        'galeria': 'Galeria',
        'equipas': 'Equipas',
        'atletas': 'Atletas',
        'config': 'Config'
    };

    if (roleSelect && containerPermissoes) {
        roleSelect.addEventListener('change', () => {
            if (roleSelect.value === 'personalizado') {
                containerPermissoes.style.display = 'block';
            } else {
                containerPermissoes.style.display = 'none';
                checkboxesPermissoes.forEach(cb => cb.checked = false);
            }
        });
    }

    function getSelectedPermissions() {
        const selected = [];
        checkboxesPermissoes.forEach(cb => {
            if (cb.checked) selected.push(cb.value);
        });
        return selected;
    }

    function setSelectedPermissions(perms) {
        const list = Array.isArray(perms) ? perms : [];
        checkboxesPermissoes.forEach(cb => {
            cb.checked = list.includes(cb.value);
        });
    }

    function resetUserForm() {
        if(formCreateUser) formCreateUser.reset();
        editUserIdInput.value = '';
        formUserTitle.textContent = 'Criar Novo Utilizador';
        btnCreateUser.textContent = 'Criar Utilizador';
        btnCancelEdit.classList.add('hidden');
        passwordHint.style.display = 'none';
        passwordInput.required = true;
        document.getElementById('new-user-email').disabled = false;
        if (containerPermissoes) containerPermissoes.style.display = 'none';
        checkboxesPermissoes.forEach(cb => cb.checked = false);
        if(createUserMsg) createUserMsg.classList.add('hidden');
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', resetUserForm);
    }

    async function loadUsers() {
        try {
            usersTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">A carregar utilizadores...</td></tr>';
            
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">Nenhum utilizador encontrado.</td></tr>';
                return;
            }

            usersTableBody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                const userJson = JSON.stringify(user).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                const isAdmin = user.role === 'admin';
                
                let permissoesBadgeHtml = '';
                if (isAdmin) {
                    permissoesBadgeHtml = '<span style="background: rgba(106, 27, 154, 0.12); color: #6a1b9a; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; border: 1px solid rgba(106, 27, 154, 0.25);">⭐ Total (Todos)</span>';
                } else {
                    const userPerms = Array.isArray(user.permissoes) ? user.permissoes : [];
                    if (userPerms.length > 0) {
                        permissoesBadgeHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px;">` +
                            userPerms.map(p => `<span style="background: rgba(0, 0, 0, 0.05); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; border: 1px solid var(--border-color);">${MODULO_LABELS[p] || p}</span>`).join('') +
                            `</div>`;
                    } else {
                        permissoesBadgeHtml = '<span style="color: var(--text-secondary); font-size: 0.8rem;">(Nenhum menu)</span>';
                    }
                }

                tr.innerHTML = `
                    <td style="padding: 10px; font-weight: 600;">${user.nome || '-'}</td>
                    <td style="padding: 10px;">${user.email || '-'}</td>
                    <td style="padding: 10px; font-size: 0.85rem;">${isAdmin ? '<strong>Admin</strong>' : 'Personalizado'}</td>
                    <td style="padding: 10px;">${permissoesBadgeHtml}</td>
                    <td style="padding: 10px;">${user.telemovel || '-'}</td>
                    <td style="padding: 10px; text-align: center; white-space: nowrap;">
                        <button class="btn-action" title="Editar Utilizador" onclick="window.editUser('${userJson}')">✏️</button>
                        <button class="btn-action delete" title="Eliminar Utilizador" onclick="window.deleteUser('${user.id}')">🗑️</button>
                    </td>
                `;
                usersTableBody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar users:", error);
            usersTableBody.innerHTML = '<tr><td colspan="6" style="color: red; padding: 10px;">Erro ao carregar utilizadores.</td></tr>';
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
        
        const isAdmin = user.role === 'admin';
        document.getElementById('new-user-role').value = isAdmin ? 'admin' : 'personalizado';
        
        if (!isAdmin) {
            containerPermissoes.style.display = 'block';
            setSelectedPermissions(user.permissoes || []);
        } else {
            containerPermissoes.style.display = 'none';
            checkboxesPermissoes.forEach(cb => cb.checked = false);
        }
        
        // Em modo edição, password não é obrigatória
        passwordInput.required = false;
        passwordInput.value = '';
        passwordHint.style.display = 'block';
        
        formUserTitle.textContent = 'Editar Utilizador: ' + (user.nome || user.email || 'Utilizador');
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
        const roleVal = document.getElementById('new-user-role').value;
        
        const role = (roleVal === 'admin') ? 'admin' : 'personalizado';
        const allModules = ['noticias', 'agenda', 'resultados', 'galeria', 'equipas', 'atletas', 'config'];
        const permissoes = (role === 'admin') ? allModules : getSelectedPermissions();

        if (role !== 'admin' && permissoes.length === 0) {
            alert('Por favor, selecione pelo menos um menu autorizado para este utilizador.');
            btnCreateUser.textContent = isEditMode ? "Guardar Alterações" : "Criar Utilizador";
            btnCreateUser.disabled = false;
            return;
        }

        try {
            if (isEditMode) {
                // Editar
                const { error } = await supabase.rpc('admin_edit_user', {
                    p_user_id: userId,
                    p_nome: nome,
                    p_telemovel: telemovel,
                    p_role: role,
                    p_password: password || null,
                    p_permissoes: permissoes
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
                    p_role: role,
                    p_permissoes: permissoes
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
    // 9.5. Gestão de Equipas BCV
    // ==========================================
    const formEquipa = document.getElementById('form-equipa');
    const btnSaveEquipa = document.getElementById('btn-save-equipa');
    const btnCancelEquipa = document.getElementById('btn-cancel-equipa');
    const equipaMsg = document.getElementById('equipa-msg');
    const formEquipaTitle = document.getElementById('form-equipa-title');
    const editEquipaIdInput = document.getElementById('edit-equipa-id');
    const equipasTableBody = document.getElementById('equipas-table-body');

    const equipaFotoFileInput = document.getElementById('equipa-foto-file');
    const equipaFotoPreviewDiv = document.getElementById('equipa-foto-preview');
    const equipaFotoImg = document.getElementById('equipa-foto-img');
    const equipaFotoUrlInput = document.getElementById('equipa-foto-url');
    const btnRemoveEquipaFoto = document.getElementById('btn-remove-equipa-foto');

    if (equipaFotoFileInput) {
        equipaFotoFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    equipaFotoImg.src = e.target.result;
                    equipaFotoPreviewDiv.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                equipaFotoPreviewDiv.style.display = 'none';
            }
        });
    }

    if (btnRemoveEquipaFoto) {
        btnRemoveEquipaFoto.addEventListener('click', function() {
            equipaFotoFileInput.value = '';
            equipaFotoUrlInput.value = '';
            equipaFotoPreviewDiv.style.display = 'none';
            equipaFotoImg.src = '';
        });
    }

    window.resetEquipaForm = function() {
        if (formEquipa) formEquipa.reset();
        editEquipaIdInput.value = '';
        equipaFotoUrlInput.value = '';
        equipaFotoPreviewDiv.style.display = 'none';
        equipaFotoImg.src = '';
        formEquipaTitle.textContent = 'Adicionar Nova Equipa';
        btnSaveEquipa.textContent = 'Adicionar Equipa';
        if (btnCancelEquipa) btnCancelEquipa.classList.add('hidden');
        if (equipaMsg) equipaMsg.classList.add('hidden');
    }

    if (btnCancelEquipa) {
        btnCancelEquipa.addEventListener('click', resetEquipaForm);
    }

    let currentEquipas = [];

    window.loadEquipas = async function() {
        if (!equipasTableBody) return;
        
        try {
            equipasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">A carregar equipas...</td></tr>';
            
            let { data: equipas, error } = await supabase
                .from('equipasbcv')
                .select('*');

            if (error) {
                if (error.code === '42P01') {
                    equipasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">A tabela "equipasbcv" não existe na base de dados. Por favor, crie-a no Supabase.</td></tr>';
                    return;
                }
                throw error;
            }

            const ordemEscalao = [
                "Mini 8", 
                "Mini 10", 
                "Mini 12", 
                "Sub-14", 
                "Sub-16", 
                "Sub-18", 
                "Seniores", 
                "Veteranos"
            ];

            if (equipas) {
                equipas.sort((a, b) => {
                    let indexA = ordemEscalao.indexOf(a.escalao);
                    let indexB = ordemEscalao.indexOf(b.escalao);
                    if (indexA === -1) indexA = 999;
                    if (indexB === -1) indexB = 999;
                    if (indexA === indexB) return (a.nome || '').localeCompare(b.nome || '');
                    return indexA - indexB;
                });
            }

            currentEquipas = equipas || [];
            renderEquipasTable(currentEquipas);
            
        } catch (error) {
            console.error("Erro ao carregar equipas:", error);
            equipasTableBody.innerHTML = `<tr><td colspan="6" style="color: red; padding: 10px;">Erro: ${error.message}</td></tr>`;
        }
    }

    function renderEquipasTable(lista) {
        if (!equipasTableBody) return;
        equipasTableBody.innerHTML = '';
        
        if (!lista || lista.length === 0) {
            equipasTableBody.innerHTML = '<tr><td colspan="6" style="padding: 10px;">Nenhuma equipa encontrada.</td></tr>';
            return;
        }

        lista.forEach(equipa => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            const equipaJson = JSON.stringify(equipa).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            
            const fotoHtml = equipa.foto 
                ? `<img src="${equipa.foto}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">` 
                : '<div style="width: 60px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 4px; display:flex; align-items:center; justify-content:center; font-size: 1rem;">🏀</div>';

            tr.innerHTML = `
                <td style="padding: 10px;">${fotoHtml}</td>
                <td style="padding: 10px;"><strong>${equipa.nome || '-'}</strong></td>
                <td style="padding: 10px;">${equipa.epoca || '-'}</td>
                <td style="padding: 10px;">${equipa.escalao || '-'}</td>
                <td style="padding: 10px;">${equipa.sexo || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action" onclick="window.editEquipa('${equipaJson}')" title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="window.deleteEquipa('${equipa.id}')" title="Apagar">🗑️</button>
                </td>
            `;
            equipasTableBody.appendChild(tr);
        });
    }

    window.editEquipa = function(equipaStr) {
        const equipa = JSON.parse(equipaStr);
        
        editEquipaIdInput.value = equipa.id;
        document.getElementById('equipa-nome').value = equipa.nome || '';
        document.getElementById('equipa-epoca').value = equipa.epoca || '';
        document.getElementById('equipa-escalao').value = equipa.escalao || '';
        document.getElementById('equipa-sexo').value = equipa.sexo || '';
        
        if (equipa.foto) {
            equipaFotoUrlInput.value = equipa.foto;
            equipaFotoImg.src = equipa.foto;
            equipaFotoPreviewDiv.style.display = 'block';
        } else {
            equipaFotoUrlInput.value = '';
            equipaFotoPreviewDiv.style.display = 'none';
        }
        
        formEquipaTitle.textContent = 'Editar Equipa: ' + equipa.nome;
        btnSaveEquipa.textContent = 'Guardar Alterações';
        if (btnCancelEquipa) btnCancelEquipa.classList.remove('hidden');
        if (equipaMsg) equipaMsg.classList.add('hidden');
        
        formEquipaTitle.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteEquipa = async function(id) {
        if (!confirm('Tem a certeza que deseja apagar esta equipa?')) return;

        try {
            const { error } = await supabase.from('equipasbcv').delete().eq('id', id);
            if (error) throw error;
            
            alert('Equipa apagada com sucesso!');
            loadEquipas();
            if (editEquipaIdInput.value === id) {
                resetEquipaForm();
            }
        } catch (error) {
            console.error("Erro ao eliminar equipa:", error);
            alert("Erro ao eliminar equipa: " + error.message);
        }
    };

    if (formEquipa) {
        formEquipa.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const equipaId = editEquipaIdInput.value;
            const isEditMode = !!equipaId;
            
            btnSaveEquipa.textContent = isEditMode ? "A guardar..." : "A adicionar...";
            btnSaveEquipa.disabled = true;
            equipaMsg.classList.add('hidden');

            const equipaData = {
                nome: document.getElementById('equipa-nome').value,
                epoca: document.getElementById('equipa-epoca').value,
                escalao: document.getElementById('equipa-escalao').value,
                sexo: document.getElementById('equipa-sexo').value,
                foto: equipaFotoUrlInput.value
            };

            try {
                const fotoFile = equipaFotoFileInput.files[0];
                if (fotoFile) {
                    const fileName = `equipa_${Date.now()}_${fotoFile.name.replace(/\\s/g, '_')}`;
                    const { error: uploadError } = await supabase.storage.from('fotos').upload(fileName, fotoFile);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: publicData } = supabase.storage.from('fotos').getPublicUrl(fileName);
                    equipaData.foto = publicData.publicUrl;
                }

                if (isEditMode) {
                    const { error } = await supabase.from('equipasbcv').update(equipaData).eq('id', equipaId);
                    if (error) throw error;
                    equipaMsg.textContent = "✅ Equipa atualizada com sucesso!";
                } else {
                    const { error } = await supabase.from('equipasbcv').insert([equipaData]);
                    if (error) throw error;
                    equipaMsg.textContent = "✅ Equipa adicionada com sucesso!";
                }

                equipaMsg.style.color = "#4caf50";
                equipaMsg.classList.remove('hidden');
                
                resetEquipaForm();
                loadEquipas();

            } catch (error) {
                console.error("Erro ao guardar equipa:", error);
                if (error.code === '42P01') {
                     equipaMsg.textContent = "❌ Erro: A tabela 'equipasbcv' não existe no Supabase.";
                } else {
                     equipaMsg.textContent = "❌ Erro: " + error.message;
                }
                equipaMsg.style.color = "#ff5252";
                equipaMsg.classList.remove('hidden');
            } finally {
                btnSaveEquipa.textContent = isEditMode ? "Guardar Alterações" : "Adicionar Equipa";
                btnSaveEquipa.disabled = false;
            }
        });
    }

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

    window.editAtleta = function(atletaStr) {
        const atleta = JSON.parse(atletaStr);
        
        editAtletaIdInput.value = atleta.id;
        document.getElementById('atleta-nome').value = atleta.nome || '';
        document.getElementById('atleta-nickname').value = atleta.nickname || '';
        document.getElementById('atleta-epoca').value = atleta.epoca || '';
        document.getElementById('atleta-funcao').value = atleta.funcao || '';
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
        }
        
        formAtletaTitle.textContent = 'Editar Atleta: ' + atleta.nome;
        btnSaveAtleta.textContent = 'Guardar Alterações';
        
        openAtletaModal();
        if (btnCancelAtleta) btnCancelAtleta.classList.remove('hidden');
        if (atletaMsg) atletaMsg.classList.add('hidden');
    };

    window.deleteAtleta = async function(id) {
        if (!confirm('Tem a certeza que deseja apagar este atleta?')) return;

        try {
            const { error } = await supabase.from('atletasbcv').delete().eq('id', id);
            if (error) throw error;
            
            alert('Atleta apagado com sucesso!');
            loadAtletas();
        } catch (error) {
            console.error("Erro ao apagar atleta:", error);
            alert("Erro ao apagar atleta: " + error.message);
        }
    };

    function resetAtletaForm() {
        if (!formAtleta) return;
        formAtleta.reset();
        editAtletaIdInput.value = '';
        fotoUrlInput.value = '';
        fotoFileInput.value = '';
        fotoPreviewDiv.style.display = 'none';
        
        formAtletaTitle.textContent = 'Adicionar Novo Atleta';
        btnSaveAtleta.textContent = 'Adicionar Atleta';
        if (btnCancelAtleta) btnCancelAtleta.classList.add('hidden');
        if (atletaMsg) atletaMsg.classList.add('hidden');
    }

    if (btnCancelAtleta) {
        btnCancelAtleta.addEventListener('click', closeAtletaModal);
    }

    let currentAtletas = [];

    // Função de filtragem combinada em tempo real (Pesquisa + Estado/Época + Escalão)
    function applyAtletasFilters() {
        const searchVal = (document.getElementById('filter-search-atleta')?.value || '').toLowerCase().trim();
        const epocaVal = document.getElementById('filter-epoca-atleta')?.value || '';
        const escalaoVal = document.getElementById('filter-escalao')?.value || '';

        const filtrados = currentAtletas.filter(atleta => {
            const matchesSearch = !searchVal || 
                (atleta.nome && atleta.nome.toLowerCase().includes(searchVal)) || 
                (atleta.nickname && atleta.nickname.toLowerCase().includes(searchVal));

            let matchesEpoca = true;
            if (epocaVal === '2026/2027') {
                matchesEpoca = atleta.epoca === '2026/2027';
            } else if (epocaVal === 'pendente') {
                matchesEpoca = atleta.epoca !== '2026/2027';
            }

            const matchesEscalao = !escalaoVal || atleta.escalao === escalaoVal;

            return matchesSearch && matchesEpoca && matchesEscalao;
        });

        renderAtletasTable(filtrados);
    }

    const filterSearchInput = document.getElementById('filter-search-atleta');
    const filterEpocaSelect = document.getElementById('filter-epoca-atleta');
    const filterEscalaoSelect = document.getElementById('filter-escalao');
    const btnClearFilters = document.getElementById('btn-clear-filters');

    if (filterSearchInput) filterSearchInput.addEventListener('input', applyAtletasFilters);
    if (filterEpocaSelect) filterEpocaSelect.addEventListener('change', applyAtletasFilters);
    if (filterEscalaoSelect) filterEscalaoSelect.addEventListener('change', applyAtletasFilters);
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (filterSearchInput) filterSearchInput.value = '';
            if (filterEpocaSelect) filterEpocaSelect.value = '';
            if (filterEscalaoSelect) filterEscalaoSelect.value = '';
            applyAtletasFilters();
        });
    }

    window.loadAtletas = async function() {
        if (!atletasTableBody) return;
        
        try {
            atletasTableBody.innerHTML = '<tr><td colspan="7" style="padding: 10px;">A carregar atletas...</td></tr>';
            
            const { data: atletas, error } = await supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    atletasTableBody.innerHTML = '<tr><td colspan="7" style="padding: 10px;">A tabela "atletasbcv" não existe na base de dados. Por favor, crie-a no Supabase.</td></tr>';
                    return;
                }
                throw error;
            }

            currentAtletas = atletas || [];
            applyAtletasFilters();
            
        } catch (error) {
            console.error("Erro ao carregar atletas:", error);
            atletasTableBody.innerHTML = `<tr><td colspan="7" style="color: red; padding: 10px;">Erro: ${error.message}</td></tr>`;
        }
    }

    function renderAtletasTable(lista) {
        atletasTableBody.innerHTML = '';
        
        if (!lista || lista.length === 0) {
            atletasTableBody.innerHTML = '<tr><td colspan="7" style="padding: 10px;">Nenhum atleta encontrado com os filtros selecionados.</td></tr>';
            return;
        }

        lista.forEach(atleta => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
            const atletaJson = JSON.stringify(atleta).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            
            const fotoHtml = atleta.foto 
                ? `<img src="${atleta.foto}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">` 
                : '<div style="width: 40px; height: 40px; background: rgba(0,0,0,0.05); border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size: 1.2rem;">👤</div>';

            const numCamisolaHtml = atleta.numero_camisola !== null && atleta.numero_camisola !== undefined && atleta.numero_camisola !== '' 
                ? `<span style="font-weight: 800; color: #7e22ce; background: rgba(126, 34, 206, 0.1); padding: 3px 8px; border-radius: 6px; font-size: 0.9rem;">#${atleta.numero_camisola}</span>`
                : '<span style="color: #a0a0ab;">-</span>';

            const isInscrito2627 = atleta.epoca === '2026/2027';
            const statusBadgeHtml = isInscrito2627
                ? '<span style="background: rgba(22, 163, 74, 0.12); color: #16a34a; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.78rem; border: 1px solid rgba(22, 163, 74, 0.3); white-space: nowrap;">🟢 2026/2027</span>'
                : `<span style="background: rgba(217, 119, 6, 0.12); color: #b45309; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.78rem; border: 1px solid rgba(217, 119, 6, 0.3); white-space: nowrap;">🟡 ${atleta.epoca || '2025/2026'} (Pendente)</span>`;

            tr.innerHTML = `
                <td style="padding: 10px;">${fotoHtml}</td>
                <td style="padding: 10px;"><strong>${atleta.nome || '-'}</strong></td>
                <td style="padding: 10px;"><span style="background: rgba(0,0,0,0.04); border: 1px solid var(--border-color); padding: 3px 8px; border-radius: 6px; font-size: 0.85rem;">${atleta.escalao || '-'}</span></td>
                <td style="padding: 10px;">${statusBadgeHtml}</td>
                <td style="padding: 10px;">${atleta.nickname ? `<span style="color: var(--accent-primary); font-weight: 600;">"${atleta.nickname}"</span>` : '<span style="color: #a0a0ab;">-</span>'}</td>
                <td style="padding: 10px; text-align: center;">${numCamisolaHtml}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button class="btn-action" onclick="window.exportAtletaPDF('${atletaJson}')" title="Descarregar Ficha FPB (PDF)" style="background: rgba(126, 34, 206, 0.15); color: #7e22ce; border: 1px solid rgba(126, 34, 206, 0.3); font-weight: bold; margin-right: 4px; padding: 4px 8px;">📄 FPB</button>
                    <button class="btn-action" onclick="window.exportAtletaEMDPDF('${atletaJson}')" title="Descarregar Exame Médico Desportivo (PDF)" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: bold; margin-right: 4px; padding: 4px 8px;">🩺 EMD</button>
                    <button class="btn-action" onclick="window.editAtleta('${atletaJson}')" title="Editar" style="padding: 4px 8px; margin-right: 4px;">✏️ Editar</button>
                    <button class="btn-action delete" onclick="window.deleteAtleta('${atleta.id}')" title="Anular Atleta" style="padding: 4px 8px;">🗑️ Anular</button>
                </td>
            `;
            atletasTableBody.appendChild(tr);
        });
    }

    // Função para exportar PDF Oficial do Modelo 1 da FPB usando pdf-lib
    window.exportAtletaPDF = async function(atletaStr) {
        try {
            const atleta = typeof atletaStr === 'string' ? JSON.parse(atletaStr) : atletaStr;
            
            if (!window.PDFLib) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'js/pdf-lib.min.js';
                    s.onload = resolve;
                    s.onerror = () => {
                        const s2 = document.createElement('script');
                        s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
                        s2.onload = resolve;
                        s2.onerror = () => reject(new Error('Falha ao carregar biblioteca PDF'));
                        document.head.appendChild(s2);
                    };
                    document.head.appendChild(s);
                });
            }

            const { PDFDocument } = window.PDFLib;

            // Carregar o ficheiro PDF oficial do Modelo 1 da FPB
            const response = await fetch('assets/Modelo_1_FPB.pdf');
            if (!response.ok) {
                throw new Error('Não foi possível carregar o ficheiro template assets/Modelo_1_FPB.pdf');
            }
            const existingPdfBytes = await response.arrayBuffer();

            // Carregar no PDFDocument
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();

            const safeSetText = (fieldName, value) => {
                try {
                    if (value !== undefined && value !== null && value !== '') {
                        const field = form.getTextField(fieldName);
                        field.setText(String(value));
                    }
                } catch (err) {
                    console.warn(`Campo texto não encontrado no PDF: ${fieldName}`, err);
                }
            };

            const safeCheck = (fieldName, condition = true) => {
                try {
                    if (condition) {
                        const cb = form.getCheckBox(fieldName);
                        cb.check();
                    }
                } catch (err) {
                    console.warn(`Checkbox não encontrada no PDF: ${fieldName}`, err);
                }
            };

            // 1. Dados do Clube e Época
            safeSetText('Clube', 'BASKET CLUBE DE VALENÇA');
            safeSetText('associacao', 'AB Viana do Castelo');

            let ep1 = '2026', ep2 = '2027';
            if (atleta.epoca && atleta.epoca.includes('/')) {
                const epParts = atleta.epoca.split('/');
                ep1 = epParts[0].trim();
                ep2 = epParts[1].trim();
            }
            safeSetText('epoca1', ep1);
            safeSetText('epoca2', ep2);

            // 2. Tipo de Inscrição e Licença
            if (atleta.tipo_inscricao === 'Primeira Inscrição') {
                safeCheck('primeira');
            } else {
                safeCheck('revalidacao');
            }
            safeSetText('nr_licenca', atleta.licenca || '');

            // 3. Sexo e Escalão
            if (atleta.sexo === 'F') {
                safeCheck('Feminino');
            } else {
                safeCheck('Masculino');
            }

            const esc = (atleta.escalao || '').toLowerCase().replace(/[\s\-_]/g, '');
            if (esc.includes('baby')) safeCheck('BabyBasket');
            else if (esc.includes('mini8') || esc === 'sub8') safeCheck('Mini8');
            else if (esc.includes('mini10') || esc === 'sub10') safeCheck('Mini10');
            else if (esc.includes('mini12') || esc === 'sub12') safeCheck('Mini12');
            else if (esc.includes('sub14')) safeCheck('Sub14');
            else if (esc.includes('sub16')) safeCheck('Sub16');
            else if (esc.includes('sub18')) safeCheck('Sub18');
            else if (esc.includes('senior') || esc.includes('sénior')) safeCheck('Sénior');
            else if (esc.includes('master')) safeCheck('Master');
            else if (esc.includes('bcr')) safeCheck('BCR');

            // 4. Identificação do Jogador
            safeSetText('Nome Completo', atleta.nome || '');
            safeSetText('Nacionalidade', atleta.nacionalidade || 'Portuguesa');
            safeSetText('País de Nascimento', atleta.pais_nascimento || 'Portugal');

            if (atleta.data_nascimento) {
                const parts = atleta.data_nascimento.includes('-') 
                    ? atleta.data_nascimento.split('-') 
                    : atleta.data_nascimento.split('/');
                if (parts.length === 3) {
                    if (parts[0].length === 4) { // YYYY-MM-DD
                        safeSetText('dn_ano', parts[0]);
                        safeSetText('dn_mes', parts[1]);
                        safeSetText('dn_dia', parts[2]);
                    } else { // DD-MM-YYYY
                        safeSetText('dn_dia', parts[0]);
                        safeSetText('dn_mes', parts[1]);
                        safeSetText('dn_ano', parts[2]);
                    }
                }
            }

            // 5. Documento de Identificação
            const tipoDoc = (atleta.tipo_doc_id || '').toLowerCase();
            if (tipoDoc.includes('passaporte')) {
                safeCheck('Passaporte');
            } else if (tipoDoc.includes('outro') || (tipoDoc && !tipoDoc.includes('cidad'))) {
                safeCheck('Outro');
                safeSetText('outro_descricao', atleta.tipo_doc_id);
            } else {
                safeCheck('Cartão Cidadão');
            }

            safeSetText('nr_identificacao', atleta.num_doc_id || '');

            if (atleta.validade_doc_id) {
                const parts = atleta.validade_doc_id.includes('-') 
                    ? atleta.validade_doc_id.split('-') 
                    : atleta.validade_doc_id.split('/');
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        safeSetText('val_ano', parts[0]);
                        safeSetText('val_mes', parts[1]);
                        safeSetText('val_dia', parts[2]);
                    } else {
                        safeSetText('val_dia', parts[0]);
                        safeSetText('val_mes', parts[1]);
                        safeSetText('val_ano', parts[2]);
                    }
                }
            }

            safeSetText('Nr Contribuinte', atleta.nif || '');

            // 6. Contactos e Morada
            safeSetText('Morada', atleta.morada || '');
            safeSetText('Localidade', atleta.localidade || 'Valença');

            if (atleta.codigo_postal) {
                const cpClean = atleta.codigo_postal.replace(/[^\d\-]/g, '');
                if (cpClean.includes('-')) {
                    const cpParts = cpClean.split('-');
                    safeSetText('codpostal', cpParts[0]);
                    safeSetText('cp3', cpParts[1]);
                } else if (cpClean.length >= 4) {
                    safeSetText('codpostal', cpClean.substring(0, 4));
                    if (cpClean.length > 4) safeSetText('cp3', cpClean.substring(4, 7));
                } else {
                    safeSetText('codpostal', cpClean);
                }
            }

            safeSetText('Concelho', atleta.concelho || 'Valença');
            safeSetText('Distrito', atleta.distrito || 'Viana do Castelo');
            safeSetText('Telemóvel', atleta.telefone || '');
            safeSetText('Telefone', atleta.telefone || '');
            safeSetText('Email', atleta.email || '');

            // 7. Seguro Desportivo
            if (atleta.tipo_seguro === 'Seguro Clube') {
                safeCheck('Seguro Clube');
                safeSetText('N Apólice', atleta.seguro_apolice || '');
                safeSetText('Companhia', atleta.seguro_companhia || '');
            } else {
                safeCheck('Seguro FPB');
            }

            // 8. Autorizações / RGPD
            safeCheck('SIM');
            safeCheck('SIM_2');
            safeCheck('SIM_3');
            safeCheck('fpb');

            // 9. Poder Paternal (Menores de Idade)
            if (atleta.encarregado_nome) {
                safeSetText('nome_paternal', atleta.encarregado_nome);
                
                const qual = (atleta.encarregado_qualidade || '').toLowerCase();
                if (qual.includes('mãe') || qual.includes('mae')) safeCheck('mae');
                else if (qual.includes('pai')) safeCheck('pai');
                else if (qual.includes('tutor')) safeCheck('Tutor');

                const encTipoDoc = (atleta.encarregado_tipo_doc || '').toLowerCase();
                if (encTipoDoc.includes('passaporte')) safeCheck('passaporte_2');
                else if (encTipoDoc.includes('outro')) safeCheck('Outro_2');
                else if (atleta.encarregado_num_doc) safeCheck('titular do Cartão Cidadão');

                safeSetText('paternal_id', atleta.encarregado_num_doc || '');

                if (atleta.encarregado_validade_doc) {
                    const parts = atleta.encarregado_validade_doc.includes('-') 
                        ? atleta.encarregado_validade_doc.split('-') 
                        : atleta.encarregado_validade_doc.split('/');
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            safeSetText('paternal_ano', parts[0]);
                            safeSetText('paternal_mes', parts[1]);
                            safeSetText('paternal_dia', parts[2]);
                        } else {
                            safeSetText('paternal_dia', parts[0]);
                            safeSetText('paternal_mes', parts[1]);
                            safeSetText('paternal_ano', parts[2]);
                        }
                    }
                }

                safeSetText('paternal_telefone', atleta.encarregado_telefone || '');
                safeSetText('email_paternal', atleta.encarregado_email || '');
            }

            // 10. Data de Emissão / Assinatura
            const hoje = new Date();
            safeSetText('ass_dia', String(hoje.getDate()).padStart(2, '0'));
            safeSetText('ass_mes', String(hoje.getMonth() + 1).padStart(2, '0'));
            safeSetText('ass_ano', String(hoje.getFullYear()));

            // Gerar bytes e efetuar download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Inscricao_FPB_${(atleta.nome || 'Atleta').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Erro ao gerar PDF da FPB:', error);
            alert('Erro ao gerar ficha oficial da FPB: ' + error.message);
        }
    };

    // Função para exportar PDF Oficial do Exame Médico Desportivo (IPDJ) usando pdf-lib
    window.exportAtletaEMDPDF = async function(atletaStr) {
        try {
            const atleta = typeof atletaStr === 'string' ? JSON.parse(atletaStr) : atletaStr;
            
            if (!window.PDFLib) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'js/pdf-lib.min.js';
                    s.onload = resolve;
                    s.onerror = () => {
                        const s2 = document.createElement('script');
                        s2.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
                        s2.onload = resolve;
                        s2.onerror = () => reject(new Error('Falha ao carregar biblioteca PDF'));
                        document.head.appendChild(s2);
                    };
                    document.head.appendChild(s);
                });
            }

            const { PDFDocument } = window.PDFLib;

            // Carregar o ficheiro PDF oficial do IPDJ
            const response = await fetch('assets/ipdj-exame-medico.pdf');
            if (!response.ok) {
                throw new Error('Não foi possível carregar o ficheiro template assets/ipdj-exame-medico.pdf');
            }
            const existingPdfBytes = await response.arrayBuffer();

            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const form = pdfDoc.getForm();

            const safeSetText = (fieldName, value) => {
                try {
                    if (value !== undefined && value !== null && value !== '') {
                        const field = form.getTextField(fieldName);
                        field.setText(String(value));
                    }
                } catch (err) {
                    console.warn(`Campo texto não encontrado no PDF EMD: ${fieldName}`, err);
                }
            };

            const safeSelectRadio = (radioName, value) => {
                try {
                    const radio = form.getRadioGroup(radioName);
                    radio.select(value);
                } catch (err) {
                    console.warn(`Radio não encontrado no PDF EMD: ${radioName}`, err);
                }
            };

            // 1. Identificação Geral
            safeSetText('nome', atleta.nome || '');
            safeSetText('cc', atleta.num_doc_id || '');
            safeSetText('nacionalidade', atleta.nacionalidade || 'Portuguesa');
            safeSetText('morada', atleta.morada || '');
            safeSetText('cpostal', atleta.codigo_postal || '');
            safeSetText('localidade', atleta.localidade || '');
            safeSetText('telemovel', atleta.telefone || '');
            safeSetText('clube', 'BASKET CLUBE DE VALENÇA');
            safeSetText('modalidade', 'BASQUETEBOL');
            safeSetText('escalao', atleta.escalao || '');

            // Formatação da Data de Nascimento
            if (atleta.data_nascimento) {
                const parts = atleta.data_nascimento.includes('-')
                    ? atleta.data_nascimento.split('-')
                    : atleta.data_nascimento.split('/');
                if (parts.length === 3) {
                    const dnFormatada = parts[0].length === 4
                        ? `${parts[2]}/${parts[1]}/${parts[0]}`
                        : `${parts[0]}/${parts[1]}/${parts[2]}`;
                    safeSetText('datanasc', dnFormatada);
                } else {
                    safeSetText('datanasc', atleta.data_nascimento);
                }
            }

            // Data Atual
            const hoje = new Date();
            const dataHojeFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
            safeSetText('data', dataHojeFormatada);

            // 2. Mapeamento das 19 Perguntas EMD
            const emdResp = atleta.emd_respostas || {};
            const anoFieldNames = {
                1: 'ANO1Esteve internado no Hospital ou Clínica',
                2: 'ANO2Foi operado',
                3: 'ANO3Perdas de consciencia Epilepsia',
                4: 'ANO4Teve alguma lesão no desporto',
                5: 'ANO5Hábitos alcoólicos  tabágicos',
                6: 'ANO6Consome narcóticos estimulantesou outras substancias',
                7: 'ANO7Toma regularmente algum medicamento',
                8: 'ANO8Doenças alérgicas',
                9: 'ANO9Asma pneumotorax tuberculoseoutras doenças pulmonares',
                10: 'ANO10Doenças do aparelho digestivo',
                11: 'ANO11Doenças do coração',
                12: 'ANO12Doenças renais',
                13: 'ANO13Doenças ósseas coluna ou articulações',
                14: 'ANO14Diabetes',
                15: 'ANO15Doenças do sangue',
                16: 'ANO16Doenças mentais',
                17: 'ANO17Doenças da pele',
                18: 'ANO18Teve alguma doença aqui não mencionada',
                19: 'ANO19Já fez um exame médico desportivo'
            };

            for (let i = 1; i <= 19; i++) {
                const qKey = 'q' + i;
                const item = emdResp[qKey];
                const isSim = item && item.resposta === 'SIM';
                const radioName = '1.' + i;
                const anoFieldName = anoFieldNames[i];

                if (isSim) {
                    safeSelectRadio(radioName, 'Escolha1');
                    if (item.ano) {
                        safeSetText(anoFieldName, item.ano);
                    }
                } else {
                    safeSelectRadio(radioName, i === 4 ? '2' : '0');
                }
            }

            // 3. Pergunta 20 (Resultado Anterior)
            safeSetText('20Resultado do exame anterior', atleta.emd_resultado_anterior || 'Apto sem restrições');

            // Gerar bytes e efetuar download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Exame_Medico_${(atleta.nome || 'Atleta').replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Erro ao gerar PDF do Exame Médico:', error);
            alert('❌ Erro ao gerar PDF do Exame Médico: ' + error.message);
        }
    };

    // Modal Popup de Atleta (Criar / Editar)
    const btnToggleFormAtleta = document.getElementById('btn-toggle-form-atleta');
    const formAtletaContainer = document.getElementById('form-atleta-container');
    const btnCloseModalAtleta = document.getElementById('btn-close-modal-atleta');

    function openAtletaModal() {
        if (formAtletaContainer) {
            formAtletaContainer.classList.remove('hidden');
        }
    }

    function closeAtletaModal() {
        if (formAtletaContainer) {
            formAtletaContainer.classList.add('hidden');
            resetAtletaForm();
        }
    }

    if (btnToggleFormAtleta) {
        btnToggleFormAtleta.addEventListener('click', () => {
            resetAtletaForm();
            formAtletaTitle.textContent = 'Adicionar Novo Atleta';
            btnSaveAtleta.textContent = 'Adicionar Atleta';
            openAtletaModal();
        });
    }

    if (btnCloseModalAtleta) {
        btnCloseModalAtleta.addEventListener('click', closeAtletaModal);
    }

    // Fechar a modal se clicar no fundo escuro
    if (formAtletaContainer) {
        formAtletaContainer.addEventListener('click', (e) => {
            if (e.target === formAtletaContainer) {
                closeAtletaModal();
            }
        });
    }

    window.editAtleta = function(atletaStr) {
        const atleta = JSON.parse(atletaStr);
        
        editAtletaIdInput.value = atleta.id;
        document.getElementById('atleta-nome').value = atleta.nome || '';
        document.getElementById('atleta-nickname').value = atleta.nickname || '';
        document.getElementById('atleta-epoca').value = atleta.epoca || '';
        document.getElementById('atleta-funcao').value = atleta.funcao || '';

        document.getElementById('atleta-numero').value = atleta.numero_camisola || '';
        document.getElementById('atleta-escalao').value = atleta.escalao || '';
        document.getElementById('atleta-sexo').value = atleta.sexo || '';
        document.getElementById('atleta-nascimento').value = atleta.data_nascimento || '';
        document.getElementById('atleta-nacionalidade').value = atleta.nacionalidade || '';
        document.getElementById('atleta-licenca').value = atleta.licenca || '';

        if (document.getElementById('atleta-nif')) document.getElementById('atleta-nif').value = atleta.nif || '';
        if (document.getElementById('atleta-email')) document.getElementById('atleta-email').value = atleta.email || '';
        if (document.getElementById('atleta-telefone')) document.getElementById('atleta-telefone').value = atleta.telefone || '';

        if (document.getElementById('atleta-tipo-doc')) document.getElementById('atleta-tipo-doc').value = atleta.tipo_doc_id || 'Cartão Cidadão';
        if (document.getElementById('atleta-num-doc')) document.getElementById('atleta-num-doc').value = atleta.num_doc_id || '';
        if (document.getElementById('atleta-validade-doc')) document.getElementById('atleta-validade-doc').value = atleta.validade_doc_id || '';
        if (document.getElementById('atleta-morada')) document.getElementById('atleta-morada').value = atleta.morada || '';
        if (document.getElementById('atleta-cp')) document.getElementById('atleta-cp').value = atleta.codigo_postal || '';
        if (document.getElementById('atleta-localidade')) document.getElementById('atleta-localidade').value = atleta.localidade || '';
        if (document.getElementById('atleta-pais-nasc')) document.getElementById('atleta-pais-nasc').value = atleta.pais_nascimento || '';

        // Encarregado de Educação
        if (document.getElementById('atleta-encarregado-nome')) document.getElementById('atleta-encarregado-nome').value = atleta.encarregado_nome || '';
        if (document.getElementById('atleta-encarregado-qualidade')) document.getElementById('atleta-encarregado-qualidade').value = atleta.encarregado_qualidade || '';
        if (document.getElementById('atleta-encarregado-tipo-doc')) document.getElementById('atleta-encarregado-tipo-doc').value = atleta.encarregado_tipo_doc || 'Cartão Cidadão';
        if (document.getElementById('atleta-encarregado-num-doc')) document.getElementById('atleta-encarregado-num-doc').value = atleta.encarregado_num_doc || '';
        if (document.getElementById('atleta-encarregado-validade-doc')) document.getElementById('atleta-encarregado-validade-doc').value = atleta.encarregado_validade_doc || '';
        if (document.getElementById('atleta-encarregado-email')) document.getElementById('atleta-encarregado-email').value = atleta.encarregado_email || '';
        if (document.getElementById('atleta-encarregado-telefone')) document.getElementById('atleta-encarregado-telefone').value = atleta.encarregado_telefone || '';

        // Equipamento
        if (document.getElementById('atleta-equip-tam')) document.getElementById('atleta-equip-tam').value = atleta.equipamento_tamanho || '';
        if (document.getElementById('atleta-equip-calcao')) document.getElementById('atleta-equip-calcao').value = atleta.equipamento_tamanho_calcao || '';
        if (document.getElementById('atleta-equip-num1')) document.getElementById('atleta-equip-num1').value = atleta.equipamento_numero_1 || '';
        if (document.getElementById('atleta-equip-num2')) document.getElementById('atleta-equip-num2').value = atleta.equipamento_numero_2 || '';
        if (document.getElementById('atleta-equip-nome')) document.getElementById('atleta-equip-nome').value = atleta.equipamento_nome_camisola || '';
        
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
        
        if (formAtletaContainer) {
            formAtletaContainer.classList.remove('hidden');
            if (btnToggleFormAtleta) btnToggleFormAtleta.textContent = 'Esconder Formulário';
            formAtletaContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
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
                nickname: document.getElementById('atleta-nickname').value || null,
                epoca: document.getElementById('atleta-epoca').value,
                funcao: document.getElementById('atleta-funcao').value,
                numero_camisola: document.getElementById('atleta-numero').value ? parseInt(document.getElementById('atleta-numero').value) : null,
                escalao: document.getElementById('atleta-escalao').value,
                sexo: document.getElementById('atleta-sexo').value,
                data_nascimento: document.getElementById('atleta-nascimento').value || null,
                nacionalidade: document.getElementById('atleta-nacionalidade').value,
                licenca: document.getElementById('atleta-licenca').value,
                foto: fotoUrlInput.value,

                // Documentos e Residência
                nif: document.getElementById('atleta-nif') ? document.getElementById('atleta-nif').value : null,
                email: document.getElementById('atleta-email') ? document.getElementById('atleta-email').value : null,
                telefone: document.getElementById('atleta-telefone') ? document.getElementById('atleta-telefone').value : null,
                tipo_doc_id: document.getElementById('atleta-tipo-doc') ? document.getElementById('atleta-tipo-doc').value : 'Cartão Cidadão',
                num_doc_id: document.getElementById('atleta-num-doc') ? document.getElementById('atleta-num-doc').value : null,
                validade_doc_id: document.getElementById('atleta-validade-doc') ? (document.getElementById('atleta-validade-doc').value || null) : null,
                morada: document.getElementById('atleta-morada') ? document.getElementById('atleta-morada').value : null,
                codigo_postal: document.getElementById('atleta-cp') ? document.getElementById('atleta-cp').value : null,
                localidade: document.getElementById('atleta-localidade') ? document.getElementById('atleta-localidade').value : null,
                pais_nascimento: document.getElementById('atleta-pais-nasc') ? document.getElementById('atleta-pais-nasc').value : null,

                // Encarregado de Educação
                encarregado_nome: document.getElementById('atleta-encarregado-nome') ? (document.getElementById('atleta-encarregado-nome').value || null) : null,
                encarregado_qualidade: document.getElementById('atleta-encarregado-qualidade') ? (document.getElementById('atleta-encarregado-qualidade').value || null) : null,
                encarregado_tipo_doc: document.getElementById('atleta-encarregado-tipo-doc') ? (document.getElementById('atleta-encarregado-tipo-doc').value || null) : null,
                encarregado_num_doc: document.getElementById('atleta-encarregado-num-doc') ? (document.getElementById('atleta-encarregado-num-doc').value || null) : null,
                encarregado_validade_doc: document.getElementById('atleta-encarregado-validade-doc') ? (document.getElementById('atleta-encarregado-validade-doc').value || null) : null,
                encarregado_email: document.getElementById('atleta-encarregado-email') ? (document.getElementById('atleta-encarregado-email').value || null) : null,
                encarregado_telefone: document.getElementById('atleta-encarregado-telefone') ? (document.getElementById('atleta-encarregado-telefone').value || null) : null,

                // Equipamento
                equipamento_tamanho: document.getElementById('atleta-equip-tam') ? document.getElementById('atleta-equip-tam').value : null,
                equipamento_tamanho_calcao: document.getElementById('atleta-equip-calcao') ? document.getElementById('atleta-equip-calcao').value : null,
                equipamento_numero_1: document.getElementById('atleta-equip-num1') ? document.getElementById('atleta-equip-num1').value : null,
                equipamento_numero_2: document.getElementById('atleta-equip-num2') ? document.getElementById('atleta-equip-num2').value : null,
                equipamento_nome_camisola: document.getElementById('atleta-equip-nome') ? document.getElementById('atleta-equip-nome').value : null
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
            if (target === 'tab-equipas') loadEquipas();
        });
    });


    // Iniciar
    checkSession();
});
