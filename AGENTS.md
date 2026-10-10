# Projeto: Basket Clube de Valença (BCV)

## Stack Técnica
- Frontend: HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
- Backend/DB: Supabase (herdado do torneio)
- Deploy: Cloudflare Pages
- Versionamento: Git / GitHub

## Estrutura do Projeto
- `/torneio-eurocidade/`: Site dedicado ao Torneio.
- `/`: Novo site principal institucional do BCV.

## Regras e Padrões
- UI/UX Premium: Uso de cores vibrantes, contrastes, animações suaves e design focado no utilizador. Sem Tailwind (Vanilla CSS).
- Múltiplos agentes (Gemini, Claude, Codex) mantêm este ficheiro como Single Source of Truth (SSOT).

## Histórico de Atualizações
- [2026-05 a 2026-06] Gemini: Inicialização do projeto, tema institucional, aniversários, scroll-padding, gestão de equipas no Admin e página pública equipas.html.
- [2026-08-22 a 2026-08-25] Gemini: Wizard de inscrições integradas (FPB/IPDJ/Equipamentos), PDFs oficiais, reformulações no Admin e módulo de Configurações do Clube.
- [2026-08-27 a 2026-08-28] Gemini: Portais Mobile do Diretor (Drawer, multi-escalão), prevenção de duplicados de atletas, carimbo/assinatura no PDF FPB Modelo 1 e módulos de gestão desportiva/financeira no Admin.
- [2026-09-01] Gemini: Criação do Portal Mobile do Treinador (treinador.html, js/treinador.js) com chamada rápida de presenças em treinos/jogos (1 toque), consulta do Plantel & SOS (contactos rápidos dos encarregados), suporte a múltiplos escalões com alternância dinâmica, e sincronização no Admin (redirecionamento de login e afetação de equipas).
- [2026-09-01] Gemini: Correção da inicialização do Supabase em js/clube.js para carregamento dinâmico automático das configurações do Admin (contactos, redes sociais, órgãos sociais, dados gerais) e reformulação visual da secção Contactos (clube.html, style.css) em cartões separados com mapa interativo do Google Maps.
- [2026-09-01] Gemini: Implementação completa do Sistema de Notícias: Portal Mobile do Redator (redator.html, js/redator.js) com criação/edição/upload e publicação, módulo de Gestão de Notícias no Admin (admin.html, js/admin.js), script SQL setup_noticias.sql e renderização dinâmica na Home (index.html, js/main.js, style.css) com modal de leitura completa.
- [2026-09-01] Gemini: Homogeneização visual completa da Homepage (index.html, css/style.css, js/main.js, js/galeria-publica.js) com títulos de secção padronizados (.portal-section-header), novos cartões modernos para Agenda e Resultados (.portal-card, .game-schedule-item, .game-result-item) e ocultação inteligente automática de secções que não tenham conteúdo na BD.
- [2026-09-01] Gemini: Ajuste da notícia em destaque no mobile (css/style.css) posicionando a imagem no topo como banner retangular antes do conteúdo e botão de leitura.
- [2026-09-01] Gemini: Integração de Call-to-Action (CTA) direto para inscricao.html no final do modal de notícias e adição de banner panorâmico de destaque de Inscrições (#cta-inscricoes) na coluna principal visível em mobile e desktop (index.html).
- [2026-09-01] Gemini: Implementação do pré-preenchimento integral e recuperação automática de fichas de atletas (inscricao.html) para todos os 7 passos (FPB, Morada, Encarregado, Seguro, Exame Médico EMD e Equipamentos), permitindo correções/atualizações rápidas sem necessidade de preencher tudo do zero.
- [2026-09-01] Gemini: Criação da sub-aba 'História do Clube' no Admin e substituição do texto estático em clube.html/js/clube.js.
- [2026-09-03] Gemini: Remoção do texto secundário provisório da Direção na secção História de clube.html e js/clube.js.
- [2026-09-03] Gemini: Integração de envio de emails de confirmação de inscrição via Resend (Edge Function confirmacao-inscricao e trigger alternativo SQL pg_net).
- [2026-09-03] Gemini: Módulo Gestão de Patrocinadores no Admin com tabela dedicada patrocinadores_bcv (isolada do Torneio), upload de ativos (logos, painéis, redes), script setup_patrocinadores.sql e montra pública.
- [2026-09-07] Gemini: Implementação da Gestão de Plantéis N:M (equipas_atletas): atletas convocáveis para múltiplas equipas/escalões com filtros inteligentes, modal de plantel no Admin, integração em equipas.html e portais mobile (treinador/diretor).
- [2026-09-07] Gemini: Suporte a Equipa Técnica e Staff no modal de Plantel (treinador principal/adjunto, preparador, diretor, etc.), seleção e alteração inline de cargos, e destaque público em equipas.html.
- [2026-09-08] Gemini: Sincronização automática bidirecional entre Gestão de Utilizadores (users) e Treinadores/Staff (atletasbcv/equipas_atletas) com autocomplete e afetação dinâmica de escalão.
- [2026-09-08] Gemini: Portal do Treinador centrado em Equipas geridas (equipas_atletas / equipasbcv): alternância multi-equipa no topo/drawer e carregamento do plantel real convocado.
- [2026-09-08] Gemini: Sincronização da tabela Utilizadores Ativos com equipas do Plantel e aprimoramento da edição de permissões/menus por perfil.
- [2026-09-08] Gemini: Portais do Treinador e Diretor: restrição estrita a equipas vinculadas em equipas_atletas (sem fallback para escalões antigos) e estado vazio informativo.
- [2026-09-08] Gemini: Sincronização segura de Staff/Diretores em atletasbcv, evolução de Presenças para Diário Desportivo com observações, e módulo Plantel nos portais Treinador/Diretor com Ficha Individual e KPIs.
- [2026-09-09] Gemini: Substituição do tamanho de equipamento '14 anos' por 'XS' em inscricao.html, migração direta de dados legados no Supabase e atualização completa do Admin nos filtros, modal e mapas de produção.
- [2026-09-21] Gemini: Exibição de Username/Alcunha para a Equipa Técnica em equipas.html, links diretos de partilha social e correção de submenus do Drawer em noticias e equipas.
- [2026-09-25] Gemini: Implementação do Sistema de Sincronização Oficial FPB (ID 656) para Agenda/Resultados, página dedicada competicoes.html, e middleware Cloudflare Pages com Open Graph dinâmico (og:title, og:image) para partilha de notícias no Facebook/WhatsApp.
- [2026-09-25] Gemini: Simplificação do cabeçalho de competicoes.html com a remoção do card Clube Oficial FPB nº 656 e do texto descritivo longo, mantendo apenas o título Competições Oficiais.
- [2026-09-25] Gemini: Implementação de abas dinâmicas nos cards de Competições (1 - Agenda, 2 - Resultados) com expansão interativa de jogos via Supabase e eliminação do link de plantel.
- [2026-09-25] Gemini: Módulo Gestão de Competições no Admin com controlo de visibilidade Sim/Não (1 toque), KPIs, CRUD completo, persistência em clube_config e sincronização dinâmica com competicoes.html.
- [2026-09-25] Gemini: Otimização mobile de competicoes.html, e controlo de publicação Sim/Não (1 toque) com filtros e edição na Agenda e Resultados do Admin (setup_agenda_publicado.sql).
- [2026-09-27] Gemini: Remoção do card banner de destaque de inscrições (#cta-inscricoes) da homepage (index.html).
- [2026-09-27] Gemini: Anulação completa das mensalidades no Portal do Diretor (diretor.html/js) e criação do novo Portal Mobile de Pagamentos de Escalão (pagamentos.html, pagamentos.css, pagamentos.js, setup_pagamentos_escaloes.sql) com gestão por escalão (mensalidades, equipamentos, exames médicos e outros produtos), suporte multi-escalão, extrato e auditoria integrada no Admin.
- [2026-09-27] Gemini: Filtragem estrita no Portal de Pagamentos (pagamentos.js) para listar exclusivamente atletas inscritos na época ativa 2026/2027.
- [2026-09-27] Gemini: Remoção dos botões/pills de escalão do topo no Portal de Pagamentos (pagamentos.html, pagamentos.js), mantendo a alternância de múltiplos escalões exclusivamente no Drawer para um layout limpo.
- [2026-09-27] Gemini: Suporte a mensalidade 0€ (BabyBasket/isenções) sem fallback para valores padrão na tabela de quotas do Admin e Portal de Pagamentos (setup_pagamentos_itens.sql).
- [2026-09-28] Gemini: Modal de cobrança no Portal de Pagamentos com 3 opções de quota (Mensal, Bianual e Anual), pointer-events: none nas checkboxes e soma em tempo real com produtos/encargos (pagamentos.js, pagamentos.css, pagamentos.html).
- [2026-09-28] Gemini: Remoção do card de filtros (pesquisa, mês e estado) na lista de atletas de pagamentos.html para um layout limpo e direto.
- [2026-09-28] Gemini: Reformulação da aba 'Tabela de Preços' no Portal de Pagamentos (pagamentos.html, pagamentos.js) com carregamento dinâmico de quotas e produtos configurados no Admin para o escalão ativo.
- [2026-09-28] Gemini: Adição do escalão BabyBasket à lista e menu drawer no Portal de Pagamentos (pagamentos.html, js/pagamentos.js), com acesso total para administradores e persistência de seleção no localStorage.
- [2026-09-28] Gemini: Resolução do erro 'currentAtletas is not defined' na Gestão Financeira do Admin (admin.html, js/admin.js), declarando o estado no escopo global e suportando conceitos de Inscrição e Seguro.
- [2026-09-28] Gemini: Remoção do ícone de bola (🏀) da coluna Escalão e tabelas financeiras do Admin (js/admin.js) para uma visualização mais limpa sem quebras de linha.
- [2026-09-28] Gemini: Remoção do botão redundante '+ Registar' do card de Total Liquidado no modal de extrato individual do atleta (js/pagamentos.js, pagamentos.html).
- [2026-09-28] Gemini: Correção da filtragem por escalão no Admin e reformulação do filtro de serviços/produtos (Quotas, Seguro, Equipamentos, Exames EMD e Outros) em admin.html e js/admin.js.
- [2026-09-28] Gemini: Simplificação dos cartões de atleta no Portal de Pagamentos (apenas nome) e correção de atletaPags is not defined (pagamentos.js, pagamentos.html).
- [2026-09-28] Gemini: Separação estrita de género (Masculino vs Feminino) no carregamento de atletas por escalão (js/pagamentos.js, js/admin.js, admin.html), resolvendo a mistura de atletas em Sub 14, Sub 16 e Sub 18.
- [2026-09-28] Gemini: Implementação do perfil de utilizador 'Diretor & Pagamentos' no Admin (admin.html, js/admin.js), com afetação de múltiplos escalões, sincronização com staff, acesso integrado e atalhos cruzados nos menus drawer dos portais mobile (pagamentos.html, diretor.html, js/pagamentos.js, js/diretor.js).
- [2026-09-28] Gemini: Resolução crítica de login nos portais Diretor e Pagamentos (remoção de variável inexistente em diretor.js, fallback resiliente de perfil por email, alargamento de permissões/escalões padrão e fallback em admin_create_user).
- [2026-09-28] Gemini: Expansão dos seletores de escalão na criação/edição de utilizadores no Admin (admin.html, js/admin.js) para perfis Diretor, Treinador, Pagamentos e Diretor & Pagamentos, persistência em escalao_afeto e fallback automático nos portais mobile.
- [2026-09-28] Gemini: Remoção do card de equipa ativa no topo do Portal do Diretor (diretor.html, js/diretor.js), mantendo a alternância de múltiplos escalões de forma limpa no Menu Lateral (Drawer) e badge do cabeçalho.
- [2026-09-28] Gemini: Limpeza e reinicialização completa dos registos de pagamento de teste na tabela mensalidades do Supabase.
- [2026-09-28] Gemini: Correção da Tabela de Preços e cobrança (pagamentos.html, js/pagamentos.js): correspondência normalizada de escalões (eliminando divergência de género em Sub 14/16/18/Seniores), seletor dinâmico de escalão na aba e exibição correta de quotas e produtos.
- [2026-09-28] Gemini: Remoção dos escalões Sub 20, Seniores Masculinos e Seniores Femininos dos módulos de pagamentos, preçários e afetação de utilizadores (admin.html, js/admin.js, pagamentos.html, js/pagamentos.js).
- [2026-09-28] Gemini: Movimentos de Tesouraria no Portal de Pagamentos (numerário em posse, entrega e recibos), desconto de mensalidades (50% e personalizado), exclusividade de pagamento em dinheiro e acertos visuais.
- [2026-09-29 a 2026-10-01] Gemini: Geolocalização no Maps para jogos na Agenda e suporte a edição de produtos/preços de cobrança no Admin (Kit de Equipamento 60.00 €).
- [2026-10-03] Gemini: Correção da sincronização oficial de Resultados da FPB (consulta paralela a /resultados/clube_656/ e fusão inteligente de jogos).
- [2026-10-03] Gemini: Reformulação visual: Agenda/Resultados em faixas horizontais de largura total no index.html e cards de competicoes.html em lista vertical moderna.
- [2026-10-03] Gemini: Implementação da aba 'Classificação' nas competições (competicoes.html, main.js, style.css, admin.html, admin.js) com cálculo automático oficial FPB (Vitória=2pts, Derrota=1pt, J, V, D, PM, PS, DIF, PTS), destaque BCV, link direto oficial FPB por competição configurável no Admin e atualização em tempo real.
- [2026-10-03] Gemini: Eliminação de redundâncias de escalão nos cards de competições, Segmented Control responsivo e módulo completo de Gestão do Quadro da Série no Admin.
- [2026-10-03] Gemini: Exibição completa das 7 equipas da série Sub 14 Fem na Classificação, pré-carregamento automático no Admin e ferramenta 'Colar Tabela da FPB' com parser inteligente de dados federativos.
- [2026-10-03] Gemini: Correção estrutural crítica no Admin (admin.html): resolução de tag div não fechada em tab-competicoes que retinha modais (Série e Sincronização FPB) em elementos ocultos, e migração dos modais para a raiz do documento.
- [2026-10-03 a 2026-10-04] Gemini: Aba Classificação com cálculo oficial FPB, eliminação de redundâncias, correção da falsa derrota 0-20 em Sub 14 Masc, expansão da série de Sub 18 Masc (8 equipas) e Sub 16 Fem (7 equipas).
- [2026-10-04] Gemini: Suporte a links oficiais e parser multilinhas vertical para 'Colar Tabela da FPB' no Admin, com saneamento de URLs para evitar erros de base de dados na FPB.
- [2026-10-05] Gemini: Correção da exibição de resultados incompletos/adiados (eliminando 'null - null') e reposição do resultado oficial FPB (0-20) em Sub 14 Masc (id 417379).
- [2026-10-05] Gemini: Módulo de Registo de Jogos da Série no Admin e cálculo automático em tempo real da Classificação oficial FPB (jogos_serie e tabela_serie em clube_config), com importação automática de jogos do BCV e consolidação na aba de Resultados (admin.html, js/admin.js, competicoes.html, js/main.js).
- [2026-10-05] Gemini: Ocultação da aba Classificação nas competições públicas a pedido, mantendo abas Agenda e Resultados (50% no mobile) com link oficial FPB no rodapé dos cards (competicoes.html, js/main.js, css/style.css).
- [2026-10-05] Gemini: Ativação seletiva da aba 'Classificação' para o Campeonato Distrital Sub 14 Masculino (competicoes.html, js/main.js), permitindo a validação da tabela apurada e quadro oficial da série.
- [2026-10-05] Gemini: Reestruturação do layout dos cards de competição em 3 linhas unificadas (desktop e mobile): Linha 1 com o nome da competição em largura total, Linha 2 com tag da série e botão Agenda, e Linha 3 com os botões de Resultados e Classificação (main.js, style.css).
- [2026-10-05] Gemini: Uniformização da indicação 'Jornada 1' nos resultados (resultados_bcv no Supabase e consolidação dinâmica em main.js), eliminando texto residual de competição no cabeçalho do jogo do BC Valença.
- [2026-10-05] Gemini: Correção de ReferenceError em logoFora dentro de renderResultadosList (main.js) restabelecendo a abertura imediata da lista de resultados.
- [2026-10-05] Gemini: Correção do escalão do jogo CB Viana vs BC Valença (4-134) para Sub 14 Feminino no Supabase e aprimoramento de matchJogoCompeticao em main.js isolando os 4 jogos oficiais de Sub 14 Masc.
- [2026-10-05] Gemini: Ativação da aba 'Classificação' para Sub 14 Fem, Sub 16 Fem e Sub 18 Masc em competicoes.html.
- [2026-10-06] Gemini: Implementação do campo 'Inscrito FPB' (inscrito_fpb) na tabela atletasbcv com checkbox interativa de 1 toque na tabela de atletas, filtro dedicado no Admin e integração no modal de edição (admin.html, js/admin.js, setup_atleta_inscrito_fpb.sql).
- [2026-10-10] Gemini: Ajuste da Agenda e dos Resultados Recentes no index.html para exibição estrita de 1 jogo/resultado por linha (largura total), eliminando a grelha de múltiplos blocos e garantindo leitura clara e sem confusão (css/style.css).
- [2026-10-10] Gemini: Correção da fusão de jogos da FPB (mergeFPBGames) em functions/api/sync-fpb.ts, supabase/functions/sync-fpb e js/admin.js, impedindo que jogos da página de resultados sobrescrevam com null as horas oficiais do calendário, e atualização das horas na base de dados (15:00 e 21:15).
- [2026-10-10] Gemini: Agenda do index.html restrita à janela dos próximos 6 dias (hoje até hoje+6) com ordenação cronológica por data e, no mesmo dia, por hora crescente do jogo mais cedo ao mais tarde (js/main.js).
