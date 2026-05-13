

const RENDER_REVEAL_FRAGMENT_CLASSES = [
    "fade-in",
    "fade-in-then-out",
    "fade-in-then-semi-out",
    "fade-up",
    "fade-down",
    "fade-left",
    "fade-right",
    "grow",
    "fade-out",
    "shrink",
    "semi-fade-out",
    "highlight-red",
    "highlight-green",
    "highlight-blue",
    "highlight-current-red",
    "highlight-current-green",
    "highlight-current-blue",
    "current-visible",
];

let _draggedSlidePreviewIndex = null;
let _slidePreviewDropMarker = null;
let _suppressSlidePreviewClickUntil = 0;
let _slidePreviewStructureSignature = "";

function getSlidePreviewStructureSignature() {
    const slideConfig = typeof getPresentationPageSetupConfig === "function" ? getPresentationPageSetupConfig() : { width: 1024, height: 768 };
    const slideIds = (state.slides || []).map(slide => slide.id).join("|");
    return `${slideConfig.width}x${slideConfig.height}:${slideIds}`;
}

function _getStructuredSelectionOffsets(el) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !el.contains(selection.anchorNode)) {
        const length = el.innerText.length;
        return { start: length, end: length };
    }

    const range = selection.getRangeAt(0);
    const preStart = range.cloneRange();
    preStart.selectNodeContents(el);
    preStart.setEnd(range.startContainer, range.startOffset);

    const preEnd = range.cloneRange();
    preEnd.selectNodeContents(el);
    preEnd.setEnd(range.endContainer, range.endOffset);

    return {
        start: preStart.toString().length,
        end: preEnd.toString().length,
    };
}

function _setStructuredSelectionOffsets(el, start, end = start) {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let current = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const next = current + node.textContent.length;

        if (!startNode && start <= next) {
            startNode = node;
            startOffset = Math.max(0, start - current);
        }
        if (!endNode && end <= next) {
            endNode = node;
            endOffset = Math.max(0, end - current);
            break;
        }
        current = next;
    }

    const fallbackNode = el.lastChild || el;
    range.setStart(startNode || fallbackNode, startNode ? startOffset : fallbackNode.textContent?.length || 0);
    range.setEnd(endNode || startNode || fallbackNode, endNode ? endOffset : startNode ? startOffset : fallbackNode.textContent?.length || 0);
    selection.removeAllRanges();
    selection.addRange(range);
}

function _updateStructuredEditorText(el, nextText, selectionStart, selectionEnd = selectionStart) {
    el.textContent = nextText;
    _setStructuredSelectionOffsets(el, selectionStart, selectionEnd);
}

function _getActiveStructuredEditor() {
    const active = document.activeElement;
    if (!active) return null;
    if (
        active.classList?.contains("text-element-content") &&
        active.dataset.structuredEdit === "true" &&
        active.contentEditable === "true"
    ) {
        return active;
    }
    return null;
}

function _focusEditableHost(el) {
    el.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !el.contains(selection.anchorNode)) {
        const length = el.textContent.length;
        _setStructuredSelectionOffsets(el, length, length);
    }
}

function _getStructuredEditorBulletStyle(el) {
    return el?.dataset?.structuredEditBulletStyle || "default";
}

function _getStructuredEditorMode(el) {
    return el?.dataset?.structuredEditMode || "plain";
}

function _getActiveStructuredBulletListItem(host) {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    if (!host || !node) return null;
    const elementNode = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return elementNode?.closest?.(".ppt-bullet-edit-item") || null;
}

function _refreshStructuredBulletEditorMarkers(host) {
    if (!host || _getStructuredEditorMode(host) !== "list") return;
    const bulletStyle = _getStructuredEditorBulletStyle(host);
    host.querySelectorAll(".ppt-bullet-edit-item").forEach(item => {
        const meta = getBulletLevelMeta(Number(item.dataset.level) || 0, bulletStyle);
        item.dataset.level = String(meta.level);
        item.dataset.marker = meta.marker;
        item.style.setProperty("--bullet-indent", `${meta.indent}px`);
    });
}

function _commitStructuredBulletEditorChange(host) {
    if (!host || _getStructuredEditorMode(host) !== "list") return;
    const dom = host.closest(".canvas-element");
    const id = dom?.id || dom?.dataset?.id;
    if (!id) return;
    const elData = state.slides[currentSlideIndex]?.elements?.find(el => el.id === id);
    if (!elData || elData.type !== "text") return;

    const nextContent = parseStructuredBulletEditorHtml(host, { preserveTrailingEmpty: true });
    if (host.dataset.undoSnapshotCaptured !== "true") {
        saveStateToUndo();
        host.dataset.undoSnapshotCaptured = "true";
    }
    updateElementState(id, { content: nextContent, bulletStyle: _getStructuredEditorBulletStyle(host) });
    elData.content = nextContent;
    elData.bulletStyle = _getStructuredEditorBulletStyle(host);

    const layout = syncTextBoxLayout(dom, elData);
    if (layout?.autoHeight && Number.isFinite(layout.height)) {
        updateElementState(id, { height: `${layout.height}px` });
        elData.height = `${layout.height}px`;
    }
    refreshPreviews?.();
}

function _placeCaretInElement(el, { atEnd = false } = {}) {
    if (!el) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(!atEnd);
    selection.removeAllRanges();
    selection.addRange(range);
}

