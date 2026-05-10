# Projeto: Basket Club de Valença (BCV)

## Stack Técnica
- Frontend: HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
- Backend/DB: Supabase (herdado do torneio)
- Deploy: Cloudflare Pages
- Versionamento: Git / GitHub

## Estrutura do Projeto
- `/torneio-eurocidade/`: Site dedicado ao Torneio (movido durante a refatoração).
- `/`: Novo site principal institucional do BCV.

## Regras e Padrões
- UI/UX Premium: Uso de cores vibrantes, contrastes, animações suaves e design focado no utilizador. Sem Tailwind (Vanilla CSS).
- Múltiplos agentes (Gemini, Claude, Codex) mantêm este ficheiro como Single Source of Truth (SSOT).

## Histórico de Atualizações
- [2026-05-07] Gemini: Criação do AGENTS.md, definição da stack (HTML/CSS/JS) e início da separação de pastas.
- [2026-05-08] Gemini: Reversão da galeria do torneio-eurocidade para abrir o slider de fotos diretamente; Implementação do mesmo slider de ecrã inteiro na galeria da raiz (index.html).
- [2026-05-08] Gemini: Transformação do `index.html` num Portal com 2 colunas (Main Content + Sidebar para anúncios) e criação do banner de 30 anos. Secção "O Clube" movida para uma nova página exclusiva `clube.html` com História, Órgãos Sociais e Contactos.
- [2026-05-09] Gemini: Implementação da página de Gestão de Atletas na área de administração (`admin.html` e `admin.js`), seguindo o layout existente de galeria e utilizadores, com CRUD completo ligado ao Supabase.
- [2026-05-10] Gemini: Adição do card de Aniversariantes do Dia no Dashboard Principal, listando quem faz anos na data atual com base na tabela `atletasbcv`.
- [2026-05-10] Gemini: Remoção do card genérico de Boas-vindas do Dashboard a pedido do utilizador.
- [2026-05-10] Gemini: Adição de uma barra de pesquisa na tab de Gestão de Atletas para filtrar a tabela em tempo real (por nome, equipa ou licença).
- [2026-05-10] Gemini: Atualização do `index.html` (Portal). Remoção do Hero Banner e adição de dois cards principais (Agenda Desportiva na coluna principal e Aniversariantes do Dia no topo da barra lateral) com respetiva lógica de consulta ao Supabase no `main.js`.
- [2026-05-11] Gemini: Movimentação do bloco de "Notícias do Clube" para a coluna principal. Criação do card "Resultados Desportivos" (ligado à tabela `resultados`) entre a Agenda Desportiva e as Notícias do Clube na página inicial.
