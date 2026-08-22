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
- [2026-05-07] Gemini: Criação do AGENTS.md e definição da stack.
- [2026-05-08] Gemini: Reversão da galeria do torneio e implementação de slider de ecrã inteiro.
- [2026-05-09] Gemini: Implementação da Gestão de Atletas no Admin.
- [2026-05-10] Gemini: Adição de aniversariantes e barra de pesquisa no Admin.
- [2026-05-11] Gemini: Reestruturação da Home (Agenda e Resultados lado a lado).
- [2026-05-11] Gemini: Transformação das Notícias no elemento central (`card-featured`).
- [2026-05-11] Gemini: Otimização da Navbar mobile e remoção de ícones excessivos no banner.
- [2026-05-11] Gemini: Implementação do Popup Automático de Aniversariantes (Modal) e remoção do card fixo.
- [2026-05-12] Gemini: Reformulação Radical para Tema Claro Institucional (Roxo Sólido, Base Branca).
- [2026-05-12] Gemini: Implementação de Sub-menu (Dropdown) para a secção Clube.
- [2026-05-12] Gemini: Simplificação do Hero da página Clube (apenas emblema).
- [2026-05-13] Gemini: Substituição global do logo (Logo_bcv.jpg -> emblema_png.png).
- [2026-05-14] Gemini: Remoção de ícones decorativos (Agenda, Taça, Megafone) nos títulos dos cards.
- [2026-05-24] Gemini: Criação de protótipo de design (teste-design.html/css) com logo centrado e menu drawer lateral.
- [2026-05-24] Gemini: Ajuste do tamanho da fonte do menu, texto do cabeçalho do drawer para 'BCV', correção do emblema e adição do botão fechar no drawer.
- [2026-05-24] Gemini: Migração completa do cabeçalho clássico do index.html para o modelo centrado com drawer lateral interativo de teste-design.
- [2026-05-24] Gemini: Remoção do display:none nas redes sociais no mobile da navbar para manter visibilidade em todos os ecrãs.
- [2026-05-24] Gemini: Alinhamento do cabeçalho do drawer menu em linha única (emblema + BCV + botão fechar) e redução do padding superior para economizar espaço.
- [2026-05-27] Gemini: Simplificação do modal de aniversários (index.html) com fotos quadradas sem recorte, remoção da idade e dos textos fixos repetidos, exibição de "PARABÉNS, [Nickname/Nome]" no topo, e integração do campo Nickname no Admin e DB.
- [2026-05-27] Gemini: Alinhamento horizontal (display: flex) do logo e nome no rodapé em desktop para index.html e clube.html.
- [2026-05-27] Gemini: Reformulação visual do Admin (admin.html, admin.css) para tema claro (ambiente de trabalho branco, sidebar roxa escura, e cards/tabelas em cinza contrastante), remoção da barra superior, integração do botão de logout na sidebar, correção de contraste no dashboard de aniversariantes, e correção do bug "null" no título de edição do utilizador.
- [2026-05-27] Gemini: Correção da cor do ícone de dropdown (abertura do sub-menu O Clube) no menu lateral de preto para branco em style.css e teste-design.css.
- [2026-05-27] Gemini: Adicionado scroll-padding-top para evitar que o topo das secções seja ocultado sob a navbar fixa ao navegar pelos links do menu no mobile, e ajustado o margin-top do banner de aniversários em clube.html para evitar sobreposição inicial.
- [2026-06-04] Gemini: Remoção completa da aba, menu e lógica JavaScript relacionados ao "Sincronizar FPB" da página admin.
- [2026-06-04] Gemini: Atualização do formulário e tabela de Atletas no Admin para incluir os novos campos (epoca, funcao, equipafpb, equipabcv1, equipabcv2).
- [2026-06-04] Gemini: Criação completa do módulo Gestão de Equipas BCV no Admin, incluindo CRUD na tabela equipasbcv com upload de foto.
- [2026-06-04] Gemini: Criação da página pública Equipas (equipas.html) com listagem das equipas da época atual.
- [2026-06-04] Gemini: Correção de bug no menu lateral que limitava a exibição da lista de equipas e remoção do link genérico 'Todas as Equipas'.
- [2026-06-04] Gemini: Reformulação da visualização de Plantel na página Equipas (equipas.html) para exibir um detalhe focado na equipa selecionada, com cartões individuais de jogador (foto, número, alcunha).
- [2026-08-22] Gemini: Criação da página mobile inscricao.html (Formulário por Passos / Wizard para época 2026/2027), criação do script update_atletas_fpb_schema.sql com campos do Modelo 1 da FPB, e adição de botão para exportação em PDF da ficha oficial FPB na Gestão de Atletas do Admin.
- [2026-08-22] Gemini: Melhorias no inscricao.html (banner recto sem cantos arredondados, autocomplete ao pesquisar atleta em tempo real e validação nativa de campos obrigatórios ao avançar de passo no wizard).
- [2026-08-22] Gemini: Correção de erro na submissão de inscrição enviando valores predefinidos para colunas com restrição NOT NULL (equipafpb, escalao, funcao).
- [2026-08-22] Gemini: Ocultação por defeito do formulário/card 'Adicionar Novo Atleta' na aba Atletas do Admin e resolução da geração de PDF em branco no html2pdf anexando o container ao DOM.
- [2026-08-22] Gemini: Implementação completa da exportação em PDF do Modelo 1 da FPB no Admin usando a biblioteca pdf-lib, preenchendo de forma vetorial e nativa os campos interativos oficiais (AcroForm) do ficheiro assets/Modelo_1_FPB.pdf com os dados do atleta.
- [2026-08-23] Gemini: Remoção do campo 'Alcunha / Nome de Camisola (Nickname)' do Passo 2 (Identificação do Atleta) e limpeza do preenchimento e payload no formulário inscricao.html.
