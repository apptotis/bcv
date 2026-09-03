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
            const allowedRoles = ['admin', 'editor', 'redator', 'treinador', 'diretor', 'seccionista', 'personalizado', 'user'];
            const userPerms = Array.isArray(profile.permissoes) ? profile.permissoes : [];
            const isAllowed = allowedRoles.includes(role) || userPerms.length > 0 || role === 'admin';

            if (isAllowed) {
                // Redirecionamento automático para portais dedicados mobile
                if (role === 'diretor' || role === 'seccionista') {
                    window.location.href = 'diretor.html';
                    return;
                }
                if (role === 'treinador') {
                    window.location.href = 'treinador.html';
                    return;
                }
                if (role === 'redator') {
                    window.location.href = 'redator.html';
                    return;
                }

                // Acesso permitido ao painel geral
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
            { tab: 'tab-equipamentos', allow: isAdmin || userPerms.includes('equipamentos') || role === 'treinador' },
            { tab: 'tab-desportiva', allow: isAdmin || userPerms.includes('desportiva') || role === 'treinador' },
            { tab: 'tab-financeira', allow: isAdmin || userPerms.includes('financeira') },
            { tab: 'tab-noticias', allow: isAdmin || userPerms.includes('noticias') || role === 'editor' },
            { tab: 'tab-agenda', allow: isAdmin || userPerms.includes('agenda') || role === 'editor' },
            { tab: 'tab-resultados', allow: isAdmin || userPerms.includes('resultados') },
            { tab: 'tab-galeria', allow: isAdmin || userPerms.includes('galeria') || role === 'editor' },
            { tab: 'tab-equipas', allow: isAdmin || userPerms.includes('equipas') || role === 'treinador' },
            { tab: 'tab-patrocinadores', allow: isAdmin || userPerms.includes('patrocinadores') },
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

            if (targetId === 'tab-equipamentos') {
                if (typeof loadEquipamentos === 'function') loadEquipamentos();
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

    const containerUserEscalao = document.getElementById('container-user-escalao');
    const checkboxesEscaloes = document.querySelectorAll('input[name="user_escaloes"]');

    const MODULO_LABELS = {
        'noticias': 'Notícias',
        'agenda': 'Agenda',
        'resultados': 'Resultados',
        'galeria': 'Galeria',
        'equipas': 'Equipas',
        'atletas': 'Atletas',
        'equipamentos': 'Equipamentos',
        'desportiva': 'Gestão Desportiva',
        'financeira': 'Gestão Financeira',
        'config': 'Config'
    };

    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            const val = roleSelect.value;
            if (val === 'personalizado') {
                if (containerPermissoes) containerPermissoes.style.display = 'block';
                if (containerUserEscalao) containerUserEscalao.style.display = 'block';
            } else if (val === 'diretor' || val === 'treinador') {
                if (containerPermissoes) containerPermissoes.style.display = 'none';
                if (containerUserEscalao) containerUserEscalao.style.display = 'block';
                checkboxesPermissoes.forEach(cb => cb.checked = false);
            } else {
                if (containerPermissoes) containerPermissoes.style.display = 'none';
                if (containerUserEscalao) containerUserEscalao.style.display = 'none';
                checkboxesPermissoes.forEach(cb => cb.checked = false);
                checkboxesEscaloes.forEach(cb => cb.checked = false);
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

    function getSelectedEscaloes() {
        const selected = [];
        checkboxesEscaloes.forEach(cb => {
            if (cb.checked) selected.push(cb.value);
        });
        return selected;
    }

    function setSelectedEscaloes(val) {
        let list = [];
        if (Array.isArray(val)) {
            list = val;
        } else if (typeof val === 'string' && val.trim() !== '') {
            list = val.split(',').map(s => s.trim().toLowerCase());
        }
        checkboxesEscaloes.forEach(cb => {
            cb.checked = list.includes(cb.value.toLowerCase());
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
        if (containerUserEscalao) containerUserEscalao.style.display = 'none';
        checkboxesPermissoes.forEach(cb => cb.checked = false);
        checkboxesEscaloes.forEach(cb => cb.checked = false);
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
                const uRole = (user.role || 'personalizado').toLowerCase();
                const isAdmin = uRole === 'admin';
                const isDiretor = uRole === 'diretor' || uRole === 'seccionista';
                const isTreinador = uRole === 'treinador';
                const isRedator = uRole === 'redator' || uRole === 'editor';

                let roleBadgeHtml = '';
                if (isAdmin) {
                    roleBadgeHtml = '<strong style="color: #7e22ce;">Admin Total</strong>';
                } else if (isDiretor) {
                    roleBadgeHtml = '<span style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">📱 Diretor de Campo</span>';
                } else if (isTreinador) {
                    roleBadgeHtml = '<span style="background: rgba(59, 130, 246, 0.15); color: #2563eb; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">🏀 Treinador</span>';
                } else if (isRedator) {
                    roleBadgeHtml = '<span style="background: rgba(234, 88, 12, 0.15); color: #c2410c; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">📰 Redator</span>';
                } else {
                    roleBadgeHtml = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Personalizado</span>';
                }
                
                let permissoesBadgeHtml = '';
                if (isAdmin) {
                    permissoesBadgeHtml = '<span style="background: rgba(126, 34, 206, 0.12); color: #7e22ce; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; border: 1px solid rgba(126, 34, 206, 0.25);">⭐ Acesso a Tudo</span>';
                } else if (isDiretor) {
                    const escList = (user.escalao_afeto || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (escList.length > 0) {
                        permissoesBadgeHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px;">` +
                            escList.map(esc => `<span style="background: rgba(16, 185, 129, 0.12); color: #047857; font-weight: 700; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(16, 185, 129, 0.3);">🏀 ${esc}</span>`).join('') +
                            `</div>`;
                    } else {
                        permissoesBadgeHtml = `<span style="background: rgba(16, 185, 129, 0.08); color: #047857; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">Todas as Equipas</span>`;
                    }
                } else if (isTreinador) {
                    const escList = (user.escalao_afeto || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (escList.length > 0) {
                        permissoesBadgeHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px;">` +
                            escList.map(esc => `<span style="background: rgba(59, 130, 246, 0.12); color: #1d4ed8; font-weight: 700; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.3);">🏀 ${esc}</span>`).join('') +
                            `</div>`;
                    } else {
                        permissoesBadgeHtml = `<span style="background: rgba(59, 130, 246, 0.08); color: #1d4ed8; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">Todas as Equipas</span>`;
                    }
                } else if (isRedator) {
                    permissoesBadgeHtml = '<span style="background: rgba(234, 88, 12, 0.1); color: #c2410c; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; border: 1px solid rgba(234, 88, 12, 0.25);">📰 Notícias & Artigos</span>';
                } else {
                    const userPerms = Array.isArray(user.permissoes) ? user.permissoes : [];
                    const escList = (user.escalao_afeto || '').split(',').map(s => s.trim()).filter(Boolean);
                    const escTags = escList.map(esc => `<span style="background: rgba(126, 34, 206, 0.08); color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">🏀 ${esc}</span>`).join('');
                    
                    if (userPerms.length > 0) {
                        permissoesBadgeHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">` +
                            escTags +
                            userPerms.map(p => `<span style="background: rgba(0, 0, 0, 0.05); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; border: 1px solid var(--border-color);">${MODULO_LABELS[p] || p}</span>`).join('') +
                            `</div>`;
                    } else {
                        permissoesBadgeHtml = escTags || '<span style="color: var(--text-secondary); font-size: 0.8rem;">(Nenhum menu)</span>';
                    }
                }

                tr.innerHTML = `
                    <td style="padding: 10px; font-weight: 600;">${user.nome || '-'}</td>
                    <td style="padding: 10px;">${user.email || '-'}</td>
                    <td style="padding: 10px;">${roleBadgeHtml}</td>
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
        
        const role = (user.role || 'personalizado').toLowerCase();
        roleSelect.value = role;
        
        setSelectedEscaloes(user.escalao_afeto || '');

        if (role === 'personalizado') {
            if (containerPermissoes) containerPermissoes.style.display = 'block';
            if (containerUserEscalao) containerUserEscalao.style.display = 'block';
            setSelectedPermissions(user.permissoes || []);
        } else if (role === 'diretor' || role === 'treinador') {
            if (containerPermissoes) containerPermissoes.style.display = 'none';
            if (containerUserEscalao) containerUserEscalao.style.display = 'block';
            checkboxesPermissoes.forEach(cb => cb.checked = false);
        } else {
            if (containerPermissoes) containerPermissoes.style.display = 'none';
            if (containerUserEscalao) containerUserEscalao.style.display = 'none';
            checkboxesPermissoes.forEach(cb => cb.checked = false);
            checkboxesEscaloes.forEach(cb => cb.checked = false);
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
        const escalaoAfeto = getSelectedEscaloes().join(', ');
        
        const role = roleVal || 'personalizado';
        const allModules = ['noticias', 'agenda', 'resultados', 'galeria', 'equipas', 'atletas', 'equipamentos', 'desportiva', 'financeira', 'config'];
        
        let permissoes = [];
        if (role === 'admin') {
            permissoes = allModules;
        } else if (role === 'diretor') {
            permissoes = ['diretor_presencas', 'diretor_mensalidades'];
        } else if (role === 'treinador') {
            permissoes = ['atletas', 'equipas'];
        } else {
            permissoes = getSelectedPermissions();
        }

        if (role === 'personalizado' && permissoes.length === 0) {
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
                    p_permissoes: permissoes,
                    p_escalao_afeto: escalaoAfeto
                });
                if (error) {
                    // Fallback caso a RPC ainda não tenha o parâmetro p_escalao_afeto atualizado no Supabase
                    const { error: fallbackErr } = await supabase
                        .from('users')
                        .update({ nome, telemovel, role, permissoes, escalao_afeto: escalaoAfeto })
                        .eq('id', userId);
                    if (fallbackErr) throw error;
                }
                createUserMsg.textContent = "✅ Utilizador atualizado com sucesso!";
            } else {
                // Criar
                const { error } = await supabase.rpc('admin_create_user', {
                    p_email: email,
                    p_password: password,
                    p_nome: nome,
                    p_telemovel: telemovel,
                    p_role: role,
                    p_permissoes: permissoes,
                    p_escalao_afeto: escalaoAfeto
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

    function normalizeEscalao(val) {
        if (!val) return '';
        return String(val).toLowerCase().replace(/[\s\-_]/g, '');
    }

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

            let matchesEscalao = true;
            if (escalaoVal) {
                const normFiltro = normalizeEscalao(escalaoVal);
                const normAtleta = normalizeEscalao(atleta.escalao);
                matchesEscalao = normAtleta === normFiltro || 
                                 normAtleta.startsWith(normFiltro) ||
                                 (normFiltro === 'seniores' && normAtleta.startsWith('senior')) ||
                                 (normFiltro.includes('veterano') && (normAtleta.includes('veterano') || normAtleta.includes('master'))) ||
                                 (normFiltro.includes('master') && (normAtleta.includes('veterano') || normAtleta.includes('master')));
            }

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

            const numCamisolaVal = (atleta.numero_camisola !== null && atleta.numero_camisola !== undefined && atleta.numero_camisola !== '') 
                ? atleta.numero_camisola 
                : (atleta.equipamento_numero_1 !== null && atleta.equipamento_numero_1 !== undefined && atleta.equipamento_numero_1 !== '' ? atleta.equipamento_numero_1 : null);

            const numCamisolaHtml = numCamisolaVal !== null
                ? `<span style="font-weight: 800; color: #7e22ce; background: rgba(126, 34, 206, 0.1); padding: 3px 8px; border-radius: 6px; font-size: 0.9rem;">#${numCamisolaVal}</span>`
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
                    <button class="btn-action" onclick="window.exportAtletaPDF(${atleta.id})" title="Descarregar Ficha FPB (PDF)" style="background: rgba(126, 34, 206, 0.15); color: #7e22ce; border: 1px solid rgba(126, 34, 206, 0.3); font-weight: bold; margin-right: 4px; padding: 4px 8px;">📄 FPB</button>
                    <button class="btn-action" onclick="window.exportAtletaEMDPDF(${atleta.id})" title="Descarregar Exame Médico Desportivo (PDF)" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: bold; margin-right: 4px; padding: 4px 8px;">🩺 EMD</button>
                    <button class="btn-action" onclick="window.editAtleta(${atleta.id})" title="Editar" style="padding: 4px 8px; margin-right: 4px;">✏️ Editar</button>
                    <button class="btn-action delete" onclick="window.deleteAtleta(${atleta.id})" title="Anular Atleta" style="padding: 4px 8px;">🗑️ Anular</button>
                </td>
            `;
            atletasTableBody.appendChild(tr);
        });
    }

    // Função para exportar PDF Oficial do Modelo 1 da FPB usando pdf-lib
    window.exportAtletaPDF = async function(atletaArg) {
        try {
            let atleta = null;
            if (typeof atletaArg === 'object' && atletaArg !== null) {
                atleta = atletaArg;
            } else if (typeof atletaArg === 'number' || typeof atletaArg === 'string') {
                atleta = currentAtletas.find(a => String(a.id) === String(atletaArg));
                if (!atleta) {
                    try { atleta = JSON.parse(atletaArg); } catch(e) {}
                }
            }
            if (!atleta) throw new Error('Atleta não encontrado.');
            
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

            const safeSetCheckbox = (fieldName, isChecked = true) => {
                try {
                    const cb = form.getCheckBox(fieldName);
                    if (isChecked) {
                        cb.check();
                    } else {
                        cb.uncheck();
                    }
                } catch (err) {
                    console.warn(`Checkbox não encontrada no PDF: ${fieldName}`, err);
                }
            };

            const safeCheck = (fieldName, condition = true) => {
                safeSetCheckbox(fieldName, Boolean(condition));
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
            // No template oficial da FPB, 'epoca2' é o campo à esquerda (ano inicial) e 'epoca1' à direita (ano final)
            safeSetText('epoca2', ep1);
            safeSetText('epoca1', ep2);

            // 2. Tipo de Inscrição e Licença
            const isPrimeira = (atleta.tipo_inscricao === 'Primeira Inscrição');
            safeSetCheckbox('primeira', isPrimeira);
            safeSetCheckbox('revalidacao', !isPrimeira);
            safeSetText('nr_licenca', atleta.licenca || '');

            // 3. Sexo e Escalão (Garante desmarcação mútua explícita)
            const isFeminino = (atleta.sexo === 'F' || atleta.sexo === 'Feminino');
            safeSetCheckbox('Feminino', isFeminino);
            safeSetCheckbox('Masculino', !isFeminino);

            const escaloes = ['BabyBasket', 'Mini8', 'Mini10', 'Mini12', 'Sub14', 'Sub16', 'Sub18', 'Sénior', 'Master', 'BCR'];
            escaloes.forEach(e => safeSetCheckbox(e, false));

            const esc = (atleta.escalao || '').toLowerCase().replace(/[\s\-_]/g, '');
            if (esc.includes('baby')) safeSetCheckbox('BabyBasket', true);
            else if (esc.includes('mini8') || esc === 'sub8') safeSetCheckbox('Mini8', true);
            else if (esc.includes('mini10') || esc === 'sub10') safeSetCheckbox('Mini10', true);
            else if (esc.includes('mini12') || esc === 'sub12') safeSetCheckbox('Mini12', true);
            else if (esc.includes('sub14')) safeSetCheckbox('Sub14', true);
            else if (esc.includes('sub16')) safeSetCheckbox('Sub16', true);
            else if (esc.includes('sub18')) safeSetCheckbox('Sub18', true);
            else if (esc.includes('senior') || esc.includes('sénior')) safeSetCheckbox('Sénior', true);
            else if (esc.includes('master')) safeSetCheckbox('Master', true);
            else if (esc.includes('bcr')) safeSetCheckbox('BCR', true);

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
            const isPassaporte = tipoDoc.includes('passaporte');
            const isOutro = tipoDoc.includes('outro') || (tipoDoc && !tipoDoc.includes('cidad'));
            const isCC = !isPassaporte && !isOutro;

            safeSetCheckbox('Passaporte', isPassaporte);
            safeSetCheckbox('Outro', isOutro);
            safeSetCheckbox('Cartão Cidadão', isCC);
            if (isOutro) {
                safeSetText('outro_descricao', atleta.tipo_doc_id);
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
            const isSeguroClube = (atleta.tipo_seguro === 'Seguro Clube');
            safeSetCheckbox('Seguro Clube', isSeguroClube);
            safeSetCheckbox('Seguro FPB', !isSeguroClube);
            if (isSeguroClube) {
                safeSetText('N Apólice', atleta.seguro_apolice || '');
                safeSetText('Companhia', atleta.seguro_companhia || '');
            }

            // 8. Autorizações / RGPD
            safeCheck('SIM');
            safeCheck('SIM_2');
            safeCheck('SIM_3');
            safeCheck('fpb');

            // 9. Poder Paternal (Menores de Idade)
            safeSetCheckbox('mae', false);
            safeSetCheckbox('pai', false);
            safeSetCheckbox('Tutor', false);
            safeSetCheckbox('passaporte_2', false);
            safeSetCheckbox('Outro_2', false);
            safeSetCheckbox('titular do Cartão Cidadão', false);

            if (atleta.encarregado_nome) {
                safeSetText('nome_paternal', atleta.encarregado_nome);
                
                const qual = (atleta.encarregado_qualidade || '').toLowerCase();
                if (qual.includes('mãe') || qual.includes('mae')) safeSetCheckbox('mae', true);
                else if (qual.includes('pai')) safeSetCheckbox('pai', true);
                else if (qual.includes('tutor')) safeSetCheckbox('Tutor', true);

                const encTipoDoc = (atleta.encarregado_tipo_doc || '').toLowerCase();
                if (encTipoDoc.includes('passaporte')) safeSetCheckbox('passaporte_2', true);
                else if (encTipoDoc.includes('outro')) safeSetCheckbox('Outro_2', true);
                else if (atleta.encarregado_num_doc) safeSetCheckbox('titular do Cartão Cidadão', true);

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

            // 11. Carimbo Oficial e Assinatura do Clube (Diretor e Carimbo)
            try {
                let carimboBytes = null;
                let isPng = true;
                const carimboResp = await fetch('assets/carimbo_assinatura_bcv.png');
                if (carimboResp.ok) {
                    carimboBytes = await carimboResp.arrayBuffer();
                } else {
                    const fallbackResp = await fetch('assets/assinatura_bcv.jpeg');
                    if (fallbackResp.ok) {
                        carimboBytes = await fallbackResp.arrayBuffer();
                        isPng = false;
                    }
                }

                if (carimboBytes) {
                    const carimboImg = isPng ? await pdfDoc.embedPng(carimboBytes) : await pdfDoc.embedJpg(carimboBytes);
                    const pages = pdfDoc.getPages();
                    if (pages.length > 0) {
                        const firstPage = pages[0];
                        const imgW = 165;
                        const imgH = imgW * (carimboImg.height / carimboImg.width);
                        firstPage.drawImage(carimboImg, {
                            x: 365,
                            y: 173,
                            width: imgW,
                            height: imgH
                        });
                    }
                }
            } catch (errCarimbo) {
                console.warn('Aviso: Não foi possível anexar carimbo/assinatura do clube no PDF:', errCarimbo);
            }

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
    window.exportAtletaEMDPDF = async function(atletaArg) {
        try {
            let atleta = null;
            if (typeof atletaArg === 'object' && atletaArg !== null) {
                atleta = atletaArg;
            } else if (typeof atletaArg === 'number' || typeof atletaArg === 'string') {
                atleta = (typeof currentAtletas !== 'undefined' ? currentAtletas.find(a => String(a.id) === String(atletaArg)) : null)
                      || (typeof currentEquipamentos !== 'undefined' ? currentEquipamentos.find(a => String(a.id) === String(atletaArg)) : null)
                      || (typeof filteredEquipamentos !== 'undefined' ? filteredEquipamentos.find(a => String(a.id) === String(atletaArg)) : null);
                if (!atleta) {
                    try { atleta = JSON.parse(atletaArg); } catch(e) {}
                }
            }
            if (!atleta) throw new Error('Atleta não encontrado.');
            
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
            safeSetText('localidade', atleta.localidade || 'Valença');
            safeSetText('telemovel', atleta.telefone || atleta.encarregado_telefone || '');
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
            let emdResp = atleta.emd_respostas || {};
            if (typeof emdResp === 'string') {
                try { emdResp = JSON.parse(emdResp); } catch(e) { emdResp = {}; }
            }
            if (!emdResp || typeof emdResp !== 'object') {
                emdResp = {};
            }
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

    window.editAtleta = function(atletaArg) {
        let atleta = null;
        if (typeof atletaArg === 'object' && atletaArg !== null) {
            atleta = atletaArg;
        } else if (typeof atletaArg === 'number' || typeof atletaArg === 'string') {
            atleta = (typeof currentAtletas !== 'undefined' ? currentAtletas.find(a => String(a.id) === String(atletaArg)) : null)
                  || (typeof currentEquipamentos !== 'undefined' ? currentEquipamentos.find(a => String(a.id) === String(atletaArg)) : null)
                  || (typeof filteredEquipamentos !== 'undefined' ? filteredEquipamentos.find(a => String(a.id) === String(atletaArg)) : null);
            if (!atleta) {
                try { atleta = JSON.parse(atletaArg); } catch(e) {}
            }
        }
        if (!atleta) {
            console.error("Atleta não encontrado para edição:", atletaArg);
            return;
        }
        
        editAtletaIdInput.value = atleta.id;
        document.getElementById('atleta-nome').value = atleta.nome || '';
        document.getElementById('atleta-nickname').value = atleta.nickname || '';
        
        // Época
        const selectEpoca = document.getElementById('atleta-epoca');
        if (selectEpoca) {
            const epNorm = (atleta.epoca || '').replace('-', '/');
            selectEpoca.value = epNorm;
            if (!selectEpoca.value && atleta.epoca) {
                for (let i = 0; i < selectEpoca.options.length; i++) {
                    if (selectEpoca.options[i].value.replace('-', '/') === epNorm) {
                        selectEpoca.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        document.getElementById('atleta-funcao').value = atleta.funcao || 'Jogador';

        // Número de Camisola (#) com fallback para primeira opção de equipamento
        const numCamisola = (atleta.numero_camisola !== null && atleta.numero_camisola !== undefined && atleta.numero_camisola !== '')
            ? atleta.numero_camisola
            : (atleta.equipamento_numero_1 || '');
        document.getElementById('atleta-numero').value = numCamisola;
        
        const atletaEscalaoSelect = document.getElementById('atleta-escalao');
        if (atletaEscalaoSelect) {
            atletaEscalaoSelect.value = atleta.escalao || '';
            if (!atletaEscalaoSelect.value && atleta.escalao) {
                const norm = normalizeEscalao(atleta.escalao);
                for (let i = 0; i < atletaEscalaoSelect.options.length; i++) {
                    if (normalizeEscalao(atletaEscalaoSelect.options[i].value) === norm) {
                        atletaEscalaoSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        // Sexo (M / F / Masculino / Feminino)
        const selectSexo = document.getElementById('atleta-sexo');
        if (selectSexo) {
            const sVal = (atleta.sexo || '').toUpperCase();
            if (sVal === 'M' || sVal.startsWith('MASC')) {
                selectSexo.value = 'M';
            } else if (sVal === 'F' || sVal.startsWith('FEM')) {
                selectSexo.value = 'F';
            } else {
                selectSexo.value = atleta.sexo || '';
            }
        }

        document.getElementById('atleta-nascimento').value = atleta.data_nascimento || '';
        document.getElementById('atleta-nacionalidade').value = atleta.nacionalidade || 'Portugal';
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
        
        const encTipoDocSelect = document.getElementById('atleta-encarregado-tipo-doc');
        if (encTipoDocSelect) {
            encTipoDocSelect.value = atleta.encarregado_tipo_doc || 'Cartão Cidadão';
            if (!encTipoDocSelect.value && atleta.encarregado_tipo_doc) {
                const norm = normalizeEscalao(atleta.encarregado_tipo_doc);
                for (let i = 0; i < encTipoDocSelect.options.length; i++) {
                    if (normalizeEscalao(encTipoDocSelect.options[i].value) === norm) {
                        encTipoDocSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        if (document.getElementById('atleta-encarregado-num-doc')) {
            document.getElementById('atleta-encarregado-num-doc').value = atleta.encarregado_num_doc || atleta.encarregado_doc || '';
        }
        if (document.getElementById('atleta-encarregado-validade-doc')) {
            document.getElementById('atleta-encarregado-validade-doc').value = atleta.encarregado_validade_doc || '';
        }
        if (document.getElementById('atleta-encarregado-email')) {
            document.getElementById('atleta-encarregado-email').value = atleta.encarregado_email || '';
        }
        if (document.getElementById('atleta-encarregado-telefone')) {
            document.getElementById('atleta-encarregado-telefone').value = atleta.encarregado_telefone || '';
        }

        // Equipamento
        if (document.getElementById('atleta-equip-tam')) document.getElementById('atleta-equip-tam').value = atleta.equipamento_tamanho || '';
        if (document.getElementById('atleta-equip-calcao')) document.getElementById('atleta-equip-calcao').value = atleta.equipamento_tamanho_calcao || '';
        if (document.getElementById('atleta-equip-num1')) document.getElementById('atleta-equip-num1').value = atleta.equipamento_numero_1 || atleta.numero_camisola || '';
        if (document.getElementById('atleta-equip-num2')) document.getElementById('atleta-equip-num2').value = atleta.equipamento_numero_2 || '';
        if (document.getElementById('atleta-equip-nome')) document.getElementById('atleta-equip-nome').value = atleta.equipamento_nome_camisola || atleta.nickname || '';
        
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
        
        openAtletaModal();
        if (btnCancelAtleta) btnCancelAtleta.classList.remove('hidden');
        if (atletaMsg) atletaMsg.classList.add('hidden');
        
        if (formAtletaContainer) {
            formAtletaContainer.classList.remove('hidden');
            formAtletaContainer.scrollIntoView({ behavior: 'smooth' });
        }
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

            const numVal = document.getElementById('atleta-numero').value;
            const equipNum1Val = document.getElementById('atleta-equip-num1') ? document.getElementById('atleta-equip-num1').value : null;

            const atletaData = {
                nome: document.getElementById('atleta-nome').value,
                nickname: document.getElementById('atleta-nickname').value || null,
                epoca: document.getElementById('atleta-epoca').value,
                funcao: document.getElementById('atleta-funcao').value,
                numero_camisola: numVal ? parseInt(numVal) : (equipNum1Val ? parseInt(equipNum1Val) : null),
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
                if (typeof loadAtletas === 'function') loadAtletas();
                if (typeof loadEquipamentos === 'function') loadEquipamentos();
                setTimeout(() => {
                    closeAtletaModal();
                }, 700);

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


    // =========================================================================
    // GESTÃO DE NOTÍCIAS DO CLUBE (CRUD COMPLETO NO ADMIN)
    // =========================================================================
    let currentAdminNoticias = [];

    const btnToggleFormNoticia = document.getElementById('btn-toggle-form-noticia');
    const btnRefreshNoticias = document.getElementById('btn-refresh-noticias');
    const containerFormNoticia = document.getElementById('container-form-noticia');
    const btnFecharFormNoticia = document.getElementById('btn-fechar-form-noticia');
    const formNoticiaAdmin = document.getElementById('form-noticia-admin');
    const formNoticiaAdminTitle = document.getElementById('form-noticia-admin-title');
    const adminNoticiaId = document.getElementById('admin-noticia-id');
    const adminNoticiaTitulo = document.getElementById('admin-noticia-titulo');
    const adminNoticiaCategoria = document.getElementById('admin-noticia-categoria');
    const adminNoticiaSubtitulo = document.getElementById('admin-noticia-subtitulo');
    const adminNoticiaData = document.getElementById('admin-noticia-data');
    const adminNoticiaAutor = document.getElementById('admin-noticia-autor');
    const adminNoticiaFile = document.getElementById('admin-noticia-file');
    const adminNoticiaUrl = document.getElementById('admin-noticia-url');
    const adminNoticiaPreviewBox = document.getElementById('admin-noticia-preview-box');
    const adminNoticiaPreviewImg = document.getElementById('admin-noticia-preview-img');
    const adminNoticiaDestaque = document.getElementById('admin-noticia-destaque');
    const adminNoticiaConteudo = document.getElementById('admin-noticia-conteudo');
    const adminNoticiaMsg = document.getElementById('admin-noticia-msg');
    const btnAdminPublicar = document.getElementById('btn-admin-publicar-noticia');
    const btnAdminRascunho = document.getElementById('btn-admin-rascunho-noticia');
    const btnAdminCancelar = document.getElementById('btn-admin-cancelar-noticia');

    const metricNoticiasTotal = document.getElementById('metric-noticias-total');
    const metricNoticiasPub = document.getElementById('metric-noticias-pub');
    const metricNoticiasDraft = document.getElementById('metric-noticias-draft');
    const noticiasTableBody = document.getElementById('noticias-table-body');
    const adminFiltroNoticias = document.getElementById('admin-filtro-noticias');
    const adminFiltroStatusNoticias = document.getElementById('admin-filtro-status-noticias');
    const adminFiltroCatNoticias = document.getElementById('admin-filtro-cat-noticias');

    // Toggle formulário
    if (btnToggleFormNoticia) {
        btnToggleFormNoticia.addEventListener('click', () => {
            resetAdminNoticiaForm();
            if (containerFormNoticia) {
                containerFormNoticia.style.display = 'block';
                containerFormNoticia.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (btnFecharFormNoticia) {
        btnFecharFormNoticia.addEventListener('click', () => {
            if (containerFormNoticia) containerFormNoticia.style.display = 'none';
        });
    }

    if (btnAdminCancelar) {
        btnAdminCancelar.addEventListener('click', () => {
            if (containerFormNoticia) containerFormNoticia.style.display = 'none';
            resetAdminNoticiaForm();
        });
    }

    if (btnRefreshNoticias) {
        btnRefreshNoticias.addEventListener('click', loadNoticiasAdmin);
    }

    function updateAdminImagePreview(src) {
        if (src && src.trim() !== '') {
            if (adminNoticiaPreviewImg) adminNoticiaPreviewImg.src = src;
            if (adminNoticiaPreviewBox) adminNoticiaPreviewBox.style.display = 'flex';
        } else {
            if (adminNoticiaPreviewImg) adminNoticiaPreviewImg.src = '';
            if (adminNoticiaPreviewBox) adminNoticiaPreviewBox.style.display = 'none';
        }
    }

    if (adminNoticiaUrl) {
        adminNoticiaUrl.addEventListener('input', () => {
            updateAdminImagePreview(adminNoticiaUrl.value);
        });
    }

    if (adminNoticiaFile) {
        adminNoticiaFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                updateAdminImagePreview(ev.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    async function resolveAdminImageUrl() {
        if (adminNoticiaFile && adminNoticiaFile.files && adminNoticiaFile.files.length > 0) {
            const file = adminNoticiaFile.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `noticia_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `noticias/${fileName}`;

            try {
                let { error: uploadError } = await supabase.storage.from('noticias').upload(filePath, file);
                if (uploadError) {
                    const { error: galeriaErr } = await supabase.storage.from('galeria').upload(filePath, file);
                    if (galeriaErr) {
                        return adminNoticiaPreviewImg?.src || '';
                    } else {
                        const { data: urlData } = supabase.storage.from('galeria').getPublicUrl(filePath);
                        return urlData.publicUrl;
                    }
                } else {
                    const { data: urlData } = supabase.storage.from('noticias').getPublicUrl(filePath);
                    return urlData.publicUrl;
                }
            } catch (err) {
                return adminNoticiaPreviewImg?.src || '';
            }
        }
        return adminNoticiaUrl?.value.trim() || adminNoticiaPreviewImg?.src || '';
    }

    function resetAdminNoticiaForm() {
        if (formNoticiaAdmin) formNoticiaAdmin.reset();
        if (adminNoticiaId) adminNoticiaId.value = '';
        if (formNoticiaAdminTitle) formNoticiaAdminTitle.textContent = 'Criar Nova Notícia';
        if (adminNoticiaData) adminNoticiaData.value = new Date().toISOString().split('T')[0];
        if (adminNoticiaAutor) adminNoticiaAutor.value = adminNameSpan?.textContent || 'Comunicação BCV';
        if (adminNoticiaMsg) adminNoticiaMsg.style.display = 'none';
        updateAdminImagePreview('');
    }

    async function loadNoticiasAdmin() {
        if (!noticiasTableBody) return;
        noticiasTableBody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center;">A carregar notícias...</td></tr>';

        try {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('data_publicacao', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    noticiasTableBody.innerHTML = '<tr><td colspan="8" style="padding: 20px; text-align: center; color: #dc2626;">A tabela "noticias" ainda não foi criada no Supabase. Execute o script setup_noticias.sql.</td></tr>';
                    return;
                }
                throw error;
            }

            currentAdminNoticias = data || [];
            updateNoticiasMetrics();
            renderNoticiasAdminTable();

        } catch (err) {
            console.error("Erro ao carregar notícias no admin:", err);
            noticiasTableBody.innerHTML = `<tr><td colspan="8" style="padding: 15px; text-align: center; color: red;">Erro: ${err.message}</td></tr>`;
        }
    }

    function updateNoticiasMetrics() {
        const total = currentAdminNoticias.length;
        const pub = currentAdminNoticias.filter(n => n.publicada).length;
        const draft = total - pub;

        if (metricNoticiasTotal) metricNoticiasTotal.textContent = total;
        if (metricNoticiasPub) metricNoticiasPub.textContent = pub;
        if (metricNoticiasDraft) metricNoticiasDraft.textContent = draft;
    }

    function renderNoticiasAdminTable() {
        if (!noticiasTableBody) return;

        const search = (adminFiltroNoticias?.value || '').toLowerCase().trim();
        const statusFiltro = adminFiltroStatusNoticias?.value || 'todos';
        const catFiltro = adminFiltroCatNoticias?.value || 'todas';

        const filtradas = currentAdminNoticias.filter(n => {
            if (statusFiltro === 'publicadas' && !n.publicada) return false;
            if (statusFiltro === 'rascunhos' && n.publicada) return false;
            if (catFiltro !== 'todas' && (n.categoria || '').toLowerCase() !== catFiltro.toLowerCase()) return false;

            if (search) {
                const tit = (n.titulo || '').toLowerCase();
                const aut = (n.autor || '').toLowerCase();
                const cat = (n.categoria || '').toLowerCase();
                return tit.includes(search) || aut.includes(search) || cat.includes(search);
            }
            return true;
        });

        if (filtradas.length === 0) {
            noticiasTableBody.innerHTML = '<tr><td colspan="8" style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhuma notícia encontrada.</td></tr>';
            return;
        }

        noticiasTableBody.innerHTML = '';
        filtradas.forEach(n => {
            const tr = document.createElement('tr');
            const dataFmt = n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString('pt-PT') : '-';
            const imgThumb = n.imagem_url 
                ? `<img src="${n.imagem_url}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" alt="Thumb">` 
                : `<div style="width: 50px; height: 35px; background: #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">🏀</div>`;

            const statusHtml = n.publicada 
                ? `<span style="background: rgba(16, 185, 129, 0.12); color: #059669; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">🟢 Publicada</span>` 
                : `<span style="background: rgba(245, 158, 11, 0.12); color: #d97706; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">🟡 Rascunho</span>`;

            const destaqueHtml = n.destaque 
                ? `<button class="btn-action" title="Remover Destaque" onclick="window.toggleDestaqueAdmin(${n.id}, false)" style="color: #f59e0b; font-size: 1.1rem;">⭐</button>` 
                : `<button class="btn-action" title="Marcar Destaque" onclick="window.toggleDestaqueAdmin(${n.id}, true)" style="color: #cbd5e1; font-size: 1.1rem;">☆</button>`;

            tr.innerHTML = `
                <td style="padding: 10px; text-align: center;">${imgThumb}</td>
                <td style="padding: 10px;">
                    <strong style="color: var(--text-primary); font-size: 0.92rem;">${n.titulo}</strong>
                    ${n.subtitulo ? `<br><small style="color: var(--text-secondary);">${n.subtitulo}</small>` : ''}
                </td>
                <td style="padding: 10px;"><span style="background: rgba(126, 34, 206, 0.08); color: #7e22ce; font-weight: 600; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem;">${n.categoria || 'Clube'}</span></td>
                <td style="padding: 10px; font-size: 0.85rem;">${n.autor || 'BCV'}</td>
                <td style="padding: 10px; font-size: 0.85rem; white-space: nowrap;">${dataFmt}</td>
                <td style="padding: 10px;">${statusHtml}</td>
                <td style="padding: 10px; text-align: center;">${destaqueHtml}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button class="btn-action" title="Editar Notícia" onclick="window.editNoticiaAdmin(${n.id})">✏️</button>
                    <button class="btn-action" title="${n.publicada ? 'Despublicar' : 'Publicar'}" onclick="window.togglePublishAdmin(${n.id}, ${!n.publicada})">${n.publicada ? '⏸️' : '🚀'}</button>
                    <button class="btn-action delete" title="Eliminar Notícia" onclick="window.deleteNoticiaAdmin(${n.id})">🗑️</button>
                </td>
            `;
            noticiasTableBody.appendChild(tr);
        });
    }

    if (adminFiltroNoticias) adminFiltroNoticias.addEventListener('input', renderNoticiasAdminTable);
    if (adminFiltroStatusNoticias) adminFiltroStatusNoticias.addEventListener('change', renderNoticiasAdminTable);
    if (adminFiltroCatNoticias) adminFiltroCatNoticias.addEventListener('change', renderNoticiasAdminTable);

    async function saveNoticiaAdmin(isPublicar) {
        const titulo = adminNoticiaTitulo.value.trim();
        const conteudo = adminNoticiaConteudo.value.trim();

        if (!titulo || !conteudo) {
            alert('Por favor, preencha o Título e o Conteúdo do artigo.');
            return;
        }

        btnAdminPublicar.disabled = true;
        btnAdminRascunho.disabled = true;
        adminNoticiaMsg.style.display = 'block';
        adminNoticiaMsg.style.background = '#f1f5f9';
        adminNoticiaMsg.style.color = '#475569';
        adminNoticiaMsg.textContent = 'A guardar notícia...';

        try {
            const finalImgUrl = await resolveAdminImageUrl();
            const id = adminNoticiaId.value ? Number(adminNoticiaId.value) : null;

            const payload = {
                titulo: titulo,
                subtitulo: adminNoticiaSubtitulo.value.trim() || null,
                categoria: adminNoticiaCategoria.value || 'Clube',
                data_publicacao: adminNoticiaData.value || new Date().toISOString().split('T')[0],
                conteudo: conteudo,
                imagem_url: finalImgUrl || null,
                destaque: adminNoticiaDestaque.checked,
                publicada: isPublicar,
                autor: adminNoticiaAutor.value.trim() || adminNameSpan?.textContent || 'Comunicação BCV',
                updated_at: new Date()
            };

            let err = null;
            if (id) {
                const { error } = await supabase.from('noticias').update(payload).eq('id', id);
                err = error;
            } else {
                const { error } = await supabase.from('noticias').insert([payload]);
                err = error;
            }

            if (err) throw err;

            adminNoticiaMsg.style.background = 'rgba(16, 185, 129, 0.15)';
            adminNoticiaMsg.style.color = '#059669';
            adminNoticiaMsg.textContent = isPublicar ? '✅ Notícia publicada com sucesso no site!' : '✅ Rascunho guardado com sucesso!';

            setTimeout(() => {
                resetAdminNoticiaForm();
                if (containerFormNoticia) containerFormNoticia.style.display = 'none';
                loadNoticiasAdmin();
            }, 1000);

        } catch (error) {
            console.error("Erro ao guardar notícia:", error);
            adminNoticiaMsg.style.background = 'rgba(239, 68, 68, 0.15)';
            adminNoticiaMsg.style.color = '#dc2626';
            adminNoticiaMsg.textContent = '❌ Erro: ' + error.message;
        } finally {
            btnAdminPublicar.disabled = false;
            btnAdminRascunho.disabled = false;
        }
    }

    if (formNoticiaAdmin) {
        formNoticiaAdmin.addEventListener('submit', (e) => {
            e.preventDefault();
            saveNoticiaAdmin(true);
        });
    }

    if (btnAdminRascunho) {
        btnAdminRascunho.addEventListener('click', () => {
            saveNoticiaAdmin(false);
        });
    }

    window.editNoticiaAdmin = function(id) {
        const n = currentAdminNoticias.find(item => item.id === id);
        if (!n) return;

        adminNoticiaId.value = n.id;
        adminNoticiaTitulo.value = n.titulo || '';
        adminNoticiaSubtitulo.value = n.subtitulo || '';
        adminNoticiaCategoria.value = n.categoria || 'Clube';
        adminNoticiaData.value = n.data_publicacao || new Date().toISOString().split('T')[0];
        adminNoticiaUrl.value = n.imagem_url || '';
        adminNoticiaDestaque.checked = !!n.destaque;
        adminNoticiaConteudo.value = n.conteudo || '';
        adminNoticiaAutor.value = n.autor || '';

        updateAdminImagePreview(n.imagem_url || '');

        formNoticiaAdminTitle.textContent = `Editar Notícia #${n.id}`;
        if (containerFormNoticia) {
            containerFormNoticia.style.display = 'block';
            containerFormNoticia.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.togglePublishAdmin = async function(id, novoEstado) {
        try {
            const { error } = await supabase.from('noticias').update({ publicada: novoEstado, updated_at: new Date() }).eq('id', id);
            if (error) throw error;
            loadNoticiasAdmin();
        } catch (err) {
            alert('Erro ao alterar publicação: ' + err.message);
        }
    };

    window.toggleDestaqueAdmin = async function(id, novoEstado) {
        try {
            const { error } = await supabase.from('noticias').update({ destaque: novoEstado, updated_at: new Date() }).eq('id', id);
            if (error) throw error;
            loadNoticiasAdmin();
        } catch (err) {
            alert('Erro ao alterar destaque: ' + err.message);
        }
    };

    window.deleteNoticiaAdmin = async function(id) {
        if (!confirm('Tem a certeza absoluta de que deseja eliminar esta notícia?')) return;
        try {
            const { error } = await supabase.from('noticias').delete().eq('id', id);
            if (error) throw error;
            loadNoticiasAdmin();
        } catch (err) {
            alert('Erro ao eliminar notícia: ' + err.message);
        }
    };

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

    // =========================================================================
    // 12. CONFIGURAÇÕES DINÂMICAS & ÓRGÃOS SOCIAIS
    // =========================================================================
    
    // Sub-abas de configurações
    const btnSubconfigs = document.querySelectorAll('.btn-subconfig');
    btnSubconfigs.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSub = btn.getAttribute('data-sub');
            btnSubconfigs.forEach(b => {
                b.classList.remove('active');
                b.style.background = '#f8fafc';
                b.style.color = 'var(--text-primary)';
                b.style.borderColor = 'var(--border-color)';
            });
            btn.classList.add('active');
            btn.style.background = '#7e22ce';
            btn.style.color = '#ffffff';
            btn.style.borderColor = '#7e22ce';

            document.querySelectorAll('.subconfig-content').forEach(c => c.classList.add('hidden'));
            const activeSub = document.getElementById(targetSub);
            if (activeSub) activeSub.classList.remove('hidden');
        });
    });

    // Função Principal de Carregamento de Configurações
    async function loadConfiguracoes() {
        await Promise.all([
            loadClubeConfig(),
            loadOrgaosSociais()
        ]);
    }

    // Carregar e Preencher Configurações de Contactos, Redes e Geral
    async function loadClubeConfig() {
        try {
            const { data, error } = await supabase.from('clube_config').select('*');
            if (error) {
                console.warn("Tabela 'clube_config' ainda não criada ou inacessível:", error);
                return;
            }

            if (!data) return;

            data.forEach(item => {
                const dados = item.dados || {};
                if (item.chave === 'contactos') {
                    if (document.getElementById('cfg-pavilhao')) document.getElementById('cfg-pavilhao').value = dados.pavilhao || '';
                    if (document.getElementById('cfg-morada')) document.getElementById('cfg-morada').value = dados.morada || '';
                    if (document.getElementById('cfg-email')) document.getElementById('cfg-email').value = dados.email || '';
                    if (document.getElementById('cfg-telefone')) document.getElementById('cfg-telefone').value = dados.telefone || '';
                    if (document.getElementById('cfg-horario')) document.getElementById('cfg-horario').value = dados.horario || '';
                } else if (item.chave === 'redes_sociais') {
                    if (document.getElementById('cfg-facebook')) document.getElementById('cfg-facebook').value = dados.facebook || '';
                    if (document.getElementById('cfg-instagram')) document.getElementById('cfg-instagram').value = dados.instagram || '';
                    if (document.getElementById('cfg-youtube')) document.getElementById('cfg-youtube').value = dados.youtube || '';
                    if (document.getElementById('cfg-tiktok')) document.getElementById('cfg-tiktok').value = dados.tiktok || '';
                    if (document.getElementById('cfg-whatsapp')) document.getElementById('cfg-whatsapp').value = dados.whatsapp || '';
                } else if (item.chave === 'historia') {
                    if (document.getElementById('cfg-historia-titulo')) document.getElementById('cfg-historia-titulo').value = dados.titulo || '';
                    if (document.getElementById('cfg-historia-texto')) document.getElementById('cfg-historia-texto').value = dados.texto || '';
                } else if (item.chave === 'geral') {
                    if (document.getElementById('cfg-nome-clube')) document.getElementById('cfg-nome-clube').value = dados.nome_clube || '';
                    if (document.getElementById('cfg-sigla')) document.getElementById('cfg-sigla').value = dados.sigla || '';
                    if (document.getElementById('cfg-ano-fundacao')) document.getElementById('cfg-ano-fundacao').value = dados.ano_fundacao || '';
                    if (document.getElementById('cfg-nif')) document.getElementById('cfg-nif').value = dados.nif || '';
                    if (document.getElementById('cfg-banner')) document.getElementById('cfg-banner').value = dados.banner_aniversario || '';
                }
            });
        } catch (err) {
            console.error("Erro ao carregar clube_config:", err);
        }
    }

    // Salvar Configurações (História do Clube)
    const formConfigHistoria = document.getElementById('form-config-historia');
    if (formConfigHistoria) {
        formConfigHistoria.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-historia');
            const msg = document.getElementById('msg-historia-status');
            btn.disabled = true;
            btn.textContent = "A guardar...";

            const dados = {
                titulo: document.getElementById('cfg-historia-titulo').value.trim() || 'A Nossa História',
                texto: document.getElementById('cfg-historia-texto').value.trim()
            };

            try {
                const { error } = await supabase.from('clube_config').upsert({
                    chave: 'historia',
                    dados: dados,
                    updated_at: new Date()
                });
                if (error) throw error;
                msg.textContent = "✅ Guardado com sucesso!";
                msg.style.color = "#16a34a";
            } catch (err) {
                console.error("Erro ao guardar história do clube:", err);
                msg.textContent = "❌ Erro ao guardar: " + err.message;
                msg.style.color = "#dc2626";
            } finally {
                btn.disabled = false;
                btn.textContent = "💾 Guardar História do Clube";
                setTimeout(() => { msg.textContent = ''; }, 4000);
            }
        });
    }

    // Salvar Configurações (Contactos)
    const formConfigContactos = document.getElementById('form-config-contactos');
    if (formConfigContactos) {
        formConfigContactos.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-contactos');
            const msg = document.getElementById('msg-contactos-status');
            btn.disabled = true;
            btn.textContent = "A guardar...";

            const dados = {
                pavilhao: document.getElementById('cfg-pavilhao').value,
                morada: document.getElementById('cfg-morada').value,
                email: document.getElementById('cfg-email').value,
                telefone: document.getElementById('cfg-telefone').value,
                horario: document.getElementById('cfg-horario').value
            };

            try {
                const { error } = await supabase.from('clube_config').upsert({
                    chave: 'contactos',
                    dados: dados,
                    updated_at: new Date()
                });
                if (error) throw error;
                msg.textContent = "✅ Guardado com sucesso!";
                msg.style.color = "#16a34a";
            } catch (err) {
                console.error("Erro ao guardar contactos:", err);
                msg.textContent = "❌ Erro ao guardar: " + err.message;
                msg.style.color = "#dc2626";
            } finally {
                btn.disabled = false;
                btn.textContent = "💾 Guardar Contactos";
                setTimeout(() => { msg.textContent = ''; }, 4000);
            }
        });
    }

    // Salvar Configurações (Redes Sociais)
    const formConfigRedes = document.getElementById('form-config-redes');
    if (formConfigRedes) {
        formConfigRedes.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-redes');
            const msg = document.getElementById('msg-redes-status');
            btn.disabled = true;
            btn.textContent = "A guardar...";

            const dados = {
                facebook: document.getElementById('cfg-facebook').value,
                instagram: document.getElementById('cfg-instagram').value,
                youtube: document.getElementById('cfg-youtube').value,
                tiktok: document.getElementById('cfg-tiktok').value,
                whatsapp: document.getElementById('cfg-whatsapp').value
            };

            try {
                const { error } = await supabase.from('clube_config').upsert({
                    chave: 'redes_sociais',
                    dados: dados,
                    updated_at: new Date()
                });
                if (error) throw error;
                msg.textContent = "✅ Guardado com sucesso!";
                msg.style.color = "#16a34a";
            } catch (err) {
                console.error("Erro ao guardar redes sociais:", err);
                msg.textContent = "❌ Erro ao guardar: " + err.message;
                msg.style.color = "#dc2626";
            } finally {
                btn.disabled = false;
                btn.textContent = "💾 Guardar Redes Sociais";
                setTimeout(() => { msg.textContent = ''; }, 4000);
            }
        });
    }

    // Salvar Configurações (Geral)
    const formConfigGeral = document.getElementById('form-config-geral');
    if (formConfigGeral) {
        formConfigGeral.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-geral');
            const msg = document.getElementById('msg-geral-status');
            btn.disabled = true;
            btn.textContent = "A guardar...";

            const dados = {
                nome_clube: document.getElementById('cfg-nome-clube').value,
                sigla: document.getElementById('cfg-sigla').value,
                ano_fundacao: document.getElementById('cfg-ano-fundacao').value,
                nif: document.getElementById('cfg-nif').value,
                banner_aniversario: document.getElementById('cfg-banner').value
            };

            try {
                const { error } = await supabase.from('clube_config').upsert({
                    chave: 'geral',
                    dados: dados,
                    updated_at: new Date()
                });
                if (error) throw error;
                msg.textContent = "✅ Guardado com sucesso!";
                msg.style.color = "#16a34a";
            } catch (err) {
                console.error("Erro ao guardar dados gerais:", err);
                msg.textContent = "❌ Erro ao guardar: " + err.message;
                msg.style.color = "#dc2626";
            } finally {
                btn.disabled = false;
                btn.textContent = "💾 Guardar Dados Gerais";
                setTimeout(() => { msg.textContent = ''; }, 4000);
            }
        });
    }

    // Carregar Lista de Órgãos Sociais
    async function loadOrgaosSociais() {
        const tbody = document.getElementById('orgaos-table-body');
        if (!tbody) return;

        try {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px;">A carregar órgãos sociais...</td></tr>';
            const { data, error } = await supabase
                .from('orgaos_sociais')
                .select('*')
                .order('orgao', { ascending: true })
                .order('ordem', { ascending: true });

            if (error) {
                if (error.code === '42P01') {
                    tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; color: orange;">A tabela "orgaos_sociais" ainda não existe. Execute o script setup_configuracoes_clube.sql no Supabase.</td></tr>';
                    return;
                }
                throw error;
            }

            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center;">Nenhum membro registado nos órgãos sociais.</td></tr>';
                return;
            }

            data.forEach(membro => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
                const membroJson = JSON.stringify(membro).replace(/'/g, "&apos;").replace(/"/g, "&quot;");

                let badgeCor = '#7e22ce';
                let badgeBg = 'rgba(126, 34, 206, 0.1)';
                if (membro.orgao === 'Assembleia Geral') { badgeCor = '#2563eb'; badgeBg = 'rgba(37, 99, 235, 0.1)'; }
                else if (membro.orgao === 'Conselho Fiscal') { badgeCor = '#059669'; badgeBg = 'rgba(5, 150, 105, 0.1)'; }

                tr.innerHTML = `
                    <td style="padding: 10px;"><span style="background: ${badgeBg}; color: ${badgeCor}; font-weight: 700; font-size: 0.8rem; padding: 3px 8px; border-radius: 4px;">${membro.orgao}</span></td>
                    <td style="padding: 10px; font-weight: 600;">${membro.cargo}</td>
                    <td style="padding: 10px;">${membro.nome}</td>
                    <td style="padding: 10px; text-align: center;"><span style="color: var(--text-secondary); font-weight: 700;">#${membro.ordem || 1}</span></td>
                    <td style="padding: 10px; text-align: center; white-space: nowrap;">
                        <button class="btn-action" onclick="window.editOrgaoSocial('${membroJson}')" title="Editar" style="padding: 4px 8px; margin-right: 4px;">✏️ Editar</button>
                        <button class="btn-action delete" onclick="window.deleteOrgaoSocial('${membro.id}')" title="Eliminar" style="padding: 4px 8px;">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Erro ao carregar órgãos sociais:", err);
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; color: red;">Erro: ${err.message}</td></tr>`;
        }
    }

    // Modal de Órgãos Sociais
    const modalOrgaoContainer = document.getElementById('modal-orgao-container');
    const btnAddOrgao = document.getElementById('btn-add-orgao');
    const btnCloseModalOrgao = document.getElementById('btn-close-modal-orgao');
    const formOrgaoSocial = document.getElementById('form-orgao-social');
    const modalOrgaoTitle = document.getElementById('modal-orgao-title');

    if (btnAddOrgao) {
        btnAddOrgao.addEventListener('click', () => {
            if (formOrgaoSocial) formOrgaoSocial.reset();
            document.getElementById('orgao-id').value = '';
            modalOrgaoTitle.textContent = 'Adicionar Membro';
            modalOrgaoContainer.classList.remove('hidden');
        });
    }

    if (btnCloseModalOrgao) {
        btnCloseModalOrgao.addEventListener('click', () => {
            modalOrgaoContainer.classList.add('hidden');
        });
    }

    if (formOrgaoSocial) {
        formOrgaoSocial.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('orgao-id').value;
            const isEdit = !!id;
            const btn = document.getElementById('btn-save-orgao');
            btn.disabled = true;
            btn.textContent = "A guardar...";

            const payload = {
                orgao: document.getElementById('orgao-tipo').value,
                cargo: document.getElementById('orgao-cargo').value,
                nome: document.getElementById('orgao-nome').value,
                ordem: parseInt(document.getElementById('orgao-ordem').value) || 1,
                updated_at: new Date()
            };

            try {
                if (isEdit) {
                    const { error } = await supabase.from('orgaos_sociais').update(payload).eq('id', id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('orgaos_sociais').insert([payload]);
                    if (error) throw error;
                }

                modalOrgaoContainer.classList.add('hidden');
                loadOrgaosSociais();
            } catch (err) {
                console.error("Erro ao guardar membro de órgão social:", err);
                alert("Erro ao guardar: " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = "Guardar";
            }
        });
    }

    window.editOrgaoSocial = function(membroStr) {
        const membro = typeof membroStr === 'string' ? JSON.parse(membroStr) : membroStr;
        document.getElementById('orgao-id').value = membro.id;
        document.getElementById('orgao-tipo').value = membro.orgao;
        document.getElementById('orgao-cargo').value = membro.cargo;
        document.getElementById('orgao-nome').value = membro.nome;
        document.getElementById('orgao-ordem').value = membro.ordem || 1;

        modalOrgaoTitle.textContent = 'Editar Membro: ' + membro.nome;
        modalOrgaoContainer.classList.remove('hidden');
    };

    window.deleteOrgaoSocial = async function(id) {
        if (!confirm('Tem a certeza que deseja eliminar este membro dos órgãos sociais?')) return;
        try {
            const { error } = await supabase.from('orgaos_sociais').delete().eq('id', id);
            if (error) throw error;
            loadOrgaosSociais();
        } catch (err) {
            console.error("Erro ao eliminar membro:", err);
            alert("Erro ao eliminar: " + err.message);
        }
    };

    // ==========================================
    // 14. Gestão de Equipamentos
    // ==========================================
    let currentEquipamentos = [];
    let filteredEquipamentos = [];

    const equipTableBody = document.getElementById('equipamentos-table-body');
    const equipStatTotal = document.getElementById('equip-stat-total');
    const equipStatCamisolas = document.getElementById('equip-stat-camisolas');
    const equipStatCalcoes = document.getElementById('equip-stat-calcoes');
    const equipCountInfo = document.getElementById('equip-count-info');

    const filterEquipBusca = document.getElementById('filter-equip-busca');
    const filterEquipEscalao = document.getElementById('filter-equip-escalao');
    const filterEquipGenero = document.getElementById('filter-equip-genero');
    const filterEquipEpoca = document.getElementById('filter-equip-epoca');
    const filterEquipTamCamisola = document.getElementById('filter-equip-tam-camisola');
    const filterEquipTamCalcao = document.getElementById('filter-equip-tam-calcao');
    const btnClearEquipFilters = document.getElementById('btn-clear-equip-filters');
    const btnExportEquipPDF = document.getElementById('btn-export-equipamentos-pdf');
    const btnExportEquipCSV = document.getElementById('btn-export-equipamentos-csv');

    async function loadEquipamentos() {
        if (!equipTableBody) return;
        equipTableBody.innerHTML = '<tr><td colspan="11" style="padding: 20px; text-align: center; color: var(--text-secondary);">A carregar dados de equipamentos...</td></tr>';
        
        try {
            const { data, error } = await supabase
                .from('atletasbcv')
                .select('*')
                .order('nome', { ascending: true });

            if (error) throw error;

            currentEquipamentos = data || [];
            applyEquipamentosFilters();
        } catch (err) {
            console.error('Erro ao carregar equipamentos:', err);
            equipTableBody.innerHTML = `<tr><td colspan="11" style="padding: 20px; text-align: center; color: #ef4444;">Erro ao carregar equipamentos: ${err.message}</td></tr>`;
        }
    }

    function applyEquipamentosFilters() {
        if (!currentEquipamentos) return;

        const busca = (filterEquipBusca?.value || '').toLowerCase().trim();
        const escalao = filterEquipEscalao?.value || '';
        const genero = filterEquipGenero?.value || '';
        const epoca = filterEquipEpoca?.value || '';
        const tamCamisola = filterEquipTamCamisola?.value || '';
        const tamCalcao = filterEquipTamCalcao?.value || '';

        filteredEquipamentos = currentEquipamentos.filter(atleta => {
            // Filtro Busca por Texto
            if (busca) {
                const nomeMatch = (atleta.nome || '').toLowerCase().includes(busca);
                const nickMatch = (atleta.nickname || '').toLowerCase().includes(busca);
                const estampaMatch = (atleta.equipamento_nome_camisola || '').toLowerCase().includes(busca);
                if (!nomeMatch && !nickMatch && !estampaMatch) return false;
            }

            // Filtro Escalão
            if (escalao) {
                if (normalizeEscalao(atleta.escalao) !== normalizeEscalao(escalao)) return false;
            }

            // Filtro Género
            if (genero) {
                const s = (atleta.sexo || '').toUpperCase();
                if (genero === 'M' && !(s === 'M' || s.startsWith('MASC'))) return false;
                if (genero === 'F' && !(s === 'F' || s.startsWith('FEM'))) return false;
            }

            // Filtro Época
            if (epoca) {
                const epNorm = (atleta.epoca || '').replace('-', '/');
                if (epNorm !== epoca.replace('-', '/')) return false;
            }

            // Filtro Tamanho Camisola
            if (tamCamisola) {
                if ((atleta.equipamento_tamanho || '').toUpperCase() !== tamCamisola.toUpperCase()) return false;
            }

            // Filtro Tamanho Calção
            if (tamCalcao) {
                if ((atleta.equipamento_tamanho_calcao || '').toUpperCase() !== tamCalcao.toUpperCase()) return false;
            }

            return true;
        });

        updateEquipamentosStats(filteredEquipamentos);
        renderEquipamentosTable(filteredEquipamentos);
    }

    function updateEquipamentosStats(list) {
        if (equipStatTotal) equipStatTotal.textContent = list.length;
        if (equipCountInfo) equipCountInfo.textContent = `${list.length} ${list.length === 1 ? 'atleta listado' : 'atletas listados'}`;

        // Contagem de Camisolas
        const camisolasCount = {};
        const calcoesCount = {};

        list.forEach(atleta => {
            if (atleta.equipamento_tamanho) {
                const t = atleta.equipamento_tamanho.toUpperCase().trim();
                camisolasCount[t] = (camisolasCount[t] || 0) + 1;
            }
            if (atleta.equipamento_tamanho_calcao) {
                const t = atleta.equipamento_tamanho_calcao.toUpperCase().trim();
                calcoesCount[t] = (calcoesCount[t] || 0) + 1;
            }
        });

        const sortSizes = (a, b) => {
            const sizeOrder = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
            const idxA = sizeOrder.indexOf(a);
            const idxB = sizeOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        };

        // Renderizar Camisolas Stats
        if (equipStatCamisolas) {
            const keys = Object.keys(camisolasCount).sort(sortSizes);
            if (keys.length === 0) {
                equipStatCamisolas.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Nenhum registado</span>';
            } else {
                equipStatCamisolas.innerHTML = keys.map(k => `
                    <span style="background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.25); padding: 3px 8px; border-radius: 6px; font-weight: 600;">
                        ${k}: <strong>${camisolasCount[k]}</strong>
                    </span>
                `).join('');
            }
        }

        // Renderizar Calções Stats
        if (equipStatCalcoes) {
            const keys = Object.keys(calcoesCount).sort(sortSizes);
            if (keys.length === 0) {
                equipStatCalcoes.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Nenhum registado</span>';
            } else {
                equipStatCalcoes.innerHTML = keys.map(k => `
                    <span style="background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); padding: 3px 8px; border-radius: 6px; font-weight: 600;">
                        ${k}: <strong>${calcoesCount[k]}</strong>
                    </span>
                `).join('');
            }
        }
    }

    function renderEquipamentosTable(list) {
        if (!equipTableBody) return;

        if (list.length === 0) {
            equipTableBody.innerHTML = '<tr><td colspan="11" style="padding: 25px; text-align: center; color: var(--text-secondary);">Nenhum registo encontrado com os filtros selecionados.</td></tr>';
            return;
        }

        equipTableBody.innerHTML = '';
        list.forEach(atleta => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';

            const fotoHtml = atleta.foto 
                ? `<img src="${atleta.foto}" alt="" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                : `<div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; color: var(--text-secondary);">${(atleta.nome || 'A').charAt(0)}</div>`;

            const sexoBadge = (atleta.sexo || '').toUpperCase().startsWith('F')
                ? `<span style="background: rgba(236, 72, 153, 0.15); color: #db2777; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">F</span>`
                : `<span style="background: rgba(59, 130, 246, 0.15); color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">M</span>`;

            const tamCamisolaBadge = atleta.equipamento_tamanho
                ? `<span style="background: rgba(59, 130, 246, 0.12); color: #1d4ed8; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem;">${atleta.equipamento_tamanho}</span>`
                : `<span style="color: #a0a0ab;">-</span>`;

            const tamCalcaoBadge = atleta.equipamento_tamanho_calcao
                ? `<span style="background: rgba(16, 185, 129, 0.12); color: #047857; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem;">${atleta.equipamento_tamanho_calcao}</span>`
                : `<span style="color: #a0a0ab;">-</span>`;

            const estampaNome = atleta.equipamento_nome_camisola || atleta.nickname
                ? `<span style="color: var(--accent-primary); font-weight: 700;">"${atleta.equipamento_nome_camisola || atleta.nickname}"</span>`
                : `<span style="color: #a0a0ab;">-</span>`;

            const num1Html = atleta.equipamento_numero_1 
                ? `<span style="background: rgba(0,0,0,0.05); font-weight: 600; padding: 2px 6px; border-radius: 4px;">#${atleta.equipamento_numero_1}</span>`
                : '<span style="color: #a0a0ab;">-</span>';

            const num2Html = atleta.equipamento_numero_2 
                ? `<span style="background: rgba(0,0,0,0.05); font-weight: 600; padding: 2px 6px; border-radius: 4px;">#${atleta.equipamento_numero_2}</span>`
                : '<span style="color: #a0a0ab;">-</span>';

            const numOficialHtml = (atleta.numero_camisola !== null && atleta.numero_camisola !== undefined && atleta.numero_camisola !== '')
                ? `<span style="background: #7e22ce; color: #fff; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem;">#${atleta.numero_camisola}</span>`
                : '<span style="color: #a0a0ab;">-</span>';

            tr.innerHTML = `
                <td style="padding: 10px;">${fotoHtml}</td>
                <td style="padding: 10px;"><strong>${atleta.nome || '-'}</strong></td>
                <td style="padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>${atleta.escalao || '-'}</span>
                        ${sexoBadge}
                    </div>
                </td>
                <td style="padding: 10px;"><span style="font-size: 0.85rem; color: var(--text-secondary);">${atleta.epoca || '-'}</span></td>
                <td style="padding: 10px; text-align: center;">${tamCamisolaBadge}</td>
                <td style="padding: 10px; text-align: center;">${tamCalcaoBadge}</td>
                <td style="padding: 10px;">${estampaNome}</td>
                <td style="padding: 10px; text-align: center;">${num1Html}</td>
                <td style="padding: 10px; text-align: center;">${num2Html}</td>
                <td style="padding: 10px; text-align: center;">${numOficialHtml}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action" onclick="window.editAtleta(${atleta.id})" title="Editar Atleta" style="padding: 4px 8px;">✏️ Editar</button>
                </td>
            `;
            equipTableBody.appendChild(tr);
        });
    }

    // Listeners dos Filtros de Equipamentos
    if (filterEquipBusca) filterEquipBusca.addEventListener('input', applyEquipamentosFilters);
    if (filterEquipEscalao) filterEquipEscalao.addEventListener('change', applyEquipamentosFilters);
    if (filterEquipGenero) filterEquipGenero.addEventListener('change', applyEquipamentosFilters);
    if (filterEquipEpoca) filterEquipEpoca.addEventListener('change', applyEquipamentosFilters);
    if (filterEquipTamCamisola) filterEquipTamCamisola.addEventListener('change', applyEquipamentosFilters);
    if (filterEquipTamCalcao) filterEquipTamCalcao.addEventListener('change', applyEquipamentosFilters);

    if (btnClearEquipFilters) {
        btnClearEquipFilters.addEventListener('click', () => {
            if (filterEquipBusca) filterEquipBusca.value = '';
            if (filterEquipEscalao) filterEquipEscalao.value = '';
            if (filterEquipGenero) filterEquipGenero.value = '';
            if (filterEquipEpoca) filterEquipEpoca.value = '2026/2027';
            if (filterEquipTamCamisola) filterEquipTamCamisola.value = '';
            if (filterEquipTamCalcao) filterEquipTamCalcao.value = '';
            applyEquipamentosFilters();
        });
    }

    // Exportação em CSV
    if (btnExportEquipCSV) {
        btnExportEquipCSV.addEventListener('click', () => {
            if (!filteredEquipamentos || filteredEquipamentos.length === 0) {
                alert('Não existem registos para exportar com os filtros atuais.');
                return;
            }

            let csvContent = '\uFEFF'; // UTF-8 BOM
            csvContent += 'Nº;Nome Atleta;Escalão;Género;Época;Tam. Camisola;Tam. Calção;Nome Estampa;1ª Opção Nº;2ª Opção Nº;Nº Oficial\n';

            filteredEquipamentos.forEach((a, idx) => {
                const row = [
                    idx + 1,
                    `"${(a.nome || '').replace(/"/g, '""')}"`,
                    `"${(a.escalao || '').replace(/"/g, '""')}"`,
                    `"${(a.sexo || '').replace(/"/g, '""')}"`,
                    `"${(a.epoca || '').replace(/"/g, '""')}"`,
                    `"${(a.equipamento_tamanho || '').replace(/"/g, '""')}"`,
                    `"${(a.equipamento_tamanho_calcao || '').replace(/"/g, '""')}"`,
                    `"${(a.equipamento_nome_camisola || a.nickname || '').replace(/"/g, '""')}"`,
                    `"${(a.equipamento_numero_1 || '').replace(/"/g, '""')}"`,
                    `"${(a.equipamento_numero_2 || '').replace(/"/g, '""')}"`,
                    `"${(a.numero_camisola !== null && a.numero_camisola !== undefined ? a.numero_camisola : '').toString().replace(/"/g, '""')}"`
                ];
                csvContent += row.join(';') + '\n';
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dataHoje = new Date().toISOString().split('T')[0];
            const escalaoStr = filterEquipEscalao?.value ? `_${filterEquipEscalao.value.replace(/\s+/g, '_')}` : '';
            link.download = `Equipamentos_BCV${escalaoStr}_${dataHoje}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Exportação em PDF Oficial (pdf-lib)
    if (btnExportEquipPDF) {
        btnExportEquipPDF.addEventListener('click', async () => {
            if (!filteredEquipamentos || filteredEquipamentos.length === 0) {
                alert('Não existem registos para exportar com os filtros atuais.');
                return;
            }

            try {
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

                const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
                const pdfDoc = await PDFDocument.create();
                const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

                // Configurações A4 Paisagem (Landscape): 841.89 x 595.28 pt
                const pageWidth = 841.89;
                const pageHeight = 595.28;
                const margin = 35;
                const rowsPerPage = 14;

                const totalPages = Math.ceil(filteredEquipamentos.length / rowsPerPage) || 1;

                // Contagens por tamanho para o resumo
                const camisolasCount = {};
                const calcoesCount = {};
                filteredEquipamentos.forEach(a => {
                    if (a.equipamento_tamanho) {
                        const t = a.equipamento_tamanho.toUpperCase().trim();
                        camisolasCount[t] = (camisolasCount[t] || 0) + 1;
                    }
                    if (a.equipamento_tamanho_calcao) {
                        const t = a.equipamento_tamanho_calcao.toUpperCase().trim();
                        calcoesCount[t] = (calcoesCount[t] || 0) + 1;
                    }
                });

                const sortSizes = (a, b) => {
                    const sizeOrder = ['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
                    const idxA = sizeOrder.indexOf(a);
                    const idxB = sizeOrder.indexOf(b);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return a.localeCompare(b);
                };

                const dataEmissao = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const escalaoFiltro = filterEquipEscalao?.value || 'Todos os Escalões';
                const generoFiltro = filterEquipGenero?.value === 'M' ? 'Masculino' : (filterEquipGenero?.value === 'F' ? 'Feminino' : 'Todos');
                const epocaFiltro = filterEquipEpoca?.value || 'Todas as Épocas';

                for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    let y = pageHeight - margin;

                    // 1. Cabeçalho Institucional
                    // Faixa roxa superior
                    page.drawRectangle({
                        x: margin,
                        y: y - 50,
                        width: pageWidth - (margin * 2),
                        height: 50,
                        color: rgb(0.494, 0.133, 0.808) // #7e22ce
                    });

                    page.drawText('BASKET CLUBE DE VALENÇA', {
                        x: margin + 15,
                        y: y - 24,
                        size: 16,
                        font: fontBold,
                        color: rgb(1, 1, 1)
                    });

                    page.drawText('MAPA OFICIAL DE PRODUÇÃO DE EQUIPAMENTOS', {
                        x: margin + 15,
                        y: y - 42,
                        size: 10,
                        font: fontBold,
                        color: rgb(0.9, 0.85, 1)
                    });

                    page.drawText(`Emitido em: ${dataEmissao}`, {
                        x: pageWidth - margin - 180,
                        y: y - 32,
                        size: 9,
                        font: fontRegular,
                        color: rgb(1, 1, 1)
                    });

                    y -= 65;

                    // 2. Linha de Metadados / Filtros
                    const filterInfoText = `Filtros Aplicados: Escalão: ${escalaoFiltro} | Género: ${generoFiltro} | Época: ${epocaFiltro} | Total: ${filteredEquipamentos.length} Atleta(s)`;
                    page.drawText(filterInfoText, {
                        x: margin,
                        y: y,
                        size: 9,
                        font: fontBold,
                        color: rgb(0.2, 0.2, 0.2)
                    });

                    y -= 15;

                    // 3. Tabela de Atletas
                    // Cabeçalho da tabela
                    const colWidths = [30, 200, 75, 45, 60, 60, 130, 55, 55, 60];
                    const colHeaders = ['Nº', 'Nome do Atleta', 'Escalão', 'Sexo', 'Camisola', 'Calção', 'Nome Estampa', '1ª Opção', '2ª Opção', 'Nº Oficial'];

                    page.drawRectangle({
                        x: margin,
                        y: y - 18,
                        width: pageWidth - (margin * 2),
                        height: 20,
                        color: rgb(0.94, 0.95, 0.96)
                    });

                    let curX = margin + 5;
                    colHeaders.forEach((header, i) => {
                        page.drawText(header, {
                            x: curX,
                            y: y - 13,
                            size: 8.5,
                            font: fontBold,
                            color: rgb(0.1, 0.1, 0.1)
                        });
                        curX += colWidths[i];
                    });

                    y -= 20;

                    // Linhas da página atual
                    const startIdx = pageIdx * rowsPerPage;
                    const endIdx = Math.min(startIdx + rowsPerPage, filteredEquipamentos.length);
                    const pageRows = filteredEquipamentos.slice(startIdx, endIdx);

                    pageRows.forEach((atleta, rowIdx) => {
                        const isEven = rowIdx % 2 === 0;
                        const rowHeight = 20;

                        if (isEven) {
                            page.drawRectangle({
                                x: margin,
                                y: y - 15,
                                width: pageWidth - (margin * 2),
                                height: rowHeight,
                                color: rgb(0.98, 0.98, 0.99)
                            });
                        }

                        // Linha separadora inferior
                        page.drawLine({
                            start: { x: margin, y: y - 15 },
                            end: { x: pageWidth - margin, y: y - 15 },
                            thickness: 0.5,
                            color: rgb(0.85, 0.85, 0.85)
                        });

                        const rowValues = [
                            String(startIdx + rowIdx + 1),
                            (atleta.nome || '-').slice(0, 32),
                            (atleta.escalao || '-').slice(0, 12),
                            (atleta.sexo || '').toUpperCase().startsWith('F') ? 'F' : 'M',
                            atleta.equipamento_tamanho || '-',
                            atleta.equipamento_tamanho_calcao || '-',
                            (atleta.equipamento_nome_camisola || atleta.nickname || '-').slice(0, 20),
                            atleta.equipamento_numero_1 ? `#${atleta.equipamento_numero_1}` : '-',
                            atleta.equipamento_numero_2 ? `#${atleta.equipamento_numero_2}` : '-',
                            (atleta.numero_camisola !== null && atleta.numero_camisola !== undefined && atleta.numero_camisola !== '') ? `#${atleta.numero_camisola}` : '-'
                        ];

                        let cellX = margin + 5;
                        rowValues.forEach((val, i) => {
                            const isBold = (i === 1 || i === 4 || i === 5 || i === 6 || i === 9);
                            page.drawText(val, {
                                x: cellX,
                                y: y - 10,
                                size: 8,
                                font: isBold ? fontBold : fontRegular,
                                color: (i === 6 && val !== '-') ? rgb(0.49, 0.13, 0.81) : rgb(0.15, 0.15, 0.15)
                            });
                            cellX += colWidths[i];
                        });

                        y -= rowHeight;
                    });

                    // Se for a última página, desenhar caixa de resumo de totais
                    if (pageIdx === totalPages - 1) {
                        y -= 15;
                        page.drawRectangle({
                            x: margin,
                            y: y - 40,
                            width: pageWidth - (margin * 2),
                            height: 45,
                            color: rgb(0.96, 0.94, 1),
                            borderColor: rgb(0.79, 0.65, 0.95),
                            borderWidth: 1
                        });

                        page.drawText('RESUMO DE QUANTIDADES PARA ENCOMENDA / CONFEÇÃO:', {
                            x: margin + 10,
                            y: y - 14,
                            size: 8.5,
                            font: fontBold,
                            color: rgb(0.4, 0.1, 0.65)
                        });

                        const camisolasKeys = Object.keys(camisolasCount).sort(sortSizes);
                        const calcoesKeys = Object.keys(calcoesCount).sort(sortSizes);

                        const camisolasSummary = camisolasKeys.map(k => `${k}: ${camisolasCount[k]}`).join('  |  ') || 'Nenhum';
                        const calcoesSummary = calcoesKeys.map(k => `${k}: ${calcoesCount[k]}`).join('  |  ') || 'Nenhum';

                        page.drawText(`Camisolas:  ${camisolasSummary}`, {
                            x: margin + 10,
                            y: y - 27,
                            size: 8,
                            font: fontRegular,
                            color: rgb(0.1, 0.1, 0.1)
                        });

                        page.drawText(`Calções:     ${calcoesSummary}`, {
                            x: margin + 10,
                            y: y - 38,
                            size: 8,
                            font: fontRegular,
                            color: rgb(0.1, 0.1, 0.1)
                        });
                    }

                    // Rodapé com Paginação
                    page.drawText(`Página ${pageIdx + 1} de ${totalPages}`, {
                        x: pageWidth - margin - 80,
                        y: margin - 15,
                        size: 8,
                        font: fontRegular,
                        color: rgb(0.5, 0.5, 0.5)
                    });

                    page.drawText('Basket Clube de Valença • Documento Interno de Gestão', {
                        x: margin,
                        y: margin - 15,
                        size: 8,
                        font: fontRegular,
                        color: rgb(0.5, 0.5, 0.5)
                    });
                }

                // Guardar PDF
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const dataHoje = new Date().toISOString().split('T')[0];
                const escalaoStr = filterEquipEscalao?.value ? `_${filterEquipEscalao.value.replace(/\s+/g, '_')}` : '';
                link.download = `Mapa_Equipamentos_BCV${escalaoStr}_${dataHoje}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

            } catch (err) {
                console.error('Erro ao gerar PDF de Equipamentos:', err);
                alert('Erro ao gerar relatório PDF de equipamentos: ' + err.message);
            }
        });
    }

    // ====================================================================
    // 15. GESTÃO DESPORTIVA (PRESENÇAS & FALTAS)
    // ====================================================================
    let currentDesportivaPresencas = [];

    const despFilterEscalao = document.getElementById('desp-filter-escalao');
    const despFilterEstado = document.getElementById('desp-filter-estado');
    const despFilterTipo = document.getElementById('desp-filter-tipo');
    const despFilterData = document.getElementById('desp-filter-data');
    const despFilterSearch = document.getElementById('desp-filter-search');
    const btnDespClearFilters = document.getElementById('btn-desp-clear-filters');
    const desportivaTableBody = document.getElementById('desportiva-table-body');
    const despCountInfo = document.getElementById('desp-count-info');

    const despKpiTotal = document.getElementById('desp-kpi-total');
    const despKpiPresentes = document.getElementById('desp-kpi-presentes');
    const despKpiFaltas = document.getElementById('desp-kpi-faltas');
    const despKpiJustificados = document.getElementById('desp-kpi-justificados');
    const despKpiLesionados = document.getElementById('desp-kpi-lesionados');
    const despKpiTaxa = document.getElementById('desp-kpi-taxa');

    const btnExportDesportivaCsv = document.getElementById('btn-export-desportiva-csv');
    const btnExportDesportivaPdf = document.getElementById('btn-export-desportiva-pdf');

    async function loadDesportiva() {
        if (!desportivaTableBody) return;
        desportivaTableBody.innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: var(--text-secondary);">A carregar histórico desportivo...</td></tr>';

        try {
            // 1. Carregar atletas para cruzar nomes e fotos
            if (currentAtletas.length === 0) {
                const { data: atls } = await supabase.from('atletasbcv').select('*');
                currentAtletas = atls || [];
            }

            // 2. Carregar presenças
            const { data: presencas, error } = await supabase
                .from('presencas')
                .select('*')
                .order('data', { ascending: false });

            if (error && error.code !== '42P01') throw error;
            currentDesportivaPresencas = presencas || [];

            renderDesportivaTable();

        } catch (error) {
            console.error('Erro ao carregar dados desportivos:', error);
            desportivaTableBody.innerHTML = `<tr><td colspan="7" style="padding: 15px; text-align: center; color: #ef4444;">Erro ao carregar dados: ${error.message}</td></tr>`;
        }
    }

    function renderDesportivaTable() {
        if (!desportivaTableBody) return;

        const fEsc = (despFilterEscalao?.value || '').toLowerCase().trim();
        const fEst = (despFilterEstado?.value || '').trim();
        const fTipo = (despFilterTipo?.value || '').trim();
        const fData = (despFilterData?.value || '').trim();
        const fSearch = (despFilterSearch?.value || '').toLowerCase().trim();

        // Mapa de atletas por ID
        const atletaMap = {};
        currentAtletas.forEach(a => { atletaMap[a.id] = a; });

        let filtrados = currentDesportivaPresencas.filter(p => {
            const atleta = atletaMap[p.atleta_id] || {};
            const esc = (p.escalao || atleta.escalao || '').toLowerCase();
            const atlNome = (atleta.nome || '').toLowerCase();
            const atlNick = (atleta.nickname || '').toLowerCase();

            if (fEsc && !esc.includes(fEsc.replace(/[-\s]/g, ''))) return false;
            if (fEst && p.estado !== fEst) return false;
            if (fTipo && p.tipo !== fTipo) return false;
            if (fData && p.data !== fData) return false;
            if (fSearch && !atlNome.includes(fSearch) && !atlNick.includes(fSearch)) return false;

            return true;
        });

        // Contadores e KPIs
        let total = filtrados.length;
        let cPresentes = 0;
        let cFaltas = 0;
        let cJustificados = 0;
        let cLesionados = 0;

        filtrados.forEach(p => {
            if (p.estado === 'Presente') cPresentes++;
            else if (p.estado === 'Falta') cFaltas++;
            else if (p.estado === 'Justificado') cJustificados++;
            else if (p.estado === 'Lesionado') cLesionados++;
        });

        const taxa = total > 0 ? Math.round((cPresentes / total) * 100) : 0;

        if (despKpiTotal) despKpiTotal.textContent = total;
        if (despKpiPresentes) despKpiPresentes.textContent = cPresentes;
        if (despKpiFaltas) despKpiFaltas.textContent = cFaltas;
        if (despKpiJustificados) despKpiJustificados.textContent = cJustificados;
        if (despKpiLesionados) despKpiLesionados.textContent = cLesionados;
        if (despKpiTaxa) despKpiTaxa.textContent = `${taxa}%`;
        if (despCountInfo) despCountInfo.textContent = `${total} registos encontrados`;

        if (filtrados.length === 0) {
            desportivaTableBody.innerHTML = '<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhum registo desportivo corresponde aos filtros aplicados.</td></tr>';
            return;
        }

        const badgeMap = {
            'Presente': '<span style="background: rgba(16, 185, 129, 0.12); color: #047857; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3);">🟢 Presente</span>',
            'Falta': '<span style="background: rgba(239, 68, 68, 0.12); color: #dc2626; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(239, 68, 68, 0.3);">🔴 Falta</span>',
            'Justificado': '<span style="background: rgba(245, 158, 11, 0.12); color: #d97706; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(245, 158, 11, 0.3);">🟡 Justificado</span>',
            'Lesionado': '<span style="background: rgba(99, 102, 241, 0.12); color: #4f46e5; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 0.8rem; border: 1px solid rgba(99, 102, 241, 0.3);">🏥 Lesionado</span>'
        };

        desportivaTableBody.innerHTML = filtrados.map(p => {
            const atl = atletaMap[p.atleta_id] || {};
            const dorsal = atl.equipamento_numero_1 || atl.equipamento_numero_2 || atl.dorsal || '-';
            const escFinal = p.escalao || atl.escalao || '-';
            const badgeHtml = badgeMap[p.estado] || `<span class="badge">${p.estado}</span>`;
            
            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px; font-weight: 600;">${p.data || '-'}</td>
                    <td style="padding: 10px;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${p.tipo || 'Treino'}</span></td>
                    <td style="padding: 10px;"><span style="background: rgba(126, 34, 206, 0.08); color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">🏀 ${escFinal}</span></td>
                    <td style="padding: 10px; font-weight: 600;">${atl.nome || `Atleta #${p.atleta_id}`}</td>
                    <td style="padding: 10px; text-align: center;"><span style="background: #0f172a; color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Nº ${dorsal}</span></td>
                    <td style="padding: 10px; text-align: center;">${badgeHtml}</td>
                    <td style="padding: 10px; color: var(--text-secondary); font-size: 0.85rem;">👤 ${p.registado_por || 'Sistema'}</td>
                </tr>
            `;
        }).join('');
    }

    // Eventos de filtro desportivo
    if (despFilterEscalao) despFilterEscalao.addEventListener('change', renderDesportivaTable);
    if (despFilterEstado) despFilterEstado.addEventListener('change', renderDesportivaTable);
    if (despFilterTipo) despFilterTipo.addEventListener('change', renderDesportivaTable);
    if (despFilterData) despFilterData.addEventListener('change', renderDesportivaTable);
    if (despFilterSearch) despFilterSearch.addEventListener('input', renderDesportivaTable);
    if (btnDespClearFilters) {
        btnDespClearFilters.addEventListener('click', () => {
            if (despFilterEscalao) despFilterEscalao.value = '';
            if (despFilterEstado) despFilterEstado.value = '';
            if (despFilterTipo) despFilterTipo.value = '';
            if (despFilterData) despFilterData.value = '';
            if (despFilterSearch) despFilterSearch.value = '';
            renderDesportivaTable();
        });
    }

    // Exportação CSV Desportiva
    if (btnExportDesportivaCsv) {
        btnExportDesportivaCsv.addEventListener('click', () => {
            const atletaMap = {};
            currentAtletas.forEach(a => { atletaMap[a.id] = a; });

            const headers = ['Data', 'Tipo', 'Escalao', 'Atleta', 'Dorsal', 'Estado', 'Registado_Por'];
            const rows = currentDesportivaPresencas.map(p => {
                const atl = atletaMap[p.atleta_id] || {};
                const dorsal = atl.equipamento_numero_1 || atl.equipamento_numero_2 || atl.dorsal || '';
                return [
                    `"${p.data || ''}"`,
                    `"${p.tipo || 'Treino'}"`,
                    `"${p.escalao || atl.escalao || ''}"`,
                    `"${(atl.nome || '').replace(/"/g, '""')}"`,
                    `"${dorsal}"`,
                    `"${p.estado || ''}"`,
                    `"${(p.registado_por || '').replace(/"/g, '""')}"`
                ].join(',');
            });

            const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Relatorio_Assiduidade_BCV_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Exportação PDF Desportiva (Impressão / PDF estruturado)
    if (btnExportDesportivaPdf) {
        btnExportDesportivaPdf.addEventListener('click', () => {
            const atletaMap = {};
            currentAtletas.forEach(a => { atletaMap[a.id] = a; });

            const dataHoje = new Date().toLocaleDateString('pt-PT');
            const printWin = window.open('', '_blank');
            if (!printWin) {
                alert('Por favor, permita popups para gerar o relatório PDF.');
                return;
            }

            let rowsHtml = '';
            currentDesportivaPresencas.forEach(p => {
                const atl = atletaMap[p.atleta_id] || {};
                const dorsal = atl.equipamento_numero_1 || atl.equipamento_numero_2 || atl.dorsal || '-';
                rowsHtml += `
                    <tr>
                        <td style="padding:6px; border:1px solid #ddd;">${p.data || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.tipo || 'Treino'}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.escalao || atl.escalao || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd; font-weight:600;">${atl.nome || `Atleta #${p.atleta_id}`}</td>
                        <td style="padding:6px; border:1px solid #ddd; text-align:center;">${dorsal}</td>
                        <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:bold;">${p.estado}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.registado_por || '-'}</td>
                    </tr>
                `;
            });

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Relatório de Assiduidade e Presenças - BCV</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
                        h1 { font-size: 16px; margin: 0 0 4px; color: #7e22ce; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th { background: #f1f5f9; padding: 8px 6px; border: 1px solid #ccc; text-align: left; }
                    </style>
                </head>
                <body>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #7e22ce; padding-bottom: 8px;">
                        <div>
                            <h1>BASKET CLUBE DE VALENÇA</h1>
                            <div>Relatório Geral de Assiduidade, Presenças e Faltas</div>
                        </div>
                        <div style="text-align:right;">
                            <div>Data de Emissão: <strong>${dataHoje}</strong></div>
                            <div>Total Registos: <strong>${currentDesportivaPresencas.length}</strong></div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Escalão</th>
                                <th>Atleta</th>
                                <th>Nº</th>
                                <th>Estado</th>
                                <th>Registado Por</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `);
            printWin.document.close();
        });
    }

    // ====================================================================
    // 16. GESTÃO FINANCEIRA & TABELA DE PREÇOS
    // ====================================================================
    let currentFinanceiraPagamentos = [];
    const ESCALOES_PADRAO = ['BabyBasket', 'Mini 8', 'Mini 10', 'Mini 12', 'Sub 14', 'Sub 16', 'Sub 18', 'Sub 20', 'Seniores', 'Veteranos'];
    let tabelaPrecosQuotas = {};

    const btnSubfins = document.querySelectorAll('.btn-subfin');
    const subfinContents = document.querySelectorAll('.subfin-content');

    const finFilterEscalao = document.getElementById('fin-filter-escalao');
    const finFilterMes = document.getElementById('fin-filter-mes');
    const finFilterMetodo = document.getElementById('fin-filter-metodo');
    const finFilterRecebedor = document.getElementById('fin-filter-recebedor');
    const finFilterSearch = document.getElementById('fin-filter-search');
    const btnFinClearFilters = document.getElementById('btn-fin-clear-filters');
    const financeiraTableBody = document.getElementById('financeira-table-body');
    const finCountInfo = document.getElementById('fin-count-info');

    const finKpiTotalArrecadado = document.getElementById('fin-kpi-total-arrecadado');
    const finKpiTotalAnuais = document.getElementById('fin-kpi-total-anuais');
    const finKpiTotalMensalidades = document.getElementById('fin-kpi-total-mensalidades');
    const finKpiMetodos = document.getElementById('fin-kpi-metodos');

    const btnOpenModalPagamentoAdmin = document.getElementById('btn-open-modal-pagamento-admin');
    const modalAdminPagamento = document.getElementById('modal-admin-pagamento');
    const formAdminPagamento = document.getElementById('form-admin-pagamento');
    const modalAdminPagamentoTitle = document.getElementById('modal-admin-pagamento-title');
    const adminPagamentoId = document.getElementById('admin-pagamento-id');
    const adminPagamentoAtleta = document.getElementById('admin-pagamento-atleta');
    const adminPagamentoTipo = document.getElementById('admin-pagamento-tipo');
    const adminPagamentoMes = document.getElementById('admin-pagamento-mes');
    const adminPagamentoValor = document.getElementById('admin-pagamento-valor');
    const adminPagamentoMetodo = document.getElementById('admin-pagamento-metodo');
    const adminPagamentoData = document.getElementById('admin-pagamento-data');
    const adminPagamentoRecebedor = document.getElementById('admin-pagamento-recebedor');
    const adminPagamentoNotas = document.getElementById('admin-pagamento-notas');
    const containerAdminPagamentoMes = document.getElementById('container-admin-pagamento-mes');

    const tabelaPrecosTbody = document.getElementById('tabela-precos-tbody');
    const btnSaveTabelaPrecos = document.getElementById('btn-save-tabela-precos');
    const msgTabelaPrecos = document.getElementById('msg-tabela-precos');

    const btnExportFinanceiraCsv = document.getElementById('btn-export-financeira-csv');
    const btnExportFinanceiraPdf = document.getElementById('btn-export-financeira-pdf');

    // Alternância entre Sub-Secções Financeiras
    btnSubfins.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSub = btn.getAttribute('data-sub');
            btnSubfins.forEach(b => {
                b.classList.remove('active');
                b.style.background = '#f8fafc';
                b.style.color = 'var(--text-primary)';
                b.style.borderColor = 'var(--border-color)';
            });
            btn.classList.add('active');
            btn.style.background = '#7e22ce';
            btn.style.color = '#fff';
            btn.style.borderColor = '#7e22ce';

            subfinContents.forEach(c => c.classList.add('hidden'));
            const content = document.getElementById(targetSub);
            if (content) content.classList.remove('hidden');

            if (targetSub === 'subfin-tabela-precos') {
                renderTabelaPrecos();
            }
        });
    });

    async function loadFinanceira() {
        if (!financeiraTableBody) return;
        financeiraTableBody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: var(--text-secondary);">A carregar pagamentos globais...</td></tr>';

        try {
            // 1. Carregar atletas se necessário
            if (currentAtletas.length === 0) {
                const { data: atls } = await supabase.from('atletasbcv').select('*');
                currentAtletas = atls || [];
            }

            // 2. Carregar Tabela de Preços configurada
            await loadTabelaPrecos();

            // 3. Carregar todos os pagamentos da época 2026/2027
            const { data: pagamentos, error } = await supabase
                .from('mensalidades')
                .select('*')
                .eq('epoca', '2026/2027')
                .order('data_pagamento', { ascending: false });

            if (error && error.code !== '42P01') throw error;
            currentFinanceiraPagamentos = pagamentos || [];

            // Povoar filtro de recebedores
            if (finFilterRecebedor) {
                const recebedores = [...new Set(currentFinanceiraPagamentos.map(p => p.registado_por).filter(Boolean))];
                finFilterRecebedor.innerHTML = '<option value="">Todos os Recetores</option>' +
                    recebedores.map(r => `<option value="${r}">${r}</option>`).join('');
            }

            renderFinanceiraTable();

        } catch (error) {
            console.error('Erro ao carregar pagamentos financeiros:', error);
            financeiraTableBody.innerHTML = `<tr><td colspan="9" style="padding: 15px; text-align: center; color: #ef4444;">Erro ao carregar pagamentos: ${error.message}</td></tr>`;
        }
    }

    function renderFinanceiraTable() {
        if (!financeiraTableBody) return;

        const fEsc = (finFilterEscalao?.value || '').toLowerCase().trim();
        const fMes = (finFilterMes?.value || '').trim();
        const fMet = (finFilterMetodo?.value || '').trim();
        const fRec = (finFilterRecebedor?.value || '').trim();
        const fSearch = (finFilterSearch?.value || '').toLowerCase().trim();

        const atletaMap = {};
        currentAtletas.forEach(a => { atletaMap[a.id] = a; });

        let filtrados = currentFinanceiraPagamentos.filter(p => {
            const atleta = atletaMap[p.atleta_id] || {};
            const esc = (atleta.escalao || '').toLowerCase();
            const atlNome = (atleta.nome || '').toLowerCase();

            if (fEsc && !esc.includes(fEsc.replace(/[-\s]/g, ''))) return false;
            if (fMes) {
                if (fMes === 'ANUAL' && p.mes !== 'ANUAL') return false;
                if (fMes !== 'ANUAL' && p.mes !== fMes) return false;
            }
            if (fMet && p.metodo_pagamento !== fMet) return false;
            if (fRec && p.registado_por !== fRec) return false;
            if (fSearch && !atlNome.includes(fSearch)) return false;

            return true;
        });

        // Totais e KPIs
        let totalArrecadado = 0;
        let totalAnuais = 0;
        let totalMensalidades = 0;
        let totalDinheiro = 0;
        let totalMbway = 0;
        let totalTransf = 0;

        filtrados.forEach(p => {
            const val = Number(p.valor || 0);
            totalArrecadado += val;
            if (p.mes === 'ANUAL') {
                totalAnuais += val;
            } else {
                totalMensalidades += val;
            }

            const met = (p.metodo_pagamento || '').toLowerCase();
            if (met.includes('dinheiro')) totalDinheiro += val;
            else if (met.includes('mbway')) totalMbway += val;
            else if (met.includes('transf')) totalTransf += val;
        });

        if (finKpiTotalArrecadado) finKpiTotalArrecadado.textContent = `${totalArrecadado.toFixed(2)} €`;
        if (finKpiTotalAnuais) finKpiTotalAnuais.textContent = `${totalAnuais.toFixed(2)} €`;
        if (finKpiTotalMensalidades) finKpiTotalMensalidades.textContent = `${totalMensalidades.toFixed(2)} €`;
        if (finKpiMetodos) {
            finKpiMetodos.innerHTML = `💵 ${totalDinheiro.toFixed(0)}€ &nbsp;|&nbsp; 📱 ${totalMbway.toFixed(0)}€ &nbsp;|&nbsp; 🏦 ${totalTransf.toFixed(0)}€`;
        }
        if (finCountInfo) finCountInfo.textContent = `${filtrados.length} pagamentos registados`;

        if (filtrados.length === 0) {
            financeiraTableBody.innerHTML = '<tr><td colspan="9" style="padding: 20px; text-align: center; color: var(--text-secondary);">Nenhum pagamento corresponde aos filtros selecionados.</td></tr>';
            return;
        }

        financeiraTableBody.innerHTML = filtrados.map(p => {
            const atl = atletaMap[p.atleta_id] || {};
            const escFinal = atl.escalao || '-';
            const isAnual = p.mes === 'ANUAL';
            const conceitoHtml = isAnual 
                ? '<span style="background: rgba(126, 34, 206, 0.12); color: #7e22ce; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; border: 1px solid rgba(126, 34, 206, 0.3);">⭐ Quota Anual Completa</span>'
                : `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600;">📅 ${p.mes}</span>`;

            const metHtml = p.metodo_pagamento === 'MBWay' ? '📱 MBWay' : (p.metodo_pagamento === 'Transferência' ? '🏦 Transf. Bancária' : '💵 Dinheiro');

            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px; font-weight: 600;">${p.data_pagamento || '-'}</td>
                    <td style="padding: 10px; font-weight: 700;">${atl.nome || `Atleta #${p.atleta_id}`}</td>
                    <td style="padding: 10px;"><span style="background: rgba(126, 34, 206, 0.08); color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">🏀 ${escFinal}</span></td>
                    <td style="padding: 10px;">${conceitoHtml}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 800; color: #059669;">${Number(p.valor || 0).toFixed(2)} €</td>
                    <td style="padding: 10px; font-size: 0.85rem;">${metHtml}</td>
                    <td style="padding: 10px; font-weight: 600; color: var(--text-primary);">👤 ${p.registado_por || '-'}</td>
                    <td style="padding: 10px; color: var(--text-secondary); font-size: 0.8rem;">${p.notas || '-'}</td>
                    <td style="padding: 10px; text-align: center; white-space: nowrap;">
                        <button class="btn-action" title="Editar Pagamento" onclick="window.editAdminPagamento(${p.id})">✏️</button>
                        <button class="btn-action delete" title="Anular Pagamento" onclick="window.deleteAdminPagamento(${p.id})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Filtros Financeiros
    if (finFilterEscalao) finFilterEscalao.addEventListener('change', renderFinanceiraTable);
    if (finFilterMes) finFilterMes.addEventListener('change', renderFinanceiraTable);
    if (finFilterMetodo) finFilterMetodo.addEventListener('change', renderFinanceiraTable);
    if (finFilterRecebedor) finFilterRecebedor.addEventListener('change', renderFinanceiraTable);
    if (finFilterSearch) finFilterSearch.addEventListener('input', renderFinanceiraTable);
    if (btnFinClearFilters) {
        btnFinClearFilters.addEventListener('click', () => {
            if (finFilterEscalao) finFilterEscalao.value = '';
            if (finFilterMes) finFilterMes.value = '';
            if (finFilterMetodo) finFilterMetodo.value = '';
            if (finFilterRecebedor) finFilterRecebedor.value = '';
            if (finFilterSearch) finFilterSearch.value = '';
            renderFinanceiraTable();
        });
    }

    // Gestão da Tabela de Preços de Quotas por Escalão
    async function loadTabelaPrecos() {
        try {
            const { data: configRow } = await supabase
                .from('configuracoes_clube')
                .select('*')
                .eq('chave', 'tabela_quotas')
                .maybeSingle();

            if (configRow && configRow.valor) {
                tabelaPrecosQuotas = typeof configRow.valor === 'string' ? JSON.parse(configRow.valor) : configRow.valor;
            } else {
                // Valores padrão
                tabelaPrecosQuotas = {};
                ESCALOES_PADRAO.forEach(esc => {
                    tabelaPrecosQuotas[esc] = { mensal: 25.00, anual: 250.00 };
                });
            }
        } catch (e) {
            console.warn('Tabela de quotas não encontrada na BD, usando padrão:', e);
            tabelaPrecosQuotas = {};
            ESCALOES_PADRAO.forEach(esc => {
                tabelaPrecosQuotas[esc] = { mensal: 25.00, anual: 250.00 };
            });
        }
    }

    function renderTabelaPrecos() {
        if (!tabelaPrecosTbody) return;
        tabelaPrecosTbody.innerHTML = ESCALOES_PADRAO.map(esc => {
            const cfg = tabelaPrecosQuotas[esc] || { mensal: 25.00, anual: 250.00 };
            return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px; font-weight: 700;">🏀 ${esc}</td>
                    <td style="padding: 10px;">
                        <input type="number" step="0.5" class="admin-input input-preco-mensal" data-escalao="${esc}" value="${Number(cfg.mensal || 25).toFixed(2)}" style="margin: 0; width: 140px;">
                    </td>
                    <td style="padding: 10px;">
                        <input type="number" step="0.5" class="admin-input input-preco-anual" data-escalao="${esc}" value="${Number(cfg.anual || 250).toFixed(2)}" style="margin: 0; width: 140px;">
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (btnSaveTabelaPrecos) {
        btnSaveTabelaPrecos.addEventListener('click', async () => {
            btnSaveTabelaPrecos.textContent = 'A guardar...';
            btnSaveTabelaPrecos.disabled = true;

            const novaTabela = {};
            document.querySelectorAll('.input-preco-mensal').forEach(inp => {
                const esc = inp.getAttribute('data-escalao');
                if (!novaTabela[esc]) novaTabela[esc] = {};
                novaTabela[esc].mensal = Number(inp.value) || 25.00;
            });

            document.querySelectorAll('.input-preco-anual').forEach(inp => {
                const esc = inp.getAttribute('data-escalao');
                if (!novaTabela[esc]) novaTabela[esc] = {};
                novaTabela[esc].anual = Number(inp.value) || 250.00;
            });

            tabelaPrecosQuotas = novaTabela;

            try {
                const { error } = await supabase
                    .from('configuracoes_clube')
                    .upsert({
                        chave: 'tabela_quotas',
                        valor: novaTabela,
                        descricao: 'Valores padrão de mensalidades e anuidade por escalão'
                    }, { onConflict: 'chave' });

                if (error && error.code !== '42P01') throw error;

                if (msgTabelaPrecos) {
                    msgTabelaPrecos.textContent = '✅ Tabela de preços guardada com sucesso!';
                    msgTabelaPrecos.style.color = '#10b981';
                    msgTabelaPrecos.classList.remove('hidden');
                    setTimeout(() => msgTabelaPrecos.classList.add('hidden'), 4000);
                }
            } catch (err) {
                console.error('Erro ao guardar tabela de quotas:', err);
                if (msgTabelaPrecos) {
                    msgTabelaPrecos.textContent = '❌ Erro ao guardar: ' + err.message;
                    msgTabelaPrecos.style.color = '#ef4444';
                    msgTabelaPrecos.classList.remove('hidden');
                }
            } finally {
                btnSaveTabelaPrecos.textContent = '💾 Guardar Tabela de Preços';
                btnSaveTabelaPrecos.disabled = false;
            }
        });
    }

    // Modal de Pagamento no Admin
    function populateAtletasSelectInAdminPagamento() {
        if (!adminPagamentoAtleta) return;
        const sorted = [...currentAtletas].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        adminPagamentoAtleta.innerHTML = '<option value="" disabled selected>Selecionar Atleta</option>' +
            sorted.map(a => `<option value="${a.id}">🏀 ${a.nome} (${a.escalao || 'Sem Escalão'})</option>`).join('');
    }

    window.openAdminPagamentoModal = function(pagamentoId = null) {
        if (!modalAdminPagamento) return;
        populateAtletasSelectInAdminPagamento();

        if (pagamentoId) {
            const p = currentFinanceiraPagamentos.find(x => x.id === pagamentoId);
            if (!p) return;
            modalAdminPagamentoTitle.textContent = 'Editar Pagamento';
            adminPagamentoId.value = p.id;
            adminPagamentoAtleta.value = p.atleta_id;
            adminPagamentoTipo.value = p.mes === 'ANUAL' ? 'ANUAL' : 'MENSAL';
            if (p.mes === 'ANUAL') {
                if (containerAdminPagamentoMes) containerAdminPagamentoMes.style.display = 'none';
            } else {
                if (containerAdminPagamentoMes) containerAdminPagamentoMes.style.display = 'block';
                adminPagamentoMes.value = p.mes || '2026-09';
            }
            adminPagamentoValor.value = Number(p.valor || 0).toFixed(2);
            adminPagamentoMetodo.value = p.metodo_pagamento || 'Dinheiro';
            adminPagamentoData.value = p.data_pagamento || new Date().toISOString().split('T')[0];
            adminPagamentoRecebedor.value = p.registado_por || 'Secretaria';
            adminPagamentoNotas.value = p.notas || '';
        } else {
            modalAdminPagamentoTitle.textContent = 'Registar Novo Pagamento';
            adminPagamentoId.value = '';
            adminPagamentoAtleta.value = '';
            adminPagamentoTipo.value = 'MENSAL';
            if (containerAdminPagamentoMes) containerAdminPagamentoMes.style.display = 'block';
            adminPagamentoMes.value = '2026-09';
            adminPagamentoValor.value = '25.00';
            adminPagamentoMetodo.value = 'Dinheiro';
            adminPagamentoData.value = new Date().toISOString().split('T')[0];
            adminPagamentoRecebedor.value = 'Secretaria Admin';
            adminPagamentoNotas.value = '';
        }

        modalAdminPagamento.classList.remove('hidden');
    };

    window.editAdminPagamento = function(id) {
        window.openAdminPagamentoModal(id);
    };

    window.closeAdminPagamentoModal = function() {
        if (modalAdminPagamento) modalAdminPagamento.classList.add('hidden');
    };

    if (btnOpenModalPagamentoAdmin) {
        btnOpenModalPagamentoAdmin.addEventListener('click', () => {
            window.openAdminPagamentoModal();
        });
    }

    if (adminPagamentoTipo) {
        adminPagamentoTipo.addEventListener('change', () => {
            const isAnual = adminPagamentoTipo.value === 'ANUAL';
            if (containerAdminPagamentoMes) containerAdminPagamentoMes.style.display = isAnual ? 'none' : 'block';
            
            // Sugerir preço do escalão do atleta selecionado
            const atlId = Number(adminPagamentoAtleta.value);
            const atl = currentAtletas.find(a => a.id === atlId);
            const esc = atl ? atl.escalao : 'Sub 14';
            const cfg = tabelaPrecosQuotas[esc] || { mensal: 25.00, anual: 250.00 };

            adminPagamentoValor.value = isAnual ? Number(cfg.anual || 250).toFixed(2) : Number(cfg.mensal || 25).toFixed(2);
        });
    }

    if (adminPagamentoAtleta) {
        adminPagamentoAtleta.addEventListener('change', () => {
            const atlId = Number(adminPagamentoAtleta.value);
            const atl = currentAtletas.find(a => a.id === atlId);
            if (!atl) return;
            const esc = atl.escalao || 'Sub 14';
            const cfg = tabelaPrecosQuotas[esc] || { mensal: 25.00, anual: 250.00 };
            const isAnual = adminPagamentoTipo.value === 'ANUAL';
            adminPagamentoValor.value = isAnual ? Number(cfg.anual || 250).toFixed(2) : Number(cfg.mensal || 25).toFixed(2);
        });
    }

    if (formAdminPagamento) {
        formAdminPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = adminPagamentoId.value;
            const atletaId = Number(adminPagamentoAtleta.value);
            const tipo = adminPagamentoTipo.value;
            const mesFinal = tipo === 'ANUAL' ? 'ANUAL' : adminPagamentoMes.value;
            const valor = Number(adminPagamentoValor.value) || 25.00;
            const metodo = adminPagamentoMetodo.value;
            const dataPag = adminPagamentoData.value || new Date().toISOString().split('T')[0];
            const recebedor = adminPagamentoRecebedor.value || 'Secretaria';
            const notas = adminPagamentoNotas.value || '';

            const btnSave = document.getElementById('btn-save-admin-pagamento');
            btnSave.textContent = 'A guardar...';
            btnSave.disabled = true;

            const payload = {
                atleta_id: atletaId,
                epoca: '2026/2027',
                mes: mesFinal,
                valor: valor,
                estado: 'Pago',
                metodo_pagamento: metodo,
                data_pagamento: dataPag,
                registado_por: recebedor,
                notas: notas
            };

            try {
                if (id) {
                    // Atualizar
                    const { error } = await supabase
                        .from('mensalidades')
                        .update(payload)
                        .eq('id', id);
                    if (error) throw error;
                } else {
                    // Inserir / Upsert
                    const { error } = await supabase
                        .from('mensalidades')
                        .upsert(payload, { onConflict: 'atleta_id, epoca, mes' });
                    if (error) throw error;
                }

                window.closeAdminPagamentoModal();
                await loadFinanceira();

            } catch (err) {
                console.error('Erro ao guardar pagamento no admin:', err);
                alert('Erro ao guardar pagamento: ' + err.message);
            } finally {
                btnSave.textContent = 'Guardar Pagamento';
                btnSave.disabled = false;
            }
        });
    }

    window.deleteAdminPagamento = async function(id) {
        if (!confirm('Tem a certeza de que deseja anular este registo de pagamento?')) return;
        try {
            const { error } = await supabase
                .from('mensalidades')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await loadFinanceira();
        } catch (err) {
            console.error('Erro ao anular pagamento:', err);
            alert('Erro ao anular pagamento: ' + err.message);
        }
    };

    // Exportação CSV Financeira
    if (btnExportFinanceiraCsv) {
        btnExportFinanceiraCsv.addEventListener('click', () => {
            const atletaMap = {};
            currentAtletas.forEach(a => { atletaMap[a.id] = a; });

            const headers = ['Data_Pagamento', 'Atleta', 'Escalao', 'Conceito_Mes', 'Valor_EUR', 'Metodo', 'Quem_Recebeu', 'Notas'];
            const rows = currentFinanceiraPagamentos.map(p => {
                const atl = atletaMap[p.atleta_id] || {};
                return [
                    `"${p.data_pagamento || ''}"`,
                    `"${(atl.nome || '').replace(/"/g, '""')}"`,
                    `"${atl.escalao || ''}"`,
                    `"${p.mes || ''}"`,
                    `"${Number(p.valor || 0).toFixed(2)}"`,
                    `"${p.metodo_pagamento || ''}"`,
                    `"${(p.registado_por || '').replace(/"/g, '""')}"`,
                    `"${(p.notas || '').replace(/"/g, '""')}"`
                ].join(',');
            });

            const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Extrato_Financeiro_BCV_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Exportação PDF Financeira
    if (btnExportFinanceiraPdf) {
        btnExportFinanceiraPdf.addEventListener('click', () => {
            const atletaMap = {};
            currentAtletas.forEach(a => { atletaMap[a.id] = a; });

            const dataHoje = new Date().toLocaleDateString('pt-PT');
            const printWin = window.open('', '_blank');
            if (!printWin) {
                alert('Por favor, permita popups para gerar o relatório PDF.');
                return;
            }

            let totalArrecadado = 0;
            let rowsHtml = '';
            currentFinanceiraPagamentos.forEach(p => {
                const atl = atletaMap[p.atleta_id] || {};
                const val = Number(p.valor || 0);
                totalArrecadado += val;
                rowsHtml += `
                    <tr>
                        <td style="padding:6px; border:1px solid #ddd;">${p.data_pagamento || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd; font-weight:600;">${atl.nome || `Atleta #${p.atleta_id}`}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${atl.escalao || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.mes === 'ANUAL' ? '⭐ Quota Anual' : p.mes}</td>
                        <td style="padding:6px; border:1px solid #ddd; text-align:right; font-weight:bold;">${val.toFixed(2)} €</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.metodo_pagamento || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd; font-weight:600;">${p.registado_por || '-'}</td>
                        <td style="padding:6px; border:1px solid #ddd;">${p.notas || '-'}</td>
                    </tr>
                `;
            });

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Extrato Financeiro e Registo de Pagamentos - BCV</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
                        h1 { font-size: 16px; margin: 0 0 4px; color: #059669; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th { background: #f1f5f9; padding: 8px 6px; border: 1px solid #ccc; text-align: left; }
                    </style>
                </head>
                <body>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #059669; padding-bottom: 8px;">
                        <div>
                            <h1>BASKET CLUBE DE VALENÇA</h1>
                            <div>Extrato Financeiro Global de Quotas e Mensalidades (Época 2026/2027)</div>
                        </div>
                        <div style="text-align:right;">
                            <div>Data de Emissão: <strong>${dataHoje}</strong></div>
                            <div>Total Arrecadado: <strong style="color:#059669; font-size:14px;">${totalArrecadado.toFixed(2)} €</strong></div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Atleta</th>
                                <th>Escalão</th>
                                <th>Conceito</th>
                                <th style="text-align:right;">Valor</th>
                                <th>Método</th>
                                <th>Quem Recebeu</th>
                                <th>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `);
            printWin.document.close();
        });
    }

    // =========================================================================
    // 16. GESTÃO DE PATROCINADORES E PARCEIROS COM ATIVOS GRÁFICOS
    // =========================================================================
    let currentPatrocinadores = [];

    // Elementos DOM de Patrocinadores
    const btnNovoPatrocinador = document.getElementById('btn-novo-patrocinador');
    const modalPatrocinador = document.getElementById('modal-patrocinador-container');
    const btnCloseModalPatrocinador = document.getElementById('btn-close-modal-patrocinador');
    const btnCancelModalPatrocinador = document.getElementById('btn-cancel-modal-patrocinador');
    const formPatrocinador = document.getElementById('form-patrocinador');
    const modalPatrocinadorTitle = document.getElementById('modal-patrocinador-title');
    const msgPatrocinadorStatus = document.getElementById('msg-patrocinador-status');

    // Filtros
    const filtroPatBusca = document.getElementById('filtro-patrocinador-busca');
    const filtroPatCanal = document.getElementById('filtro-patrocinador-canal');
    const filtroPatCategoria = document.getElementById('filtro-patrocinador-categoria');
    const filtroPatEstado = document.getElementById('filtro-patrocinador-estado');
    const filtroPatEpoca = document.getElementById('filtro-patrocinador-epoca');

    // Modal de Pré-visualização de Ativo
    const modalPreviewAtivo = document.getElementById('modal-preview-ativo');
    const modalPreviewAtivoTitle = document.getElementById('modal-preview-ativo-title');
    const modalPreviewAtivoImg = document.getElementById('modal-preview-ativo-img');
    const modalPreviewAtivoInfo = document.getElementById('modal-preview-ativo-info');
    const btnDownloadAtivo = document.getElementById('btn-download-ativo');
    const btnCloseModalPreviewAtivo = document.getElementById('btn-close-modal-preview-ativo');
    const btnFecharPreviewAtivo = document.getElementById('btn-fechar-preview-ativo');

    // Upload & Previews no Modal
    const patFileLogo = document.getElementById('pat-file-logo');
    const patUrlLogo = document.getElementById('pat-url-logo');
    const patImgLogo = document.getElementById('pat-preview-logo-img');
    const patTxtLogo = document.getElementById('pat-preview-logo-txt');

    const patFilePavilhao = document.getElementById('pat-file-pavilhao');
    const patUrlPavilhao = document.getElementById('pat-url-pavilhao');
    const patImgPavilhao = document.getElementById('pat-preview-pavilhao-img');
    const patTxtPavilhao = document.getElementById('pat-preview-pavilhao-txt');

    const patFileRedes = document.getElementById('pat-file-redes');
    const patUrlRedes = document.getElementById('pat-url-redes');
    const patImgRedes = document.getElementById('pat-preview-redes-img');
    const patTxtRedes = document.getElementById('pat-preview-redes-txt');

    // Setup de previews em tempo real
    function setupFilePreview(inputEl, imgEl, txtEl) {
        if (!inputEl) return;
        inputEl.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const objectUrl = URL.createObjectURL(file);
                if (imgEl) {
                    imgEl.src = objectUrl;
                    imgEl.style.display = 'block';
                }
                if (txtEl) txtEl.style.display = 'none';
            }
        });
    }
    setupFilePreview(patFileLogo, patImgLogo, patTxtLogo);
    setupFilePreview(patFilePavilhao, patImgPavilhao, patTxtPavilhao);
    setupFilePreview(patFileRedes, patImgRedes, patTxtRedes);

    // Fecho do Modal de Pré-visualização
    if (btnCloseModalPreviewAtivo) btnCloseModalPreviewAtivo.addEventListener('click', () => modalPreviewAtivo.classList.add('hidden'));
    if (btnFecharPreviewAtivo) btnFecharPreviewAtivo.addEventListener('click', () => modalPreviewAtivo.classList.add('hidden'));

    window.previewAtivoGrafico = function(titulo, imgUrl, info) {
        if (!imgUrl) return;
        if (modalPreviewAtivoTitle) modalPreviewAtivoTitle.textContent = titulo || 'Visualização do Ativo';
        if (modalPreviewAtivoImg) modalPreviewAtivoImg.src = imgUrl;
        if (modalPreviewAtivoInfo) modalPreviewAtivoInfo.textContent = info || '';
        if (btnDownloadAtivo) {
            btnDownloadAtivo.href = imgUrl;
            btnDownloadAtivo.download = `${(titulo || 'ativo').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        }
        if (modalPreviewAtivo) modalPreviewAtivo.classList.remove('hidden');
    };

    // Abertura / Fecho do Modal de Edição
    if (btnNovoPatrocinador) {
        btnNovoPatrocinador.addEventListener('click', () => {
            window.openNovoPatrocinadorModal();
        });
    }
    if (btnCloseModalPatrocinador) {
        btnCloseModalPatrocinador.addEventListener('click', () => {
            if (modalPatrocinador) modalPatrocinador.classList.add('hidden');
        });
    }
    if (btnCancelModalPatrocinador) {
        btnCancelModalPatrocinador.addEventListener('click', () => {
            if (modalPatrocinador) modalPatrocinador.classList.add('hidden');
        });
    }

    window.openNovoPatrocinadorModal = function() {
        if (!formPatrocinador) return;
        formPatrocinador.reset();
        document.getElementById('pat-id').value = '';
        document.getElementById('pat-epoca').value = '2026/2027';
        document.getElementById('pat-ordem').value = '0';
        document.getElementById('pat-ativo').checked = true;
        document.getElementById('pat-expo-site').checked = true;
        document.getElementById('pat-expo-pavilhao').checked = false;
        document.getElementById('pat-expo-facebook').checked = false;
        document.getElementById('pat-expo-instagram').checked = false;
        document.getElementById('pat-expo-equipamento').checked = false;

        // Limpar previews
        if (patUrlLogo) patUrlLogo.value = '';
        if (patImgLogo) { patImgLogo.src = ''; patImgLogo.style.display = 'none'; }
        if (patTxtLogo) patTxtLogo.style.display = 'block';

        if (patUrlPavilhao) patUrlPavilhao.value = '';
        if (patImgPavilhao) { patImgPavilhao.src = ''; patImgPavilhao.style.display = 'none'; }
        if (patTxtPavilhao) patTxtPavilhao.style.display = 'block';

        if (patUrlRedes) patUrlRedes.value = '';
        if (patImgRedes) { patImgRedes.src = ''; patImgRedes.style.display = 'none'; }
        if (patTxtRedes) patTxtRedes.style.display = 'block';

        if (modalPatrocinadorTitle) modalPatrocinadorTitle.textContent = '➕ Adicionar Novo Patrocinador';
        if (msgPatrocinadorStatus) msgPatrocinadorStatus.classList.add('hidden');
        if (modalPatrocinador) modalPatrocinador.classList.remove('hidden');
    };

    window.editPatrocinador = function(id) {
        const p = currentPatrocinadores.find(item => item.id == id);
        if (!p || !formPatrocinador) return;

        document.getElementById('pat-id').value = p.id;
        document.getElementById('pat-nome').value = p.nome || '';
        document.getElementById('pat-categoria').value = p.categoria || 'Oficial';
        document.getElementById('pat-epoca').value = p.epoca || '2026/2027';
        document.getElementById('pat-website').value = p.website || '';
        document.getElementById('pat-valor').value = p.valor || '';
        document.getElementById('pat-ordem').value = p.ordem || 0;
        document.getElementById('pat-contacto-nome').value = p.contacto_nome || '';
        document.getElementById('pat-contacto-telefone').value = p.contacto_telefone || '';
        document.getElementById('pat-contacto-email').value = p.contacto_email || '';
        document.getElementById('pat-notas').value = p.notas || '';
        document.getElementById('pat-ativo').checked = !!p.ativo;

        document.getElementById('pat-expo-site').checked = !!p.expo_site;
        document.getElementById('pat-expo-pavilhao').checked = !!p.expo_pavilhao;
        document.getElementById('pat-expo-facebook').checked = !!p.expo_facebook;
        document.getElementById('pat-expo-instagram').checked = !!p.expo_instagram;
        document.getElementById('pat-expo-equipamento').checked = !!p.expo_equipamento;

        // Ativos Gráficos
        if (patUrlLogo) patUrlLogo.value = p.logo_url || '';
        if (p.logo_url) {
            if (patImgLogo) { patImgLogo.src = p.logo_url; patImgLogo.style.display = 'block'; }
            if (patTxtLogo) patTxtLogo.style.display = 'none';
        } else {
            if (patImgLogo) { patImgLogo.src = ''; patImgLogo.style.display = 'none'; }
            if (patTxtLogo) patTxtLogo.style.display = 'block';
        }

        if (patUrlPavilhao) patUrlPavilhao.value = p.pavilhao_img_url || '';
        if (p.pavilhao_img_url) {
            if (patImgPavilhao) { patImgPavilhao.src = p.pavilhao_img_url; patImgPavilhao.style.display = 'block'; }
            if (patTxtPavilhao) patTxtPavilhao.style.display = 'none';
        } else {
            if (patImgPavilhao) { patImgPavilhao.src = ''; patImgPavilhao.style.display = 'none'; }
            if (patTxtPavilhao) patTxtPavilhao.style.display = 'block';
        }

        if (patUrlRedes) patUrlRedes.value = p.redes_img_url || '';
        if (p.redes_img_url) {
            if (patImgRedes) { patImgRedes.src = p.redes_img_url; patImgRedes.style.display = 'block'; }
            if (patTxtRedes) patTxtRedes.style.display = 'none';
        } else {
            if (patImgRedes) { patImgRedes.src = ''; patImgRedes.style.display = 'none'; }
            if (patTxtRedes) patTxtRedes.style.display = 'block';
        }

        if (modalPatrocinadorTitle) modalPatrocinadorTitle.textContent = `✏️ Editar Patrocinador: ${p.nome}`;
        if (msgPatrocinadorStatus) msgPatrocinadorStatus.classList.add('hidden');
        if (modalPatrocinador) modalPatrocinador.classList.remove('hidden');
    };

    // Helper de Upload com Resiliência de Buckets
    async function uploadPatrocinadorFile(file, prefixo) {
        if (!file) return null;
        const fileExt = file.name.split('.').pop();
        const cleanName = `${prefixo}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `patrocinadores/${cleanName}`;

        // 1. Tenta bucket patrocinadores
        let { error: err1 } = await supabase.storage.from('patrocinadores').upload(filePath, file);
        if (!err1) {
            return supabase.storage.from('patrocinadores').getPublicUrl(filePath).data.publicUrl;
        }

        // 2. Fallback para fotos
        let { error: err2 } = await supabase.storage.from('fotos').upload(filePath, file);
        if (!err2) {
            return supabase.storage.from('fotos').getPublicUrl(filePath).data.publicUrl;
        }

        // 3. Fallback para galeria
        let { error: err3 } = await supabase.storage.from('galeria').upload(filePath, file);
        if (!err3) {
            return supabase.storage.from('galeria').getPublicUrl(filePath).data.publicUrl;
        }

        console.error("Falha em todos os buckets de storage:", err1, err2, err3);
        throw new Error("Não foi possível carregar o ficheiro para o armazenamento.");
    }

    // Submissão do Formulário de Patrocinador
    if (formPatrocinador) {
        formPatrocinador.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSave = document.getElementById('btn-save-patrocinador');
            const patId = document.getElementById('pat-id').value;

            btnSave.disabled = true;
            btnSave.textContent = '⏳ A carregar ficheiros e a guardar...';
            if (msgPatrocinadorStatus) {
                msgPatrocinadorStatus.classList.remove('hidden');
                msgPatrocinadorStatus.style.color = '#7e22ce';
                msgPatrocinadorStatus.textContent = 'A processar imagens e a atualizar base de dados...';
            }

            try {
                // 1. Upload dos ficheiros novos se selecionados
                let logoUrl = patUrlLogo ? patUrlLogo.value : null;
                if (patFileLogo && patFileLogo.files && patFileLogo.files[0]) {
                    logoUrl = await uploadPatrocinadorFile(patFileLogo.files[0], 'logo');
                }

                let pavilhaoUrl = patUrlPavilhao ? patUrlPavilhao.value : null;
                if (patFilePavilhao && patFilePavilhao.files && patFilePavilhao.files[0]) {
                    pavilhaoUrl = await uploadPatrocinadorFile(patFilePavilhao.files[0], 'pavilhao');
                }

                let redesUrl = patUrlRedes ? patUrlRedes.value : null;
                if (patFileRedes && patFileRedes.files && patFileRedes.files[0]) {
                    redesUrl = await uploadPatrocinadorFile(patFileRedes.files[0], 'redes');
                }

                const payload = {
                    nome: document.getElementById('pat-nome').value.trim(),
                    categoria: document.getElementById('pat-categoria').value,
                    epoca: document.getElementById('pat-epoca').value.trim() || '2026/2027',
                    website: document.getElementById('pat-website').value.trim() || null,
                    valor: parseFloat(document.getElementById('pat-valor').value) || 0.00,
                    ordem: parseInt(document.getElementById('pat-ordem').value, 10) || 0,
                    contacto_nome: document.getElementById('pat-contacto-nome').value.trim() || null,
                    contacto_telefone: document.getElementById('pat-contacto-telefone').value.trim() || null,
                    contacto_email: document.getElementById('pat-contacto-email').value.trim() || null,
                    notas: document.getElementById('pat-notas').value.trim() || null,
                    ativo: document.getElementById('pat-ativo').checked,
                    expo_site: document.getElementById('pat-expo-site').checked,
                    expo_pavilhao: document.getElementById('pat-expo-pavilhao').checked,
                    expo_facebook: document.getElementById('pat-expo-facebook').checked,
                    expo_instagram: document.getElementById('pat-expo-instagram').checked,
                    expo_equipamento: document.getElementById('pat-expo-equipamento').checked,
                    logo_url: logoUrl,
                    pavilhao_img_url: pavilhaoUrl,
                    redes_img_url: redesUrl,
                    updated_at: new Date().toISOString()
                };

                let dbError = null;
                if (patId) {
                    const { error } = await supabase.from('patrocinadores_bcv').update(payload).eq('id', patId);
                    dbError = error;
                } else {
                    const { error } = await supabase.from('patrocinadores_bcv').insert([payload]);
                    dbError = error;
                }

                if (dbError) throw dbError;

                if (msgPatrocinadorStatus) {
                    msgPatrocinadorStatus.style.color = '#15803d';
                    msgPatrocinadorStatus.textContent = '✅ Patrocinador guardado com sucesso!';
                }

                setTimeout(() => {
                    if (modalPatrocinador) modalPatrocinador.classList.add('hidden');
                    loadPatrocinadores();
                }, 700);

            } catch (err) {
                console.error("Erro ao guardar patrocinador:", err);
                if (msgPatrocinadorStatus) {
                    msgPatrocinadorStatus.style.color = '#b91c1c';
                    msgPatrocinadorStatus.textContent = `❌ Erro: ${err.message || 'Falha ao guardar'}`;
                }
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = '💾 Guardar Patrocinador';
            }
        });
    }

    // Toggle rápido de Ativo / Inativo
    window.togglePatrocinadorAtivo = async function(id, currentStatus) {
        try {
            const { error } = await supabase
                .from('patrocinadores_bcv')
                .update({ ativo: !currentStatus, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            loadPatrocinadores();
        } catch (err) {
            console.error("Erro ao alterar estado do patrocinador:", err);
            alert("Erro ao alterar estado: " + err.message);
        }
    };

    // Eliminar Patrocinador
    window.deletePatrocinador = async function(id) {
        const p = currentPatrocinadores.find(item => item.id == id);
        const nome = p ? p.nome : 'este patrocinador';
        if (!confirm(`Tem a certeza de que pretende eliminar o patrocinador "${nome}"?`)) return;

        try {
            const { error } = await supabase.from('patrocinadores_bcv').delete().eq('id', id);
            if (error) throw error;
            loadPatrocinadores();
        } catch (err) {
            console.error("Erro ao eliminar patrocinador:", err);
            alert("Erro ao eliminar: " + err.message);
        }
    };

    // Carregar e Renderizar Patrocinadores
    async function loadPatrocinadores() {
        const container = document.getElementById('lista-patrocinadores');
        if (!container) return;

        try {
            const { data, error } = await supabase
                .from('patrocinadores_bcv')
                .select('*')
                .order('ordem', { ascending: true })
                .order('nome', { ascending: true });

            if (error) {
                // Se a tabela ainda não foi criada na BD
                if (error.code === '42P01') {
                    container.innerHTML = `
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px; color: #b91c1c;">
                                ⚠️ A tabela <code>patrocinadores_bcv</code> ainda não foi criada no Supabase.<br>
                                Execute o script <code>setup_patrocinadores.sql</code> no SQL Editor do Supabase para ativar este módulo.
                            </td>
                        </tr>
                    `;
                    return;
                }
                throw error;
            }

            currentPatrocinadores = data || [];

            // Atualizar KPIs
            const total = currentPatrocinadores.length;
            const ativos = currentPatrocinadores.filter(p => p.ativo).length;
            const pavilhao = currentPatrocinadores.filter(p => p.expo_pavilhao && p.ativo).length;
            const redes = currentPatrocinadores.filter(p => (p.expo_facebook || p.expo_instagram) && p.ativo).length;
            const site = currentPatrocinadores.filter(p => p.expo_site && p.ativo).length;

            const elTotal = document.getElementById('kpi-patrocinadores-total');
            const elAtivos = document.getElementById('kpi-patrocinadores-ativos');
            const elPavilhao = document.getElementById('kpi-patrocinadores-pavilhao');
            const elRedes = document.getElementById('kpi-patrocinadores-redes');
            const elSite = document.getElementById('kpi-patrocinadores-site');

            if (elTotal) elTotal.textContent = total;
            if (elAtivos) elAtivos.textContent = ativos;
            if (elPavilhao) elPavilhao.textContent = pavilhao;
            if (elRedes) elRedes.textContent = redes;
            if (elSite) elSite.textContent = site;

            applyPatrocinadoresFilters();

        } catch (err) {
            console.error("Erro ao ler patrocinadores:", err);
            container.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 30px; color: #b91c1c;">
                        ❌ Erro ao carregar dados: ${err.message}
                    </td>
                </tr>
            `;
        }
    }

    // Filtragem em tempo real
    function applyPatrocinadoresFilters() {
        const busca = (filtroPatBusca ? filtroPatBusca.value : '').toLowerCase().trim();
        const canal = filtroPatCanal ? filtroPatCanal.value : '';
        const categoria = filtroPatCategoria ? filtroPatCategoria.value : '';
        const estado = filtroPatEstado ? filtroPatEstado.value : '';
        const epoca = filtroPatEpoca ? filtroPatEpoca.value : '';

        const filtrados = currentPatrocinadores.filter(p => {
            // Busca
            if (busca) {
                const matchNome = (p.nome || '').toLowerCase().includes(busca);
                const matchContacto = (p.contacto_nome || '').toLowerCase().includes(busca);
                const matchEmail = (p.contacto_email || '').toLowerCase().includes(busca);
                if (!matchNome && !matchContacto && !matchEmail) return false;
            }

            // Canal
            if (canal === 'site' && !p.expo_site) return false;
            if (canal === 'pavilhao' && !p.expo_pavilhao) return false;
            if (canal === 'facebook' && !p.expo_facebook) return false;
            if (canal === 'instagram' && !p.expo_instagram) return false;
            if (canal === 'equipamento' && !p.expo_equipamento) return false;

            // Categoria
            if (categoria && p.categoria !== categoria) return false;

            // Estado
            if (estado === 'ativo' && !p.ativo) return false;
            if (estado === 'inativo' && p.ativo) return false;

            // Época
            if (epoca && p.epoca !== epoca) return false;

            return true;
        });

        renderPatrocinadores(filtrados);
    }

    // Listeners dos Filtros
    if (filtroPatBusca) filtroPatBusca.addEventListener('input', applyPatrocinadoresFilters);
    if (filtroPatCanal) filtroPatCanal.addEventListener('change', applyPatrocinadoresFilters);
    if (filtroPatCategoria) filtroPatCategoria.addEventListener('change', applyPatrocinadoresFilters);
    if (filtroPatEstado) filtroPatEstado.addEventListener('change', applyPatrocinadoresFilters);
    if (filtroPatEpoca) filtroPatEpoca.addEventListener('change', applyPatrocinadoresFilters);

    // Renderização na Tabela
    function renderPatrocinadores(lista) {
        const container = document.getElementById('lista-patrocinadores');
        if (!container) return;

        if (lista.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 2.2rem; margin-bottom: 8px;">🤝</div>
                        <strong style="font-size: 1rem; color: var(--text-primary); display: block;">Nenhum patrocinador encontrado</strong>
                        <span style="font-size: 0.85rem;">Não existem parceiros registados com os filtros selecionados.</span>
                        <div style="margin-top: 15px;">
                            <button type="button" onclick="window.openNovoPatrocinadorModal()" class="btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">
                                ➕ Registar Primeiro Patrocinador
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const catColors = {
            'Principal': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
            'Ouro': { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' },
            'Prata': { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
            'Bronze': { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
            'Apoio Institucional': { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
            'Parceiro Desportivo': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
            'Oficial': { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' }
        };

        container.innerHTML = lista.map(p => {
            const catStyle = catColors[p.categoria] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };

            // Badges dos Canais
            const canaisBadges = [];
            if (p.expo_site) canaisBadges.push(`<span title="Site BCV" style="background: #f3e8ff; color: #6b21a8; font-size: 0.72rem; font-weight: 700; padding: 3px 7px; border-radius: 6px; display: inline-block; margin: 2px;">🌐 Site</span>`);
            if (p.expo_pavilhao) canaisBadges.push(`<span title="Painel no Pavilhão" style="background: #ffedd5; color: #c2410c; font-size: 0.72rem; font-weight: 700; padding: 3px 7px; border-radius: 6px; display: inline-block; margin: 2px;">🏟️ Pavilhão</span>`);
            if (p.expo_facebook) canaisBadges.push(`<span title="Facebook" style="background: #dbeafe; color: #1d4ed8; font-size: 0.72rem; font-weight: 700; padding: 3px 7px; border-radius: 6px; display: inline-block; margin: 2px;">📘 FB</span>`);
            if (p.expo_instagram) canaisBadges.push(`<span title="Instagram" style="background: #fce7f3; color: #be185d; font-size: 0.72rem; font-weight: 700; padding: 3px 7px; border-radius: 6px; display: inline-block; margin: 2px;">📸 IG</span>`);
            if (p.expo_equipamento) canaisBadges.push(`<span title="Equipamentos Oficiais" style="background: #dcfce7; color: #15803d; font-size: 0.72rem; font-weight: 700; padding: 3px 7px; border-radius: 6px; display: inline-block; margin: 2px;">🎽 Equip.</span>`);
            const canaisHtml = canaisBadges.length > 0 ? canaisBadges.join('') : '<span style="color: #94a3b8; font-size: 0.75rem;">Sem canal ativo</span>';

            // Botões de Ativos Gráficos
            const ativosBtns = [];
            if (p.logo_url) {
                ativosBtns.push(`<button type="button" onclick="window.previewAtivoGrafico('Logótipo: ${escapeHtml(p.nome)}', '${p.logo_url}', 'Ficheiro de Logótipo Oficial')" title="Ver Logótipo Oficial" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin: 2px;">🖼️ Logo</button>`);
            }
            if (p.pavilhao_img_url) {
                ativosBtns.push(`<button type="button" onclick="window.previewAtivoGrafico('Painel Pavilhão: ${escapeHtml(p.nome)}', '${p.pavilhao_img_url}', 'Foto / Maquete do Painel Publicitário no Pavilhão')" title="Ver Painel no Pavilhão" style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; color: #9a3412; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin: 2px;">🏟️ Painel</button>`);
            }
            if (p.redes_img_url) {
                ativosBtns.push(`<button type="button" onclick="window.previewAtivoGrafico('Post Redes Sociais: ${escapeHtml(p.nome)}', '${p.redes_img_url}', 'Arte Gráfica preparada para Facebook e Instagram')" title="Ver Arte para Redes" style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; color: #1e40af; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin: 2px;">📱 Post FB/IG</button>`);
            }
            const ativosHtml = ativosBtns.length > 0 ? ativosBtns.join('') : '<span style="color: #94a3b8; font-size: 0.75rem;">Sem ficheiros</span>';

            // Contacto
            let contactoHtml = '<span style="color: #94a3b8; font-size: 0.8rem;">-</span>';
            if (p.contacto_nome || p.contacto_telefone || p.contacto_email) {
                contactoHtml = `
                    <div style="font-size: 0.82rem; line-height: 1.4;">
                        ${p.contacto_nome ? `<strong>${escapeHtml(p.contacto_nome)}</strong><br>` : ''}
                        ${p.contacto_telefone ? `<span style="color: var(--text-secondary);">📞 ${escapeHtml(p.contacto_telefone)}</span><br>` : ''}
                        ${p.contacto_email ? `<span style="color: var(--text-secondary);">✉️ ${escapeHtml(p.contacto_email)}</span>` : ''}
                    </div>
                `;
            }

            return `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;">
                    <!-- Logo -->
                    <td style="padding: 10px; text-align: center;">
                        ${p.logo_url ? `
                            <img src="${p.logo_url}" alt="${escapeHtml(p.nome)}" onclick="window.previewAtivoGrafico('Logótipo: ${escapeHtml(p.nome)}', '${p.logo_url}', 'Logótipo Oficial')" style="width: 44px; height: 44px; object-fit: contain; background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 3px; cursor: pointer;">
                        ` : `
                            <div style="width: 44px; height: 44px; background: #f1f5f9; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #94a3b8;">🏢</div>
                        `}
                    </td>

                    <!-- Nome & Website -->
                    <td style="padding: 10px;">
                        <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(p.nome)}</strong>
                        ${p.website ? `
                            <br><a href="${p.website}" target="_blank" style="font-size: 0.78rem; color: #7e22ce; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;">🔗 ${escapeHtml(p.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>
                        ` : ''}
                        ${p.valor > 0 ? `
                            <div style="font-size: 0.75rem; color: #16a34a; font-weight: 700; margin-top: 3px;">💶 ${parseFloat(p.valor).toFixed(2)}€</div>
                        ` : ''}
                    </td>

                    <!-- Categoria -->
                    <td style="padding: 10px;">
                        <span style="background: ${catStyle.bg}; color: ${catStyle.text}; border: 1px solid ${catStyle.border}; font-size: 0.78rem; font-weight: 700; padding: 4px 9px; border-radius: 6px; display: inline-block;">
                            ${escapeHtml(p.categoria || 'Oficial')}
                        </span>
                    </td>

                    <!-- Época -->
                    <td style="padding: 10px;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">${escapeHtml(p.epoca || '-')}</span>
                    </td>

                    <!-- Canais -->
                    <td style="padding: 10px; max-width: 170px;">
                        ${canaisHtml}
                    </td>

                    <!-- Ativos Gráficos -->
                    <td style="padding: 10px;">
                        ${ativosHtml}
                    </td>

                    <!-- Contacto -->
                    <td style="padding: 10px;">
                        ${contactoHtml}
                    </td>

                    <!-- Estado -->
                    <td style="padding: 10px; text-align: center;">
                        <button type="button" onclick="window.togglePatrocinadorAtivo(${p.id}, ${!!p.ativo})" title="Clique para alternar estado" style="background: ${p.ativo ? '#dcfce7' : '#fee2e2'}; color: ${p.ativo ? '#15803d' : '#b91c1c'}; border: 1px solid ${p.ativo ? '#86efac' : '#fca5a5'}; border-radius: 20px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                            ${p.ativo ? '● Ativo' : '○ Inativo'}
                        </button>
                    </td>

                    <!-- Ações -->
                    <td style="padding: 10px; text-align: right; white-space: nowrap;">
                        <button type="button" onclick="window.editPatrocinador(${p.id})" title="Editar Patrocinador" class="btn-secondary" style="padding: 6px 10px; font-size: 0.8rem; margin-right: 4px;">
                            ✏️ Editar
                        </button>
                        <button type="button" onclick="window.deletePatrocinador(${p.id})" title="Eliminar Patrocinador" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; cursor: pointer;">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

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

            if (target === 'tab-noticias') loadNoticiasAdmin();
            if (target === 'tab-agenda') loadAgenda();
            if (target === 'tab-resultados') loadResultados();
            if (target === 'tab-equipas') loadEquipas();
            if (target === 'tab-patrocinadores') loadPatrocinadores();
            if (target === 'tab-config') loadConfiguracoes();
            if (target === 'tab-equipamentos') loadEquipamentos();
            if (target === 'tab-desportiva') loadDesportiva();
            if (target === 'tab-financeira') loadFinanceira();
        });
    });

    // Iniciar
    checkSession();
});
