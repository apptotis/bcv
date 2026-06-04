document.addEventListener('DOMContentLoaded', () => {
    const sections = {
        'historia': document.getElementById('historia'),
        'orgaos-sociais': document.getElementById('orgaos-sociais'),
        'contactos': document.getElementById('contactos')
    };

    function showSection(hash) {
        // Obter ID alvo a partir do hash, ou usar 'historia' como default
        let targetId = hash.replace('#', '');
        if (!sections[targetId]) {
            targetId = 'historia';
        }

        // Esconder todas as secções
        Object.values(sections).forEach(sec => {
            if (sec) sec.style.display = 'none';
        });

        // Mostrar a secção alvo
        if (sections[targetId]) {
            sections[targetId].style.display = 'block';
            
            // Forçar reflow das animações (reveal)
            const reveals = sections[targetId].querySelectorAll('.reveal');
            reveals.forEach(el => el.classList.add('active'));
        }
        
        // Fazer scroll para o topo de forma suave (após mostrar o conteúdo)
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    }

    // 1. Mostrar a secção correta no carregamento inicial
    showSection(window.location.hash);

    // 2. Intercetar cliques nos links para a própria página e fechar o menu
    window.addEventListener('hashchange', () => {
        showSection(window.location.hash);
        
        // Fechar o menu lateral caso esteja aberto (mobile)
        const drawerMenu = document.getElementById('drawer-menu');
        const drawerOverlay = document.getElementById('drawer-overlay');
        
        if (drawerMenu && drawerMenu.classList.contains('active')) {
            drawerMenu.classList.remove('active');
            if (drawerOverlay) drawerOverlay.classList.remove('active');
            
            // Repor o botão de hamburger ao estado normal
            const hamburgerBtn = document.getElementById('hamburger-trigger');
            if (hamburgerBtn) {
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                hamburgerBtn.classList.remove('active');
            }
        }
    });
});
