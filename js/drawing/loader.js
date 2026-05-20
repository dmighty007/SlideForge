import { DrawingEngine } from "./DrawingEngine.js";
import { ExportManager } from "./ExportManager.js";
import { RoughRenderer } from "./RoughRenderer.js";
import { StrokeRenderer } from "./StrokeRenderer.js";

let engine = null;
let escHandler = null;
let activeSlideKey = null;
let syncingFromSlide = false;
let resizeObserver = null;
let repositionTimer = null;
let livePersistTimer = null;
let whiteboardSessionUndoCaptured = false;

const STROKE_SWATCHES = ["#1f2937", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#6741d9"];
const BG_SWATCHES = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#fff3bf", "#ffd43b"];

function getEngine() {
    if (!engine) engine = new DrawingEngine("slideforge-whiteboard", { showGrid: false, allowPanZoom: false });
    return engine;
}

window.getWhiteboardEngine = getEngine;

function registerEscHandler() {
    if (escHandler) return;
    escHandler = e => {
        if (e.key === "Escape") exitWhiteboardMode();
    };
    document.addEventListener("keydown", escHandler);
}

function unregisterEscHandler() {
    if (!escHandler) return;
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
}

function getStylePanel() {
    return document.getElementById("whiteboard-style-panel");
}

function readGlobal(name, fallback = null) {
    try {
        const value = Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
        return value === undefined ? fallback : value;
    } catch (_err) {
        return fallback;
    }
}

function getActiveSlideIndex() {
    const index = readGlobal("currentSlideIndex", 0);
    return Number.isInteger(index) ? index : 0;
}

function getActiveSlideData() {
    const appState = readGlobal("state", null);
    return appState?.slides?.[getActiveSlideIndex()] || null;
}

function getActiveSlideElement() {
    const slide = getActiveSlideData();
    return (
        (slide?.id ? document.getElementById(slide.id) : null) ||
        document.querySelector(`.presentation-slide[data-slide-index="${getActiveSlideIndex()}"]`) ||
        document.querySelector(".reveal .slides section.present")
    );
}

function cloneElements(elements = []) {
    return JSON.parse(JSON.stringify(Array.isArray(elements) ? elements : []));
}

function getCallableGlobal(name) {
    const value = readGlobal(name, null);
    return typeof value === "function" ? value : null;
}

function closeWhiteboardBlockingOverlays() {
    window.closeExportMenu?.();
    window.closeUserMenu?.();
    window.closeLayersPopover?.();
    window.closeShapePicker?.();
    window.closeSymbolPicker?.();
    window.closeEquationModal?.();
    ["canvas-context-menu", "floating-text-toolbar", "floating-shape-toolbar", "floating-image-toolbar"].forEach(id => {
        document.getElementById(id)?.classList.add("hidden");
    });
    ["symbol-picker-modal", "shape-picker-modal"].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = "none";
    });
    document.getElementById("auth-menu")?.classList.add("hidden");
    document.getElementById("export-menu-dropdown")?.classList.remove("show");
}

function makeElementId(prefix = "el") {
    const generator = getCallableGlobal("generateId");
    if (generator) return generator(prefix);
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function getNextSlideZIndex() {
    const getter = getCallableGlobal("getNextZIndex");
    if (getter) return getter();
    const slide = getActiveSlideData();
    const maxZ = Math.max(0, ...(slide?.elements || []).map(el => Number(el.styles?.zIndex) || 0));
    return maxZ + 1;
}

function normalizeBounds(bounds) {
    if (!bounds) return { x: 0, y: 0, width: 1, height: 1 };
    return {
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y),
        width: Math.max(1, Math.ceil(bounds.width)),
        height: Math.max(1, Math.ceil(bounds.height)),
    };
}

function localizeDrawingElement(el, bounds) {
    const copy = cloneElements([el])[0];
    if (copy.type === "freehand") {
        copy.points = (copy.points || []).map(point => ({ ...point, x: point.x - bounds.x, y: point.y - bounds.y }));
    } else {
        copy.x = (copy.x || 0) - bounds.x;
        copy.y = (copy.y || 0) - bounds.y;
    }
    return copy;
}

function globalizeDrawingElement(el, offsetX, offsetY, sourceElementId = "") {
    const copy = cloneElements([el])[0];
    copy.sourceElementId = sourceElementId || copy.sourceElementId || "";
    if (copy.type === "freehand") {
        copy.points = (copy.points || []).map(point => ({ ...point, x: point.x + offsetX, y: point.y + offsetY }));
    } else {
        copy.x = (copy.x || 0) + offsetX;
        copy.y = (copy.y || 0) + offsetY;
    }
    return copy;
}

