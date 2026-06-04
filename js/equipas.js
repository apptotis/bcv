document.addEventListener('DOMContentLoaded', async () => {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const grid = document.getElementById('equipas-grid');
    const loading = document.getElementById('equipas-loading');
    const allTeamsView = document.getElementById('all-teams-view');
    const teamDetailView = document.getElementById('team-detail-view');

    if (!grid) return;

    // Voltar para a lista de equipas
    const btnBack = document.getElementById('btn-back-teams');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'equipas.html';
        });
    }

    try {
        let { data: equipas, error: errEquipas } = await supabaseClient
            .from('equipasbcv')
            .select('*')
            .eq('epoca', '2025-2026');

        if (errEquipas) throw errEquipas;

        const ordemEscalao = [
            "Mini 8", "Mini 10", "Mini 12", "Sub-14", "Sub-16", "Sub-18", "Seniores", "Veteranos"
        ];

        if (equipas) {
            equipas.sort((a, b) => {
                let indexA = ordemEscalao.indexOf(a.escalao);
                let indexB = ordemEscalao.indexOf(b.escalao);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                if (indexA === indexB) return a.nome.localeCompare(b.nome);
                return indexA - indexB;
            });
        }

        const urlParams = new URLSearchParams(window.location.search);
        const equipaIdFiltro = urlParams.get('equipaId');

        if (equipaIdFiltro) {
            // ==========================================
            // MODO: DETALHE DE EQUIPA
            // ==========================================
            if (allTeamsView) allTeamsView.style.display = 'none';
            if (teamDetailView) teamDetailView.style.display = 'block';
            
            const equipaSelecionada = equipas.find(e => e.id === equipaIdFiltro);
            
            if (!equipaSelecionada) {
                teamDetailView.innerHTML = '<p>Equipa não encontrada.</p>';
                return;
            }

            let escalaoDisplay = equipaSelecionada.escalao;
            if (equipaSelecionada.sexo && equipaSelecionada.sexo !== 'Todos') {
                escalaoDisplay += ` ${equipaSelecionada.sexo}`;
            }

            // Atualizar cabeçalho da equipa
            document.getElementById('team-detail-title').innerText = equipaSelecionada.nome;
            document.getElementById('team-detail-subtitle').innerText = `${escalaoDisplay} | Época 2025-2026`;
            
            const fotoUrl = equipaSelecionada.foto || 'https://via.placeholder.com/1200x500?text=Sem+Foto';
            document.getElementById('team-detail-photo').innerHTML = `<img src="${fotoUrl}" alt="${equipaSelecionada.nome}">`;

            // Buscar plantel
            const nomeStr = `${equipaSelecionada.nome} (${equipaSelecionada.escalao})`;
            const { data: atletas, error: errAtletas } = await supabaseClient
                .from('atletasbcv')
                .select('*')
                .eq('epoca', '2025-2026')
                .or(`equipabcv1.eq."${nomeStr}",equipabcv2.eq."${nomeStr}"`);

            if (errAtletas) throw errAtletas;

            const jogadores = atletas.filter(a => a.funcao === 'Jogador' || a.funcao === 'Jogadora');
            const equipaTecnica = atletas.filter(a => a.funcao !== 'Jogador' && a.funcao !== 'Jogadora');

            const playersGrid = document.getElementById('roster-players-grid');
            const staffGrid = document.getElementById('roster-staff-grid');

            if (jogadores.length > 0) {
                jogadores.forEach(j => {
                    const card = document.createElement('div');
                    card.className = 'player-card reveal active';
                    
                    const numBadge = j.numero_camisola ? `<div class="player-number">#${j.numero_camisola}</div>` : '';
                    const photoHtml = j.foto 
                        ? `<img src="${j.foto}" alt="${j.nome}" class="player-photo">` 
                        : `<div class="player-photo-placeholder">👤</div>`;
                    
                    const nomeExibicao = j.nickname ? j.nickname : j.nome.split(' ')[0]; // Alcunha ou primeiro nome
                    
                    card.innerHTML = `
                        <div class="player-photo-container">
                            ${numBadge}
                            ${photoHtml}
                        </div>
                        <div class="player-info">
                            <h4 class="player-name">${nomeExibicao}</h4>
                            <div class="player-role">${j.nome}</div>
                        </div>
                    `;
                    playersGrid.appendChild(card);
                });
            } else {
                document.getElementById('roster-players-section').style.display = 'none';
            }

            if (equipaTecnica.length > 0) {
                equipaTecnica.forEach(t => {
                    const card = document.createElement('div');
                    card.className = 'player-card reveal active';
                    
                    const photoHtml = t.foto 
                        ? `<img src="${t.foto}" alt="${t.nome}" class="player-photo">` 
                        : `<div class="player-photo-placeholder">👤</div>`;
                    
                    card.innerHTML = `
                        <div class="player-photo-container">
                            ${photoHtml}
                        </div>
                        <div class="player-info">
                            <h4 class="player-name">${t.nickname ? t.nickname : t.nome}</h4>
                            <div class="player-role">${t.funcao}</div>
                        </div>
                    `;
                    staffGrid.appendChild(card);
                });
            } else {
                document.getElementById('roster-staff-section').style.display = 'none';
            }

        } else {
            // ==========================================
            // MODO: TODAS AS EQUIPAS
            // ==========================================
            if (allTeamsView) {
                allTeamsView.style.display = 'block'; 
            }
            if (teamDetailView) teamDetailView.style.display = 'none';
            loading.style.display = 'none';

            if (!equipas || equipas.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Ainda não existem equipas registadas para a época 2025-2026.</p>';
                return;
            }

            equipas.forEach(equipa => {
                const card = document.createElement('div');
                card.className = 'equipa-card';

                const fotoUrl = equipa.foto || 'https://via.placeholder.com/600x400?text=Sem+Foto';
                
                let escalaoDisplay = equipa.escalao;
                if (equipa.sexo && equipa.sexo !== 'Todos') {
                    escalaoDisplay += ` ${equipa.sexo}`;
                }

                card.innerHTML = `
                    <img src="${fotoUrl}" alt="${equipa.nome}" class="equipa-foto">
                    <div class="equipa-info">
                        <h3 style="color: var(--accent-primary); margin-bottom: 5px;">${equipa.nome}</h3>
                        <p style="color: var(--text-secondary); font-weight: 600; margin-bottom: 15px;">${escalaoDisplay}</p>
                        <button onclick="window.location.href='equipas.html?equipaId=${equipa.id}'" class="btn btn-primary" style="width: 100%;">Ver Plantel</button>
                    </div>
                `;

                grid.appendChild(card);
            });
        }

    } catch (error) {
        console.error('Erro ao carregar equipas:', error);
        loading.innerHTML = `<span style="color: red;">Erro ao carregar equipas: ${error.message}</span>`;
    }
});
