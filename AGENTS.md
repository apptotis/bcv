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
- [2026-09-28] Gemini: Melhorias no Portal de Pagamentos (preçários, BabyBasket, eliminação de bola 🏀, separação por género, perfil Diretor & Pagamentos e tesouraria).
- [2026-09-29 a 2026-10-01] Gemini: Geolocalização no Maps para jogos na Agenda e suporte a edição de produtos/preços de cobrança no Admin (Kit de Equipamento 60.00 €).
- [2026-10-03 a 2026-10-05] Gemini: Implementação e apuramento oficial FPB das Séries/Classificação (admin.html, competicoes.html, main.js, style.css), módulo de jogos da série, importação inteligente e layout responsivo unificado em 3 linhas.
- [2026-10-06] Gemini: Implementação do campo 'Inscrito FPB' (inscrito_fpb) na tabela atletasbcv com checkbox interativa de 1 toque no Admin.
- [2026-10-10] Gemini: Agenda e Resultados com 1 item/linha em largura total, preservação da hora oficial FPB, janela de 6 dias ordenada por hora crescente e otimização mobile.
- [2026-10-11] Gemini: Correção do cálculo de pontuação federativa do Famalicense AC (Vitória=2pts, Derrota=1pt, eliminando falsa pontuação 0 para 20-0), ordenação correta por PTS/DIF no modal e competições públicas (admin.html, js/admin.js, competicoes.html, js/main.js, index.html).
- [2026-10-11] Gemini: Ativação da aba e modal de Classificação Oficial para os Seniores Masculinos (CN2) em competicoes.html e js/main.js, com catálogo de equipas da série e suporte no Admin (js/admin.js).
- [2026-10-11] Gemini: Mapeamento oficial dos 14 logótipos federativos FPB para todas as equipas do CN2 (FPB_CLUB_LOGOS em js/main.js e js/admin.js), suporte no modal de série e enriquecimento direto na BD Supabase.
- [2026-10-11] Gemini: Alinhamento dos filtros e formulários de Resultados e Agenda no Admin com os escalões reais do BCV (BabyBasket, Minis, Sub 14 M/F, Sub 16 F, Sub 18 M, Seniores), eliminação de escalões obsoletos (Sub 20, Veteranos), filtragem resiliente por género e badges coloridos.

