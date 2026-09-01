// js/galeria-publica.js

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar o Supabase client a partir das credenciais no config.js
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Elementos DOM
    const gridAlbuns = document.getElementById('public-albuns-grid');
    const viewFotos = document.getElementById('public-photos-view');
    const gridFotos = document.getElementById('public-photos-grid');
    const albumTitle = document.getElementById('public-album-title');

    // Se não estivermos na página com a grelha de álbuns, não faz nada
    if (!gridAlbuns) return;

    // Injetar Slider HTML no fim do body
    const sliderStyles = `
        <style>
        .slider-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: #000; z-index: 9999; display: none; flex-direction: column; color: white;
        }
        .slider-overlay.active { display: flex; }
        .slider-header {
            padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); z-index: 10;
        }
        .btn-close { background: none; border: none; color: white; font-size: 1.8rem; cursor: pointer; padding: 5px 15px; }
        .slider-container {
            flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            scroll-behavior: smooth; -ms-overflow-style: none; scrollbar-width: none;
        }
        .slider-container::-webkit-scrollbar { display: none; }
        .slide {
            min-width: 100%; height: 100%; scroll-snap-align: center; display: flex;
            align-items: center; justify-content: center; position: relative;
        }
        .slide img { max-width: 100%; max-height: 100%; object-fit: contain; user-select: none; }
        .slider-nav {
            position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1);
            border: none; color: white; padding: 20px 15px; font-size: 1.5rem; cursor: pointer; transition: background 0.3s; z-index: 11;
        }
        .slider-nav:hover { background: rgba(255,255,255,0.2); }
        .slider-nav.prev { left: 0; border-radius: 0 5px 5px 0; }
        .slider-nav.next { right: 0; border-radius: 5px 0 0 5px; }
        .slider-footer { padding: 15px; text-align: center; font-size: 0.9rem; opacity: 0.7; background: rgba(0,0,0,0.5); }
        @media (max-width: 768px) { .slider-nav { display: none; } }
        </style>
    `;

    const sliderHTML = `
        ${sliderStyles}
        <div id="slider-overlay" class="slider-overlay">
            <div class="slider-header">
                <h3 id="slider-album-title">Álbum</h3>
                <button class="btn-close" onclick="closeSlider()">&times;</button>
            </div>
            <button class="slider-nav prev" id="slider-btn-prev">❮</button>
            <div class="slider-container" id="slider-container"></div>
            <button class="slider-nav next" id="slider-btn-next">❯</button>
            <div class="slider-footer" id="slider-footer">1 de X</div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', sliderHTML);

    window.currentPublicAlbum = null;
    window.currentPublicPhotoIndex = 0;

    const overlay = document.getElementById('slider-overlay');
    const container = document.getElementById('slider-container');
    const title = document.getElementById('slider-album-title');
    const footer = document.getElementById('slider-footer');

    window.closeSlider = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    function navigateSlider(direction) {
        if (!window.currentPublicAlbum) return;
        const newIndex = window.currentPublicPhotoIndex + direction;
        if (newIndex >= 0 && newIndex < window.currentPublicAlbum.length) {
            window.currentPublicPhotoIndex = newIndex;
            updateSlider();
        }
    }

    function updateSlider() {
        const slides = container.querySelectorAll('.slide');
        if (slides[window.currentPublicPhotoIndex]) {
            slides[window.currentPublicPhotoIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
        footer.textContent = `${window.currentPublicPhotoIndex + 1} de ${window.currentPublicAlbum.length}`;
    }

    document.getElementById('slider-btn-prev')?.addEventListener('click', () => navigateSlider(-1));
    document.getElementById('slider-btn-next')?.addEventListener('click', () => navigateSlider(1));

    document.addEventListener('keydown', (e) => {
        if (overlay.classList.contains('active')) {
            if (e.key === 'ArrowLeft') navigateSlider(-1);
            if (e.key === 'ArrowRight') navigateSlider(1);
            if (e.key === 'Escape') closeSlider();
        }
    });

    // Função para abrir um álbum (direto para slider)
    window.openPublicAlbum = async (id, titulo) => {
        // Mostrar feedback temporário no título ou alert
        const btnTitle = document.querySelector(`.album-title[title="${titulo}"]`);
        const originalText = btnTitle ? btnTitle.textContent : null;
        if (btnTitle) btnTitle.textContent = "A carregar...";

        const { data, error } = await supabaseClient
            .from('fotos_galeria')
            .select('url')
            .eq('album_id', id)
            .order('created_at', { ascending: false });

        if (btnTitle) btnTitle.textContent = originalText;

        if (error) {
            alert('Erro ao carregar fotos: ' + error.message);
            return;
        }

        if (data.length === 0) {
            alert('Este álbum ainda não tem fotos.');
            return;
        }

        window.currentPublicAlbum = data.map(f => f.url);
        window.currentPublicPhotoIndex = 0;
        title.textContent = titulo;
        container.innerHTML = '';

        window.currentPublicAlbum.forEach((foto, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.innerHTML = `<img src="${foto}" alt="Foto ${index + 1}" loading="lazy">`;
            container.appendChild(slide);
        });

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateSlider();
    };

    // Função para carregar os álbuns no início
    async function loadPublicAlbuns() {
        const secGaleria = document.getElementById('galeria');

        try {
            const { data, error } = await supabaseClient
                .from('albuns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data || data.length === 0) {
                if (secGaleria) secGaleria.style.display = 'none';
                return;
            }

            if (secGaleria) secGaleria.style.display = 'block';
            gridAlbuns.innerHTML = '';

            data.forEach(album => {
                const card = document.createElement('div');
                card.className = 'album-card';
                card.onclick = () => openPublicAlbum(album.id, album.titulo);

                const capaHtml = album.capa_url 
                    ? `<div class="album-cover"><img src="${album.capa_url}" alt="${album.titulo}"></div>` 
                    : `<div class="album-cover" style="background: rgba(138,43,226,0.1); display:flex; align-items:center; justify-content:center; font-size:3rem; color:rgba(138,43,226,0.5);">📸</div>`;

                card.innerHTML = `
                    ${capaHtml}
                    <div class="album-info">
                        <h3 class="album-title" title="${album.titulo}">${album.titulo}</h3>
                    </div>
                `;
                gridAlbuns.appendChild(card);
            });
        } catch (err) {
            console.warn("Aviso ao carregar galeria:", err);
            if (secGaleria) secGaleria.style.display = 'none';
        }
    }

    // Iniciar o carregamento
    loadPublicAlbuns();
});
