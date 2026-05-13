
/**
 * Exports the current presentation as a standalone Reveal.js framework in a ZIP file.
 */
async function exportZip() {
    const zip = new JSZip();
    const theme = getPresentationTheme();
    
    // 1. Process State and Assets
    const { processedState, assets } = await processStateAssets(state);
    const stateJson = JSON.stringify(processedState);
    
    // 2. Add Assets
    const assetsFolder = zip.folder("assets");
    for (const [name, data] of Object.entries(assets)) {
        assetsFolder.file(name, data, { base64: true });
    }
    
    // 3. Generate index.html (Viewer) - Now with embedded state
    const viewerHtml = generateViewerHtml(stateJson, theme);
    zip.file("index.html", viewerHtml);
    
    // 4. Generate viewer.js
    const viewerJs = generateViewerJs();
    zip.file("js/viewer.js", viewerJs);

    // 5. Generate viewer.css
    const viewerCss = generateViewerCss(theme);
    zip.file("css/viewer.css", viewerCss);
    
    // 6. Download Zip
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "presentation_framework.zip");
}

/**
 * Exports the presentation as a PDF using html2canvas and jsPDF.
 */
function getActiveExportSlideElement() {
    return (
        document.querySelector(".reveal .slides section.present") ||
        document.querySelector(".presentation-slide.present") ||
        document.querySelector(".presentation-slide")
    );
}

function hideExportEditorUi() {
    const hiddenNodes = Array.from(
        document.querySelectorAll('.resize-handle, .crop-handle, .connector-point-handle, #group-bound, .anim-badge'),
    ).map(el => ({ el, display: el.style.display }));
    hiddenNodes.forEach(({ el }) => {
        el.style.display = 'none';
    });

    const selectedNodes = Array.from(document.querySelectorAll('.canvas-element.selected, .canvas-element.group-member-selected')).map(el => ({
        el,
        selected: el.classList.contains('selected'),
        groupMemberSelected: el.classList.contains('group-member-selected'),
    }));
    selectedNodes.forEach(({ el }) => el.classList.remove('selected', 'group-member-selected'));

    return () => {
        hiddenNodes.forEach(({ el, display }) => {
            el.style.display = display;
        });
        selectedNodes.forEach(({ el, selected, groupMemberSelected }) => {
            el.classList.toggle('selected', selected);
            el.classList.toggle('group-member-selected', groupMemberSelected);
        });
        if (typeof updateGroupBound === 'function') updateGroupBound();
    };
}

const DEFAULT_EXPORT_PAGE_SIZE = Object.freeze({
    defaultWidth: 1024,
    defaultHeight: 768,
});

function getExportPageSetup() {
    const config = typeof getPresentationPageSetupConfig === "function"
        ? getPresentationPageSetupConfig()
        : {};
    const width = Number(config.width) || DEFAULT_EXPORT_PAGE_SIZE.defaultWidth;
    const height = Number(config.height) || DEFAULT_EXPORT_PAGE_SIZE.defaultHeight;
    return {
        width,
        height,
        orientation: width >= height ? "landscape" : "portrait",
    };
}

async function exportPDF() {
    const page = getExportPageSetup();
    const pdf = new jspdf.jsPDF({
        orientation: page.orientation,
        unit: "px",
        format: [page.width, page.height]
    });
    const originalIndex = currentSlideIndex;

    try {
        setProjectSaveHint?.("Generating PDF...", "success");

        for (let i = 0; i < state.slides.length; i++) {
            if (typeof window.switchSlide === "function") {
                window.switchSlide(i);
            } else if (typeof Reveal !== "undefined" && Reveal.slide) {
                Reveal.slide(i);
            }
            await new Promise(r => setTimeout(r, 800));

            const slide = getActiveExportSlideElement();
            if (!slide) throw new Error("Active slide not found for export");
            const restoreUi = hideExportEditorUi();
            let canvas;
            try {
                canvas = await html2canvas(slide, {
                    scale: 3,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    logging: false,
                    width: page.width,
                    height: page.height,
                    windowWidth: page.width,
                    windowHeight: page.height
                });
            } finally {
                restoreUi();
            }

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            if (i > 0) pdf.addPage([page.width, page.height], page.orientation);
            pdf.addImage(imgData, "JPEG", 0, 0, page.width, page.height);
            setProjectSaveHint?.(`Generated slide ${i + 1}/${state.slides.length}`, "success");
        }

        pdf.save("presentation.pdf");
        setProjectSaveHint?.("PDF Exported!", "success");
    } catch (err) {
        console.error(err);
        setProjectSaveHint?.(err?.message || "PDF export failed", "danger");
    } finally {
        if (typeof window.switchSlide === "function") {
            window.switchSlide(originalIndex);
        } else if (typeof Reveal !== "undefined" && Reveal.slide) {
            Reveal.slide(originalIndex);
        }
    }
}

