function getMasterSlideOptions() {
    return MASTER_SLIDE_DEFINITIONS || {};
}

function inferMasterIdForLayout(layoutId) {
    const id = String(layoutId || "");
    if (id.includes("title") || id.includes("thank")) return "title";
    if (id.includes("section")) return "section";
    return "content";
}

function getMasterSlideConfig(masterId) {
    if (masterId === "none") return null;
    if (!state.masterSlides) state.masterSlides = normalizeMasterSlidesState();
    const resolvedId = MASTER_SLIDE_DEFINITIONS?.[masterId] ? masterId : "content";
    const config = state.masterSlides?.[resolvedId];
    return config?.enabled === false ? null : config;
}

function setCurrentSlideMaster(masterId) {
    const slide = state.slides?.[currentSlideIndex];
    if (!slide) return;
    const nextMasterId = masterId === "none" ? "none" : MASTER_SLIDE_DEFINITIONS?.[masterId] ? masterId : "content";
    saveStateToUndo?.();
    slide.masterId = nextMasterId;
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
}

function updateMasterSlide(masterId, updates = {}) {
    if (!MASTER_SLIDE_DEFINITIONS?.[masterId] || masterId === "none") return;
    if (!state.masterSlides) state.masterSlides = normalizeMasterSlidesState();
    saveStateToUndo?.();
    const current = state.masterSlides[masterId] || createDefaultMasterSlidesState()[masterId];
    state.masterSlides[masterId] = {
        ...current,
        ...updates,
        id: masterId,
        footerText:
            typeof updates.footerText === "string" ? updates.footerText.slice(0, 180) : current.footerText,
        logoText: typeof updates.logoText === "string" ? updates.logoText.slice(0, 80) : current.logoText,
    };
    renderSlidesFromState?.();
    renderSlidePreviews?.(null, { preserveScroll: true });
}

function _masterThemeParts(theme) {
    const accent = theme?.accentStrong || theme?.cssVars?.["--slide-accent"] || "#2563EB";
    const accent2 = theme?.cssVars?.["--slide-accent-2"] || theme?.defaultShapeColor || accent;
    return {
        accent,
        accent2,
        text: theme?.defaultTextColor || "#172033",
        muted: theme?.defaultMutedColor || "#64748B",
        headingFont: theme?.headingFont || '"Manrope", sans-serif',
        bodyFont: theme?.bodyFont || '"Manrope", sans-serif',
        surface: theme?.surfaceColor || "rgba(255,255,255,0.80)",
        border: theme?.surfaceBorder || "rgba(148,163,184,0.28)",
    };
}

function _masterEl(type, x, y, width, height, styles = {}, content = "") {
    return {
        id: `master_${type}_${Math.round(x)}_${Math.round(y)}_${Math.round(width)}_${Math.round(height)}`,
        type,
        x,
        y,
        width: `${width}px`,
        height: `${height}px`,
        content,
        isMasterElement: true,
        styles: { zIndex: -20, pointerEvents: "none", ...styles },
    };
}

function _masterText(x, y, width, content, styles = {}) {
    return {
        ..._masterEl("text", x, y, width, 28, styles, content),
        autoHeight: true,
        textFitMode: "autoHeight",
    };
}

function _scaleMasterElement(el, sx, sy) {
    const scalePx = (value, factor) => `${Math.max(1, Number.parseFloat(String(value || "0")) * factor)}px`;
    return {
        ...el,
        x: Math.round(el.x * sx),
        y: Math.round(el.y * sy),
        width: scalePx(el.width, sx),
        height: scalePx(el.height, sy),
        styles: {
            ...(el.styles || {}),
            fontSize: el.styles?.fontSize ? scalePx(el.styles.fontSize, Math.min(sx, sy)) : el.styles?.fontSize,
        },
    };
}

function buildMasterSlideElements(slide, slideIndex, theme = getPresentationTheme()) {
    const masterId = resolveSlideMasterId(slide);
    const config = getMasterSlideConfig(masterId);
    if (!config) return [];

    const slideConfig = getPresentationPageSetupConfig?.() || { width: 1024, height: 768 };
    const sx = (Number(slideConfig.width) || 1024) / 1024;
    const sy = (Number(slideConfig.height) || 768) / 768;
    const { accent, accent2, text, muted, headingFont, bodyFont, surface, border } = _masterThemeParts(theme);
    const footerText = config.footerText || "";
    const logoText = config.logoText || "";
    const slideNumber = String((slideIndex || 0) + 1).padStart(2, "0");
    const elements = [];

    if (masterId === "title") {
        if (config.showTopRule) elements.push(_masterEl("shape", 0, 0, 1024, 8, { backgroundColor: accent, borderRadius: "0px" }));
        elements.push(_masterEl("shape", 882, 48, 88, 88, { backgroundColor: accent2, opacity: "0.18", borderRadius: "22px" }));
        elements.push(_masterEl("shape", 930, 96, 40, 40, { backgroundColor: accent, opacity: "0.82", borderRadius: "999px" }));
        if (logoText) {
            elements.push(_masterText(64, 702, 420, logoText, {
                color: muted,
                fontFamily: bodyFont,
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
            }));
        }
    } else if (masterId === "section") {
        elements.push(_masterEl("shape", 0, 0, 10, 768, { backgroundColor: accent, borderRadius: "0px" }));
        elements.push(_masterEl("shape", 24, 42, 92, 92, { backgroundColor: surface, border: `1px solid ${border}`, borderRadius: "24px" }));
        elements.push(_masterText(47, 67, 60, slideNumber, {
            color: accent,
            fontFamily: headingFont,
            fontSize: "34px",
            fontWeight: "800",
            textAlign: "center",
        }));
    } else {
        if (config.showTopRule) elements.push(_masterEl("shape", 0, 0, 1024, 5, { backgroundColor: accent, borderRadius: "0px" }));
        elements.push(_masterEl("shape", 52, 712, 920, 1, { backgroundColor: border, borderRadius: "0px" }));
    }

    if (config.showFooter) {
        if (logoText) {
            elements.push(_masterText(54, 724, 145, logoText, {
                color: text,
                fontFamily: bodyFont,
                fontSize: "11px",
                fontWeight: "800",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
            }));
        }
        if (footerText) {
            elements.push(_masterText(224, 724, 520, footerText, {
                color: muted,
                fontFamily: bodyFont,
                fontSize: "11px",
                fontWeight: "600",
            }));
        }
    }

    if (config.showSlideNumber) {
        elements.push(_masterText(918, 724, 54, slideNumber, {
            color: muted,
            fontFamily: bodyFont,
            fontSize: "11px",
            fontWeight: "800",
            textAlign: "right",
        }));
    }

    return elements.map(el => _scaleMasterElement(el, sx, sy));
}

window.getMasterSlideOptions = getMasterSlideOptions;
window.inferMasterIdForLayout = inferMasterIdForLayout;
window.getMasterSlideConfig = getMasterSlideConfig;
window.setCurrentSlideMaster = setCurrentSlideMaster;
window.updateMasterSlide = updateMasterSlide;
window.buildMasterSlideElements = buildMasterSlideElements;
