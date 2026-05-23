import { normalizeMermaidStyle, renderMermaid, sanitizeMermaidSvg } from "./mermaid-engine.js";
import { canUseVisualGraph, graphToSvg, parseMermaidToGraph } from "./mermaid-graph.js";
import { createGraphDocument, documentToGraphModel, renderDocumentToSvg } from "./mermaid-document.js";
import { DEFAULT_MERMAID_TEMPLATE, inferMermaidType } from "./mermaid-templates.js";

function readGlobal(name, fallback = null) {
    try {
        const value = Function(`return typeof ${name} !== "undefined" ? ${name} : undefined`)();
        return value === undefined ? fallback : value;
    } catch (_err) {
        return fallback;
    }
}

function callGlobal(name, ...args) {
    const fn = readGlobal(name, null);
    return typeof fn === "function" ? fn(...args) : undefined;
}

export function createMermaidElementData(overrides = {}) {
    const source = overrides.mermaidSource || DEFAULT_MERMAID_TEMPLATE.source;
    const theme = overrides.theme || "default";
    const id = overrides.id || callGlobal("generateId", "el") || `el_mermaid_${Date.now()}`;
    const zIndex = callGlobal("getNextZIndex") || 1;
    return {
        id,
        type: "mermaid",
        x: overrides.x ?? 120,
        y: overrides.y ?? 110,
        width: overrides.width || "560px",
        height: overrides.height || "360px",
        rotation: overrides.rotation || 0,
        zIndex,
        locked: false,
        opacity: 1,
        mermaidSource: source,
        mermaidType: overrides.mermaidType || inferMermaidType(source),
        theme,
        svgContent: sanitizeMermaidSvg(overrides.svgContent || ""),
        svgManualEdits: Boolean(overrides.svgManualEdits),
        editMode: ["visual", "code", "split"].includes(overrides.editMode) ? overrides.editMode : "visual",
        graphDocument: overrides.graphDocument || (canUseVisualGraph(source) ? createGraphDocument({
            mermaidSource: source,
            graphModel: overrides.graphModel || null,
            styles: overrides.style || {},
            routingStyle: overrides.routingStyle,
            autoLayout: overrides.autoLayout,
            lockedLayout: overrides.lockedLayout,
        }) : null),
        graphModel: overrides.graphModel || (overrides.graphDocument ? documentToGraphModel(overrides.graphDocument) : (canUseVisualGraph(source) ? parseMermaidToGraph(source, null) : null)),
        nodePositions: overrides.nodePositions || {},
        lockedLayout: Boolean(overrides.lockedLayout),
        autoLayout: overrides.autoLayout !== false,
        routingStyle: overrides.routingStyle || "orthogonal",
        connectionStyle: overrides.connectionStyle || "arrow",
        animation: overrides.animation || null,
        style: normalizeMermaidStyle(overrides.style || {}),
        styles: {
            zIndex,
            backgroundColor: "transparent",
            borderRadius: "8px",
            overflow: "hidden",
            ...(overrides.styles || {}),
        },
    };
}

export function insertMermaidElement(data = {}) {
    const state = readGlobal("state");
    const currentSlideIndex = readGlobal("currentSlideIndex", 0);
    const slide = state?.slides?.[currentSlideIndex];
    if (!slide) return null;
    callGlobal("saveStateToUndo");
    const element = createMermaidElementData(data);
    slide.elements.push(element);
    callGlobal("renderSlidesFromState");
    callGlobal("selectElement", element.id, "replace");
    return element;
}

export function updateMermaidElement(id, updates = {}, options = {}) {
    const state = readGlobal("state");
    const currentSlideIndex = readGlobal("currentSlideIndex", 0);
    const slide = state?.slides?.[currentSlideIndex];
    const element = slide?.elements?.find(item => item.id === id && item.type === "mermaid");
    if (!element) return null;
    if (options.captureUndo !== false) callGlobal("saveStateToUndo");
    Object.assign(element, updates);
    if (updates.mermaidSource !== undefined) element.mermaidType = updates.mermaidType || inferMermaidType(updates.mermaidSource);
    if (updates.theme !== undefined) element.theme = updates.theme;
    if (updates.style !== undefined) element.style = normalizeMermaidStyle(updates.style);
    if (updates.graphModel !== undefined) element.graphModel = updates.graphModel;
    if (updates.graphDocument !== undefined) element.graphDocument = updates.graphDocument;
    const dom = document.getElementById(id);
    if (dom) renderMermaidElement(dom, element, { force: true, updateState: false });
    if (options.render !== false) callGlobal("renderSlidesFromState", { preserveState: true });
    if (typeof window.schedulePresentationAutosave === "function") window.schedulePresentationAutosave(250);
    return element;
}

