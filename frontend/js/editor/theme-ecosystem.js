/**
 * PROFESSIONAL THEME ECOSYSTEM MANAGER
 * Organizes themes, presets, and creates harmonious combinations
 * for smooth and optimized professional presentations.
 */

/* ─── Theme Categories & Metadata ──────────────────────────────────────── */

const THEME_CATEGORIES = {
    professional: {
        name: "Professional",
        description: "Clean, corporate-focused themes for business presentations",
        icon: "fa-solid fa-briefcase",
        themes: ["editorial", "blueprint", "monograph"],
    },
    creative: {
        name: "Creative",
        description: "Modern, vibrant themes for design and creative projects",
        icon: "fa-solid fa-palette",
        themes: ["retroPop", "neon", "vivid"],
    },
    academic: {
        name: "Academic",
        description: "Professional themes for research and academic presentations",
        icon: "fa-solid fa-graduation-cap",
        themes: ["fieldnotes", "academic", "scientific"],
    },
    dark: {
        name: "Dark Mode",
        description: "Eye-friendly dark themes for evening presentations",
        icon: "fa-solid fa-moon",
        themes: ["graphite", "horizon", "chalkboard", "circuit"],
    },
    minimal: {
        name: "Minimal",
        description: "Elegant, distraction-free themes focusing on content",
        icon: "fa-solid fa-square",
        themes: ["monograph", "serene", "minimal"],
    },
};

const THEME_METADATA = {
    editorial: {
        category: "professional",
        difficulty: "beginner",
        useCases: ["corporate", "business", "reports"],
        industries: ["finance", "consulting", "tech"],
        colorScheme: "blue",
        contrast: "medium",
        energy: "calm",
    },
    blueprint: {
        category: "professional",
        difficulty: "beginner",
        useCases: ["tech", "engineering", "planning"],
        industries: ["software", "manufacturing", "architecture"],
        colorScheme: "blue",
        contrast: "high",
        energy: "technical",
    },
    fieldnotes: {
        category: "academic",
        difficulty: "intermediate",
        useCases: ["academic", "research", "educational"],
        industries: ["education", "science", "research"],
        colorScheme: "green",
        contrast: "medium",
        energy: "scholarly",
    },
    monograph: {
        category: "minimal",
        difficulty: "beginner",
        useCases: ["minimal", "focused", "portfolio"],
        industries: ["design", "publishing", "art"],
        colorScheme: "neutral",
        contrast: "high",
        energy: "calm",
    },
    graphite: {
        category: "dark",
        difficulty: "beginner",
        useCases: ["tech", "creative", "evening"],
        industries: ["software", "design", "media"],
        colorScheme: "cyan",
        contrast: "high",
        energy: "modern",
    },
    horizon: {
        category: "dark",
        difficulty: "intermediate",
        useCases: ["tech", "future-focused", "creative"],
        industries: ["startup", "tech", "innovation"],
        colorScheme: "blue",
        contrast: "high",
        energy: "futuristic",
    },
    chalkboard: {
        category: "dark",
        difficulty: "beginner",
        useCases: ["academic", "educational", "creative"],
        industries: ["education", "design", "entertainment"],
        colorScheme: "amber",
        contrast: "medium",
        energy: "warm",
    },
    circuit: {
        category: "dark",
        difficulty: "intermediate",
        useCases: ["tech", "data", "technical"],
        industries: ["tech", "engineering", "data-science"],
        colorScheme: "teal",
        contrast: "high",
        energy: "technical",
    },
};

/* ─── Preset Collections ────────────────────────────────────────────────── */

const PRESET_COLLECTIONS = {
    "title-slides": {
        name: "Title Slides",
        description: "Opening slide options for presentations",
        icon: "fa-solid fa-1",
        presets: ["title-page"],
        recommendedFor: ["corporate", "academic", "creative"],
    },
    "content-layouts": {
        name: "Content Layouts",
        description: "Flexible layouts for main content",
        icon: "fa-solid fa-grip-lines",
        presets: ["content-slide", "two-column", "blank-titled"],
        recommendedFor: ["corporate", "academic"],
    },
    "data-visualization": {
        name: "Data & Charts",
        description: "Presets for data, metrics, and visualizations",
        icon: "fa-solid fa-chart-bar",
        presets: ["results-data", "big-number", "comparison-table"],
        recommendedFor: ["corporate", "academic", "data-science"],
    },
    "media-layouts": {
        name: "Media Layouts",
        description: "Optimized layouts for images and figures",
        icon: "fa-solid fa-image",
        presets: ["image-grid", "figure-caption"],
        recommendedFor: ["academic", "creative", "portfolio"],
    },
    "story-elements": {
        name: "Story Elements",
        description: "Narrative and storytelling components",
        icon: "fa-solid fa-book",
        presets: ["quote-slide", "problem-solution", "timeline-slide"],
        recommendedFor: ["corporate", "creative", "educational"],
    },
    "closing-slides": {
        name: "Closing Slides",
        description: "End of presentation slides",
        icon: "fa-solid fa-flag",
        presets: ["thank-you", "section-divider"],
        recommendedFor: ["corporate", "academic", "creative"],
    },
};

