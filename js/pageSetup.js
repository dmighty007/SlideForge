const PRESENTATION_PAGE_SETUPS = {
    "standard-4-3": { id: "standard-4-3", label: "4:3", width: 1024, height: 768 },
    "widescreen-16-9": { id: "widescreen-16-9", label: "16:9", width: 1280, height: 720 },
    "widescreen-16-10": { id: "widescreen-16-10", label: "16:10", width: 1280, height: 800 },
};

const DEFAULT_PRESENTATION_PAGE_SETUP = "standard-4-3";

function normalizePresentationPageSetup(value) {
    return PRESENTATION_PAGE_SETUPS[value] ? value : DEFAULT_PRESENTATION_PAGE_SETUP;
}

function getPresentationPageSetupId(source = null) {
    const candidate = source && typeof source === "object" ? source.pageSetup : typeof state !== "undefined" ? state?.pageSetup : null;
    return normalizePresentationPageSetup(candidate);
}

function getPresentationPageSetupConfig(source = null) {
    return PRESENTATION_PAGE_SETUPS[getPresentationPageSetupId(source)];
}

function ensurePresentationPageSetup(source = null) {
    const target = source && typeof source === "object" ? source : typeof state !== "undefined" ? state : null;
    if (!target || typeof target !== "object") return DEFAULT_PRESENTATION_PAGE_SETUP;
    const normalized = normalizePresentationPageSetup(target.pageSetup);
    target.pageSetup = normalized;
    return normalized;
}

function _scaleLengthValue(value, ratio) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return `${Math.round(value * ratio)}px`;
    }
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "auto") return value;
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/i);
    if (!match) return value;
    return `${Math.round(Number(match[1]) * ratio)}px`;
}

function scaleSlideElementsForPageSetup(slide, fromConfig, toConfig) {
    if (!slide || !Array.isArray(slide.elements)) return slide;
    const scaleX = toConfig.width / fromConfig.width;
    const scaleY = toConfig.height / fromConfig.height;
    const nextSlide = JSON.parse(JSON.stringify(slide));
    nextSlide.elements = nextSlide.elements.map(element => {
        const next = { ...element };
        if (Number.isFinite(Number(next.x))) next.x = Math.round(Number(next.x) * scaleX);
        if (Number.isFinite(Number(next.y))) next.y = Math.round(Number(next.y) * scaleY);
        next.width = _scaleLengthValue(next.width, scaleX);
        if (!(typeof next.height === "string" && next.height.trim() === "auto")) {
            next.height = _scaleLengthValue(next.height, scaleY);
        }
        if (next.type === "connector" && Array.isArray(next.points)) {
            next.points = next.points.map(point => ({
                x: Math.round(Number(point?.x || 0) * scaleX),
                y: Math.round(Number(point?.y || 0) * scaleY),
            }));
        }
        return next;
    });
    return nextSlide;
}

function syncPresentationPageSetup() {
    const config = getPresentationPageSetupConfig();
    document.documentElement.style.setProperty("--slide-width", `${config.width}px`);
    document.documentElement.style.setProperty("--slide-height", `${config.height}px`);
    document.documentElement.style.setProperty("--slide-preview-aspect", `${config.width} / ${config.height}`);
    const selector = document.getElementById("page-setup-selector");
    if (selector) selector.value = config.id;
    if (typeof Reveal !== "undefined" && typeof Reveal.configure === "function") {
        Reveal.configure({ width: config.width, height: config.height });
    }
}

function changePresentationPageSetup(nextId) {
    ensurePresentationPageSetup();
    const currentConfig = getPresentationPageSetupConfig();
    const normalized = normalizePresentationPageSetup(nextId);
    if (normalized === getPresentationPageSetupId()) {
        syncPresentationPageSetup();
        if (typeof renderSlidesFromState === "function") renderSlidesFromState();
        if (typeof resetZoom === "function") requestAnimationFrame(() => resetZoom());
        return false;
    }

    if (typeof saveStateToUndo === "function") saveStateToUndo();
    const nextConfig = PRESENTATION_PAGE_SETUPS[normalized];
    state.slides = (state.slides || []).map(slide => scaleSlideElementsForPageSetup(slide, currentConfig, nextConfig));
    state.pageSetup = normalized;
    syncPresentationPageSetup();
    if (typeof renderSlidesFromState === "function") renderSlidesFromState();
    if (typeof resetZoom === "function") requestAnimationFrame(() => resetZoom());
    if (typeof updateSlideCounter === "function") updateSlideCounter();
    return true;
}

window.PRESENTATION_PAGE_SETUPS = PRESENTATION_PAGE_SETUPS;
window.DEFAULT_PRESENTATION_PAGE_SETUP = DEFAULT_PRESENTATION_PAGE_SETUP;
window.normalizePresentationPageSetup = normalizePresentationPageSetup;
window.getPresentationPageSetupId = getPresentationPageSetupId;
window.getPresentationPageSetupConfig = getPresentationPageSetupConfig;
window.ensurePresentationPageSetup = ensurePresentationPageSetup;
window.scaleSlideElementsForPageSetup = scaleSlideElementsForPageSetup;
window.syncPresentationPageSetup = syncPresentationPageSetup;
window.changePresentationPageSetup = changePresentationPageSetup;
