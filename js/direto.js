/**
 * direto.js - Gestão e Renderização Dinâmica da Transmissão ao Vivo (BCV TV)
 * Basket Clube de Valença
 */

document.addEventListener('DOMContentLoaded', async () => {
    const DEFAULT_CHANNEL_ID = 'UCEQdDGlXUdcHK5Ym5jqFQUg';
    const YOUTUBE_HANDLE_URL = 'https://www.youtube.com/@BCValenca';

    const liveBadge = document.getElementById('live-status-badge');
    const liveStatusText = document.getElementById('live-status-text');
    const liveCompBadge = document.getElementById('live-comp-badge');
    const liveGameTitle = document.getElementById('live-game-title');
    const liveDescText = document.getElementById('live-desc-text');
    const liveVenueText = document.getElementById('live-venue-text');
    const videoIframe = document.getElementById('youtube-live-iframe');
    const btnOpenYt = document.getElementById('btn-open-youtube');
    const btnShareWa = document.getElementById('btn-share-whatsapp');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnToggleChat = document.getElementById('btn-toggle-chat');
    const chatPanel = document.getElementById('direto-chat-panel');
    const chatIframe = document.getElementById('youtube-chat-iframe');
    const agendaListContainer = document.getElementById('direto-agenda-list');

    let currentVideoId = null;

    // Helper para converter URL de YouTube em Embed Seguro
    function obterEmbedUrl(urlOuId) {
        if (!urlOuId || !urlOuId.trim()) {
            return `https://www.youtube.com/embed/live_stream?channel=${DEFAULT_CHANNEL_ID}&autoplay=1`;
        }
        const val = urlOuId.trim();
        if (val.includes('embed/')) return val;

        // Procura por watch?v=ID ou live/ID ou youtu.be/ID
        const match = val.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
            currentVideoId = match[1];
            return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
        }
        if (/^[a-zA-Z0-9_-]{11}$/.test(val)) {
            currentVideoId = val;
            return `https://www.youtube.com/embed/${val}?autoplay=1&rel=0`;
        }
        return `https://www.youtube.com/embed/live_stream?channel=${DEFAULT_CHANNEL_ID}&autoplay=1`;
    }

    // Configurar Botão Copiar Link
    if (btnCopyLink) {
        btnCopyLink.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalHtml = btnCopyLink.innerHTML;
                btnCopyLink.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i> <span>Copiado!</span>';
                setTimeout(() => {
                    btnCopyLink.innerHTML = originalHtml;
                }, 2000);
            }).catch(() => {
                prompt("Copie o link:", window.location.href);
            });
        });
    }

    // Inicializar Supabase e Carregar Configurações
    let supabase = null;
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (supabase) {
        try {
            // 1. Carregar configuração de direto da tabela clube_config
            const { data: configRow, error } = await supabase
                .from('clube_config')
                .select('dados')
                .eq('chave', 'transmissao_direto')
                .maybeSingle();

            const config = configRow?.dados || {
                ativo: false,
                titulo: "Basket Clube de Valença • Canal Oficial YouTube",
                competicao: "Federação Portuguesa de Basquetebol",
                video_url: "",
                descricao: "Transmissões dos jogos oficiais do Basket Clube de Valença.",
                mostrar_chat: true
            };

            const isLive = config.ativo === true;
            const embedSrc = obterEmbedUrl(config.video_url);

            if (videoIframe) {
                videoIframe.src = embedSrc;
            }

            if (isLive) {
                if (liveBadge) {
                    liveBadge.className = 'direto-badge is-live';
                    liveStatusText.textContent = 'EM DIRETO AGORA';
                }
                if (liveGameTitle && config.titulo) {
                    liveGameTitle.textContent = config.titulo;
                }
                if (liveCompBadge && config.competicao) {
                    liveCompBadge.textContent = `🏆 ${config.competicao}`;
                }
                if (liveDescText && config.descricao) {
                    liveDescText.textContent = config.descricao;
                }
                document.title = `🔴 EM DIRETO • ${config.titulo || 'BCV TV'} | BCV`;
            } else {
                if (liveBadge) {
                    liveBadge.className = 'direto-badge is-standby';
                    liveStatusText.textContent = 'CANAL OFICIAL • BCV TV';
                }
                if (liveGameTitle) {
                    liveGameTitle.textContent = config.titulo || "Basket Clube de Valença • Canal Oficial YouTube";
                }
                if (liveDescText) {
                    liveDescText.textContent = config.descricao || "Acompanha os jogos oficiais e o basquetebol do clube.";
                }
            }

            // Configurar Link Direto do YouTube
            if (btnOpenYt) {
                if (config.video_url && config.video_url.startsWith('http')) {
                    btnOpenYt.href = config.video_url;
                } else if (currentVideoId) {
                    btnOpenYt.href = `https://www.youtube.com/watch?v=${currentVideoId}`;
                } else {
                    btnOpenYt.href = YOUTUBE_HANDLE_URL;
                }
            }

            // Configurar Botão Partilha WhatsApp
            if (btnShareWa) {
                const shareText = isLive 
                    ? `🏀 Acompanha AGORA em direto o jogo do BC Valença: ${config.titulo || ''}!\nAssiste aqui: ${window.location.href}`
                    : `🏀 Assiste às transmissões em direto do Basket Clube de Valença (BCV TV): ${window.location.href}`;
                btnShareWa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
            }

            // Configurar Chat ao Vivo
            if (btnToggleChat && chatPanel && chatIframe) {
                if (currentVideoId && config.mostrar_chat !== false) {
                    btnToggleChat.style.display = 'inline-flex';
                    btnToggleChat.addEventListener('click', () => {
                        const isHidden = chatPanel.style.display === 'none';
                        if (isHidden) {
                            chatPanel.style.display = 'block';
                            btnToggleChat.classList.add('active');
                            if (!chatIframe.src || chatIframe.src === window.location.href) {
                                const domain = window.location.hostname || 'bcvalenca.pt';
                                chatIframe.src = `https://www.youtube.com/live_chat?v=${currentVideoId}&embed_domain=${domain}`;
                            }
                        } else {
                            chatPanel.style.display = 'none';
                            btnToggleChat.classList.remove('active');
                        }
                    });
                } else {
                    btnToggleChat.style.display = 'none';
                }
            }

            // 2. Carregar Próximos Jogos da Agenda para a página de Direto
            await carregarProximosJogosAgenda(supabase);

        } catch (err) {
            console.warn("Aviso ao carregar dados do direto:", err);
            if (videoIframe) {
                videoIframe.src = `https://www.youtube.com/embed/live_stream?channel=${DEFAULT_CHANNEL_ID}&autoplay=1`;
            }
        }
    }

    // Carregar Próximos Jogos da Agenda
    async function carregarProximosJogosAgenda(sb) {
        if (!agendaListContainer) return;

        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            const hojeStr = `${ano}-${mes}-${dia}`;

            const { data: jogos, error } = await sb
                .from('agenda_bcv')
                .select('*')
                .gte('data_jogo', hojeStr)
                .order('data_jogo', { ascending: true })
                .limit(6);

            if (error || !jogos || jogos.length === 0) {
                agendaListContainer.innerHTML = `
                    <div style="background: #ffffff; border: 1px dashed var(--border-color); border-radius: 12px; padding: 24px; text-align: center; color: var(--text-secondary);">
                        <i class="fas fa-calendar-check" style="font-size: 2rem; color: #a855f7; margin-bottom: 8px; display: block;"></i>
                        <h4 style="color: var(--text-primary); margin: 0 0 4px 0;">Não há jogos agendados para os próximos dias</h4>
                        <p style="font-size: 0.85rem; margin: 0;">Consulta o separador <a href="competicoes.html" style="color: #7e22ce; font-weight: 700;">Competições</a> para ver o calendário oficial completo.</p>
                    </div>
                `;
                return;
            }

            agendaListContainer.innerHTML = '';
            jogos.forEach(jogo => {
                const item = document.createElement('div');
                item.className = 'game-schedule-item';
                item.style.background = '#ffffff';
                item.style.borderRadius = '12px';
                item.style.padding = '14px 18px';
                item.style.border = '1px solid var(--border-color)';
                item.style.boxShadow = 'var(--shadow-sm)';

                const dataFmt = formatarData(jogo.data_jogo);
                const horaFmt = jogo.hora_jogo ? jogo.hora_jogo.substring(0, 5) : 'A definir';
                const escTag = jogo.escalao || 'BCV';
                const localStr = jogo.local_jogo || 'Pavilhão Municipal de Valença';
                const linkMaps = window.gerarLinkGoogleMaps ? window.gerarLinkGoogleMaps(localStr, jogo.google_maps_url) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localStr)}`;

                const logoCasa = window.obterLogoEquipa ? window.obterLogoEquipa(jogo.equipa_casa, jogo.logo_casa) : '';
                const logoFora = window.obterLogoEquipa ? window.obterLogoEquipa(jogo.equipa_fora, jogo.logo_fora) : '';

                const isCasaBCV = /valen[cç]a|bcv/i.test(jogo.equipa_casa || '');
                const isForaBCV = /valen[cç]a|bcv/i.test(jogo.equipa_fora || '');

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.82rem; color: var(--text-secondary); flex-wrap: wrap; gap: 6px;">
                        <span style="font-weight: 700; color: #7e22ce; background: rgba(126,34,206,0.08); padding: 2px 8px; border-radius: 4px;">
                            ${escTag}
                        </span>
                        <span>📅 ${dataFmt} • <strong>${horaFmt}</strong></span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                        <div style="flex: 1; display: flex; align-items: center; gap: 8px; font-weight: ${isCasaBCV ? '800' : '600'}; color: ${isCasaBCV ? '#7e22ce' : '#1e293b'};">
                            ${logoCasa ? `<img src="${logoCasa}" alt="" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">` : ''}
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${jogo.equipa_casa}</span>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 800; color: #94a3b8; padding: 2px 8px; background: #f8fafc; border-radius: 4px;">VS</span>
                        <div style="flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-weight: ${isForaBCV ? '800' : '600'}; color: ${isForaBCV ? '#7e22ce' : '#1e293b'};">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${jogo.equipa_fora}</span>
                            ${logoFora ? `<img src="${logoFora}" alt="" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">` : ''}
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px;">
                        <span style="color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">
                            📍 ${localStr}
                        </span>
                        <a href="${linkMaps}" target="_blank" rel="noopener noreferrer" style="color: #7e22ce; font-weight: 700; text-decoration: none;">
                            Ver Mapa ↗
                        </a>
                    </div>
                `;
                agendaListContainer.appendChild(item);
            });

        } catch (e) {
            console.warn("Erro ao renderizar agenda na página de direto:", e);
        }
    }

    function formatarData(dataStr) {
        if (!dataStr) return '';
        try {
            const parts = dataStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
            }
            return new Date(dataStr).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch (e) {
            return dataStr;
        }
    }
});
