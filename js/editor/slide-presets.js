/**
 * ACADEMIC SLIDE PRESETS — fully theme-aware
 * All colors/fonts are derived from the active theme at insert time.
 * Slide logical dimensions: 1024 × 768 px
 */

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function _t(theme) {
    // Shorthand resolver
    const themeId = Object.entries(PRESENTATION_THEMES || {}).find(([, candidate]) => candidate === theme)?.[0] || "";
    const a = theme.accentStrong;
    const a2 = theme.cssVars["--slide-accent-2"] || theme.defaultShapeColor;
    const fg = theme.defaultTextColor;
    const mu = theme.defaultMutedColor;
    const sf = theme.surfaceColor;
    const sb = theme.surfaceBorder;
    const hf = theme.headingFont;
    const bf = theme.bodyFont;
    const accentTextOverrides = {
        retroPop: {
            aText: "#C91F57",
            a2Text: "#047857",
        },
    };
    const textAccents = accentTextOverrides[themeId] || {};
    return {
        themeId,
        a,
        a2,
        aText: textAccents.aText || a,
        a2Text: textAccents.a2Text || a2,
        fg,
        mu,
        sf,
        sb,
        hf,
        bf,
    };
}

function _presetMeta(theme) {
    const fg = String(theme.defaultTextColor || "").trim();
    const hex = fg.match(/^#([0-9a-f]{6})$/i)?.[1];
    const luminance = hex
        ? [0, 2, 4]
              .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
              .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
        : 0.2;
    const isLightCanvas = luminance < 0.45;
    return {
        isLightCanvas,
        wash: isLightCanvas ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.06)",
        card: isLightCanvas ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.08)",
        line: isLightCanvas ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)",
        ghost: isLightCanvas ? "0.08" : "0.16",
    };
}

function _hexToRgb(hex) {
    const raw = String(hex || "")
        .trim()
        .match(/^#([0-9a-f]{6})$/i)?.[1];
    if (!raw) return null;
    return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
    };
}

function _relativeLuminance(hex) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return 0.5;
    return ["r", "g", "b"]
        .map(key => rgb[key] / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function _readableOn(color) {
    return _relativeLuminance(color) > 0.48 ? "#111827" : "#FFFFFF";
}

function _alpha(hex, opacity) {
    const rgb = _hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function _contentPresetStyle(theme) {
    const { a, a2, fg } = _t(theme);
    const meta = _presetMeta(theme);
    const themeId = Object.entries(PRESENTATION_THEMES || {}).find(([, candidate]) => candidate === theme)?.[0] || "";
    const isDark = !meta.isLightCanvas;
    const base = {
        themeId,
        isDark,
        header: isDark ? "rgba(255,255,255,0.045)" : theme.surfaceColor,
        panel: isDark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.78)",
        panelBorder: isDark ? _alpha(a, 0.34) : _alpha(a, 0.18),
        titleSize: isDark ? "44px" : "40px",
        eyebrowBg: isDark ? _alpha(a, 0.13) : _alpha(a, 0.1),
        shadow: isDark ? "0 16px 42px rgba(0,0,0,0.28)" : "0 18px 42px rgba(31,41,55,0.08)",
        topRuleOpacity: isDark ? 0.92 : 0.86,
        accentWash: _alpha(a2, isDark ? 0.16 : 0.1),
        bulletSize: isDark ? "23px" : "22px",
    };
    const overrides = {
        afterglow: {
            titleSize: "48px",
            header: "rgba(245,247,255,0.052)",
            panel: "rgba(245,247,255,0.082)",
            panelBorder: _alpha(a, 0.42),
            accentWash: "rgba(110,134,255,0.18)",
        },
        circuit: {
            titleSize: "46px",
            header: "rgba(99,230,216,0.055)",
            panel: "rgba(236,247,245,0.065)",
            panelBorder: _alpha(a, 0.44),
            accentWash: "rgba(31,182,166,0.18)",
        },
        chalkboard: {
            titleSize: "46px",
            header: "rgba(248,243,231,0.050)",
            panel: "rgba(248,243,231,0.070)",
            panelBorder: "rgba(245,215,110,0.36)",
            accentWash: "rgba(142,209,199,0.16)",
        },
        horizon: {
            titleSize: "48px",
            header: "rgba(238,244,255,0.050)",
            panel: "rgba(238,244,255,0.075)",
            panelBorder: "rgba(125,211,252,0.40)",
            accentWash: "rgba(79,124,255,0.18)",
        },
        graphite: {
            titleSize: "46px",
            panelBorder: "rgba(34,211,238,0.38)",
            accentWash: "rgba(56,189,248,0.15)",
        },
        midnightGarden: {
            titleSize: "46px",
            panelBorder: "rgba(154,230,180,0.36)",
            accentWash: "rgba(95,175,121,0.18)",
        },
        retroPop: {
            titleSize: "54px",
            panelBorder: "rgba(239,71,111,0.28)",
            shadow: "0 18px 0 rgba(239,71,111,0.12)",
            topRuleOpacity: 1,
        },
    };
    return { ...base, ...(overrides[themeId] || {}) };
}

function _bar(x, y, w, h, color, opacity, radius, zIndex) {
    return {
        type: "shape",
        shapeType: "rectangle",
        x,
        y,
        width: `${w}px`,
        height: `${h}px`,
        content: "",
        styles: {
            backgroundColor: color,
            ...(opacity !== undefined ? { opacity: String(opacity) } : {}),
            ...(radius ? { borderRadius: radius } : {}),
            zIndex: zIndex !== undefined ? zIndex : 1,
        },
    };
}

function _kicker(x, y, w, text, theme) {
    const { a, bf } = _t(theme);
    const { wash } = _presetMeta(theme);
    return _text(x, y, w, text.toUpperCase(), {
        color: a,
        fontSize: "12px",
        fontFamily: bf,
        fontWeight: "700",
        letterSpacing: "0.18em",
        backgroundColor: wash,
        padding: "6px 10px",
        borderRadius: "999px",
    });
}

function _text(x, y, w, content, styles) {
    return {
        type: "text",
        x,
        y,
        width: `${w}px`,
        height: "auto",
        autoHeight: true,
        textFitMode: "autoHeight",
        content,
        styles: {
            zIndex: 2,
            minWidth: "0px",
            minHeight: "0px",
            padding: "0px",
            ...styles,
        },
    };
}

function _bullets(x, y, w, items, styles) {
    return {
        type: "text",
        x,
        y,
        width: `${w}px`,
        height: "auto",
        autoHeight: true,
        textFitMode: "autoHeight",
        content: items.map(t => ({ text: t.text, level: t.level || 0 })),
        bulletStyle: "default",
        styles: {
            zIndex: 2,
            minWidth: "0px",
            minHeight: "0px",
            padding: "0px",
            ...styles,
        },
    };
}

function _box(x, y, w, h, color, border, radius, zIndex) {
    return {
        type: "shape",
        shapeType: "rectangle",
        x,
        y,
        width: `${w}px`,
        height: `${h}px`,
        content: "",
        styles: {
            backgroundColor: color,
            ...(border ? { border } : {}),
            ...(radius ? { borderRadius: radius } : {}),
            zIndex: zIndex !== undefined ? zIndex : 1,
        },
    };
}

function _table(x, y, w, h, tableData, styles = {}) {
    return {
        type: "table",
        x,
        y,
        width: `${w}px`,
        height: `${h}px`,
        tableData,
        styles: { zIndex: 2, ...styles },
    };
}

function _modernPalette(theme) {
    const { a, a2, aText, a2Text, fg, mu, sf, sb, hf, bf } = _t(theme);
    const meta = _presetMeta(theme);
    const isLight = meta.isLightCanvas;
    const canvasBackground = theme.cssVars?.["--slide-bg"] || (isLight ? "#F8FAFC" : "#0B1020");
    const canvas = isLight ? "#F8FAFC" : "#0B1020";
    const panel = isLight ? sf || "rgba(255,255,255,0.88)" : sf || "rgba(255,255,255,0.075)";
    const raisedPanel = isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.095)";
    const line = sb || (isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.14)");
    const washOpacity = isLight ? 0.12 : 0.18;
    const washOpacityStrong = isLight ? 0.18 : 0.24;
    const fallbackAccents = isLight
        ? ["#2563EB", "#0F766E", "#B45309", "#7C3AED", "#BE185D", "#0369A1"]
        : ["#7DD3FC", "#5EEAD4", "#FBBF24", "#C4B5FD", "#FDA4AF", "#93C5FD"];
    const accents = [a, a2, ...fallbackAccents].filter(Boolean);
    return {
        a,
        a2,
        aText,
        a2Text,
        fg,
        mu,
        sf,
        sb,
        hf,
        bf,
        isLight,
        canvas,
        canvasBackground,
        bg: canvas,
        panel,
        raisedPanel,
        line,
        ink: fg,
        muted: mu,
        footer: isLight ? _alpha(fg, 0.88) : "rgba(0,0,0,0.28)",
        header: isLight ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.045)",
        shadow: isLight ? "0 18px 45px rgba(15,23,42,0.09)" : "0 18px 45px rgba(0,0,0,0.30)",
        softShadow: isLight ? "0 10px 24px rgba(15,23,42,0.07)" : "0 10px 24px rgba(0,0,0,0.24)",
        pastels: accents.slice(0, 7).map((color, i) => _alpha(color, i % 2 ? washOpacityStrong : washOpacity)),
        accents: accents.slice(0, 7),
    };
}

function _mBox(x, y, w, h, fill, border, radius = "18px", extra = {}, zIndex) {
    const box = _box(x, y, w, h, fill, border, radius, zIndex);
    box.styles = { ...box.styles, ...extra };
    return box;
}

function _modernShell(theme, title, subtitle = "", kicker = "") {
    const p = _modernPalette(theme);
    const slideNumberBg = _mBox(912, 740, 62, 22, p.raisedPanel, `1px solid ${p.line}`, "999px", {
        boxShadow: "none",
    }, 2);
    slideNumberBg.footerRole = "slide-number-bg";
    const slideNumber = {
        ..._text(912, 743, 62, "01", {
            color: p.a,
            fontSize: "10px",
            fontFamily: p.bf,
            fontWeight: "900",
            textAlign: "center",
            lineHeight: "1",
        }),
        height: "16px",
        autoHeight: false,
        textFitMode: "fixed",
        footerRole: "slide-number",
    };
    return [
        _mBox(0, 0, 1024, 768, p.canvas, undefined, "0px", { background: p.canvasBackground, pointerEvents: "none" }, 0),
        _bar(0, 0, 1024, 8, p.a, undefined, undefined, 0),
        _bar(0, 736, 1024, 32, p.footer, 0.96, undefined, 0),
        _text(54, 745, 170, "SLIDEFORGE", {
            color: p.isLight ? "#ffffff" : p.muted,
            fontSize: "10px",
            fontFamily: p.bf,
            fontWeight: "900",
            letterSpacing: "0.1em",
            lineHeight: "1",
        }),
        slideNumberBg,
        slideNumber,
        _bar(0, 8, 1024, 96, p.header, undefined, undefined, 0),
        _bar(50, 64, 18, 18, p.a, undefined, "999px"),
        _bar(76, 70, 150, 6, p.line, undefined, "999px"),
        _bar(798, 58, 44, 22, p.pastels[0], undefined, "999px"),
        _bar(850, 58, 44, 22, p.pastels[1], undefined, "999px"),
        _bar(902, 58, 44, 22, p.pastels[3], undefined, "999px"),
        ...(kicker
            ? [
                  _text(64, 112, 260, kicker.toUpperCase(), {
                      color: p.a,
                      fontSize: "12px",
                      fontFamily: p.bf,
                      fontWeight: "800",
                      letterSpacing: "0.16em",
                  }),
              ]
            : []),
        _text(64, kicker ? 136 : 112, 620, title, {
            color: p.ink,
            fontSize: "42px",
            fontFamily: p.hf,
            fontWeight: "800",
            lineHeight: "1.08",
        }),
        ...(subtitle
            ? [
                  _text(66, kicker ? 190 : 166, 640, subtitle, {
                      color: p.muted,
                      fontSize: "16px",
                      fontFamily: p.bf,
                      fontWeight: "500",
                      lineHeight: "1.45",
                  }),
              ]
            : []),
    ];
}

function _presetFooterNumberElements(theme) {
    const p = _modernPalette(theme);
    const bg = _mBox(912, 740, 62, 22, p.raisedPanel, `1px solid ${p.line}`, "999px", {
        boxShadow: "none",
    }, 2);
    bg.footerRole = "slide-number-bg";
    const number = {
        ..._text(912, 743, 62, "01", {
            color: p.a,
            fontSize: "10px",
            fontFamily: p.bf,
            fontWeight: "900",
            textAlign: "center",
            lineHeight: "1",
            zIndex: 3,
        }),
        height: "16px",
        autoHeight: false,
        textFitMode: "fixed",
        footerRole: "slide-number",
    };
    return [bg, number];
}

function _taskCard(x, y, w, h, title, meta, tint, accent, theme, tags = []) {
    const p = _modernPalette(theme);
    const els = [
        _mBox(x, y, w, h, tint, `1px solid ${_alpha(accent, 0.2)}`, "14px", {
            boxShadow: "0 7px 16px rgba(15,23,42,0.06)",
        }),
        _text(x + 14, y + 14, w - 28, title, {
            color: p.ink,
            fontSize: "13px",
            fontFamily: p.bf,
            fontWeight: "800",
            lineHeight: "1.25",
        }),
        _text(x + 14, y + h - 26, w - 28, meta, {
            color: p.muted,
            fontSize: "10px",
            fontFamily: p.bf,
            fontWeight: "700",
        }),
    ];
    tags.slice(0, 2).forEach((tag, i) => {
        els.push(
            _mBox(x + 14 + i * 58, y + h - 48, 48, 16, p.raisedPanel, `1px solid ${_alpha(accent, 0.12)}`, "999px"),
        );
        els.push(
            _text(x + 21 + i * 58, y + h - 45, 38, tag, {
                color: accent,
                fontSize: "8px",
                fontFamily: p.bf,
                fontWeight: "800",
                textAlign: "center",
            }),
        );
    });
    return els;
}

