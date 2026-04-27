
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
        for (const el of slide.elements) {
            // Extract image/video/pdf content if it's a data URL
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
            } else if ((el.type === "image" || el.type === "video" || el.type === "pdf") && (isBundlableLocalAsset(el.content) || String(el.content || "").startsWith("blob:"))) {
                const sourceUrl = new URL(el.content, window.location.href);
                const response = await fetch(sourceUrl.toString());
                if (!response.ok) continue;

                const blob = await response.blob();
                const mime = blob.type || (el.type === "image" ? "image/png" : el.type === "pdf" ? "application/pdf" : "video/mp4");
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
        </div>
        <div class="standalone-controls">
            <button id="btn-prev" type="button" aria-label="Previous slide">Prev</button>
            <button id="btn-fullscreen" type="button" aria-label="Toggle fullscreen">Fullscreen</button>
            <button id="btn-chalk" type="button" aria-label="Toggle chalkboard">Chalkboard</button>
            <button id="btn-clear-chalk" type="button" aria-label="Clear chalkboard">Clear Board</button>
            <button id="btn-laser" type="button" aria-label="Toggle laser pointer">Laser</button>
            <div class="standalone-status" id="viewer-status">1 / 1</div>
            <button id="btn-next" type="button" aria-label="Next slide">Next</button>
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
}

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
    width: 1024px;
    height: 768px;
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

.standalone-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 16px 18px;
}

.standalone-controls button {
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(15,23,42,0.72);
    color: white;
    border-radius: 999px;
    padding: 8px 14px;
    cursor: pointer;
}

.standalone-controls button.is-active {
    background: rgba(14,165,233,0.22);
    border-color: rgba(56,189,248,0.7);
}

.standalone-status {
    min-width: 70px;
    text-align: center;
    color: rgba(255,255,255,0.82);
}

.presentation-overlay {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 1024px;
    height: 768px;
    transform-origin: center center;
}

.presentation-chalkboard {
    z-index: 5;
    pointer-events: none;
    background: transparent;
}

.presentation-chalkboard.is-active {
    pointer-events: auto;
    cursor: crosshair;
}

.presentation-laser {
    z-index: 6;
    inset: auto;
    width: 24px;
    height: 24px;
    margin: 0;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(255, 90, 90, 0.95) 0%, rgba(255, 44, 44, 0.82) 38%, rgba(255, 44, 44, 0.18) 72%, rgba(255, 44, 44, 0) 100%);
    box-shadow: 0 0 18px rgba(255, 64, 64, 0.48);
    opacity: 0;
    pointer-events: none;
    translate: -50% -50%;
}

.presentation-laser.is-active {
    opacity: 1;
}

.canvas-element {
    position: absolute;
    box-sizing: border-box;
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
}

