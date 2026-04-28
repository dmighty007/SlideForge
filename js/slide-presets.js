/**
 * ACADEMIC SLIDE PRESETS — fully theme-aware
 * All colors/fonts are derived from the active theme at insert time.
 * Slide logical dimensions: 1024 × 768 px
 */

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function _t(theme) {
    // Shorthand resolver
    const a  = theme.accentStrong;
    const a2 = theme.cssVars['--slide-accent-2'] || theme.defaultShapeColor;
    const fg = theme.defaultTextColor;
    const mu = theme.defaultMutedColor;
    const sf = theme.surfaceColor;
    const sb = theme.surfaceBorder;
    const hf = theme.headingFont;
    const bf = theme.bodyFont;
    return { a, a2, fg, mu, sf, sb, hf, bf };
}

function _presetMeta(theme) {
    const fg = String(theme.defaultTextColor || "").toLowerCase();
    const darkText = new Set(["#172033", "#10233b", "#2f261d", "#171717", "#1c1917", "#2c2417"]);
    const isLightCanvas = darkText.has(fg);
    return {
        isLightCanvas,
        wash: isLightCanvas ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.06)",
        card: isLightCanvas ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.08)",
        line: isLightCanvas ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)",
        ghost: isLightCanvas ? "0.08" : "0.16",
    };
}

function _bar(x, y, w, h, color, opacity, radius) {
    return {
        type: 'shape', shapeType: 'rectangle',
        x, y, width: `${w}px`, height: `${h}px`, content: '',
        styles: {
            backgroundColor: color,
            ...(opacity !== undefined ? { opacity: String(opacity) } : {}),
            ...(radius ? { borderRadius: radius } : {}),
            zIndex: 1
        }
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
        type: 'text', x, y,
        width: `${w}px`, height: 'auto', content,
        styles: { zIndex: 2, ...styles }
    };
}

function _bullets(x, y, w, items, styles) {
    return {
        type: 'text', x, y,
        width: `${w}px`, height: 'auto',
        content: items.map(t => ({ text: t.text, level: t.level || 0 })),
        bulletStyle: 'default',
        styles: { zIndex: 2, ...styles }
    };
}

function _box(x, y, w, h, color, border, radius) {
    return {
        type: 'shape', shapeType: 'rectangle',
        x, y, width: `${w}px`, height: `${h}px`, content: '',
        styles: {
            backgroundColor: color,
            ...(border ? { border } : {}),
            ...(radius ? { borderRadius: radius } : {}),
            zIndex: 1
        }
    };
}

/* ─── Preset Definitions ─────────────────────────────────────────────────── */