function _placeCaretInListItemText(item, { atEnd = false } = {}) {
    if (!item) return;
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    let textNode = Array.from(item.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
    if (!textNode) {
        textNode = document.createTextNode("");
        item.insertBefore(textNode, atEnd ? null : item.firstChild);
    }
    const offset = atEnd ? textNode.textContent.length : 0;
    range.setStart(textNode, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function _insertStructuredListItemBreak(host) {
    const item = _getActiveStructuredBulletListItem(host);
    if (!host || !item) return false;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!item.contains(range.startContainer)) return false;

    if (!range.collapsed) {
        range.deleteContents();
    }

    const splitRange = document.createRange();
    splitRange.selectNodeContents(item);
    splitRange.setStart(range.startContainer, range.startOffset);
    const trailingContent = splitRange.extractContents();

    const nextItem = document.createElement("li");
    nextItem.className = "ppt-bullet-edit-item";
    nextItem.dataset.level = item.dataset.level || "0";
    nextItem.appendChild(trailingContent);
    if (!nextItem.textContent.trim() && !nextItem.querySelector("br,img,svg,math")) {
        nextItem.innerHTML = "<br>";
    }
    if (!item.textContent.trim() && !item.querySelector("br,img,svg,math")) {
        item.innerHTML = "<br>";
    }
    item.insertAdjacentElement("afterend", nextItem);
    _refreshStructuredBulletEditorMarkers(host);
    _placeCaretInListItemText(nextItem);
    _commitStructuredBulletEditorChange(host);
    return true;
}

function _handleStructuredListBackspace(host) {
    const item = _getActiveStructuredBulletListItem(host);
    if (!host || !item) return false;
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    if (!item.contains(range.startContainer)) return false;

    const currentText = plainTextFromHtmlSnippet(item.innerHTML).trim();
    const atStart = range.startOffset === 0 && (
        range.startContainer === item ||
        !range.startContainer.textContent ||
        range.startContainer === item.firstChild
    );

    if (currentText || !atStart) return false;
    const previous = item.previousElementSibling;
    const next = item.nextElementSibling;
    item.remove();
    if (!host.querySelector(".ppt-bullet-edit-item")) {
        const fallback = document.createElement("li");
        fallback.className = "ppt-bullet-edit-item";
        fallback.dataset.level = "0";
        fallback.innerHTML = "<br>";
        host.querySelector(".ppt-bullet-edit-list")?.appendChild(fallback);
        _refreshStructuredBulletEditorMarkers(host);
        _placeCaretInElement(fallback);
        _commitStructuredBulletEditorChange(host);
        return true;
    }
    _refreshStructuredBulletEditorMarkers(host);
    _placeCaretInElement(previous || next, { atEnd: Boolean(previous) });
    _commitStructuredBulletEditorChange(host);
    return true;
}

let _structuredEditorShortcutsInstalled = false;
function _installStructuredEditorShortcuts() {
    if (_structuredEditorShortcutsInstalled) return;
    _structuredEditorShortcutsInstalled = true;
    document.addEventListener(
        "keydown",
        e => {
            const host = _getActiveStructuredEditor();
            if (!host) return;
            if (e.key === "Tab") {
                e.preventDefault();
                e.stopPropagation();
                _adjustStructuredIndentation(host, e.shiftKey ? -1 : 1);
            } else if (e.key === "Enter") {
                const handled =
                    _getStructuredEditorMode(host) === "list"
                        ? _insertStructuredListItemBreak(host)
                        : (_insertStructuredLineBreak(host), true);
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (e.key === "Backspace") {
                const handled =
                    _getStructuredEditorMode(host) === "list"
                        ? _handleStructuredListBackspace(host)
                        : _handleStructuredBackspace(host);
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        },
        true,
    );
}

function _adjustStructuredIndentation(el, direction) {
    if (_getStructuredEditorMode(el) === "list") {
        const item = _getActiveStructuredBulletListItem(el);
        if (!item) return;
        const nextLevel = Math.max(0, Math.min(2, (Number(item.dataset.level) || 0) + direction));
        item.dataset.level = String(nextLevel);
        _refreshStructuredBulletEditorMarkers(el);
        _commitStructuredBulletEditorChange(el);
        return;
    }

    const value = (el.textContent || "").replace(/\r/g, "");
    const { start, end } = _getStructuredSelectionOffsets(el);
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split("\n");

    const bulletStyle = _getStructuredEditorBulletStyle(el);
    const updated = lines.map(line => {
        if (!line.trim()) return line;
        const parsed = stripEditableBulletPrefix(line);
        const nextLevel = Math.max(0, Math.min(2, parsed.level + direction));
        return `${getEditableBulletPrefix(nextLevel, bulletStyle)}${parsed.text}`;
    });

    const nextBlock = updated.join("\n");
    const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;
    const delta = nextBlock.length - selectedBlock.length;
    _updateStructuredEditorText(el, nextValue, start + (direction > 0 ? 2 : Math.max(-2, delta)), end + delta);
}

function _insertStructuredLineBreak(el) {
    const value = (el.textContent || "").replace(/\r/g, "");
    const { start, end } = _getStructuredSelectionOffsets(el);
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf("\n", start);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const currentLine = value.slice(lineStart, lineEnd);
    const bulletStyle = _getStructuredEditorBulletStyle(el);
    const parsed = stripEditableBulletPrefix(currentLine);
    const prefix = getEditableBulletPrefix(parsed.level, bulletStyle);
    const nextValue = `${value.slice(0, start)}\n${prefix}${value.slice(end)}`;
    const nextCaret = start + 1 + prefix.length;
    _updateStructuredEditorText(el, nextValue, nextCaret, nextCaret);
}

function _handleStructuredBackspace(el) {
    const value = (el.textContent || "").replace(/\r/g, "");
    const { start, end } = _getStructuredSelectionOffsets(el);
    if (start !== end) return false;

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIdx = value.indexOf("\n", start);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const currentLine = value.slice(lineStart, lineEnd);
    const bulletStyle = _getStructuredEditorBulletStyle(el);
    const parsed = stripEditableBulletPrefix(currentLine);
    const prefix = getEditableBulletPrefix(parsed.level, bulletStyle);

    if (currentLine !== prefix || start < lineStart + prefix.length) {
        return false;
    }

    const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`;
    const nextCaret = lineStart;
    _updateStructuredEditorText(el, nextValue, nextCaret, nextCaret);
    return true;
}

function _shouldAnimateBulletsIndividually(elData) {
    return Boolean(
        document.body.classList.contains("play-mode-active") &&
            elData?.type === "text" &&
            isStructuredBulletContent(elData.content) &&
            elData.fragmentAnimation &&
            elData.fragmentAnimation !== "none",
    );
}

function _applyBulletFragmentAnimation(contentHost, elData) {
    if (!contentHost || !_shouldAnimateBulletsIndividually(elData)) return;
    const rows = Array.from(contentHost.querySelectorAll(".ppt-bullet-row"));
    let fragmentIndex = Number.isFinite(Number(elData.fragmentIndex)) ? Number(elData.fragmentIndex) : 0;
    rows.forEach(row => {
        row.classList.add("fragment", elData.fragmentAnimation);
        row.setAttribute("data-fragment-index", fragmentIndex);
        fragmentIndex += 1;
    });
}

function createSlideBackgroundNode(background, { forPreview = false, slideIndex = currentSlideIndex } = {}) {
    const normalized = normalizeSlideBackground(background);
    if (!normalized) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "slide-background-media";
    wrapper.style.opacity = String(normalized.opacity ?? 1);
    wrapper.style.filter = `blur(${normalized.blur || 0}px) brightness(${normalized.brightness || 100}%) saturate(${normalized.saturate || 100}%)`;
    if (normalized.blur) {
        wrapper.style.transform = `scale(${1 + Math.min(40, normalized.blur) / 120})`;
    }
    if (normalized.type === "video") {
        const video = document.createElement("video");
        video.className = "slide-background-video";
        video.src = normalized.content;
        video.style.setProperty("object-fit", normalized.fit || "cover", "important");
        video.muted = true;
        video.loop = true;
        const initiallyActive =
            !forPreview &&
            document.visibilityState !== "hidden" &&
            document.hasFocus() &&
            Number(slideIndex) === getActiveSlideMediaIndex();
        video.autoplay = initiallyActive;
        video.playsInline = true;
        video.preload = forPreview ? "metadata" : "auto";
        video.setAttribute("playsinline", "true");
        if (initiallyActive) {
            const play = () => video.play().catch(() => {});
            video.addEventListener("loadeddata", play, { once: true });
            requestAnimationFrame(play);
        }
        wrapper.appendChild(video);
    } else {
        const image = document.createElement("img");
        image.className = "slide-background-image";
        image.src = normalized.content;
        image.style.setProperty("object-fit", normalized.fit || "cover", "important");
        image.alt = "";
        image.draggable = false;
        wrapper.appendChild(image);
    }
    return wrapper;
}

function getActiveSlideMediaIndex() {
    if (typeof Reveal !== "undefined" && typeof Reveal.getIndices === "function") {
        const indices = Reveal.getIndices();
        if (Number.isInteger(indices?.h)) return indices.h;
    }
    return currentSlideIndex;
}

function syncActiveSlideMedia() {
    const container = document.getElementById("slides-container");
    if (!container) return;
    const activeIndex = getActiveSlideMediaIndex();
    const pageActive = document.visibilityState !== "hidden" && document.hasFocus();
    Array.from(container.children).forEach((section, index) => {
        const isActive = pageActive && index === activeIndex;
        section.toggleAttribute("data-media-active", isActive);

        section.querySelectorAll("video").forEach(video => {
            if (!isActive) {
                if (!video.paused) video.pause();
                return;
            }
            const shouldAutoPlay = video.autoplay || video.classList.contains("slide-background-video");
            if (shouldAutoPlay) video.play().catch(() => {});
        });

        section.querySelectorAll("iframe").forEach(iframe => {
            const src = String(iframe.getAttribute("src") || "");
            const isMolecule = iframe.classList.contains("molecule-embed-frame");
            if (isMolecule) {
                iframe.contentWindow?.postMessage({ type: "pptmaker:molecule:lifecycle", active: isActive }, "*");
                return;
            }
            if (/youtube(?:-nocookie)?\.com\/embed\//i.test(src)) {
                iframe.contentWindow?.postMessage(
                    JSON.stringify({ event: "command", func: isActive && iframe.dataset.autoplay === "true" ? "playVideo" : "pauseVideo", args: [] }),
                    "*",
                );
            } else if (/player\.vimeo\.com\/video\//i.test(src)) {
                iframe.contentWindow?.postMessage({ method: isActive && iframe.dataset.autoplay === "true" ? "play" : "pause" }, "*");
            }
        });
    });
}

function setMediaIframePermissions(iframe, value) {
    if (!iframe || /firefox/i.test(navigator.userAgent || "")) return;
    iframe.setAttribute("allow", value);
}

function findMoleculeElementDataById(elementId) {
    if (!elementId) return null;
    for (const slide of state.slides || []) {
        const element = (slide.elements || []).find(item => item?.id === elementId && item.type === "molecule");
        if (element) return element;
    }
    return null;
}

function updateMoleculeViewStateInState(elementId, viewState, { autosave = false } = {}) {
    const normalized = typeof normalizeMoleculeViewState === "function" ? normalizeMoleculeViewState(viewState) : null;
    if (!elementId || !normalized) return false;
    const element = findMoleculeElementDataById(elementId);
    if (!element) return false;
    const previous = JSON.stringify(element.moleculeViewState || null);
    const next = JSON.stringify(normalized);
    if (previous === next) return false;
    element.moleculeViewState = normalized;
    if (autosave && typeof schedulePresentationAutosave === "function") {
        schedulePresentationAutosave(900);
    }
    return true;
}

function requestMoleculeIframeViewState(iframe, timeoutMs = 350) {
    return new Promise(resolve => {
        if (!iframe?.contentWindow) {
            resolve(null);
            return;
        }
        const requestId = `mol_view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        const timeout = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            resolve(null);
        }, timeoutMs);
        function onMessage(event) {
            const message = event.data || {};
            if (event.source !== iframe.contentWindow) return;
            if (!message || message.type !== "pptmaker:molecule:view-state-response" || message.requestId !== requestId) return;
            window.clearTimeout(timeout);
            window.removeEventListener("message", onMessage);
            resolve(message.viewState || null);
        }
        window.addEventListener("message", onMessage);
        iframe.contentWindow.postMessage({ type: "pptmaker:molecule:view-state-request", requestId }, "*");
    });
}

async function syncMoleculeViewStatesFromDom() {
    const frames = Array.from(document.querySelectorAll(".canvas-element[data-type='molecule'] .molecule-embed-frame"));
    if (!frames.length) return false;
    let changed = false;
    await Promise.all(frames.map(async iframe => {
        const elementId = iframe.closest(".canvas-element")?.id || "";
        const viewState = await requestMoleculeIframeViewState(iframe);
        if (updateMoleculeViewStateInState(elementId, viewState)) changed = true;
    }));
    return changed;
}

window.addEventListener("message", event => {
    const message = event.data || {};
    if (!message || message.type !== "pptmaker:molecule:view-state-changed") return;
    updateMoleculeViewStateInState(message.elementId, message.viewState, { autosave: true });
});

document.addEventListener("visibilitychange", () => requestAnimationFrame(syncActiveSlideMedia));
window.addEventListener("focus", () => requestAnimationFrame(syncActiveSlideMedia));
window.addEventListener("blur", () => requestAnimationFrame(syncActiveSlideMedia));

function reorderSlides(fromIndex, toIndex) {
    const slides = state.slides || [];
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
    if (fromIndex < 0 || fromIndex >= slides.length) return;
    if (toIndex < 0) toIndex = 0;
    if (toIndex > slides.length) toIndex = slides.length;
    if (fromIndex === toIndex || fromIndex + 1 === toIndex) return;

    const activeSlideId = state.slides[currentSlideIndex]?.id;
    const [moved] = state.slides.splice(fromIndex, 1);
    const insertionIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    state.slides.splice(insertionIndex, 0, moved);

    const nextActiveIndex = state.slides.findIndex(slide => slide.id === activeSlideId);
    if (nextActiveIndex >= 0) {
        setCurrentSlideIndex(nextActiveIndex);
    }
}

function clearSlidePreviewDropState(container = document.getElementById("slide-previews")) {
    _slidePreviewDropMarker = null;
    if (!container) return;
    container.querySelectorAll(".slide-preview-card").forEach(card => {
        card.classList.remove("dragging", "drop-before", "drop-after");
    });
    if (_draggedSlidePreviewIndex != null) {
        container.querySelector(`.slide-preview-card[data-slide-index="${_draggedSlidePreviewIndex}"]`)?.classList.add("dragging");
    }
}

function normalizeConnectorType(connectorType = "line") {
    return connectorType === "curve" || connectorType === "poly" ? connectorType : "line";
}

function normalizeConnectorHead(head = "none") {
    return ["none", "arrow", "triangle", "chevron", "line", "dot", "diamond", "square"].includes(head) ? head : "none";
}

function getConnectorPoints(elData) {
    const fallback =
        normalizeConnectorType(elData?.connectorType) === "curve"
            ? [
                  { x: 24, y: 96 },
                  { x: 140, y: 24 },
                  { x: 256, y: 96 },
              ]
            : normalizeConnectorType(elData?.connectorType) === "poly"
              ? [
                    { x: 24, y: 110 },
                    { x: 140, y: 110 },
                    { x: 140, y: 36 },
                    { x: 256, y: 36 },
                ]
              : [
                    { x: 24, y: 96 },
                    { x: 256, y: 36 },
                ];
    const points = Array.isArray(elData?.points) ? elData.points : fallback;
    const normalized = points
        .map(point => ({
            x: Number(point?.x),
            y: Number(point?.y),
        }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    return normalized.length >= 2 ? normalized : fallback;
}

function normalizeConnectorGeometry(elData, absolutePoints = null) {
    if (!elData || elData.type !== "connector") return;
    const strokeWidth = Math.max(1, Number(elData.styles?.strokeWidth) || 4);
    const padding = Math.max(28, strokeWidth * 4 + 12);
    const baseX = Number(elData.x) || 0;
    const baseY = Number(elData.y) || 0;
    const absPoints = (absolutePoints || getConnectorPoints(elData).map(point => ({ x: baseX + point.x, y: baseY + point.y }))).map(
        point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }),
    );

    const minX = Math.min(...absPoints.map(point => point.x));
    const minY = Math.min(...absPoints.map(point => point.y));
    const maxX = Math.max(...absPoints.map(point => point.x));
    const maxY = Math.max(...absPoints.map(point => point.y));

    elData.x = Math.round(minX - padding);
    elData.y = Math.round(minY - padding);
    elData.width = `${Math.max(60, Math.round(maxX - minX + padding * 2))}px`;
    elData.height = `${Math.max(60, Math.round(maxY - minY + padding * 2))}px`;
    elData.points = absPoints.map(point => ({
        x: Math.round(point.x - elData.x),
        y: Math.round(point.y - elData.y),
    }));
    elData.connectorType = normalizeConnectorType(elData.connectorType);
    elData.connectorStart = normalizeConnectorHead(elData.connectorStart);
    elData.connectorEnd = normalizeConnectorHead(elData.connectorEnd || "arrow");
}