function _metricCard(x, y, w, h, label, value, tint, accent, theme) {
    const p = _modernPalette(theme);
    return [
        _mBox(x, y, w, h, p.raisedPanel, `1px solid ${p.line}`, "18px", { boxShadow: p.softShadow }),
        _bar(x + 18, y + 18, 34, 34, tint, undefined, "12px"),
        _bar(x + 28, y + 30, 14, 10, accent, 0.72, "999px"),
        _text(x + 66, y + 18, w - 86, label, { color: p.muted, fontSize: "12px", fontFamily: p.bf, fontWeight: "800" }),
        _text(x + 66, y + 44, w - 86, value, { color: p.ink, fontSize: "30px", fontFamily: p.hf, fontWeight: "800" }),
    ];
}

function _chartBars(x, y, w, h, theme, values = [0.58, 0.76, 0.44, 0.86, 0.64]) {
    const p = _modernPalette(theme);
    const gap = 18;
    const bw = (w - gap * (values.length - 1)) / values.length;
    const els = [_bar(x, y + h, w, 1, "rgba(148,163,184,0.35)", undefined, "999px")];
    values.forEach((v, i) => {
        const bh = Math.round(h * v);
        els.push(
            _bar(x + i * (bw + gap), y + h - bh, bw, bh, p.pastels[i % p.pastels.length], undefined, "12px 12px 0 0"),
        );
        els.push(_bar(x + i * (bw + gap), y + h - bh, bw, 6, p.accents[i % p.accents.length], 0.82, "12px 12px 0 0"));
    });
    return els;
}

function _statusRail(x, y, w, h, theme) {
    const p = _modernPalette(theme);
    return [
        _mBox(x, y, w, h, p.panel, `1px solid ${p.line}`, "20px", { boxShadow: p.softShadow }),
        _text(x + 18, y + 18, w - 36, "Waiting list", {
            color: p.ink,
            fontSize: "17px",
            fontFamily: p.hf,
            fontWeight: "800",
        }),
        ..._taskCard(
            x + 16,
            y + 58,
            w - 32,
            74,
            "Review design handoff",
            "UI System · 2 days left",
            p.pastels[0],
            p.accents[0],
            theme,
            ["High"],
        ),
        ..._taskCard(
            x + 16,
            y + 146,
            w - 32,
            74,
            "Prepare stakeholder notes",
            "Research · 5 days left",
            p.pastels[5],
            p.accents[5],
            theme,
            ["Draft"],
        ),
        ..._taskCard(
            x + 16,
            y + 234,
            w - 32,
            74,
            "Map follow-up actions",
            "Operations · this week",
            p.pastels[2],
            p.accents[2],
            theme,
            ["Next"],
        ),
    ];
}

/* ─── Preset Definitions ─────────────────────────────────────────────────── */

