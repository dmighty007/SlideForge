
const FONT_FAMILIES = [
    '"Fraunces", serif',
    '"Newsreader", serif',
    '"Manrope", sans-serif',
    '"DM Sans", sans-serif',
    '"Work Sans", sans-serif',
    '"Space Grotesk", sans-serif',
    '"Montserrat", sans-serif',
    "Inter, sans-serif",
    "Roboto, sans-serif",
    "Oswald, sans-serif",
];

const PRESENTATION_THEMES = {
    editorial: {
        label: "Editorial",
        revealTheme: "white",
        headingFont: '"Newsreader", serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#172033",
        defaultMutedColor: "#667085",
        defaultShapeColor: "#2f5bea",
        accentStrong: "#2563eb",
        accentSoft: "rgba(37, 99, 235, 0.12)",
        surfaceColor: "rgba(255, 255, 255, 0.72)",
        surfaceBorder: "rgba(23, 32, 51, 0.10)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 12% 14%, rgba(37, 99, 235, 0.12), transparent 22%), radial-gradient(circle at 88% 18%, rgba(148, 163, 184, 0.16), transparent 24%), linear-gradient(180deg, #fcfbf7 0%, #f4efe6 100%)",
            "--slide-fg": "#172033",
            "--slide-muted": "#667085",
            "--slide-accent": "#2563eb",
            "--slide-accent-2": "#94a3b8",
            "--slide-grid": "rgba(23,32,51,0.06)",
            "--editor-accent": "#2563eb",
            "--editor-accent-soft": "rgba(37,99,235,0.16)",
        },
    },
    blueprint: {
        label: "Blueprint",
        revealTheme: "white",
        headingFont: '"Space Grotesk", sans-serif',
        bodyFont: '"DM Sans", sans-serif',
        defaultTextColor: "#10233b",
        defaultMutedColor: "#5f7287",
        defaultShapeColor: "#1d4ed8",
        accentStrong: "#2563eb",
        accentSoft: "rgba(37, 99, 235, 0.12)",
        surfaceColor: "rgba(255, 255, 255, 0.78)",
        surfaceBorder: "rgba(29, 78, 216, 0.12)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 82% 16%, rgba(37,99,235,0.08), transparent 20%), repeating-linear-gradient(90deg, rgba(37,99,235,0.05) 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, rgba(37,99,235,0.05) 0 1px, transparent 1px 56px), linear-gradient(180deg, #fbfdff 0%, #f2f7fc 100%)",
            "--slide-fg": "#10233b",
            "--slide-muted": "#5f7287",
            "--slide-accent": "#2563eb",
            "--slide-accent-2": "#0f766e",
            "--slide-grid": "rgba(37,99,235,0.08)",
            "--editor-accent": "#2563eb",
            "--editor-accent-soft": "rgba(37,99,235,0.16)",
        },
    },
    fieldnotes: {
        label: "Field Notes",
        revealTheme: "white",
        headingFont: '"Fraunces", serif',
        bodyFont: '"Work Sans", sans-serif',
        defaultTextColor: "#2f261d",
        defaultMutedColor: "#6f6559",
        defaultShapeColor: "#5f7f52",
        accentStrong: "#7a8f47",
        accentSoft: "rgba(122, 143, 71, 0.12)",
        surfaceColor: "rgba(255, 249, 238, 0.72)",
        surfaceBorder: "rgba(47, 38, 29, 0.10)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 82% 18%, rgba(122, 143, 71, 0.12), transparent 22%), radial-gradient(circle at 16% 86%, rgba(180, 138, 74, 0.10), transparent 24%), linear-gradient(180deg, #f8f2e7 0%, #efe5d3 100%)",
            "--slide-fg": "#2f261d",
            "--slide-muted": "#6f6559",
            "--slide-accent": "#7a8f47",
            "--slide-accent-2": "#b48a4a",
            "--slide-grid": "rgba(47,38,29,0.06)",
            "--editor-accent": "#7a8f47",
            "--editor-accent-soft": "rgba(122,143,71,0.16)",
        },
    },
    monograph: {
        label: "Monograph",
        revealTheme: "white",
        headingFont: '"Fraunces", serif',
        bodyFont: '"DM Sans", sans-serif',
        defaultTextColor: "#171717",
        defaultMutedColor: "#6b7280",
        defaultShapeColor: "#374151",
        accentStrong: "#1f2937",
        accentSoft: "rgba(31, 41, 55, 0.08)",
        surfaceColor: "rgba(255, 255, 255, 0.80)",
        surfaceBorder: "rgba(23, 23, 23, 0.10)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 86% 12%, rgba(17, 24, 39, 0.06), transparent 20%), linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
            "--slide-fg": "#171717",
            "--slide-muted": "#6b7280",
            "--slide-accent": "#1f2937",
            "--slide-accent-2": "#9ca3af",
            "--slide-grid": "rgba(17,24,39,0.06)",
            "--editor-accent": "#1f2937",
            "--editor-accent-soft": "rgba(31,41,55,0.14)",
        },
    },
    graphite: {
        label: "Graphite",
        revealTheme: "black",
        headingFont: '"Manrope", sans-serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#f5f7fb",
        defaultMutedColor: "#94a3b8",
        defaultShapeColor: "#38bdf8",
        accentStrong: "#22d3ee",
        accentSoft: "rgba(34, 211, 238, 0.14)",
        surfaceColor: "rgba(255, 255, 255, 0.06)",
        surfaceBorder: "rgba(226, 232, 240, 0.14)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 84% 14%, rgba(34, 211, 238, 0.14), transparent 22%), radial-gradient(circle at 18% 78%, rgba(59, 130, 246, 0.10), transparent 24%), linear-gradient(155deg, #0b1020 0%, #141b2d 54%, #1f2937 100%)",
            "--slide-fg": "#f5f7fb",
            "--slide-muted": "#94a3b8",
            "--slide-accent": "#22d3ee",
            "--slide-accent-2": "#38bdf8",
            "--slide-grid": "rgba(255,255,255,0.05)",
            "--editor-accent": "#22d3ee",
            "--editor-accent-soft": "rgba(34,211,238,0.16)",
        },
    },
    horizon: {
        label: "Horizon",
        revealTheme: "black",
        headingFont: '"Montserrat", sans-serif',
        bodyFont: '"Space Grotesk", sans-serif',
        defaultTextColor: "#eef4ff",
        defaultMutedColor: "#afbdd6",
        defaultShapeColor: "#4f7cff",
        accentStrong: "#7dd3fc",
        accentSoft: "rgba(125, 211, 252, 0.14)",
        surfaceColor: "rgba(255, 255, 255, 0.07)",
        surfaceBorder: "rgba(238, 244, 255, 0.14)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 18% 16%, rgba(125, 211, 252, 0.10), transparent 22%), radial-gradient(circle at 82% 82%, rgba(79, 124, 255, 0.16), transparent 24%), linear-gradient(150deg, #07111f 0%, #0c2140 52%, #163563 100%)",
            "--slide-fg": "#eef4ff",
            "--slide-muted": "#afbdd6",
            "--slide-accent": "#7dd3fc",
            "--slide-accent-2": "#4f7cff",
            "--slide-grid": "rgba(255,255,255,0.05)",
            "--editor-accent": "#7dd3fc",
            "--editor-accent-soft": "rgba(125,211,252,0.16)",
        },
    },
};