function scaleDrawingElement(el, scaleX, scaleY) {
    const copy = cloneElements([el])[0];
    if (copy.type === "freehand") {
        copy.points = (copy.points || []).map(point => ({ ...point, x: point.x * scaleX, y: point.y * scaleY }));
    } else {
        copy.x = (copy.x || 0) * scaleX;
        copy.y = (copy.y || 0) * scaleY;
        if (copy.width !== undefined) copy.width *= scaleX;
        if (copy.height !== undefined) copy.height *= scaleY;
    }
    if (copy.fontSize !== undefined) copy.fontSize *= Math.max(scaleX, scaleY);
    return copy;
}

function pxNumber(value, fallback = 1) {
    const parsed = Number.parseFloat(String(value ?? "").replace("px", ""));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function whiteboardSlideElementsToDrawingElements(slide) {
    const elements = [];
    (slide?.elements || []).forEach(el => {
        if (el.type !== "whiteboard" || !el.drawingElement) return;
        const viewBox = el.drawingViewBox || {};
        const scaleX = pxNumber(el.width, viewBox.width || 1) / Math.max(1, Number(viewBox.width) || pxNumber(el.width, 1));
        const scaleY = pxNumber(el.height, viewBox.height || 1) / Math.max(1, Number(viewBox.height) || pxNumber(el.height, 1));
        elements.push(globalizeDrawingElement(scaleDrawingElement(el.drawingElement, scaleX, scaleY), Number(el.x) || 0, Number(el.y) || 0, el.id));
    });
    if (!elements.length && Array.isArray(slide?.whiteboardElements)) {
        return cloneElements(slide.whiteboardElements);
    }
    return elements;
}

function drawingElementsToSlideElements(drawingElements, previousElements = []) {
    const previousById = new Map(previousElements.filter(el => el.type === "whiteboard").map(el => [el.id, el]));
    let nextZ = Math.max(getNextSlideZIndex(), Math.max(0, ...previousElements.map(el => Number(el.styles?.zIndex) || 0)) + 1);
    return drawingElements.map(drawingEl => {
        const bounds = normalizeBounds(getEngine().getElementBounds(drawingEl));
        const sourceId = drawingEl.sourceElementId || "";
        const previous = sourceId ? previousById.get(sourceId) : null;
        const id = previous?.id || sourceId || makeElementId("el");
        const localDrawing = localizeDrawingElement({ ...drawingEl, sourceElementId: id }, bounds);
        const zIndex = previous?.styles?.zIndex || nextZ++;
        return {
            id,
            type: "whiteboard",
            x: bounds.x,
            y: bounds.y,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            drawingElement: localDrawing,
            drawingViewBox: { width: bounds.width, height: bounds.height },
            styles: {
                ...(previous?.styles || {}),
                zIndex,
                backgroundColor: "transparent",
                borderRadius: "0px",
            },
            animation: previous?.animation || null,
            fragmentAnimation: previous?.fragmentAnimation || "none",
            fragmentIndex: previous?.fragmentIndex ?? null,
        };
    });
}

function renderDrawingElementToCanvas(canvas, whiteboardObject) {
    const drawingElement = whiteboardObject?.drawingElement || whiteboardObject;
    if (!canvas || !drawingElement) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || Number.parseFloat(canvas.style.width) || canvas.parentElement?.clientWidth || 1);
    const height = Math.max(1, rect.height || Number.parseFloat(canvas.style.height) || canvas.parentElement?.clientHeight || 1);
    const viewBox = whiteboardObject?.drawingViewBox || { width, height };
    const scaleX = width / Math.max(1, Number(viewBox.width) || width);
    const scaleY = height / Math.max(1, Number(viewBox.height) || height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.globalAlpha *= drawingElement.opacity ?? 1;
    if (drawingElement.type === "freehand") {
        StrokeRenderer.drawInkStroke(ctx, drawingElement.points || [], drawingElement.strokeColor, drawingElement.strokeWidth);
    } else if (drawingElement.type === "text") {
        ctx.font = `${drawingElement.fontSize || 22}px ${drawingElement.fontFamily || '"Comic Sans MS", "Segoe Print", cursive'}`;
        ctx.fillStyle = drawingElement.strokeColor || "#1f2937";
        ctx.textBaseline = "alphabetic";
        String(drawingElement.text || "").split("\n").forEach((line, index) => {
            ctx.fillText(line, drawingElement.x || 0, (drawingElement.y || 0) + index * (drawingElement.fontSize || 22) * 1.25);
        });
    } else if (drawingElement.type === "draw_shape") {
        const style = {
            ...drawingElement,
            random: RoughRenderer.seededRandom(drawingElement.seed || 1),
            fillOpacity: drawingElement.fillStyle === "solid" ? 1 : 0.35,
        };
        if (drawingElement.shapeType === "rectangle") RoughRenderer.drawRoughRect(ctx, drawingElement.x, drawingElement.y, drawingElement.width, drawingElement.height, style);
        else if (drawingElement.shapeType === "diamond") RoughRenderer.drawRoughDiamond(ctx, drawingElement.x, drawingElement.y, drawingElement.width, drawingElement.height, style);
        else if (drawingElement.shapeType === "ellipse") RoughRenderer.drawRoughEllipse(ctx, drawingElement.x + drawingElement.width / 2, drawingElement.y + drawingElement.height / 2, Math.abs(drawingElement.width / 2), Math.abs(drawingElement.height / 2), style);
        else if (drawingElement.shapeType === "line") RoughRenderer.drawRoughLine(ctx, drawingElement.x, drawingElement.y, drawingElement.x + drawingElement.width, drawingElement.y + drawingElement.height, style);
        else if (drawingElement.shapeType === "arrow") RoughRenderer.drawRoughArrow(ctx, drawingElement.x, drawingElement.y, drawingElement.x + drawingElement.width, drawingElement.y + drawingElement.height, style);
    }
    ctx.restore();
}

window.renderWhiteboardDrawingElement = renderDrawingElementToCanvas;

function persistWhiteboardToSlide({ renderSlide = false, finalizeActive = false } = {}) {
    if (syncingFromSlide || !engine) return;
    if (finalizeActive) {
        engine.commitActiveTextEditor?.();
        engine.finalizeCurrentStroke?.();
    }
    const slide = getActiveSlideData();
    if (!slide) return;
    const previousElements = slide.elements || [];
    const drawingElements = engine.getElements();
    const selectedDrawingId = engine.selectedElementId;
    const whiteboardSlideElements = drawingElementsToSlideElements(drawingElements, previousElements);
    whiteboardSlideElements.forEach((slideElement, index) => {
        if (engine.elements[index]) engine.elements[index].sourceElementId = slideElement.id;
    });
    slide.elements = [
        ...previousElements.filter(el => el.type !== "whiteboard"),
        ...whiteboardSlideElements,
    ];
    slide.whiteboardElements = [];
    const selectedSlideElement = whiteboardSlideElements.find((slideElement, index) => drawingElements[index]?.id === selectedDrawingId);
    if (typeof window.schedulePresentationAutosave === "function") {
        window.schedulePresentationAutosave(250);
    }
    if (!renderSlide && isWhiteboardActive()) {
        return;
    }
    if (renderSlide && typeof window.renderSlidesFromState === "function") {
        window.renderSlidesFromState({ preserveState: true });
        if (selectedSlideElement?.id) {
            requestAnimationFrame(() => {
                if (typeof window.selectElement === "function") window.selectElement(selectedSlideElement.id);
            });
        }
        return;
    }
    if (typeof window.refreshActiveSlidePreview === "function") {
        window.refreshActiveSlidePreview();
    } else if (typeof window.renderSlidePreviews === "function") {
        window.renderSlidePreviews(getActiveSlideIndex());
    }
}

function scheduleLiveWhiteboardPersist() {
    if (!isWhiteboardActive()) return;
    if (livePersistTimer) clearTimeout(livePersistTimer);
    livePersistTimer = setTimeout(() => {
        livePersistTimer = null;
        persistWhiteboardToSlide({ renderSlide: false, finalizeActive: false });
    }, 180);
}

function syncWhiteboardFromSlide({ force = false } = {}) {
    const slide = getActiveSlideData();
    const key = slide?.id || `slide-${getActiveSlideIndex()}`;
    if (!force && activeSlideKey === key) return;
    activeSlideKey = key;
    syncingFromSlide = true;
    getEngine().setElements(whiteboardSlideElementsToDrawingElements(slide));
    syncingFromSlide = false;
}

function isWhiteboardActive() {
    const container = document.getElementById("whiteboard-overlay-container");
    return !!container && container.style.display !== "none";
}

function positionWhiteboardOverSlide() {
    const container = document.getElementById("whiteboard-overlay-container");
    const canvas = document.getElementById("slideforge-whiteboard");
    const slideEl = getActiveSlideElement();
    if (!container || !canvas || !slideEl) return false;
    const rect = slideEl.getBoundingClientRect();
    const toolbar = document.getElementById("whiteboard-floating-toolbar");
    container.style.left = `${Math.round(rect.left)}px`;
    container.style.top = `${Math.round(rect.top)}px`;
    container.style.width = `${Math.round(rect.width)}px`;
    container.style.height = `${Math.round(rect.height)}px`;
    if (toolbar) {
        const toolbarTop = Math.max(8, rect.top - 54);
        toolbar.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
        toolbar.style.top = `${Math.round(toolbarTop)}px`;
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    return true;
}

function scheduleWhiteboardPosition() {
    if (repositionTimer) cancelAnimationFrame(repositionTimer);
    repositionTimer = requestAnimationFrame(() => {
        repositionTimer = null;
        if (!isWhiteboardActive()) return;
        syncWhiteboardFromSlide();
        positionWhiteboardOverSlide();
    });
}

function startPositionTracking() {
    stopPositionTracking();
    if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(scheduleWhiteboardPosition);
        const wrapper = document.getElementById("canvas-wrapper");
        const slide = getActiveSlideElement();
        if (wrapper) resizeObserver.observe(wrapper);
        if (slide) resizeObserver.observe(slide);
    }
    window.addEventListener("resize", scheduleWhiteboardPosition);
    window.addEventListener("scroll", scheduleWhiteboardPosition, true);
}

function stopPositionTracking() {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    window.removeEventListener("resize", scheduleWhiteboardPosition);
    window.removeEventListener("scroll", scheduleWhiteboardPosition, true);
    if (repositionTimer) {
        cancelAnimationFrame(repositionTimer);
        repositionTimer = null;
    }
}

function updateWhiteboardUi() {
    const activeEngine = getEngine();
    const tools = ["select", "pen", "rectangle", "diamond", "ellipse", "line", "arrow", "text", "eraser"];
    tools.forEach(tool => {
        const btn = document.getElementById(`wb-tool-${tool}`);
        if (!btn) return;
        const active = activeEngine.activeTool === tool;
        btn.classList.toggle("bg-indigo-50", active);
        btn.classList.toggle("text-indigo-600", active);
        btn.classList.toggle("font-bold", active);
        btn.classList.toggle("text-slate-600", !active);
        btn.classList.toggle("hover:bg-slate-100", !active);
    });
    const color = document.getElementById("wb-color-picker");
    if (color) color.value = activeEngine.strokeColor;
    renderStylePanel(activeEngine);
    const activeControl = document.activeElement;
    const isEditingPropertyControl =
        activeControl?.closest?.("#properties-panel") &&
        activeControl.matches?.("input[type='range'], input[type='color'], input[type='number'], input[type='text'], select, textarea");
    if (
        document.body.classList.contains("whiteboard-mode-active") &&
        typeof window.buildPropertiesPanel === "function" &&
        !isEditingPropertyControl
    ) {
        window.buildPropertiesPanel();
    }
}

function swatchButton(type, color, current) {
    const label = color === "transparent" ? "transparent" : color;
    const isActive = current === color;
    const transparent = color === "transparent";
    return `<button type="button" class="wb-swatch${isActive ? " is-active" : ""}${transparent ? " wb-swatch-transparent" : ""}" title="${label}" style="${transparent ? "" : `--swatch:${color}`}" onclick="setWhiteboard${type}('${color}')"></button>`;
}

function optionButton(label, active, onclick, icon = "") {
    return `<button type="button" class="wb-option${active ? " is-active" : ""}" onclick="${onclick}" title="${label}">${icon || label}</button>`;
}

function renderStylePanel(activeEngine) {
    const panel = getStylePanel();
    if (!panel) return;
    const selected = activeEngine.getSelectedElement?.();
    const strokeColor = selected?.strokeColor || activeEngine.strokeColor;
    const backgroundColor = selected?.backgroundColor || activeEngine.backgroundColor;
    const strokeWidth = selected?.strokeWidth || activeEngine.strokeWidth;
    const strokeStyle = selected?.strokeStyle || activeEngine.strokeStyle;
    const fillStyle = selected?.fillStyle || activeEngine.fillStyle;
    const roughness = selected?.roughness ?? activeEngine.roughness;
    const opacity = Math.round((selected?.opacity ?? activeEngine.opacity) * 100);
    panel.innerHTML = `
        <div class="wb-panel-section">
            <div class="wb-panel-label">Stroke</div>
            <div class="wb-swatch-row">${STROKE_SWATCHES.map(color => swatchButton("Color", color, strokeColor)).join("")}</div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Background</div>
            <div class="wb-swatch-row">${BG_SWATCHES.map(color => swatchButton("Background", color, backgroundColor)).join("")}</div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Fill</div>
            <div class="wb-option-row">
                ${optionButton("None", fillStyle === "none", "setWhiteboardFillStyle('none')", '<i class="fa-solid fa-ban"></i>')}
                ${optionButton("Hachure", fillStyle === "hachure", "setWhiteboardFillStyle('hachure')", '<i class="fa-solid fa-grip-lines"></i>')}
                ${optionButton("Solid", fillStyle === "solid", "setWhiteboardFillStyle('solid')", '<i class="fa-solid fa-square"></i>')}
                ${optionButton("Cross-hatch", fillStyle === "cross-hatch", "setWhiteboardFillStyle('cross-hatch')", '<i class="fa-solid fa-border-all"></i>')}
            </div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Stroke width</div>
            <div class="wb-option-row">
                ${[1, 2, 4].map(width => optionButton(String(width), Number(strokeWidth) === width, `setWhiteboardStrokeWidth(${width})`, `<span style="height:${Math.max(2, width)}px" class="wb-line-sample"></span>`)).join("")}
            </div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Stroke style</div>
            <div class="wb-option-row">
                ${optionButton("Solid", strokeStyle === "solid", "setWhiteboardStrokeStyle('solid')", '<span class="wb-line-sample"></span>')}
                ${optionButton("Dashed", strokeStyle === "dashed", "setWhiteboardStrokeStyle('dashed')", '<span class="wb-line-sample dashed"></span>')}
                ${optionButton("Dotted", strokeStyle === "dotted", "setWhiteboardStrokeStyle('dotted')", '<span class="wb-line-sample dotted"></span>')}
            </div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Sloppiness</div>
            <div class="wb-option-row">
                ${[0.4, 1.4, 2.4].map((value, index) => optionButton(["Low", "Med", "High"][index], Math.abs(Number(roughness) - value) < 0.05, `setWhiteboardRoughness(${value})`, ["-", "~", "≈"][index])).join("")}
            </div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Opacity</div>
            <input class="wb-range" type="range" min="10" max="100" value="${opacity}" oninput="setWhiteboardOpacity(this.value / 100)">
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Layers</div>
            <div class="wb-option-row">
                ${optionButton("Send to back", false, "sendWhiteboardToBack()", '<i class="fa-solid fa-angles-down"></i>')}
                ${optionButton("Send backward", false, "sendWhiteboardBackward()", '<i class="fa-solid fa-arrow-down"></i>')}
                ${optionButton("Bring forward", false, "bringWhiteboardForward()", '<i class="fa-solid fa-arrow-up"></i>')}
                ${optionButton("Bring to front", false, "bringWhiteboardToFront()", '<i class="fa-solid fa-angles-up"></i>')}
            </div>
        </div>
        <div class="wb-panel-section">
            <div class="wb-panel-label">Actions</div>
            <div class="wb-option-row">
                ${optionButton("Duplicate", false, "duplicateWhiteboardSelection()", '<i class="fa-regular fa-copy"></i>')}
                ${optionButton("Delete", false, "deleteWhiteboardSelection()", '<i class="fa-regular fa-trash-can"></i>')}
            </div>
        </div>
    `;
}

function renderWhiteboardPropertiesPanel(panel) {
    if (!panel) return;
    const activeEngine = getEngine();
    const selected = activeEngine.getSelectedElement?.();
    const strokeColor = selected?.strokeColor || activeEngine.strokeColor;
    const backgroundColor = selected?.backgroundColor || activeEngine.backgroundColor;
    const strokeWidth = selected?.strokeWidth || activeEngine.strokeWidth;
    const strokeStyle = selected?.strokeStyle || activeEngine.strokeStyle;
    const fillStyle = selected?.fillStyle || activeEngine.fillStyle;
    const roughness = selected?.roughness ?? activeEngine.roughness;
    const opacity = Math.round((selected?.opacity ?? activeEngine.opacity) * 100);
    const count = activeEngine.elements.length;

    panel.innerHTML = `
        <div class="p-3 space-y-3">
            <div class="prop-group">
                <div class="flex items-center justify-between py-2">
                    <h3 class="prop-group-title m-0">Whiteboard</h3>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">${count} item${count === 1 ? "" : "s"}</span>
                </div>
                <div class="space-y-3 pt-1 pb-2">
                    <div class="grid grid-cols-5 gap-1.5">
                        ${["select", "pen", "rectangle", "diamond", "ellipse", "line", "arrow", "text", "eraser"]
                            .map(tool => {
                                const icon =
                                    tool === "select"
                                        ? "fa-arrow-pointer"
                                        : tool === "pen"
                                          ? "fa-pen"
                                          : tool === "rectangle"
                                            ? "fa-regular fa-square"
                                            : tool === "diamond"
                                              ? "fa-regular fa-gem"
                                              : tool === "ellipse"
                                                ? "fa-regular fa-circle"
                                                : tool === "line"
                                                  ? "fa-minus"
                                                  : tool === "arrow"
                                                    ? "fa-arrow-right"
                                                    : tool === "text"
                                                      ? "fa-font"
                                                      : "fa-eraser";
                                const prefix = icon.startsWith("fa-regular") ? "" : "fa-solid ";
                                return `<button type="button" class="prop-icon-btn ${activeEngine.activeTool === tool ? "active" : ""}" onclick="setWhiteboardTool('${tool}')" title="${tool}"><i class="${prefix}${icon}"></i></button>`;
                            })
                            .join("")}
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" onclick="undoWhiteboard()" class="prop-action-btn"><i class="fa-solid fa-rotate-left"></i> Undo</button>
                        <button type="button" onclick="redoWhiteboard()" class="prop-action-btn"><i class="fa-solid fa-rotate-right"></i> Redo</button>
                        <button type="button" onclick="exitWhiteboardMode()" class="prop-action-btn"><i class="fa-solid fa-check"></i> Done</button>
                    </div>
                </div>
            </div>

            <div class="prop-group">
                <div class="flex items-center justify-between py-2">
                    <h3 class="prop-group-title m-0">${selected ? "Selected Object" : "Drawing Style"}</h3>
                </div>
                <div class="space-y-4 pt-1 pb-2">
                    <div class="space-y-2">
                        <label class="prop-label">Stroke</label>
                        <div class="wb-swatch-row">${STROKE_SWATCHES.map(color => swatchButton("Color", color, strokeColor)).join("")}</div>
                    </div>
                    <div class="space-y-2">
                        <label class="prop-label">Background</label>
                        <div class="wb-swatch-row">${BG_SWATCHES.map(color => swatchButton("Background", color, backgroundColor)).join("")}</div>
                    </div>
                    <div class="space-y-2">
                        <label class="prop-label">Fill</label>
                        <div class="wb-option-row">
                            ${optionButton("None", fillStyle === "none", "setWhiteboardFillStyle('none')", '<i class="fa-solid fa-ban"></i>')}
                            ${optionButton("Hachure", fillStyle === "hachure", "setWhiteboardFillStyle('hachure')", '<i class="fa-solid fa-grip-lines"></i>')}
                            ${optionButton("Solid", fillStyle === "solid", "setWhiteboardFillStyle('solid')", '<i class="fa-solid fa-square"></i>')}
                            ${optionButton("Cross-hatch", fillStyle === "cross-hatch", "setWhiteboardFillStyle('cross-hatch')", '<i class="fa-solid fa-border-all"></i>')}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-2">
                            <label class="prop-label">Width</label>
                            <div class="wb-option-row">
                                ${[1, 2, 4].map(width => optionButton(String(width), Number(strokeWidth) === width, `setWhiteboardStrokeWidth(${width})`, `<span style="height:${Math.max(2, width)}px" class="wb-line-sample"></span>`)).join("")}
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="prop-label">Stroke</label>
                            <div class="wb-option-row">
                                ${optionButton("Solid", strokeStyle === "solid", "setWhiteboardStrokeStyle('solid')", '<span class="wb-line-sample"></span>')}
                                ${optionButton("Dashed", strokeStyle === "dashed", "setWhiteboardStrokeStyle('dashed')", '<span class="wb-line-sample dashed"></span>')}
                                ${optionButton("Dotted", strokeStyle === "dotted", "setWhiteboardStrokeStyle('dotted')", '<span class="wb-line-sample dotted"></span>')}
                            </div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="prop-label">Sloppiness</label>
                        <div class="wb-option-row">
                            ${[0.4, 1.4, 2.4].map((value, index) => optionButton(["Low", "Med", "High"][index], Math.abs(Number(roughness) - value) < 0.05, `setWhiteboardRoughness(${value})`, ["-", "~", "≈"][index])).join("")}
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="prop-label">Opacity</label>
                            <span class="text-[10px] font-mono text-slate-500">${opacity}%</span>
                        </div>
                        <input class="wb-range" type="range" min="10" max="100" value="${opacity}" oninput="this.previousElementSibling.querySelector('span').textContent = Math.round(this.value) + '%'; setWhiteboardOpacity(this.value / 100)">
                    </div>
                </div>
            </div>

            <div class="prop-group">
                <div class="flex items-center justify-between py-2">
                    <h3 class="prop-group-title m-0">Arrange</h3>
                </div>
                <div class="space-y-3 pt-1 pb-2">
                    <div class="grid grid-cols-4 gap-2">
                        ${optionButton("Send to back", false, "sendWhiteboardToBack()", '<i class="fa-solid fa-angles-down"></i>')}
                        ${optionButton("Send backward", false, "sendWhiteboardBackward()", '<i class="fa-solid fa-arrow-down"></i>')}
                        ${optionButton("Bring forward", false, "bringWhiteboardForward()", '<i class="fa-solid fa-arrow-up"></i>')}
                        ${optionButton("Bring to front", false, "bringWhiteboardToFront()", '<i class="fa-solid fa-angles-up"></i>')}
                    </div>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" onclick="duplicateWhiteboardSelection()" class="prop-action-btn"><i class="fa-regular fa-copy"></i> Copy</button>
                        <button type="button" onclick="deleteWhiteboardSelection()" class="prop-action-btn"><i class="fa-regular fa-trash-can"></i> Delete</button>
                        <button type="button" onclick="clearWhiteboard()" class="prop-action-btn text-rose-600"><i class="fa-solid fa-trash-can"></i> Clear</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.renderWhiteboardPropertiesPanel = renderWhiteboardPropertiesPanel;

window.toggleWhiteboardMode = function () {
    const container = document.getElementById("whiteboard-overlay-container");
    const canvas = document.getElementById("slideforge-whiteboard");
    const toolbar = document.getElementById("whiteboard-floating-toolbar");
    const guide = document.getElementById("whiteboard-guide-card");
    const btn = document.getElementById("btn-whiteboard-toggle");
    const panel = getStylePanel();
    if (!container || !canvas || !toolbar) return;
    const isActive = container.style.display !== "none";
    if (isActive) {
        exitWhiteboardMode();
        return;
    }
    closeWhiteboardBlockingOverlays();
    if (!whiteboardSessionUndoCaptured && typeof window.saveStateToUndo === "function") {
        window.saveStateToUndo();
        whiteboardSessionUndoCaptured = true;
    }
    syncWhiteboardFromSlide({ force: true });
    if (!positionWhiteboardOverSlide()) return;
    container.style.display = "block";
    container.style.pointerEvents = "none";
    canvas.style.pointerEvents = "auto";
    document.body.classList.add("whiteboard-mode-active");
    Function("if (typeof clearSelection === 'function') clearSelection()")();
    if (typeof window.setPropertiesPanelVisible === "function") {
        window.setPropertiesPanelVisible(true);
        requestAnimationFrame(scheduleWhiteboardPosition);
        setTimeout(scheduleWhiteboardPosition, 120);
    }
    btn?.classList.add("bg-indigo-100", "ring-2", "ring-indigo-300");
    if (guide) guide.style.display = "none";
    const activeEngine = getEngine();
    activeEngine.setOptions({ showGrid: false, allowPanZoom: false });
    activeEngine.setupEventHandlers();
    startPositionTracking();
    setTimeout(() => {
        container.style.opacity = "1";
        toolbar.style.opacity = "1";
        toolbar.style.pointerEvents = "auto";
        toolbar.style.transform = "translateX(-50%) scale(1)";
        if (panel) {
            panel.classList.add("opacity-0", "pointer-events-none");
            panel.classList.remove("opacity-100");
        }
        if (guide) guide.style.display = "none";
    }, 10);
    setWhiteboardTool("select");
    window.buildPropertiesPanel?.();
    registerEscHandler();
};

window.exitWhiteboardMode = function () {
    const container = document.getElementById("whiteboard-overlay-container");
    const toolbar = document.getElementById("whiteboard-floating-toolbar");
    const guide = document.getElementById("whiteboard-guide-card");
    const btn = document.getElementById("btn-whiteboard-toggle");
    const panel = getStylePanel();
    if (!container || !toolbar) return;
    if (livePersistTimer) {
        clearTimeout(livePersistTimer);
        livePersistTimer = null;
    }
    getEngine()?.commitActiveTextEditor?.();
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    const canvas = document.getElementById("slideforge-whiteboard");
    if (canvas) canvas.style.pointerEvents = "none";
    document.body.classList.remove("whiteboard-mode-active");
    toolbar.style.opacity = "0";
    toolbar.style.pointerEvents = "none";
    toolbar.style.transform = "translateX(-50%) scale(0.95)";
    panel?.classList.add("opacity-0", "pointer-events-none");
    panel?.classList.remove("opacity-100");
    if (guide) {
        guide.style.opacity = "0";
        guide.style.transform = "translateY(16px)";
    }
    btn?.classList.remove("bg-indigo-100", "ring-2", "ring-indigo-300");
    setTimeout(() => {
        container.style.display = "none";
        if (guide) guide.style.display = "none";
        getEngine()?.removeEventHandlers();
    }, 300);
    persistWhiteboardToSlide({ renderSlide: true, finalizeActive: true });
    whiteboardSessionUndoCaptured = false;
    stopPositionTracking();
    window.buildPropertiesPanel?.();
    unregisterEscHandler();
};

window.setWhiteboardTool = function (tool) {
    getEngine()?.setTool(tool);
    updateWhiteboardUi();
};

window.setWhiteboardColor = function (color) {
    const activeEngine = getEngine();
    if (activeEngine) activeEngine.updateSelectedStyle({ strokeColor: color });
    updateWhiteboardUi();
};

window.setWhiteboardBackground = function (color) {
    const activeEngine = getEngine();
    if (activeEngine) activeEngine.updateSelectedStyle({ backgroundColor: color });
    updateWhiteboardUi();
};

window.setWhiteboardFillStyle = function (fillStyle) {
    getEngine()?.updateSelectedStyle({ fillStyle });
    updateWhiteboardUi();
};

window.setWhiteboardStrokeWidth = function (strokeWidth) {
    getEngine()?.updateSelectedStyle({ strokeWidth: Number(strokeWidth) || 2 });
    updateWhiteboardUi();
};

window.setWhiteboardStrokeStyle = function (strokeStyle) {
    getEngine()?.updateSelectedStyle({ strokeStyle });
    updateWhiteboardUi();
};

window.setWhiteboardRoughness = function (roughness) {
    getEngine()?.updateSelectedStyle({ roughness: Number(roughness) || 1.4 });
    updateWhiteboardUi();
};

window.setWhiteboardOpacity = function (opacity) {
    getEngine()?.updateSelectedStyle({ opacity: Number(opacity) || 1 });
    updateWhiteboardUi();
};

window.getWhiteboardColor = function () {
    return getEngine()?.strokeColor || "#1f2937";
};

window.undoWhiteboard = function () {
    getEngine()?.undo();
    updateWhiteboardUi();
};

window.redoWhiteboard = function () {
    getEngine()?.redo();
    updateWhiteboardUi();
};

window.clearWhiteboard = function () {
    if (confirm("Clear the slide whiteboard?")) {
        getEngine()?.clear();
        updateWhiteboardUi();
    }
};

window.duplicateWhiteboardSelection = function () {
    getEngine()?.duplicateSelected();
    updateWhiteboardUi();
};

window.deleteWhiteboardSelection = function () {
    getEngine()?.deleteSelected();
    updateWhiteboardUi();
};

window.bringWhiteboardForward = function () {
    getEngine()?.bringForward();
};

window.sendWhiteboardBackward = function () {
    getEngine()?.sendBackward();
};

window.bringWhiteboardToFront = function () {
    getEngine()?.bringToFront();
};

window.sendWhiteboardToBack = function () {
    getEngine()?.sendToBack();
};

window.exportWhiteboardSVG = function () {
    const activeEngine = getEngine();
    if (!activeEngine || activeEngine.elements.length === 0) {
        alert("The whiteboard is empty. Draw something first.");
        return;
    }
    const svg = ExportManager.generateSVG(activeEngine.elements, activeEngine.viewport);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slideforge-whiteboard-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.addEventListener("slideforge:whiteboard-change", updateWhiteboardUi);
window.addEventListener("slideforge:whiteboard-change", scheduleLiveWhiteboardPersist);
window.addEventListener("slideforge:render-complete", scheduleWhiteboardPosition);
window.addEventListener("hashchange", scheduleWhiteboardPosition);