const SLIDE_PRESETS = {
    "title-page": {
        name: "Title Page",
        icon: "fa-solid fa-star",
        color: "text-yellow-400",
        build(theme) {
            const { a, fg, mu, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _bar(0, 0, 1024, 6, a, undefined, undefined), // top rule
                _bar(0, 762, 1024, 6, a, undefined, undefined), // bottom rule
                _bar(0, 6, 1024, 756, a, 0.04, undefined),
                _box(72, 132, 880, 480, wash, undefined, "24px"),
                _text(80, 168, 864, "RESEARCH PRESENTATION", {
                    color: a,
                    fontSize: "12px",
                    fontFamily: bf,
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "0.18em",
                }),
                _text(80, 220, 864, "Research Title Goes Here", {
                    color: fg,
                    fontSize: "52px",
                    fontFamily: hf,
                    fontWeight: "700",
                    lineHeight: "1.15",
                    textAlign: "center",
                }),
                _bar(412, 336, 200, 3, a, undefined, "2px"), // accent divider
                _text(80, 358, 864, "Author Name · Co-Author Name", {
                    color: fg,
                    fontSize: "22px",
                    fontFamily: bf,
                    fontWeight: "500",
                    textAlign: "center",
                }),
                _text(80, 400, 864, "Department · University · Conference 2025", {
                    color: mu,
                    fontSize: "16px",
                    fontFamily: bf,
                    fontWeight: "400",
                    textAlign: "center",
                }),
                _text(80, 670, 864, "contact@university.edu", {
                    color: a,
                    fontSize: "13px",
                    fontFamily: bf,
                    fontWeight: "400",
                    textAlign: "center",
                }),
            ];
        },
    },

    "section-divider": {
        name: "Section Divider",
        icon: "fa-solid fa-grip-lines",
        color: "text-indigo-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _bar(0, 0, 7, 768, a, undefined, undefined, 1), // left accent strip
                _box(0, 0, 360, 768, sf, undefined, undefined, 0),
                _box(390, 210, 560, 210, card, `1px solid ${a}25`, "18px", 0),
                _text(36, 270, 290, "02", {
                    color: a,
                    fontSize: "110px",
                    fontFamily: hf,
                    fontWeight: "800",
                    opacity: "0.18",
                }),
                _text(400, 270, 580, "Section Title", {
                    color: fg,
                    fontSize: "48px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bar(400, 335, 80, 3, a, undefined, "2px", 1),
                _text(400, 355, 560, "A brief description of what this section covers", {
                    color: mu,
                    fontSize: "20px",
                    fontFamily: bf,
                    fontWeight: "400",
                    lineHeight: "1.55",
                }),
            ];
        },
    },

    "content-slide": {
        name: "Title + Content",
        icon: "fa-solid fa-align-left",
        color: "text-blue-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const mood = _contentPresetStyle(theme);
            return [
                _box(0, 0, 1024, 108, mood.header, undefined, undefined),
                _bar(0, 0, 1024, 6, a, mood.topRuleOpacity, undefined),
                _bar(54, 24, 6, 62, a, undefined, "999px"),
                _box(76, 18, 236, 28, mood.eyebrowBg, `1px solid ${mood.panelBorder}`, "999px"),
                _text(92, 24, 220, "Argument / Evidence", {
                    color: a,
                    fontSize: "11px",
                    fontFamily: bf,
                    fontWeight: "800",
                    letterSpacing: "0.18em",
                }),
                _text(76, 44, 850, "Slide Title", {
                    color: fg,
                    fontSize: mood.titleSize,
                    fontFamily: hf,
                    fontWeight: "800",
                    lineHeight: "1.05",
                    ...(mood.isDark ? { textShadow: "0 3px 18px rgba(0,0,0,0.42)" } : {}),
                }),
                _text(54, 126, 916, "One clear assertion that summarises the content on this slide", {
                    color: mu,
                    fontSize: "19px",
                    fontFamily: bf,
                    fontWeight: "500",
                    lineHeight: "1.4",
                }),
                _box(38, 158, 948, 428, mood.panel, `1px solid ${mood.panelBorder}`, "22px"),
                _bar(38, 158, 7, 428, a, undefined, "22px 0 0 22px"),
                _box(772, 186, 158, 158, mood.accentWash, undefined, "28px"),
                _bar(798, 236, 106, 7, a2, 0.72, "999px"),
                _bar(798, 264, 74, 7, a, 0.72, "999px"),
                _bullets(
                    68,
                    184,
                    680,
                    [
                        { text: "First key point — keep each bullet to one idea", level: 0 },
                        { text: "Supporting evidence or sub-detail", level: 1 },
                        { text: "Second key point with data or reference", level: 0 },
                        { text: "Third point — concrete and actionable", level: 0 },
                        { text: "Optional fourth point", level: 0 },
                    ],
                    {
                        color: fg,
                        fontSize: mood.bulletSize,
                        fontFamily: bf,
                        lineHeight: "1.62",
                    },
                ),
                _text(790, 384, 140, "Signal", {
                    color: a,
                    fontSize: "18px",
                    fontFamily: hf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
            ];
        },
    },

    "two-column": {
        name: "Two Column",
        icon: "fa-solid fa-table-columns",
        color: "text-emerald-400",
        build(theme) {
            const { a, fg, mu, sf, sb, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, "3px"),
                _text(76, 22, 880, "Comparative Analysis", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                // Divider
                _bar(504, 110, 2, 616, a, 0.18, undefined),
                // Left
                _text(54, 114, 424, "Column A", {
                    color: a,
                    fontSize: "20px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bullets(
                    54,
                    150,
                    424,
                    [
                        { text: "First finding", level: 0 },
                        { text: "Detailed sub-note", level: 1 },
                        { text: "Second finding", level: 0 },
                        { text: "Third point", level: 0 },
                    ],
                    { color: fg, fontSize: "19px", fontFamily: bf, lineHeight: "1.6" },
                ),
                // Right
                _text(530, 114, 440, "Column B", {
                    color: a,
                    fontSize: "20px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bullets(
                    530,
                    150,
                    440,
                    [
                        { text: "Contrasting point", level: 0 },
                        { text: "Detailed sub-note", level: 1 },
                        { text: "Second contrast", level: 0 },
                        { text: "Third contrast", level: 0 },
                    ],
                    { color: fg, fontSize: "19px", fontFamily: bf, lineHeight: "1.6" },
                ),
            ];
        },
    },

    "figure-caption": {
        name: "Figure + Caption",
        icon: "fa-solid fa-image",
        color: "text-purple-400",
        build(theme) {
            const { a, fg, mu, sf, sb, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, "3px"),
                _text(76, 22, 880, "Results / Figure", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(54, 106, 880, "Key finding stated as a clear assertion — the figure supports this claim", {
                    color: mu,
                    fontSize: "16px",
                    fontFamily: bf,
                    lineHeight: "1.4",
                }),
                // Figure placeholder
                _box(54, 140, 600, 430, card, `1px dashed ${a}`, "14px"),
                _text(54, 336, 600, "[ Insert Figure / Chart Here ]", {
                    color: mu,
                    fontSize: "17px",
                    fontFamily: bf,
                    textAlign: "center",
                }),
                _text(54, 582, 600, "Figure 1. Descriptive caption explaining the figure content.", {
                    color: mu,
                    fontSize: "13px",
                    fontFamily: bf,
                    textAlign: "center",
                }),
                // Insight panel
                _box(676, 140, 300, 430, card, `1px solid ${a}30`, "14px"),
                _bar(676, 140, 4, 430, a, undefined, "10px 0 0 10px"),
                _text(698, 160, 258, "Key Insight", {
                    color: a,
                    fontSize: "18px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bar(698, 188, 60, 2, a, 0.4, "1px"),
                _text(
                    698,
                    202,
                    258,
                    "Explain what this result means. Connect to your hypothesis or research question.",
                    {
                        color: fg,
                        fontSize: "16px",
                        fontFamily: bf,
                        lineHeight: "1.55",
                    },
                ),
                _text(698, 330, 258, "p < 0.001", {
                    color: a,
                    fontSize: "28px",
                    fontFamily: hf,
                    fontWeight: "800",
                }),
                _text(698, 368, 258, "Statistical significance", {
                    color: mu,
                    fontSize: "13px",
                    fontFamily: bf,
                }),
            ];
        },
    },

    methodology: {
        name: "Methodology",
        icon: "fa-solid fa-diagram-project",
        color: "text-cyan-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const steps = [
                { n: "01", label: "Data Collection", desc: "Sources, instruments and acquisition protocols" },
                { n: "02", label: "Preprocessing", desc: "Cleaning, normalisation, filtering steps" },
                { n: "03", label: "Analysis", desc: "Statistical / computational approaches" },
                { n: "04", label: "Validation", desc: "Cross-validation and robustness checks" },
            ];
            const els = [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, "3px"),
                _text(76, 22, 880, "Methodology", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
            ];
            steps.forEach((s, i) => {
                const x = 54 + i * 242;
                els.push(_box(x, 118, 210, 220, sf, `1px solid ${a}30`, "10px"));
                els.push(
                    _text(x + 14, 130, 185, s.n, {
                        color: a,
                        fontSize: "36px",
                        fontFamily: hf,
                        fontWeight: "800",
                        opacity: "0.25",
                    }),
                );
                els.push(
                    _text(x + 14, 186, 185, s.label, {
                        color: fg,
                        fontSize: "17px",
                        fontFamily: hf,
                        fontWeight: "700",
                    }),
                );
                els.push(
                    _text(x + 14, 216, 185, s.desc, {
                        color: mu,
                        fontSize: "13px",
                        fontFamily: bf,
                        lineHeight: "1.4",
                    }),
                );
                if (i < 3) els.push(_bar(x + 215, 220, 22, 3, a, 0.4, "2px"));
            });
            els.push(_bar(54, 360, 916, 1, a, 0.15, undefined));
            els.push(
                _text(54, 376, 916, "Assumptions · Limitations · Ethical considerations relevant to this methodology", {
                    color: mu,
                    fontSize: "17px",
                    fontFamily: bf,
                    lineHeight: "1.5",
                }),
            );
            return els;
        },
    },

    "results-data": {
        name: "Results & Data",
        icon: "fa-solid fa-chart-bar",
        color: "text-orange-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, "3px"),
                _text(76, 22, 880, "Key Results", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(54, 106, 880, "Main finding stated as a clear assertion — the chart below supports this", {
                    color: mu,
                    fontSize: "16px",
                    fontFamily: bf,
                    lineHeight: "1.4",
                }),
                // Chart placeholder
                _box(54, 136, 620, 390, card, `1px dashed ${a}`, "14px"),
                _text(54, 318, 620, "[ Chart / Graph Placeholder ]", {
                    color: mu,
                    fontSize: "17px",
                    fontFamily: bf,
                    textAlign: "center",
                }),
                _text(54, 538, 620, "Figure 1. Short caption for chart.", {
                    color: mu,
                    fontSize: "13px",
                    fontFamily: bf,
                    textAlign: "center",
                }),
                // Stat cards
                ...[
                    { label: "p < 0.001", desc: "Statistical Significance", y: 136 },
                    { label: "n = 1,024", desc: "Sample Size", y: 276 },
                    { label: "R² = 0.94", desc: "Model Fit", y: 416 },
                ]
                    .map(c => [
                        _box(696, c.y, 280, 120, card, `1px solid ${a}25`, "14px"),
                        _bar(696, c.y, 4, 120, a, undefined, "10px 0 0 10px"),
                        _text(716, c.y + 18, 240, c.label, {
                            color: a,
                            fontSize: "28px",
                            fontFamily: hf,
                            fontWeight: "800",
                        }),
                        _text(716, c.y + 58, 240, c.desc, {
                            color: mu,
                            fontSize: "14px",
                            fontFamily: bf,
                        }),
                    ])
                    .flat(),
            ];
        },
    },

    conclusion: {
        name: "Conclusion",
        icon: "fa-solid fa-flag-checkered",
        color: "text-green-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(0, 0, 7, 768, a, undefined, undefined), // left rail
                _box(54, 120, 916, 410, wash, `1px solid ${a}18`, "22px"),
                _text(76, 18, 880, "Conclusions", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bar(76, 76, 100, 3, a, undefined, "2px"),
                _bullets(
                    76,
                    106,
                    880,
                    [
                        { text: "Primary conclusion drawn directly from the results", level: 0 },
                        { text: "Broader implication for the field or community", level: 0 },
                        { text: "Acknowledged limitation and how it was addressed", level: 0 },
                        { text: "Recommended direction for future research", level: 0 },
                    ],
                    { color: fg, fontSize: "22px", fontFamily: bf, lineHeight: "1.7" },
                ),
                _bar(54, 598, 916, 1, a, 0.15, undefined),
                _text(54, 614, 580, "Acknowledgements · Funding · Grant Reference", {
                    color: mu,
                    fontSize: "14px",
                    fontFamily: bf,
                }),
                _text(700, 614, 270, "author@university.edu", {
                    color: a,
                    fontSize: "14px",
                    fontFamily: bf,
                    textAlign: "right",
                }),
            ];
        },
    },

    bibliography: {
        name: "References",
        icon: "fa-solid fa-book-open",
        color: "text-rose-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const refs = [
                "[1] Author A, Author B. (2023). Title of the paper. <em>Journal Name</em>, 12(3), 45–67. https://doi.org/…",
                "[2] Author C et al. (2022). Another relevant study. <em>Proc. Conference Name</em>, pp. 100–112.",
                "[3] Author D. (2021). Book or thesis reference. Publisher, City.",
                "[4] Author E, Author F. (2024). Preprint title. <em>arXiv</em>:2401.00000.",
                "[5] Author G. (2020). Foundational work. <em>Nature</em>, 580(7804), 456–460.",
            ];
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, "3px"),
                _text(76, 22, 880, "References", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bar(54, 104, 916, 1, a, 0.25, undefined),
                ...refs.map((ref, i) =>
                    _text(54, 122 + i * 108, 916, ref, {
                        color: fg,
                        fontSize: "15px",
                        fontFamily: bf,
                        lineHeight: "1.55",
                    }),
                ),
            ];
        },
    },

    "blank-titled": {
        name: "Blank Titled",
        icon: "fa-regular fa-square",
        color: "text-gray-400",
        build(theme) {
            const { a, fg, sf, hf } = _t(theme);
            return [
                _box(0, 0, 1024, 92, sf, undefined, undefined),
                _bar(0, 90, 1024, 3, a, 0.25, undefined),
                _bar(54, 18, 5, 56, a, undefined, "3px"),
                _text(76, 20, 880, "Slide Title", {
                    color: fg,
                    fontSize: "40px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
            ];
        },
    },

    "quote-slide": {
        name: "Quote Slide",
        icon: "fa-solid fa-quote-left",
        color: "text-rose-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _box(100, 200, 824, 368, wash, undefined, "32px"),
                _text(130, 220, 100, "“", {
                    color: a,
                    fontSize: "120px",
                    fontFamily: hf,
                    fontWeight: "800",
                    opacity: "0.2",
                }),
                _text(150, 260, 724, "The best way to predict the future is to create it.", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "600",
                    fontStyle: "italic",
                    textAlign: "center",
                    lineHeight: "1.2",
                }),
                _bar(462, 420, 100, 4, a, undefined, "2px"),
                _text(150, 450, 724, "— PETER DRUCKER", {
                    color: mu,
                    fontSize: "18px",
                    fontFamily: bf,
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "0.2em",
                }),
            ];
        },
    },

    "timeline-slide": {
        name: "Timeline",
        icon: "fa-solid fa-timeline",
        color: "text-amber-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { wash, line } = _presetMeta(theme);
            return [
                _text(54, 40, 916, "Project Roadmap", {
                    color: fg,
                    fontSize: "38px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _bar(54, 384, 916, 4, line, undefined, "2px"), // Timeline line
                // Node 1
                _box(100, 376, 20, 20, a, undefined, "50%"),
                _text(60, 310, 100, "Q1 2025", { color: a, fontSize: "14px", fontWeight: "700", textAlign: "center" }),
                _text(60, 410, 100, "Foundation", {
                    color: fg,
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center",
                }),
                // Node 2
                _box(300, 376, 20, 20, a, undefined, "50%"),
                _text(260, 310, 100, "Q2 2025", { color: a, fontSize: "14px", fontWeight: "700", textAlign: "center" }),
                _text(260, 410, 100, "Development", {
                    color: fg,
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center",
                }),
                // Node 3
                _box(512, 376, 20, 20, a, undefined, "50%"),
                _text(462, 310, 100, "Q3 2025", { color: a, fontSize: "14px", fontWeight: "700", textAlign: "center" }),
                _text(462, 410, 100, "Beta Testing", {
                    color: fg,
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center",
                }),
                // Node 4
                _box(724, 376, 20, 20, a, undefined, "50%"),
                _text(674, 310, 100, "Q4 2025", { color: a, fontSize: "14px", fontWeight: "700", textAlign: "center" }),
                _text(674, 410, 100, "Launch", { color: fg, fontSize: "14px", fontWeight: "600", textAlign: "center" }),
            ];
        },
    },

    agenda: {
        name: "Agenda",
        icon: "fa-solid fa-list-check",
        color: "text-sky-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            const items = ["Context", "Approach", "Evidence", "Decision"];
            const els = [
                _kicker(64, 62, 180, "Today", theme),
                _text(64, 100, 540, "Agenda", { color: fg, fontSize: "54px", fontFamily: hf, fontWeight: "700" }),
                _text(64, 170, 640, "A clear path through the conversation.", {
                    color: mu,
                    fontSize: "20px",
                    fontFamily: bf,
                    lineHeight: "1.4",
                }),
            ];
            items.forEach((item, i) => {
                const y = 260 + i * 92;
                els.push(_box(64, y, 780, 66, card, `1px solid ${a}20`, "16px"));
                els.push(
                    _text(88, y + 14, 62, `0${i + 1}`, {
                        color: a,
                        fontSize: "26px",
                        fontFamily: hf,
                        fontWeight: "800",
                    }),
                );
                els.push(
                    _text(164, y + 17, 520, item, { color: fg, fontSize: "24px", fontFamily: bf, fontWeight: "700" }),
                );
                els.push(_bar(760, y + 28, 58, 4, i % 2 ? a2 : a, undefined, "999px"));
            });
            return els;
        },
    },

    "big-number": {
        name: "Big Number",
        icon: "fa-solid fa-hashtag",
        color: "text-fuchsia-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { wash, card } = _presetMeta(theme);
            return [
                _box(52, 74, 920, 620, wash, `1px solid ${a}18`, "28px"),
                _text(82, 98, 350, "Impact metric", {
                    color: a,
                    fontSize: "13px",
                    fontFamily: bf,
                    fontWeight: "800",
                    letterSpacing: "0.18em",
                }),
                _text(82, 150, 620, "87%", {
                    color: fg,
                    fontSize: "150px",
                    fontFamily: hf,
                    fontWeight: "800",
                    lineHeight: "0.95",
                }),
                _bar(90, 320, 350, 9, a, undefined, "999px"),
                _bar(90, 320, 250, 9, a2, undefined, "999px"),
                _text(82, 364, 480, "Reduction in processing time after introducing the new workflow.", {
                    color: fg,
                    fontSize: "28px",
                    fontFamily: hf,
                    fontWeight: "700",
                    lineHeight: "1.18",
                }),
                _box(640, 156, 250, 318, card, `1px solid ${a}22`, "20px"),
                _text(666, 188, 204, "Why it matters", {
                    color: a,
                    fontSize: "20px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(
                    666,
                    238,
                    204,
                    "Use this slide for a single statistic, KPI, or headline result that deserves room to breathe.",
                    { color: mu, fontSize: "17px", fontFamily: bf, lineHeight: "1.5" },
                ),
            ];
        },
    },

    "cards-grid": {
        name: "Cards Grid",
        icon: "fa-solid fa-grip",
        color: "text-violet-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            const cards = ["Discover", "Design", "Build", "Measure", "Learn", "Scale"];
            const els = [
                _text(58, 44, 700, "Six-Part Framework", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(
                    60,
                    100,
                    760,
                    "Use compact cards for themes, capabilities, pillars, or grouped recommendations.",
                    { color: mu, fontSize: "17px", fontFamily: bf },
                ),
            ];
            cards.forEach((label, i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const x = 58 + col * 314;
                const y = 164 + row * 214;
                els.push(_box(x, y, 280, 168, card, `1px solid ${i % 2 ? a2 : a}24`, "18px"));
                els.push(
                    _text(x + 20, y + 18, 60, `0${i + 1}`, {
                        color: i % 2 ? a2 : a,
                        fontSize: "26px",
                        fontFamily: hf,
                        fontWeight: "800",
                    }),
                );
                els.push(
                    _text(x + 20, y + 68, 230, label, {
                        color: fg,
                        fontSize: "24px",
                        fontFamily: hf,
                        fontWeight: "700",
                    }),
                );
                els.push(
                    _text(x + 20, y + 106, 230, "Short supporting description or evidence point.", {
                        color: mu,
                        fontSize: "14px",
                        fontFamily: bf,
                        lineHeight: "1.35",
                    }),
                );
            });
            return els;
        },
    },

    "problem-solution": {
        name: "Problem / Solution",
        icon: "fa-solid fa-scale-balanced",
        color: "text-amber-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _text(58, 44, 820, "From Friction to Flow", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _box(58, 136, 420, 464, card, `1px solid ${a}25`, "22px"),
                _box(546, 136, 420, 464, card, `1px solid ${a2}25`, "22px"),
                _text(86, 166, 340, "Problem", { color: a, fontSize: "30px", fontFamily: hf, fontWeight: "800" }),
                _text(574, 166, 340, "Solution", { color: a2, fontSize: "30px", fontFamily: hf, fontWeight: "800" }),
                _bullets(
                    86,
                    230,
                    340,
                    [
                        { text: "Fragmented workflow", level: 0 },
                        { text: "Slow decisions", level: 0 },
                        { text: "Limited visibility", level: 0 },
                    ],
                    { color: fg, fontSize: "20px", fontFamily: bf, lineHeight: "1.7" },
                ),
                _bullets(
                    574,
                    230,
                    340,
                    [
                        { text: "Unified workspace", level: 0 },
                        { text: "Clear ownership", level: 0 },
                        { text: "Live performance view", level: 0 },
                    ],
                    { color: fg, fontSize: "20px", fontFamily: bf, lineHeight: "1.7" },
                ),
                _bar(492, 350, 40, 4, a, undefined, "999px"),
            ];
        },
    },

    "image-grid": {
        name: "Image Grid",
        icon: "fa-regular fa-images",
        color: "text-purple-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            const els = [
                _text(58, 42, 640, "Visual Evidence", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(60, 96, 720, "Use this layout for samples, screenshots, comparative images, or mood boards.", {
                    color: mu,
                    fontSize: "17px",
                    fontFamily: bf,
                }),
            ];
            [
                [58, 150, 430, 230],
                [516, 150, 220, 230],
                [764, 150, 200, 230],
                [58, 408, 270, 210],
                [356, 408, 300, 210],
                [684, 408, 280, 210],
            ].forEach((r, i) => {
                els.push(_box(r[0], r[1], r[2], r[3], card, `1px dashed ${a}`, "18px"));
                els.push(
                    _text(r[0], r[1] + r[3] / 2 - 10, r[2], `Image ${i + 1}`, {
                        color: mu,
                        fontSize: "15px",
                        fontFamily: bf,
                        textAlign: "center",
                    }),
                );
            });
            return els;
        },
    },

    dashboard: {
        name: "Dashboard",
        icon: "fa-solid fa-gauge-high",
        color: "text-cyan-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            const metrics = [
                ["Revenue", "$2.4M"],
                ["Growth", "+18%"],
                ["Retention", "94%"],
            ];
            const els = [
                _text(58, 38, 640, "Executive Snapshot", {
                    color: fg,
                    fontSize: "40px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(60, 90, 680, "A compact operating view for weekly updates or leadership reviews.", {
                    color: mu,
                    fontSize: "16px",
                    fontFamily: bf,
                }),
            ];
            metrics.forEach((m, i) => {
                const x = 58 + i * 306;
                els.push(_box(x, 136, 270, 128, card, `1px solid ${a}22`, "18px"));
                els.push(
                    _text(x + 20, 158, 220, m[0], { color: mu, fontSize: "14px", fontFamily: bf, fontWeight: "700" }),
                );
                els.push(
                    _text(x + 20, 190, 220, m[1], {
                        color: i === 1 ? a2 : a,
                        fontSize: "42px",
                        fontFamily: hf,
                        fontWeight: "800",
                    }),
                );
            });
            els.push(_box(58, 304, 574, 310, card, `1px dashed ${a}`, "20px"));
            els.push(
                _text(58, 442, 574, "Chart Area", { color: mu, fontSize: "18px", fontFamily: bf, textAlign: "center" }),
            );
            els.push(_box(662, 304, 300, 310, sf, `1px solid ${a}24`, "20px"));
            els.push(_text(690, 332, 240, "Notes", { color: fg, fontSize: "24px", fontFamily: hf, fontWeight: "700" }));
            els.push(
                _bullets(
                    690,
                    382,
                    236,
                    [
                        { text: "Momentum remains positive", level: 0 },
                        { text: "Watch onboarding time", level: 0 },
                        { text: "Next review in two weeks", level: 0 },
                    ],
                    { color: fg, fontSize: "16px", fontFamily: bf, lineHeight: "1.5" },
                ),
            );
            return els;
        },
    },

    swot: {
        name: "SWOT",
        icon: "fa-solid fa-border-all",
        color: "text-lime-400",
        build(theme) {
            const { a, a2, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            const labels = [
                ["S", "Strengths"],
                ["W", "Weaknesses"],
                ["O", "Opportunities"],
                ["T", "Threats"],
            ];
            const els = [
                _text(58, 38, 700, "SWOT Analysis", { color: fg, fontSize: "42px", fontFamily: hf, fontWeight: "700" }),
            ];
            labels.forEach((item, i) => {
                const x = 58 + (i % 2) * 462;
                const y = 130 + Math.floor(i / 2) * 240;
                els.push(_box(x, y, 420, 196, card, `1px solid ${i % 2 ? a2 : a}24`, "18px"));
                els.push(
                    _text(x + 22, y + 20, 56, item[0], {
                        color: i % 2 ? a2 : a,
                        fontSize: "44px",
                        fontFamily: hf,
                        fontWeight: "800",
                    }),
                );
                els.push(
                    _text(x + 92, y + 28, 280, item[1], {
                        color: fg,
                        fontSize: "24px",
                        fontFamily: hf,
                        fontWeight: "700",
                    }),
                );
                els.push(
                    _text(x + 92, y + 72, 280, "Key observation or evidence point goes here.", {
                        color: mu,
                        fontSize: "15px",
                        fontFamily: bf,
                        lineHeight: "1.4",
                    }),
                );
            });
            return els;
        },
    },

    "comparison-table": {
        name: "Comparison Table",
        icon: "fa-solid fa-table",
        color: "text-emerald-400",
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            return [
                _text(58, 42, 720, "Option Comparison", {
                    color: fg,
                    fontSize: "42px",
                    fontFamily: hf,
                    fontWeight: "700",
                }),
                _text(60, 96, 720, "Compare alternatives against decision criteria.", {
                    color: mu,
                    fontSize: "17px",
                    fontFamily: bf,
                }),
                _table(58, 160, 888, 390, {
                    rows: 5,
                    cols: 4,
                    headerRow: true,
                    zebra: true,
                    borderColor: a,
                    borderWidth: 1,
                    cellPadding: 10,
                    rowHeights: [52, 70, 70, 70, 70],
                    colWidths: [220, 220, 220, 220],
                    headerFill: a,
                    bodyFill: sf,
                    altFill: `${a}12`,
                    textColor: fg,
                    headerTextColor: _readableOn(a),
                    cells: [
                        [{ text: "Criteria" }, { text: "Option A" }, { text: "Option B" }, { text: "Option C" }],
                        [{ text: "Cost" }, { text: "Low" }, { text: "Medium" }, { text: "High" }],
                        [{ text: "Speed" }, { text: "Fast" }, { text: "Medium" }, { text: "Slow" }],
                        [{ text: "Risk" }, { text: "Medium" }, { text: "Low" }, { text: "Low" }],
                        [{ text: "Fit" }, { text: "Strong" }, { text: "Good" }, { text: "Selective" }],
                    ],
                }),
            ];
        },
    },

    "thank-you": {
        name: "Thank You",
        icon: "fa-regular fa-heart",
        color: "text-pink-400",
        build(theme) {
            const { a, a2, fg, mu, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _box(112, 154, 800, 420, wash, `1px solid ${a}18`, "34px"),
                _text(150, 226, 724, "Thank You", {
                    color: fg,
                    fontSize: "82px",
                    fontFamily: hf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
                _bar(412, 334, 200, 4, a, undefined, "999px"),
                _text(190, 376, 644, "Questions, discussion, and next steps", {
                    color: mu,
                    fontSize: "24px",
                    fontFamily: bf,
                    textAlign: "center",
                }),
                _text(190, 452, 644, "name@company.com · slideforge.ai", {
                    color: a2,
                    fontSize: "16px",
                    fontFamily: bf,
                    fontWeight: "700",
                    textAlign: "center",
                }),
            ];
        },
    },
};

function _installModernPresetBuilders() {
    const modern = {
        "title-page": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Plan the work. Show the progress.",
                    "A crisp project snapshot layout for research, product, or team updates.",
                    "SlideForge preset",
                ),
                _text(68, 256, 390, "Deck Title Goes Here", {
                    color: p.ink,
                    fontSize: "58px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    lineHeight: "1.02",
                }),
                _text(70, 408, 340, "Author Name · Team · Date", {
                    color: p.muted,
                    fontSize: "18px",
                    fontFamily: p.bf,
                    fontWeight: "700",
                }),
                _mBox(500, 154, 432, 416, p.raisedPanel, `1px solid ${p.line}`, "24px", { boxShadow: p.shadow }),
                _bar(530, 188, 110, 8, p.a, undefined, "999px"),
                _bar(660, 188, 70, 8, p.pastels[1], undefined, "999px"),
                ..._taskCard(
                    530,
                    226,
                    166,
                    92,
                    "Define campaign messaging",
                    "Marketing · 1:00h",
                    p.pastels[0],
                    p.accents[0],
                    theme,
                    ["Draft"],
                ),
                ..._taskCard(
                    716,
                    226,
                    166,
                    92,
                    "Executive meeting",
                    "Operations · 9:00",
                    p.pastels[3],
                    p.accents[3],
                    theme,
                    ["Today"],
                ),
                ..._taskCard(
                    530,
                    338,
                    166,
                    92,
                    "Analyse ROI by channel",
                    "Data · 4:00h",
                    p.pastels[1],
                    p.accents[1],
                    theme,
                    ["High"],
                ),
                ..._taskCard(
                    716,
                    338,
                    166,
                    92,
                    "Weekly team meeting",
                    "Team · 12:30",
                    p.pastels[2],
                    p.accents[2],
                    theme,
                    ["Sync"],
                ),
                _mBox(650, 482, 218, 72, p.raisedPanel, `1px solid ${p.line}`, "999px", { boxShadow: p.softShadow }),
                _text(680, 499, 70, "4.7", { color: p.ink, fontSize: "30px", fontFamily: p.hf, fontWeight: "800" }),
                _text(754, 509, 90, "review score", {
                    color: p.muted,
                    fontSize: "11px",
                    fontFamily: p.bf,
                    fontWeight: "800",
                }),
            ];
        },
        "section-divider": theme => {
            const p = _modernPalette(theme);
            return [
                _mBox(0, 0, 1024, 768, p.canvas, undefined, "0px", { background: p.canvasBackground, pointerEvents: "none" }, 0),
                // Left hand sidebar layout
                _bar(80, 180, 8, 400, p.a, undefined, "999px", 1),
                _text(112, 174, 180, "02", {
                    color: p.a,
                    fontSize: "110px",
                    fontFamily: p.hf,
                    fontWeight: "900",
                    lineHeight: "0.9",
                    letterSpacing: "-0.04em",
                }),
                _text(118, 285, 180, "SECTION", {
                    color: p.muted,
                    fontSize: "12px",
                    fontFamily: p.bf,
                    fontWeight: "800",
                    letterSpacing: "0.22em",
                }),
                // Main content
                _text(320, 230, 480, "Section Title", {
                    color: p.ink,
                    fontSize: "64px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    lineHeight: "1.1",
                }),
                _bar(320, 328, 80, 4, p.a, undefined, "999px", 1),
                _text(320, 355, 460, "A short sentence that frames what the audience should expect next.", {
                    color: p.muted,
                    fontSize: "20px",
                    fontFamily: p.bf,
                    lineHeight: "1.45",
                }),
                // Decorative right panel
                _mBox(830, 180, 130, 400, p.pastels[0], `1px solid ${_alpha(p.accents[0], 0.14)}`, "24px", { boxShadow: p.softShadow }, 0),
                _bar(855, 210, 80, 28, p.raisedPanel, undefined, "999px", 1),
                _bar(855, 260, 80, 6, p.accents[0], undefined, "999px", 1),
                _bar(855, 290, 80, 100, p.raisedPanel, 0.65, "12px", 1),
                _bar(855, 410, 80, 130, p.raisedPanel, 0.65, "12px", 1),
            ];
        },
        "content-slide": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Campaign workplan",
                    "Use this slide for a clear claim supported by grouped evidence cards.",
                    "Argument / evidence",
                ),
                ..._taskCard(66, 250, 250, 132, "Core insight", "Research · 0:30h", p.pastels[0], p.accents[0], theme, [
                    "Key",
                ]),
                ..._taskCard(
                    338,
                    250,
                    250,
                    132,
                    "Supporting evidence",
                    "Analysis · 1:15h",
                    p.pastels[2],
                    p.accents[2],
                    theme,
                    ["Proof"],
                ),
                ..._taskCard(
                    66,
                    408,
                    250,
                    132,
                    "Recommended action",
                    "Planning · 2 days",
                    p.pastels[3],
                    p.accents[3],
                    theme,
                    ["Next"],
                ),
                ..._taskCard(
                    338,
                    408,
                    250,
                    132,
                    "Risk to monitor",
                    "Review · weekly",
                    p.pastels[5],
                    p.accents[5],
                    theme,
                    ["Watch"],
                ),
                ..._statusRail(650, 226, 280, 342, theme),
            ];
        },
        "two-column": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Two-track comparison",
                    "Compare workstreams, options, or findings in a structured weekly board.",
                    "Compare",
                ),
                _text(80, 244, 360, "Track A", { color: p.ink, fontSize: "24px", fontFamily: p.hf, fontWeight: "800" }),
                _text(536, 244, 360, "Track B", {
                    color: p.ink,
                    fontSize: "24px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
                _bar(500, 232, 1, 342, p.line, undefined, "999px"),
                ..._taskCard(
                    78,
                    288,
                    360,
                    92,
                    "Prepare webinar storyline",
                    "Content · 3:30h",
                    p.pastels[0],
                    p.accents[0],
                    theme,
                    ["Need help"],
                ),
                ..._taskCard(
                    78,
                    398,
                    360,
                    92,
                    "Review product launch strategy",
                    "Planning · 12:30",
                    p.pastels[2],
                    p.accents[2],
                    theme,
                    ["Invite"],
                ),
                ..._taskCard(
                    536,
                    288,
                    360,
                    92,
                    "Evaluate marketing ROI",
                    "Data · 4:00h",
                    p.pastels[1],
                    p.accents[1],
                    theme,
                    ["High"],
                ),
                ..._taskCard(
                    536,
                    398,
                    360,
                    92,
                    "Check new Google events",
                    "Ops · 2 days left",
                    p.pastels[3],
                    p.accents[3],
                    theme,
                    ["ASAP"],
                ),
            ];
        },
        "figure-caption": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Visual evidence",
                    "A modern figure slide with a clear insight panel and chart-like placeholder.",
                    "Figure",
                ),
                _mBox(66, 228, 566, 326, p.raisedPanel, `1px solid ${p.line}`, "22px", { boxShadow: p.softShadow }),
                ..._chartBars(106, 314, 470, 160, theme, [0.42, 0.68, 0.56, 0.88, 0.74, 0.5]),
                _text(96, 512, 500, "Figure 1. Short caption explaining what the audience should notice.", {
                    color: p.muted,
                    fontSize: "13px",
                    fontFamily: p.bf,
                    textAlign: "center",
                }),
                _mBox(670, 228, 250, 326, p.pastels[1], `1px solid ${_alpha(p.accents[1], 0.22)}`, "22px"),
                _text(696, 264, 196, "Key insight", {
                    color: p.accents[1],
                    fontSize: "24px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
                _text(696, 314, 190, "Explain the implication of the figure in one concise paragraph.", {
                    color: p.ink,
                    fontSize: "17px",
                    fontFamily: p.bf,
                    lineHeight: "1.45",
                }),
                _text(696, 438, 190, "p < 0.001", {
                    color: p.ink,
                    fontSize: "34px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
            ];
        },
        methodology: theme => {
            const p = _modernPalette(theme);
            const steps = ["Collect", "Clean", "Analyse", "Validate"];
            return [
                ..._modernShell(theme, "Methodology", "A process view that feels like a planned workflow.", "Process"),
                ...steps.flatMap((label, i) => {
                    const x = 74 + i * 220;
                    return [
                        _mBox(x, 260, 178, 220, p.raisedPanel, `1px solid ${p.line}`, "22px", {
                            boxShadow: p.softShadow,
                        }),
                        _bar(x + 22, 286, 42, 42, p.pastels[i], undefined, "14px"),
                        _text(x + 82, 292, 72, `0${i + 1}`, {
                            color: p.accents[i],
                            fontSize: "22px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                        }),
                        _text(x + 22, 354, 132, label, {
                            color: p.ink,
                            fontSize: "22px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                        }),
                        _text(x + 22, 400, 132, "Brief method detail with enough context to be useful.", {
                            color: p.muted,
                            fontSize: "13px",
                            fontFamily: p.bf,
                            lineHeight: "1.4",
                        }),
                        ...(i < 3 ? [_bar(x + 184, 364, 46, 3, p.accents[i], 0.35, "999px")] : []),
                    ];
                }),
            ];
        },
        "results-data": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Results snapshot",
                    "A card-based quantitative summary inspired by product analytics dashboards.",
                    "Data",
                ),
                ..._metricCard(66, 232, 250, 112, "Sample size", "1,024", p.pastels[0], p.accents[0], theme),
                ..._metricCard(338, 232, 250, 112, "Model fit", "0.94", p.pastels[1], p.accents[1], theme),
                ..._metricCard(610, 232, 250, 112, "Lift", "+18%", p.pastels[3], p.accents[3], theme),
                _mBox(66, 382, 794, 198, p.raisedPanel, `1px solid ${p.line}`, "22px", { boxShadow: p.softShadow }),
                ..._chartBars(114, 430, 690, 104, theme, [0.52, 0.7, 0.62, 0.86, 0.76, 0.6, 0.91]),
            ];
        },
        conclusion: theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Conclusion",
                    "Close with decisions, implications, and follow-up actions.",
                    "Wrap-up",
                ),
                ...[
                    "Primary conclusion from the results",
                    "Broader implication for the team",
                    "Known limitation and mitigation",
                    "Recommended next step",
                ].flatMap((t, i) =>
                    _taskCard(82, 248 + i * 86, 560, 66, t, "Decision log", p.pastels[i], p.accents[i], theme, [
                        "Done",
                    ]),
                ),
                _mBox(710, 270, 150, 190, p.raisedPanel, `1px solid ${p.line}`, "999px", { boxShadow: p.shadow }),
                _text(746, 312, 78, "4.7", {
                    color: p.ink,
                    fontSize: "42px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
                _text(730, 374, 110, "readiness score", {
                    color: p.muted,
                    fontSize: "12px",
                    fontFamily: p.bf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
            ];
        },
        bibliography: theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "References",
                    "A cleaner citation layout with grouped reference cards.",
                    "Sources",
                ),
                ...[0, 1, 2, 3].flatMap(i => [
                    _mBox(
                        76,
                        240 + i * 82,
                        820,
                        58,
                        i % 2 ? p.raisedPanel : p.pastels[i],
                        `1px solid ${p.line}`,
                        "14px",
                    ),
                    _text(
                        96,
                        254 + i * 82,
                        760,
                        `[${i + 1}] Author ${String.fromCharCode(65 + i)} et al. (202${i}). Paper title or source reference. Journal / Conference.`,
                        {
                            color: p.ink,
                            fontSize: "14px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                ]),
            ];
        },
        "blank-titled": theme => [
            ..._modernShell(
                theme,
                "Slide title",
                "Start from a polished blank slide with enough structure to guide composition.",
                "Blank",
            ),
        ],
        "quote-slide": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Perspective", "", "Quote"),
                _mBox(112, 210, 800, 330, p.raisedPanel, `1px solid ${p.line}`, "30px", { boxShadow: p.shadow }),
                _text(150, 236, 80, "“", {
                    color: p.a,
                    fontSize: "110px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    opacity: "0.22",
                }),
                _text(190, 300, 650, "The best way to predict the future is to create it.", {
                    color: p.ink,
                    fontSize: "42px",
                    fontFamily: p.hf,
                    fontWeight: "700",
                    fontStyle: "italic",
                    textAlign: "center",
                    lineHeight: "1.18",
                }),
                _text(320, 438, 380, "PETER DRUCKER", {
                    color: p.muted,
                    fontSize: "14px",
                    fontFamily: p.bf,
                    fontWeight: "800",
                    textAlign: "center",
                    letterSpacing: "0.18em",
                }),
            ];
        },
        "timeline-slide": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Roadmap", "Calendar-style milestones with modern task cards.", "Timeline"),
                _bar(116, 360, 760, 4, p.line, undefined, "999px"),
                ...["Q1", "Q2", "Q3", "Q4"].flatMap((q, i) => {
                    const x = 112 + i * 250;
                    return [
                        _bar(x, 346, 32, 32, p.accents[i], undefined, "999px"),
                        ..._taskCard(
                            x - 38,
                            i % 2 ? 396 : 246,
                            140,
                            82,
                            q + " milestone",
                            "Project phase",
                            p.pastels[i],
                            p.accents[i],
                            theme,
                        ),
                    ];
                }),
            ];
        },
        agenda: theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Agenda", "A focused path through the conversation.", "Today"),
                ...["Context", "Approach", "Evidence", "Decision"].flatMap((item, i) =>
                    _taskCard(
                        100,
                        238 + i * 86,
                        720,
                        66,
                        `0${i + 1}  ${item}`,
                        "Discussion block",
                        p.pastels[i],
                        p.accents[i],
                        theme,
                    ),
                ),
            ];
        },
        "big-number": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Impact metric", "Give one number enough room to carry the slide.", "KPI"),
                _text(82, 230, 470, "87%", {
                    color: p.ink,
                    fontSize: "150px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    lineHeight: "0.92",
                }),
                _text(92, 398, 430, "Reduction in processing time after introducing the new workflow.", {
                    color: p.ink,
                    fontSize: "29px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    lineHeight: "1.15",
                }),
                _mBox(650, 246, 230, 220, p.pastels[1], `1px solid ${_alpha(p.accents[1], 0.22)}`, "26px"),
                _text(682, 294, 166, "Why it matters", {
                    color: p.accents[1],
                    fontSize: "22px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
                _text(682, 350, 166, "Use this for a headline result, conversion lift, or operational KPI.", {
                    color: p.ink,
                    fontSize: "15px",
                    fontFamily: p.bf,
                    lineHeight: "1.45",
                }),
            ];
        },
        "cards-grid": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Six-part framework",
                    "A polished card grid for capabilities, pillars, or recommendations.",
                    "Framework",
                ),
                ...["Discover", "Design", "Build", "Measure", "Learn", "Scale"].flatMap((label, i) => {
                    const x = 76 + (i % 3) * 286;
                    const y = 238 + Math.floor(i / 3) * 150;
                    return _taskCard(
                        x,
                        y,
                        236,
                        110,
                        label,
                        "Short supporting point",
                        p.pastels[i],
                        p.accents[i],
                        theme,
                        [`0${i + 1}`],
                    );
                }),
            ];
        },
        "problem-solution": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "From friction to flow",
                    "Frame the current problem and the proposed path forward.",
                    "Strategy",
                ),
                _mBox(78, 238, 382, 300, p.pastels[5], `1px solid ${_alpha(p.accents[5], 0.22)}`, "24px"),
                _mBox(544, 238, 382, 300, p.pastels[1], `1px solid ${_alpha(p.accents[1], 0.22)}`, "24px"),
                _text(110, 282, 300, "Problem", {
                    color: p.accents[5],
                    fontSize: "34px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
                _text(576, 282, 300, "Solution", {
                    color: p.accents[1],
                    fontSize: "34px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                }),
                _bullets(
                    110,
                    350,
                    300,
                    [{ text: "Fragmented workflow" }, { text: "Slow decisions" }, { text: "Limited visibility" }],
                    { color: p.ink, fontSize: "19px", fontFamily: p.bf, lineHeight: "1.65" },
                ),
                _bullets(
                    576,
                    350,
                    300,
                    [{ text: "Unified workspace" }, { text: "Clear ownership" }, { text: "Live performance view" }],
                    { color: p.ink, fontSize: "19px", fontFamily: p.bf, lineHeight: "1.65" },
                ),
            ];
        },
        "image-grid": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Visual evidence",
                    "Use image cards for screenshots, samples, or comparative states.",
                    "Gallery",
                ),
                ...[
                    [74, 236, 360, 182],
                    [458, 236, 220, 182],
                    [702, 236, 220, 182],
                    [74, 444, 250, 108],
                    [348, 444, 280, 108],
                    [652, 444, 270, 108],
                ].flatMap((r, i) => [
                    _mBox(
                        r[0],
                        r[1],
                        r[2],
                        r[3],
                        p.pastels[i % p.pastels.length],
                        `1px dashed ${_alpha(p.accents[i % p.accents.length], 0.34)}`,
                        "20px",
                    ),
                    _text(r[0], r[1] + r[3] / 2 - 10, r[2], `Image ${i + 1}`, {
                        color: p.muted,
                        fontSize: "14px",
                        fontFamily: p.bf,
                        fontWeight: "800",
                        textAlign: "center",
                    }),
                ]),
            ];
        },
        dashboard: theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "Executive snapshot",
                    "A weekly operating view with KPIs, work cards, and follow-up items.",
                    "Dashboard",
                ),
                ..._metricCard(66, 224, 250, 104, "Velocity", "32", p.pastels[0], p.accents[0], theme),
                ..._metricCard(336, 224, 250, 104, "Open items", "18", p.pastels[5], p.accents[5], theme),
                ..._metricCard(606, 224, 250, 104, "On track", "86%", p.pastels[2], p.accents[2], theme),
                ..._taskCard(
                    76,
                    370,
                    170,
                    96,
                    "Develop campaign messaging",
                    "Tue · 1:00h",
                    p.pastels[0],
                    p.accents[0],
                    theme,
                    ["Draft"],
                ),
                ..._taskCard(
                    266,
                    370,
                    170,
                    96,
                    "Execute product launch",
                    "Wed · 12:30",
                    p.pastels[2],
                    p.accents[2],
                    theme,
                    ["Invite"],
                ),
                ..._taskCard(456, 370, 170, 96, "Analyse ROI", "Thu · 4:00h", p.pastels[1], p.accents[1], theme, [
                    "High",
                ]),
                ..._statusRail(676, 360, 230, 210, theme),
            ];
        },
        swot: theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(
                    theme,
                    "SWOT analysis",
                    "Four strategic lenses presented as scannable cards.",
                    "Strategy",
                ),
                ...[
                    ["S", "Strengths"],
                    ["W", "Weaknesses"],
                    ["O", "Opportunities"],
                    ["T", "Threats"],
                ].flatMap((item, i) => {
                    const x = 76 + (i % 2) * 432;
                    const y = 236 + Math.floor(i / 2) * 150;
                    return [
                        _mBox(x, y, 382, 118, p.pastels[i], `1px solid ${_alpha(p.accents[i], 0.22)}`, "22px"),
                        _text(x + 24, y + 22, 54, item[0], {
                            color: p.accents[i],
                            fontSize: "42px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                        }),
                        _text(x + 96, y + 26, 240, item[1], {
                            color: p.ink,
                            fontSize: "23px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                        }),
                        _text(x + 96, y + 66, 240, "Key observation or evidence point.", {
                            color: p.muted,
                            fontSize: "13px",
                            fontFamily: p.bf,
                        }),
                    ];
                }),
            ];
        },
        "comparison-table": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Option comparison", "A decision table with modern card framing.", "Decision"),
                _mBox(70, 238, 838, 326, p.raisedPanel, `1px solid ${p.line}`, "22px", { boxShadow: p.softShadow }),
                _table(92, 264, 794, 252, {
                    rows: 5,
                    cols: 4,
                    headerRow: true,
                    zebra: true,
                    borderColor: p.line,
                    borderWidth: 1,
                    cellPadding: 10,
                    rowHeights: [48, 50, 50, 50, 50],
                    colWidths: [198, 198, 198, 198],
                    headerFill: p.a,
                    bodyFill: p.raisedPanel,
                    altFill: p.panel,
                    textColor: p.ink,
                    headerTextColor: _readableOn(p.a),
                    cells: [
                        [{ text: "Criteria" }, { text: "Option A" }, { text: "Option B" }, { text: "Option C" }],
                        [{ text: "Cost" }, { text: "Low" }, { text: "Medium" }, { text: "High" }],
                        [{ text: "Speed" }, { text: "Fast" }, { text: "Medium" }, { text: "Slow" }],
                        [{ text: "Risk" }, { text: "Medium" }, { text: "Low" }, { text: "Low" }],
                        [{ text: "Fit" }, { text: "Strong" }, { text: "Good" }, { text: "Selective" }],
                    ],
                }),
            ];
        },
        "thank-you": theme => {
            const p = _modernPalette(theme);
            return [
                ..._modernShell(theme, "Thank you", "Questions, discussion, and next steps.", "Close"),
                _mBox(214, 246, 596, 250, p.raisedPanel, `1px solid ${p.line}`, "34px", { boxShadow: p.shadow }),
                _text(250, 300, 520, "Thank You", {
                    color: p.ink,
                    fontSize: "78px",
                    fontFamily: p.hf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
                _text(282, 406, 460, "name@company.com · slideforge.ai", {
                    color: p.a,
                    fontSize: "17px",
                    fontFamily: p.bf,
                    fontWeight: "800",
                    textAlign: "center",
                }),
            ];
        },
    };
    Object.entries(modern).forEach(([id, build]) => {
        if (SLIDE_PRESETS[id]) SLIDE_PRESETS[id].build = build;
    });
}