function buildConnectorPath(elData, startAdj = 0, endAdj = 0) {
    const rawPts = getConnectorPoints(elData);
    const pts = rawPts.map(p => ({ x: p.x, y: p.y }));
    const n = pts.length;
    if (startAdj > 0 && n >= 2) {
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy);
        if (len > startAdj) { pts[0].x += (dx / len) * startAdj; pts[0].y += (dy / len) * startAdj; }
    }
    if (endAdj > 0 && n >= 2) {
        const dx = pts[n - 1].x - pts[n - 2].x;
        const dy = pts[n - 1].y - pts[n - 2].y;
        const len = Math.hypot(dx, dy);
        if (len > endAdj) { pts[n - 1].x -= (dx / len) * endAdj; pts[n - 1].y -= (dy / len) * endAdj; }
    }
    if (normalizeConnectorType(elData.connectorType) === "poly") {
        return `M ${pts.map(p => `${p.x} ${p.y}`).join(" L ")}`;
    }
    if (normalizeConnectorType(elData.connectorType) === "curve" && pts.length > 2) {
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length - 1; i += 1) {
            const next = pts[i + 1];
            const midX = (pts[i].x + next.x) / 2;
            const midY = (pts[i].y + next.y) / 2;
            path += ` Q ${pts[i].x} ${pts[i].y} ${midX} ${midY}`;
        }
        const last = pts[pts.length - 1];
        path += ` T ${last.x} ${last.y}`;
        return path;
    }
    return `M ${pts[0].x} ${pts[0].y} L ${pts[n - 1].x} ${pts[n - 1].y}`;
}

function _arrowheadLineAdjust(head, hw, hl) {
    if (head === "none" || head === "line") return 0;
    if (head === "dot" || head === "square") return hw;
    return hl;
}

function _buildArrowheadEl(tipX, tipY, nx, ny, hw, hl, head, color, strokeWidth) {
    if (head === "none") return null;
    const px = -ny;
    const py = nx;
    const bx = tipX - nx * hl;
    const by = tipY - ny * hl;
    const ns = "http://www.w3.org/2000/svg";

    if (head === "arrow" || head === "triangle") {
        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", `M ${bx + px * hw} ${by + py * hw} L ${tipX} ${tipY} L ${bx - px * hw} ${by - py * hw} Z`);
        el.setAttribute("fill", color);
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-linejoin", "round");
        return el;
    }
    if (head === "chevron") {
        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", `M ${bx + px * hw} ${by + py * hw} L ${tipX} ${tipY} L ${bx - px * hw} ${by - py * hw}`);
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", String(strokeWidth));
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        return el;
    }
    if (head === "line") {
        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", `M ${tipX + px * hw} ${tipY + py * hw} L ${tipX - px * hw} ${tipY - py * hw}`);
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", String(strokeWidth));
        el.setAttribute("stroke-linecap", "round");
        return el;
    }
    if (head === "dot") {
        const el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", String(tipX - nx * hw));
        el.setAttribute("cy", String(tipY - ny * hw));
        el.setAttribute("r", String(hw));
        el.setAttribute("fill", color);
        return el;
    }
    if (head === "diamond") {
        const mx = bx + (hl / 2) * nx;
        const my = by + (hl / 2) * ny;
        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", `M ${tipX} ${tipY} L ${mx + px * hw} ${my + py * hw} L ${bx} ${by} L ${mx - px * hw} ${my - py * hw} Z`);
        el.setAttribute("fill", color);
        el.setAttribute("stroke-linejoin", "round");
        return el;
    }
    if (head === "square") {
        const cx = tipX - nx * hw;
        const cy = tipY - ny * hw;
        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", `M ${cx + px * hw + nx * hw} ${cy + py * hw + ny * hw} L ${cx + px * hw - nx * hw} ${cy + py * hw - ny * hw} L ${cx - px * hw - nx * hw} ${cy - py * hw - ny * hw} L ${cx - px * hw + nx * hw} ${cy - py * hw + ny * hw} Z`);
        el.setAttribute("fill", color);
        el.setAttribute("stroke-linejoin", "round");
        return el;
    }
    return null;
}

function renderConnectorContent(el, elData, { interactive = false } = {}) {
    normalizeConnectorGeometry(elData);
    el.innerHTML = "";
    const points = getConnectorPoints(elData);
    const width = parseFloat(elData.width) || 280;
    const height = parseFloat(elData.height) || 140;
    const stroke = elData.styles?.color || "#2563eb";
    const strokeWidth = Math.max(1, Number(elData.styles?.strokeWidth) || 4);
    const startHead = normalizeConnectorHead(elData.connectorStart);
    const endHead = normalizeConnectorHead(elData.connectorEnd || "arrow");
    const hw = Math.max(2, (Number(elData.connectorHeadWidth) || 14) / 2);
    const hl = Math.max(2, Number(elData.connectorHeadLength) || 14);

    const n = points.length;
    function unitDir(ax, ay, bx, by) {
        const len = Math.hypot(bx - ax, by - ay);
        return len < 0.001 ? { x: 1, y: 0 } : { x: (bx - ax) / len, y: (by - ay) / len };
    }
    const endDir = unitDir(points[n - 2].x, points[n - 2].y, points[n - 1].x, points[n - 1].y);
    const startDir = unitDir(points[1].x, points[1].y, points[0].x, points[0].y);

    const startAdj = _arrowheadLineAdjust(startHead, hw, hl);
    const endAdj = _arrowheadLineAdjust(endHead, hw, hl);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.classList.add("connector-svg");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", buildConnectorPath(elData, startAdj, endAdj));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", String(strokeWidth));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);

    const startEl = _buildArrowheadEl(points[0].x, points[0].y, startDir.x, startDir.y, hw, hl, startHead, stroke, strokeWidth);
    const endEl = _buildArrowheadEl(points[n - 1].x, points[n - 1].y, endDir.x, endDir.y, hw, hl, endHead, stroke, strokeWidth);
    if (startEl) svg.appendChild(startEl);
    if (endEl) svg.appendChild(endEl);

    el.appendChild(svg);

    if (interactive && !document.body.classList.contains("play-mode-active")) {
        points.forEach((point, index) => {
            const handle = document.createElement("button");
            handle.type = "button";
            handle.className = "connector-point-handle";
            handle.style.left = `${point.x}px`;
            handle.style.top = `${point.y}px`;
            handle.setAttribute("data-index", String(index));
            handle.addEventListener("mousedown", startConnectorPointDrag);
            el.appendChild(handle);
        });
    }
}

function syncConnectorDom(connectorId) {
    const elData = state.slides[currentSlideIndex]?.elements?.find(item => item.id === connectorId && item.type === "connector");
    const dom = document.getElementById(connectorId);
    if (!elData || !dom) return;
    normalizeConnectorGeometry(elData);
    dom.style.transform = `translate(${elData.x}px, ${elData.y}px)`;
    dom.setAttribute("data-x", elData.x);
    dom.setAttribute("data-y", elData.y);
    dom.style.width = elData.width;
    dom.style.height = elData.height;
    renderConnectorContent(dom, elData, { interactive: state.selectedIds.includes(connectorId) });
}

function getConnectorSnapPoint(point, connectorId) {
    const threshold = 18;
    const slide = state.slides[currentSlideIndex];
    if (!slide) return point;

    let best = null;

    (slide.elements || []).forEach(el => {
        if (!el || el.id === connectorId || el.type === "connector") return;
        const x = Number(el.x) || 0;
        const y = Number(el.y) || 0;
        const width = parseFloat(el.width) || 0;
        const height = parseFloat(el.height) || 0;
        if (width <= 0 || height <= 0) return;

        const left = x;
        const top = y;
        const right = x + width;
        const bottom = y + height;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const candidates = [
            { x: clamp(point.x, left, right), y: top },
            { x: clamp(point.x, left, right), y: bottom },
            { x: left, y: clamp(point.y, top, bottom) },
            { x: right, y: clamp(point.y, top, bottom) },
        ];

        candidates.forEach(candidate => {
            const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
            if (distance <= threshold && (!best || distance < best.distance)) {
                best = { x: candidate.x, y: candidate.y, distance };
            }
        });
    });

    return best ? { x: best.x, y: best.y } : point;
}

function startConnectorPointDrag(event) {
    if (document.body.classList.contains("play-mode-active")) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const connectorEl = handle?.closest?.(".canvas-element[data-type='connector']");
    if (!connectorEl) return;
    const connectorId = connectorEl.id;
    const pointIndex = Number(handle.getAttribute("data-index"));
    const connectorData = state.slides[currentSlideIndex].elements.find(item => item.id === connectorId);
    if (!connectorData) return;
    const slide = connectorEl.closest(".presentation-slide");
    if (!slide) return;
    const scale = getCanvasScale();
    const slideRect = slide.getBoundingClientRect();
    const absolutePoints = getConnectorPoints(connectorData).map(point => ({
        x: (Number(connectorData.x) || 0) + point.x,
        y: (Number(connectorData.y) || 0) + point.y,
    }));

    saveStateToUndo();
    selectElement(connectorId, "replace");

    const onMove = moveEvent => {
        const slideX = (moveEvent.clientX - slideRect.left) / scale;
        const slideY = (moveEvent.clientY - slideRect.top) / scale;
        const maybeSnapped =
            pointIndex === 0 || pointIndex === absolutePoints.length - 1
                ? getConnectorSnapPoint({ x: slideX, y: slideY }, connectorId)
                : { x: slideX, y: slideY };
        absolutePoints[pointIndex] = maybeSnapped;
        normalizeConnectorGeometry(connectorData, absolutePoints);
        updateElementState(connectorId, {
            x: connectorData.x,
            y: connectorData.y,
            width: connectorData.width,
            height: connectorData.height,
            points: connectorData.points,
        });
        syncConnectorDom(connectorId);
        updateGroupBound();
    };

    const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        buildPropertiesPanel();
        renderSlidePreviews(currentSlideIndex);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
}

function isBlockArrowShape(shapeType = "") {
    return ["arrow-right", "arrow-left", "arrow-up", "arrow-down"].includes(shapeType);
}

function _clampShapePercent(value, fallback, min, max) {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(min, Math.min(max, next));
}

