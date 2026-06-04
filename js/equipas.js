document.addEventListener('DOMContentLoaded', async () => {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const grid = document.getElementById('equipas-grid');
    const loading = document.getElementById('equipas-loading');

    if (!grid) return;

    try {
        let { data: equipas, error: errEquipas } = await supabaseClient
            .from('equipasbcv')
            .select('*')
            .eq('epoca', '2025-2026');

        if (errEquipas) throw errEquipas;

        // Ordenação customizada por Escalão
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
                
                // Se o escalão não estiver na lista, vai para o fim
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                
                // Se o escalão for igual, desempata pelo sexo ou nome
                if (indexA === indexB) {
                    return a.nome.localeCompare(b.nome);
                }
                
                return indexA - indexB;
            });
        }

        // Buscar Atletas da mesma época
        const { data: atletas, error: errAtletas } = await supabaseClient
            .from('atletasbcv')
            .select('*')
            .eq('epoca', '2025-2026');

        if (errAtletas) throw errAtletas;

        loading.style.display = 'none';

        if (!equipas || equipas.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Ainda não existem equipas registadas para a época 2025-2026.</p>';
            return;
        }

        equipas.forEach(equipa => {
            const card = document.createElement('div');
            card.className = 'equipa-card';

            const fotoUrl = equipa.foto || 'https://via.placeholder.com/600x400?text=Sem+Foto';
            const nomeStr = `${equipa.nome} (${equipa.escalao})`;

            // Filtrar plantel da equipa
            // O atleta pertence a esta equipa se equipabcv1 ou equipabcv2 for igual a "Nome (Escalão)"
            const plantel = atletas.filter(a => a.equipabcv1 === nomeStr || a.equipabcv2 === nomeStr);
            
            // Separar Jogadores vs Resto (Treinador, Seccionista)
            const jogadores = plantel.filter(a => a.funcao === 'Jogador' || a.funcao === 'Jogadora');
            const equipaTecnica = plantel.filter(a => a.funcao !== 'Jogador' && a.funcao !== 'Jogadora');

            // Gerar HTML dos Jogadores
            let htmlJogadores = '';
            if (jogadores.length > 0) {
                htmlJogadores += `<div class="plantel-group-title">Jogadores</div>`;
                jogadores.forEach(j => {
                    const fotoJ = j.foto ? `<img src="${j.foto}" class="plantel-foto">` : `<div class="plantel-foto">👤</div>`;
                    const numJ = j.numero_camisola ? `<strong>#${j.numero_camisola}</strong> ` : '';
                    htmlJogadores += `
                        <div class="plantel-item">
                            ${fotoJ}
                            <div>${numJ}${j.nome} ${j.nickname ? `<small style="color:var(--accent-primary);">"${j.nickname}"</small>` : ''}</div>
                        </div>
                    `;
                });
            }

            // Gerar HTML da Equipa Técnica
            let htmlStaff = '';
            if (equipaTecnica.length > 0) {
                htmlStaff += `<div class="plantel-group-title">Equipa Técnica / Staff</div>`;
                equipaTecnica.forEach(t => {
                    const fotoT = t.foto ? `<img src="${t.foto}" class="plantel-foto">` : `<div class="plantel-foto">👤</div>`;
                    htmlStaff += `
                        <div class="plantel-item">
                            ${fotoT}
                            <div>
                                ${t.nome} <br>
                                <small style="color:var(--text-secondary);">${t.funcao}</small>
                            </div>
                        </div>
                    `;
                });
            }

            const htmlPlantelVazio = (jogadores.length === 0 && equipaTecnica.length === 0) 
                ? '<p style="color:var(--text-secondary); font-size:0.85rem; margin-top:10px;">Ainda não existem atletas registados nesta equipa.</p>' 
                : '';

            card.innerHTML = `
                <img src="${fotoUrl}" alt="${equipa.nome}" class="equipa-foto">
                <div class="equipa-info">
                    <h3 style="color: var(--accent-primary); margin-bottom: 5px;">${equipa.nome}</h3>
                    <p style="color: var(--text-secondary); font-weight: 600; margin-bottom: 10px;">${equipa.escalao}</p>
                    
                    <button class="plantel-btn" onclick="togglePlantel('${equipa.id}')">Ver Plantel (${plantel.length})</button>
                    
                    <div id="plantel-${equipa.id}" class="plantel-container">
                        ${htmlJogadores}
                        ${htmlStaff}
                        ${htmlPlantelVazio}
                    </div>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar equipas:', error);
        loading.innerHTML = `<span style="color: red;">Erro ao carregar equipas: ${error.message}</span>`;
    }
});

function togglePlantel(id) {
    const el = document.getElementById(`plantel-${id}`);
    if (el) {
        if (el.style.display === 'block') {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
        }
    }
}