_installModernPresetBuilders();

function _sciencePalette(theme) {
    const { a, a2, aText, a2Text, fg, mu, sf, sb, hf, bf } = _t(theme);
    const meta = _presetMeta(theme);
    const isLight = meta.isLightCanvas;
    const themeId = Object.entries(PRESENTATION_THEMES || {}).find(([, candidate]) => candidate === theme)?.[0] || "";
    const softAccent = _alpha(a, isLight ? 0.105 : 0.18);
    const softAccent2 = _alpha(a2, isLight ? 0.095 : 0.16);
    const elevatedFill = isLight ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.088)";
    const themeMoods = {
        editorial: {
            panelRadius: "18px",
            headerTone: "rgba(255,255,255,0.70)",
            paperFill: "rgba(255,255,255,0.76)",
        },
        blueprint: {
            panelRadius: "14px",
            headerTone: "rgba(255,255,255,0.62)",
            gridLine: "rgba(37,99,235,0.13)",
        },
        fieldnotes: {
            panelRadius: "16px",
            headerTone: "rgba(255,249,238,0.66)",
            paperFill: "rgba(255,249,238,0.78)",
        },
        monograph: {
            panelRadius: "10px",
            headerTone: "rgba(255,255,255,0.74)",
            paperFill: "rgba(255,255,255,0.84)",
        },
        graphite: {
            panelRadius: "16px",
            headerTone: "rgba(255,255,255,0.045)",
            paperFill: "rgba(255,255,255,0.070)",
        },
        horizon: {
            panelRadius: "18px",
            headerTone: "rgba(238,244,255,0.052)",
            paperFill: "rgba(238,244,255,0.075)",
        },
        chalkboard: {
            panelRadius: "13px",
            headerTone: "rgba(248,243,231,0.045)",
            paperFill: "rgba(248,243,231,0.070)",
        },
        circuit: {
            panelRadius: "12px",
            headerTone: "rgba(99,230,216,0.055)",
            paperFill: "rgba(236,247,245,0.062)",
            gridLine: "rgba(99,230,216,0.11)",
        },
        afterglow: {
            panelRadius: "20px",
            headerTone: "rgba(245,247,255,0.055)",
            paperFill: "rgba(245,247,255,0.082)",
        },
        sage: {
            panelRadius: "18px",
            headerTone: "rgba(247,250,244,0.68)",
            paperFill: "rgba(247,250,244,0.82)",
        },
        porcelain: {
            panelRadius: "20px",
            headerTone: "rgba(255,255,255,0.66)",
            paperFill: "rgba(255,255,255,0.80)",
        },
        rosewater: {
            panelRadius: "20px",
            headerTone: "rgba(255,247,247,0.68)",
            paperFill: "rgba(255,247,247,0.82)",
        },
        buttercup: {
            panelRadius: "22px",
            headerTone: "rgba(255,252,238,0.70)",
            paperFill: "rgba(255,252,238,0.82)",
        },
        tidepool: {
            panelRadius: "16px",
            headerTone: "rgba(243,252,251,0.68)",
            paperFill: "rgba(243,252,251,0.80)",
        },
        lavender: {
            panelRadius: "20px",
            headerTone: "rgba(250,248,255,0.68)",
            paperFill: "rgba(250,248,255,0.82)",
        },
        midnightGarden: {
            panelRadius: "20px",
            headerTone: "rgba(239,247,237,0.052)",
            paperFill: "rgba(239,247,237,0.078)",
        },
        retroPop: {
            panelRadius: "18px",
            headerTone: "rgba(255,250,240,0.74)",
            paperFill: "rgba(255,250,240,0.86)",
            shadow: "0 12px 0 rgba(239,71,111,0.13)",
        },
    };
    const mood = themeMoods[themeId] || {};
    return {
        themeId,
        a,
        a2,
        aText,
        a2Text,
        fg,
        mu,
        sf,
        sb,
        hf,
        bf,
        isLight,
        panel: mood.paperFill || meta.card,
        raisedPanel: mood.paperFill || elevatedFill,
        wash: meta.wash,
        line: mood.gridLine || meta.line,
        panelBorder: isLight ? _alpha(a, 0.20) : _alpha(a, 0.36),
        accentWash: softAccent2,
        accentWashStrong: softAccent,
        headerTone: mood.headerTone || (isLight ? "rgba(255,255,255,0.66)" : "rgba(255,255,255,0.052)"),
        panelRadius: mood.panelRadius || "16px",
        shadow: mood.shadow || (isLight ? "0 16px 38px rgba(15,23,42,0.085)" : "0 18px 44px rgba(0,0,0,0.30)"),
        softShadow: isLight ? "0 8px 22px rgba(15,23,42,0.065)" : "0 10px 28px rgba(0,0,0,0.24)",
    };
}