/* ─── Professional Theme Packs (Curated Combinations) ──────────────────── */

const PROFESSIONAL_THEME_PACKS = {
    "corporate-blue": {
        name: "Corporate Blue",
        description: "Professional blue theme pack perfect for business",
        themes: ["editorial", "blueprint"],
        primaryTheme: "editorial",
        recommendedPresets: [
            "title-page",
            "content-slide",
            "two-column",
            "results-data",
            "comparison-table",
            "thank-you",
        ],
        useCase: "corporate",
        industries: ["finance", "consulting", "enterprise"],
    },
    "academic-research": {
        name: "Academic Research",
        description: "Scholarly themes for research presentations",
        themes: ["fieldnotes", "editorial"],
        primaryTheme: "fieldnotes",
        recommendedPresets: [
            "title-page",
            "content-slide",
            "figure-caption",
            "results-data",
            "quote-slide",
            "thank-you",
        ],
        useCase: "academic",
        industries: ["education", "science", "research"],
    },
    "creative-minimal": {
        name: "Creative Minimal",
        description: "Minimal elegant theme for creative work",
        themes: ["monograph", "editorial"],
        primaryTheme: "monograph",
        recommendedPresets: ["title-page", "blank-titled", "image-grid", "figure-caption", "quote-slide", "thank-you"],
        useCase: "portfolio",
        industries: ["design", "art", "creative"],
    },
    "tech-modern": {
        name: "Tech Modern",
        description: "Modern tech-focused dark themes",
        themes: ["graphite", "horizon", "circuit"],
        primaryTheme: "graphite",
        recommendedPresets: [
            "title-page",
            "content-slide",
            "big-number",
            "results-data",
            "timeline-slide",
            "thank-you",
        ],
        useCase: "tech",
        industries: ["software", "startup", "data-science"],
    },
    educational: {
        name: "Educational",
        description: "Engaging themes for educational content",
        themes: ["chalkboard", "fieldnotes"],
        primaryTheme: "chalkboard",
        recommendedPresets: [
            "title-page",
            "content-slide",
            "image-grid",
            "comparison-table",
            "quote-slide",
            "thank-you",
        ],
        useCase: "educational",
        industries: ["education", "training", "corporate-learning"],
    },
};

/* ─── Font Pairing Recommendations ──────────────────────────────────────── */

const FONT_PAIRINGS = {
    "serif-sans": {
        heading: ["Fraunces", "Newsreader", "Playfair Display"],
        body: ["Manrope", "DM Sans", "Work Sans"],
        description: "Classic pairing: serif headlines with modern sans-serif body",
        mood: "professional",
    },
    "modern-clean": {
        heading: ["Space Grotesk", "Montserrat", "Poppins"],
        body: ["Inter", "DM Sans", "Nunito"],
        description: "Contemporary pairing for modern presentations",
        mood: "contemporary",
    },
    editorial: {
        heading: ["Newsreader", "Merriweather", "Lora"],
        body: ["Manrope", "DM Sans", "Work Sans"],
        description: "Magazine-style elegant pairing",
        mood: "editorial",
    },
    minimal: {
        heading: ["Inter", "Roboto", "Work Sans"],
        body: ["Inter", "Roboto", "Nunito"],
        description: "Single font family for ultra-minimal look",
        mood: "minimal",
    },
};

/* ─── Color Harmony Tools ──────────────────────────────────────────────── */