const SLIDE_PRESETS = {

    'title-page': {
        name: 'Title Page',
        icon: 'fa-solid fa-star',
        color: 'text-yellow-400',
        build(theme) {
            const { a, fg, mu, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _bar(0, 0, 1024, 6, a, undefined, undefined),            // top rule
                _bar(0, 762, 1024, 6, a, undefined, undefined),          // bottom rule
                _bar(0, 6, 1024, 756, a, 0.04, undefined),
                _box(72, 132, 880, 480, wash, undefined, '24px'),
                _text(80, 168, 864, 'RESEARCH PRESENTATION', {
                    color: a, fontSize: '12px', fontFamily: bf,
                    fontWeight: '700', textAlign: 'center', letterSpacing: '0.18em'
                }),
                _text(80, 220, 864, 'Research Title Goes Here', {
                    color: fg, fontSize: '52px', fontFamily: hf,
                    fontWeight: '700', lineHeight: '1.15', textAlign: 'center'
                }),
                _bar(412, 336, 200, 3, a, undefined, '2px'),             // accent divider
                _text(80, 358, 864, 'Author Name · Co-Author Name', {
                    color: fg, fontSize: '22px', fontFamily: bf,
                    fontWeight: '500', textAlign: 'center'
                }),
                _text(80, 400, 864, 'Department · University · Conference 2025', {
                    color: mu, fontSize: '16px', fontFamily: bf,
                    fontWeight: '400', textAlign: 'center'
                }),
                _text(80, 670, 864, 'contact@university.edu', {
                    color: a, fontSize: '13px', fontFamily: bf,
                    fontWeight: '400', textAlign: 'center'
                }),
            ];
        }
    },

    'section-divider': {
        name: 'Section Divider',
        icon: 'fa-solid fa-grip-lines',
        color: 'text-indigo-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _bar(0, 0, 7, 768, a, undefined, undefined),             // left accent strip
                _box(0, 0, 360, 768, sf, undefined, undefined),
                _box(390, 210, 560, 210, card, `1px solid ${a}25`, '18px'),
                _text(36, 270, 290, '02', {
                    color: a, fontSize: '110px', fontFamily: hf,
                    fontWeight: '800', opacity: '0.18'
                }),
                _text(400, 270, 580, 'Section Title', {
                    color: fg, fontSize: '48px', fontFamily: hf, fontWeight: '700'
                }),
                _bar(400, 335, 80, 3, a, undefined, '2px'),
                _text(400, 355, 560, 'A brief description of what this section covers', {
                    color: mu, fontSize: '20px', fontFamily: bf,
                    fontWeight: '400', lineHeight: '1.55'
                }),
            ];
        }
    },

    'content-slide': {
        name: 'Title + Content',
        icon: 'fa-solid fa-align-left',
        color: 'text-blue-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 4, 240, 'Argument / Evidence', {
                    color: a, fontSize: '11px', fontFamily: bf, fontWeight: '700', letterSpacing: '0.16em'
                }),
                _text(76, 22, 880, 'Slide Title', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
                _text(54, 116, 916, 'One clear assertion that summarises the content on this slide', {
                    color: mu, fontSize: '18px', fontFamily: bf,
                    fontWeight: '400', lineHeight: '1.4'
                }),
                _box(38, 144, 948, 440, card, `1px solid ${a}18`, '18px'),
                _bullets(54, 160, 916, [
                    { text: 'First key point — keep each bullet to one idea', level: 0 },
                    { text: 'Supporting evidence or sub-detail', level: 1 },
                    { text: 'Second key point with data or reference', level: 0 },
                    { text: 'Third point — concrete and actionable', level: 0 },
                    { text: 'Optional fourth point', level: 0 },
                ], {
                    color: fg, fontSize: '22px', fontFamily: bf, lineHeight: '1.6'
                }),
            ];
        }
    },

    'two-column': {
        name: 'Two Column',
        icon: 'fa-solid fa-table-columns',
        color: 'text-emerald-400',
        build(theme) {
            const { a, fg, mu, sf, sb, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 22, 880, 'Comparative Analysis', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
                // Divider
                _bar(504, 110, 2, 616, a, 0.18, undefined),
                // Left
                _text(54, 114, 424, 'Column A', {
                    color: a, fontSize: '20px', fontFamily: hf, fontWeight: '700'
                }),
                _bullets(54, 150, 424, [
                    { text: 'First finding', level: 0 },
                    { text: 'Detailed sub-note', level: 1 },
                    { text: 'Second finding', level: 0 },
                    { text: 'Third point', level: 0 },
                ], { color: fg, fontSize: '19px', fontFamily: bf, lineHeight: '1.6' }),
                // Right
                _text(530, 114, 440, 'Column B', {
                    color: a, fontSize: '20px', fontFamily: hf, fontWeight: '700'
                }),
                _bullets(530, 150, 440, [
                    { text: 'Contrasting point', level: 0 },
                    { text: 'Detailed sub-note', level: 1 },
                    { text: 'Second contrast', level: 0 },
                    { text: 'Third contrast', level: 0 },
                ], { color: fg, fontSize: '19px', fontFamily: bf, lineHeight: '1.6' }),
            ];
        }
    },

    'figure-caption': {
        name: 'Figure + Caption',
        icon: 'fa-solid fa-image',
        color: 'text-purple-400',
        build(theme) {
            const { a, fg, mu, sf, sb, hf, bf } = _t(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 22, 880, 'Results / Figure', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
                _text(54, 106, 880, 'Key finding stated as a clear assertion — the figure supports this claim', {
                    color: mu, fontSize: '16px', fontFamily: bf, lineHeight: '1.4'
                }),
                // Figure placeholder
                _box(54, 140, 600, 430, card, `1px dashed ${a}`, '14px'),
                _text(54, 336, 600, '[ Insert Figure / Chart Here ]', {
                    color: mu, fontSize: '17px', fontFamily: bf, textAlign: 'center'
                }),
                _text(54, 582, 600, 'Figure 1. Descriptive caption explaining the figure content.', {
                    color: mu, fontSize: '13px', fontFamily: bf, textAlign: 'center'
                }),
                // Insight panel
                _box(676, 140, 300, 430, card, `1px solid ${a}30`, '14px'),
                _bar(676, 140, 4, 430, a, undefined, '10px 0 0 10px'),
                _text(698, 160, 258, 'Key Insight', {
                    color: a, fontSize: '18px', fontFamily: hf, fontWeight: '700'
                }),
                _bar(698, 188, 60, 2, a, 0.4, '1px'),
                _text(698, 202, 258, 'Explain what this result means. Connect to your hypothesis or research question.', {
                    color: fg, fontSize: '16px', fontFamily: bf, lineHeight: '1.55'
                }),
                _text(698, 330, 258, 'p < 0.001', {
                    color: a, fontSize: '28px', fontFamily: hf, fontWeight: '800'
                }),
                _text(698, 368, 258, 'Statistical significance', {
                    color: mu, fontSize: '13px', fontFamily: bf
                }),
            ];
        }
    },

    'methodology': {
        name: 'Methodology',
        icon: 'fa-solid fa-diagram-project',
        color: 'text-cyan-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const steps = [
                { n: '01', label: 'Data Collection', desc: 'Sources, instruments and acquisition protocols' },
                { n: '02', label: 'Preprocessing', desc: 'Cleaning, normalisation, filtering steps' },
                { n: '03', label: 'Analysis', desc: 'Statistical / computational approaches' },
                { n: '04', label: 'Validation', desc: 'Cross-validation and robustness checks' },
            ];
            const els = [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 22, 880, 'Methodology', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
            ];
            steps.forEach((s, i) => {
                const x = 54 + i * 242;
                els.push(_box(x, 118, 210, 220, sf, `1px solid ${a}30`, '10px'));
                els.push(_text(x + 14, 130, 185, s.n, {
                    color: a, fontSize: '36px', fontFamily: hf, fontWeight: '800', opacity: '0.25'
                }));
                els.push(_text(x + 14, 186, 185, s.label, {
                    color: fg, fontSize: '17px', fontFamily: hf, fontWeight: '700'
                }));
                els.push(_text(x + 14, 216, 185, s.desc, {
                    color: mu, fontSize: '13px', fontFamily: bf, lineHeight: '1.4'
                }));
                if (i < 3) els.push(_bar(x + 215, 220, 22, 3, a, 0.4, '2px'));
            });
            els.push(_bar(54, 360, 916, 1, a, 0.15, undefined));
            els.push(_text(54, 376, 916, 'Assumptions · Limitations · Ethical considerations relevant to this methodology', {
                color: mu, fontSize: '17px', fontFamily: bf, lineHeight: '1.5'
            }));
            return els;
        }
    },

    'results-data': {
        name: 'Results & Data',
        icon: 'fa-solid fa-chart-bar',
        color: 'text-orange-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { card } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 22, 880, 'Key Results', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
                _text(54, 106, 880, 'Main finding stated as a clear assertion — the chart below supports this', {
                    color: mu, fontSize: '16px', fontFamily: bf, lineHeight: '1.4'
                }),
                // Chart placeholder
                _box(54, 136, 620, 390, card, `1px dashed ${a}`, '14px'),
                _text(54, 318, 620, '[ Chart / Graph Placeholder ]', {
                    color: mu, fontSize: '17px', fontFamily: bf, textAlign: 'center'
                }),
                _text(54, 538, 620, 'Figure 1. Short caption for chart.', {
                    color: mu, fontSize: '13px', fontFamily: bf, textAlign: 'center'
                }),
                // Stat cards
                ...[
                    { label: 'p < 0.001', desc: 'Statistical Significance', y: 136 },
                    { label: 'n = 1,024', desc: 'Sample Size', y: 276 },
                    { label: 'R² = 0.94', desc: 'Model Fit', y: 416 },
                ].map(c => [
                    _box(696, c.y, 280, 120, card, `1px solid ${a}25`, '14px'),
                    _bar(696, c.y, 4, 120, a, undefined, '10px 0 0 10px'),
                    _text(716, c.y + 18, 240, c.label, {
                        color: a, fontSize: '28px', fontFamily: hf, fontWeight: '800'
                    }),
                    _text(716, c.y + 58, 240, c.desc, {
                        color: mu, fontSize: '14px', fontFamily: bf
                    }),
                ]).flat(),
            ];
        }
    },

    'conclusion': {
        name: 'Conclusion',
        icon: 'fa-solid fa-flag-checkered',
        color: 'text-green-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const { wash } = _presetMeta(theme);
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(0, 0, 7, 768, a, undefined, undefined),             // left rail
                _box(54, 120, 916, 410, wash, `1px solid ${a}18`, '22px'),
                _text(76, 18, 880, 'Conclusions', {
                    color: fg, fontSize: '42px', fontFamily: hf, fontWeight: '700'
                }),
                _bar(76, 76, 100, 3, a, undefined, '2px'),
                _bullets(76, 106, 880, [
                    { text: 'Primary conclusion drawn directly from the results', level: 0 },
                    { text: 'Broader implication for the field or community', level: 0 },
                    { text: 'Acknowledged limitation and how it was addressed', level: 0 },
                    { text: 'Recommended direction for future research', level: 0 },
                ], { color: fg, fontSize: '22px', fontFamily: bf, lineHeight: '1.7' }),
                _bar(54, 598, 916, 1, a, 0.15, undefined),
                _text(54, 614, 580, 'Acknowledgements · Funding · Grant Reference', {
                    color: mu, fontSize: '14px', fontFamily: bf
                }),
                _text(700, 614, 270, 'author@university.edu', {
                    color: a, fontSize: '14px', fontFamily: bf, textAlign: 'right'
                }),
            ];
        }
    },

    'bibliography': {
        name: 'References',
        icon: 'fa-solid fa-book-open',
        color: 'text-rose-400',
        build(theme) {
            const { a, fg, mu, sf, hf, bf } = _t(theme);
            const refs = [
                '[1] Author A, Author B. (2023). Title of the paper. <em>Journal Name</em>, 12(3), 45–67. https://doi.org/…',
                '[2] Author C et al. (2022). Another relevant study. <em>Proc. Conference Name</em>, pp. 100–112.',
                '[3] Author D. (2021). Book or thesis reference. Publisher, City.',
                '[4] Author E, Author F. (2024). Preprint title. <em>arXiv</em>:2401.00000.',
                '[5] Author G. (2020). Foundational work. <em>Nature</em>, 580(7804), 456–460.',
            ];
            return [
                _box(0, 0, 1024, 96, sf, undefined, undefined),
                _bar(54, 20, 5, 56, a, undefined, '3px'),
                _text(76, 22, 880, 'References', {
                    color: fg, fontSize: '38px', fontFamily: hf, fontWeight: '700'
                }),
                _bar(54, 104, 916, 1, a, 0.25, undefined),
                ...refs.map((ref, i) => _text(54, 122 + i * 108, 916, ref, {
                    color: fg, fontSize: '15px', fontFamily: bf, lineHeight: '1.55'
                })),
            ];
        }
    },

    'blank-titled': {
        name: 'Blank Titled',
        icon: 'fa-regular fa-square',
        color: 'text-gray-400',
        build(theme) {
            const { a, fg, sf, hf } = _t(theme);
            return [
                _box(0, 0, 1024, 92, sf, undefined, undefined),
                _bar(0, 90, 1024, 3, a, 0.25, undefined),
                _bar(54, 18, 5, 56, a, undefined, '3px'),
                _text(76, 20, 880, 'Slide Title', {
                    color: fg, fontSize: '40px', fontFamily: hf, fontWeight: '700'
                }),
            ];
        }
    },
};

