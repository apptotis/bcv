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
- [2026-08-23] Gemini: Implementação completa da Inscrição Integrada em 3 Fases (1. Federação FPB, 2. Exame Médico Desportivo IPDJ com 20 perguntas, 3. Equipamento Oficial BCV), cálculo automático de escalão por data de nascimento, script SQL update_atletas_emd_equipamento.sql e exportação vetorial de PDF do Exame Médico Desportivo (ipdj-exame-medico.pdf) e gestão de equipamentos no Admin.
- [2026-08-23] Gemini: Otimização mobile do cabeçalho de inscricao.html (nome do clube e título em linha única, remoção do texto 'Processo Integrado' e redesenho das abas das 3 fases sem corte de texto).
- [2026-08-23] Gemini: Aumento do espaçamento e margem superior (respiro visual) entre o banner cabeçalho e as abas das fases em inscricao.html.
- [2026-08-23] Gemini: Remoção dos ícones nas abas das 3 fases em inscricao.html para garantir espaço horizontal perfeito e leitura integral dos títulos (Federação FPB, Exame Médico, Equipamento).
- [2026-08-23] Gemini: Correção da tabela de anos de nascimento para escalões (2015/2016 -> Mini 12) e implementação da barra horizontal de largura total para feedback de escalão no Passo 2.
- [2026-08-23] Gemini: Criação de script SQL unificado (setup_completo_atletasbcv_inscricoes.sql) com permissões públicas RLS (anon/auth) e suporte no inscricao.html para atualizar atletas existentes em revalidação ou criar novos.
- [2026-08-24] Gemini: Remoção do bloco de aniversariantes do dia do Dashboard no Admin (admin.html) e eliminação de toda a lógica e funções associadas em js/admin.js.
- [2026-08-24] Gemini: Implementação do sistema de permissões granulares por checkboxes de menus na Gestão de Utilizadores do Admin, criação de setup_users_permissoes.sql e adaptação da visibilidade dinâmica da sidebar em js/admin.js.
- [2026-08-24] Gemini: Reordenação dos itens da sidebar do Admin (Dashboard, Gestão de Users, Atletas, Notícias, Agenda, Resultados, Galeria, Equipas, Configurações).
- [2026-08-24] Gemini: Adição de coluna de Estado/Época na tabela de Atletas com badges visuais (Inscrito 2026/2027 vs Pendente 2025/2026) e respetivo filtro de estado em admin.html e js/admin.js.
- [2026-08-25] Gemini: Remoção da tag 'Automático' e ajuste do card de escalão atribuído em inscricao.html para duas linhas limpas (Escalão Atribuído FPB + Resultado).
- [2026-08-25] Gemini: Ativação de campos obrigatórios (required) e validação estrita no Passo 4 (Encarregado de Educação) para atletas menores de 18 anos no wizard de inscrição.
- [2026-08-25] Gemini: Integração completa da secção Encarregado de Educação no formulário/modal de Atletas do Admin e sincronização com a geração oficial de PDF da FPB.
- [2026-08-25] Gemini: Atualização do campo Associação de Basquetebol no PDF oficial FPB de 'ABVC' para 'AB Viana do Castelo'.
- [2026-08-25] Gemini: Implementação completa do módulo Configurações do Clube no Admin (admin.html, admin.js) e frontend dinâmico (clube.html, clube.js, main.js) com script SQL setup_configuracoes_clube.sql para gestão de órgãos sociais, contactos, redes sociais e dados institucionais via Supabase.
- [2026-08-27] Gemini: Correção da seleção de género no PDF oficial da FPB (js/admin.js), desmarcando explicitamente a checkbox Masculino (que vem marcada por defeito no template da federação) quando o atleta é Feminino, e aplicando desmarcação mútua a todos os grupos de checkboxes.
- [2026-08-27] Gemini: Correção da ordem dos anos da época no PDF oficial da FPB (js/admin.js), mapeando o ano inicial para o campo epoca2 (à esquerda no formulário) e o ano final para epoca1 (à direita), corrigindo a exibição de 2027/2026 para 2026/2027.
- [2026-08-27] Gemini: Adição da opção "Outro" no select de Tipo de Documento do Encarregado de Educação (Passo 4 de inscricao.html) e sincronização com o preenchimento automático.
- [2026-08-27] Gemini: Correção global dos seletores e filtros de escalão no Admin (admin.html, js/admin.js, js/equipas.js), adicionando BabyBasket e Sub 20 e implementando correspondência normalizada e resiliente a variações de grafia (ex: "Sub 14" vs "Sub-14").
- [2026-08-27] Gemini: Correção do preenchimento de Sexo (M/F) e Época no formulário de edição de Atletas, e exibição/carregamento do Número de Camisola com fallback para a 1ª opção de equipamento (equipamento_numero_1) na lista e no formulário do Admin.
- [2026-08-27] Gemini: Resolução segura de atletas por ID nos botões de ação da tabela do Admin (evitando corrupção de JSON inline) e garantia de preenchimento de todos os dados do Encarregado de Educação (nome, qualidade, tipo de doc, número de doc, validade, email, telefone).
- [2026-08-27] Gemini: Correção da abertura do popup/modal de edição de atletas garantindo a chamada a openAtletaModal() e remoção da classe hidden ao clicar no botão Editar.
- [2026-08-27] Gemini: Implementação completa do módulo Gestão de Equipamentos no Admin (admin.html, js/admin.js) com dashboard de totais e tamanhos de camisola/calção, filtros combinados em tempo real (escalão, género, época, tamanhos, pesquisa) e exportação em PDF oficial (A4 Paisagem com pdf-lib) e CSV.
- [2026-08-27] Gemini: Transformação do modal de atleta (#form-atleta-container) em componente global no Admin e expansão de window.editAtleta para consultar tanto currentAtletas como currentEquipamentos, permitindo editar atletas a partir de qualquer ecrã/tab.
- [2026-08-27] Gemini: Implementação completa do Portal Mobile do Diretor de Campo (diretor.html, css/diretor.css, js/diretor.js) para chamada de presenças em treinos/jogos com 1 toque, cobrança e registo de mensalidades, contactos de emergência (SOS Encarregados), afetação automática de escalão por utilizador no Admin, e script SQL setup_diretores_presencas_mensalidades.sql.
- [2026-08-27] Gemini: Modernização da navegação do Portal do Diretor (diretor.html, css/diretor.css, js/diretor.js), substituindo os botões fixos inferiores por um Menu Hambúrguer lateral (Drawer) no cabeçalho, libertando espaço vertical no ecrã e preparando a estrutura para futuras funcionalidades.
- [2026-08-27] Gemini: Implementação de suporte a múltiplos escalões por utilizador/diretor (checkboxes no Admin) e seletor dinâmico de equipa ativa no Portal Mobile com alternância com 1 toque no topo e no drawer.
- [2026-08-27] Gemini: Resolução do corte de nomes longos de atletas com quebra de linha fluida, reformulação vertical do cartão de cobrança com botão de registo em largura total abaixo do número, e suporte integrado a Quota Anual Completa (250€) com deteção automática em todos os meses da época.
- [2026-08-27] Gemini: Implementação completa dos novos módulos no Admin: Gestão Desportiva (KPIs de assiduidade, presenças/faltas/justificados/lesionados, filtros múltiplos e exportação CSV/PDF) e Gestão Financeira (Tabela de preços por escalão, registo global de pagamentos com rastreio de recetor, modal de lançamento no admin e exportação CSV/PDF).
- [2026-08-27] Gemini: Prevenção proativa e inteligente de atletas duplicados no formulário de inscrição (inscricao.html) com alerta em tempo real no Passo 2 e interceção automática pré-insert na submissão, além do script SQL resolver_duplicados_atletas.sql para auditoria e fusão automática no Supabase.
- [2026-08-27] Gemini: Atualização da Gestão de Equipamentos no Admin para apresentar por defeito apenas os atletas inscritos na época atual (2026/2027), mantendo a opção de consulta de outras épocas no filtro.
- [2026-08-28] Gemini: Correção de erro de sintaxe JavaScript em inscricao.html (chaveta de fecho no autocomplete) que bloqueava a execução do script e impedia o botão 'Iniciar Inscrição' de avançar de passo.