function getShapeStyle(shape = "rectangle") {
    const shapeType = typeof shape === "string" ? shape : shape?.shapeType || "rectangle";
    const arrowHeadSize = _clampShapePercent(typeof shape === "string" ? undefined : shape?.arrowHeadSize, 38, 12, 80);
    const arrowShaftSize = _clampShapePercent(typeof shape === "string" ? undefined : shape?.arrowShaftSize, 36, 12, 90);
    const shaftStart = (100 - arrowShaftSize) / 2;
    const shaftEnd = 100 - shaftStart;
    const headStart = 100 - arrowHeadSize;
    const headEnd = arrowHeadSize;
    switch (shapeType) {
        case "triangle":
            return { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: "0px" };
        case "diamond":
            return { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", borderRadius: "0px" };
        case "hexagon":
            return { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)", borderRadius: "0px" };
        case "parallelogram":
            return { clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)", borderRadius: "0px" };
        case "arrow-right":
            return { clipPath: `polygon(0% ${shaftStart}%, ${headStart}% ${shaftStart}%, ${headStart}% 0%, 100% 50%, ${headStart}% 100%, ${headStart}% ${shaftEnd}%, 0% ${shaftEnd}%)`, borderRadius: "0px" };
        case "arrow-left":
            return { clipPath: `polygon(${headEnd}% 0%, ${headEnd}% ${shaftStart}%, 100% ${shaftStart}%, 100% ${shaftEnd}%, ${headEnd}% ${shaftEnd}%, ${headEnd}% 100%, 0% 50%)`, borderRadius: "0px" };
        case "arrow-up":
            return { clipPath: `polygon(50% 0%, 100% ${headEnd}%, ${shaftEnd}% ${headEnd}%, ${shaftEnd}% 100%, ${shaftStart}% 100%, ${shaftStart}% ${headEnd}%, 0% ${headEnd}%)`, borderRadius: "0px" };
        case "arrow-down":
            return { clipPath: `polygon(${shaftStart}% 0%, ${shaftEnd}% 0%, ${shaftEnd}% ${headStart}%, 100% ${headStart}%, 50% 100%, 0% ${headStart}%, ${shaftStart}% ${headStart}%)`, borderRadius: "0px" };
        case "circle":
            return { clipPath: "none", borderRadius: "9999px" };
        default:
            return { clipPath: "none", borderRadius: typeof shape === "string" ? "0px" : shape?.styles?.borderRadius || "0px" };
    }
}

// ─── Slide Rendering ────────────────────────────────────────────────────────

function renderSlidesFromState() {
    const container = document.getElementById("slides-container");
    const theme = getPresentationTheme();
    const slideConfig = getPresentationPageSetupConfig();
    const slideWidth = Number(slideConfig.width) || 1024;
    const slideHeight = Number(slideConfig.height) || 768;
    container.innerHTML = "";
    state.slides.forEach((slide, slideIndex) => {
        const section = document.createElement("section");
        section.id = slide.id;
        section.classList.add("presentation-slide");
        section.dataset.slideIndex = String(slideIndex);
        section.style.width = `${slideWidth}px`;
        section.style.height = `${slideHeight}px`;
        section.style.color = theme.defaultTextColor;
        section.style.fontFamily = theme.bodyFont;
        const bgNode = createSlideBackgroundNode(slide.background, { slideIndex });
        if (bgNode) section.appendChild(bgNode);
        slide.elements.forEach(elData => section.appendChild(createElementNode(elData, { slideIndex })));
        container.appendChild(section);
    });
    if (Reveal.isReady()) {
        Reveal.sync();
        const safeIndex = Math.max(0, Math.min(currentSlideIndex, state.slides.length - 1));
        Reveal.slide(safeIndex, 0, 0);
        Reveal.layout();
    }
    if (document.body.classList.contains("play-mode-active") && typeof _resizePresentationChalkboard === "function") {
        requestAnimationFrame(() => _resizePresentationChalkboard());
    }
    requestAnimationFrame(syncActiveSlideMedia);
    const nextPreviewSignature = getSlidePreviewStructureSignature();
    if (_slidePreviewStructureSignature === nextPreviewSignature) {
        renderSlidePreviews(currentSlideIndex);
    } else {
        renderSlidePreviews(null, { preserveScroll: true });
    }
    if (typeof schedulePresentationAutosave === "function") {
        schedulePresentationAutosave();
    }
    if (typeof renderLayersList === "function") {
        renderLayersList();
    }
}

function renderSlidePreviews(targetIndex = null, options = {}) {
    const container = document.getElementById("slide-previews");
    const theme = getPresentationTheme();
    const slideConfig = getPresentationPageSetupConfig();
    const slideWidth = Number(slideConfig.width) || 1024;
    const slideHeight = Number(slideConfig.height) || 768;
    if (!container) return;

    if (targetIndex !== null) {
        // Update only one specific slide thumbnail
        const card = container.querySelector(`.slide-preview-card[data-slide-index="${targetIndex}"]`);
        if (!card) return;
        
        const slide = state.slides[targetIndex];
        const thumbnail = card.querySelector(".slide-thumbnail");
        if (!thumbnail || !slide) return;

        const previewSlide = document.createElement("div");
        const previewBg = getComputedStyle(document.documentElement).getPropertyValue("--slide-bg").trim() || theme.cssVars["--slide-bg"];
        previewSlide.style.cssText = `width:${slideWidth}px;height:${slideHeight}px;position:relative;transform-origin:top left;background:${previewBg};color:${theme.defaultTextColor};font-family:${theme.bodyFont};`;
        
        const previewBgNode = createSlideBackgroundNode(slide.background, { forPreview: true });
        if (previewBgNode) previewSlide.appendChild(previewBgNode);
        slide.elements.forEach(elData => previewSlide.appendChild(_createStaticNode(elData)));
        
        const scale = thumbnail.clientWidth / slideWidth;
        previewSlide.style.transform = `scale(${scale || 1})`;

        // Surgical replacement to avoid "abrupt" resets
        const existing = thumbnail.firstElementChild;
        if (existing) {
            thumbnail.replaceChild(previewSlide, existing);
        } else {
            thumbnail.appendChild(previewSlide);
        }
        return;
    }

    const previousScrollTop = container.scrollTop;
    const shouldPreserveScroll = options.preserveScroll !== false;
    const shouldScrollActive = options.scrollActive === true || !_slidePreviewStructureSignature;

    container.innerHTML = "";
    container.ondragover = e => e.preventDefault();
    container.ondrop = e => {
        e.preventDefault();
        if (_draggedSlidePreviewIndex == null) return;
        reorderSlides(_draggedSlidePreviewIndex, state.slides.length);
        _draggedSlidePreviewIndex = null;
        clearSlidePreviewDropState(container);
        renderSlidesFromState();
    };
    container.ondragleave = e => {
        if (e.target === container) clearSlidePreviewDropState(container);
    };
    state.slides.forEach((slide, index) => {
        const card = document.createElement("div");
        card.className = `slide-preview-card ${index === currentSlideIndex ? "active" : ""}`;
        card.dataset.slideIndex = String(index);
        card.style.aspectRatio = `${slideWidth} / ${slideHeight}`;
        card.onclick = () => {
            if (Date.now() < _suppressSlidePreviewClickUntil) return;
            setCurrentSlideIndex(index);
            Reveal.slide(index);
        };
        card.draggable = true;
        card.addEventListener("dragstart", e => {
            _draggedSlidePreviewIndex = index;
            _suppressSlidePreviewClickUntil = Date.now() + 250;
            card.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(index));
            }
        });
        card.addEventListener("dragend", () => {
            _suppressSlidePreviewClickUntil = Date.now() + 250;
            _draggedSlidePreviewIndex = null;
            clearSlidePreviewDropState(container);
        });
        card.addEventListener("dragover", e => {
            e.preventDefault();
            if (_draggedSlidePreviewIndex == null || _draggedSlidePreviewIndex === index) return;
            const rect = card.getBoundingClientRect();
            const dropAfter = e.clientY > rect.top + rect.height / 2;
            _slidePreviewDropMarker = { index, dropAfter };
            clearSlidePreviewDropState(container);
            card.classList.add(dropAfter ? "drop-after" : "drop-before");
            if (_draggedSlidePreviewIndex === index) {
                card.classList.add("dragging");
            }
        });
        card.addEventListener("drop", e => {
            e.preventDefault();
            if (_draggedSlidePreviewIndex == null) return;
            const rect = card.getBoundingClientRect();
            const dropAfter = e.clientY > rect.top + rect.height / 2;
            reorderSlides(_draggedSlidePreviewIndex, dropAfter ? index + 1 : index);
            _draggedSlidePreviewIndex = null;
            clearSlidePreviewDropState(container);
            renderSlidesFromState();
        });

        const thumbnail = document.createElement("div");
        thumbnail.className = "slide-thumbnail";
        const previewSlide = document.createElement("div");
        const previewBg =
            getComputedStyle(document.documentElement).getPropertyValue("--slide-bg").trim() || theme.cssVars["--slide-bg"];
        previewSlide.style.cssText = `width:${slideWidth}px;height:${slideHeight}px;position:relative;transform-origin:top left;background:${previewBg};color:${theme.defaultTextColor};font-family:${theme.bodyFont};`;
        const previewBgNode = createSlideBackgroundNode(slide.background, { forPreview: true });
        if (previewBgNode) previewSlide.appendChild(previewBgNode);
        slide.elements.forEach(elData => previewSlide.appendChild(_createStaticNode(elData)));
        thumbnail.appendChild(previewSlide);
        card.appendChild(thumbnail);

        const num = document.createElement("div");
        num.className = "slide-number";
        num.innerText = index + 1;
        card.appendChild(num);

        const actions = document.createElement("div");
        actions.className = "absolute top-2 right-2 flex items-center gap-1 z-10";

        const duplicateBtn = document.createElement("button");
        duplicateBtn.type = "button";
        duplicateBtn.className = "w-7 h-7 rounded-md bg-white/90 border border-slate-200 text-sky-600 shadow-sm hover:bg-sky-50";
        duplicateBtn.title = "Duplicate slide";
        duplicateBtn.innerHTML = '<i class="fa-regular fa-clone text-[11px]"></i>';
        duplicateBtn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            duplicateCurrentSlide(index);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "w-7 h-7 rounded-md bg-white/90 border border-slate-200 text-rose-500 shadow-sm hover:bg-rose-50";
        deleteBtn.title = "Delete slide";
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can text-[11px]"></i>';
        deleteBtn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            deleteCurrentSlide(index);
        });

        actions.appendChild(duplicateBtn);
        actions.appendChild(deleteBtn);
        card.appendChild(actions);
        container.appendChild(card);
        const scale = thumbnail.clientWidth / slideWidth;
        previewSlide.style.transform = `scale(${scale || 1})`;
    });

    _slidePreviewStructureSignature = getSlidePreviewStructureSignature();

    if (shouldPreserveScroll) {
        requestAnimationFrame(() => {
            container.scrollTop = previousScrollTop;
        });
    } else if (shouldScrollActive) {
        setTimeout(() => {
            const activeCard = container.querySelector(".slide-preview-card.active");
            if (activeCard) {
                activeCard.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        }, 0);
    }
    if (shouldPreserveScroll && shouldScrollActive) {
        setTimeout(() => {
            if (container.scrollTop === previousScrollTop) return;
            container.scrollTop = previousScrollTop;
        }, 0);
    }
}

function refreshActiveSlidePreview() {
    const targetIndex = Math.max(0, Math.min(currentSlideIndex || 0, (state.slides || []).length - 1));
    const nextPreviewSignature = getSlidePreviewStructureSignature();
    if (_slidePreviewStructureSignature === nextPreviewSignature) {
        renderSlidePreviews(targetIndex);
    } else {
        renderSlidePreviews(null, { preserveScroll: true });
    }
}

