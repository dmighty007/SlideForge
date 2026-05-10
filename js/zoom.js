// js/zoom.js

let stateZoom = 1;
let isSpaceDown = false;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
let startScrollX = 0;
let startScrollY = 0;
let zoomMode = "fit";

const EDITOR_ZOOM_MIN = 0.1;
const EDITOR_ZOOM_MAX = 5;
const EDITOR_ZOOM_PADDING = 18;

function isPresentationPlaying() {
    return document.body.classList.contains("play-mode-active");
}

function clampZoom(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(parsed, EDITOR_ZOOM_MIN), EDITOR_ZOOM_MAX);
}

function getSlideSize() {
    const slideConfig = getPresentationPageSetupConfig();
    return {
        width: Number(slideConfig.width) || 1024,
        height: Number(slideConfig.height) || 768,
    };
}

function setImportantStyle(el, prop, value) {
    el.style.setProperty(prop, value, "important");
}

function initZoom() {
    const wrapper = document.getElementById("canvas-wrapper");
    if (!wrapper || wrapper.dataset.zoomInitialized === "true") return;
    wrapper.dataset.zoomInitialized = "true";

    // --- Zoom Events ---
    wrapper.addEventListener("wheel", (e) => {
        if (isPresentationPlaying()) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            changeZoom(delta, { anchorEvent: e });
        }
    }, { passive: false });

    // --- Panning Events ---
    window.addEventListener("keydown", (e) => {
        if (isPresentationPlaying()) return;
        if (e.code === "Space" && !isSpaceDown) {
            const isEditing = document.activeElement.tagName === "INPUT" || 
                              document.activeElement.tagName === "TEXTAREA" || 
                              document.activeElement.isContentEditable;
            if (isEditing) return;

            isSpaceDown = true;
            wrapper.style.cursor = "grab";
            // Prevent scrolling with space
            if (e.target === document.body) e.preventDefault();
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            isSpaceDown = false;
            isPanning = false;
            if (wrapper) wrapper.style.cursor = "";
        }
    });

    wrapper.addEventListener("mousedown", (e) => {
        if (isSpaceDown && !isPresentationPlaying()) {
            isPanning = true;
            startPanX = e.clientX;
            startPanY = e.clientY;
            startScrollX = wrapper.scrollLeft;
            startScrollY = wrapper.scrollTop;
            wrapper.style.cursor = "grabbing";
            e.preventDefault();
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (isPanning) {
            const dx = e.clientX - startPanX;
            const dy = e.clientY - startPanY;
            wrapper.scrollLeft = startScrollX - dx;
            wrapper.scrollTop = startScrollY - dy;
        }
    });

    window.addEventListener("mouseup", () => {
        if (isPanning) {
            isPanning = false;
            wrapper.style.cursor = isSpaceDown ? "grab" : "";
        }
    });
}

function getZoomAnchor(wrapper, event = null) {
    if (!wrapper) return null;
    const engine = document.getElementById("zoom-engine");
    const padX = parseFloat(engine?.dataset.zoomPadX) || 0;
    const padY = parseFloat(engine?.dataset.zoomPadY) || 0;
    const rect = wrapper.getBoundingClientRect();
    const clientX = event?.clientX ?? rect.left + wrapper.clientWidth / 2;
    const clientY = event?.clientY ?? rect.top + wrapper.clientHeight / 2;
    return {
        x: (wrapper.scrollLeft + clientX - rect.left - padX) / stateZoom,
        y: (wrapper.scrollTop + clientY - rect.top - padY) / stateZoom,
        clientX,
        clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
    };
}

function restoreZoomAnchor(wrapper, anchor) {
    if (!wrapper || !anchor) return;
    const engine = document.getElementById("zoom-engine");
    const padX = parseFloat(engine?.dataset.zoomPadX) || 0;
    const padY = parseFloat(engine?.dataset.zoomPadY) || 0;
    wrapper.scrollLeft = padX + anchor.x * stateZoom - (anchor.clientX - anchor.rectLeft);
    wrapper.scrollTop = padY + anchor.y * stateZoom - (anchor.clientY - anchor.rectTop);
}