/* Bullet List Styles */
.ppt-bullet-block { display: flex; flex-direction: column; gap: 0.35em; width: 100%; text-align: inherit; }
.ppt-bullet-row { display: grid; grid-template-columns: 1.2em minmax(0, 1fr); column-gap: 12px; align-items: start; margin-left: var(--bullet-indent, 0px); }
.ppt-bullet-marker { display: inline-block; min-width: 1.2em; line-height: 1.2; color: var(--bullet-color, currentColor); font-size: calc(1em * var(--bullet-font-scale, 1)); }
.ppt-bullet-text { min-width: 0; line-height: inherit; text-align: inherit; }
.ppt-bullet-spacer { min-height: 1em; }
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
function initViewer(data) {
    const container = document.getElementById('slides-container');
    const stage = document.getElementById('viewer-stage');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const chalkBtn = document.getElementById('btn-chalk');
    const clearChalkBtn = document.getElementById('btn-clear-chalk');
    const laserBtn = document.getElementById('btn-laser');
    const status = document.getElementById('viewer-status');
    const chalkboard = document.getElementById('chalkboard-canvas');
    const laserPointer = document.getElementById('laser-pointer');
    const slides = data.slides || [];
    let activeSlideIndex = 0;
    let activeFragmentIndex = -1;
    let viewerScale = 1;
    let chalkEnabled = false;
    let laserEnabled = false;
    let isDrawing = false;
    let lastDrawPoint = null;
    const chalkCtx = chalkboard ? chalkboard.getContext('2d') : null;
    
    slides.forEach(slide => {
        const section = document.createElement('section');
        section.id = slide.id;
        section.className = 'presentation-slide';
        section.style.width = '1024px';
        section.style.height = '768px';
        
        (slide.elements || []).forEach(elData => {
            const node = createViewerElement(elData);
            section.appendChild(node);
        });
        
        container.appendChild(section);
    });
    
    const getSlideDom = index => container.children[index];
    const getFragments = slideDom =>
        Array.from(slideDom.querySelectorAll('.fragment'))
            .sort((a, b) => (Number(a.getAttribute('data-fragment-index')) || 0) - (Number(b.getAttribute('data-fragment-index')) || 0));

    function updateScale() {
        const scale = Math.min(stage.clientWidth / 1024, stage.clientHeight / 768);
        viewerScale = Math.max(0.1, scale);
        container.style.transform = 'scale(' + viewerScale + ')';
        if (chalkboard) chalkboard.style.transform = 'scale(' + viewerScale + ')';
    }

    function resizeChalkboard() {
        if (!chalkboard || !chalkCtx) return;
        const snapshot = chalkboard.width > 0 ? chalkCtx.getImageData(0, 0, chalkboard.width, chalkboard.height) : null;
        chalkboard.width = 1024;
        chalkboard.height = 768;
        chalkCtx.lineCap = 'round';
        chalkCtx.lineJoin = 'round';
        chalkCtx.strokeStyle = 'rgba(255, 245, 157, 0.92)';
        chalkCtx.lineWidth = 5;
        if (snapshot) chalkCtx.putImageData(snapshot, 0, 0);
    }

    function setChalkActive(enabled) {
        chalkEnabled = !!enabled;
        if (chalkboard) chalkboard.classList.toggle('is-active', chalkEnabled);
        if (chalkBtn) chalkBtn.classList.toggle('is-active', chalkEnabled);
        if (!chalkEnabled) {
            isDrawing = false;
            lastDrawPoint = null;
        }
    }

    function setLaserActive(enabled) {
        laserEnabled = !!enabled;
        if (laserBtn) laserBtn.classList.toggle('is-active', laserEnabled);
        if (laserPointer) {
            laserPointer.classList.toggle('is-active', laserEnabled);
            if (!laserEnabled) {
                laserPointer.style.left = '-100px';
                laserPointer.style.top = '-100px';
            }
        }
    }

    function clearChalkboard() {
        if (!chalkboard || !chalkCtx) return;
        chalkCtx.clearRect(0, 0, chalkboard.width, chalkboard.height);
    }

    function getStagePoint(event) {
        if (!chalkboard) return null;
        const rect = chalkboard.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = ((event.clientX - rect.left) / rect.width) * 1024;
        const y = ((event.clientY - rect.top) / rect.height) * 768;
        return {
            x: Math.max(0, Math.min(1024, x)),
            y: Math.max(0, Math.min(768, y))
        };
    }

    function updateLaserPosition(event) {
        if (!laserEnabled || !laserPointer || !chalkboard) return;
        const point = getStagePoint(event);
        if (!point) return;
        laserPointer.style.left = point.x + 'px';
        laserPointer.style.top = point.y + 'px';
    }

    function drawSegment(from, to) {
        if (!chalkCtx || !from || !to) return;
        chalkCtx.beginPath();
        chalkCtx.moveTo(from.x, from.y);
        chalkCtx.lineTo(to.x, to.y);
        chalkCtx.stroke();
    }

    function syncHash() {
        history.replaceState(null, '', '#slide-' + (activeSlideIndex + 1) + '-' + Math.max(0, activeFragmentIndex + 1));
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
        if (status) status.textContent = (activeSlideIndex + 1) + ' / ' + Math.max(1, slides.length);
        syncHash();
    }

    function goToSlide(index, fragmentIndex) {
        activeSlideIndex = Math.max(0, Math.min(index, slides.length - 1));
        const fragments = getFragments(getSlideDom(activeSlideIndex));
        const maxFragment = fragments.length - 1;
        activeFragmentIndex = Math.max(-1, Math.min(fragmentIndex, maxFragment));
        applySlideState();
    }

    function nextStep() {
        const fragments = getFragments(getSlideDom(activeSlideIndex));
        if (activeFragmentIndex < fragments.length - 1) {
            activeFragmentIndex += 1;
        } else if (activeSlideIndex < slides.length - 1) {
            activeSlideIndex += 1;
            activeFragmentIndex = -1;
        }
        applySlideState();
    }

    function prevStep() {
        if (activeFragmentIndex >= 0) {
            activeFragmentIndex -= 1;
        } else if (activeSlideIndex > 0) {
            activeSlideIndex -= 1;
            activeFragmentIndex = getFragments(getSlideDom(activeSlideIndex)).length - 1;
        }
        applySlideState();
    }

    prevBtn && prevBtn.addEventListener('click', prevStep);
    nextBtn && nextBtn.addEventListener('click', nextStep);
    fullscreenBtn && fullscreenBtn.addEventListener('click', async () => {
        const target = document.documentElement;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (target.requestFullscreen) await target.requestFullscreen();
        } catch (err) {
            console.error('Fullscreen toggle failed.', err);
        }
    });
    chalkBtn && chalkBtn.addEventListener('click', () => setChalkActive(!chalkEnabled));
    clearChalkBtn && clearChalkBtn.addEventListener('click', clearChalkboard);
    laserBtn && laserBtn.addEventListener('click', () => setLaserActive(!laserEnabled));
    chalkboard && chalkboard.addEventListener('pointerdown', event => {
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
    document.addEventListener('fullscreenchange', () => {
        const active = !!document.fullscreenElement;
        if (fullscreenBtn) fullscreenBtn.classList.toggle('is-active', active);
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
}

function createViewerElement(elData) {
    const el = document.createElement('div');
    el.className = 'canvas-element';
    el.style.transform = 'translate(' + elData.x + 'px, ' + elData.y + 'px)';
    if (elData.width) el.style.width = elData.width;
    if (elData.height) el.style.height = elData.height;
    Object.assign(el.style, elData.styles);
    if (elData.fragmentAnimation && elData.fragmentAnimation !== 'none') {
        el.classList.add('fragment', elData.fragmentAnimation);
        if (elData.fragmentIndex != null) {
            el.setAttribute('data-fragment-index', elData.fragmentIndex);
        }
    }
    
    if (elData.type === 'text') {
        const content = document.createElement('div');
        content.className = 'text-element-content';
        content.innerHTML = renderTextContent(elData);
        el.appendChild(content);
    } else if (elData.type === 'image') {
        if (elData.cropTransform) {
            const wrapper = document.createElement("div");
            wrapper.style.cssText = "width:100%; height:100%; border-radius:inherit; overflow:hidden; position:relative;";
            const img = document.createElement("img");
            img.src = elData.content;
            img.style.cssText = "position:absolute; max-width:none; " + 
                               "left:" + elData.cropTransform.leftPercent + "%; " + 
                               "top:" + elData.cropTransform.topPercent + "%; " + 
                               "width:" + elData.cropTransform.widthPercent + "%; " + 
                               "height:" + elData.cropTransform.heightPercent + "%;";
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
        let videoNode;
        if (videoInfo.type === 'youtube') {
            videoNode = document.createElement('iframe');
            videoNode.src = 'https://www.youtube.com/embed/' + videoInfo.id + 
                           '?autoplay=' + (elData.autoplay ? 1 : 0) + 
                           '&mute=' + (elData.muted ? 1 : 0) + 
                           '&loop=' + (elData.loop ? 1 : 0) + 
                           '&playlist=' + videoInfo.id;
            videoNode.setAttribute('allow', 'autoplay; encrypted-media');
            videoNode.setAttribute('allowfullscreen', 'true');
        } else if (videoInfo.type === 'vimeo') {
            videoNode = document.createElement('iframe');
            videoNode.src = 'https://player.vimeo.com/video/' + videoInfo.id + 
                           '?autoplay=' + (elData.autoplay ? 1 : 0) + 
                           '&muted=' + (elData.muted ? 1 : 0) + 
                           '&loop=' + (elData.loop ? 1 : 0);
            videoNode.setAttribute('allow', 'autoplay; fullscreen');
            videoNode.setAttribute('allowfullscreen', 'true');
        } else {
            videoNode = document.createElement('video');
            videoNode.controls = true;
            videoNode.autoplay = !!elData.autoplay;
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
        el.appendChild(videoNode);
    } else if (elData.type === 'shape') {
        applyShapeStyles(el, elData.shapeType);
    } else if (elData.type === 'connector') {
        renderConnectorElement(el, elData);
    } else if (elData.type === 'html') {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = elData.content;
        iframe.className = 'media-fill rounded-inherit';
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
        container.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px;";
        container.innerHTML = elData.content || elData.latexSrc || "";
        el.appendChild(container);
    }
    
    return el;
}

function _parseVideoUrl(url) {
    if (!url) return { type: 'none' };
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
        else if (url.includes('v=')) videoId = url.split('v=')[1].split(/[&?#]/)[0];
        else if (url.includes('embed/')) videoId = url.split('embed/')[1].split(/[?#]/)[0];
        return { type: 'youtube', id: videoId };
    }
    if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1].split(/[?#]/)[0];
        return { type: 'vimeo', id: videoId };
    }
    return { type: 'direct', url: url };
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
        let html = '<div class="ppt-bullet-block">';
        elData.content.forEach(item => {
            const safeLevel = Math.max(0, Number(item.level) || 0);
            const indent = safeLevel * 24;
            const itemHtml =
                typeof item.html === 'string'
                    ? item.html
                    : String(item.text || '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;');
            html += '<div class="ppt-bullet-row" style="--bullet-indent: ' + indent + 'px">';
            html += '<span class="ppt-bullet-marker">•</span>';
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
