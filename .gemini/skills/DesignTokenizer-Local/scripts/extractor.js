/**
 * DesignTokenizer-Local Extractor Script
 * Version: 1.0.0
 * Purpose: Extract visual tokens from DOM and Computed Styles.
 */

(function() {
    function getContrastYIQ(hexcolor){
        hexcolor = hexcolor.replace("#", "");
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);
        var yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent' || rgb.startsWith('rgba(0, 0, 0, 0)')) return null;
        let parts = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) || rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
        if (!parts) return null;
        delete(parts[0]);
        for (let i = 1; i <= 3; ++i) {
            parts[i] = parseInt(parts[i]).toString(16);
            if (parts[i].length == 1) parts[i] = '0' + parts[i];
        }
        return '#' + parts.join('');
    }

    const tokens = {
        meta: {
            url: window.location.href,
            timestamp: new Date().toISOString()
        },
        colors: {
            primary: null,
            secondary: null,
            background: null,
            surface: null,
            text: null,
            palette: []
        },
        typography: {
            fontFamily: [],
            scales: {},
            weights: []
        },
        spacing: {
            padding: [],
            margin: []
        },
        effects: {
            borderRadius: [],
            boxShadow: []
        }
    };

    // 1. Color Frequency Analysis
    const colorCounts = {};
    const bgCounts = {};
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = rgbToHex(style.color);
        const bgColor = rgbToHex(style.backgroundColor);
        
        if (color) colorCounts[color] = (colorCounts[color] || 0) + 1;
        if (bgColor) bgCounts[bgColor] = (bgCounts[bgColor] || 0) + 1;
    });

    const sortedBg = Object.entries(bgCounts).sort((a, b) => b[1] - a[1]);
    const sortedColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);

    tokens.colors.background = sortedBg[0] ? sortedBg[0][0] : null;
    tokens.colors.text = sortedColor[0] ? sortedColor[0][0] : null;
    
    // Find Primary (Most frequent non-background/non-text color in interactive elements)
    const interactiveElements = document.querySelectorAll('button, a, .btn, .button, nav');
    const primaryCounts = {};
    interactiveElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = rgbToHex(style.backgroundColor);
        if (bg && bg !== tokens.colors.background) {
            primaryCounts[bg] = (primaryCounts[bg] || 0) + 1;
        }
    });
    const sortedPrimary = Object.entries(primaryCounts).sort((a, b) => b[1] - a[1]);
    tokens.colors.primary = sortedPrimary[0] ? sortedPrimary[0][0] : null;
    tokens.colors.secondary = sortedPrimary[1] ? sortedPrimary[1][0] : null;
    
    tokens.colors.palette = sortedBg.slice(0, 10).map(i => i[0]);

    // 2. Typography
    const fonts = new Set();
    const weights = new Set();
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    headings.forEach(tag => {
        const el = document.querySelector(tag);
        if (el) {
            const style = window.getComputedStyle(el);
            fonts.add(style.fontFamily);
            weights.add(style.fontWeight);
            tokens.typography.scales[tag] = {
                size: style.fontSize,
                lineHeight: style.lineHeight
            };
        }
    });
    tokens.typography.fontFamily = Array.from(fonts);
    tokens.typography.weights = Array.from(weights);

    // 3. Spacing & Effects
    const radius = new Set();
    const shadows = new Set();
    document.querySelectorAll('button, input, select, [class*="card"], [class*="box"]').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.borderRadius !== '0px') radius.add(style.borderRadius);
        if (style.boxShadow !== 'none') shadows.add(style.boxShadow);
    });
    tokens.effects.borderRadius = Array.from(radius).slice(0, 5);
    tokens.effects.boxShadow = Array.from(shadows).slice(0, 3);

    return tokens;
})();
