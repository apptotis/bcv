/**
 * resultados.js - Basket Clube de Valença
 * Gestão e Apuramento da Página de Resultados Oficiais
 */

document.addEventListener('DOMContentLoaded', async () => {
    let supabase = null;
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    }

    if (!supabase) {
        console.error("Supabase não disponível em resultados.js");
        return;
    }

    let todosResultados = [];
    let filtroEscalaoAtual = 'todos';
    let termoBuscaAtual = '';

    // Ler parâmetro da URL (ex: ?escalao=Sub+14+Mas)
    const urlParams = new URLSearchParams(window.location.search);
    const paramEscalao = urlParams.get('escalao') || urlParams.get('equipa') || '';
    if (paramEscalao) {
        filtroEscalaoAtual = paramEscalao;
    }

    // Inicializar listeners de UI
    inicializarFiltrosUI();

    // Carregar dados
    await carregarResultadosCompletos(supabase);

    function inicializarFiltrosUI() {
        const pills = document.querySelectorAll('.results-filter-pills .filter-pill');
        pills.forEach(pill => {
            const esc = pill.getAttribute('data-escalao');
            // Se veio parâmetro da URL, marcar a pill ativa correspondente
            if (paramEscalao && correspondeEscalaoTexto(esc, paramEscalao)) {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filtroEscalaoAtual = esc;
            }

            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filtroEscalaoAtual = esc;
                aplicarFiltros();
            });
        });

        const searchInput = document.getElementById('results-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                termoBuscaAtual = (e.target.value || '').trim().toLowerCase();
                aplicarFiltros();
            });
        }
    }

    function correspondeEscalaoTexto(valorPill, textoBusca) {
        if (!valorPill || !textoBusca) return false;
        const v = valorPill.toLowerCase().replace(/[^a-z0-9]/g, '');
        const t = textoBusca.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (v === t) return true;

        if (t.includes('12') && t.includes('mas') && v.includes('12') && v.includes('mas')) return true;
        if (t.includes('12') && t.includes('fem') && v.includes('12') && v.includes('fem')) return true;
        if (t.includes('14') && t.includes('mas') && v.includes('14') && v.includes('mas')) return true;
        if (t.includes('16') && t.includes('fem') && v.includes('16') && v.includes('fem')) return true;
        if (t.includes('18') && t.includes('mas') && v.includes('18') && v.includes('mas')) return true;
        if ((t.includes('sen') || t.includes('cn2')) && (v.includes('sen') || v.includes('cn2'))) return true;

        return v.includes(t) || t.includes(v);
    }

    async function carregarResultadosCompletos(client) {
        const listContainer = document.getElementById('resultados-page-list');
        try {
            // Carregar resultados de resultados_bcv e séries de clube_config
            const [resResultados, resConfig] = await Promise.all([
                client.from('resultados_bcv').select('*').order('data_jogo', { ascending: false }),
                client.from('clube_config').select('dados').eq('chave', 'competicoes').maybeSingle()
            ]);

            const rawResultados = resResultados?.data || [];
            let listaResultados = [];

            // Deduplicar registos da tabela
            rawResultados.forEach(r => {
                const dup = listaResultados.some(u => {
                    const mesmoConfronto = compararEquipasSimples(u.equipa_casa, r.equipa_casa) &&
                                           compararEquipasSimples(u.equipa_fora, r.equipa_fora);
                    if (!mesmoConfronto) return false;
                    const mesmoEscalao = (u.escalao || '').toLowerCase().trim() === (r.escalao || '').toLowerCase().trim();
                    const mesmaData = (u.data_jogo === r.data_jogo);
                    const mesmosPontos = (Number(u.pontos_casa) === Number(r.pontos_casa) && Number(u.pontos_fora) === Number(r.pontos_fora));
                    return mesmaData || (mesmoEscalao && mesmosPontos);
                });
                if (!dup) listaResultados.push(r);
            });

            // Integrar jogos com resultado das séries oficiais
            if (resConfig?.data?.dados && Array.isArray(resConfig.data.dados)) {
                resConfig.data.dados.forEach(comp => {
                    const isCN2Comp = comp.sigla === 'CN2' || /cn2|2ª\s*div/i.test(comp.nome || '');
                    if (Array.isArray(comp.jogos_serie)) {
                        comp.jogos_serie.forEach(j => {
                            if (isCN2Comp) {
                                const cNome = (j.equipa_casa || '').toLowerCase();
                                const fNome = (j.equipa_fora || '').toLowerCase();
                                if (cNome.includes('maria da fonte') || fNome.includes('maria da fonte')) return;
                            }

                            const isCasaBCV = /valen[cç]a|bcv/i.test(j.equipa_casa || '');
                            const isForaBCV = /valen[cç]a|bcv/i.test(j.equipa_fora || '');
                            if (!isCasaBCV && !isForaBCV) return;

                            const pCasa = parseInt(j.pontos_casa, 10);
                            const pFora = parseInt(j.pontos_fora, 10);
                            if (isNaN(pCasa) || isNaN(pFora)) return;

                            // Verificar se já existe na lista
                            const jaExiste = listaResultados.some(existente => {
                                const mesmoConfronto = compararEquipasSimples(existente.equipa_casa, j.equipa_casa) &&
                                                       compararEquipasSimples(existente.equipa_fora, j.equipa_fora);
                                if (!mesmoConfronto) return false;
                                const mesmaData = (existente.data_jogo === j.data);
                                const mesmosPontos = (Number(existente.pontos_casa) === pCasa && Number(existente.pontos_fora) === pFora);
                                return mesmaData || mesmosPontos;
                            });

                            if (!jaExiste) {
                                const escalaoJogo = isCN2Comp ? 'Seniores' : (comp.escalao || 'Sub 14');
                                const competicaoJogo = isCN2Comp 
                                    ? 'Sénior Masculino | 2ª Divisão Masculina' 
                                    : `${comp.escalao || ''} ${comp.sexo || ''} | ${comp.nome || comp.sigla || 'Oficial FPB'}`.trim();

                                listaResultados.push({
                                    id: 'serie_' + (j.id || Math.random().toString(36).substr(2, 6)),
                                    equipa_casa: j.equipa_casa,
                                    equipa_fora: j.equipa_fora,
                                    pontos_casa: pCasa,
                                    pontos_fora: pFora,
                                    data_jogo: j.data || '2026-10-18',
                                    hora_jogo: j.hora || '',
                                    local: j.local || (isCasaBCV ? 'Pavilhão Municipal de Valença' : ''),
                                    escalao: escalaoJogo,
                                    competicao: competicaoJogo,
                                    publicado: true
                                });
                            }
                        });
                    }
                });
            }

            todosResultados = listaResultados;
            aplicarFiltros();

        } catch (err) {
            console.error("Erro ao carregar resultados em resultados.js:", err);
            if (listContainer) {
                listContainer.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #dc2626; background: #ffffff; border-radius: 12px; border: 1px solid var(--border-color);">
                        Erro ao carregar resultados oficiais: ${err.message}
                    </div>
                `;
            }
        }
    }

    function aplicarFiltros() {
        const listContainer = document.getElementById('resultados-page-list');
        if (!listContainer) return;

        let filtrados = todosResultados.filter(r => r.publicado !== false);

        // Filtro por escalão
        if (filtroEscalaoAtual && filtroEscalaoAtual !== 'todos') {
            filtrados = filtrados.filter(r => {
                return verificarMatchEscalao(r, filtroEscalaoAtual);
            });
        }

        // Filtro por pesquisa textual
        if (termoBuscaAtual) {
            filtrados = filtrados.filter(r => {
                const busca = termoBuscaAtual;
                const c = (r.equipa_casa || '').toLowerCase();
                const f = (r.equipa_fora || '').toLowerCase();
                const comp = (r.competicao || '').toLowerCase();
                const esc = (r.escalao || '').toLowerCase();
                const loc = (r.local || '').toLowerCase();
                return c.includes(busca) || f.includes(busca) || comp.includes(busca) || esc.includes(busca) || loc.includes(busca);
            });
        }

        // Ordenar do mais recente para o mais antigo
        filtrados.sort((a, b) => {
            const diffData = (b.data_jogo || '').localeCompare(a.data_jogo || '');
            if (diffData !== 0) return diffData;
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        // Atualizar KPIs
        atualizarKPIs(filtrados);

        // Renderizar lista
        renderLista(filtrados);
    }

    function verificarMatchEscalao(jogo, filtro) {
        const f = filtro.toLowerCase().replace(/[^a-z0-9]/g, '');
        const esc = (jogo.escalao || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const comp = (jogo.competicao || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (f.includes('12') && f.includes('mas')) {
            return (esc.includes('12') || comp.includes('12')) && (esc.includes('mas') || comp.includes('mas') || !comp.includes('fem'));
        }
        if (f.includes('12') && f.includes('fem')) {
            return (esc.includes('12') || comp.includes('12')) && (esc.includes('fem') || comp.includes('fem'));
        }
        if (f.includes('14') && f.includes('mas')) {
            return (esc.includes('14') || comp.includes('14')) && (esc.includes('mas') || comp.includes('mas') || !comp.includes('fem'));
        }
        if (f.includes('14') && f.includes('fem')) {
            return (esc.includes('14') || comp.includes('14')) && (esc.includes('fem') || comp.includes('fem'));
        }
        if (f.includes('16') && f.includes('fem')) {
            return (esc.includes('16') || comp.includes('16')) && (esc.includes('fem') || comp.includes('fem'));
        }
        if (f.includes('18') && f.includes('mas')) {
            return (esc.includes('18') || comp.includes('18')) && (esc.includes('mas') || comp.includes('mas') || !comp.includes('fem'));
        }
        if (f.includes('sen') || f.includes('cn2')) {
            return esc.includes('sen') || comp.includes('sen') || comp.includes('cn2') || comp.includes('2div');
        }

        return esc.includes(f) || comp.includes(f);
    }

    function atualizarKPIs(lista) {
        const countBadge = document.getElementById('results-count-badge');
        const kpiTotal = document.getElementById('kpi-total-jogos');
        const kpiVitorias = document.getElementById('kpi-total-vitorias');
        const kpiDerrotas = document.getElementById('kpi-total-derrotas');
        const kpiSaldo = document.getElementById('kpi-pontos-saldo');

        let vitorias = 0;
        let derrotas = 0;
        let totalPM = 0;
        let totalPS = 0;

        lista.forEach(r => {
            const isTorneio = typeof window.verificarSeTorneio === 'function' ? window.verificarSeTorneio(r) : false;
            if (isTorneio) return;

            const ptsCasa = Number(r.pontos_casa) || 0;
            const ptsFora = Number(r.pontos_fora) || 0;
            const isCasaBCV = /valen[cç]a|bcv/i.test(r.equipa_casa || '');
            const isForaBCV = /valen[cç]a|bcv/i.test(r.equipa_fora || '');

            if (isCasaBCV) {
                totalPM += ptsCasa;
                totalPS += ptsFora;
                if (ptsCasa > ptsFora) vitorias++;
                else derrotas++;
            } else if (isForaBCV) {
                totalPM += ptsFora;
                totalPS += ptsCasa;
                if (ptsFora > ptsCasa) vitorias++;
                else derrotas++;
            }
        });

        if (countBadge) countBadge.textContent = `${lista.length} Resultado${lista.length !== 1 ? 's' : ''}`;
        if (kpiTotal) kpiTotal.textContent = lista.length;
        if (kpiVitorias) kpiVitorias.textContent = vitorias;
        if (kpiDerrotas) kpiDerrotas.textContent = derrotas;
        if (kpiSaldo) kpiSaldo.textContent = `${totalPM} - ${totalPS}`;
    }

    function renderLista(lista) {
        const listContainer = document.getElementById('resultados-page-list');
        if (!listContainer) return;

        if (lista.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 45px 20px; text-align: center; color: var(--text-secondary); background: #ffffff; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
                    <h3 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1.15rem;">Nenhum resultado encontrado</h3>
                    <p style="margin: 0; font-size: 0.9rem;">Não existem jogos com resultados para o filtro selecionado no momento.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = '';

        lista.forEach(resultado => {
            const isTorneio = typeof window.verificarSeTorneio === 'function' ? window.verificarSeTorneio(resultado) : false;
            const escalaoCompleto = typeof window.extrairEscalaoCompleto === 'function' ? window.extrairEscalaoCompleto(resultado) : (resultado.escalao || 'BCV');
            const dataJogo = typeof window.formatDataAgenda === 'function' ? window.formatDataAgenda(resultado.data_jogo) : resultado.data_jogo;
            const horaJogo = resultado.hora_jogo ? resultado.hora_jogo.trim() : '';

            const localNome = (resultado.local && resultado.local.trim()) ? resultado.local.trim() : 'Pavilhão Municipal de Valença';
            const linkMaps = typeof window.gerarLinkGoogleMaps === 'function' ? window.gerarLinkGoogleMaps(localNome, resultado.local_maps_url) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localNome)}`;

            const card = document.createElement('div');
            card.className = 'game-result-item';

            if (isTorneio) {
                const nomeTorneio = typeof window.extrairTituloTorneio === 'function' ? window.extrairTituloTorneio(resultado) : (resultado.nome_evento || resultado.equipa_casa || 'Torneio / Concentração');
                const horaFormatada = horaJogo ? `• ⏰ ${horaJogo}` : '';

                card.classList.add('is-tournament-item');
                card.innerHTML = `
                    <div class="game-result-top">
                        <span class="game-escalao-badge">${escalaoCompleto}</span>
                        <span class="game-date-badge">${dataJogo} ${horaFormatada}</span>
                    </div>
                    <div class="tournament-hero-body" style="padding: 12px 0;">
                        <div class="tournament-hero-icon-title">
                            <span class="tournament-trophy-icon">🏆</span>
                            <div>
                                <div class="tournament-main-title">${nomeTorneio}</div>
                                ${resultado.competicao ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">${resultado.competicao}</div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="game-schedule-venue" style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px;">
                        <a href="${linkMaps}" target="_blank" rel="noopener noreferrer" class="venue-maps-link" title="Abrir localização no Google Maps">
                            <span class="venue-pin">📍</span>
                            <span class="venue-name">${localNome}</span>
                            <span class="venue-external-icon">↗</span>
                        </a>
                    </div>
                `;
            } else {
                const ptsCasa = Number(resultado.pontos_casa) || 0;
                const ptsFora = Number(resultado.pontos_fora) || 0;
                const scoreFormatted = `${ptsCasa} - ${ptsFora}`;

                const isCasaBCV = /valen[cç]a|bcv/i.test(resultado.equipa_casa || '');
                const isForaBCV = /valen[cç]a|bcv/i.test(resultado.equipa_fora || '');

                let statusBadge = '';
                let isVitoriaBCV = false;

                if (isCasaBCV) {
                    isVitoriaBCV = ptsCasa > ptsFora;
                } else if (isForaBCV) {
                    isVitoriaBCV = ptsFora > ptsCasa;
                }

                if (isCasaBCV || isForaBCV) {
                    if (isVitoriaBCV) {
                        statusBadge = `<span style="background: rgba(22, 163, 74, 0.12); color: #16a34a; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(22, 163, 74, 0.25);">🏆 VITÓRIA BCV</span>`;
                        card.style.borderLeftColor = '#16a34a';
                    } else {
                        statusBadge = `<span style="background: rgba(220, 38, 38, 0.1); color: #dc2626; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(220, 38, 38, 0.2);">DERROTA</span>`;
                    }
                }

                const logoCasa = typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(resultado.equipa_casa, resultado.logo_casa) : null;
                const logoFora = typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(resultado.equipa_fora, resultado.logo_fora) : null;

                card.innerHTML = `
                    <div class="game-result-top">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="game-escalao-badge">${escalaoCompleto}</span>
                            ${statusBadge}
                        </div>
                        <span class="game-date-badge">${dataJogo} ${horaJogo ? '• ' + horaJogo : ''}</span>
                    </div>
                    <div class="matchup-row-aligned">
                        <div class="matchup-team-col team-casa ${isCasaBCV ? 'team-bcv' : ''}">
                            <div class="team-logo-wrap">
                                ${logoCasa ? `<img src="${logoCasa}" alt="${resultado.equipa_casa}" class="team-logo-large" onerror="this.parentElement.innerHTML='🏀'">` : '<span class="team-logo-placeholder">🏀</span>'}
                            </div>
                            <div class="team-name">${resultado.equipa_casa}</div>
                        </div>
                        <div class="matchup-center-badge">
                            <span class="game-result-score">${scoreFormatted}</span>
                        </div>
                        <div class="matchup-team-col team-fora ${isForaBCV ? 'team-bcv' : ''}">
                            <div class="team-logo-wrap">
                                ${logoFora ? `<img src="${logoFora}" alt="${resultado.equipa_fora}" class="team-logo-large" onerror="this.parentElement.innerHTML='🏀'">` : '<span class="team-logo-placeholder">🏀</span>'}
                            </div>
                            <div class="team-name">${resultado.equipa_fora}</div>
                        </div>
                    </div>
                    ${resultado.competicao ? `
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; padding-left: 2px;">
                            🏆 ${resultado.competicao}
                        </div>
                    ` : ''}
                    <div class="game-schedule-venue" style="border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 8px;">
                        <a href="${linkMaps}" target="_blank" rel="noopener noreferrer" class="venue-maps-link" title="Abrir localização no Google Maps">
                            <span class="venue-pin">📍</span>
                            <span class="venue-name">${localNome}</span>
                            <span class="venue-external-icon">↗</span>
                        </a>
                    </div>
                `;
            }

            listContainer.appendChild(card);
        });
    }

    function compararEquipasSimples(a, b) {
        if (!a || !b) return false;
        const limpoA = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        const limpoB = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        return limpoA === limpoB;
    }
});
