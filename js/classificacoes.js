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

    function formatarNomeEscalao(param) {
        if (!param) return '';
        const p = param.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (p.includes('14') && p.includes('mas')) return 'Sub 14 Masculino';
        if (p.includes('14') && p.includes('fem')) return 'Sub 14 Feminino';
        if (p.includes('16') && p.includes('fem')) return 'Sub 16 Feminino';
        if (p.includes('18') && p.includes('mas')) return 'Sub 18 Masculino';
        if (p.includes('sen') || p.includes('cn2')) return 'Seniores (CN2)';
        return param;
    }

    // Ler parâmetro da URL (ex: ?escalao=Seniores ou ?escalao=Sub+16+Fem)
    const urlParams = new URLSearchParams(window.location.search);
    const paramEscalao = urlParams.get('escalao') || urlParams.get('comp') || '';
    if (paramEscalao && paramEscalao !== 'todos') {
        filtroEscalaoAtual = paramEscalao;
        const titleEl = document.getElementById('classificacoes-page-title');
        const subtitleEl = document.getElementById('classificacoes-page-subtitle');
        const nomeFormatado = formatarNomeEscalao(paramEscalao);
        if (titleEl) titleEl.textContent = `Classificação • ${nomeFormatado}`;
        if (subtitleEl) subtitleEl.textContent = `Tabela oficial e apuramento federativo da equipa ${nomeFormatado} do BC Valença.`;
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
        if (t.includes('14') && t.includes('fem') && v.includes('14') && v.includes('fem')) return true;
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
                        id: "sub14_fem",
                        sigla: "Sub 14 Fem",
                        nome: "Campeonato Distrital Sub 14 Feminino",
                        escalao: "Sub 14",
                        sexo: "Feminino",
                        tipo: "Distrital",
                        organizador: "ABVC / FPB",
                        fase: "Fase Regular",
                        ativo: true,
                        ordem: 5,
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
            const isMini12 = (filtroEscalaoAtual || '').toLowerCase().includes('12');
            const titulo = isMini12 ? 'Minibasquete Sub 12 • Escalão de Formação' : 'Nenhuma classificação encontrada';
            const texto = isMini12 
                ? 'O Minibasquete (Sub 12 / Mini 12) é um escalão de formação e desenvolvimento desportivo. Segundo os regulamentos oficiais da FPB, os encontros e torneios de minibasquete não têm tabela classificativa oficial.'
                : 'Não existem competições registadas para o escalão selecionado.';
            const cta = isMini12
                ? `<div style="margin-top: 16px;"><a href="resultados.html?escalao=${encodeURIComponent(filtroEscalaoAtual)}" class="btn-primary" style="display: inline-block; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 700; background: #7e22ce; color: #fff;">Ver Resultados e Torneios →</a></div>`
                : '';

            container.innerHTML = `
                <div style="padding: 45px 20px; text-align: center; color: var(--text-secondary); background: #ffffff; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 12px;">${isMini12 ? '⭐' : '🔍'}</div>
                    <h3 style="margin: 0 0 6px 0; color: var(--text-primary); font-size: 1.15rem;">${titulo}</h3>
                    <p style="margin: 0 auto; max-width: 540px; font-size: 0.9rem; line-height: 1.5;">${texto}</p>
                    ${cta}
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        comps.forEach(comp => {
            const card = document.createElement('div');
            card.className = `competicao-card ${comp.tipo === 'nacional' ? 'nacional' : ''}`;
            card.style.marginBottom = '24px';

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
                    <div class="comp-classificacao-container" style="margin-top: 8px;">
                        <div class="comp-classificacao-header" style="margin-bottom: 8px;">
                            <span class="comp-class-source-badge">⚡ Quadro Oficial da Série • FPB • ${comp.tipo === 'nacional' ? 'Nacional' : 'Distrital'}</span>
                        </div>

                        <div class="comp-table-scroll">
                            <table class="comp-classificacao-table">
                                <thead>
                                    <tr>
                                        <th class="th-pos">#</th>
                                        <th class="th-team">Equipa</th>
                                        <th class="th-num" title="Jogos Disputados">J</th>
                                        <th class="th-num" title="Vitórias">V</th>
                                        <th class="th-num" title="Derrotas">D</th>
                                        <th class="th-num col-pts-extra" title="Pontos Marcados">PM</th>
                                        <th class="th-num col-pts-extra" title="Pontos Sofridos">PS</th>
                                        <th class="th-num" title="Diferença de Pontos">DIF</th>
                                        <th class="th-num th-pts" title="Pontos de Classificação">PTS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${equipasTabela.map((eq, idx) => {
                                        const isBCV = /valen[cç]a|bcv/i.test(eq.nome);
                                        const logo = eq.logo || (typeof window.obterLogoEquipa === 'function' ? window.obterLogoEquipa(eq.nome) : null);
                                        const diffFormatada = eq.dif > 0 ? `+${eq.dif}` : eq.dif;
                                        const difColorClass = eq.dif > 0 ? 'dif-pos' : (eq.dif < 0 ? 'dif-neg' : '');
                                        const posNum = eq.pos || (idx + 1);

                                        return `
                                            <tr class="${isBCV ? 'is-bcv-row' : ''}">
                                                <td class="td-pos">
                                                    <span class="pos-badge ${posNum === 1 ? 'pos-first' : ''}">${posNum}</span>
                                                </td>
                                                <td class="td-team">
                                                    <div class="td-team-content">
                                                        ${logo ? `<img src="${logo}" alt="" class="team-logo-icon" style="width: 18px; height: 18px; max-width: 18px; max-height: 18px; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none'">` : ''}
                                                        <span class="team-name" title="${eq.nome}">${eq.nome}</span>
                                                        ${isBCV ? '<span class="bcv-badge-tag">BCV</span>' : ''}
                                                    </div>
                                                </td>
                                                <td class="td-num">${eq.j}</td>
                                                <td class="td-num v-color">${eq.v}</td>
                                                <td class="td-num d-color">${eq.d}</td>
                                                <td class="td-num col-pts-extra text-muted">${eq.pm}</td>
                                                <td class="td-num col-pts-extra text-muted">${eq.ps}</td>
                                                <td class="td-num dif-color ${difColorClass}">${diffFormatada}</td>
                                                <td class="td-num td-pts"><strong>${eq.pts}</strong></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="comp-table-legend">
                            <span><strong>Regra Oficial FPB:</strong> Vitória = 2 Pts | Derrota = 1 Pt</span>
                        </div>
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
                <!-- Linha 1: Nome da Competição (Largura Total) -->
                <div class="competicao-title-row">
                    <h3 class="competicao-title">${comp.nome}</h3>
                </div>

                <!-- Linha 2: Tag da Série + Botão FPB Oficial -->
                <div class="competicao-sub-row">
                    <div class="competicao-tags-group">
                        <span class="competicao-tag">${comp.tipo === 'nacional' ? 'FPB • NACIONAL' : (comp.tag || comp.escalao || 'FPB • DISTRITAL')}</span>
                        ${comp.sigla ? `<span class="competicao-sigla">${comp.sigla}</span>` : ''}
                    </div>
                    <a href="${urlFPB}" target="_blank" rel="noopener noreferrer" class="comp-class-link-fpb" style="text-decoration: none;" title="Consultar classificação oficial na FPB">
                        <span>FPB Oficial</span>
                        <span>↗</span>
                    </a>
                </div>

                ${tabelaHtml}
                ${jogosSerieHtml}

                <div class="competicao-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-secondary); flex-wrap: wrap; gap: 6px;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Época 2026/2027</span>
                    <a href="${urlFPB}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: var(--accent-primary); font-weight: 700; background: rgba(126,34,206,0.08); padding: 2px 8px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="Consultar no portal oficial da FPB">FPB Oficial ↗</a>
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
            return (esc.includes('14') || nome.includes('14')) && (nome.includes('mas') || esc.includes('mas') || (comp.sexo && comp.sexo.toLowerCase().includes('mas')) || (!nome.includes('fem') && (!comp.sexo || !comp.sexo.toLowerCase().includes('fem'))));
        }
        if (f.includes('14') && f.includes('fem')) {
            return (esc.includes('14') || nome.includes('14')) && (nome.includes('fem') || esc.includes('fem') || (comp.sexo && comp.sexo.toLowerCase().includes('fem')));
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