/* ─── Insert Preset as New Slide ────────────────────────────────────────── */

function buildPresetSlideState(presetId, theme, { slideId = generateId('slide'), notes = '', background = '' } = {}) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) return null;
    const resolvedTheme = theme || (typeof getPresentationTheme === 'function' ? getPresentationTheme() : null);
    const elements = preset.build(resolvedTheme).map(el => ({
        ...el,
        id: generateId('el'),
        themeManaged: true,
    }));
    return {
        id: slideId,
        layoutId: presetId,
        background: normalizeSlideBackground(background),
        notes,
        elements,
    };
}

function applyPresetLayoutToCurrentSlide(presetId) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) {
        console.warn('Unknown preset:', presetId);
        return;
    }
    const activeIndex = typeof ensureActiveSlideSync === 'function' ? ensureActiveSlideSync() : currentSlideIndex;
    const existing = state.slides[activeIndex];
    if (!existing) return;
    const theme = typeof getPresentationTheme === 'function' ? getPresentationTheme() : null;
    saveStateToUndo();
    state.slides[activeIndex] = buildPresetSlideState(presetId, theme, {
        slideId: existing.id,
        notes: existing.notes || '',
        background: existing.background || '',
    });
    clearSelection?.();
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
}

function insertPresetSlide(presetId) {
    const preset = SLIDE_PRESETS[presetId];
    if (!preset) { console.warn('Unknown preset:', presetId); return; }

    const theme = (typeof getPresentationTheme === 'function')
        ? getPresentationTheme()
        : {
            defaultTextColor: '#f5f5f5',
            defaultMutedColor: '#a0a0a0',
            accentStrong: '#7c83ef',
            headingFont: '"Montserrat", sans-serif',
            bodyFont: '"Inter", sans-serif',
            surfaceColor: 'rgba(255,255,255,0.06)',
            surfaceBorder: 'rgba(255,255,255,0.12)',
            cssVars: { '--slide-accent-2': '#3949ab' }
        };

    saveStateToUndo();

    const newSlide = buildPresetSlideState(presetId, theme, { background: '', notes: '' });
    const insertAt = typeof currentSlideIndex !== 'undefined' ? currentSlideIndex + 1 : state.slides.length;
    state.slides.splice(insertAt, 0, newSlide);

    if (typeof setCurrentSlideIndex === 'function') setCurrentSlideIndex(insertAt);
    if (typeof renderSlidesFromState === 'function') renderSlidesFromState();
}

window.insertPresetSlide = insertPresetSlide;
window.applyPresetLayoutToCurrentSlide = applyPresetLayoutToCurrentSlide;
window.buildPresetSlideState = buildPresetSlideState;
window.SLIDE_PRESETS = SLIDE_PRESETS;