export function renderMermaidElement(host, elData = {}, options = {}) {
    if (!host) return;
    host.classList.add("mermaid-canvas-element");
    host.style.opacity = elData.opacity ?? host.style.opacity ?? "1";

    let surface = host.querySelector(":scope > .mermaid-object-surface");
    if (!surface) {
        surface = document.createElement("div");
        surface.className = "mermaid-object-surface";
        host.appendChild(surface);
    }

    let svgHost = surface.querySelector(":scope > .mermaid-svg-host");
    if (!svgHost) {
        svgHost = document.createElement("div");
        svgHost.className = "mermaid-svg-host";
        surface.appendChild(svgHost);
    }

    const currentSvg = sanitizeMermaidSvg(elData.svgContent || "");
    if ((elData.graphDocument || elData.graphModel) && canUseVisualGraph(elData.mermaidSource || "")) {
        if (!elData.graphDocument) elData.graphDocument = createGraphDocument({
            mermaidSource: elData.mermaidSource || "",
            graphModel: elData.graphModel,
            styles: elData.style || {},
            routingStyle: elData.routingStyle,
            autoLayout: elData.autoLayout,
            lockedLayout: elData.lockedLayout,
        });
        elData.graphModel = documentToGraphModel(elData.graphDocument);
        const svg = renderDocumentToSvg(elData.graphDocument, normalizeMermaidStyle(elData.style || {}), { selectedId: "" }) || graphToSvg(elData.graphModel, normalizeMermaidStyle(elData.style || {}), { selectedId: "" });
        svgHost.innerHTML = svg || currentSvg || `<div class="mermaid-render-status"><i class="fa-solid fa-diagram-project"></i><span>Diagram</span></div>`;
        elData.svgContent = svg || currentSvg;
        return;
    }
    if (currentSvg && (options.force || !svgHost.innerHTML)) {
        svgHost.innerHTML = currentSvg;
    } else if (!svgHost.innerHTML) {
        svgHost.innerHTML = `<div class="mermaid-render-status"><i class="fa-solid fa-diagram-project"></i><span>Rendering diagram...</span></div>`;
    }
    if (elData.svgManualEdits && currentSvg && !options.forceRerender) {
        return;
    }

    const source = String(elData.mermaidSource || "").trim();
    if (!source) {
        svgHost.innerHTML = `<div class="mermaid-render-error">Mermaid source is empty.</div>`;
        return;
    }

    const style = normalizeMermaidStyle(elData.style || {});
    const token = `${source}::${elData.theme || "default"}::${JSON.stringify(style)}`;
    host.dataset.mermaidRenderToken = token;
    renderMermaid(source, { theme: elData.theme || "default", style })
        .then(({ svg }) => {
            if (host.dataset.mermaidRenderToken !== token) return;
            svgHost.innerHTML = svg;
            elData.svgContent = svg;
            elData.mermaidType = inferMermaidType(source);
            const updateElementState = readGlobal("updateElementState", null);
            if (options.updateState !== false && typeof updateElementState === "function") {
                updateElementState(elData.id, {
                    svgContent: svg,
                    mermaidType: elData.mermaidType,
                    mermaidSource: source,
                    theme: elData.theme || "default",
                    style,
                    svgManualEdits: false,
                });
            }
        })
        .catch(error => {
            if (host.dataset.mermaidRenderToken !== token) return;
            if (!currentSvg) {
                svgHost.innerHTML = `<div class="mermaid-render-error">${escapeHtml(error?.message || String(error))}</div>`;
            }
            host.dataset.mermaidError = error?.message || String(error);
        });
}

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

window.createMermaidElementData = createMermaidElementData;
window.insertMermaidElement = insertMermaidElement;
window.updateMermaidElement = updateMermaidElement;
window.renderMermaidElement = renderMermaidElement;
