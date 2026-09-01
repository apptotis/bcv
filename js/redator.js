// ====================================================================
// PORTAL DO REDATOR DE NOTÍCIAS (MOBILE-FIRST)
// Basket Clube de Valença (BCV)
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    let supabase = null;
    let currentUser = null;
    let userProfile = null;
    let currentNoticias = [];
    let currentFilterStatus = 'todos'; // 'todos', 'publicadas', 'rascunhos'

    // Elementos DOM
    const loginContainer = document.getElementById('login-container');
    const appMain = document.getElementById('app-main');
    const formLogin = document.getElementById('form-login-redator');
    const loginEmailInput = document.getElementById('login-email');
    const loginPassInput = document.getElementById('login-password');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const btnLogin = document.getElementById('btn-login');

    const headerUserName = document.getElementById('header-user-name');
    const drawerUserName = document.getElementById('drawer-user-name');

    // Abas e Drawer
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerItems = document.querySelectorAll('.drawer-item');
    const btnDrawerLogout = document.getElementById('btn-drawer-logout');
    const tabContents = document.querySelectorAll('.tab-content');

    // Lista de Notícias
    const btnIrCriarNoticia = document.getElementById('btn-ir-criar-noticia');
    const drawerBtnNovaNoticia = document.getElementById('drawer-btn-nova-noticia');
    const filtroNoticias = document.getElementById('filtro-noticias');
    const filterPills = document.querySelectorAll('.filter-pill');
    const listaNoticiasContainer = document.getElementById('lista-noticias-container');
    const countTotal = document.getElementById('count-total');
    const countPub = document.getElementById('count-pub');
    const countDraft = document.getElementById('count-draft');

    // Formulário de Notícia
    const formNoticia = document.getElementById('form-noticia');
    const formNoticiaTituloCabecalho = document.getElementById('form-noticia-titulo-cabecalho');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
    const noticiaIdInput = document.getElementById('noticia-id');
    const noticiaTituloInput = document.getElementById('noticia-titulo');
    const noticiaSubtituloInput = document.getElementById('noticia-subtitulo');
    const noticiaCategoriaSelect = document.getElementById('noticia-categoria');
    const noticiaDataInput = document.getElementById('noticia-data');
    const noticiaFileInput = document.getElementById('noticia-file-img');
    const noticiaUrlInput = document.getElementById('noticia-url-img');
    const noticiaDestaqueInput = document.getElementById('noticia-destaque');
    const noticiaConteudoInput = document.getElementById('noticia-conteudo');
    const noticiaAutorInput = document.getElementById('noticia-autor');
    const formFeedbackMsg = document.getElementById('form-feedback-msg');
    const btnPublicar = document.getElementById('btn-publicar-noticia');
    const btnSalvarRascunho = document.getElementById('btn-salvar-rascunho');

    // Preview de Imagem
    const previewPlaceholderText = document.getElementById('preview-placeholder-text');
    const previewImgElement = document.getElementById('preview-img-element');

    // Modal Preview
    const modalNoticiaPreview = document.getElementById('modal-noticia-preview');
    const modalPrevCat = document.getElementById('modal-prev-cat');
    const modalPrevImg = document.getElementById('modal-prev-img');
    const modalPrevTitle = document.getElementById('modal-prev-title');
    const modalPrevMeta = document.getElementById('modal-prev-meta');
    const modalPrevBody = document.getElementById('modal-prev-body');

    // 1. Inicializar Supabase
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

    // Definir data de hoje
    const hojeIso = new Date().toISOString().split('T')[0];
    if (noticiaDataInput) noticiaDataInput.value = hojeIso;

    // 2. Gestão de Sessão & Login
    async function checkSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                showLogin();
                return;
            }

            currentUser = session.user;

            // Carregar perfil
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            userProfile = profile || {
                nome: currentUser.user_metadata?.nome || currentUser.email.split('@')[0],
                role: 'redator'
            };

            showApp();
            await loadNoticias();

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

        const nome = userProfile.nome || 'Redator BCV';
        if (headerUserName) headerUserName.textContent = nome;
        if (drawerUserName) drawerUserName.textContent = nome;
        if (noticiaAutorInput && !noticiaAutorInput.value) noticiaAutorInput.value = nome;
    }

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput.value.trim();
            const password = loginPassInput.value.trim();

            if (!email || !password) return;

            if (loginErrorMsg) loginErrorMsg.style.display = 'none';
            if (btnLogin) {
                btnLogin.disabled = true;
                btnLogin.textContent = 'A autenticar...';
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                await checkSession();
            } catch (err) {
                console.error("Erro no login:", err);
                if (loginErrorMsg) {
                    loginErrorMsg.textContent = 'Credenciais incorretas ou acesso não autorizado.';
                    loginErrorMsg.style.display = 'block';
                }
            } finally {
                if (btnLogin) {
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Entrar no Portal';
                }
            }
        });
    }

    async function handleLogout() {
        if (!confirm('Deseja realmente terminar a sessão?')) return;
        try {
            await supabase.auth.signOut();
            currentUser = null;
            userProfile = null;
            showLogin();
        } catch (e) {
            console.error("Erro no logout:", e);
            location.reload();
        }
    }

    if (btnDrawerLogout) btnDrawerLogout.addEventListener('click', handleLogout);

    // 3. Gestão do Drawer Mobile e Abas
    function openDrawer() {
        if (drawerOverlay) drawerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        if (drawerOverlay) drawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', (e) => {
            if (e.target === drawerOverlay) closeDrawer();
        });
    }

    function switchTab(targetTabId) {
        drawerItems.forEach(i => {
            if (i.getAttribute('data-tab') === targetTabId) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });

        tabContents.forEach(tab => tab.classList.remove('active'));
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) targetTab.classList.add('active');

        closeDrawer();

        if (targetTabId === 'tab-lista-noticias') {
            loadNoticias();
        }
    }

    drawerItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTabId = item.getAttribute('data-tab');
            if (targetTabId) switchTab(targetTabId);
        });
    });

    if (btnIrCriarNoticia) {
        btnIrCriarNoticia.addEventListener('click', () => {
            resetNoticiaForm();
            switchTab('tab-criar-noticia');
        });
    }

    // 4. Carregamento de Notícias da Base de Dados
    async function loadNoticias() {
        if (!listaNoticiasContainer) return;
        listaNoticiasContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">A carregar notícias...</div>';

        try {
            const { data, error } = await supabase
                .from('noticias')
                .select('*')
                .order('data_publicacao', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    listaNoticiasContainer.innerHTML = `
                        <div style="background: white; border-radius: 12px; padding: 30px 20px; text-align: center; border: 1px dashed var(--border);">
                            <span style="font-size: 2rem;">⚠️</span>
                            <h3 style="margin-top: 10px; font-size: 1rem; color: var(--text-main);">Tabela 'noticias' não encontrada</h3>
                            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Por favor, execute o script <code>setup_noticias.sql</code> no Supabase.</p>
                        </div>
                    `;
                    return;
                }
                throw error;
            }

            currentNoticias = data || [];
            updateCounts();
            renderNoticiasList();

        } catch (err) {
            console.error("Erro ao carregar notícias:", err);
            listaNoticiasContainer.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">Erro: ${err.message}</div>`;
        }
    }

    function updateCounts() {
        const total = currentNoticias.length;
        const pub = currentNoticias.filter(n => n.publicada === true).length;
        const draft = total - pub;

        if (countTotal) countTotal.textContent = total;
        if (countPub) countPub.textContent = pub;
        if (countDraft) countDraft.textContent = draft;
    }

    function renderNoticiasList() {
        if (!listaNoticiasContainer) return;

        const termo = (filtroNoticias?.value || '').toLowerCase().trim();

        const filtradas = currentNoticias.filter(n => {
            // Filtro de status
            if (currentFilterStatus === 'publicadas' && !n.publicada) return false;
            if (currentFilterStatus === 'rascunhos' && n.publicada) return false;

            // Filtro de pesquisa
            if (termo) {
                const tit = (n.titulo || '').toLowerCase();
                const cat = (n.categoria || '').toLowerCase();
                const sub = (n.subtitulo || '').toLowerCase();
                return tit.includes(termo) || cat.includes(termo) || sub.includes(termo);
            }
            return true;
        });

        if (filtradas.length === 0) {
            listaNoticiasContainer.innerHTML = `
                <div style="background: white; border-radius: 12px; padding: 35px 20px; text-align: center; border: 1px dashed var(--border);">
                    <span style="font-size: 2.2rem;">📰</span>
                    <h3 style="margin-top: 10px; font-size: 1rem; color: var(--text-main);">Nenhuma notícia encontrada</h3>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">Clica em "Escrever Nova Notícia" para criar o teu primeiro artigo.</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtradas.forEach(n => {
            const dataFmt = n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString('pt-PT') : 'Sem data';
            const statusBadge = n.publicada 
                ? `<span class="badge-status-published">🟢 Publicada</span>` 
                : `<span class="badge-status-draft">🟡 Rascunho</span>`;
            
            const destaqueBadge = n.destaque 
                ? `<span style="background: rgba(245, 158, 11, 0.15); color: #b45309; font-size: 0.72rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">⭐ Destaque</span>` 
                : '';

            const imgHtml = n.imagem_url 
                ? `<img src="${n.imagem_url}" class="news-card-img" alt="${n.titulo}">` 
                : `<div class="news-card-img" style="display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.8rem;">🏀</div>`;

            html += `
                <div class="news-card-mobile" id="news-card-${n.id}">
                    ${imgHtml}
                    <div class="news-card-body">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <span class="badge-category">${n.categoria || 'Clube'}</span>
                                ${destaqueBadge}
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${dataFmt}</span>
                        </div>

                        <h3 class="news-card-title">${n.titulo}</h3>
                        ${n.subtitulo ? `<p class="news-card-desc">${n.subtitulo}</p>` : ''}

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            ${statusBadge}
                            <span style="font-size: 0.75rem; color: var(--text-muted);">✍️ ${n.autor || 'BCV'}</span>
                        </div>

                        <div class="news-actions-row">
                            <button type="button" onclick="window.previewNoticia(${n.id})" title="Visualizar Artigo">
                                <span>👁️</span> Ver
                            </button>
                            <button type="button" onclick="window.editNoticia(${n.id})" title="Editar Notícia">
                                <span>✏️</span> Editar
                            </button>
                            <button type="button" onclick="window.togglePublishNoticia(${n.id}, ${!n.publicada})" style="${n.publicada ? 'color: #d97706;' : 'color: #059669;'}">
                                <span>${n.publicada ? '⏸️' : '🚀'}</span> ${n.publicada ? 'Despublicar' : 'Publicar'}
                            </button>
                            <button type="button" onclick="window.deleteNoticia(${n.id})" style="color: #dc2626;" title="Eliminar">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        listaNoticiasContainer.innerHTML = html;
    }

    // Filtros por Pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilterStatus = pill.getAttribute('data-status');
            renderNoticiasList();
        });
    });

    if (filtroNoticias) {
        filtroNoticias.addEventListener('input', renderNoticiasList);
    }

    // 5. Gestão de Imagens e Preview
    function updateImagePreview(src) {
        if (src && src.trim() !== '') {
            previewImgElement.src = src;
            previewImgElement.style.display = 'block';
            previewPlaceholderText.style.display = 'none';
        } else {
            previewImgElement.src = '';
            previewImgElement.style.display = 'none';
            previewPlaceholderText.style.display = 'block';
        }
    }

    if (noticiaUrlInput) {
        noticiaUrlInput.addEventListener('input', () => {
            updateImagePreview(noticiaUrlInput.value);
        });
    }

    if (noticiaFileInput) {
        noticiaFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Converter para base64 data URL para preview imediato
            const reader = new FileReader();
            reader.onload = (event) => {
                updateImagePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // Helper para fazer upload de imagem para o Supabase Storage ou usar URL
    async function resolveImageUrl() {
        if (noticiaFileInput && noticiaFileInput.files && noticiaFileInput.files.length > 0) {
            const file = noticiaFileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `noticia_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `noticias/${fileName}`;

            try {
                // Tentar upload para bucket 'noticias' ou 'galeria'
                let { error: uploadError } = await supabase.storage
                    .from('noticias')
                    .upload(filePath, file);

                if (uploadError) {
                    // Fallback para bucket 'galeria'
                    const { error: galeriaErr } = await supabase.storage
                        .from('galeria')
                        .upload(filePath, file);

                    if (galeriaErr) {
                        console.warn("Storage upload falhou, a usar base64 ou URL:", uploadError);
                        return previewImgElement.src; // Retorna data URL
                    } else {
                        const { data: urlData } = supabase.storage.from('galeria').getPublicUrl(filePath);
                        return urlData.publicUrl;
                    }
                } else {
                    const { data: urlData } = supabase.storage.from('noticias').getPublicUrl(filePath);
                    return urlData.publicUrl;
                }
            } catch (err) {
                console.warn("Erro ao fazer upload para storage:", err);
                return previewImgElement.src;
            }
        }

        return noticiaUrlInput.value.trim() || previewImgElement.src || '';
    }

    // 6. Criar / Editar Notícia
    async function saveNoticia(publicarStatus) {
        const titulo = noticiaTituloInput.value.trim();
        const conteudo = noticiaConteudoInput.value.trim();

        if (!titulo || !conteudo) {
            alert('Por favor, preenche pelo menos o Título e o Conteúdo da notícia.');
            return;
        }

        if (formFeedbackMsg) {
            formFeedbackMsg.textContent = 'A processar e a guardar notícia...';
            formFeedbackMsg.style.display = 'block';
            formFeedbackMsg.style.background = 'rgba(126, 34, 206, 0.1)';
            formFeedbackMsg.style.color = 'var(--primary)';
        }

        if (btnPublicar) btnPublicar.disabled = true;
        if (btnSalvarRascunho) btnSalvarRascunho.disabled = true;

        try {
            const finalImgUrl = await resolveImageUrl();
            const id = noticiaIdInput.value ? Number(noticiaIdInput.value) : null;

            const payload = {
                titulo: titulo,
                subtitulo: noticiaSubtituloInput.value.trim() || null,
                categoria: noticiaCategoriaSelect.value || 'Clube',
                data_publicacao: noticiaDataInput.value || hojeIso,
                conteudo: conteudo,
                imagem_url: finalImgUrl || null,
                destaque: noticiaDestaqueInput.checked,
                publicada: publicarStatus,
                autor: noticiaAutorInput.value.trim() || userProfile.nome || 'BCV Comunicação',
                updated_at: new Date()
            };

            let err = null;
            if (id) {
                const { error } = await supabase
                    .from('noticias')
                    .update(payload)
                    .eq('id', id);
                err = error;
            } else {
                const { error } = await supabase
                    .from('noticias')
                    .insert([payload]);
                err = error;
            }

            if (err) throw err;

            if (formFeedbackMsg) {
                formFeedbackMsg.textContent = publicarStatus 
                    ? '✅ Notícia Publicada com Sucesso no Site!' 
                    : '✅ Rascunho Guardado com Sucesso!';
                formFeedbackMsg.style.background = 'rgba(16, 185, 129, 0.15)';
                formFeedbackMsg.style.color = '#059669';
            }

            setTimeout(() => {
                resetNoticiaForm();
                switchTab('tab-lista-noticias');
            }, 1200);

        } catch (error) {
            console.error("Erro ao guardar notícia:", error);
            if (formFeedbackMsg) {
                formFeedbackMsg.textContent = '❌ Erro ao guardar: ' + error.message;
                formFeedbackMsg.style.background = 'rgba(239, 68, 68, 0.15)';
                formFeedbackMsg.style.color = '#dc2626';
            }
        } finally {
            if (btnPublicar) btnPublicar.disabled = false;
            if (btnSalvarRascunho) btnSalvarRascunho.disabled = false;
        }
    }

    if (formNoticia) {
        formNoticia.addEventListener('submit', (e) => {
            e.preventDefault();
            saveNoticia(true); // Publicar
        });
    }

    if (btnSalvarRascunho) {
        btnSalvarRascunho.addEventListener('click', () => {
            saveNoticia(false); // Rascunho
        });
    }

    function resetNoticiaForm() {
        if (formNoticia) formNoticia.reset();
        if (noticiaIdInput) noticiaIdInput.value = '';
        if (formNoticiaTituloCabecalho) formNoticiaTituloCabecalho.textContent = 'Nova Notícia';
        if (btnCancelarEdicao) btnCancelarEdicao.style.display = 'none';
        if (noticiaDataInput) noticiaDataInput.value = hojeIso;
        if (noticiaAutorInput) noticiaAutorInput.value = userProfile?.nome || 'BCV Comunicação';
        if (formFeedbackMsg) formFeedbackMsg.style.display = 'none';
        updateImagePreview('');
    }

    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener('click', () => {
            resetNoticiaForm();
            switchTab('tab-lista-noticias');
        });
    }

    // 7. Funções Globais de Notícia (Editar, Alternar Estado, Eliminar, Preview)
    window.editNoticia = function(id) {
        const n = currentNoticias.find(item => item.id === id);
        if (!n) return;

        noticiaIdInput.value = n.id;
        noticiaTituloInput.value = n.titulo || '';
        noticiaSubtituloInput.value = n.subtitulo || '';
        noticiaCategoriaSelect.value = n.categoria || 'Clube';
        noticiaDataInput.value = n.data_publicacao || hojeIso;
        noticiaUrlInput.value = n.imagem_url || '';
        noticiaDestaqueInput.checked = !!n.destaque;
        noticiaConteudoInput.value = n.conteudo || '';
        noticiaAutorInput.value = n.autor || userProfile?.nome || '';

        updateImagePreview(n.imagem_url || '');

        formNoticiaTituloCabecalho.textContent = `Editar Notícia #${n.id}`;
        btnCancelarEdicao.style.display = 'block';

        switchTab('tab-criar-noticia');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.togglePublishNoticia = async function(id, novoEstado) {
        try {
            const { error } = await supabase
                .from('noticias')
                .update({ publicada: novoEstado, updated_at: new Date() })
                .eq('id', id);

            if (error) throw error;

            await loadNoticias();
        } catch (err) {
            console.error("Erro ao alterar estado:", err);
            alert("Erro: " + err.message);
        }
    };

    window.deleteNoticia = async function(id) {
        if (!confirm('Tens a certeza absoluta que desejas eliminar esta notícia?')) return;

        try {
            const { error } = await supabase
                .from('noticias')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loadNoticias();
        } catch (err) {
            console.error("Erro ao eliminar notícia:", err);
            alert("Erro ao eliminar: " + err.message);
        }
    };

    window.previewNoticia = function(id) {
        const n = currentNoticias.find(item => item.id === id);
        if (!n) return;

        if (modalPrevCat) modalPrevCat.textContent = n.categoria || 'Clube';
        if (modalPrevTitle) modalPrevTitle.textContent = n.titulo || '';
        
        const dataFmt = n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString('pt-PT') : '';
        if (modalPrevMeta) modalPrevMeta.textContent = `Publicado a ${dataFmt} • por ${n.autor || 'BCV'}`;
        
        if (modalPrevImg) {
            if (n.imagem_url) {
                modalPrevImg.src = n.imagem_url;
                modalPrevImg.style.display = 'block';
            } else {
                modalPrevImg.style.display = 'none';
            }
        }

        if (modalPrevBody) {
            modalPrevBody.textContent = n.conteudo || '';
        }

        if (modalNoticiaPreview) modalNoticiaPreview.classList.add('active');
    };

    window.closeNewsPreviewModal = function() {
        if (modalNoticiaPreview) modalNoticiaPreview.classList.remove('active');
    };

    // Inicialização
    checkSession();
});