function _scienceHeader(theme, title, subtitle = "", label = "") {
    const p = _sciencePalette(theme);
    return [
        _bar(0, 0, 1024, 7, p.a, undefined, undefined),
        _box(0, 0, 1024, 104, p.headerTone, undefined, undefined),
        _bar(0, 104, 1024, 1, p.line, undefined, undefined),
        _bar(790, 22, 150, 16, p.accentWash, undefined, "999px"),
        _bar(836, 52, 104, 6, p.a2, 0.38, "999px"),
        _bar(716, 52, 94, 6, p.a, 0.30, "999px"),
        _bar(908, 72, 32, 32, p.accentWashStrong, undefined, "999px"),
        _bar(56, 24, 5, 56, p.a, undefined, "3px"),
        ...(label
            ? [
                  _text(78, 20, 520, label.toUpperCase(), {
                      color: p.a,
                      fontSize: "12px",
                      fontFamily: p.bf,
                      fontWeight: "800",
                      letterSpacing: "0.14em",
                  }),
              ]
            : []),
        _text(78, label ? 42 : 28, 850, title, {
            color: p.fg,
            fontSize: "34px",
            fontFamily: p.hf,
            fontWeight: "800",
            lineHeight: "1.08",
        }),
        ...(subtitle
            ? [
                  _text(80, 82, 820, subtitle, {
                      color: p.mu,
                      fontSize: "15px",
                      fontFamily: p.bf,
                      lineHeight: "1.35",
                  }),
              ]
            : []),
    ];
}