function updateActiveSlidePreview(index) {
    const container = document.getElementById("slide-previews");
    if (!container) return;
    
    container.querySelectorAll(".slide-preview-card").forEach((card, i) => {
        const isActive = i === index;
        card.classList.toggle("active", isActive);
        if (isActive) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

function _applyStylesToElement(el, styles) {
    if (!styles) return;
    const textProps = ["color", "fontSize", "fontFamily", "fontWeight", "fontStyle", "textAlign", "lineHeight", "textShadow"];
    Object.entries(styles).forEach(([prop, value]) => {
        if (value === undefined || value === null) return;
        if (prop === "textStrokeWidth") {
            if (String(value) === "0" || String(value) === "0px") {
                el.style.removeProperty("-webkit-text-stroke-width");
            } else {
                el.style.setProperty("-webkit-text-stroke-width", value, "important");
            }
            return;
        }
        if (prop === "textStrokeColor") {
            if (!value || value === "transparent") {
                el.style.removeProperty("-webkit-text-stroke-color");
            } else {
                el.style.setProperty("-webkit-text-stroke-color", value, "important");
            }
            return;
        }
        const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        const priority = textProps.includes(prop) ? "important" : "";
        el.style.setProperty(cssProp, value, priority);
    });
}

function _getTableCellDisplayStyles(tableData, rowIndex, colIndex, cellStyles = {}) {
    const isHeader = tableData.headerRow && rowIndex === 0;
    const zebraFill = tableData.zebra && !isHeader && rowIndex % 2 === 1 ? tableData.altFill : tableData.bodyFill;
    return {
        backgroundColor: cellStyles.backgroundColor || (isHeader ? tableData.headerFill : zebraFill),
        color: cellStyles.color || (isHeader ? tableData.headerTextColor : tableData.textColor),
        fontFamily: cellStyles.fontFamily || tableData.fontFamily || '"Manrope", sans-serif',
        fontSize: cellStyles.fontSize || tableData.fontSize || "16px",
        fontStyle: cellStyles.fontStyle || tableData.fontStyle || "normal",
        textAlign: cellStyles.textAlign || tableData.textAlign || "left",
        fontWeight: cellStyles.fontWeight || (isHeader ? "700" : tableData.fontWeight || "400"),
    };
}

function _renderTableDom(container, elData, { interactive = true } = {}) {
    const tableData = normalizeTableData(elData.tableData);
    elData.tableData = tableData;
    container.innerHTML = "";

    const beginTableCellEdit = (cell, rowIndex, colIndex) => {
        if (!interactive || document.body.classList.contains("play-mode-active")) return;
        const host = container.closest(".canvas-element");
        setSelectedTablePart?.(elData.id, { type: "cell", row: rowIndex, col: colIndex });
        cell.dataset.previousText = cell.innerText.replace(/\r/g, "");
        cell.contentEditable = "true";
        cell.spellcheck = true;
        host?.classList.add("editing-table");
        if (host) {
            interact(host).draggable(false);
            interact(host).resizable(false);
        }
        requestAnimationFrame(() => {
            const range = document.createRange();
            range.selectNodeContents(cell);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            cell.focus();
        });
    };

    const commitTableCellEdit = (cell, rowIndex, colIndex, { revert = false } = {}) => {
        if (!cell.isContentEditable) return;
        const host = container.closest(".canvas-element");
        const nextTableData = normalizeTableData(elData.tableData);
        const previousText = nextTableData.cells[rowIndex][colIndex]?.text || "";
        const nextText = revert ? cell.dataset.previousText || previousText : cell.innerText.replace(/\r/g, "");

        if (nextText !== previousText) {
            saveStateToUndo();
            nextTableData.cells[rowIndex][colIndex].text = nextText;
            updateElementState(elData.id, { tableData: nextTableData });
            elData.tableData = nextTableData;
        }

        cell.textContent = nextText;
        cell.contentEditable = "false";
        delete cell.dataset.previousText;
        host?.classList.remove("editing-table");
        if (host) {
            interact(host).draggable(true);
            interact(host).resizable(true);
        }
        if (typeof schedulePresentationAutosave === "function") {
            schedulePresentationAutosave();
        }
        if (window.refreshPreviews) {
            window.refreshPreviews();
        }
    };

    const shell = document.createElement("div");
    shell.className = "table-element-shell";
    const scroll = document.createElement("div");
    scroll.className = "table-element-scroll";
    const table = document.createElement("table");
    table.className = "table-element-grid";
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.height = "100%";
    table.style.tableLayout = "fixed";
    const colgroup = document.createElement("colgroup");
    tableData.colWidths.forEach(width => {
        const col = document.createElement("col");
        col.style.width = `${Math.max(36, Number(width) || 140)}px`;
        colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    const tbody = document.createElement("tbody");
    for (let rowIndex = 0; rowIndex < tableData.rows; rowIndex += 1) {
        const tr = document.createElement("tr");
        tr.style.height = `${Math.max(24, Number(tableData.rowHeights[rowIndex]) || 44)}px`;
        for (let colIndex = 0; colIndex < tableData.cols; colIndex += 1) {
            const cellData = tableData.cells[rowIndex]?.[colIndex] || { text: "", styles: {} };
            const cell = document.createElement(rowIndex === 0 && tableData.headerRow ? "th" : "td");
            cell.className = "table-element-cell";
            cell.dataset.row = String(rowIndex);
            cell.dataset.col = String(colIndex);
            const selection = tableData.selection;
            const isSelectedCell = selection?.type === "cell" && selection.row === rowIndex && selection.col === colIndex;
            const isSelectedRow = selection?.type === "row" && selection.row === rowIndex;
            const isSelectedCol = selection?.type === "col" && selection.col === colIndex;
            cell.classList.toggle("is-active", isSelectedCell);
            cell.classList.toggle("is-row-selected", isSelectedRow);
            cell.classList.toggle("is-col-selected", isSelectedCol);
            const cellStyles = _getTableCellDisplayStyles(tableData, rowIndex, colIndex, cellData.styles || {});
            cell.style.border = `${tableData.borderWidth}px solid ${tableData.borderColor}`;
            cell.style.padding = `${tableData.cellPadding}px`;
            cell.style.backgroundColor = cellStyles.backgroundColor;
            cell.style.color = cellStyles.color;
            cell.style.fontFamily = cellStyles.fontFamily;
            cell.style.fontSize = cellStyles.fontSize;
            cell.style.fontStyle = cellStyles.fontStyle;
            cell.style.textAlign = cellStyles.textAlign;
            cell.style.fontWeight = cellStyles.fontWeight;
            cell.style.verticalAlign = "top";
            cell.style.whiteSpace = "pre-wrap";
            cell.textContent = cellData.text || "";

            if (interactive) {
                cell.addEventListener("mousedown", e => {
                    if (cell.isContentEditable) {
                        e.stopPropagation();
                    }
                });
                cell.addEventListener("click", e => {
                    if (document.body.classList.contains("play-mode-active")) return;
                    e.stopPropagation();
                    setSelectedTablePart?.(elData.id, { type: "cell", row: rowIndex, col: colIndex });
                });
                cell.addEventListener("dblclick", e => {
                    if (document.body.classList.contains("play-mode-active")) return;
                    e.preventDefault();
                    e.stopPropagation();
                    beginTableCellEdit(cell, rowIndex, colIndex);
                });
                cell.addEventListener("keydown", e => {
                    if (!cell.isContentEditable) return;
                    e.stopPropagation();
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitTableCellEdit(cell, rowIndex, colIndex);
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        commitTableCellEdit(cell, rowIndex, colIndex, { revert: true });
                    }
                });
                cell.addEventListener("blur", () => {
                    commitTableCellEdit(cell, rowIndex, colIndex);
                });
            }

            tr.appendChild(cell);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroll.appendChild(table);
    shell.appendChild(scroll);
    container.appendChild(shell);
    if (interactive) {
        requestAnimationFrame(() => _renderTableSelectionControls(shell, table, elData));
    }
}

function _renderTableSelectionControls(shell, table, elData) {
    if (!shell || !table || !elData) return;
    shell.querySelector(".table-selection-layer")?.remove();
    const tableData = normalizeTableData(elData.tableData);
    const layer = document.createElement("div");
    layer.className = "table-selection-layer";
    const shellRect = shell.getBoundingClientRect();
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const firstRowCells = Array.from(table.querySelectorAll("tbody tr:first-child > th, tbody tr:first-child > td"));

    firstRowCells.forEach((cell, colIndex) => {
        const rect = cell.getBoundingClientRect();
        const left = rect.left - shellRect.left;
        const width = rect.width;
        const selector = document.createElement("button");
        selector.className = "table-col-selector";
        selector.style.left = `${left}px`;
        selector.style.width = `${width}px`;
        selector.title = `Select column ${colIndex + 1}`;
        selector.addEventListener("mousedown", event => event.stopPropagation());
        selector.addEventListener("click", event => {
            event.stopPropagation();
            setSelectedTablePart?.(elData.id, { type: "col", col: colIndex });
        });
        layer.appendChild(selector);

        if (colIndex < firstRowCells.length - 1) {
            const resizer = document.createElement("div");
            resizer.className = "table-col-resizer";
            resizer.style.left = `${left + width}px`;
            resizer.title = "Resize column";
            _bindTableResizeHandle(resizer, "col", colIndex, table, elData);
            layer.appendChild(resizer);
        }
    });

    rows.forEach((row, rowIndex) => {
        const rect = row.getBoundingClientRect();
        const top = rect.top - shellRect.top;
        const height = rect.height;
        const selector = document.createElement("button");
        selector.className = "table-row-selector";
        selector.style.top = `${top}px`;
        selector.style.height = `${height}px`;
        selector.title = `Select row ${rowIndex + 1}`;
        selector.addEventListener("mousedown", event => event.stopPropagation());
        selector.addEventListener("click", event => {
            event.stopPropagation();
            setSelectedTablePart?.(elData.id, { type: "row", row: rowIndex });
        });
        layer.appendChild(selector);

        if (rowIndex < rows.length - 1) {
            const resizer = document.createElement("div");
            resizer.className = "table-row-resizer";
            resizer.style.top = `${top + height}px`;
            resizer.title = "Resize row";
            _bindTableResizeHandle(resizer, "row", rowIndex, table, elData);
            layer.appendChild(resizer);
        }
    });

    shell.appendChild(layer);
}

function _bindTableResizeHandle(handle, axis, index, table, elData) {
    handle.addEventListener("mousedown", event => {
        if (document.body.classList.contains("play-mode-active")) return;
        event.preventDefault();
        event.stopPropagation();
        const tableData = normalizeTableData(elData.tableData);
        const start = axis === "col" ? event.clientX : event.clientY;
        const initial = axis === "col" ? tableData.colWidths[index] : tableData.rowHeights[index];
        const host = table.closest(".canvas-element");
        host?.classList.add("editing-table");
        if (host) {
            interact(host).draggable(false);
            interact(host).resizable(false);
        }

        const onMove = moveEvent => {
            const delta = (axis === "col" ? moveEvent.clientX : moveEvent.clientY) - start;
            const next = Math.max(axis === "col" ? 36 : 24, Math.round(initial + delta));
            if (axis === "col") {
                table.querySelectorAll("col")[index].style.width = `${next}px`;
            } else {
                table.querySelectorAll("tbody tr")[index].style.height = `${next}px`;
            }
        };
        const onUp = upEvent => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            const delta = (axis === "col" ? upEvent.clientX : upEvent.clientY) - start;
            const next = Math.max(axis === "col" ? 36 : 24, Math.round(initial + delta));
            saveStateToUndo();
            const nextTableData = normalizeTableData(elData.tableData);
            if (axis === "col") {
                nextTableData.colWidths[index] = next;
                nextTableData.selection = { type: "col", col: index };
            } else {
                nextTableData.rowHeights[index] = next;
                nextTableData.selection = { type: "row", row: index };
            }
            updateElementState(elData.id, { tableData: nextTableData });
            elData.tableData = nextTableData;
            host?.classList.remove("editing-table");
            if (host) {
                interact(host).draggable(true);
                interact(host).resizable(true);
            }
            renderSlidesFromState?.();
            buildPropertiesPanel?.();
            refreshPreviews?.();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    });
}

function _renderChartDom(container, elData) {
    container.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    if (container._chartInstance) {
        container._chartInstance.destroy();
    }

    try {
        container._chartInstance = new Chart(canvas, {
            type: elData.chartType || 'bar',
            data: elData.chartData,
            options: elData.chartOptions || {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (err) {
        console.error("Chart.js Error:", err);
        container.innerHTML = `<div class="flex items-center justify-center h-full text-xs text-red-400">Chart Error</div>`;
    }
}

function _normalizeRenderCropTransform(elData) {
    if (!elData?.cropTransform) return null;
    const crop =
        typeof normalizeImageCropTransform === "function"
            ? normalizeImageCropTransform(elData.cropTransform)
            : elData.cropTransform;
    if (!crop) return null;
    if (JSON.stringify(crop) !== JSON.stringify(elData.cropTransform)) {
        elData.cropTransform = crop;
        if (elData.id && typeof updateElementState === "function") {
            updateElementState(elData.id, { cropTransform: crop });
        }
    }
    return crop;
}

function _createImageContentNode(elData, { interactive = false } = {}) {
    const crop = _normalizeRenderCropTransform(elData);
    if (crop) {
        const wrapper = document.createElement("div");
        wrapper.className = "w-full h-full rounded-[inherit]";
        wrapper.style.overflow = "hidden";
        wrapper.style.position = "relative";

        const img = document.createElement("img");
        img.src = elData.content;
        img.className = "pointer-events-none";
        img.draggable = false;
        img.style.position = "absolute";
        img.style.left = `${crop.leftPercent}%`;
        img.style.top = `${crop.topPercent}%`;
        img.style.width = `${crop.widthPercent}%`;
        img.style.height = `${crop.heightPercent}%`;
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";
        img.style.objectFit = "fill";
        img.style.display = "block";
        img.style.setProperty("margin", "0", "important");
        wrapper.appendChild(img);
        return wrapper;
    }

    const img = document.createElement("img");
    img.src = elData.content;
    img.className = interactive
        ? "w-full h-full object-cover rounded-[inherit] pointer-events-none"
        : "w-full h-full object-cover rounded-[inherit]";
    img.draggable = false;
    img.style.display = "block";
    img.style.setProperty("margin", "0", "important");
    return img;
}

function _createStaticNode(elData) {
    const el = document.createElement("div");
    el.className = "canvas-element";
    el.setAttribute("data-type", elData.type);
    el.style.position = "absolute";
    el.style.transform = `translate(${elData.x}px, ${elData.y}px)`;
    if (elData.width) el.style.width = elData.width;
    if (elData.height) el.style.height = elData.height;
    _applyStylesToElement(el, elData.styles);
    if (elData.type === "text") {
        el.dataset.autoHeight = elData.autoHeight === false ? "false" : "true";
        el.dataset.textFitMode = elData.textFitMode || (elData.autoHeight === false ? "fixed" : "autoHeight");
        const contentHost = document.createElement("div");
        contentHost.className = "text-element-content";
        contentHost.innerHTML = renderTextContent(elData);
        el.appendChild(contentHost);
        requestAnimationFrame(() => syncTextBoxLayout(el, elData));
    } else if (elData.type === "connector") {
        renderConnectorContent(el, elData, { interactive: false });
    } else if (elData.type === "image") {
        el.appendChild(_createImageContentNode(elData, { interactive: false }));
    } else if (elData.type === "table") {
        _renderTableDom(el, elData, { interactive: false });
    } else if (elData.type === "chart") {
        _renderChartDom(el, elData);
    } else if (elData.type === "html") {
        const chip = document.createElement("div");
        chip.innerText = normalizeHtmlMode(elData) === "autofit" ? "HTML AUTOFIT" : "HTML LIVE";
        chip.style.cssText =
            "position:absolute;top:4px;left:4px;padding:2px 6px;font-size:10px;border-radius:4px;background:#111827;color:#cbd5e1;z-index:2;";
        const frame = document.createElement("iframe");
        frame.srcdoc = buildHtmlEmbedSrcdoc(elData.content || "", elData);
        applyHtmlEmbedSandbox(frame);
        frame.className = "w-full h-full html-embed-frame";
        frame.style.border = "0";
        frame.style.pointerEvents = "none";
        el.appendChild(frame);
        el.appendChild(chip);
    } else if (elData.type === "shape") {
        const visual = getShapeStyle(elData);
        el.style.clipPath = visual.clipPath;
        if (!elData.styles?.borderRadius) {
            el.style.borderRadius = visual.borderRadius;
        }
    }
    return el;
}

// ─── Interactive Element Node ────────────────────────────────────────────────

function createElementNode(elData, options = {}) {
    const el = document.createElement("div");
    const animation = normalizeElementAnimation(elData);
    el.id = elData.id;
    el.className = "canvas-element";
    el.setAttribute("data-id", elData.id);
    el.setAttribute("data-type", elData.type);
    el.style.transform = `translate(${elData.x}px, ${elData.y}px)`;
    el.setAttribute("data-x", elData.x);
    el.setAttribute("data-y", elData.y);
    if (elData.width) el.style.width = elData.width;
    if (elData.height) el.style.height = elData.height;
    if (elData.type === "text") {
        el.dataset.autoHeight = elData.autoHeight === false ? "false" : "true";
        el.dataset.textFitMode = elData.textFitMode || (elData.autoHeight === false ? "fixed" : "autoHeight");
    }
    _applyStylesToElement(el, elData.styles);

    if (elData.hidden) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
    }

    // ── Fragment animations (Reveal.js) ──────────────────────────────────
    const isPlayMode = document.body.classList.contains("play-mode-active");

    if (elData.fragmentAnimation && elData.fragmentAnimation !== "none") {
        if (!RENDER_REVEAL_FRAGMENT_CLASSES.includes(elData.fragmentAnimation)) {
            elData.fragmentAnimation = "none";
            elData.fragmentIndex = null;
        }
    }

    if (isPlayMode && elData.fragmentAnimation && elData.fragmentAnimation !== "none" && !_shouldAnimateBulletsIndividually(elData)) {
        el.classList.add("fragment", elData.fragmentAnimation);
        if (elData.fragmentIndex != null) {
            el.setAttribute("data-fragment-index", elData.fragmentIndex);
        }
    }

    if (elData.fragmentAnimation && elData.fragmentAnimation !== "none") {
        const badge = document.createElement("div");
        badge.className = "anim-badge";
        badge.innerHTML = `<i class="fa-solid fa-wand-sparkles"></i> ${elData.fragmentIndex ?? 0}`;
        el.appendChild(badge);
    } else if (animation) {
        const badge = document.createElement("div");
        badge.className = "anim-badge";
        badge.innerHTML = `<i class="fa-solid fa-bolt"></i> ${animation.trigger === "on-click" ? `#${animation.order}` : "Slide"}`;
        el.appendChild(badge);
    }

    _applyTypeContent(el, elData, options);
    if (elData.type === "connector") {
        el.style.transform = `translate(${elData.x}px, ${elData.y}px)`;
        el.setAttribute("data-x", elData.x);
        el.setAttribute("data-y", elData.y);
        if (elData.width) el.style.width = elData.width;
        if (elData.height) el.style.height = elData.height;
    } else {
        _addResizeHandles(el);
    }

    // Selection on click
    el.addEventListener("mousedown", e => {
        if (document.body.classList.contains("play-mode-active")) return;
        if (el.classList.contains("editing-text")) {
            e.stopPropagation();
            if (e.target === el) {
                e.preventDefault();
            }
            return;
        }
        e.stopPropagation();
        const mode = e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace";
        selectElement(el.id, mode);
    });

    return el;
}

function _applyTypeContent(el, elData, options = {}) {
    if (elData.type === "text") {
        _installStructuredEditorShortcuts();
        const contentHost = document.createElement("div");
        contentHost.className = "text-element-content";
        contentHost.tabIndex = 0;
        contentHost.innerHTML = renderTextContent(elData);
        _applyBulletFragmentAnimation(contentHost, elData);
        el.appendChild(contentHost);
        requestAnimationFrame(() => {
            const layout = syncTextBoxLayout(el, elData);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(el.id, { height: `${layout.height}px` });
                elData.height = `${layout.height}px`;
            }
        });

        el.addEventListener("dblclick", event => {
            if (document.body.classList.contains("play-mode-active")) return;
            event.stopPropagation();
            selectElement(elData.id, "replace");
            let isStructured = isStructuredBulletContent(elData.content);
            if (isStructured) {
                contentHost.dataset.structuredEdit = "true";
                contentHost.dataset.structuredEditMode = "list";
                contentHost.dataset.structuredEditBulletStyle = elData.bulletStyle || "default";
                contentHost.dataset.structuredEditPreviousTextAlign = contentHost.style.textAlign || "";
                contentHost.style.setProperty("text-align", "left", "important");
                contentHost.innerHTML = buildStructuredBulletEditorHtml(elData.content, elData.bulletStyle || "default");
            }
            contentHost.contentEditable = true;
            if (!isStructured) {
                setActiveInlineEditor(contentHost);
            }
            syncTextBoxLayout(el, elData);
            el.classList.add("cursor-text", "editing-text");
            interact(el).draggable(false);
            interact(el).resizable(false);
            requestAnimationFrame(() => {
                _focusEditableHost(contentHost);
                if (!isStructured) {
                    captureInlineSelection();
                }
                updateFloatingToolbars?.();
            });
        });
        contentHost.addEventListener("mousedown", e => {
            if (!contentHost.isContentEditable) return;
            e.stopPropagation();
        });
        el.addEventListener("dragstart", e => {
            if (!el.classList.contains("editing-text")) return;
            e.preventDefault();
        });
        contentHost.addEventListener("keydown", e => {
            if (e.defaultPrevented) return;
            if (contentHost.dataset.structuredEdit !== "true") return;
            if (e.key === "Tab") {
                e.preventDefault();
                e.stopPropagation();
                _adjustStructuredIndentation(contentHost, e.shiftKey ? -1 : 1);
            }
        });
        contentHost.addEventListener("keyup", captureInlineSelection);
        contentHost.addEventListener("mouseup", captureInlineSelection);
        contentHost.addEventListener("input", () => {
            if (contentHost.dataset.undoSnapshotCaptured !== "true") {
                saveStateToUndo();
                contentHost.dataset.undoSnapshotCaptured = "true";
            }
            if (contentHost.dataset.structuredEdit === "true") {
                const nextContent =
                    _getStructuredEditorMode(contentHost) === "list"
                        ? parseStructuredBulletEditorHtml(contentHost, { preserveTrailingEmpty: true })
                        : parseEditableStructuredText(contentHost.textContent || "", elData.content);
                updateElementState(el.id, { content: nextContent });
                elData.content = nextContent;
            } else {
                updateElementState(el.id, { content: contentHost.innerHTML });
                captureInlineSelection();
            }
            const layout = syncTextBoxLayout(el, elData);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(el.id, { height: `${layout.height}px` });
                elData.height = `${layout.height}px`;
            }
        });
        contentHost.addEventListener("blur", (e) => {
            if (shouldKeepInlineEditorOpen(e)) {
                return;
            }
            if (contentHost.dataset.structuredEdit === "true") {
                const nextStructured =
                    _getStructuredEditorMode(contentHost) === "list"
                        ? parseStructuredBulletEditorHtml(contentHost)
                        : parseEditableStructuredText(contentHost.textContent || "", elData.content);
                const nextContent = nextStructured.length ? nextStructured : [normalizeStructuredBulletItem({ html: "List item", level: 0 })];
                if (JSON.stringify(nextContent) !== JSON.stringify(elData.content) && contentHost.dataset.undoSnapshotCaptured !== "true") {
                    saveStateToUndo();
                    contentHost.dataset.undoSnapshotCaptured = "true";
                }
                updateElementState(el.id, { content: nextContent });
                elData.content = nextContent;
                delete contentHost.dataset.structuredEdit;
                delete contentHost.dataset.structuredEditMode;
                delete contentHost.dataset.structuredEditBulletStyle;
                const previousTextAlign = contentHost.dataset.structuredEditPreviousTextAlign || "";
                delete contentHost.dataset.structuredEditPreviousTextAlign;
                if (previousTextAlign) {
                    contentHost.style.setProperty("text-align", previousTextAlign);
                } else {
                    contentHost.style.removeProperty("text-align");
                }
                contentHost.innerHTML = renderTextContent({ ...elData, content: nextContent });
                contentHost.style.whiteSpace = "";
            } else {
                updateElementState(el.id, { content: contentHost.innerHTML });
            }
            const layout = syncTextBoxLayout(el, elData);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(el.id, { height: `${layout.height}px` });
                elData.height = `${layout.height}px`;
            }
            delete contentHost.dataset.undoSnapshotCaptured;
            contentHost.contentEditable = false;
            clearActiveInlineEditor(contentHost);
            el.classList.remove("cursor-text", "editing-text");
            interact(el).draggable(true);
            interact(el).resizable(true);
            if (typeof schedulePresentationAutosave === "function") {
                schedulePresentationAutosave();
            }
        });
    } else if (elData.type === "table") {
        _renderTableDom(el, elData, { interactive: true });
    } else if (elData.type === "chart") {
        _renderChartDom(el, elData);
    } else if (elData.type === "image") {
        const imageNode = _createImageContentNode(elData, { interactive: true });
        el.appendChild(imageNode);

        if (!elData.cropTransform) {
            const img = imageNode.tagName === "IMG" ? imageNode : imageNode.querySelector("img");
            if (img) {
                // Auto-adjust height to natural aspect ratio if not explicitly cropped
                img.onload = () => {
                    const naturalRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
                    const hasNaturalRatio = Number.isFinite(naturalRatio) && naturalRatio > 0;
                    if (hasNaturalRatio && !elData.imageAspectRatio) {
                        elData.imageAspectRatio = naturalRatio;
                        updateElementState(elData.id, { imageAspectRatio: naturalRatio, lockAspectRatio: elData.lockAspectRatio ?? true });
                    }
                    if (hasNaturalRatio && !elData.cropTransform && !elData.heightSetManually) {
                        const currentWidth = parseFloat(el.style.width) || el.offsetWidth;
                        const newHeight = currentWidth / naturalRatio;
                        el.style.height = `${newHeight}px`;
                        updateElementState(elData.id, { height: `${newHeight}px`, imageAspectRatio: naturalRatio, lockAspectRatio: elData.lockAspectRatio ?? true });
                        if (state.selectedIds.includes(elData.id)) updateGroupBound();
                    }
                };
            }
        }

        el.addEventListener("dblclick", () => {
            if (document.body.classList.contains("play-mode-active")) return;
            if (typeof enterCropMode === "function") enterCropMode(elData.id);
        });
        if (typeof bindImageHoverToolbarElement === "function") {
            requestAnimationFrame(() => bindImageHoverToolbarElement(elData.id));
        }
    } else if (elData.type === "video") {
        const videoInfo = _parseVideoUrl(elData.content);
        const mediaInitiallyActive =
            document.visibilityState !== "hidden" &&
            document.hasFocus() &&
            Number(options.slideIndex) === getActiveSlideMediaIndex();
        let videoNode;
        if (videoInfo.type === "youtube") {
            videoNode = document.createElement("iframe");
            const params = new URLSearchParams({
                autoplay: elData.autoplay && mediaInitiallyActive ? 1 : 0,
                mute: elData.muted ? 1 : 0,
                loop: elData.loop ? 1 : 0,
                controls: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1,
            });
            if (elData.loop) params.set("playlist", videoInfo.id);
            videoNode.src = `https://www.youtube-nocookie.com/embed/${videoInfo.id}?${params.toString()}`;
            setMediaIframePermissions(videoNode, "autoplay; encrypted-media; picture-in-picture");
            videoNode.setAttribute("allowfullscreen", "true");
            videoNode.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
            videoNode.setAttribute("title", "YouTube video player");
        } else if (videoInfo.type === "vimeo") {
            videoNode = document.createElement("iframe");
            videoNode.src = `https://player.vimeo.com/video/${videoInfo.id}?autoplay=${elData.autoplay && mediaInitiallyActive ? 1 : 0}&muted=${elData.muted ? 1 : 0}&loop=${elData.loop ? 1 : 0}&api=1`;
            setMediaIframePermissions(videoNode, "autoplay; fullscreen; picture-in-picture");
            videoNode.setAttribute("allowfullscreen", "true");
        } else {
            videoNode = document.createElement("video");
            videoNode.controls = true;
            videoNode.muted = elData.muted !== false;
            videoNode.autoplay = Boolean(elData.autoplay && mediaInitiallyActive);
            videoNode.loop = elData.loop || false;
            videoNode.setAttribute("playsinline", "true");
            videoNode.setAttribute("preload", "metadata");

            const source = document.createElement("source");
            source.src = elData.content;

            // Attempt to detect mime type for better browser compatibility
            if (elData.content?.startsWith("data:video/")) {
                const mime = elData.content.split(";")[0].split(":")[1];
                if (mime) source.type = mime;
            } else if (elData.content?.startsWith("blob:")) {
                if (elData.localMimeType) source.type = elData.localMimeType;
            } else {
                const urlLower = String(elData.content || "").toLowerCase();
                if (urlLower.endsWith(".mp4")) source.type = "video/mp4";
                else if (urlLower.endsWith(".webm")) source.type = "video/webm";
                else if (urlLower.endsWith(".ogg")) source.type = "video/ogg";
                else if (urlLower.endsWith(".mov")) source.type = "video/quicktime";
            }
            videoNode.appendChild(source);
            videoNode.onerror = () => {
                console.error("Video element error for ID:", elData.id, videoNode.error);
            };
            videoNode.innerHTML += "Your browser does not support the video tag or this format.";
        }
        videoNode.className = "w-full h-full rounded-[inherit] pointer-events-none play-mode-events-auto";
        videoNode.dataset.autoplay = elData.autoplay ? "true" : "false";
        if (videoNode.tagName === "IFRAME") {
            videoNode.addEventListener("load", () => requestAnimationFrame(syncActiveSlideMedia));
        }
        videoNode.style.border = "0";
        el.appendChild(videoNode);

        // Add a presentation overlay to handle clicks in editor
        const overlay = document.createElement("div");
        overlay.className = "absolute inset-0 z-10 cursor-move play-mode-hidden";
        el.appendChild(overlay);

        const badge = document.createElement("span");
        badge.innerHTML = `<i class="fa-solid fa-film mr-1"></i> Video`;
        badge.className = "absolute top-2 left-2 px-2 py-1 bg-gray-900/80 text-white text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none";
        el.appendChild(badge);
    } else if (elData.type === "html") {
        el.classList.toggle("html-interactive", Boolean(elData.htmlInteractive));
        el.setAttribute("data-html-mode", normalizeHtmlMode(elData));

        const wrapper = document.createElement("div");
        wrapper.className = "html-embed-wrapper";

        const iframe = document.createElement("iframe");
        iframe.srcdoc = buildHtmlEmbedSrcdoc(elData.content || "", elData);
        applyHtmlEmbedSandbox(iframe);
        iframe.className = "w-full h-full html-embed-frame";
        iframe.style.border = "0";
        wrapper.appendChild(iframe);
        el.appendChild(wrapper);

        const badge = document.createElement("span");
        badge.innerHTML = `<i class="fa-solid fa-code mr-1"></i> HTML`;
        badge.className = "html-embed-badge absolute top-2 left-2 px-2 py-1 bg-gray-900/80 text-white text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity";
        el.appendChild(badge);
    } else if (elData.type === "molecule") {
        el.classList.toggle("molecule-interactive", Boolean(elData.moleculeInteractive));
        el.setAttribute("data-molecule-interactive", elData.moleculeInteractive ? "true" : "false");

        const wrapper = document.createElement("div");
        wrapper.className = "molecule-embed-wrapper";
        wrapper.style.backgroundColor = typeof normalizeMoleculeBackgroundColor === "function"
            ? normalizeMoleculeBackgroundColor(elData.styles?.backgroundColor || "#020617")
            : (elData.styles?.backgroundColor || "#020617");

        const iframe = document.createElement("iframe");
        const moleculeActive =
            document.visibilityState !== "hidden" &&
            document.hasFocus() &&
            Number(options.slideIndex) === getActiveSlideMediaIndex();
        iframe.srcdoc = typeof buildMoleculeEmbedSrcdoc === "function"
            ? buildMoleculeEmbedSrcdoc({
                  ...elData,
                  moleculePresentationMode: document.body.classList.contains("play-mode-active"),
                  moleculeActive,
              })
            : "";
        if (typeof applyMoleculeEmbedSandbox === "function") applyMoleculeEmbedSandbox(iframe);
        iframe.className = "w-full h-full molecule-embed-frame";
        iframe.style.border = "0";
        iframe.setAttribute("title", elData.moleculeIsTrajectory ? "Molecular trajectory viewer" : "Molecular structure viewer");
        iframe.addEventListener("load", () => requestAnimationFrame(syncActiveSlideMedia));
        if (typeof attachMoleculeDataBridge === "function") attachMoleculeDataBridge(iframe, elData);
        wrapper.appendChild(iframe);
        el.appendChild(wrapper);

        const shield = document.createElement("div");
        shield.className = "molecule-editor-shield play-mode-hidden";
        shield.hidden = Boolean(elData.moleculeInteractive);
        shield.innerHTML = `<div class="molecule-editor-hint"><i class="fa-solid fa-up-down-left-right"></i><span>Select / move</span></div>`;
        el.appendChild(shield);

        const controls = document.createElement("div");
        controls.className = "molecule-editor-controls play-mode-hidden";
        const orbitActive = Boolean(elData.moleculeInteractive);
        controls.innerHTML = `
            <button type="button" class="molecule-editor-toggle${orbitActive ? " active" : ""}" title="${orbitActive ? "Switch to select and resize mode" : "Enable 3D orbit mode"}" aria-label="${orbitActive ? "Switch molecule to select and resize mode" : "Enable molecule 3D orbit mode"}">
                <i class="fa-solid ${orbitActive ? "fa-cube" : "fa-arrow-pointer"}"></i>
                <span>${orbitActive ? "Orbit" : "Select"}</span>
            </button>
            <span class="molecule-editor-grip" title="Drag to move"><i class="fa-solid fa-up-down-left-right"></i></span>
        `;
        const toggle = controls.querySelector(".molecule-editor-toggle");
        if (toggle) {
            toggle.addEventListener("pointerdown", event => {
                event.preventDefault();
                event.stopPropagation();
            });
            toggle.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                const next = !el.classList.contains("molecule-interactive");
                if (typeof saveStateToUndo === "function") saveStateToUndo();
                elData.moleculeInteractive = next;
                if (typeof updateElementState === "function") updateElementState(elData.id, { moleculeInteractive: next });
                el.classList.toggle("molecule-interactive", next);
                el.setAttribute("data-molecule-interactive", next ? "true" : "false");
                shield.hidden = next;
                toggle.classList.toggle("active", next);
                toggle.title = next ? "Switch to select and resize mode" : "Enable 3D orbit mode";
                toggle.setAttribute("aria-label", next ? "Switch molecule to select and resize mode" : "Enable molecule 3D orbit mode");
                const icon = toggle.querySelector("i");
                if (icon) icon.className = `fa-solid ${next ? "fa-cube" : "fa-arrow-pointer"}`;
                const label = toggle.querySelector("span");
                if (label) label.textContent = next ? "Orbit" : "Select";
                if (typeof buildPropertiesPanel === "function") buildPropertiesPanel();
            });
        }
        el.appendChild(controls);

        const badge = document.createElement("span");
        badge.innerHTML = `<i class="fa-solid fa-atom mr-1"></i> ${elData.moleculeIsTrajectory ? "Trajectory" : "PDB"}`;
        badge.className = "molecule-embed-badge absolute top-2 left-2 px-2 py-1 bg-gray-900/80 text-white text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none";
        el.appendChild(badge);
    } else if (elData.type === "pdf") {
        el.classList.toggle("pdf-interactive", Boolean(elData.pdfInteractive));
        el.setAttribute("data-pdf-mode", elData.pdfEditorMode || "navigate");

        const wrapper = document.createElement("div");
        wrapper.className = "pdf-embed-wrapper";

        const iframe = document.createElement("iframe");
        iframe.src = buildPdfEmbedSrc(elData.content || "");
        iframe.className = "w-full h-full pdf-embed-frame";
        iframe.style.border = "0";
        wrapper.appendChild(iframe);
        el.appendChild(wrapper);

        _renderPdfAnnotations(el, elData);

        const badge = document.createElement("span");
        badge.innerHTML = `<i class="fa-regular fa-file-pdf mr-1"></i> PDF`;
        badge.className = "pdf-embed-badge absolute top-2 left-2 px-2 py-1 bg-gray-900/80 text-white text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity";
        el.appendChild(badge);
    } else if (elData.type === "equation") {
        const container = document.createElement("div");
        container.className = "equation-container";
        
        const color = elData.styles?.color || "#ffffff";
        const fontSize = elData.styles?.fontSize || "24px";
        
        container.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:4px;color:${color};font-size:${fontSize};line-height:1;`;
        container.innerHTML = elData.content || elData.latexSrc || "";
        el.appendChild(container);

        // Double-click to re-edit equation
        el.addEventListener("dblclick", () => {
            if (document.body.classList.contains("play-mode-active")) return;
            if (typeof openEquationModal === "function") {
                openEquationModal(elData.latexSrc || "", elData.id);
            }
        });
    } else if (elData.type === "shape") {
        const visual = getShapeStyle(elData);
        el.style.clipPath = visual.clipPath;
        if (!elData.styles?.borderRadius) {
            el.style.borderRadius = visual.borderRadius;
        }
    } else if (elData.type === "connector") {
        renderConnectorContent(el, elData, { interactive: true });
    }
}

function _parseVideoUrl(url) {
    if (!url) return { type: "none" };
    const value = String(url).trim();
    const parseableValue = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    let parsed = null;
    try {
        parsed = new URL(parseableValue);
    } catch (_err) {}
    const host = parsed?.hostname.replace(/^www\./, "") || "";
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
        let videoId = "";
        if (host === "youtu.be") videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
        else if (parsed?.searchParams.has("v")) videoId = parsed.searchParams.get("v") || "";
        else if (parsed?.pathname.includes("/embed/")) videoId = parsed.pathname.split("/embed/")[1].split("/")[0];
        else videoId = parsed?.pathname.split("/").filter(Boolean)[0] || "";
        return { type: "youtube", id: videoId };
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
        const videoId = parsed?.pathname.split("/").filter(Boolean)[0] || "";
        return { type: "vimeo", id: videoId };
    }
    return { type: "direct", url: value };
}

function buildPdfEmbedSrc(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    const joiner = value.includes("#") ? "&" : "#";
    return `${value}${joiner}toolbar=1&navpanes=0&view=FitH`;
}

function _buildPdfAnnotationNode(annotation, isSelected) {
    const node = document.createElement(annotation.type === "note" ? "button" : "div");
    if (annotation.type === "note") node.type = "button";
    node.className = `pdf-annotation pdf-annotation-${annotation.type || "highlight"} ${isSelected ? "pdf-annotation-selected" : ""}`.trim();
    node.style.left = `${annotation.x || 0}%`;
    node.style.top = `${annotation.y || 0}%`;
    node.style.width = `${annotation.width || 0}%`;
    node.style.height = `${annotation.height || 0}%`;
    node.dataset.annotationId = annotation.id;
    if (annotation.type === "note") {
        node.innerHTML = `<span class="pdf-note-dot"></span><span class="pdf-note-label">${escapeHtml(annotation.text || "Note")}</span>`;
        node.title = annotation.text || "Note";
    }
    return node;
}

function _renderPdfAnnotations(el, elData) {
    const layer = document.createElement("div");
    const mode = elData.pdfEditorMode || "navigate";
    layer.className = `pdf-annotation-layer ${mode === "navigate" ? "" : "pdf-annotation-layer-active"}`.trim();

    const applySelectedAnnotationClass = selectedId => {
        layer.querySelectorAll(".pdf-annotation").forEach(node => {
            node.classList.toggle("pdf-annotation-selected", node.dataset.annotationId === selectedId);
        });
    };

    (elData.pdfAnnotations || []).forEach(annotation => {
        const node = _buildPdfAnnotationNode(annotation, annotation.id === elData.pdfSelectedAnnotationId);
        node.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            selectElement(elData.id, "replace");
            updateElementState(elData.id, { pdfSelectedAnnotationId: annotation.id });
            applySelectedAnnotationClass(annotation.id);
            buildPropertiesPanel();
        });
        if (annotation.type === "note") {
            node.addEventListener("dblclick", event => {
                event.preventDefault();
                event.stopPropagation();
                if (document.body.classList.contains("play-mode-active")) return;
                const nextText = window.prompt("Edit note", annotation.text || "");
                if (nextText == null) return;
                saveStateToUndo();
                const nextAnnotations = (elData.pdfAnnotations || []).map(item =>
                    item.id === annotation.id ? { ...item, text: nextText } : item,
                );
                updateElementState(elData.id, { pdfAnnotations: nextAnnotations, pdfSelectedAnnotationId: annotation.id });
                schedulePresentationAutosave?.(150);
                renderSlidesFromState?.();
                buildPropertiesPanel();
            });
        }
        layer.appendChild(node);
    });

    if (!document.body.classList.contains("play-mode-active")) {
        let drawing = null;
        let draft = null;
        const pointFor = event => {
            const rect = layer.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100)),
                y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100)),
            };
        };

        layer.addEventListener("mousedown", event => {
            if (mode !== "highlight" || event.target !== layer) return;
            event.preventDefault();
            event.stopPropagation();
            selectElement(elData.id, "replace");
            drawing = pointFor(event);
            draft = document.createElement("div");
            draft.className = "pdf-annotation pdf-annotation-highlight pdf-annotation-draft";
            draft.style.left = `${drawing.x}%`;
            draft.style.top = `${drawing.y}%`;
            draft.style.width = "0%";
            draft.style.height = "0%";
            layer.appendChild(draft);
        });

        layer.addEventListener("mousemove", event => {
            if (!drawing || !draft) return;
            const current = pointFor(event);
            draft.style.left = `${Math.min(drawing.x, current.x)}%`;
            draft.style.top = `${Math.min(drawing.y, current.y)}%`;
            draft.style.width = `${Math.abs(current.x - drawing.x)}%`;
            draft.style.height = `${Math.abs(current.y - drawing.y)}%`;
        });

        layer.addEventListener("mouseup", event => {
            if (!drawing || !draft) return;
            const current = pointFor(event);
            const annotation = {
                id: generateId("pdfann"),
                type: "highlight",
                x: Math.min(drawing.x, current.x),
                y: Math.min(drawing.y, current.y),
                width: Math.abs(current.x - drawing.x),
                height: Math.abs(current.y - drawing.y),
            };
            draft.remove();
            draft = null;
            drawing = null;
            if (annotation.width < 1 || annotation.height < 1) return;
            saveStateToUndo();
            updateElementState(elData.id, {
                pdfAnnotations: [...(elData.pdfAnnotations || []), annotation],
                pdfSelectedAnnotationId: annotation.id,
            });
            schedulePresentationAutosave?.(150);
            renderSlidesFromState?.();
            buildPropertiesPanel();
        });

        layer.addEventListener("mouseleave", () => {
            if (draft) draft.remove();
            draft = null;
            drawing = null;
        });

        layer.addEventListener("click", event => {
            if (mode !== "note" || event.target !== layer) return;
            event.preventDefault();
            event.stopPropagation();
            selectElement(elData.id, "replace");
            const text = window.prompt("Note text");
            if (text == null) return;
            const point = pointFor(event);
            const annotation = {
                id: generateId("pdfann"),
                type: "note",
                x: point.x,
                y: point.y,
                width: 0,
                height: 0,
                text,
            };
            saveStateToUndo();
            updateElementState(elData.id, {
                pdfAnnotations: [...(elData.pdfAnnotations || []), annotation],
                pdfSelectedAnnotationId: annotation.id,
            });
            schedulePresentationAutosave?.(150);
            renderSlidesFromState?.();
            buildPropertiesPanel();
        });
    }

    el.appendChild(layer);
}

function _addResizeHandles(el) {
    ["tl", "tr", "bl", "br", "tc", "bc", "lc", "rc"].forEach(edge => {
        el.appendChild(Object.assign(document.createElement("span"), { className: `resize-handle ${edge}` }));
    });
}