function normalizeFont(fontFamily, weight, size, theme) {
    const numericWeight = Number(weight) || 400;
    const numericSize = parseFloat(size) || 0;
    const isKnown = FONT_FAMILIES.includes(fontFamily);
    if (!isKnown) return fontFamily;
    return numericWeight >= 700 || numericSize >= 42 ? theme.headingFont : theme.bodyFont;
}

function classifyColor(color, theme) {
    const normalized = String(color || "").trim().toLowerCase();
    if (!normalized) return "keep";

    const lightText = new Set([
        "#ffffff",
        "#f8fafc",
        "#f5f7fb",
        "#eef4ff",
        "#172033",
        "#10233b",
        "#2f261d",
        "#171717",
        theme.defaultTextColor.toLowerCase(),
    ]);
    if (lightText.has(normalized)) return "text";

    const mutedText = new Set([
        "#94a3b8",
        "#64748b",
        "#667085",
        "#5f7287",
        "#6f6559",
        "#6b7280",
        "#afbdd6",
        theme.defaultMutedColor.toLowerCase(),
    ]);
    if (mutedText.has(normalized)) return "muted";

    const accentish = new Set([
        "#3b82f6",
        "#2563eb",
        "#1d4ed8",
        "#7a8f47",
        "#1f2937",
        "#22d3ee",
        "#7dd3fc",
        "#64748b",
        theme.defaultShapeColor.toLowerCase(),
        theme.accentStrong.toLowerCase(),
    ]);
    if (accentish.has(normalized)) return "accent";

    return "keep";
}

function getPresentationTheme(themeId = state.presentationTheme) {
    return PRESENTATION_THEMES[themeId] || PRESENTATION_THEMES.editorial;
}

function applyPresentationTheme(themeId, { persist = true } = {}) {
    const safeThemeId = PRESENTATION_THEMES[themeId] ? themeId : "editorial";
    const theme = PRESENTATION_THEMES[safeThemeId];
    const root = document.documentElement;

    if (persist) {
        state.presentationTheme = safeThemeId;
    }

    document.body.dataset.presentationTheme = safeThemeId;
    Object.entries(theme.cssVars).forEach(([key, value]) => root.style.setProperty(key, value));

    const revealTheme = document.getElementById("reveal-theme");
    if (revealTheme) {
        revealTheme.href = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/theme/${theme.revealTheme}.min.css`;
    }
}

function retintPresentationTheme(previousThemeId, nextThemeId) {
    const previousTheme = getPresentationTheme(previousThemeId);
    const nextTheme = getPresentationTheme(nextThemeId);

    state.slides.forEach(slide => {
        (slide.elements || []).forEach(el => {
            if (!el || !el.styles) return;
            if (el.themeManaged === false) return;

            if (el.type === "text") {
                el.styles.fontFamily = normalizeFont(el.styles.fontFamily, el.styles.fontWeight, el.styles.fontSize, nextTheme);

                const colorKind = classifyColor(el.styles.color, previousTheme);
                if (colorKind === "text") el.styles.color = nextTheme.defaultTextColor;
                if (colorKind === "muted") el.styles.color = nextTheme.defaultMutedColor;
                if (colorKind === "accent") el.styles.color = nextTheme.accentStrong;
            }

            if (el.type === "shape") {
                const bgKind = classifyColor(el.styles.backgroundColor, previousTheme);
                if (bgKind === "accent") el.styles.backgroundColor = nextTheme.defaultShapeColor;
                if (bgKind === "muted") el.styles.backgroundColor = nextTheme.surfaceColor;
            }

            if (el.type === "connector") {
                const strokeKind = classifyColor(el.styles.color, previousTheme);
                if (strokeKind === "accent") el.styles.color = nextTheme.accentStrong;
                if (strokeKind === "muted") el.styles.color = nextTheme.defaultMutedColor;
                if (strokeKind === "text") el.styles.color = nextTheme.defaultTextColor;
            }

            if (el.styles.border) {
                el.styles.border = `1px solid ${nextTheme.surfaceBorder}`;
            }
        });
    });

    state.presentationTheme = nextThemeId;
}
