/**
 * classificacoes.js - Basket Clube de Valença
 * Gestão e Apuramento da Página de Classificações Oficiais
 */

document.addEventListener('DOMContentLoaded', async () => {
    let supabase = null;
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof window.supabaseClient !== 'undefined') {
        supabase = window.supabaseClient;
    }

    if (!supabase) {
        console.error("Supabase não disponível em classificacoes.js");
        return;
    }

    let todasCompeticoes = [];
    let todosResultados = [];
    let todosAgenda = [];
    let filtroEscalaoAtual = 'todos';

    // Ler parâmetro da URL (ex: ?escalao=Seniores ou ?escalao=Sub+16+Fem)
    const urlParams = new URLSearchParams(window.location.search);
    const paramEscalao = urlParams.get('escalao') || urlParams.get('comp') || '';
    if (paramEscalao) {
        filtroEscalaoAtual = paramEscalao;
    }

    // Inicializar listeners de UI
    inicializarFiltrosUI();

    // Carregar dados
    await carregarClassificacoesCompletas(supabase);

    function inicializarFiltrosUI() {
        const pills = document.querySelectorAll('.classificacoes-filter-pills .filter-pill');
        pills.forEach(pill => {
            const esc = pill.getAttribute('data-escalao');
            if (paramEscalao && correspondeEscalaoTexto(esc, paramEscalao)) {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filtroEscalaoAtual = esc;
            }

            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                filtroEscalaoAtual = esc;
                renderClassificacoes();
            });
        });
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

    async function carregarClassificacoesCompletas(client) {
        const container = document.getElementById('classificacoes-page-list');
        try {
            const [resConfig, resResultados, resAgenda] = await Promise.all([
                client.from('clube_config').select('*').eq('chave', 'competicoes').maybeSingle(),
                client.from('resultados_bcv').select('*').order('data_jogo', { ascending: false }),
                client.from('agenda_bcv').select('*').order('data_jogo', { ascending: true })
            ]);

            const configData = resConfig?.data?.dados;
            if (Array.isArray(configData) && configData.length > 0) {
                todasCompeticoes = configData;
            } else {
                todasCompeticoes = [
                    {
                        id: "cn2",
                        sigla: "CN2",
                        nome: "Campeonato Nacional da 2.ª Divisão Masculina (CN2)",
                        escalao: "Seniores",
                        tipo: "Nacional",
                        organizador: "Federação Portuguesa de Basquetebol (FPB)",
                        fase: "1.ª Fase • Grupo Norte",
                        ativo: true,
                        ordem: 1,
                        url_fpb: "https://www.fpb.pt/competicoes/"
                    },
                    {
                        id: "sub18_masc",
                        sigla: "Sub 18 Masc",
                        nome: "Campeonato Distrital Sub 18 Masculino",
                        escalao: "Sub 18",
                        tipo: "Distrital",
                        organizador: "Associação de Basquetebol de Viana do Castelo (ABVC)",
                        fase: "Fase Regular",
                        ativo: true,
                        ordem: 2,
                        url_fpb: "https://www.fpb.pt/competicoes/"
                    },
                    {
                        id: "sub16_fem",
                        sigla: "Sub 16 Fem",
                        nome: "Campeonato Interdistrital Sub 16 Feminino",
                        escalao: "Sub 16",
                        tipo: "Interdistrital",
                        organizador: "ABVC / FPB",
                        fase: "1.ª Fase",
                        ativo: true,
                        ordem: 3,
                        url_fpb: "https://www.fpb.pt/classificacao/associacao_5/"
                    },
                    {
                        id: "sub14_masc",
                        sigla: "Sub 14 Masc",
                        nome: "Campeonato Interdistrital Sub 14 Masculino",
                        escalao: "Sub 14",
                        tipo: "Interdistrital",
                        organizador: "ABVC / FPB",
                        fase: "Fase Regular",
                        ativo: true,
                        ordem: 4,
                        url_fpb: "https://www.fpb.pt/classificacao/associacao_5/"
                    },
                    {
                        id: "sub12_masc",
                        sigla: "Sub 12 Masc",
                        nome: "Circuito Regional de Minibasquete Sub 12 Masculino",
                        escalao: "Mini 12",
                        tipo: "Regional",
                        organizador: "ABVC",
                        fase: "Etapas e Torneios",
                        ativo: true,
                        ordem: 5,
                        url_fpb: "https://www.fpb.pt/classificacao/associacao_5/"
                    },
                    {
                        id: "sub12_fem",
                        sigla: "Sub 12 Fem",
                        nome: "Circuito Regional de Minibasquete Sub 12 Feminino",
                        escalao: "Mini 12",
                        tipo: "Regional",
                        organizador: "ABVC",
                        fase: "Etapas e Torneios",
                        ativo: true,
                        ordem: 6,
                        url_fpb: "https://www.fpb.pt/classificacao/associacao_5/"
                    }
                ];
            }

            todosResultados = resResultados?.data || [];
            todosAgenda = resAgenda?.data || [];

            renderClassificacoes();

        } catch (err) {
            console.error("Erro ao carregar classificações em classificacoes.js:", err);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #dc2626; background: #ffffff; border-radius: 12px; border: 1px solid var(--border-color);">
                        Erro ao carregar classificações oficiais: ${err.message}
                    </div>
                `;
            }
        }
    }

    function renderClassificacoes() {
        const container = document.getElementById('classificacoes-page-list');
        if (!container) return;

        // Filtrar competições ativas
        let comps = todasCompeticoes.filter(c => c.ativo !== false);

        if (filtroEscalaoAtual && filtroEscalaoAtual !== 'todos') {
            comps = comps.filter(c => verificarMatchEscalaoComp(c, filtroEscalaoAtual));
        }

        comps.sort((a, b) => (Number(a.ordem) || 99) - (Number(b.ordem) || 99));

        if (comps.length === 0) {
            container.innerHTML = `
                <div style="padding: 45px 20px; text-align: center; color: var(--text-secondary); background: #ffffff; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
                    <h3 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1.15rem;">Nenhuma classificação encontrada</h3>
                    <p style="margin: 0; font-size: 0.9rem;">Não existem competições registadas para o escalão selecionado.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        comps.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'portal-card comp-card-wrapper';
            card.style.padding = '22px';
            card.style.marginBottom = '20px';

            const compEscalao = comp.escalao || 'BCV';
            const compTipo = comp.tipo || 'Oficial FPB';
            const compOrganizador = comp.organizador || 'Federação Portuguesa de Basquetebol';
            const compFase = comp.fase || '';
            const urlFPB = comp.url_fpb || 'https://www.fpb.pt/competicoes/';

            // Apurar tabela de classificação
            const equipasTabela = apurarTabelaClassificacao(comp, todosResultados, todosAgenda);

            let tabelaHtml = '';
            if (equipasTabela && equipasTabela.length > 0) {
                tabelaHtml = `
                    <div class="comp-classificacao-container" style="margin-top: 15px; overflow-x: auto;">
                        <table class="comp-classificacao-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th class="col-pos">#</th>
                                    <th class="col-team">EQUIPA</th>
                                    <th class="col-stat">J</th>
                                    <th class="col-stat">V</th>
                                    <th class="col-stat">D</th>
                                    <th class="col-stat col-pm">PM</th>
                                    <th class="col-stat col-ps">PS</th>
                                    <th class="col-stat col-dif">DIF</th>
                                    <th class="col-pts">PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${equipasTabela.map(eq => {
                                    const isBCV = /valen[cç]a|bcv/i.test(eq.nome);
                                    const logoUrl = eq.logo || (typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(eq.nome) : null);
                                    const diffFormatada = eq.dif > 0 ? `+${eq.dif}` : eq.dif;
                                    const difColor = eq.dif > 0 ? '#16a34a' : (eq.dif < 0 ? '#dc2626' : 'var(--text-secondary)');

                                    return `
                                        <tr class="${isBCV ? 'is-bcv-row' : ''}">
                                            <td class="col-pos"><strong>${eq.pos}</strong></td>
                                            <td class="col-team">
                                                <div class="team-cell-wrap">
                                                    <div class="team-logo-mini-wrap">
                                                        ${logoUrl ? `<img src="${logoUrl}" alt="" class="team-logo-mini" onerror="this.parentElement.innerHTML='🏀'">` : '<span class="team-logo-placeholder-mini">🏀</span>'}
                                                    </div>
                                                    <span class="team-cell-name">${eq.nome}</span>
                                                    ${isBCV ? '<span class="team-bcv-pill">BCV</span>' : ''}
                                                </div>
                                            </td>
                                            <td class="col-stat stat-num">${eq.j}</td>
                                            <td class="col-stat stat-num" style="color: #16a34a; font-weight: 700;">${eq.v}</td>
                                            <td class="col-stat stat-num" style="color: ${eq.d > 0 ? '#dc2626' : 'inherit'};">${eq.d}</td>
                                            <td class="col-stat stat-num col-pm">${eq.pm}</td>
                                            <td class="col-stat stat-num col-ps">${eq.ps}</td>
                                            <td class="col-stat stat-num col-dif" style="color: ${difColor}; font-weight: 700;">${diffFormatada}</td>
                                            <td class="col-pts pts-highlight">${eq.pts}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                tabelaHtml = `
                    <div style="padding: 24px 15px; text-align: center; color: var(--text-secondary); background: #f8fafc; border-radius: 8px; margin-top: 15px; border: 1px dashed var(--border-color);">
                        <div style="font-size: 1.5rem; margin-bottom: 6px;">📋</div>
                        <p style="margin: 0; font-size: 0.88rem; font-weight: 600;">Classificação a aguardar publicação da 1.ª jornada oficial.</p>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem;">Consulte o link federativo abaixo para mais detalhes da prova.</p>
                    </div>
                `;
            }

            // Jogos da série registados (se existirem)
            let jogosSerieHtml = '';
            if (comp.jogos_serie && Array.isArray(comp.jogos_serie) && comp.jogos_serie.length > 0) {
                const isCN2 = comp.sigla === 'CN2' || /cn2|2ª\s*div/i.test(comp.nome || '');
                const jogosFiltrados = comp.jogos_serie.filter(j => {
                    if (isCN2) {
                        const c = (j.equipa_casa || '').toLowerCase();
                        const f = (j.equipa_fora || '').toLowerCase();
                        if (c.includes('maria da fonte') || f.includes('maria da fonte')) return false;
                    }
                    return true;
                });

                if (jogosFiltrados.length > 0) {
                    jogosSerieHtml = `
                        <div style="margin-top: 18px; border-top: 1px dashed var(--border-color); padding-top: 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="font-size: 0.88rem; color: var(--text-primary);">⚡ Quadro de Jogos da Série</strong>
                                <span style="font-size: 0.78rem; color: var(--text-secondary);">${jogosFiltrados.length} jogo(s) registado(s)</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px;">
                                ${jogosFiltrados.slice(0, 6).map(j => {
                                    const temPlacar = j.pontos_casa !== null && j.pontos_fora !== null && j.pontos_casa !== '' && j.pontos_fora !== '';
                                    const scoreStr = temPlacar ? `<strong>${j.pontos_casa} - ${j.pontos_fora}</strong>` : '<span style="color:var(--text-secondary); font-size:0.75rem;">vs</span>';
                                    const isBCV = /valen[cç]a|bcv/i.test(j.equipa_casa || '') || /valen[cç]a|bcv/i.test(j.equipa_fora || '');

                                    return `
                                        <div style="background: #f8fafc; border: 1px solid var(--border-color); ${isBCV ? 'border-left: 3px solid #7e22ce;' : ''} border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42%; font-weight: 600;">${j.equipa_casa}</span>
                                            <span style="padding: 0 4px; white-space: nowrap;">${scoreStr}</span>
                                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 42%; text-align: right; font-weight: 600;">${j.equipa_fora}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                            <span style="background: rgba(126,34,206,0.1); color: #7e22ce; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(126,34,206,0.2);">${compEscalao}</span>
                            <span style="background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${compTipo}</span>
                        </div>
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; line-height: 1.3;">${comp.nome}</h2>
                        <div style="font-size: 0.82rem; color: var(--text-secondary);">
                            <span>🏛️ ${compOrganizador}</span>
                            ${compFase ? ` • <span>${compFase}</span>` : ''}
                        </div>
                    </div>
                    <div>
                        <a href="${urlFPB}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" title="Ver classificação oficial na FPB">
                            <span>FPB Oficial</span>
                            <span style="font-size: 0.72rem;">↗</span>
                        </a>
                    </div>
                </div>

                ${tabelaHtml}
                ${jogosSerieHtml}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap; gap: 6px;">
                    <div>
                        <span>Critério FPB: Vitória = 2 pts • Derrota = 1 pt • Desempate por Pontos e Diferença</span>
                    </div>
                    <div>
                        <span>Época 2026/2027</span>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    function verificarMatchEscalaoComp(comp, filtro) {
        const f = filtro.toLowerCase().replace(/[^a-z0-9]/g, '');
        const esc = (comp.escalao || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const nome = (comp.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const sigla = (comp.sigla || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (f.includes('12') && f.includes('mas')) {
            return (esc.includes('12') || nome.includes('12')) && (nome.includes('mas') || esc.includes('mas') || !nome.includes('fem'));
        }
        if (f.includes('12') && f.includes('fem')) {
            return (esc.includes('12') || nome.includes('12')) && (nome.includes('fem') || esc.includes('fem'));
        }
        if (f.includes('14') && f.includes('mas')) {
            return (esc.includes('14') || nome.includes('14')) && (nome.includes('mas') || esc.includes('mas') || !nome.includes('fem'));
        }
        if (f.includes('16') && f.includes('fem')) {
            return (esc.includes('16') || nome.includes('16')) && (nome.includes('fem') || esc.includes('fem'));
        }
        if (f.includes('18') && f.includes('mas')) {
            return (esc.includes('18') || nome.includes('18')) && (nome.includes('mas') || esc.includes('mas') || !nome.includes('fem'));
        }
        if (f.includes('sen') || f.includes('cn2')) {
            return esc.includes('sen') || nome.includes('sen') || sigla.includes('cn2') || nome.includes('cn2') || nome.includes('2div');
        }

        return esc.includes(f) || nome.includes(f) || sigla.includes(f);
    }

    function apurarTabelaClassificacao(comp, resultados, agenda) {
        // 1. Prioridade: Tabela configurada na série
        if (comp.tabela_serie && Array.isArray(comp.tabela_serie) && comp.tabela_serie.length >= 2) {
            const mapEquipas = {};
            comp.tabela_serie.forEach(eq => {
                const nomeNorm = normalizarNomeEquipa(eq.nome || '');
                if (!nomeNorm) return;
                const key = nomeNorm.toLowerCase();
                const v = Number(eq.v) || 0;
                const d = Number(eq.d) || 0;
                const j = Number(eq.j) || (v + d);
                const pm = Number(eq.pm) || 0;
                const ps = Number(eq.ps) || 0;
                const ptsMin = (v * 2) + (d * 1);
                let pts = Number(eq.pts);
                if (isNaN(pts) || pts === undefined || ((v + d) > 0 && pts < ptsMin)) {
                    pts = ptsMin;
                }

                if (!mapEquipas[key]) {
                    mapEquipas[key] = {
                        nome: nomeNorm,
                        logo: eq.logo || (typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(nomeNorm) : null),
                        j, v, d, pm, ps, pts
                    };
                } else {
                    mapEquipas[key].j += j;
                    mapEquipas[key].v += v;
                    mapEquipas[key].d += d;
                    mapEquipas[key].pm += pm;
                    mapEquipas[key].ps += ps;
                    mapEquipas[key].pts += pts;
                }
            });

            const equipas = Object.values(mapEquipas).map(eq => ({
                ...eq,
                dif: eq.pm - eq.ps
            }));

            equipas.sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.dif !== a.dif) return b.dif - a.dif;
                if (b.v !== a.v) return b.v - a.v;
                return (b.pm || 0) - (a.pm || 0);
            });
            equipas.forEach((eq, idx) => {
                eq.pos = idx + 1;
            });
            return equipas;
        }

        // 2. Apuramento a partir dos jogos da série registados
        if (comp.jogos_serie && Array.isArray(comp.jogos_serie) && comp.jogos_serie.length > 0) {
            const mapEquipas = {};
            const isCN2 = comp.sigla === 'CN2' || /cn2|2ª\s*div/i.test(comp.nome || '');

            comp.jogos_serie.forEach(j => {
                if (isCN2) {
                    const c = (j.equipa_casa || '').toLowerCase();
                    const f = (j.equipa_fora || '').toLowerCase();
                    if (c.includes('maria da fonte') || f.includes('maria da fonte')) return;
                }

                const cNorm = normalizarNomeEquipa(j.equipa_casa || '');
                const fNorm = normalizarNomeEquipa(j.equipa_fora || '');
                if (!cNorm || !fNorm) return;

                const cKey = cNorm.toLowerCase();
                const fKey = fNorm.toLowerCase();

                if (!mapEquipas[cKey]) {
                    mapEquipas[cKey] = {
                        nome: cNorm,
                        logo: typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(cNorm) : null,
                        j: 0, v: 0, d: 0, pm: 0, ps: 0, pts: 0
                    };
                }
                if (!mapEquipas[fKey]) {
                    mapEquipas[fKey] = {
                        nome: fNorm,
                        logo: typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(fNorm) : null,
                        j: 0, v: 0, d: 0, pm: 0, ps: 0, pts: 0
                    };
                }

                const pCasa = parseInt(j.pontos_casa, 10);
                const pFora = parseInt(j.pontos_fora, 10);
                if (!isNaN(pCasa) && !isNaN(pFora)) {
                    mapEquipas[cKey].j++;
                    mapEquipas[fKey].j++;
                    mapEquipas[cKey].pm += pCasa;
                    mapEquipas[cKey].ps += pFora;
                    mapEquipas[fKey].pm += pFora;
                    mapEquipas[fKey].ps += pCasa;

                    if (pCasa > pFora) {
                        mapEquipas[cKey].v++;
                        mapEquipas[cKey].pts += 2;
                        mapEquipas[fKey].d++;
                        mapEquipas[fKey].pts += 1;
                    } else if (pFora > pCasa) {
                        mapEquipas[fKey].v++;
                        mapEquipas[fKey].pts += 2;
                        mapEquipas[cKey].d++;
                        mapEquipas[cKey].pts += 1;
                    } else {
                        // Regra de empate 0-0 ou ambos recebem 1 ponto
                        mapEquipas[cKey].d++;
                        mapEquipas[cKey].pts += 1;
                        mapEquipas[fKey].d++;
                        mapEquipas[fKey].pts += 1;
                    }
                }
            });

            const equipas = Object.values(mapEquipas).map(eq => ({
                ...eq,
                dif: eq.pm - eq.ps
            }));

            equipas.sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.dif !== a.dif) return b.dif - a.dif;
                if (b.v !== a.v) return b.v - a.v;
                return (b.pm || 0) - (a.pm || 0);
            });
            equipas.forEach((eq, idx) => {
                eq.pos = idx + 1;
            });
            return equipas;
        }

        return [];
    }

    function normalizarNomeEquipa(nome) {
        if (!nome) return '';
        const n = nome.trim();
        if (/^acr\s*vigoros[ao]$/i.test(n)) return 'ACR Vigorosa';
        if (/^famalicense\s*ac\s*-\s*b$/i.test(n)) return 'Famalicense AC - B';
        if (/^famalicense\s*ac$/i.test(n)) return 'Famalicense AC';
        if (/^mon[cç][ãa]o\s*bc$/i.test(n)) return 'Monção BC';
        if (/^bc\s*limiense$/i.test(n)) return 'BC Limiense';
        if (/^bc\s*valen[cç]a$/i.test(n)) return 'BC Valença';
        return n;
    }
});