function applyZoom(options = {}) {
    const engine = document.getElementById("zoom-engine");
    const wrapper = document.getElementById("canvas-wrapper");
    const label = document.getElementById("zoom-label");
    const slider = document.getElementById("zoom-slider");

    const anchor = options.anchor || (options.preserveViewport ? getZoomAnchor(wrapper, options.anchorEvent) : null);

    if (engine && wrapper) {
        if (isPresentationPlaying()) {
            suspendEditorZoom();
            return;
        }

        const { width: slideW, height: slideH } = getSlideSize();
        
        const scaledW = slideW * stateZoom;
        const scaledH = slideH * stateZoom;

        const padX = Math.max(EDITOR_ZOOM_PADDING, (wrapper.clientWidth - scaledW) / 2);
        const padY = Math.max(EDITOR_ZOOM_PADDING, (wrapper.clientHeight - scaledH) / 2);

        engine.style.width = `${scaledW + padX * 2}px`;
        engine.style.height = `${scaledH + padY * 2}px`;
        engine.style.left = "0";
        engine.style.top = "0";
        engine.style.marginLeft = "0";
        engine.style.marginTop = "0";
        engine.style.marginRight = "0";
        engine.style.marginBottom = "0";
        engine.dataset.zoomPadX = String(padX);
        engine.dataset.zoomPadY = String(padY);
        
        const revealEl = engine.querySelector(".reveal");
        if (revealEl) {
            setImportantStyle(revealEl, "width", `${slideW}px`);
            setImportantStyle(revealEl, "height", `${slideH}px`);
            setImportantStyle(revealEl, "position", "absolute");
            setImportantStyle(revealEl, "left", `${padX}px`);
            setImportantStyle(revealEl, "top", `${padY}px`);
            setImportantStyle(revealEl, "transform", `scale(${stateZoom})`);
            setImportantStyle(revealEl, "transform-origin", "0 0");
            revealEl.style.maxWidth = "none";
            revealEl.style.maxHeight = "none";
        }
        
        engine.style.transform = "none";
    }

    if (label) label.textContent = `${Math.round(stateZoom * 100)}%`;
    if (slider) slider.value = stateZoom;

    if (typeof Reveal !== "undefined" && Reveal.layout) {
        Reveal.layout();
    }

    if (anchor) {
        requestAnimationFrame(() => restoreZoomAnchor(wrapper, anchor));
    }
}

function changeZoom(delta, options = {}) {
    const wrapper = document.getElementById("canvas-wrapper");
    const anchor = getZoomAnchor(wrapper, options.anchorEvent);
    zoomMode = "manual";
    stateZoom = clampZoom(stateZoom + delta);
    applyZoom({ ...options, preserveViewport: false, anchor });
}

function handleZoomSlider(val, options = {}) {
    const wrapper = document.getElementById("canvas-wrapper");
    const anchor = getZoomAnchor(wrapper, options.anchorEvent);
    zoomMode = "manual";
    stateZoom = clampZoom(val);
    applyZoom({ ...options, preserveViewport: false, anchor });
}

function calculateFitZoom() {
    const wrapper = document.getElementById("canvas-wrapper");
    if (!wrapper) return 1;
    const { width: slideW, height: slideH } = getSlideSize();
    const padding = EDITOR_ZOOM_PADDING * 2;
    const availableW = Math.max(1, wrapper.clientWidth - padding);
    const availableH = Math.max(1, wrapper.clientHeight - padding);

    const scaleX = availableW / slideW;
    const scaleY = availableH / slideH;
    return clampZoom(Math.min(scaleX, scaleY));
}

function resetZoom() {
    if (isPresentationPlaying()) return;
    zoomMode = "fit";
    stateZoom = calculateFitZoom();
    
    applyZoom();
    centerSlide();
}

function handleEditorViewportResize() {
    if (isPresentationPlaying()) return;
    if (zoomMode === "fit") {
        stateZoom = calculateFitZoom();
        applyZoom();
        centerSlide();
    } else {
        applyZoom({ preserveViewport: true });
    }
    requestAnimationFrame(() => {
        if (typeof updateGroupBound === "function") updateGroupBound();
    });
}

function centerSlide() {
    const wrapper = document.getElementById("canvas-wrapper");
    const engine = document.getElementById("zoom-engine");
    if (!wrapper || !engine) return;

    // Use multiple requestAnimationFrames to ensure layout is flushed 
    // after zoom changes or slide transitions.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const targetLeft = engine.offsetWidth / 2 - wrapper.clientWidth / 2;
            const targetTop = engine.offsetHeight / 2 - wrapper.clientHeight / 2;
            wrapper.scrollTo({
                left: Math.max(0, targetLeft),
                top: Math.max(0, targetTop),
                behavior: 'auto' // Use auto for instant programmatic resets
            });
        });
    });
}

function suspendEditorZoom() {
    const engine = document.getElementById("zoom-engine");
    const revealEl = engine?.querySelector(".reveal");
    if (engine) {
        ["width", "height", "left", "top", "margin-left", "margin-top", "margin-right", "margin-bottom", "transform"].forEach(prop =>
            engine.style.removeProperty(prop),
        );
        delete engine.dataset.zoomPadX;
        delete engine.dataset.zoomPadY;
    }
    if (revealEl) {
        ["width", "height", "position", "left", "top", "transform", "transform-origin", "max-width", "max-height"].forEach(prop =>
            revealEl.style.removeProperty(prop),
        );
    }
}

function restoreEditorZoom() {
    if (isPresentationPlaying()) return;
    applyZoom();
    centerSlide();
    requestAnimationFrame(() => {
        if (typeof updateGroupBound === "function") updateGroupBound();
        if (typeof updateFloatingToolbars === "function") updateFloatingToolbars();
    });
}

window.getCanvasScale = function() {
    if (isPresentationPlaying()) {
        return typeof Reveal !== "undefined" && typeof Reveal.getScale === "function" ? Reveal.getScale() || 1 : 1;
    }
    return stateZoom;
};

// Global bindings
window.changeZoom = changeZoom;
window.handleZoomSlider = handleZoomSlider;
window.applyZoom = applyZoom;
window.resetZoom = resetZoom;
window.centerSlide = centerSlide;
window.handleEditorViewportResize = handleEditorViewportResize;
window.suspendEditorZoom = suspendEditorZoom;
window.restoreEditorZoom = restoreEditorZoom;
window.initZoom = initZoom;