function _getComplementaryColor(hexColor) {
    const rgb = _hexToRgb(hexColor);
    if (!rgb) return "#999999";
    return _rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

function _getAnalogousColors(hexColor, count = 3) {
    const rgb = _hexToRgb(hexColor);
    if (!rgb) return [];
    const colors = [];
    for (let i = 1; i <= count; i++) {
        const hue = (i * 30) % 360;
        colors.push(_hslToHex(_rgbToHsl(rgb.r, rgb.g, rgb.b).h + hue, 70, 50));
    }
    return colors;
}

function _getMonochromaticPalette(hexColor, count = 5) {
    const rgb = _hexToRgb(hexColor);
    if (!rgb) return [];
    const hsl = _rgbToHsl(rgb.r, rgb.g, rgb.b);
    return Array.from({ length: count }, (_, i) => {
        const lightness = 20 + (i * 60) / (count - 1);
        return _hslToHex(hsl.h, hsl.s, lightness);
    });
}

function _rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
        s,
        l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

function _hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return _rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function _rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map(x => Math.round(x).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase()
    );
}

/* ─── Theme Recommendation Engine ──────────────────────────────────────── */

function _recommendTheme(useCase, industry, preference = "professional") {
    const candidates = Object.entries(THEME_METADATA)
        .filter(([, meta]) => {
            const matchesUseCase = meta.useCases.includes(useCase);
            const matchesIndustry = meta.industries.includes(industry);
            return matchesUseCase || matchesIndustry;
        })
        .sort(([, metaA], [, metaB]) => {
            const scoreA = (metaA.useCases.includes(useCase) ? 2 : 0) + (metaA.industries.includes(industry) ? 2 : 0);
            const scoreB = (metaB.useCases.includes(useCase) ? 2 : 0) + (metaB.industries.includes(industry) ? 2 : 0);
            return scoreB - scoreA;
        });

    return candidates.length > 0 ? candidates[0][0] : "editorial";
}

function _getThemesByCategory(category) {
    return THEME_CATEGORIES[category]?.themes || [];
}

function _getPresetsByCollection(collection) {
    return PRESET_COLLECTIONS[collection]?.presets || [];
}

/* ─── Theme Compatibility Checker ──────────────────────────────────────── */

function _checkThemePresetCompatibility(themeId, presetId) {
    const meta = THEME_METADATA[themeId];
    const collection = Object.entries(PRESET_COLLECTIONS).find(([, c]) => c.presets.includes(presetId));

    if (!meta || !collection) return { compatible: true, score: 0 };

    const useCaseMatch = collection[1].recommendedFor.includes(meta.useCases[0]) ? 1 : 0.5;
    const industryMatch = collection[1].recommendedFor.some(use => meta.industries.includes(use)) ? 1 : 0.7;

    return {
        compatible: true,
        score: (useCaseMatch + industryMatch) / 2,
        recommendation: useCaseMatch === 1 ? "Perfect match" : "Good match",
    };
}

/* ─── Cache System for Performance ──────────────────────────────────────── */

const THEME_ECOSYSTEM_CACHE = {
    colorPalettes: {},
    recommendations: {},
    themeComboCache: {},
};

function _cacheColorPalette(themeId, palette) {
    THEME_ECOSYSTEM_CACHE.colorPalettes[themeId] = palette;
}

function _getCachedColorPalette(themeId) {
    return THEME_ECOSYSTEM_CACHE.colorPalettes[themeId] || null;
}

function _clearCache() {
    Object.keys(THEME_ECOSYSTEM_CACHE).forEach(key => {
        THEME_ECOSYSTEM_CACHE[key] = {};
    });
}

/* ─── Export for use in other modules ──────────────────────────────────── */

window.THEME_CATEGORIES = THEME_CATEGORIES;
window.THEME_METADATA = THEME_METADATA;
window.PRESET_COLLECTIONS = PRESET_COLLECTIONS;
window.PROFESSIONAL_THEME_PACKS = PROFESSIONAL_THEME_PACKS;
window.FONT_PAIRINGS = FONT_PAIRINGS;
window.THEME_ECOSYSTEM_CACHE = THEME_ECOSYSTEM_CACHE;

window._recommendTheme = _recommendTheme;
window._getThemesByCategory = _getThemesByCategory;
window._getPresetsByCollection = _getPresetsByCollection;
window._checkThemePresetCompatibility = _checkThemePresetCompatibility;
window._getComplementaryColor = _getComplementaryColor;
window._getAnalogousColors = _getAnalogousColors;
window._getMonochromaticPalette = _getMonochromaticPalette;