function _sciencePanel(theme, x, y, w, h) {
    const p = _sciencePalette(theme);
    return _mBox(x, y, w, h, p.panel, `1px solid ${p.panelBorder}`, p.panelRadius, {
        boxShadow: p.softShadow,
    });
}

function _scienceLabel(x, y, w, text, color, theme) {
    const p = _sciencePalette(theme);
    return _text(x, y, w, String(text || "").toUpperCase(), {
        color,
        fontSize: "11px",
        fontFamily: p.bf,
        fontWeight: "800",
        letterSpacing: "0.12em",
    });
}

function _scienceFigureFrame(theme, x, y, w, h, label = "Drop figure, chart, or molecule view here") {
    const p = _sciencePalette(theme);
    const plotX = x + Math.round(w * 0.18);
    const plotY = y + Math.round(h * 0.25);
    const plotW = Math.round(w * 0.62);
    const plotH = Math.round(h * 0.34);
    return [
        _mBox(x, y, w, h, p.accentWash, `1px dashed ${_alpha(p.a, 0.52)}`, p.panelRadius, {
            boxShadow: p.softShadow,
        }),
        _box(plotX, plotY, plotW, plotH, p.raisedPanel, `1px solid ${p.line}`, "12px"),
        _bar(plotX + 22, plotY + plotH - 34, Math.round(plotW * 0.18), 30, p.a, 0.72, "8px 8px 0 0"),
        _bar(plotX + 78, plotY + plotH - 62, Math.round(plotW * 0.18), 58, p.a2, 0.72, "8px 8px 0 0"),
        _bar(plotX + 134, plotY + plotH - 46, Math.round(plotW * 0.18), 42, p.a, 0.42, "8px 8px 0 0"),
        _bar(plotX + plotW - 118, plotY + 34, 74, 74, p.a2, 0.18, "999px"),
        _bar(plotX + plotW - 92, plotY + 60, 22, 22, p.a, 0.7, "999px"),
        _bar(plotX + plotW - 48, plotY + 78, 16, 16, p.a2, 0.76, "999px"),
        _bar(x + 22, y + h - 52, w - 44, 2, p.line, undefined, "999px"),
        _text(x + 28, y + h - 88, w - 56, label, {
            color: p.mu,
            fontSize: "17px",
            fontFamily: p.bf,
            fontWeight: "700",
            textAlign: "center",
        }),
    ];
}

function _scienceMetric(theme, x, y, w, h, label, value, note, accent) {
    const p = _sciencePalette(theme);
    const color = accent || p.a;
    return [
        _mBox(x, y, w, h, p.raisedPanel, `1px solid ${p.panelBorder}`, p.panelRadius, { boxShadow: p.softShadow }),
        _bar(x, y, w, 4, color, 0.82, `${p.panelRadius} ${p.panelRadius} 0 0`),
        _scienceLabel(x + 20, y + 18, w - 40, label, p.mu, theme),
        _text(x + 20, y + 44, w - 40, value, {
            color,
            fontSize: "34px",
            fontFamily: p.hf,
            fontWeight: "850",
            lineHeight: "1",
        }),
        _text(x + 20, y + 88, w - 40, note, {
            color: p.fg,
            fontSize: "13px",
            fontFamily: p.bf,
            lineHeight: "1.35",
        }),
        _bar(x + w - 74, y + 24, 38, 6, _alpha(color, 0.28), undefined, "999px"),
        _bar(x + w - 74, y + 40, 54, 6, _alpha(color, 0.46), undefined, "999px"),
        _bar(x + w - 74, y + 56, 28, 6, _alpha(color, 0.28), undefined, "999px"),
    ];
}

function _scienceCallout(theme, x, y, w, h, title, body, accent) {
    const p = _sciencePalette(theme);
    const color = accent || p.a;
    return [
        _sciencePanel(theme, x, y, w, h),
        _bar(x, y, 5, h, color, undefined, "14px 0 0 14px"),
        _text(x + 24, y + 22, w - 48, title, {
            color,
            fontSize: "23px",
            fontFamily: p.hf,
            fontWeight: "850",
            lineHeight: "1.1",
        }),
        _text(x + 24, y + 72, w - 48, body, {
            color: p.fg,
            fontSize: "16px",
            fontFamily: p.bf,
            lineHeight: "1.45",
        }),
    ];
}

function _scienceStep(theme, x, y, w, number, title, body, accent) {
    const p = _sciencePalette(theme);
    const color = accent || p.a;
    return [
        _bar(x, y + 18, 34, 34, color, undefined, "999px"),
        _text(x, y + 24, 34, number, {
            color: _readableOn(color),
            fontSize: "13px",
            fontFamily: p.bf,
            fontWeight: "850",
            textAlign: "center",
        }),
        _text(x + 48, y, w - 48, title, {
            color: p.fg,
            fontSize: "21px",
            fontFamily: p.hf,
            fontWeight: "850",
            lineHeight: "1.12",
        }),
        _text(x + 48, y + 42, w - 48, body, {
            color: p.mu,
            fontSize: "14px",
            fontFamily: p.bf,
            lineHeight: "1.38",
        }),
    ];
}

function _scienceBullets(x, y, w, items, styles = {}, options = {}) {
    const gap = Number(options.gap) || 46;
    const marker = options.marker || "•";
    return (Array.isArray(items) ? items : []).map((rawItem, index) => {
        const item = typeof rawItem === "string" ? { text: rawItem, level: 0 } : rawItem || {};
        const level = Math.max(0, Number(item.level) || 0);
        const indent = level * 28;
        return _text(x + indent, y + index * gap, w - indent, `${marker} ${item.text || "List item"}`, {
            lineHeight: "1.3",
            ...styles,
        });
    });
}

