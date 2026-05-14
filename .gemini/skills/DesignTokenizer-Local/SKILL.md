---
name: DesignTokenizer-Local
description: "Analisa uma URL para extrair identidade visual e gerar tokens de design (JSON e Tailwind)."
category: automation
risk: low
source: local
date_added: "2026-05-14"
metadata:
  triggers: "extrair design, design tokens, tokenize url, capturar tema, identidade visual"
  scope: "local-project-only"
  privacy: "private-no-global-sync"
---

# DesignTokenizer-Local

Esta skill automatiza a extração de tokens de design de um site existente para acelerar o desenvolvimento de interfaces consistentes.

## 🚀 Como Usar

1. O usuário fornece uma URL.
2. Invoque o `browser_subagent` com a tarefa de abrir a URL e executar o script de extração.
3. Processe os dados retornados para gerar o JSON e a configuração Tailwind.

## 🛠️ Lógica de Captura (Injetar via Console)

```javascript
(function() {
  const tokens = {
    colors: {},
    typography: {},
    effects: {},
    spacing: {},
    headings: {}
  };

  // 1. Extrair variáveis :root
  const rootStyles = getComputedStyle(document.documentElement);
  const rootVariables = Array.from(document.styleSheets)
    .filter(sheet => {
      try { return sheet.cssRules; } catch(e) { return false; }
    })
    .flatMap(sheet => Array.from(sheet.cssRules))
    .filter(rule => rule.selectorText === ':root')
    .flatMap(rule => rule.style.cssText.split(';'))
    .filter(prop => prop.trim().startsWith('--'))
    .forEach(prop => {
      const [key, value] = prop.split(':').map(s => s.trim());
      tokens.colors[key] = value;
    });

  // 2. Extrair Tipografia de elementos chave
  const h1 = document.querySelector('h1');
  if (h1) {
    const style = getComputedStyle(h1);
    tokens.typography.fontFamily = style.fontFamily;
    tokens.typography.baseWeight = style.fontWeight;
  }

  // 3. Hierarquia de Headings
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const el = document.querySelector(tag);
    if (el) {
      const style = getComputedStyle(el);
      tokens.headings[tag] = {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight
      };
    }
  });

  // 4. Efeitos Comuns (Border Radius, Box Shadow)
  const cards = document.querySelectorAll('div[class*="card"], section, button');
  const radiusSet = new Set();
  const shadowSet = new Set();
  cards.forEach(el => {
    const style = getComputedStyle(el);
    if (style.borderRadius !== '0px') radiusSet.add(style.borderRadius);
    if (style.boxShadow !== 'none') shadowSet.add(style.boxShadow);
  });
  tokens.effects.borderRadius = Array.from(radiusSet).slice(0, 3);
  tokens.effects.boxShadow = Array.from(shadowSet).slice(0, 3);

  return JSON.stringify(tokens, null, 2);
})();
```

## 📋 Regras de Saída

- **JSON Estruturado**: Salvar em `.gemini/output/design-tokens.json`.
- **Tailwind Config**: Gerar um bloco `module.exports = { theme: { extend: { ... } } }`.
- **Privacidade**: Limpar histórico do browser após execução. Não enviar para log global.

## ⚠️ Restrições
- Não compartilhar dados entre projetos.
- Limpar cache local após cada análise bem-sucedida.
