
const FONT_FAMILIES = [
    '"Times New Roman", Times, serif',
    "Arial, sans-serif",
    '"Fraunces", serif',
    '"Newsreader", serif',
    '"Playfair Display", serif',
    '"Merriweather", serif',
    '"Lora", serif',
    '"Manrope", sans-serif',
    '"DM Sans", sans-serif',
    '"Work Sans", sans-serif',
    '"Space Grotesk", sans-serif',
    '"Montserrat", sans-serif',
    '"Poppins", sans-serif',
    '"Nunito", sans-serif',
    "Inter, sans-serif",
    "Roboto, sans-serif",
    "Oswald, sans-serif",
    '"Fredoka", sans-serif',
    '"Comic Neue", cursive',
    '"Caveat", cursive',
    '"Permanent Marker", cursive',
    '"Bangers", cursive',
    '"Shrikhand", cursive',
];

const FONT_MENU_OPTIONS = [
    { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Manrope", value: '"Manrope", sans-serif' },
    { label: "DM Sans", value: '"DM Sans", sans-serif' },
    { label: "Work Sans", value: '"Work Sans", sans-serif' },
    { label: "Space Grotesk", value: '"Space Grotesk", sans-serif' },
    { label: "Montserrat", value: '"Montserrat", sans-serif' },
    { label: "Poppins", value: '"Poppins", sans-serif' },
    { label: "Nunito", value: '"Nunito", sans-serif' },
    { label: "Fraunces", value: '"Fraunces", serif' },
    { label: "Newsreader", value: '"Newsreader", serif' },
    { label: "Playfair Display", value: '"Playfair Display", serif' },
    { label: "Merriweather", value: '"Merriweather", serif' },
    { label: "Lora", value: '"Lora", serif' },
    { label: "Fredoka", value: '"Fredoka", sans-serif' },
    { label: "Comic Neue", value: '"Comic Neue", cursive' },
    { label: "Caveat", value: '"Caveat", cursive' },
    { label: "Permanent Marker", value: '"Permanent Marker", cursive' },
    { label: "Bangers", value: '"Bangers", cursive' },
    { label: "Shrikhand", value: '"Shrikhand", cursive' },
];

function buildFontOptions(selectedFont = "") {
    const normalizedSelected = normalizeFontFamily(selectedFont);
    return FONT_MENU_OPTIONS.map(font => {
        const selected = normalizeFontFamily(font.value) === normalizedSelected ? "selected" : "";
        return `<option value="${escapeHtml(font.value)}" ${selected}>${escapeHtml(font.label)}</option>`;
    }).join("");
}

const PRESENTATION_THEMES = {
    editorial: {
        label: "Editorial",
        revealTheme: "white",
        headingFont: '"Newsreader", serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#2E2E2E",
        defaultMutedColor: "#6B7280",
        defaultShapeColor: "#A7C7E7",
        accentStrong: "#3B82F6",
        accentSoft: "rgba(59, 130, 246, 0.12)",
        surfaceColor: "rgba(248, 250, 252, 0.88)",
        surfaceBorder: "rgba(209, 213, 219, 0.80)",
        cssVars: {
            "--slide-bg": "linear-gradient(180deg, #F8FAFC 0%, #F5F6F8 100%)",
            "--slide-fg": "#2E2E2E",
            "--slide-muted": "#6B7280",
            "--slide-accent": "#3B82F6",
            "--slide-accent-2": "#A7C7E7",
            "--slide-grid": "rgba(46,46,46,0.03)",
            "--editor-accent": "#3B82F6",
            "--editor-accent-soft": "rgba(59,130,246,0.12)",
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
    chalkboard: {
        label: "Chalkboard",
        revealTheme: "black",
        headingFont: '"Fraunces", serif',
        bodyFont: '"Work Sans", sans-serif',
        defaultTextColor: "#F8F3E7",
        defaultMutedColor: "#D4CBB7",
        defaultShapeColor: "#8ED1C7",
        accentStrong: "#F5D76E",
        accentSoft: "rgba(245, 215, 110, 0.16)",
        surfaceColor: "rgba(248, 243, 231, 0.07)",
        surfaceBorder: "rgba(248, 243, 231, 0.15)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 16% 18%, rgba(245, 215, 110, 0.08), transparent 20%), radial-gradient(circle at 82% 22%, rgba(142, 209, 199, 0.08), transparent 22%), repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0 1px, transparent 1px 44px), linear-gradient(180deg, #1A352C 0%, #122821 100%)",
            "--slide-fg": "#F8F3E7",
            "--slide-muted": "#D4CBB7",
            "--slide-accent": "#F5D76E",
            "--slide-accent-2": "#8ED1C7",
            "--slide-grid": "rgba(255,255,255,0.045)",
            "--editor-accent": "#F5D76E",
            "--editor-accent-soft": "rgba(245,215,110,0.18)",
        },
    },
    circuit: {
        label: "Circuit",
        revealTheme: "black",
        headingFont: '"Space Grotesk", sans-serif',
        bodyFont: '"DM Sans", sans-serif',
        defaultTextColor: "#ECF7F5",
        defaultMutedColor: "#9AB8B3",
        defaultShapeColor: "#1FB6A6",
        accentStrong: "#63E6D8",
        accentSoft: "rgba(99, 230, 216, 0.16)",
        surfaceColor: "rgba(236, 247, 245, 0.055)",
        surfaceBorder: "rgba(195, 236, 231, 0.14)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 14% 18%, rgba(99, 230, 216, 0.10), transparent 22%), radial-gradient(circle at 86% 78%, rgba(31, 182, 166, 0.11), transparent 24%), repeating-linear-gradient(90deg, rgba(99,230,216,0.05) 0 1px, transparent 1px 72px), repeating-linear-gradient(0deg, rgba(99,230,216,0.04) 0 1px, transparent 1px 72px), linear-gradient(160deg, #071917 0%, #0B2321 52%, #123431 100%)",
            "--slide-fg": "#ECF7F5",
            "--slide-muted": "#9AB8B3",
            "--slide-accent": "#63E6D8",
            "--slide-accent-2": "#1FB6A6",
            "--slide-grid": "rgba(99,230,216,0.05)",
            "--editor-accent": "#63E6D8",
            "--editor-accent-soft": "rgba(99,230,216,0.18)",
        },
    },
    afterglow: {
        label: "Afterglow",
        revealTheme: "black",
        headingFont: '"Montserrat", sans-serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#F5F7FF",
        defaultMutedColor: "#BDC4DE",
        defaultShapeColor: "#6E86FF",
        accentStrong: "#F3B76A",
        accentSoft: "rgba(243, 183, 106, 0.16)",
        surfaceColor: "rgba(245, 247, 255, 0.06)",
        surfaceBorder: "rgba(245, 247, 255, 0.14)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 18% 16%, rgba(243, 183, 106, 0.11), transparent 22%), radial-gradient(circle at 78% 18%, rgba(110, 134, 255, 0.13), transparent 24%), radial-gradient(circle at 82% 84%, rgba(201, 118, 255, 0.10), transparent 22%), linear-gradient(160deg, #111522 0%, #1A2035 48%, #262443 100%)",
            "--slide-fg": "#F5F7FF",
            "--slide-muted": "#BDC4DE",
            "--slide-accent": "#F3B76A",
            "--slide-accent-2": "#6E86FF",
            "--slide-grid": "rgba(255,255,255,0.04)",
            "--editor-accent": "#F3B76A",
            "--editor-accent-soft": "rgba(243,183,106,0.18)",
        },
    },
    sage: {
        label: "Sage Calm",
        revealTheme: "white",
        headingFont: '"Lora", serif',
        bodyFont: '"Nunito", sans-serif',
        defaultTextColor: "#25342d",
        defaultMutedColor: "#68786e",
        defaultShapeColor: "#9bb89c",
        accentStrong: "#4f7d5a",
        accentSoft: "rgba(79, 125, 90, 0.14)",
        surfaceColor: "rgba(247, 250, 244, 0.78)",
        surfaceBorder: "rgba(79, 125, 90, 0.16)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 86% 14%, rgba(155,184,156,0.18), transparent 24%), radial-gradient(circle at 12% 82%, rgba(219,206,172,0.18), transparent 26%), linear-gradient(180deg, #fbfbf3 0%, #edf3e8 100%)",
            "--slide-fg": "#25342d",
            "--slide-muted": "#68786e",
            "--slide-accent": "#4f7d5a",
            "--slide-accent-2": "#b7a66c",
            "--slide-grid": "rgba(79,125,90,0.06)",
            "--editor-accent": "#4f7d5a",
            "--editor-accent-soft": "rgba(79,125,90,0.16)",
        },
    },
    porcelain: {
        label: "Porcelain",
        revealTheme: "white",
        headingFont: '"Playfair Display", serif',
        bodyFont: '"Poppins", sans-serif',
        defaultTextColor: "#233047",
        defaultMutedColor: "#6c7890",
        defaultShapeColor: "#b8d9e8",
        accentStrong: "#477ca4",
        accentSoft: "rgba(71, 124, 164, 0.13)",
        surfaceColor: "rgba(255, 255, 255, 0.74)",
        surfaceBorder: "rgba(71, 124, 164, 0.14)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 18% 20%, rgba(184,217,232,0.22), transparent 24%), radial-gradient(circle at 82% 78%, rgba(235,211,217,0.22), transparent 24%), linear-gradient(180deg, #fcfdff 0%, #edf6f8 100%)",
            "--slide-fg": "#233047",
            "--slide-muted": "#6c7890",
            "--slide-accent": "#477ca4",
            "--slide-accent-2": "#c08393",
            "--slide-grid": "rgba(71,124,164,0.05)",
            "--editor-accent": "#477ca4",
            "--editor-accent-soft": "rgba(71,124,164,0.16)",
        },
    },
    rosewater: {
        label: "Rosewater",
        revealTheme: "white",
        headingFont: '"Playfair Display", serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#3a2b32",
        defaultMutedColor: "#7f6b72",
        defaultShapeColor: "#e8bdc3",
        accentStrong: "#b76e79",
        accentSoft: "rgba(183, 110, 121, 0.13)",
        surfaceColor: "rgba(255, 247, 247, 0.76)",
        surfaceBorder: "rgba(183, 110, 121, 0.16)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 12% 16%, rgba(232,189,195,0.24), transparent 22%), radial-gradient(circle at 86% 82%, rgba(211,183,139,0.20), transparent 24%), linear-gradient(180deg, #fff9f8 0%, #f7e7e4 100%)",
            "--slide-fg": "#3a2b32",
            "--slide-muted": "#7f6b72",
            "--slide-accent": "#b76e79",
            "--slide-accent-2": "#aa8650",
            "--slide-grid": "rgba(183,110,121,0.05)",
            "--editor-accent": "#b76e79",
            "--editor-accent-soft": "rgba(183,110,121,0.16)",
        },
    },
    buttercup: {
        label: "Buttercup",
        revealTheme: "white",
        headingFont: '"Fredoka", sans-serif',
        bodyFont: '"Nunito", sans-serif',
        defaultTextColor: "#332b15",
        defaultMutedColor: "#756c4c",
        defaultShapeColor: "#f6d56f",
        accentStrong: "#d59d20",
        accentSoft: "rgba(213, 157, 32, 0.15)",
        surfaceColor: "rgba(255, 252, 238, 0.78)",
        surfaceBorder: "rgba(213, 157, 32, 0.18)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 82% 18%, rgba(246,213,111,0.26), transparent 24%), radial-gradient(circle at 18% 82%, rgba(130,186,150,0.18), transparent 26%), linear-gradient(180deg, #fffbeb 0%, #f6efd0 100%)",
            "--slide-fg": "#332b15",
            "--slide-muted": "#756c4c",
            "--slide-accent": "#d59d20",
            "--slide-accent-2": "#5f9f76",
            "--slide-grid": "rgba(213,157,32,0.06)",
            "--editor-accent": "#d59d20",
            "--editor-accent-soft": "rgba(213,157,32,0.18)",
        },
    },
    tidepool: {
        label: "Tidepool",
        revealTheme: "white",
        headingFont: '"Space Grotesk", sans-serif',
        bodyFont: '"DM Sans", sans-serif',
        defaultTextColor: "#17323a",
        defaultMutedColor: "#5f7880",
        defaultShapeColor: "#79c8c5",
        accentStrong: "#168b8b",
        accentSoft: "rgba(22, 139, 139, 0.14)",
        surfaceColor: "rgba(243, 252, 251, 0.76)",
        surfaceBorder: "rgba(22, 139, 139, 0.15)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 14% 18%, rgba(121,200,197,0.22), transparent 24%), radial-gradient(circle at 88% 70%, rgba(123,176,222,0.18), transparent 22%), linear-gradient(180deg, #f5fbfb 0%, #e5f5f4 100%)",
            "--slide-fg": "#17323a",
            "--slide-muted": "#5f7880",
            "--slide-accent": "#168b8b",
            "--slide-accent-2": "#4b8fc5",
            "--slide-grid": "rgba(22,139,139,0.06)",
            "--editor-accent": "#168b8b",
            "--editor-accent-soft": "rgba(22,139,139,0.16)",
        },
    },
    lavender: {
        label: "Lavender Mist",
        revealTheme: "white",
        headingFont: '"Merriweather", serif',
        bodyFont: '"Poppins", sans-serif',
        defaultTextColor: "#302c45",
        defaultMutedColor: "#756f8d",
        defaultShapeColor: "#c9bee8",
        accentStrong: "#7d6bb3",
        accentSoft: "rgba(125, 107, 179, 0.14)",
        surfaceColor: "rgba(250, 248, 255, 0.76)",
        surfaceBorder: "rgba(125, 107, 179, 0.15)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 20% 18%, rgba(201,190,232,0.24), transparent 24%), radial-gradient(circle at 82% 82%, rgba(255,218,185,0.22), transparent 24%), linear-gradient(180deg, #fbfaff 0%, #efeaf8 100%)",
            "--slide-fg": "#302c45",
            "--slide-muted": "#756f8d",
            "--slide-accent": "#7d6bb3",
            "--slide-accent-2": "#cf8a72",
            "--slide-grid": "rgba(125,107,179,0.05)",
            "--editor-accent": "#7d6bb3",
            "--editor-accent-soft": "rgba(125,107,179,0.16)",
        },
    },
    midnightGarden: {
        label: "Midnight Garden",
        revealTheme: "black",
        headingFont: '"Lora", serif',
        bodyFont: '"Manrope", sans-serif',
        defaultTextColor: "#eff7ed",
        defaultMutedColor: "#b7c9b7",
        defaultShapeColor: "#5faf79",
        accentStrong: "#9ae6b4",
        accentSoft: "rgba(154, 230, 180, 0.14)",
        surfaceColor: "rgba(239, 247, 237, 0.07)",
        surfaceBorder: "rgba(154, 230, 180, 0.16)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 18% 20%, rgba(154,230,180,0.12), transparent 24%), radial-gradient(circle at 82% 82%, rgba(95,175,121,0.12), transparent 24%), linear-gradient(155deg, #08140f 0%, #10231a 52%, #183625 100%)",
            "--slide-fg": "#eff7ed",
            "--slide-muted": "#b7c9b7",
            "--slide-accent": "#9ae6b4",
            "--slide-accent-2": "#5faf79",
            "--slide-grid": "rgba(239,247,237,0.045)",
            "--editor-accent": "#9ae6b4",
            "--editor-accent-soft": "rgba(154,230,180,0.18)",
        },
    },
    retroPop: {
        label: "Retro Pop",
        revealTheme: "white",
        headingFont: '"Bangers", cursive',
        bodyFont: '"Comic Neue", cursive',
        defaultTextColor: "#28212a",
        defaultMutedColor: "#745f76",
        defaultShapeColor: "#ffcf5a",
        accentStrong: "#ef476f",
        accentSoft: "rgba(239, 71, 111, 0.14)",
        surfaceColor: "rgba(255, 250, 240, 0.80)",
        surfaceBorder: "rgba(239, 71, 111, 0.18)",
        cssVars: {
            "--slide-bg":
                "radial-gradient(circle at 20% 18%, rgba(255,207,90,0.26), transparent 22%), radial-gradient(circle at 82% 76%, rgba(6,214,160,0.20), transparent 24%), linear-gradient(180deg, #fff8ea 0%, #ffe7df 100%)",
            "--slide-fg": "#28212a",
            "--slide-muted": "#745f76",
            "--slide-accent": "#ef476f",
            "--slide-accent-2": "#06d6a0",
            "--slide-grid": "rgba(239,71,111,0.06)",
            "--editor-accent": "#ef476f",
            "--editor-accent-soft": "rgba(239,71,111,0.18)",
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
        "#f8f3e7",
        "#ecf7f5",
        "#f5f7ff",
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
        "#d4cbb7",
        "#9ab8b3",
        "#bdc4de",
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
        "#f5d76e",
        "#8ed1c7",
        "#63e6d8",
        "#1fb6a6",
        "#f3b76a",
        "#6e86ff",
        "#64748b",
        theme.defaultShapeColor.toLowerCase(),
        theme.accentStrong.toLowerCase(),
        String(theme.cssVars?.["--slide-accent"] || "").toLowerCase(),
        String(theme.cssVars?.["--slide-accent-2"] || "").toLowerCase(),
    ]);
    if (accentish.has(normalized)) return "accent";

    return "keep";
}

function getPresentationTheme(themeId = state.presentationTheme) {
    return PRESENTATION_THEMES[themeId] || PRESENTATION_THEMES.editorial;
}

function populatePresentationThemeSelector() {
    const selector = document.getElementById("theme-selector");
    if (!selector) return;
    const selected = selector.value || state.presentationTheme || "editorial";
    selector.innerHTML = Object.entries(PRESENTATION_THEMES)
        .map(([id, theme]) => `<option value="${id}" ${id === selected ? "selected" : ""}>${theme.label}</option>`)
        .join("");
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