function _installSciencePresetBuilders() {
    const layouts = {
        "title-page": {
            name: "MD + ML Title",
            icon: "fa-solid fa-atom",
            color: "text-cyan-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    _bar(0, 0, 1024, 8, p.a, undefined, undefined),
                    _box(64, 118, 896, 484, p.wash, `1px solid ${p.a}20`, "22px"),
                    _text(92, 158, 820, "Molecular Dynamics and Machine Learning", {
                        color: p.a,
                        fontSize: "15px",
                        fontFamily: p.bf,
                        fontWeight: "800",
                        letterSpacing: "0.10em",
                        textAlign: "center",
                    }),
                    _text(118, 222, 788, "Research Title Goes Here", {
                        color: p.fg,
                        fontSize: "54px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                        lineHeight: "1.1",
                        textAlign: "center",
                    }),
                    _bar(362, 374, 300, 3, p.a, undefined, "2px"),
                    _text(152, 412, 720, "Author Name - Group / Institute - Date", {
                        color: p.mu,
                        fontSize: "20px",
                        fontFamily: p.bf,
                        textAlign: "center",
                    }),
                    _text(152, 510, 720, "MD trajectories | protein dynamics | learned representations", {
                        color: p.fg,
                        fontSize: "17px",
                        fontFamily: p.bf,
                        textAlign: "center",
                    }),
                ];
            },
        },
        "section-divider": {
            name: "Section Divider",
            icon: "fa-solid fa-grip-lines",
            color: "text-indigo-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    _bar(0, 0, 1024, 8, p.a, undefined, undefined, 0),
                    // Glassmorphic container with left-hand accent ribbon
                    _box(72, 140, 880, 420, p.wash, `1px solid ${p.panelBorder}`, "24px", 0),
                    _bar(72, 140, 8, 420, p.a, undefined, "24px 0 0 24px", 1),
                    // Centered vertical separator
                    _bar(314, 190, 1, 320, p.line, undefined, "999px", 1),
                    // Left-side section details
                    _text(102, 210, 180, "02", {
                        color: p.a,
                        fontSize: "110px",
                        fontFamily: p.hf,
                        fontWeight: "900",
                        lineHeight: "0.9",
                        textAlign: "center",
                        letterSpacing: "-0.04em",
                    }),
                    _text(102, 325, 180, "SECTION TWO", {
                        color: p.mu,
                        fontSize: "12px",
                        fontFamily: p.bf,
                        fontWeight: "800",
                        letterSpacing: "0.22em",
                        textAlign: "center",
                    }),
                    // Main title and description
                    _text(360, 200, 540, "Section Title", {
                        color: p.fg,
                        fontSize: "64px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                        lineHeight: "1.1",
                    }),
                    _bar(360, 298, 80, 4, p.a, undefined, "999px", 1),
                    _text(360, 325, 540, "A brief description of what this section covers", {
                        color: p.mu,
                        fontSize: "20px",
                        fontFamily: p.bf,
                        fontWeight: "400",
                        lineHeight: "1.45",
                    }),
                    // Bottom capsule callout
                    _box(360, 412, 540, 54, p.raisedPanel, `1px solid ${p.panelBorder}`, "16px", 0),
                    _text(380, 428, 500, "Focus area, core metrics, and strategic outcomes.", {
                        color: p.fg,
                        fontSize: "14px",
                        fontFamily: p.bf,
                        fontWeight: "600",
                        lineHeight: "1.32",
                    }),
                ];
            },
        },
        "content-slide": {
            name: "Assertion + Evidence",
            icon: "fa-solid fa-align-left",
            color: "text-blue-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Learned states reveal a hidden transition",
                        "Use one complete sentence as the slide headline, then make the evidence obvious.",
                        "Finding",
                    ),
                    ..._scienceFigureFrame(
                        theme,
                        58,
                        162,
                        574,
                        340,
                        "Primary visual evidence: structure pair, free-energy map, or latent projection",
                    ),
                    _text(
                        82,
                        522,
                        526,
                        "Figure caption: identify the system, trajectory length, model, and the single observation the audience should retain.",
                        {
                            color: p.mu,
                            fontSize: "14px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                    ..._scienceCallout(
                        theme,
                        670,
                        162,
                        286,
                        142,
                        "Take-home",
                        "The workflow separates states that looked mixed in the raw trajectory.",
                        p.a,
                    ),
                    ..._scienceMetric(theme, 670, 330, 136, 140, "Coverage", "5", "Metastable states", p.a),
                    ..._scienceMetric(theme, 820, 330, 136, 140, "Model", "0.91", "Held-out AUC", p.a2),
                    _text(
                        674,
                        510,
                        272,
                        "Speaker note: replace these placeholders with one visual, one result metric, and one interpretation.",
                        {
                            color: p.mu,
                            fontSize: "14px",
                            fontFamily: p.bf,
                            lineHeight: "1.4",
                        },
                    ),
                ];
            },
        },
        "two-column": {
            name: "Compare Evidence",
            icon: "fa-solid fa-table-columns",
            color: "text-emerald-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "MD and ML agree on the dominant state change",
                        "Place comparable evidence in mirrored panels so the contrast is immediate.",
                        "Compare",
                    ),
                    _sciencePanel(theme, 58, 160, 422, 420),
                    _sciencePanel(theme, 544, 160, 422, 420),
                    _scienceLabel(88, 190, 320, "Physical simulation", p.a, theme),
                    _text(88, 220, 330, "Trajectory ensemble", {
                        color: p.fg,
                        fontSize: "29px",
                        fontFamily: p.hf,
                        fontWeight: "850",
                    }),
                    ..._scienceFigureFrame(theme, 88, 280, 340, 150, "RMSD, contact map, or representative structures"),
                    _text(
                        88,
                        452,
                        340,
                        "Evidence: stable basin shift after ligand binding; uncertainty estimated over replicates.",
                        {
                            color: p.mu,
                            fontSize: "15px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                    _scienceLabel(574, 190, 320, "Learned representation", p.a2, theme),
                    _text(574, 220, 330, "Latent state model", {
                        color: p.fg,
                        fontSize: "29px",
                        fontFamily: p.hf,
                        fontWeight: "850",
                    }),
                    ..._scienceFigureFrame(
                        theme,
                        574,
                        280,
                        340,
                        150,
                        "UMAP, classifier output, or feature attribution",
                    ),
                    _text(
                        574,
                        452,
                        340,
                        "Interpretation: embeddings separate the same transition and identify residues driving the split.",
                        {
                            color: p.mu,
                            fontSize: "15px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                    _bar(500, 208, 4, 324, p.line, undefined, "999px"),
                ];
            },
        },
        "figure-caption": {
            name: "Hero Figure",
            icon: "fa-solid fa-chart-line",
            color: "text-purple-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "The transition concentrates in two residue networks",
                        "A figure-first slide: one large visual, one interpretation panel, no decorative clutter.",
                        "Figure",
                    ),
                    ..._scienceFigureFrame(theme, 54, 148, 640, 420, "Insert main chart or molecular view"),
                    _text(
                        72,
                        586,
                        604,
                        "Figure 1. State the system, trajectory/model, and the visual cue that supports the headline.",
                        {
                            color: p.mu,
                            fontSize: "14px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                    ..._scienceCallout(
                        theme,
                        720,
                        148,
                        246,
                        176,
                        "What changed?",
                        "Open and closed ensembles differ in contacts around the active-site loop.",
                        p.a,
                    ),
                    ..._scienceCallout(
                        theme,
                        720,
                        350,
                        246,
                        176,
                        "Why trust it?",
                        "The same separation appears in held-out trajectories and feature attribution.",
                        p.a2,
                    ),
                ];
            },
        },
        methodology: {
            name: "Workflow",
            icon: "fa-solid fa-diagram-project",
            color: "text-cyan-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Workflow converts trajectories into interpretable states",
                        "Show methods as a pipeline with quality checks, not as a paragraph.",
                        "Methods",
                    ),
                    _sciencePanel(theme, 66, 164, 892, 350),
                    _bar(142, 310, 740, 4, p.line, undefined, "999px"),
                    ..._scienceStep(
                        theme,
                        100,
                        210,
                        190,
                        "1",
                        "Prepare",
                        "Structure, protonation, ligands, solvent box",
                        p.a,
                    ),
                    ..._scienceStep(
                        theme,
                        316,
                        210,
                        190,
                        "2",
                        "Simulate",
                        "Equilibration, production MD, quality control",
                        p.a2,
                    ),
                    ..._scienceStep(
                        theme,
                        532,
                        210,
                        190,
                        "3",
                        "Featurize",
                        "Contacts, distances, dihedrals, energies",
                        p.a,
                    ),
                    ..._scienceStep(
                        theme,
                        748,
                        210,
                        170,
                        "4",
                        "Learn",
                        "Embedding, clustering, prediction, validation",
                        p.a2,
                    ),
                    _text(
                        86,
                        548,
                        852,
                        "Report the exact software versions, sampling length, data split, and validation criterion in speaker notes or a methods backup.",
                        {
                            color: p.mu,
                            fontSize: "16px",
                            fontFamily: p.bf,
                            lineHeight: "1.35",
                        },
                    ),
                ];
            },
        },
        "results-data": {
            name: "Quant Summary",
            icon: "fa-solid fa-chart-bar",
            color: "text-orange-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Three checks support the reported state assignment",
                        "Use the top row for defensible metrics and the lower area for the chart that explains them.",
                        "Results",
                    ),
                    ..._scienceMetric(
                        theme,
                        58,
                        154,
                        280,
                        126,
                        "Sampling",
                        "1.5 us",
                        "3 replicates; no drift after equilibration",
                        p.a,
                    ),
                    ..._scienceMetric(
                        theme,
                        372,
                        154,
                        280,
                        126,
                        "States",
                        "5",
                        "Clusters stable under bootstrap resampling",
                        p.a2,
                    ),
                    ..._scienceMetric(
                        theme,
                        686,
                        154,
                        280,
                        126,
                        "Predictive fit",
                        "0.91",
                        "Held-out AUC; calibrated probabilities",
                        p.a,
                    ),
                    ..._scienceFigureFrame(theme, 58, 326, 596, 246, "Main quantitative plot"),
                    ..._scienceCallout(
                        theme,
                        690,
                        326,
                        276,
                        246,
                        "Readout",
                        "Write the sentence the chart should prove. Add uncertainty and baseline so the result is defensible.",
                        p.a2,
                    ),
                ];
            },
        },
        conclusion: {
            name: "Takeaways",
            icon: "fa-solid fa-flag-checkered",
            color: "text-green-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "The workflow turns simulation data into testable hypotheses",
                        "End with three remembered points and one next action.",
                        "Wrap-up",
                    ),
                    ...[
                        ["1", "Mechanism", "MD identifies the physical transition and the residues involved."],
                        ["2", "Model", "ML compresses trajectories into interpretable state descriptors."],
                        ["3", "Next", "Validate the predicted contacts with perturbation or experiment."],
                    ].flatMap((item, i) => {
                        const x = 72 + i * 300;
                        return [
                            _sciencePanel(theme, x, 176, 250, 284),
                            _bar(x + 24, 208, 44, 44, i === 1 ? p.a2 : p.a, undefined, "999px"),
                            _text(x + 24, 218, 44, item[0], {
                                color: _readableOn(i === 1 ? p.a2 : p.a),
                                fontSize: "18px",
                                fontFamily: p.hf,
                                fontWeight: "850",
                                textAlign: "center",
                            }),
                            _text(x + 24, 282, 202, item[1], {
                                color: i === 1 ? p.a2 : p.a,
                                fontSize: "24px",
                                fontFamily: p.hf,
                                fontWeight: "850",
                            }),
                            _text(x + 24, 334, 202, item[2], {
                                color: p.fg,
                                fontSize: "16px",
                                fontFamily: p.bf,
                                lineHeight: "1.42",
                            }),
                        ];
                    }),
                    _bar(72, 548, 880, 1, p.line, undefined, undefined),
                    _text(74, 584, 470, "Acknowledgements - compute resources - funding", {
                        color: p.mu,
                        fontSize: "14px",
                        fontFamily: p.bf,
                    }),
                    _text(640, 584, 290, "email@institute.edu", {
                        color: p.a,
                        fontSize: "14px",
                        fontFamily: p.bf,
                        textAlign: "right",
                    }),
                ];
            },
        },
        bibliography: {
            name: "References",
            icon: "fa-solid fa-book-open",
            color: "text-rose-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "References",
                        "Replace with key MD, enhanced sampling, and ML papers.",
                        "Sources",
                    ),
                    ...[
                        "[1] Author et al. Molecular dynamics study title. Journal, year.",
                        "[2] Author et al. Machine learning for molecular simulation. Journal, year.",
                        "[3] Author et al. Enhanced sampling or Markov state model reference. Journal, year.",
                        "[4] Software and dataset references: GROMACS, OpenMM, MDAnalysis, PyTorch.",
                    ].map((ref, i) =>
                        _text(70, 166 + i * 96, 860, ref, {
                            color: p.fg,
                            fontSize: "17px",
                            fontFamily: p.bf,
                            lineHeight: "1.45",
                        }),
                    ),
                ];
            },
        },
        "blank-titled": {
            name: "Blank Research",
            icon: "fa-regular fa-square",
            color: "text-gray-400",
            build(theme) {
                return _scienceHeader(
                    theme,
                    "Slide title",
                    "Add simulation, analysis, or model details here.",
                    "MD + ML",
                );
            },
        },
        "quote-slide": {
            name: "Research Question",
            icon: "fa-solid fa-circle-question",
            color: "text-rose-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(theme, "Research question", "", "Question"),
                    _sciencePanel(theme, 118, 220, 788, 268),
                    _text(
                        160,
                        270,
                        704,
                        "Can learned representations from MD trajectories reveal functional conformational states?",
                        {
                            color: p.fg,
                            fontSize: "38px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                            lineHeight: "1.22",
                            textAlign: "center",
                        },
                    ),
                    _text(210, 520, 604, "System - dataset - model - validation criterion", {
                        color: p.mu,
                        fontSize: "18px",
                        fontFamily: p.bf,
                        textAlign: "center",
                    }),
                ];
            },
        },
        "timeline-slide": {
            name: "Experiment Plan",
            icon: "fa-solid fa-timeline",
            color: "text-amber-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Experiment plan",
                        "A simple timeline for simulation and modeling work.",
                        "Plan",
                    ),
                    _bar(110, 350, 804, 4, p.line, undefined, "999px"),
                    ...["System setup", "MD runs", "Feature set", "ML validation"].flatMap((label, i) => {
                        const x = 102 + i * 258;
                        return [
                            _bar(x, 336, 32, 32, p.a, undefined, "999px"),
                            _text(x - 44, i % 2 ? 386 : 250, 120, label, {
                                color: p.fg,
                                fontSize: "17px",
                                fontFamily: p.bf,
                                fontWeight: "800",
                                textAlign: "center",
                            }),
                        ];
                    }),
                ];
            },
        },
        agenda: {
            name: "Talk Outline",
            icon: "fa-solid fa-list-check",
            color: "text-sky-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Talk outline",
                        "A clean structure for an MD and ML presentation.",
                        "Agenda",
                    ),
                    ..._scienceBullets(
                        120,
                        180,
                        760,
                        [
                            { text: "System and scientific motivation" },
                            { text: "MD setup and trajectory quality checks" },
                            { text: "Feature engineering and model design" },
                            { text: "Results, interpretation, and limitations" },
                        ],
                        { color: p.fg, fontSize: "27px", fontFamily: p.bf },
                        { gap: 74 },
                    ),
                ];
            },
        },
        "big-number": {
            name: "Metric Highlight",
            icon: "fa-solid fa-hashtag",
            color: "text-fuchsia-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(theme, "One metric", "Use this for a headline result.", "Metric"),
                    _text(92, 216, 430, "0.91", {
                        color: p.a,
                        fontSize: "142px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                        lineHeight: "0.95",
                    }),
                    _text(104, 390, 410, "Model AUC for classifying active vs inactive conformational states.", {
                        color: p.fg,
                        fontSize: "29px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                        lineHeight: "1.2",
                    }),
                    _sciencePanel(theme, 640, 242, 260, 220),
                    _text(670, 288, 200, "Context", {
                        color: p.a,
                        fontSize: "24px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                    }),
                    _text(670, 342, 200, "Report baseline, data split, uncertainty, and interpretation.", {
                        color: p.fg,
                        fontSize: "17px",
                        fontFamily: p.bf,
                        lineHeight: "1.45",
                    }),
                ];
            },
        },
        "cards-grid": {
            name: "Feature Grid",
            icon: "fa-solid fa-grip",
            color: "text-violet-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Feature set",
                        "Six editable cards for MD descriptors or ML inputs.",
                        "Features",
                    ),
                    _table(78, 170, 868, 330, {
                        rows: 4,
                        cols: 3,
                        headerRow: true,
                        zebra: true,
                        borderColor: p.a,
                        borderWidth: 1,
                        cellPadding: 12,
                        rowHeights: [54, 76, 76, 76],
                        colWidths: [289, 289, 289],
                        headerFill: p.a,
                        bodyFill: p.sf,
                        altFill: _alpha(p.a, 0.1),
                        textColor: p.fg,
                        headerTextColor: _readableOn(p.a),
                        cells: [
                            [{ text: "Feature" }, { text: "Meaning" }, { text: "Use" }],
                            [
                                { text: "RMSD / RMSF" },
                                { text: "Global and local motion" },
                                { text: "Stability checks" },
                            ],
                            [
                                { text: "Contacts / distances" },
                                { text: "Interaction patterns" },
                                { text: "State classification" },
                            ],
                            [
                                { text: "Latent embedding" },
                                { text: "Compressed trajectory" },
                                { text: "Clustering or prediction" },
                            ],
                        ],
                    }),
                ];
            },
        },
        "problem-solution": {
            name: "Challenge / Approach",
            icon: "fa-solid fa-scale-balanced",
            color: "text-amber-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Challenge and approach",
                        "Frame what is hard and how the workflow addresses it.",
                        "Strategy",
                    ),
                    _sciencePanel(theme, 70, 174, 390, 330),
                    _sciencePanel(theme, 564, 174, 390, 330),
                    _text(102, 214, 300, "Challenge", {
                        color: p.a,
                        fontSize: "31px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                    }),
                    ..._scienceBullets(
                        102,
                        282,
                        300,
                        [
                            { text: "High-dimensional trajectories" },
                            { text: "Rare transitions and limited labels" },
                            { text: "Need physical interpretability" },
                        ],
                        { color: p.fg, fontSize: "19px", fontFamily: p.bf },
                        { gap: 52 },
                    ),
                    _text(596, 214, 300, "Approach", {
                        color: p.a2,
                        fontSize: "31px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                    }),
                    ..._scienceBullets(
                        596,
                        282,
                        300,
                        [
                            { text: "Featurize interpretable descriptors" },
                            { text: "Train simple baseline models first" },
                            { text: "Check against MD physics" },
                        ],
                        { color: p.fg, fontSize: "19px", fontFamily: p.bf },
                        { gap: 52 },
                    ),
                ];
            },
        },
        "image-grid": {
            name: "Structure Gallery",
            icon: "fa-regular fa-images",
            color: "text-purple-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Structures and states",
                        "Drop in structures, density maps, or representative conformations.",
                        "Gallery",
                    ),
                    ...[
                        [66, 164, 420, 250, "State A"],
                        [538, 164, 420, 250, "State B"],
                        [66, 456, 260, 140, "Ligand pose"],
                        [382, 456, 260, 140, "Contact map"],
                        [698, 456, 260, 140, "Embedding"],
                    ].flatMap(r => [
                        _box(r[0], r[1], r[2], r[3], p.panel, `1px dashed ${p.a}`, "14px"),
                        _text(r[0], r[1] + r[3] / 2 - 10, r[2], r[4], {
                            color: p.mu,
                            fontSize: "16px",
                            fontFamily: p.bf,
                            textAlign: "center",
                        }),
                    ]),
                ];
            },
        },
        dashboard: {
            name: "Run Dashboard",
            icon: "fa-solid fa-gauge-high",
            color: "text-cyan-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Simulation run dashboard",
                        "Track a small set of metrics without making the slide hard to edit.",
                        "Dashboard",
                    ),
                    ...[
                        ["Systems", "12"],
                        ["Total MD", "6 us"],
                        ["Failed runs", "1"],
                    ].flatMap((m, i) => [
                        _sciencePanel(theme, 70 + i * 296, 160, 240, 120),
                        _text(94 + i * 296, 184, 190, m[0], {
                            color: p.mu,
                            fontSize: "14px",
                            fontFamily: p.bf,
                            fontWeight: "700",
                        }),
                        _text(94 + i * 296, 220, 190, m[1], {
                            color: p.a,
                            fontSize: "34px",
                            fontFamily: p.hf,
                            fontWeight: "800",
                        }),
                    ]),
                    _sciencePanel(theme, 70, 340, 410, 210),
                    _text(100, 374, 330, "Current notes", {
                        color: p.fg,
                        fontSize: "24px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                    }),
                    ..._scienceBullets(
                        100,
                        424,
                        330,
                        [
                            { text: "Equilibration stable for most systems" },
                            { text: "Inspect outlier trajectory" },
                            { text: "Retrain model after new labels" },
                        ],
                        { color: p.fg, fontSize: "16px", fontFamily: p.bf },
                        { gap: 38 },
                    ),
                    _box(540, 340, 384, 210, p.panel, `1px dashed ${p.a}`, "14px"),
                    _text(540, 430, 384, "Insert run-quality chart", {
                        color: p.mu,
                        fontSize: "17px",
                        fontFamily: p.bf,
                        textAlign: "center",
                    }),
                ];
            },
        },
        swot: {
            name: "Model Audit",
            icon: "fa-solid fa-border-all",
            color: "text-lime-400",
            build(theme) {
                const p = _sciencePalette(theme);
                const cards = [
                    ["Data", "Trajectory coverage and label quality"],
                    ["Model", "Architecture, baseline, and metrics"],
                    ["Physics", "Conservation, stability, interpretability"],
                    ["Risk", "Leakage, overfitting, extrapolation"],
                ];
                return [
                    ..._scienceHeader(theme, "Model audit", "Four checks before trusting an MD/ML result.", "Audit"),
                    ...cards.flatMap((card, i) => {
                        const x = 70 + (i % 2) * 456;
                        const y = 166 + Math.floor(i / 2) * 178;
                        return [
                            _sciencePanel(theme, x, y, 390, 130),
                            _text(x + 24, y + 24, 320, card[0], {
                                color: p.a,
                                fontSize: "26px",
                                fontFamily: p.hf,
                                fontWeight: "800",
                            }),
                            _text(x + 24, y + 72, 320, card[1], {
                                color: p.mu,
                                fontSize: "15px",
                                fontFamily: p.bf,
                            }),
                        ];
                    }),
                ];
            },
        },
        "comparison-table": {
            name: "Method Table",
            icon: "fa-solid fa-table",
            color: "text-emerald-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    ..._scienceHeader(
                        theme,
                        "Method comparison",
                        "Editable table for models, features, or simulation conditions.",
                        "Table",
                    ),
                    _table(78, 170, 868, 330, {
                        rows: 5,
                        cols: 4,
                        headerRow: true,
                        zebra: true,
                        borderColor: p.a,
                        borderWidth: 1,
                        cellPadding: 10,
                        rowHeights: [54, 64, 64, 64, 64],
                        colWidths: [217, 217, 217, 217],
                        headerFill: p.a,
                        bodyFill: p.sf,
                        altFill: _alpha(p.a, 0.1),
                        textColor: p.fg,
                        headerTextColor: _readableOn(p.a),
                        cells: [
                            [{ text: "Method" }, { text: "Input" }, { text: "Metric" }, { text: "Comment" }],
                            [{ text: "PCA" }, { text: "Contacts" }, { text: "Variance" }, { text: "Simple baseline" }],
                            [
                                { text: "t-SNE/UMAP" },
                                { text: "Dihedrals" },
                                { text: "Clusters" },
                                { text: "Visualization" },
                            ],
                            [
                                { text: "Random forest" },
                                { text: "Features" },
                                { text: "AUC" },
                                { text: "Interpretable" },
                            ],
                            [{ text: "GNN" }, { text: "Graph" }, { text: "RMSE" }, { text: "Needs more data" }],
                        ],
                    }),
                ];
            },
        },
        "thank-you": {
            name: "Questions",
            icon: "fa-regular fa-heart",
            color: "text-pink-400",
            build(theme) {
                const p = _sciencePalette(theme);
                return [
                    _bar(0, 0, 1024, 8, p.a, undefined, undefined),
                    _sciencePanel(theme, 154, 190, 716, 336),
                    _text(184, 258, 656, "Questions?", {
                        color: p.fg,
                        fontSize: "78px",
                        fontFamily: p.hf,
                        fontWeight: "800",
                        textAlign: "center",
                    }),
                    _text(
                        220,
                        380,
                        584,
                        "Discussion: MD setup, feature design, model validation, and next experiments",
                        {
                            color: p.mu,
                            fontSize: "20px",
                            fontFamily: p.bf,
                            textAlign: "center",
                            lineHeight: "1.4",
                        },
                    ),
                    _text(220, 468, 584, "email@institute.edu", {
                        color: p.a,
                        fontSize: "16px",
                        fontFamily: p.bf,
                        fontWeight: "800",
                        textAlign: "center",
                    }),
                ];
            },
        },
    };

    Object.entries(layouts).forEach(([id, preset]) => {
        if (!SLIDE_PRESETS[id]) return;
        Object.assign(SLIDE_PRESETS[id], preset);
    });
}