async function exportPNG() {
    try {
        setProjectSaveHint?.("Generating Image...", "success");
        const page = getExportPageSetup();
        const slide = getActiveExportSlideElement();
        if (!slide) throw new Error("Active slide not found for export");

        const restoreUi = hideExportEditorUi();
        let canvas;
        try {
            canvas = await html2canvas(slide, {
                scale: 4,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                logging: false,
                width: page.width,
                height: page.height,
                windowWidth: page.width,
                windowHeight: page.height
            });
        } finally {
            restoreUi();
        }

        const link = document.createElement('a');
        link.download = `slide_${currentSlideIndex + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        setProjectSaveHint?.("PNG Exported!", "success");
    } catch (err) {
        console.error(err);
        setProjectSaveHint?.(err?.message || "Image export failed", "danger");
    }
}

window.exportPresentationPNG = exportPNG;

/**
 * GET CSRF TOKEN helper
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Exports the presentation to a native PowerPoint (.pptx) format.
 */
async function exportPPTX() {
    try {
        setProjectSaveHint?.("Generating PowerPoint...", "success");
        
        // Use the same filename as the project title
        const titleInput = document.getElementById("project-title-input");
        const filename = (titleInput && titleInput.value.trim() ? titleInput.value.trim() : "presentation") + ".pptx";

        const response = await fetch("/api/presentations/export/pptx/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({
                state: state,
                filename: filename
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to generate PPTX on server");
        }

        const blob = await response.blob();
        saveAs(blob, filename);
        setProjectSaveHint?.("PPTX Exported!", "success");
    } catch (err) {
        console.error(err);
        setProjectSaveHint?.(err?.message || "PPTX export failed", "danger");
    }
}

/**
 * Scans state for DataURLs (images/videos), extracts them, and updates paths.
 */
async function processStateAssets(originalState) {
    const newState = JSON.parse(JSON.stringify(originalState));
    const assets = {};
    let assetCounter = 0;

    const toBase64 = blob =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || "").split(",", 2)[1] || "");
            reader.onerror = () => reject(reader.error || new Error("Failed to read asset blob"));
            reader.readAsDataURL(blob);
        });

    const isBundlableLocalAsset = value => {
        if (typeof value !== "string" || !value) return false;
        if (value.startsWith("/media/")) return true;
        if (value.startsWith("/extracted_figures/")) return true;
        try {
            const url = new URL(value, window.location.href);
            return (
                url.origin === window.location.origin &&
                (url.pathname.startsWith("/media/") || url.pathname.startsWith("/extracted_figures/"))
            );
        } catch (_err) {
            return false;
        }
    };

    for (const slide of newState.slides) {
        if (slide.background?.content) {
            const bg = slide.background;
            if ((bg.type === "image" || bg.type === "video") && String(bg.content).startsWith("data:")) {
                const parts = bg.content.split(",");
                if (parts.length >= 2) {
                    const meta = parts[0];
                    const base64Data = parts[1];
                    const mimeMatch = meta.match(/data:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : bg.type === "image" ? "image/png" : "video/mp4";
                    const ext = mime.split("/")[1] || (bg.type === "image" ? "png" : "mp4");
                    const fileName = `asset_${assetCounter++}.${ext}`;
                    assets[fileName] = base64Data;
                    slide.background.content = `assets/${fileName}`;
                }
            } else if ((bg.type === "image" || bg.type === "video") && (isBundlableLocalAsset(bg.content) || String(bg.content || "").startsWith("blob:"))) {
                const sourceUrl = new URL(bg.content, window.location.href);
                const response = await fetch(sourceUrl.toString());
                if (response.ok) {
                    const blob = await response.blob();
                    const mime = blob.type || (bg.type === "image" ? "image/png" : "video/mp4");
                    const ext = mime.split("/")[1] || (bg.type === "image" ? "png" : "mp4");
                    const fileName = `asset_${assetCounter++}.${ext}`;
                    assets[fileName] = await toBase64(blob);
                    slide.background.content = `assets/${fileName}`;
                }
            }
        }
        for (const el of slide.elements) {
            // Extract local media/molecule content if it's a data URL or app asset URL.
            if ((el.type === "image" || el.type === "video" || el.type === "pdf") && el.content?.startsWith("data:")) {
                const parts = el.content.split(",");
                if (parts.length < 2) continue;
                
                const meta = parts[0];
                const base64Data = parts[1];
                const mimeMatch = meta.match(/data:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : (el.type === "image" ? "image/png" : el.type === "pdf" ? "application/pdf" : "video/mp4");
                const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || (el.type === "image" ? "png" : "mp4");
                
                const fileName = `asset_${assetCounter++}.${ext}`;
                assets[fileName] = base64Data;
                el.content = `assets/${fileName}`;
            } else if ((el.type === "image" || el.type === "video" || el.type === "pdf" || el.type === "molecule") && (isBundlableLocalAsset(el.content) || String(el.content || "").startsWith("blob:"))) {
                const sourceUrl = new URL(el.content, window.location.href);
                const response = await fetch(sourceUrl.toString());
                if (!response.ok) continue;

                const blob = await response.blob();
                if (el.type === "molecule") {
                    el.content = await blob.text();
                    el.moleculeSourceType = "inline";
                    continue;
                }

                const mime = blob.type || (el.type === "image" ? "image/png" : el.type === "pdf" ? "application/pdf" : el.type === "molecule" ? "chemical/x-pdb" : "video/mp4");
                const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || (el.type === "image" ? "png" : "mp4");
                const fileName = `asset_${assetCounter++}.${ext}`;
                assets[fileName] = await toBase64(blob);
                el.content = `assets/${fileName}`;
            }
        }
    }
    
    return { processedState: newState, assets };
}

function generateViewerHtml(stateJson, theme) {
    const safeStateJson = stateJson
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/<\/script/gi, "<\\\\/script");
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Presentation</title>
    <link rel="stylesheet" href="css/viewer.css" />
    <script id="presentation-data" type="application/json">${safeStateJson}</script>
</head>
<body>
    <div class="standalone-shell">
        <div class="standalone-stage" id="viewer-stage">
            <div class="standalone-canvas" id="slides-container">
                <!-- Slides injected here -->
            </div>
            <canvas class="presentation-overlay presentation-chalkboard" id="chalkboard-canvas"></canvas>
            <div class="presentation-overlay presentation-laser" id="laser-pointer" aria-hidden="true"></div>
            <div class="standalone-presentation-ui">
                <div id="viewer-chalk-tools" class="presentation-chalk-tools hidden" aria-label="Chalk tools">
                    <div id="viewer-chalk-indicator" class="presentation-chalk-indicator" aria-hidden="true">
                        <span>Chalk</span>
                    </div>
                    <label class="presentation-chalk-color-chip" for="viewer-chalk-color-chip" title="Chalk color">
                        <span class="sr-only">Chalk color</span>
                        <input id="viewer-chalk-color-chip" type="color" value="#fff59d" />
                    </label>
                    <button id="viewer-chalk-eraser" class="presentation-chalk-action" type="button" title="Clear chalkboard">
                        <span>Eraser</span>
                    </button>
                </div>
                <div class="presentation-menu-shell">
                    <button id="viewer-menu-toggle" class="presentation-menu-toggle" type="button" aria-label="Presentation menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div id="viewer-menu" class="presentation-menu hidden">
                        <button id="btn-prev" class="presentation-menu-item" type="button"><span>Previous</span></button>
                        <button id="btn-next" class="presentation-menu-item" type="button"><span>Next</span></button>
                        <button id="btn-fullscreen" class="presentation-menu-item" type="button"><span>Fullscreen</span></button>
                        <button id="btn-chalk" class="presentation-menu-item" type="button"><span>Chalkboard</span></button>
                        <label class="presentation-menu-color" for="viewer-chalk-color"><span>Chalk Color</span><input id="viewer-chalk-color" type="color" value="#fff59d" /></label>
                        <button id="btn-clear-chalk" class="presentation-menu-item" type="button"><span>Clear Chalk</span></button>
                        <button id="btn-laser" class="presentation-menu-item" type="button"><span>Laser</span></button>
                        <div class="presentation-menu-hint">Right click for this menu. Keys: F, L, B, X.</div>
                    </div>
                </div>
                <div id="viewer-context-menu" class="presentation-menu presentation-context-menu hidden">
                    <button id="viewer-context-prev" class="presentation-menu-item" type="button"><span>Previous</span></button>
                    <button id="viewer-context-next" class="presentation-menu-item" type="button"><span>Next</span></button>
                    <button id="viewer-context-fullscreen" class="presentation-menu-item" type="button"><span>Fullscreen</span></button>
                    <button id="viewer-context-chalk" class="presentation-menu-item" type="button"><span>Chalkboard</span></button>
                    <button id="viewer-context-clear" class="presentation-menu-item" type="button"><span>Clear Chalk</span></button>
                    <button id="viewer-context-laser" class="presentation-menu-item" type="button"><span>Laser</span></button>
                </div>
                <div class="standalone-status" id="viewer-status">1 / 1</div>
            </div>
        </div>
    </div>

    <script src="js/viewer.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const dataEl = document.getElementById('presentation-data');
            if (!dataEl) {
                console.error("Presentation data not found.");
                return;
            }
            try {
                initViewer(JSON.parse(dataEl.textContent || '{}'));
            } catch (err) {
                console.error("Failed to parse presentation data.", err);
            }
        });
    </script>
</body>
</html>`;
}

function generateViewerCss(theme) {
    let vars = "";
    if (theme.cssVars) {
        for (const [key, val] of Object.entries(theme.cssVars)) {
            vars += `${key}: ${val};\n`;
        }
    }
    
    return `
:root {
    ${vars}
    --slide-width: 1024px;
    --slide-height: 768px;
}

.hidden { display: none !important; }

body {
    background:
        radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 30%),
        linear-gradient(180deg, #111827 0%, #020617 100%);
    margin: 0;
    overflow: hidden;
    color: var(--slide-fg, #fff);
    font-family: system-ui, sans-serif;
}

.standalone-shell {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.standalone-stage {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    position: relative;
}

.standalone-canvas {
    position: relative;
    width: var(--slide-width);
    height: var(--slide-height);
    transform-origin: center center;
}

.presentation-slide {
    position: absolute;
    inset: 0;
    background: var(--slide-bg);
    color: var(--slide-fg);
    overflow: hidden;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
}

.presentation-slide.is-active {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
}

.slide-background-media {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.slide-background-media > .slide-background-image,
.slide-background-media > .slide-background-video {
    position: absolute;
    inset: 0;
    width: 100% !important;
    height: 100% !important;
    min-width: 100%;
    min-height: 100%;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    display: block;
}

.standalone-presentation-ui {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 30;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.standalone-status {
    min-width: 70px;
    text-align: center;
    color: rgba(255,255,255,0.82);
    padding: 12px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(15,23,42,0.72);
    backdrop-filter: blur(14px);
}

.presentation-menu-shell {
    position: relative;
}

.presentation-chalk-tools {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-right: 10px;
    padding: 8px 10px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(15,23,42,0.8);
    box-shadow: 0 18px 48px rgba(2, 6, 23, 0.35);
    backdrop-filter: blur(16px);
}

.presentation-chalk-indicator,
.presentation-chalk-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 12px;
    color: rgba(255,255,255,0.94);
    font-size: 13px;
    font-weight: 700;
}

.presentation-chalk-indicator {
    background: rgba(255,255,255,0.06);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset;
}

.presentation-chalk-action {
    border: 0;
    background: transparent;
}

.presentation-chalk-color-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset;
}

.presentation-chalk-color-chip input[type="color"] {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
}

.presentation-menu-toggle {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(15,23,42,0.72);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(14px);
    transition: background 0.16s ease, transform 0.16s ease;
}

.presentation-menu-toggle:hover,
.presentation-menu-item:hover {
    background: rgba(30,41,59,0.9);
}

.presentation-menu {
    min-width: 200px;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(15,23,42,0.86);
    box-shadow: 0 18px 48px rgba(2, 6, 23, 0.45);
    backdrop-filter: blur(16px);
}

.presentation-menu-shell > .presentation-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
}

.presentation-context-menu {
    position: fixed;
    z-index: 35;
}

.presentation-menu-item {
    width: 100%;
    border: 0;
    background: transparent;
    color: rgba(255,255,255,0.94);
    padding: 10px 12px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    transition: background 0.16s ease;
}

.presentation-menu-color {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    color: rgba(255,255,255,0.94);
    font-size: 13px;
    font-weight: 600;
}

.presentation-menu-color input[type="color"] {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
}

.presentation-menu-item.is-active,
.presentation-menu-toggle.is-active {
    background: rgba(14,165,233,0.22);
    border-color: rgba(56,189,248,0.7);
}

.presentation-menu-hint {
    margin-top: 6px;
    padding: 8px 10px 4px;
    color: rgba(226,232,240,0.76);
    font-size: 11px;
    line-height: 1.35;
}

.presentation-overlay {
    position: absolute;
    inset: 0;
    margin: auto;
    width: var(--slide-width);
    height: var(--slide-height);
    transform-origin: center center;
}

.presentation-chalkboard {
    z-index: 5;
    pointer-events: none;
    background: transparent;
}

.presentation-chalkboard.is-active {
    pointer-events: auto;
}

.presentation-laser {
    z-index: 10050;
    position: fixed;
    inset: auto;
    width: 24px;
    height: 24px;
    margin: 0;
    border-radius: 999px;
    background:
        radial-gradient(circle, #fff 0 6%, #ff1744 7% 20%, rgba(255, 23, 68, 0.72) 21% 38%, rgba(255, 23, 68, 0.26) 39% 58%, transparent 70%),
        radial-gradient(circle, rgba(0, 0, 0, 0.42) 0 46%, transparent 68%);
    border: 1px solid rgba(255, 255, 255, 0.82);
    box-shadow:
        0 0 0 1px rgba(86, 0, 0, 0.62),
        0 0 8px rgba(255, 0, 48, 0.95),
        0 0 18px rgba(255, 0, 48, 0.62),
        0 0 30px rgba(255, 0, 48, 0.28);
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -50%);
    will-change: left, top, opacity;
}

.presentation-laser::before,
.presentation-laser::after {
    content: "";
    position: absolute;
    inset: 50% auto auto 50%;
    pointer-events: none;
    transform: translate(-50%, -50%);
}

.presentation-laser::before {
    width: 30px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.96) 35%, #ff1744 50%, rgba(255,255,255,0.96) 65%, transparent);
}

.presentation-laser::after {
    width: 2px;
    height: 30px;
    background: linear-gradient(180deg, transparent, rgba(255,255,255,0.96) 35%, #ff1744 50%, rgba(255,255,255,0.96) 65%, transparent);
}

.presentation-laser.is-active {
    opacity: 1;
}

.presentation-cursor-chalk,
.presentation-cursor-chalk * {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg transform='rotate(-36 20 20)'%3E%3Crect x='13' y='7' width='14' height='22' rx='4.5' fill='%23fff3b0' stroke='%23655426' stroke-width='1.5'/%3E%3Crect x='13' y='24' width='14' height='6.5' rx='2.8' fill='%23d4c48a' stroke='%23655426' stroke-width='1.2'/%3E%3Cpath d='M13 7h14l-2.6-4h-8.8z' fill='%23ffffff' stroke='%23655426' stroke-width='1.2'/%3E%3Cpath d='M16.5 3h7l-1.1-1.8h-4.8z' fill='%23f8fafc' opacity='0.85'/%3E%3C/g%3E%3C/svg%3E") 13 8, crosshair !important;
}

.presentation-cursor-hidden,
.presentation-cursor-hidden * {
    cursor: none !important;
}

.canvas-element.sf-anim-hidden {
    opacity: 0 !important;
    visibility: hidden !important;
}

.canvas-element.sf-anim-visible {
    opacity: 1;
    visibility: visible;
}

.canvas-element.sf-anim-playing {
    animation-duration: var(--sf-anim-duration, 800ms);
    animation-delay: var(--sf-anim-delay, 0ms);
    animation-timing-function: var(--sf-anim-easing, ease-out);
    animation-fill-mode: both;
}

.canvas-element.sf-anim-playing.sf-anim-effect-fade-in { animation-name: slideforgeFadeIn; }
.canvas-element.sf-anim-playing.sf-anim-effect-slide-up { animation-name: slideforgeSlideUp; }
.canvas-element.sf-anim-playing.sf-anim-effect-slide-down { animation-name: slideforgeSlideDown; }
.canvas-element.sf-anim-playing.sf-anim-effect-slide-left { animation-name: slideforgeSlideLeft; }
.canvas-element.sf-anim-playing.sf-anim-effect-slide-right { animation-name: slideforgeSlideRight; }
.canvas-element.sf-anim-playing.sf-anim-effect-zoom-in { animation-name: slideforgeZoomIn; }
.canvas-element.sf-anim-playing.sf-anim-effect-pop-in { animation-name: slideforgePopIn; }
.canvas-element.sf-anim-playing.sf-anim-effect-wipe-in { animation-name: slideforgeWipeIn; }
.canvas-element.sf-anim-playing.sf-anim-effect-pulse { animation-name: slideforgePulse; }
.canvas-element.sf-anim-playing.sf-anim-effect-glow { animation-name: slideforgeGlow; }

@keyframes slideforgeFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideforgeSlideUp {
    from { opacity: 0; transform: var(--sf-base-transform) translateY(var(--sf-anim-distance, 48px)); }
    to { opacity: 1; transform: var(--sf-base-transform) translateY(0); }
}

@keyframes slideforgeSlideDown {
    from { opacity: 0; transform: var(--sf-base-transform) translateY(calc(var(--sf-anim-distance, 48px) * -1)); }
    to { opacity: 1; transform: var(--sf-base-transform) translateY(0); }
}

@keyframes slideforgeSlideLeft {
    from { opacity: 0; transform: var(--sf-base-transform) translateX(var(--sf-anim-distance, 48px)); }
    to { opacity: 1; transform: var(--sf-base-transform) translateX(0); }
}

@keyframes slideforgeSlideRight {
    from { opacity: 0; transform: var(--sf-base-transform) translateX(calc(var(--sf-anim-distance, 48px) * -1)); }
    to { opacity: 1; transform: var(--sf-base-transform) translateX(0); }
}

@keyframes slideforgeZoomIn {
    from { opacity: 0; transform: var(--sf-base-transform) scale(var(--sf-anim-scale, 0.88)); }
    to { opacity: 1; transform: var(--sf-base-transform) scale(1); }
}

@keyframes slideforgePopIn {
    0% { opacity: 0; transform: var(--sf-base-transform) scale(calc(var(--sf-anim-scale, 0.88) - 0.1)); }
    75% { opacity: 1; transform: var(--sf-base-transform) scale(1.04); }
    100% { opacity: 1; transform: var(--sf-base-transform) scale(1); }
}

@keyframes slideforgeWipeIn {
    from { opacity: 0; clip-path: inset(0 100% 0 0); }
    to { opacity: 1; clip-path: inset(0 0 0 0); }
}

@keyframes slideforgePulse {
    0% { opacity: 1; transform: var(--sf-base-transform) scale(1); }
    50% { opacity: 1; transform: var(--sf-base-transform) scale(1.05); }
    100% { opacity: 1; transform: var(--sf-base-transform) scale(1); }
}

@keyframes slideforgeGlow {
    0% { opacity: 1; filter: drop-shadow(0 0 0 rgba(56, 189, 248, 0)); }
    50% { opacity: 1; filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.65)); }
    100% { opacity: 1; filter: drop-shadow(0 0 0 rgba(56, 189, 248, 0)); }
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.canvas-element {
    position: absolute;
    box-sizing: border-box;
    z-index: 1;
}

.connector-svg {
    overflow: visible;
    pointer-events: none;
}

.pdf-embed-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: inherit;
    position: relative;
    background: #f8fafc;
}

.pdf-embed-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: white;
}

.pdf-annotation {
    position: absolute;
}

.pdf-annotation-highlight {
    background: rgba(251, 191, 36, 0.32);
    outline: 1px solid rgba(245, 158, 11, 0.72);
    border-radius: 3px;
}

.pdf-annotation-note {
    transform: translate(-50%, -50%);
}

.pdf-note-dot {
    width: 14px;
    height: 14px;
    border-radius: 9999px;
    display: inline-block;
    background: #0ea5e9;
    border: 2px solid #e0f2fe;
}

.pdf-note-label {
    position: absolute;
    left: 18px;
    top: -2px;
    white-space: nowrap;
    background: rgba(15, 23, 42, 0.88);
    color: white;
    font-size: 10px;
    line-height: 1.2;
    padding: 3px 6px;
    border-radius: 999px;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.media-fill {
    width: 100%;
    height: 100%;
    display: block;
    border: none;
}

.table-element-shell,
.table-element-scroll {
    width: 100%;
    height: 100%;
}

.table-element-scroll {
    overflow: auto;
}

.table-element-grid {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    background: white;
}

.table-element-cell {
    min-width: 56px;
    line-height: 1.35;
    word-break: break-word;
    outline: none;
}

.rounded-inherit {
    border-radius: inherit;
}

.text-element-content {
    width: 100%;
    height: 100%;
    outline: none;
    word-wrap: break-word;
    text-align: inherit;
}

.equation-container {
    color: inherit;
    font-size: 1.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    line-height: 1;
}

.equation-container .katex-display {
    margin: 0;
}

.equation-container .katex {
    line-height: 1;
}

/* Bullet List Styles */
.ppt-bullet-block { display: flex; flex-direction: column; gap: 0.35em; width: 100%; text-align: inherit; }
.ppt-bullet-row { display: grid; grid-template-columns: 1.2em minmax(0, 1fr); column-gap: 12px; align-items: start; margin-left: var(--bullet-indent, 0px); }
.ppt-bullet-marker { display: inline-block; min-width: 1.2em; line-height: 1.2; color: var(--bullet-color, currentColor); font-size: calc(1em * var(--bullet-font-scale, 1)); }
.ppt-bullet-text { min-width: 0; line-height: inherit; text-align: inherit; }
.ppt-bullet-spacer { min-height: 1em; }
.ppt-bulleted-block { list-style: none; margin: 0; padding: 0; line-height: inherit; width: 100%; text-align: inherit; }
.ppt-bulleted-block .ppt-bulleted-item { display: grid; grid-template-columns: 1.2em minmax(0, 1fr); column-gap: 12px; align-items: start; margin: 0; padding: 0; line-height: inherit; }
.ppt-bulleted-block .ppt-bulleted-item::before { content: var(--bullet-marker, "•"); display: inline-block; min-width: 1.2em; line-height: 1.2; color: var(--bullet-color, currentColor); font-size: calc(1em * var(--bullet-font-scale, 1)); }
.ppt-numbered-block { margin: 0; padding-left: 1.5em; line-height: inherit; width: 100%; text-align: inherit; }
.ppt-numbered-block li { margin: 0; padding: 0; line-height: inherit; }

/* Animations */
.reveal .fragment.fade-in,
.fragment.fade-up,
.fragment.fade-down,
.fragment.fade-left,
.fragment.fade-right,
.fragment.current-visible,
.fragment.fade-in-then-out,
.fragment.fade-in-then-semi-out,
.fragment.fade-in {
    opacity: 0;
    visibility: hidden;
    transition: opacity 360ms ease, translate 360ms ease, color 240ms ease, scale 300ms ease;
}
.fragment.fade-up { translate: 0 28px; }
.fragment.fade-down { translate: 0 -28px; }
.fragment.fade-left { translate: 32px 0; }
.fragment.fade-right { translate: -32px 0; }
.fragment.fade-in.visible,
.fragment.fade-up.visible,
.fragment.fade-down.visible,
.fragment.fade-left.visible,
.fragment.fade-right.visible,
.fragment.fade-in-then-out.visible,
.fragment.fade-in-then-semi-out.visible {
    opacity: 1;
    visibility: inherit;
    translate: 0 0;
}
.fragment.fade-out,
.fragment.semi-fade-out,
.fragment.grow,
.fragment.shrink,
.fragment.highlight-red,
.fragment.highlight-green,
.fragment.highlight-blue,
.fragment.highlight-current-red,
.fragment.highlight-current-green,
.fragment.highlight-current-blue {
    transition: opacity 320ms ease, color 240ms ease, scale 300ms ease;
}
.fragment.grow { scale: 0.72; }
.fragment.grow.visible { scale: 1; }
.fragment.shrink { scale: 1.25; }
.fragment.shrink.visible { scale: 1; }
.fragment.fade-out.visible { opacity: 0.35; }
.fragment.semi-fade-out.visible { opacity: 0.5; }
.fragment.highlight-red.visible { color: #ef4444; }
.fragment.highlight-green.visible { color: #22c55e; }
.fragment.highlight-blue.visible { color: #3b82f6; }
.fragment.highlight-current-red.current-fragment { color: #ef4444; }
.fragment.highlight-current-green.current-fragment { color: #22c55e; }
.fragment.highlight-current-blue.current-fragment { color: #3b82f6; }
.fragment.current-visible.current-fragment { opacity: 1; visibility: inherit; }
.fragment.fade-in-then-out.current-fragment { opacity: 0; }
.fragment.fade-in-then-semi-out.current-fragment { opacity: 0.5; }
`;
}

function generateViewerJs() {
    return `
const animationEffects = ['fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom-in', 'pop-in', 'wipe-in', 'pulse', 'glow'];
const MOLECULE_EMBED_NGL_SRC = ${JSON.stringify(typeof MOLECULE_EMBED_NGL_SRC === 'string' ? MOLECULE_EMBED_NGL_SRC : 'https://unpkg.com/ngl@2.4.0/dist/ngl.js')};

const BULLET_STYLE_THEMES = {
    default: { levels: [
        { type: 'symbol', value: '\u2022', fontSize: 1.0, color: 'inherit', indent: 0 },
        { type: 'symbol', value: '\u25e6', fontSize: 0.9, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u25aa', fontSize: 0.85, color: 'inherit', indent: 40 },
    ]},
    square: { levels: [
        { type: 'symbol', value: '\u25a0', fontSize: 0.9, color: 'inherit', indent: 0 },
        { type: 'symbol', value: '\u25a1', fontSize: 0.9, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u25aa', fontSize: 0.85, color: 'inherit', indent: 40 },
    ]},
    diamond: { levels: [
        { type: 'symbol', value: '\u25c6', fontSize: 0.9, color: '#f59e0b', indent: 0 },
        { type: 'symbol', value: '\u25c7', fontSize: 0.9, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u25c8', fontSize: 0.85, color: 'inherit', indent: 40 },
    ]},
    modern: { levels: [
        { type: 'icon', value: 'arrow-right', color: '#60a5fa', indent: 0 },
        { type: 'symbol', value: '\u2013', color: 'inherit', indent: 20 },
    ]},
    chevron: { levels: [
        { type: 'symbol', value: '\u00bb', fontSize: 1.0, color: '#38bdf8', indent: 0 },
        { type: 'symbol', value: '\u203a', fontSize: 1.0, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u2013', fontSize: 0.9, color: 'inherit', indent: 40 },
    ]},
    dash: { levels: [
        { type: 'symbol', value: '\u2013', fontSize: 1.0, color: 'inherit', indent: 0 },
        { type: 'symbol', value: '\u2014', fontSize: 1.0, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u00b7', fontSize: 1.0, color: 'inherit', indent: 40 },
    ]},
    checklist: { levels: [{ type: 'icon', value: 'check', color: '#22c55e', indent: 0 }] },
    star: { levels: [
        { type: 'symbol', value: '\u2726', fontSize: 0.95, color: '#f472b6', indent: 0 },
        { type: 'symbol', value: '\u2727', fontSize: 0.95, color: 'inherit', indent: 20 },
        { type: 'symbol', value: '\u2022', fontSize: 0.9, color: 'inherit', indent: 40 },
    ]},
};
const VIEWER_ICON_MAP = { 'arrow-right': '\u2192', 'check': '\u2713', 'circle': '\u25cf', 'square': '\u25a0', 'star': '\u2605', 'diamond': '\u25c6', 'chevron': '\u00bb' };
function _viewerGetLevelStyle(bulletStyle, level) {
    const theme = BULLET_STYLE_THEMES[bulletStyle] || BULLET_STYLE_THEMES.default;
    return theme.levels[Math.min(level, theme.levels.length - 1)] || BULLET_STYLE_THEMES.default.levels[0];
}
function _viewerGetBulletGlyph(levelStyle) {
    if (levelStyle.type === 'icon') return VIEWER_ICON_MAP[levelStyle.value] || '\u2022';
    return levelStyle.value || '\u2022';
}
function _viewerGetBulletIndent(level, levelStyle) {
    const themeIndent = Number(levelStyle.indent) || 0;
    const structuralIndent = Math.max(0, Number(level) || 0) * 20;
    return Math.max(themeIndent, structuralIndent);
}

${typeof createDefaultMoleculeContent === 'function' ? createDefaultMoleculeContent.toString() : ''}
${typeof MOLECULE_SUPPORTED_FORMATS !== 'undefined' ? `const MOLECULE_SUPPORTED_FORMATS = new Set(${JSON.stringify(Array.from(MOLECULE_SUPPORTED_FORMATS))});` : ''}
${typeof MOLECULE_INLINE_CONTENT_LIMIT !== 'undefined' ? `const MOLECULE_INLINE_CONTENT_LIMIT = ${Number(MOLECULE_INLINE_CONTENT_LIMIT) || 2097152};` : ''}
${typeof MOLECULE_LARGE_CONTENT_LIMIT !== 'undefined' ? `const MOLECULE_LARGE_CONTENT_LIMIT = ${Number(MOLECULE_LARGE_CONTENT_LIMIT) || 26214400};` : ''}
${typeof normalizeMoleculeFormat === 'function' ? normalizeMoleculeFormat.toString() : ''}
${typeof normalizeMoleculeBackgroundColor === 'function' ? normalizeMoleculeBackgroundColor.toString() : ''}
${typeof isMoleculeContentUrl === 'function' ? isMoleculeContentUrl.toString() : ''}
${typeof isMoleculeTrajectoryData === 'function' ? isMoleculeTrajectoryData.toString() : ''}
${typeof normalizeMoleculeRepresentationLayer === 'function' ? normalizeMoleculeRepresentationLayer.toString() : ''}
${typeof normalizeMoleculeViewState === 'function' ? normalizeMoleculeViewState.toString() : ''}
${typeof _escapeMoleculeHtml === 'function' ? _escapeMoleculeHtml.toString() : ''}
${typeof _serializeMoleculePayload === 'function' ? _serializeMoleculePayload.toString() : ''}
${typeof _moleculeSrcdocScript === 'function' ? _moleculeSrcdocScript.toString() : ''}
${typeof buildMoleculeEmbedSrcdoc === 'function' ? buildMoleculeEmbedSrcdoc.toString() : ''}
${typeof applyMoleculeEmbedSandbox === 'function' ? applyMoleculeEmbedSandbox.toString() : ''}
${typeof attachMoleculeDataBridge === 'function' ? attachMoleculeDataBridge.toString() : ''}

function normalizeImageCropTransform(crop) {
    if (!crop || typeof crop !== 'object') return { widthPercent: 100, heightPercent: 100, leftPercent: 0, topPercent: 0 };
    const widthPercent = Math.max(100, Number(crop.widthPercent) || 100);
    const heightPercent = Math.max(100, Number(crop.heightPercent) || 100);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
    return {
        widthPercent,
        heightPercent,
        leftPercent: clamp(crop.leftPercent, 100 - widthPercent, 0),
        topPercent: clamp(crop.topPercent, 100 - heightPercent, 0),
    };
}

function normalizeAnimation(el) {
    const legacyValue = typeof el.animation === 'string' ? el.animation.trim() : '';
    const raw = legacyValue ? { effect: legacyValue } : (el.animation && typeof el.animation === 'object' ? el.animation : null);
    if (!raw || !raw.effect || !animationEffects.includes(raw.effect)) return null;
    return {
        effect: raw.effect,
        trigger: raw.trigger === 'on-click' ? 'on-click' : 'on-slide',
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
        durationMs: Math.max(100, Number(raw.durationMs ?? el.animDuration) || 800),
        delayMs: Math.max(0, Number(raw.delayMs ?? el.animDelay) || 0),
        easing: ['ease-out', 'ease-in-out', 'linear'].includes(raw.easing) ? raw.easing : 'ease-out',
        distancePx: Number.isFinite(Number(raw.distancePx)) ? Number(raw.distancePx) : 48,
        scaleFrom: Number.isFinite(Number(raw.scaleFrom)) ? Number(raw.scaleFrom) : 0.88
    };
}

function initViewer(data) {
    const container = document.getElementById('slides-container');
    const stage = document.getElementById('viewer-stage');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const chalkBtn = document.getElementById('btn-chalk');
    const clearChalkBtn = document.getElementById('btn-clear-chalk');
    const laserBtn = document.getElementById('btn-laser');
    const colorInput = document.getElementById('viewer-chalk-color');
    const colorChip = document.getElementById('viewer-chalk-color-chip');
    const chalkTools = document.getElementById('viewer-chalk-tools');
    const chalkEraser = document.getElementById('viewer-chalk-eraser');
    const status = document.getElementById('viewer-status');
    const chalkboard = document.getElementById('chalkboard-canvas');
    const laserPointer = document.getElementById('laser-pointer');
    const menuToggle = document.getElementById('viewer-menu-toggle');
    const menu = document.getElementById('viewer-menu');
    const contextMenu = document.getElementById('viewer-context-menu');
    const contextPrev = document.getElementById('viewer-context-prev');
    const contextNext = document.getElementById('viewer-context-next');
    const contextFullscreen = document.getElementById('viewer-context-fullscreen');
    const contextChalk = document.getElementById('viewer-context-chalk');
    const contextClear = document.getElementById('viewer-context-clear');
    const contextLaser = document.getElementById('viewer-context-laser');
    const slides = data.slides || [];
    let activeSlideIndex = 0;
    let activeFragmentIndex = -1;
    let viewerScale = 1;
    let chalkEnabled = false;
    let laserEnabled = false;
    let isDrawing = false;
    let lastDrawPoint = null;
    let chalkColor = '#fff59d';
    const chalkCtx = chalkboard ? chalkboard.getContext('2d', { willReadFrequently: true }) : null;
    const pageSetups = {
        'standard-4-3': { width: 1024, height: 768 },
        'widescreen-16-9': { width: 1280, height: 720 },
        'widescreen-16-10': { width: 1280, height: 800 },
    };
    const pageSetupId = pageSetups[data.pageSetup] ? data.pageSetup : 'standard-4-3';
    const page = pageSetups[pageSetupId];
    const runtime = { clickGroups: [], revealedGroups: 0, slideIndex: -1 };
    document.documentElement.style.setProperty('--slide-width', page.width + 'px');
    document.documentElement.style.setProperty('--slide-height', page.height + 'px');

    function closeMenus() {
        if (menu) menu.classList.add('hidden');
        if (contextMenu) contextMenu.classList.add('hidden');
    }

    function toggleMenu() {
        if (contextMenu) contextMenu.classList.add('hidden');
        if (menu) menu.classList.toggle('hidden');
    }

    function openContextMenu(x, y) {
        if (!contextMenu) return;
        if (menu) menu.classList.add('hidden');
        contextMenu.classList.remove('hidden');
        const margin = 12;
        const width = contextMenu.offsetWidth || 220;
        const height = contextMenu.offsetHeight || 240;
        contextMenu.style.left = Math.min(window.innerWidth - width - margin, Math.max(margin, x)) + 'px';
        contextMenu.style.top = Math.min(window.innerHeight - height - margin, Math.max(margin, y)) + 'px';
    }

    function syncControlState() {
        const fullscreen = !!document.fullscreenElement;
        if (fullscreenBtn) fullscreenBtn.classList.toggle('is-active', fullscreen);
        if (contextFullscreen) contextFullscreen.classList.toggle('is-active', fullscreen);
        if (chalkBtn) chalkBtn.classList.toggle('is-active', chalkEnabled);
        if (contextChalk) contextChalk.classList.toggle('is-active', chalkEnabled);
        if (laserBtn) laserBtn.classList.toggle('is-active', laserEnabled);
        if (contextLaser) contextLaser.classList.toggle('is-active', laserEnabled);
        if (menuToggle) menuToggle.classList.toggle('is-active', chalkEnabled || laserEnabled);
        if (chalkTools) chalkTools.classList.toggle('hidden', !chalkEnabled);
        if (colorChip) {
            colorChip.value = chalkColor;
            colorChip.style.boxShadow = '0 0 0 2px ' + chalkColor;
        }
        if (stage) {
            stage.classList.toggle('presentation-cursor-hidden', laserEnabled);
            stage.classList.toggle('presentation-cursor-chalk', chalkEnabled && !laserEnabled);
        }
    }

    function getAnimatedEntries(slideIndex) {
        const slide = slides[slideIndex];
        if (!slide) return [];
        return (slide.elements || [])
            .map(el => ({ el, animation: normalizeAnimation(el) }))
            .filter(entry => entry.animation)
            .sort((a, b) => {
                const triggerDelta = (a.animation.trigger === 'on-slide' ? 0 : 1) - (b.animation.trigger === 'on-slide' ? 0 : 1);
                if (triggerDelta !== 0) return triggerDelta;
                const orderDelta = (Number(a.animation.order) || 0) - (Number(b.animation.order) || 0);
                if (orderDelta !== 0) return orderDelta;
                return String(a.el.id).localeCompare(String(b.el.id));
            });
    }

    function clearAnimationClasses(dom) {
        if (!dom) return;
        [
            'sf-anim-hidden', 'sf-anim-visible', 'sf-anim-playing',
            'sf-anim-effect-fade-in', 'sf-anim-effect-slide-up', 'sf-anim-effect-slide-down',
            'sf-anim-effect-slide-left', 'sf-anim-effect-slide-right', 'sf-anim-effect-zoom-in',
            'sf-anim-effect-pop-in', 'sf-anim-effect-wipe-in', 'sf-anim-effect-pulse', 'sf-anim-effect-glow'
        ].forEach(className => dom.classList.remove(className));
        dom.style.removeProperty('--sf-base-transform');
        dom.style.removeProperty('--sf-anim-duration');
        dom.style.removeProperty('--sf-anim-delay');
        dom.style.removeProperty('--sf-anim-easing');
        dom.style.removeProperty('--sf-anim-distance');
        dom.style.removeProperty('--sf-anim-scale');
    }

    function applyAnimationDomState(dom, animation) {
        if (!dom || !animation) return;
        clearAnimationClasses(dom);
        dom.classList.add('sf-anim-effect-' + animation.effect);
        dom.style.setProperty('--sf-base-transform', dom.style.transform || '');
        dom.style.setProperty('--sf-anim-duration', Math.max(100, Number(animation.durationMs) || 800) + 'ms');
        dom.style.setProperty('--sf-anim-delay', Math.max(0, Number(animation.delayMs) || 0) + 'ms');
        dom.style.setProperty('--sf-anim-easing', animation.easing || 'ease-out');
        dom.style.setProperty('--sf-anim-distance', Math.max(8, Number(animation.distancePx) || 48) + 'px');
        dom.style.setProperty('--sf-anim-scale', String(Number(animation.scaleFrom) || 0.88));
    }

    function hideAnimatedEntry(entry) {
        const dom = document.getElementById(entry.el.id);
        if (!dom) return;
        applyAnimationDomState(dom, entry.animation);
        dom.classList.remove('sf-anim-visible', 'sf-anim-playing');
        dom.classList.add('sf-anim-hidden');
    }

    function showAnimatedEntry(entry, animate) {
        const dom = document.getElementById(entry.el.id);
        if (!dom) return;
        applyAnimationDomState(dom, entry.animation);
        dom.classList.remove('sf-anim-hidden');
        dom.classList.add('sf-anim-visible');
        if (!animate) {
            dom.classList.remove('sf-anim-playing');
            return;
        }
        dom.classList.remove('sf-anim-playing');
        void dom.offsetWidth;
        dom.classList.add('sf-anim-playing');
    }

    function prepareSlideAnimations(slideIndex) {
        runtime.slideIndex = slideIndex;
        const entries = getAnimatedEntries(slideIndex);
        entries.forEach(entry => hideAnimatedEntry(entry));
        entries.filter(entry => entry.animation.trigger === 'on-slide').forEach(entry => showAnimatedEntry(entry, true));
        runtime.clickGroups = [];
        entries.filter(entry => entry.animation.trigger === 'on-click').forEach(entry => {
            const order = Number(entry.animation.order) || 0;
            const current = runtime.clickGroups[runtime.clickGroups.length - 1];
            if (current && current.order === order) current.entries.push(entry);
            else runtime.clickGroups.push({ order, entries: [entry] });
        });
        runtime.revealedGroups = 0;
    }

    function revealNextAnimationGroup() {
        const group = runtime.clickGroups[runtime.revealedGroups];
        if (!group) return false;
        group.entries.forEach(entry => showAnimatedEntry(entry, true));
        runtime.revealedGroups += 1;
        return true;
    }

    function hidePreviousAnimationGroup() {
        const previousIndex = runtime.revealedGroups - 1;
        if (previousIndex < 0) return false;
        const group = runtime.clickGroups[previousIndex];
        if (!group) return false;
        group.entries.forEach(entry => hideAnimatedEntry(entry));
        runtime.revealedGroups = previousIndex;
        return true;
    }
    
    slides.forEach((slide, slideIndex) => {
        const section = document.createElement('section');
        section.id = slide.id;
        section.className = 'presentation-slide';
        section.style.width = page.width + 'px';
        section.style.height = page.height + 'px';
        const mediaOptions = {
            slideIndex,
            activeSlideIndex,
            onMediaLoad: () => requestAnimationFrame(syncViewerActiveMedia),
        };
        const bgNode = createViewerSlideBackgroundNode(slide.background, mediaOptions);
        if (bgNode) section.appendChild(bgNode);
        
        (slide.elements || []).forEach(elData => {
            const node = createViewerElement(elData, mediaOptions);
            section.appendChild(node);
        });
        
        container.appendChild(section);
    });
    
    const getSlideDom = index => container.children[index];
    const getFragments = slideDom =>
        Array.from(slideDom.querySelectorAll('.fragment'))
            .sort((a, b) => (Number(a.getAttribute('data-fragment-index')) || 0) - (Number(b.getAttribute('data-fragment-index')) || 0));

    function updateScale() {
        const scale = Math.min(stage.clientWidth / page.width, stage.clientHeight / page.height);
        viewerScale = Math.max(0.1, scale);
        container.style.transform = 'scale(' + viewerScale + ')';
        if (chalkboard) chalkboard.style.transform = 'scale(' + viewerScale + ')';
    }

    function resizeChalkboard() {
        if (!chalkboard || !chalkCtx) return;
        const snapshot = chalkboard.width > 0 ? chalkCtx.getImageData(0, 0, chalkboard.width, chalkboard.height) : null;
        chalkboard.width = page.width;
        chalkboard.height = page.height;
        chalkCtx.lineCap = 'round';
        chalkCtx.lineJoin = 'round';
        chalkCtx.strokeStyle = chalkColor;
        chalkCtx.lineWidth = 5;
        if (snapshot) chalkCtx.putImageData(snapshot, 0, 0);
    }

    function setChalkActive(enabled) {
        chalkEnabled = !!enabled;
        if (chalkboard) chalkboard.classList.toggle('is-active', chalkEnabled);
        syncControlState();
        if (!chalkEnabled) {
            isDrawing = false;
            lastDrawPoint = null;
        }
    }

    function setLaserActive(enabled) {
        laserEnabled = !!enabled;
        if (laserPointer) {
            laserPointer.classList.toggle('is-active', laserEnabled);
            if (!laserEnabled) {
                laserPointer.style.left = '-100px';
                laserPointer.style.top = '-100px';
            }
        }
        syncControlState();
    }

    function clearChalkboard() {
        if (!chalkboard || !chalkCtx) return;
        chalkCtx.clearRect(0, 0, chalkboard.width, chalkboard.height);
    }

    function getStagePoint(event) {
        if (!chalkboard) return null;
        const rect = chalkboard.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = ((event.clientX - rect.left) / rect.width) * page.width;
        const y = ((event.clientY - rect.top) / rect.height) * page.height;
        return {
            x: Math.max(0, Math.min(page.width, x)),
            y: Math.max(0, Math.min(page.height, y))
        };
    }

    function updateLaserPosition(event) {
        if (!laserEnabled || !laserPointer) return;
        laserPointer.style.left = event.clientX + 'px';
        laserPointer.style.top = event.clientY + 'px';
    }

    function drawSegment(from, to) {
        if (!chalkCtx || !from || !to) return;
        chalkCtx.strokeStyle = chalkColor;
        chalkCtx.beginPath();
        chalkCtx.moveTo(from.x, from.y);
        chalkCtx.lineTo(to.x, to.y);
        chalkCtx.stroke();
    }

    function syncHash() {
            if (window.location.protocol !== 'file:') {
                history.replaceState(null, '', '#slide-' + (activeSlideIndex + 1) + '-' + Math.max(0, activeFragmentIndex + 1));
            }
    }

    function applySlideState() {
        Array.from(container.children).forEach((slideDom, slideIndex) => {
            slideDom.classList.toggle('is-active', slideIndex === activeSlideIndex);
            const fragments = getFragments(slideDom);
            fragments.forEach((fragment, fragmentIndex) => {
                const isVisible = slideIndex < activeSlideIndex || (slideIndex === activeSlideIndex && fragmentIndex <= activeFragmentIndex);
                fragment.classList.toggle('visible', isVisible);
                fragment.classList.toggle('current-fragment', slideIndex === activeSlideIndex && fragmentIndex === activeFragmentIndex);
            });
        });
        const current = getSlideDom(activeSlideIndex);
        if (current) playSlideAnimations(current);
        if (runtime.slideIndex !== activeSlideIndex) {
            prepareSlideAnimations(activeSlideIndex);
        }
        if (status) status.textContent = (activeSlideIndex + 1) + ' / ' + Math.max(1, slides.length);
        syncViewerActiveMedia();
        syncHash();
    }

    function syncViewerActiveMedia() {
        const pageActive = document.visibilityState !== 'hidden' && document.hasFocus();
        Array.from(container.children).forEach((slideDom, slideIndex) => {
            const isActive = pageActive && slideIndex === activeSlideIndex;
            slideDom.querySelectorAll('video').forEach(video => {
                if (!isActive) {
                    if (!video.paused) video.pause();
                    return;
                }
                if (video.autoplay || video.classList.contains('slide-background-video')) {
                    video.play().catch(() => {});
                }
            });
            slideDom.querySelectorAll('iframe').forEach(iframe => {
                const src = String(iframe.getAttribute('src') || '');
                if (iframe.dataset.molecule === 'true') {
                    iframe.contentWindow?.postMessage({ type: 'pptmaker:molecule:lifecycle', active: isActive }, '*');
                } else if (/youtube(?:-nocookie)?\\.com\\/embed\\//i.test(src)) {
                    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: isActive && iframe.dataset.autoplay === 'true' ? 'playVideo' : 'pauseVideo', args: [] }), '*');
                } else if (/player\\.vimeo\\.com\\/video\\//i.test(src)) {
                    iframe.contentWindow?.postMessage({ method: isActive && iframe.dataset.autoplay === 'true' ? 'play' : 'pause' }, '*');
                }
            });
        });
    }

    document.addEventListener('visibilitychange', () => requestAnimationFrame(syncViewerActiveMedia));
    window.addEventListener('focus', () => requestAnimationFrame(syncViewerActiveMedia));
    window.addEventListener('blur', () => requestAnimationFrame(syncViewerActiveMedia));

    function goToSlide(index, fragmentIndex) {
        activeSlideIndex = Math.max(0, Math.min(index, slides.length - 1));
        const fragments = getFragments(getSlideDom(activeSlideIndex));
        const maxFragment = fragments.length - 1;
        activeFragmentIndex = Math.max(-1, Math.min(fragmentIndex, maxFragment));
        applySlideState();
    }

    function nextStep() {
        const fragments = getFragments(getSlideDom(activeSlideIndex));
        if (revealNextAnimationGroup()) return;
        if (activeFragmentIndex < fragments.length - 1) {
            activeFragmentIndex += 1;
            applySlideState();
        } else if (activeSlideIndex < slides.length - 1) {
            activeSlideIndex += 1;
            activeFragmentIndex = -1;
            applySlideState();
        }
    }

    function prevStep() {
        if (hidePreviousAnimationGroup()) return;
        if (activeFragmentIndex >= 0) {
            activeFragmentIndex -= 1;
            applySlideState();
        } else if (activeSlideIndex > 0) {
            activeSlideIndex -= 1;
            activeFragmentIndex = getFragments(getSlideDom(activeSlideIndex)).length - 1;
            applySlideState();
            runtime.revealedGroups = runtime.clickGroups.length;
            runtime.clickGroups.forEach(group => group.entries.forEach(entry => showAnimatedEntry(entry, false)));
        }
    }

    prevBtn && prevBtn.addEventListener('click', () => { prevStep(); closeMenus(); });
    nextBtn && nextBtn.addEventListener('click', () => { nextStep(); closeMenus(); });
    menuToggle && menuToggle.addEventListener('click', event => {
        event.stopPropagation();
        toggleMenu();
    });
    fullscreenBtn && fullscreenBtn.addEventListener('click', async () => {
        const target = document.documentElement;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (target.requestFullscreen) await target.requestFullscreen();
        } catch (err) {
            console.error('Fullscreen toggle failed.', err);
        }
        syncControlState();
        closeMenus();
    });
    chalkBtn && chalkBtn.addEventListener('click', () => { setChalkActive(!chalkEnabled); closeMenus(); });
    colorInput && colorInput.addEventListener('input', event => { chalkColor = event.target.value || '#fff59d'; closeMenus(); });
    colorChip && colorChip.addEventListener('input', event => {
        chalkColor = event.target.value || '#fff59d';
        if (colorInput) colorInput.value = chalkColor;
        syncControlState();
    });
    clearChalkBtn && clearChalkBtn.addEventListener('click', () => { clearChalkboard(); closeMenus(); });
    chalkEraser && chalkEraser.addEventListener('click', () => { clearChalkboard(); });
    laserBtn && laserBtn.addEventListener('click', () => { setLaserActive(!laserEnabled); closeMenus(); });
    contextPrev && contextPrev.addEventListener('click', () => { prevStep(); closeMenus(); });
    contextNext && contextNext.addEventListener('click', () => { nextStep(); closeMenus(); });
    contextFullscreen && contextFullscreen.addEventListener('click', () => { fullscreenBtn && fullscreenBtn.click(); });
    contextChalk && contextChalk.addEventListener('click', () => { chalkBtn && chalkBtn.click(); });
    contextClear && contextClear.addEventListener('click', () => { clearChalkBtn && clearChalkBtn.click(); });
    contextLaser && contextLaser.addEventListener('click', () => { laserBtn && laserBtn.click(); });
    chalkboard && chalkboard.addEventListener('pointerdown', event => {
        if (laserEnabled) updateLaserPosition(event);
        if (!chalkEnabled) return;
        const point = getStagePoint(event);
        if (!point) return;
        isDrawing = true;
        lastDrawPoint = point;
        drawSegment(point, point);
        chalkboard.setPointerCapture && chalkboard.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    chalkboard && chalkboard.addEventListener('pointermove', event => {
        if (laserEnabled) updateLaserPosition(event);
        if (!chalkEnabled || !isDrawing) return;
        const point = getStagePoint(event);
        if (!point || !lastDrawPoint) return;
        drawSegment(lastDrawPoint, point);
        lastDrawPoint = point;
        event.preventDefault();
    });
    chalkboard && chalkboard.addEventListener('pointerup', event => {
        if (laserEnabled) updateLaserPosition(event);
        isDrawing = false;
        lastDrawPoint = null;
    });
    chalkboard && chalkboard.addEventListener('pointerleave', () => {
        isDrawing = false;
        lastDrawPoint = null;
    });
    stage && stage.addEventListener('pointermove', event => {
        if (laserEnabled) updateLaserPosition(event);
    });
    document.addEventListener('pointermove', updateLaserPosition, true);
    stage && stage.addEventListener('contextmenu', event => {
        event.preventDefault();
        openContextMenu(event.clientX, event.clientY);
    });
    document.addEventListener('mousedown', event => {
        if (menu?.contains(event.target) || contextMenu?.contains(event.target) || menuToggle?.contains(event.target)) return;
        closeMenus();
    });
    document.addEventListener('fullscreenchange', () => {
        syncControlState();
        updateScale();
    });
    window.addEventListener('resize', () => {
        updateScale();
        resizeChalkboard();
    });
    window.addEventListener('keydown', event => {
        const key = String(event.key || '').toLowerCase();
        if (key === 'f') {
            event.preventDefault();
            fullscreenBtn && fullscreenBtn.click();
            return;
        }
        if (key === 'm') {
            event.preventDefault();
            toggleMenu();
            return;
        }
        if (key === 'b') {
            event.preventDefault();
            setChalkActive(!chalkEnabled);
            return;
        }
        if (key === 'l') {
            event.preventDefault();
            setLaserActive(!laserEnabled);
            return;
        }
        if (key === 'x') {
            event.preventDefault();
            clearChalkboard();
            return;
        }
        if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
            event.preventDefault();
            nextStep();
        } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
            event.preventDefault();
            prevStep();
        } else if (event.key === 'Home') {
            event.preventDefault();
            goToSlide(0, -1);
        } else if (event.key === 'End') {
            event.preventDefault();
            const lastIndex = slides.length - 1;
            goToSlide(lastIndex, getFragments(getSlideDom(lastIndex)).length - 1);
        }
    });

    const hashMatch = window.location.hash.match(/slide-(\\d+)(?:-(\\d+))?/);
    if (hashMatch) {
        const slideIdx = Math.max(0, Number(hashMatch[1]) - 1);
        const fragmentIdx = hashMatch[2] ? Number(hashMatch[2]) - 1 : -1;
        goToSlide(slideIdx, fragmentIdx);
    } else {
        goToSlide(0, -1);
    }
    resizeChalkboard();
    updateScale();
    syncControlState();
}

function createViewerElement(elData, mediaOptions = {}) {
    function setMediaIframePermissions(iframe, value) {
        if (!iframe || /firefox/i.test(navigator.userAgent || '')) return;
        iframe.setAttribute('allow', value);
    }
    function ensureViewerDocumentShell(content) {
        const raw = String(content || '');
        if (/<!doctype|<html[\\s>]/i.test(raw)) return raw;
        return '<!doctype html><html><head></head><body>' + raw + '</body></html>';
    }

    function injectViewerIntoHead(doc, html) {
        if (/<\\/head>/i.test(doc)) return doc.replace(/<\\/head>/i, html + '</head>');
        return doc.replace(/<html[^>]*>/i, match => match + '<head>' + html + '</head>');
    }

    function injectViewerIntoBodyEnd(doc, html) {
        if (/<\\/body>/i.test(doc)) return doc.replace(/<\\/body>/i, html + '</body>');
        return doc + html;
    }

    function buildViewerHtmlEmbedSrcdoc(content, elData) {
        let doc = ensureViewerDocumentShell(content);
        if (!/name=["']viewport["']/i.test(doc)) {
            doc = injectViewerIntoHead(doc, '<meta name="viewport" content="width=device-width, initial-scale=1" />');
        }
        const fit = elData?.htmlFit || 'contain';
        const styles =
            '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;}body{box-sizing:border-box;}img,svg,canvas,video{max-width:100%;height:auto;}body[data-fit="fill"]>*:first-child{width:100%;height:100%;}body[data-fit="contain"]{display:flex;align-items:center;justify-content:center;}body[data-fit="contain"]>*:first-child{max-width:100%;max-height:100%;}</style>';
        const script =
            '<script>(function(){document.body.dataset.fit=' + JSON.stringify(fit) + ';})();<\\/script>';
        doc = injectViewerIntoHead(doc, styles);
        doc = injectViewerIntoBodyEnd(doc, script);
        return doc;
    }

    function getViewerHtmlEmbedSandbox() {
        return 'allow-scripts allow-forms allow-popups allow-downloads';
    }

    const normalizeTableDataLocal = tableData => {
        const rows = Math.max(1, Number(tableData?.rows) || 3);
        const cols = Math.max(1, Number(tableData?.cols) || 4);
        const rawCells = Array.isArray(tableData?.cells) ? tableData.cells : [];
        const rawRowHeights = Array.isArray(tableData?.rowHeights) ? tableData.rowHeights : [];
        const rawColWidths = Array.isArray(tableData?.colWidths) ? tableData.colWidths : [];
        return {
            rows,
            cols,
            headerRow: tableData?.headerRow !== false,
            zebra: Boolean(tableData?.zebra),
            borderColor: tableData?.borderColor || '#cbd5e1',
            borderWidth: Math.max(0, Number(tableData?.borderWidth) || 1),
            cellPadding: Math.max(2, Number(tableData?.cellPadding) || 10),
            headerFill: tableData?.headerFill || '#e2e8f0',
            bodyFill: tableData?.bodyFill || '#ffffff',
            altFill: tableData?.altFill || '#f8fafc',
            textColor: tableData?.textColor || '#172033',
            headerTextColor: tableData?.headerTextColor || '#172033',
            rowHeights: Array.from({ length: rows }, (_, rowIndex) => {
                const value = Number(rawRowHeights[rowIndex]);
                return Number.isFinite(value) && value >= 24 ? value : 44;
            }),
            colWidths: Array.from({ length: cols }, (_, colIndex) => {
                const value = Number(rawColWidths[colIndex]);
                return Number.isFinite(value) && value >= 36 ? value : 140;
            }),
            cells: Array.from({ length: rows }, (_, rowIndex) =>
                Array.from({ length: cols }, (_, colIndex) => {
                    const rawCell = rawCells[rowIndex]?.[colIndex];
                    return {
                        text: typeof rawCell?.text === 'string' ? rawCell.text : rowIndex === 0 ? 'Header ' + (colIndex + 1) : '',
                        styles: rawCell?.styles && typeof rawCell.styles === 'object' ? rawCell.styles : {},
                    };
                }),
            ),
        };
    };
    const el = document.createElement('div');
    const animation = normalizeAnimation(elData);
    el.className = 'canvas-element';
    el.style.transform = 'translate(' + elData.x + 'px, ' + elData.y + 'px)';
    if (elData.width) el.style.width = elData.width;
    if (elData.height) el.style.height = elData.height;
    Object.entries(elData.styles || {}).forEach(([prop, value]) => {
        if (value === undefined || value === null) return;
        if (prop === 'textStrokeWidth') {
            if (String(value) === '0' || String(value) === '0px') el.style.removeProperty('-webkit-text-stroke-width');
            else el.style.setProperty('-webkit-text-stroke-width', value, 'important');
            return;
        }
        if (prop === 'textStrokeColor') {
            if (!value || value === 'transparent') el.style.removeProperty('-webkit-text-stroke-color');
            else el.style.setProperty('-webkit-text-stroke-color', value, 'important');
            return;
        }
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const priority = ['color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'lineHeight', 'textShadow'].includes(prop)
            ? 'important'
            : '';
        el.style.setProperty(cssProp, value, priority);
    });
    if (elData.fragmentAnimation && elData.fragmentAnimation !== 'none') {
        el.classList.add('fragment', elData.fragmentAnimation);
        if (elData.fragmentIndex != null) {
            el.setAttribute('data-fragment-index', elData.fragmentIndex);
        }
    }
    if (animation) {
        el.classList.add('has-structured-animation');
    }
    
    if (elData.type === 'text') {
        const content = document.createElement('div');
        content.className = 'text-element-content';
        content.innerHTML = renderTextContent(elData);
        el.appendChild(content);
    } else if (elData.type === 'table') {
        const tableData = normalizeTableDataLocal(elData.tableData);
        const shell = document.createElement('div');
        shell.className = 'table-element-shell';
        const scroll = document.createElement('div');
        scroll.className = 'table-element-scroll';
        const table = document.createElement('table');
        table.className = 'table-element-grid';
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        table.style.height = '100%';
        table.style.tableLayout = 'fixed';
        const colgroup = document.createElement('colgroup');
        tableData.colWidths.forEach(width => {
            const col = document.createElement('col');
            col.style.width = Math.max(36, Number(width) || 140) + 'px';
            colgroup.appendChild(col);
        });
        table.appendChild(colgroup);
        const tbody = document.createElement('tbody');
        for (let rowIndex = 0; rowIndex < tableData.rows; rowIndex += 1) {
            const tr = document.createElement('tr');
            tr.style.height = Math.max(24, Number(tableData.rowHeights[rowIndex]) || 44) + 'px';
            for (let colIndex = 0; colIndex < tableData.cols; colIndex += 1) {
                const cellData = tableData.cells[rowIndex]?.[colIndex] || { text: '', styles: {} };
                const cell = document.createElement(rowIndex === 0 && tableData.headerRow ? 'th' : 'td');
                const isHeader = tableData.headerRow && rowIndex === 0;
                const zebraFill = tableData.zebra && !isHeader && rowIndex % 2 === 1 ? tableData.altFill : tableData.bodyFill;
                const styles = cellData.styles || {};
                cell.className = 'table-element-cell';
                cell.style.border = tableData.borderWidth + 'px solid ' + tableData.borderColor;
                cell.style.padding = tableData.cellPadding + 'px';
                cell.style.backgroundColor = styles.backgroundColor || (isHeader ? tableData.headerFill : zebraFill);
                cell.style.color = styles.color || (isHeader ? tableData.headerTextColor : tableData.textColor);
                cell.style.textAlign = styles.textAlign || 'left';
                cell.style.fontWeight = styles.fontWeight || (isHeader ? '700' : '400');
                cell.style.verticalAlign = 'top';
                cell.style.whiteSpace = 'pre-wrap';
                cell.textContent = cellData.text || '';
                tr.appendChild(cell);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        scroll.appendChild(table);
        shell.appendChild(scroll);
        el.appendChild(shell);
    } else if (elData.type === 'image') {
        if (elData.cropTransform) {
            const crop = normalizeImageCropTransform(elData.cropTransform);
            const wrapper = document.createElement("div");
            wrapper.style.cssText = "width:100%; height:100%; border-radius:inherit; overflow:hidden; position:relative;";
            const img = document.createElement("img");
            img.src = elData.content;
            img.style.cssText = "position:absolute; display:block; margin:0!important; max-width:none; max-height:none; object-fit:fill; " +
                               "left:" + crop.leftPercent + "%; " +
                               "top:" + crop.topPercent + "%; " +
                               "width:" + crop.widthPercent + "%; " +
                               "height:" + crop.heightPercent + "%;";
            wrapper.appendChild(img);
            el.appendChild(wrapper);
        } else {
            const img = document.createElement('img');
            img.src = elData.content;
            img.className = 'media-fill rounded-inherit';
            img.style.objectFit = 'fill';
            el.appendChild(img);
        }
    } else if (elData.type === 'video') {
        const videoInfo = _parseVideoUrl(elData.content);
        const initiallyActive =
            document.visibilityState !== 'hidden' &&
            document.hasFocus() &&
            Number(mediaOptions.slideIndex) === Number(mediaOptions.activeSlideIndex);
        let videoNode;
        if (videoInfo.type === 'youtube') {
            videoNode = document.createElement('iframe');
            const params = new URLSearchParams({
                autoplay: elData.autoplay && initiallyActive ? 1 : 0,
                mute: elData.muted ? 1 : 0,
                loop: elData.loop ? 1 : 0,
                controls: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1
            });
            if (elData.loop) params.set('playlist', videoInfo.id);
            videoNode.src = 'https://www.youtube-nocookie.com/embed/' + videoInfo.id + '?' + params.toString();
            setMediaIframePermissions(videoNode, 'autoplay; encrypted-media; picture-in-picture');
            videoNode.setAttribute('allowfullscreen', 'true');
            videoNode.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            videoNode.setAttribute('title', 'YouTube video player');
        } else if (videoInfo.type === 'vimeo') {
            videoNode = document.createElement('iframe');
            videoNode.src = 'https://player.vimeo.com/video/' + videoInfo.id + 
                           '?autoplay=' + (elData.autoplay && initiallyActive ? 1 : 0) + 
                           '&muted=' + (elData.muted ? 1 : 0) + 
                           '&loop=' + (elData.loop ? 1 : 0) +
                           '&api=1';
            setMediaIframePermissions(videoNode, 'autoplay; fullscreen');
            videoNode.setAttribute('allowfullscreen', 'true');
        } else {
            videoNode = document.createElement('video');
            videoNode.controls = true;
            videoNode.autoplay = !!elData.autoplay && initiallyActive;
            videoNode.muted = elData.muted !== false;
            videoNode.loop = !!elData.loop;
            videoNode.setAttribute('playsinline', 'true');
            videoNode.setAttribute('preload', 'metadata');

            const source = document.createElement('source');
            source.src = elData.content;
            if (elData.content && elData.content.indexOf('data:video/') === 0) {
                const mime = elData.content.split(';')[0].split(':')[1];
                if (mime) source.type = mime;
            } else {
                const urlLower = String(elData.content || '').toLowerCase();
                if (urlLower.endsWith('.mp4')) source.type = 'video/mp4';
                else if (urlLower.endsWith('.webm')) source.type = 'video/webm';
                else if (urlLower.endsWith('.ogg')) source.type = 'video/ogg';
                else if (urlLower.endsWith('.mov')) source.type = 'video/quicktime';
            }
            videoNode.appendChild(source);
            videoNode.appendChild(document.createTextNode('Your browser does not support the video tag or this format.'));
        }
        videoNode.className = 'media-fill rounded-inherit';
        videoNode.dataset.autoplay = elData.autoplay ? 'true' : 'false';
        if (videoNode.tagName === 'IFRAME' && typeof mediaOptions.onMediaLoad === 'function') {
            videoNode.addEventListener('load', mediaOptions.onMediaLoad);
        }
        el.appendChild(videoNode);
    } else if (elData.type === 'shape') {
        applyShapeStyles(el, elData.shapeType);
    } else if (elData.type === 'connector') {
        renderConnectorElement(el, elData);
    } else if (elData.type === 'html') {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = buildViewerHtmlEmbedSrcdoc(elData.content || '', elData);
        iframe.setAttribute('sandbox', getViewerHtmlEmbedSandbox());
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        iframe.className = 'media-fill rounded-inherit';
        el.appendChild(iframe);
    } else if (elData.type === 'molecule') {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = typeof buildMoleculeEmbedSrcdoc === 'function'
            ? buildMoleculeEmbedSrcdoc({
                ...elData,
                moleculePresentationMode: true,
                moleculeActive:
                    document.visibilityState !== 'hidden' &&
                    document.hasFocus() &&
                    Number(mediaOptions.slideIndex) === Number(mediaOptions.activeSlideIndex)
            })
            : '';
        if (typeof applyMoleculeEmbedSandbox === 'function') applyMoleculeEmbedSandbox(iframe);
        else {
            iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-downloads');
            iframe.setAttribute('referrerpolicy', 'no-referrer');
        }
        iframe.className = 'media-fill rounded-inherit';
        iframe.dataset.molecule = 'true';
        iframe.setAttribute('title', elData.moleculeIsTrajectory ? 'Molecular trajectory viewer' : 'Molecular structure viewer');
        if (typeof mediaOptions.onMediaLoad === 'function') iframe.addEventListener('load', mediaOptions.onMediaLoad);
        if (typeof attachMoleculeDataBridge === 'function') attachMoleculeDataBridge(iframe, elData);
        el.appendChild(iframe);
    } else if (elData.type === 'pdf') {
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-embed-wrapper';
        const iframe = document.createElement('iframe');
        iframe.src = (elData.content || '') + ((elData.content || '').includes('#') ? '&' : '#') + 'toolbar=1&navpanes=0&view=FitH';
        iframe.className = 'pdf-embed-frame';
        wrapper.appendChild(iframe);
        el.appendChild(wrapper);
        (elData.pdfAnnotations || []).forEach(annotation => {
            const node = document.createElement('div');
            node.className = annotation.type === 'note' ? 'pdf-annotation pdf-annotation-note' : 'pdf-annotation pdf-annotation-highlight';
            node.style.left = (annotation.x || 0) + '%';
            node.style.top = (annotation.y || 0) + '%';
            node.style.width = (annotation.width || 0) + '%';
            node.style.height = (annotation.height || 0) + '%';
            if (annotation.type === 'note') {
                const safeText = String(annotation.text || 'Note')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                node.innerHTML = '<span class="pdf-note-dot"></span><span class="pdf-note-label">' + safeText + '</span>';
            }
            el.appendChild(node);
        });
    } else if (elData.type === 'equation') {
        const container = document.createElement("div");
        container.className = "equation-container";
        container.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:4px;line-height:1;";
        container.innerHTML = elData.content || elData.latexSrc || "";
        el.appendChild(container);
    }
    
    return el;
}

function createViewerSlideBackgroundNode(background, mediaOptions = {}) {
    if (!background || !background.content) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'slide-background-media';
    const opacity = Math.max(0, Math.min(1, Number(background.opacity ?? 1)));
    const blur = Math.max(0, Math.min(40, Number(background.blur) || 0));
    const brightness = Math.max(10, Math.min(200, Number(background.brightness ?? 100)));
    const saturate = Math.max(0, Math.min(250, Number(background.saturate ?? 100)));
    wrapper.style.opacity = String(opacity);
    wrapper.style.filter = 'blur(' + blur + 'px) brightness(' + brightness + '%) saturate(' + saturate + '%)';
    if (blur) wrapper.style.transform = 'scale(' + (1 + blur / 120) + ')';
    if (background.type === 'video') {
        const video = document.createElement('video');
        video.className = 'slide-background-video';
        video.src = background.content;
        video.style.setProperty('object-fit', background.fit || 'cover', 'important');
        video.muted = true;
        video.loop = true;
        const initiallyActive =
            document.visibilityState !== 'hidden' &&
            document.hasFocus() &&
            Number(mediaOptions.slideIndex) === Number(mediaOptions.activeSlideIndex);
        video.autoplay = initiallyActive;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        if (initiallyActive) {
            const play = () => video.play().catch(() => {});
            video.addEventListener('loadeddata', play, { once: true });
            requestAnimationFrame(play);
        }
        wrapper.appendChild(video);
    } else {
        const image = document.createElement('img');
        image.className = 'slide-background-image';
        image.src = background.content;
        image.style.setProperty('object-fit', background.fit || 'cover', 'important');
        image.alt = '';
        image.draggable = false;
        wrapper.appendChild(image);
    }
    return wrapper;
}

function _parseVideoUrl(url) {
    if (!url) return { type: 'none' };
    const value = String(url).trim();
    const parseableValue = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : 'https://' + value;
    let parsed = null;
    try {
        parsed = new URL(parseableValue);
    } catch (_err) {}
    const host = parsed && parsed.hostname ? parsed.hostname.replace(/^www\./, '') : '';
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
        let videoId = '';
        if (host === 'youtu.be') videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
        else if (parsed && parsed.searchParams.has('v')) videoId = parsed.searchParams.get('v') || '';
        else if (parsed && parsed.pathname.includes('/embed/')) videoId = parsed.pathname.split('/embed/')[1].split('/')[0];
        else videoId = parsed && parsed.pathname ? parsed.pathname.split('/').filter(Boolean)[0] || '' : '';
        return { type: 'youtube', id: videoId };
    }
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
        const videoId = parsed && parsed.pathname ? parsed.pathname.split('/').filter(Boolean)[0] || '' : '';
        return { type: 'vimeo', id: videoId };
    }
    return { type: 'direct', url: value };
}

function normalizeConnectorType(connectorType) {
    return connectorType === 'curve' || connectorType === 'poly' ? connectorType : 'line';
}

function getConnectorPoints(elData) {
    const fallback = normalizeConnectorType(elData.connectorType) === 'curve'
        ? [{ x: 24, y: 96 }, { x: 140, y: 24 }, { x: 256, y: 96 }]
        : normalizeConnectorType(elData.connectorType) === 'poly'
          ? [{ x: 24, y: 110 }, { x: 140, y: 110 }, { x: 140, y: 36 }, { x: 256, y: 36 }]
          : [{ x: 24, y: 96 }, { x: 256, y: 36 }];
    const points = Array.isArray(elData.points) ? elData.points : fallback;
    const normalized = points
        .map(point => ({ x: Number(point?.x), y: Number(point?.y) }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    return normalized.length >= 2 ? normalized : fallback;
}

function buildConnectorPath(elData, startAdj, endAdj) {
    startAdj = startAdj || 0;
    endAdj = endAdj || 0;
    const rawPts = getConnectorPoints(elData);
    const pts = rawPts.map(function(p) { return { x: p.x, y: p.y }; });
    const n = pts.length;
    if (startAdj > 0 && n >= 2) {
        const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > startAdj) { pts[0].x += dx / len * startAdj; pts[0].y += dy / len * startAdj; }
    }
    if (endAdj > 0 && n >= 2) {
        const dx = pts[n - 1].x - pts[n - 2].x, dy = pts[n - 1].y - pts[n - 2].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > endAdj) { pts[n - 1].x -= dx / len * endAdj; pts[n - 1].y -= dy / len * endAdj; }
    }
    if (normalizeConnectorType(elData.connectorType) === 'poly') {
        return 'M ' + pts.map(function(p) { return p.x + ' ' + p.y; }).join(' L ');
    }
    if (normalizeConnectorType(elData.connectorType) === 'curve' && pts.length > 2) {
        let path = 'M ' + pts[0].x + ' ' + pts[0].y;
        for (let i = 1; i < pts.length - 1; i += 1) {
            const next = pts[i + 1];
            const midX = (pts[i].x + next.x) / 2;
            const midY = (pts[i].y + next.y) / 2;
            path += ' Q ' + pts[i].x + ' ' + pts[i].y + ' ' + midX + ' ' + midY;
        }
        const last = pts[pts.length - 1];
        path += ' T ' + last.x + ' ' + last.y;
        return path;
    }
    return 'M ' + pts[0].x + ' ' + pts[0].y + ' L ' + pts[n - 1].x + ' ' + pts[n - 1].y;
}

function _exportArrowAdj(head, hw, hl) {
    if (head === 'none' || head === 'line') return 0;
    if (head === 'dot' || head === 'square') return hw;
    return hl;
}

function _exportArrowheadSvg(tipX, tipY, nx, ny, hw, hl, head, color, strokeWidth) {
    if (head === 'none') return '';
    const px = -ny, py = nx;
    const bx = tipX - nx * hl, by = tipY - ny * hl;
    const r = function(v) { return Math.round(v * 100) / 100; };
    if (head === 'arrow' || head === 'triangle') {
        return '<path d="M ' + r(bx + px*hw) + ' ' + r(by + py*hw) + ' L ' + r(tipX) + ' ' + r(tipY) + ' L ' + r(bx - px*hw) + ' ' + r(by - py*hw) + ' Z" fill="' + color + '" stroke="' + color + '" stroke-linejoin="round"/>';
    }
    if (head === 'chevron') {
        return '<path d="M ' + r(bx + px*hw) + ' ' + r(by + py*hw) + ' L ' + r(tipX) + ' ' + r(tipY) + ' L ' + r(bx - px*hw) + ' ' + r(by - py*hw) + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (head === 'line') {
        return '<path d="M ' + r(tipX + px*hw) + ' ' + r(tipY + py*hw) + ' L ' + r(tipX - px*hw) + ' ' + r(tipY - py*hw) + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round"/>';
    }
    if (head === 'dot') {
        return '<circle cx="' + r(tipX - nx*hw) + '" cy="' + r(tipY - ny*hw) + '" r="' + r(hw) + '" fill="' + color + '"/>';
    }
    if (head === 'diamond') {
        const mx = bx + (hl / 2) * nx, my = by + (hl / 2) * ny;
        return '<path d="M ' + r(tipX) + ' ' + r(tipY) + ' L ' + r(mx + px*hw) + ' ' + r(my + py*hw) + ' L ' + r(bx) + ' ' + r(by) + ' L ' + r(mx - px*hw) + ' ' + r(my - py*hw) + ' Z" fill="' + color + '" stroke-linejoin="round"/>';
    }
    if (head === 'square') {
        const cx = tipX - nx*hw, cy = tipY - ny*hw;
        return '<path d="M ' + r(cx + px*hw + nx*hw) + ' ' + r(cy + py*hw + ny*hw) + ' L ' + r(cx + px*hw - nx*hw) + ' ' + r(cy + py*hw - ny*hw) + ' L ' + r(cx - px*hw - nx*hw) + ' ' + r(cy - py*hw - ny*hw) + ' L ' + r(cx - px*hw + nx*hw) + ' ' + r(cy - py*hw + ny*hw) + ' Z" fill="' + color + '" stroke-linejoin="round"/>';
    }
    return '';
}

function renderConnectorElement(el, elData) {
    const stroke = elData.styles && elData.styles.color ? elData.styles.color : '#2563eb';
    const strokeWidth = Math.max(1, Number(elData.styles && elData.styles.strokeWidth) || 4);
    const width = parseFloat(elData.width) || 280;
    const height = parseFloat(elData.height) || 140;
    const startHead = ['none', 'arrow', 'triangle', 'chevron', 'line', 'dot', 'diamond', 'square'].includes(elData.connectorStart) ? elData.connectorStart : 'none';
    const endHead = ['none', 'arrow', 'triangle', 'chevron', 'line', 'dot', 'diamond', 'square'].includes(elData.connectorEnd) ? elData.connectorEnd : 'arrow';
    const hw = Math.max(2, (Number(elData.connectorHeadWidth) || 14) / 2);
    const hl = Math.max(2, Number(elData.connectorHeadLength) || 14);

    const pts = getConnectorPoints(elData);
    const n = pts.length;
    function ud(ax, ay, bx, by) {
        const len = Math.sqrt((bx-ax)*(bx-ax) + (by-ay)*(by-ay));
        return len < 0.001 ? { x: 1, y: 0 } : { x: (bx-ax)/len, y: (by-ay)/len };
    }
    const endDir = ud(pts[n-2].x, pts[n-2].y, pts[n-1].x, pts[n-1].y);
    const startDir = ud(pts[1].x, pts[1].y, pts[0].x, pts[0].y);
    const startAdj = _exportArrowAdj(startHead, hw, hl);
    const endAdj = _exportArrowAdj(endHead, hw, hl);

    el.innerHTML =
        '<svg class="connector-svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="100%">' +
        '<path d="' + buildConnectorPath(elData, startAdj, endAdj) + '" fill="none" stroke="' + stroke + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        _exportArrowheadSvg(pts[0].x, pts[0].y, startDir.x, startDir.y, hw, hl, startHead, stroke, strokeWidth) +
        _exportArrowheadSvg(pts[n-1].x, pts[n-1].y, endDir.x, endDir.y, hw, hl, endHead, stroke, strokeWidth) +
        '</svg>';
}

function renderTextContent(elData) {
    if (Array.isArray(elData.content)) {
        const bulletStyle = (elData.bulletStyle && BULLET_STYLE_THEMES[elData.bulletStyle]) ? elData.bulletStyle : 'default';
        let html = '<div class="ppt-bullet-block" data-bullet-style="' + bulletStyle + '">';
        elData.content.forEach(item => {
            const safeLevel = Math.max(0, Number(item.level) || 0);
            const levelStyle = _viewerGetLevelStyle(bulletStyle, safeLevel);
            const glyph = _viewerGetBulletGlyph(levelStyle);
            const indent = _viewerGetBulletIndent(safeLevel, levelStyle);
            const color = levelStyle.color || 'inherit';
            const fontScale = Number(levelStyle.fontSize) || 1;
            const itemHtml =
                typeof item.html === 'string'
                    ? item.html
                    : String(item.text || '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;');
            const text = itemHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            if (!text) {
                html += '<div class="ppt-bullet-spacer"></div>';
                return;
            }
            html += '<div class="ppt-bullet-row" style="--bullet-indent:' + indent + 'px;--bullet-color:' + color + ';--bullet-font-scale:' + fontScale + ';">';
            html += '<span class="ppt-bullet-marker">' + glyph + '</span>';
            html += '<span class="ppt-bullet-text">' + itemHtml + '</span>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }
    return elData.content || '';
}

function applyShapeStyles(el, shapeType) {
    switch (shapeType) {
        case 'triangle':
            el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            break;
        case 'diamond':
            el.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            break;
        case 'hexagon':
            el.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
            break;
        case 'parallelogram':
            el.style.clipPath = 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)';
            break;
        case 'arrow-right':
            el.style.clipPath = 'polygon(0% 32%, 62% 32%, 62% 0%, 100% 50%, 62% 100%, 62% 68%, 0% 68%)';
            break;
        case 'arrow-left':
            el.style.clipPath = 'polygon(38% 0%, 38% 32%, 100% 32%, 100% 68%, 38% 68%, 38% 100%, 0% 50%)';
            break;
        case 'arrow-up':
            el.style.clipPath = 'polygon(50% 0%, 100% 40%, 68% 40%, 68% 100%, 32% 100%, 32% 40%, 0% 40%)';
            break;
        case 'arrow-down':
            el.style.clipPath = 'polygon(32% 0%, 68% 0%, 68% 60%, 100% 60%, 50% 100%, 0% 60%, 32% 60%)';
            break;
        case 'circle':
            el.style.borderRadius = '9999px';
            break;
    }
}

function playSlideAnimations(slideDom) {
    if (!slideDom) return;
}
`;
}

// --- Global Aliases for UI Bindings ---
window.exportPresentationZip = exportZip;
window.exportPresentationPDF = exportPDF;
window.exportPresentationPPTX = exportPPTX;
window.exportPresentationJson = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "presentation.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};
