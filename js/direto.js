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
                    liveBadge.style.background = '#16a34a';
                    liveBadge.style.boxShadow = '0 0 16px rgba(22, 163, 74, 0.5)';
                    liveStatusText.textContent = 'AO VIVO (EM DIRETO)';
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
                document.title = `🟢 AO VIVO • ${config.titulo || 'BCV TV'} | BCV`;
            } else {
                if (liveBadge) {
                    liveBadge.className = 'direto-badge is-offline';
                    liveBadge.style.background = '#dc2626';
                    liveBadge.style.color = '#ffffff';
                    liveBadge.style.boxShadow = '0 0 10px rgba(220, 38, 38, 0.35)';
                    liveStatusText.textContent = 'AO VIVO';
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

        } catch (err) {
            console.warn("Aviso ao carregar dados do direto:", err);
            if (videoIframe) {
                videoIframe.src = `https://www.youtube.com/embed/live_stream?channel=${DEFAULT_CHANNEL_ID}&autoplay=1`;
            }
        }
    }
});
