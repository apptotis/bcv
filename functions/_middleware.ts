// Cloudflare Pages Functions - Middleware para Open Graph e Partilha Social (Facebook, WhatsApp, Twitter, etc.)

interface Env {}

const SUPABASE_URL = 'https://mndbyptvuaqasctphmgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZGJ5cHR2dWFxYXNjdHBobWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODk1MzUsImV4cCI6MjA4NjE2NTUzNX0.kGZJHHJvFetECau1uqTjG0JuiyC12i4XAny8AqdQprw';

// Detectar crawlers e bots de redes sociais que lêem Open Graph
function isSocialCrawler(userAgent: string): boolean {
    const ua = (userAgent || '').toLowerCase();
    return /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|pinterest|applebot|bingbot|googlebot/i.test(ua);
}

function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const { pathname, searchParams } = url;

    // Ignorar ficheiros estáticos (imagens, css, js, fontes, documentos) e rotas de API
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/assets/') ||
        pathname.startsWith('/css/') ||
        pathname.startsWith('/js/') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.webp') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.pdf')
    ) {
        return context.next();
    }

    const isNoticiaPage = pathname === '/noticia.html' || pathname === '/noticia';
    const noticiaId = searchParams.get('id') || searchParams.get('noticia');
    const isHomePage = pathname === '/' || pathname === '/index.html' || pathname === '';

    // Tratar se for página de notícia com ID OU se for a homepage visitada por crawler
    const userAgent = context.request.headers.get('User-Agent') || '';
    const isCrawler = isSocialCrawler(userAgent);

    if ((isNoticiaPage && noticiaId) || searchParams.has('noticia') || (isHomePage && isCrawler)) {
        try {
            let apiUrl = '';
            if (noticiaId) {
                apiUrl = `${SUPABASE_URL}/rest/v1/noticias?id=eq.${encodeURIComponent(noticiaId)}&select=id,titulo,subtitulo,conteudo,imagem_url,categoria`;
            } else {
                // Para a homepage sem ID, buscar a notícia mais recente para ter sempre imagem de alta resolução em destaque
                apiUrl = `${SUPABASE_URL}/rest/v1/noticias?select=id,titulo,subtitulo,conteudo,imagem_url,categoria&order=data_publicacao.desc&limit=1`;
            }

            const dbRes = await fetch(apiUrl, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (dbRes.ok) {
                const noticias = await dbRes.json() as any[];
                if (noticias && noticias.length > 0) {
                    const n = noticias[0];
                    const isSpecificNoticia = Boolean(noticiaId);

                    const titulo = isSpecificNoticia 
                        ? (n.titulo || 'Notícia') 
                        : (n.titulo ? `Basket Clube de Valença | ${n.titulo}` : 'Basket Clube de Valença | Site Oficial');

                    const descricao = n.subtitulo || (n.conteudo ? n.conteudo.substring(0, 160).replace(/\r?\n/g, ' ') + '...' : 'Notícia oficial do Basket Clube de Valença (BCV).');
                    
                    // Imagem de alta resolução
                    let imagemUrl = n.imagem_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&h=630&q=80';
                    if (!imagemUrl.startsWith('http')) {
                        imagemUrl = `https://bcvalenca.pt/${imagemUrl.replace(/^\//, '')}`;
                    }

                    const canonicalUrl = isSpecificNoticia 
                        ? (url.href.includes('?') ? url.href : `https://bcvalenca.pt/noticia.html?id=${n.id}`)
                        : 'https://bcvalenca.pt/';

                    const isPng = imagemUrl.toLowerCase().includes('.png');
                    const imgType = isPng ? 'image/png' : 'image/jpeg';

                    // 1. Se for crawler de redes sociais (Facebook, WhatsApp, Twitter, etc.):
                    // Entregar HTML limpo, rápido e sem redirecionamentos para que o Facebook leia imediatamente a imagem e título
                    if (isCrawler) {
                        const botHtml = `<!DOCTYPE html>
<html lang="pt-PT" prefix="og: https://ogp.me/ns# fb: https://ogp.me/ns/fb# article: https://ogp.me/ns/article#">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(titulo)} | Basket Clube de Valença</title>
    <meta name="description" content="${escapeHtml(descricao)}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Basket Clube de Valença">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(titulo)}">
    <meta property="og:description" content="${escapeHtml(descricao)}">
    <meta property="og:image" content="${escapeHtml(imagemUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imagemUrl)}">
    <meta property="og:image:type" content="${imgType}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(titulo)}">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@bcvalenca">
    <meta name="twitter:title" content="${escapeHtml(titulo)}">
    <meta name="twitter:description" content="${escapeHtml(descricao)}">
    <meta name="twitter:image" content="${escapeHtml(imagemUrl)}">
</head>
<body>
    <h1>${escapeHtml(titulo)}</h1>
    <p>${escapeHtml(descricao)}</p>
    <img src="${escapeHtml(imagemUrl)}" alt="${escapeHtml(titulo)}" width="1200" height="630">
    <p><a href="${canonicalUrl}">Ler artigo completo no Basket Clube de Valença</a></p>
</body>
</html>`;
                        return new Response(botHtml, {
                            headers: {
                                'Content-Type': 'text/html; charset=UTF-8',
                                'Cache-Control': 'public, max-age=600, s-maxage=3600'
                            }
                        });
                    }

                    // 2. Se for um utilizador comum no browser numa página de notícia, injetar as tags dinâmicas no HTML da página
                    if (isSpecificNoticia) {
                        const response = await context.next();
                        
                        class RemoveHandler {
                            element(element: Element) {
                                element.remove();
                            }
                        }

                        class HeadHandler {
                            element(element: Element) {
                                element.append(`
    <!-- Open Graph Dinâmico (Facebook / Redes Sociais) -->
    <title>${escapeHtml(titulo)} | Basket Clube de Valença</title>
    <meta name="description" content="${escapeHtml(descricao)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Basket Clube de Valença">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(titulo)}">
    <meta property="og:description" content="${escapeHtml(descricao)}">
    <meta property="og:image" content="${escapeHtml(imagemUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imagemUrl)}">
    <meta property="og:image:type" content="${imgType}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(titulo)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@bcvalenca">
    <meta name="twitter:title" content="${escapeHtml(titulo)}">
    <meta name="twitter:description" content="${escapeHtml(descricao)}">
    <meta name="twitter:image" content="${escapeHtml(imagemUrl)}">
`, { html: true });
                            }
                        }

                        return new HTMLRewriter()
                            .on('title', new RemoveHandler())
                            .on('meta[property^="og:"]', new RemoveHandler())
                            .on('meta[name^="twitter:"]', new RemoveHandler())
                            .on('meta[name="description"]', new RemoveHandler())
                            .on('head', new HeadHandler())
                            .transform(response);
                    }
                }
            }
        } catch (err) {
            console.error("Erro no middleware de notícia OG:", err);
        }
    }

    return context.next();
};
