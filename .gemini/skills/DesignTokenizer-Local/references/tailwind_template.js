/**
 * DesignTokenizer-Local Output Template
 * Use this to map JSON tokens to Tailwind configuration.
 */

const generateTailwindConfig = (tokens) => {
  return `
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "${tokens.colors.primary || '#000000'}",
        secondary: "${tokens.colors.secondary || '#ffffff'}",
        background: "${tokens.colors.background || '#ffffff'}",
        surface: "${tokens.colors.surface || '#f9f9f9'}",
        text: "${tokens.colors.text || '#111111'}",
        // Palette: ${tokens.colors.palette.join(', ')}
      },
      fontFamily: {
        sans: [${tokens.typography.fontFamily.map(f => `"${f}"`).join(', ')}, "sans-serif"],
      },
      borderRadius: {
        ${tokens.effects.borderRadius.map((r, i) => `'custom-${i}': '${r}'`).join(',\n        ')}
      },
      boxShadow: {
        ${tokens.effects.boxShadow.map((s, i) => `'custom-${i}': '${s}'`).join(',\n        ')}
      }
    }
  }
}
  `.trim();
};

module.exports = generateTailwindConfig;