_installSciencePresetBuilders();

/* ─── Insert Preset as New Slide ────────────────────────────────────────── */

function _normalizePresetTextColorsForTheme(elements, theme) {
    const { themeId, a, a2, aText, a2Text } = _t(theme);
    if (themeId !== "retroPop" || !Array.isArray(elements)) return elements;
    const accentMap = new Map([
        [String(a).toLowerCase(), aText],
        [String(a2).toLowerCase(), a2Text],
    ]);
    return elements.map(el => {
        if (!el || typeof el !== "object") return el;
        const next = { ...el };
        if (next.type === "text" && next.styles) {
            const styles = { ...next.styles };
            const replacement = accentMap.get(String(styles.color || "").toLowerCase());
            if (replacement) styles.color = replacement;
            next.styles = styles;
        }
        if (next.type === "table" && next.tableData) {
            const tableData = { ...next.tableData };
            ["textColor", "headerTextColor"].forEach(key => {
                const replacement = accentMap.get(String(tableData[key] || "").toLowerCase());
                if (replacement) tableData[key] = replacement;
            });
            next.tableData = tableData;
        }
        return next;
    });
}

function buildPresetSlideState(
    presetId,
    theme,
    { slideId = generateId("slide"), notes = "", background = "", masterId = "none" } = {},
) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) return null;
    const resolvedTheme = theme || (typeof getPresentationTheme === "function" ? getPresentationTheme() : null);
    let elements = preset.build(resolvedTheme).map(el => ({
        ...el,
        id: generateId("el"),
        themeManaged: true,
    }));
    if (!elements.some(el => el.footerRole === "slide-number")) {
        elements.push(
            ..._presetFooterNumberElements(resolvedTheme).map(el => ({
                ...el,
                id: generateId("el"),
                themeManaged: true,
            })),
        );
    }
    if (
        typeof scaleSlideElementsForPageSetup === "function" &&
        typeof getPresentationPageSetupConfig === "function" &&
        typeof PRESENTATION_PAGE_SETUPS !== "undefined"
    ) {
        const baseConfig = PRESENTATION_PAGE_SETUPS["standard-4-3"] || { width: 1024, height: 768 };
        const targetConfig = getPresentationPageSetupConfig();
        if (targetConfig && (targetConfig.width !== baseConfig.width || targetConfig.height !== baseConfig.height)) {
            elements = scaleSlideElementsForPageSetup({ elements }, baseConfig, targetConfig, {
                preserveTextSize: true,
            }).elements;
        }
    }
    elements = _normalizePresetTextColorsForTheme(elements, resolvedTheme);
    return {
        id: slideId,
        layoutId: presetId,
        masterId:
            masterId || "none",
        background: normalizeSlideBackground(background),
        notes,
        elements,
    };
}

function applyPresetLayoutToCurrentSlide(presetId) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) {
        console.warn("Unknown preset:", presetId);
        return;
    }
    const activeIndex = typeof ensureActiveSlideSync === "function" ? ensureActiveSlideSync() : currentSlideIndex;
    const existing = state.slides[activeIndex];
    if (!existing) return;
    const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : null;
    saveStateToUndo();
    state.slides[activeIndex] = buildPresetSlideState(presetId, theme, {
        slideId: existing.id,
        notes: existing.notes || "",
        background: existing.background || "",
        masterId: existing.masterId || "none",
    });
    clearSelection?.();
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
}

function insertPresetSlide(presetId) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) {
        console.warn("Unknown preset:", presetId);
        return;
    }

    const theme =
        typeof getPresentationTheme === "function"
            ? getPresentationTheme()
            : {
                  defaultTextColor: "#f5f5f5",
                  defaultMutedColor: "#a0a0a0",
                  accentStrong: "#7c83ef",
                  headingFont: '"Montserrat", sans-serif',
                  bodyFont: '"Inter", sans-serif',
                  surfaceColor: "rgba(255,255,255,0.06)",
                  surfaceBorder: "rgba(255,255,255,0.12)",
                  cssVars: { "--slide-accent-2": "#3949ab" },
              };

    saveStateToUndo();

    const newSlide = buildPresetSlideState(presetId, theme, { background: "", notes: "" });
    const insertAt = typeof currentSlideIndex !== "undefined" ? currentSlideIndex + 1 : state.slides.length;
    state.slides.splice(insertAt, 0, newSlide);

    if (typeof setCurrentSlideIndex === "function") setCurrentSlideIndex(insertAt);
    if (typeof renderSlidesFromState === "function") renderSlidesFromState();
}

window.insertPresetSlide = insertPresetSlide;
window.applyPresetLayoutToCurrentSlide = applyPresetLayoutToCurrentSlide;
window.buildPresetSlideState = buildPresetSlideState;
window.SLIDE_PRESETS = SLIDE_PRESETS;

function renderPresetSlidePalette() {
    const container = document.getElementById("preset-slides-list");
    if (!container) return;
    const activeTheme = typeof getPresentationTheme === "function" ? getPresentationTheme() : null;
    const activePalette = activeTheme ? _modernPalette(activeTheme) : null;
    const palette = activePalette
        ? activePalette.accents.map((accent, index) => ({
              tint: activePalette.pastels[index % activePalette.pastels.length],
              accent,
              chip: activePalette.isLight ? "rgba(255,255,255,0.82)" : activePalette.raisedPanel,
          }))
        : [
              { tint: "#DBEAFE", accent: "#2563EB", chip: "#EFF6FF" },
              { tint: "#CCFBF1", accent: "#0F766E", chip: "#F0FDFA" },
              { tint: "#DCFCE7", accent: "#15803D", chip: "#F0FDF4" },
              { tint: "#E0E7FF", accent: "#4F46E5", chip: "#EEF2FF" },
          ];
    const previewFor = index => {
        const variant = index % 5;
        if (variant === 0) {
            return `
                <span class="preset-preview-hero"></span>
                <span class="preset-preview-line preset-preview-line-lg"></span>
                <span class="preset-preview-line"></span>
                <span class="preset-preview-chip"></span>
            `;
        }
        if (variant === 1) {
            return `
                <span class="preset-preview-column">
                    <span></span><span></span><span></span>
                </span>
                <span class="preset-preview-column preset-preview-column-soft">
                    <span></span><span></span><span></span>
                </span>
            `;
        }
        if (variant === 2) {
            return `
                <span class="preset-preview-card preset-preview-card-wide"></span>
                <span class="preset-preview-card"></span>
                <span class="preset-preview-card preset-preview-card-soft"></span>
            `;
        }
        if (variant === 3) {
            return `
                <span class="preset-preview-media"></span>
                <span class="preset-preview-stack">
                    <span></span><span></span><span></span>
                </span>
            `;
        }
        return `
            <span class="preset-preview-dot"></span>
            <span class="preset-preview-line preset-preview-line-lg"></span>
            <span class="preset-preview-grid">
                <span></span><span></span><span></span><span></span>
            </span>
        `;
    };
    container.innerHTML = Object.entries(SLIDE_PRESETS)
        .map(([id, preset], index) => {
            const theme = palette[index % palette.length];
            const shortName = preset.name.length > 17 ? preset.name.slice(0, 16) + "…" : preset.name;
            return `
            <button onclick="insertPresetSlide('${id}')" class="preset-card" title="${preset.name}" style="--preset-tint:${theme.tint}; --preset-accent:${theme.accent}; --preset-chip:${theme.chip};">
                <span class="preset-preview" aria-hidden="true">
                    <span class="preset-preview-top">
                        <span></span><span></span><span></span>
                    </span>
                    <span class="preset-preview-body">
                        ${previewFor(index)}
                    </span>
                </span>
                <span class="preset-card-footer">
                    <span class="preset-card-icon"><i class="${preset.icon}"></i></span>
                    <span class="preset-card-name">${shortName}</span>
                </span>
            </button>
        `;
        })
        .join("");
}

window.renderPresetSlidePalette = renderPresetSlidePalette;
renderPresetSlidePalette();
