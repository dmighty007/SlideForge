

function getActiveSlideIndex() {
    if (typeof Reveal !== "undefined" && typeof Reveal.isReady === "function" && Reveal.isReady()) {
        const indices = Reveal.getIndices?.();
        const h = indices?.h;
        if (Number.isInteger(h)) {
            return Math.max(0, Math.min(h, state.slides.length - 1));
        }
    }
    return Math.max(0, Math.min(currentSlideIndex, state.slides.length - 1));
}

function ensureActiveSlideSync() {
    const idx = getActiveSlideIndex();
    if (idx !== currentSlideIndex) setCurrentSlideIndex(idx);
    if (!state.slides[idx]) state.slides[idx] = { id: generateId("slide"), layoutId: "blank-titled", notes: "", elements: [] };
    return idx;
}

function _normalizeSlideIndex(index) {
    if (!Number.isInteger(index)) return null;
    return Math.max(0, Math.min(index, state.slides.length - 1));
}

// ─── Slide Commands ──────────────────────────────────────────────────────────

function addSlide(targetIndex = null) {
    const activeIndex = _normalizeSlideIndex(targetIndex) ?? ensureActiveSlideSync();
    saveStateToUndo();
    state.slides.splice(activeIndex + 1, 0, { id: generateId("slide"), layoutId: "blank-titled", notes: "", elements: [] });
    setCurrentSlideIndex(activeIndex + 1);
    renderSlidesFromState();
    Reveal.slide(activeIndex + 1);
    updateSlideCounter();
}

function deleteCurrentSlide(targetIndex = null) {
    const activeIndex = _normalizeSlideIndex(targetIndex) ?? ensureActiveSlideSync();
    if (state.slides.length <= 1) return;
    saveStateToUndo();
    state.slides.splice(activeIndex, 1);
    const nextIndex = Math.max(0, activeIndex - 1);
    setCurrentSlideIndex(nextIndex);
    renderSlidesFromState();
    Reveal.slide(nextIndex);
    updateSlideCounter();
}

function duplicateCurrentSlide(targetIndex = null) {
    const activeIndex = _normalizeSlideIndex(targetIndex) ?? ensureActiveSlideSync();
    const sourceSlide = state.slides[activeIndex];
    if (!sourceSlide) return;

    saveStateToUndo();
    const slideCopy = JSON.parse(JSON.stringify(sourceSlide));
    const groupIdMap = {};
    slideCopy.id = generateId("slide");
    slideCopy.elements = (slideCopy.elements || []).map(el => {
        const copy = { ...el, id: generateId("el") };
        if (copy.groupId) {
            if (!groupIdMap[copy.groupId]) {
                groupIdMap[copy.groupId] = generateId("grp");
            }
            copy.groupId = groupIdMap[copy.groupId];
        }
        return copy;
    });

    state.slides.splice(activeIndex + 1, 0, slideCopy);
    setCurrentSlideIndex(activeIndex + 1);
    clearSelection();
    renderSlidesFromState();
    Reveal.slide(activeIndex + 1);
    updateSlideCounter();
}

function updateSlideCounter() {
    const el = document.getElementById("slide-counter");
    if (el) el.innerText = `Slide ${currentSlideIndex + 1} / ${state.slides.length}`;
}

// ─── Element Commands ────────────────────────────────────────────────────────

function addElement(type, options = {}) {
    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const id = generateId("el");
    const theme = getPresentationTheme();
    const shapeType = type === "shape" ? options.shapeType || "rectangle" : undefined;
    const isArrowShape = typeof shapeType === "string" && shapeType.startsWith("arrow-");
    const shapeBorderRadius = shapeType === "circle" ? "9999px" : "0px";
    state.slides[activeIndex].elements.push({
        id,
        type,
        ...(type === "text" ? { bulletStyle: "default", autoHeight: true } : {}),
        ...(type === "table" ? { tableData: createDefaultTableData(3, 4) } : {}),
        ...(type === "shape" ? { shapeType } : {}),
        ...(type === "image" ? { lockAspectRatio: true, imageAspectRatio: 1.5 } : {}),
        ...(type === "shape" && isArrowShape ? { arrowHeadSize: 38, arrowShaftSize: 36 } : {}),
        ...(type === "video" ? { videoType: "youtube", muted: true, autoplay: false, loop: false } : {}),
        ...(type === "pdf"
            ? {
                  pdfInteractive: true,
                  pdfEditorMode: "navigate",
                  pdfAnnotations: [],
                  pdfSelectedAnnotationId: "",
                  localMimeType: "application/pdf",
              }
            : {}),
        x: 100,
        y: 100,
        width:
            type === "shape"
                ? isArrowShape
                    ? "220px"
                    : "150px"
                : type === "image"
                  ? "300px"
                  : type === "text"
                    ? "360px"
                    : type === "table"
                      ? "520px"
                    : type === "video"
                      ? "480px"
                      : type === "pdf"
                        ? "520px"
                      : "auto",
        height:
            type === "shape"
                ? isArrowShape
                    ? "100px"
                    : "150px"
                : type === "image"
                  ? "200px"
                  : type === "table"
                    ? "240px"
                  : type === "video"
                    ? "270px"
                    : type === "pdf"
                      ? "360px"
                    : "auto",
        content:
            type === "text"
                ? "Double click to edit text"
                : type === "table"
                  ? ""
                : type === "image"
                  ? "https://picsum.photos/400/300"
                  : type === "video"
                    ? "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
                    : type === "pdf"
                      ? ""
                    : "",
        styles: {
            backgroundColor: type === "shape" ? theme.defaultShapeColor : "transparent",
            color: type === "text" || type === "table" ? theme.defaultTextColor : "transparent",
            fontSize: type === "text" ? "32px" : type === "table" ? "16px" : "0px",
            fontFamily: theme.bodyFont,
            textAlign: type === "text" || type === "table" ? "left" : undefined,
            zIndex: getNextZIndex(),
            borderRadius: type === "shape" ? shapeBorderRadius : type === "video" || type === "pdf" ? "8px" : "0px",
        },
        ...(type === "text" ? { textFitMode: "autoHeight" } : {}),
        animation: null,
    });
    renderSlidesFromState();
    selectElement(id);
}

function addShape(shapeType = "rectangle") {
    addElement("shape", { shapeType });
}

function addChart(chartType = "bar") {
    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const id = generateId("el");
    const theme = getPresentationTheme();
    state.slides[activeIndex].elements.push({
        id,
        type: "chart",
        chartType,
        chartData: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May"],
            datasets: [{
                label: "Sales",
                data: [12, 19, 3, 5, 2],
                backgroundColor: [theme.accentStrong, theme.accentStrong + "CC"],
                borderColor: theme.accentStrong,
                borderWidth: 1
            }]
        },
        chartOptions: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            }
        },
        x: 100,
        y: 100,
        width: "500px",
        height: "350px",
        styles: {
            zIndex: getNextZIndex(),
            backgroundColor: "#ffffff",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }
    });
    renderSlidesFromState();
    selectElement(id);
}

function aiCleanUpSlide() {
    const activeIndex = ensureActiveSlideSync();
    const slide = state.slides[activeIndex];
    const elements = slide?.elements || [];
    const targetIds = state.selectedIds?.length ? new Set(state.selectedIds) : null;
    const targetElements = (targetIds ? elements.filter(el => targetIds.has(el.id)) : elements).filter(el => {
        if (!el || el.type === "connector") return false;
        const w = parseFloat(el.width) || 0;
        const h = parseFloat(el.height) || 0;
        return w > 0 && h > 0;
    });
    if (!targetElements.length) {
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Nothing to clean up", "muted");
        }
        return;
    }

    const slideConfig = getPresentationPageSetupConfig();
    const slideW = Number(slideConfig.width) || 1024;
    const slideH = Number(slideConfig.height) || 768;
    const centerX = slideW / 2;
    const centerY = slideH / 2;
    const snapThreshold = 28;
    const grid = 10;
    const edgeMargin = Math.round(Math.max(36, Math.min(slideW, slideH) * 0.05) / grid) * grid;
    const gap = 16;
    let changedCount = 0;
    const before = new Map(targetElements.map(el => [el.id, JSON.stringify({
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
    })]));

    saveStateToUndo();

    const snap = value => Math.round((Number(value) || 0) / grid) * grid;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const median = values => {
        const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
        if (!sorted.length) return 0;
        return sorted[Math.floor(sorted.length / 2)];
    };
    const numericBounds = el => ({
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        w: Math.max(1, parseFloat(el.width) || 1),
        h: Math.max(1, parseFloat(el.height) || 1),
    });

    targetElements.forEach(el => {
        const b = numericBounds(el);
        let nx = snap(b.x);
        let ny = snap(b.y);

        if (Math.abs((nx + b.w / 2) - centerX) < snapThreshold) {
            nx = snap(centerX - b.w / 2);
        }
        if (Math.abs((ny + b.h / 2) - centerY) < snapThreshold) {
            ny = snap(centerY - b.h / 2);
        }
        if (Math.abs(nx - edgeMargin) < snapThreshold) nx = edgeMargin;
        if (Math.abs(ny - edgeMargin) < snapThreshold) ny = edgeMargin;
        if (Math.abs(nx + b.w - (slideW - edgeMargin)) < snapThreshold) nx = snap(slideW - edgeMargin - b.w);
        if (Math.abs(ny + b.h - (slideH - edgeMargin)) < snapThreshold) ny = snap(slideH - edgeMargin - b.h);

        el.x = clamp(nx, 0, Math.max(0, slideW - b.w));
        el.y = clamp(ny, 0, Math.max(0, slideH - b.h));
    });

    const alignCluster = (items, key, setter) => {
        const buckets = [];
        items.forEach(el => {
            const b = numericBounds(el);
            const value = key(b);
            const bucket = buckets.find(group => Math.abs(group.value - value) <= snapThreshold);
            if (bucket) {
                bucket.items.push(el);
                bucket.values.push(value);
                bucket.value = median(bucket.values);
            } else {
                buckets.push({ value, values: [value], items: [el] });
            }
        });
        buckets.filter(group => group.items.length >= 2).forEach(group => {
            const target = snap(median(group.values));
            group.items.forEach(el => setter(el, target));
        });
    };

    alignCluster(targetElements, b => b.x, (el, value) => {
        const b = numericBounds(el);
        el.x = clamp(value, 0, Math.max(0, slideW - b.w));
    });
    alignCluster(targetElements, b => b.x + b.w / 2, (el, value) => {
        const b = numericBounds(el);
        el.x = clamp(snap(value - b.w / 2), 0, Math.max(0, slideW - b.w));
    });
    alignCluster(targetElements, b => b.y, (el, value) => {
        const b = numericBounds(el);
        el.y = clamp(value, 0, Math.max(0, slideH - b.h));
    });

    const sorted = [...targetElements].sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0));
    for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1];
        const current = sorted[i];
        const pb = numericBounds(prev);
        const cb = numericBounds(current);
        const overlapsX = cb.x < pb.x + pb.w - gap && cb.x + cb.w > pb.x + gap;
        const overlapsY = cb.y < pb.y + pb.h + gap;
        if (overlapsX && overlapsY && cb.y >= pb.y) {
            current.y = clamp(snap(pb.y + pb.h + gap), 0, Math.max(0, slideH - cb.h));
        }
    }

    targetElements.forEach(el => {
        if (el.type === "text" && el.autoHeight !== false) {
            const dom = document.getElementById(el.id);
            if (dom && typeof syncTextBoxLayout === "function") {
                const layout = syncTextBoxLayout(dom, el);
                if (layout?.autoHeight && Number.isFinite(layout.height)) {
                    el.height = `${layout.height}px`;
                }
            }
        }
        const after = JSON.stringify({
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
        });
        if (after !== before.get(el.id)) changedCount += 1;
    });

    renderSlidesFromState();
    updateGroupBound?.();
    if (typeof refreshPreviews === "function") refreshPreviews();
    if (typeof buildPropertiesPanel === "function") buildPropertiesPanel();
    if (typeof setProjectSaveHint === "function") {
        setProjectSaveHint(
            changedCount
                ? `Cleaned up ${changedCount} ${changedCount === 1 ? "element" : "elements"}`
                : "Layout already aligned",
            changedCount ? "success" : "muted",
        );
    }
}

function addConnector(connectorType = "line") {
    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const id = generateId("el");
    const theme = getPresentationTheme();
    const safeType = connectorType === "curve" || connectorType === "poly" ? connectorType : "line";
    const points =
        safeType === "curve"
            ? [
                  { x: 24, y: 96 },
                  { x: 140, y: 24 },
                  { x: 256, y: 96 },
              ]
            : safeType === "poly"
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

    const newConnector = {
        id,
        type: "connector",
        connectorType: safeType,
        connectorStart: "none",
        connectorEnd: "arrow",
        connectorHeadWidth: 14,
        connectorHeadLength: 14,
        points,
        x: 120,
        y: 120,
        width: "280px",
        height: "140px",
        content: "",
        styles: {
            backgroundColor: "transparent",
            color: theme.accentStrong,
            strokeWidth: 4,
            zIndex: getNextZIndex(),
            borderRadius: "0px",
        },
        themeManaged: true,
    };
    normalizeConnectorGeometry(newConnector);
    state.slides[activeIndex].elements.push(newConnector);
    renderSlidesFromState();
    selectElement(id);
}

function addComponent(templateId) {
    const activeIndex = ensureActiveSlideSync();
    const template = resolveComponentTemplate(templateId, getPresentationTheme());
    if (!template) return;
    saveStateToUndo();
    const groupId = generateId("grp");
    const newIds = [];
    const baseZ = getNextZIndex();
    template.elements.forEach(el => {
        const id = generateId("el");
        const componentZ = el.styles && el.styles.zIndex ? el.styles.zIndex : 1;
        state.slides[activeIndex].elements.push({
            ...el,
            id,
            groupId,
            themeManaged: true,
            x: 200 + (el.offsetX || 0),
            y: 200 + (el.offsetY || 0),
            styles: {
                ...(el.styles || {}),
                zIndex: baseZ + componentZ - 1
            }
        });
        newIds.push(id);
    });
    renderSlidesFromState();
    setSelectedIds(newIds);
    buildPropertiesPanel();
    updateGroupBound();
}

function deleteSelectedElements() {
    const activeIndex = ensureActiveSlideSync();
    if (!state.selectedIds.length) return;
    saveStateToUndo();
    state.slides[activeIndex].elements = state.slides[activeIndex].elements.filter(
        el => !state.selectedIds.includes(el.id) || el.locked === true,
    );
    // Keep selection only for elements that were NOT deleted (because they were locked)
    state.selectedIds = state.selectedIds.filter(id => {
        const el = state.slides[activeIndex].elements.find(e => e.id === id);
        return !!el;
    });
    if (state.selectedIds.length === 0) {
        clearSelection();
    } else {
        buildPropertiesPanel();
        updateGroupBound();
    }
    renderSlidesFromState();
}

function deleteElement(id) {
    const activeIndex = ensureActiveSlideSync();
    const el = state.slides[activeIndex].elements.find(e => e.id === id);
    if (el?.locked) return;

    state.slides[activeIndex].elements = state.slides[activeIndex].elements.filter(el => el.id !== id);
    clearSelection();
    renderSlidesFromState();
}

function duplicateSelectedElements() {
    const activeIndex = ensureActiveSlideSync();
    if (!state.selectedIds.length) return;
    saveStateToUndo();
    const newIds = [];
    const groupIdMap = {};
    
    state.selectedIds.forEach(id => {
        const el = state.slides[activeIndex].elements.find(e => e.id === id);
        if (!el) return;
        const newId = generateId("el");
        const copy = JSON.parse(JSON.stringify(el));
        copy.id = newId;
        copy.x += 20;
        copy.y += 20;
        
        if (copy.groupId) {
            if (!groupIdMap[copy.groupId]) {
                groupIdMap[copy.groupId] = generateId("grp");
            }
            copy.groupId = groupIdMap[copy.groupId];
        } else {
            copy.groupId = null;
        }
        
        if (!copy.styles) copy.styles = {};
        copy.styles.zIndex = getNextZIndex();
        
        state.slides[activeIndex].elements.push(copy);
        newIds.push(newId);
    });
    renderSlidesFromState();
    setSelectedIds(newIds);
    buildPropertiesPanel();
    updateGroupBound();
}

function duplicateElement(id) {
    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const el = state.slides[activeIndex].elements.find(e => e.id === id);
    if (!el) return;
    const newId = generateId("el");
    const copy = JSON.parse(JSON.stringify(el));
    copy.id = newId;
    copy.x += 20;
    copy.y += 20;
    copy.groupId = null; // never inherit group
    if (!copy.styles) copy.styles = {};
    copy.styles.zIndex = getNextZIndex();
    state.slides[activeIndex].elements.push(copy);
    renderSlidesFromState();
    selectElement(newId);
}

function nudgeSelectedElements(dx, dy) {
    const activeIndex = ensureActiveSlideSync();
    if (!state.selectedIds.length) return;
    saveStateToUndo();
    state.selectedIds.forEach(id => {
        const el = state.slides[activeIndex].elements.find(e => e.id === id);
        if (!el || el.locked === true) return;
        const nextX = (Number(el.x) || 0) + dx;
        const nextY = (Number(el.y) || 0) + dy;
        el.x = nextX;
        el.y = nextY;

        const dom = document.getElementById(id);
        if (dom) {
            dom.style.transform = `translate(${nextX}px, ${nextY}px)`;
            dom.setAttribute("data-x", nextX);
            dom.setAttribute("data-y", nextY);
        }
    });
    updateGroupBound();
    renderSlidePreviews(currentSlideIndex);
    if (typeof schedulePresentationAutosave === "function") {
        schedulePresentationAutosave();
    }
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

let _clipboard = {
    elements: [],
};

function _cloneSelectedElements() {
    const activeIndex = ensureActiveSlideSync();
    if (!state.selectedIds.length) return [];
    return state.selectedIds
        .map(id => {
        const el = state.slides[activeIndex].elements.find(e => e.id === id);
        return JSON.parse(JSON.stringify(el));
        })
        .filter(Boolean);
}

function copyElement(clipboardEvent = null) {
    const selectedElements = _cloneSelectedElements();
    if (!selectedElements.length) return;
    _clipboard = { elements: selectedElements };

    if (clipboardEvent?.clipboardData) {
        clipboardEvent.preventDefault();
        clipboardEvent.clipboardData.setData(
            "application/x-slideforge-elements",
            JSON.stringify({ elements: selectedElements }),
        );
        const textSummary = selectedElements
            .map(el => (el.type === "text" ? String(parseTextFromHtml?.(el.content) || el.content || "") : `[${el.type}]`))
            .filter(Boolean)
            .join("\n");
        clipboardEvent.clipboardData.setData("text/plain", textSummary || "[SlideForge elements]");
    }

    _copySelectionToSystemClipboard(selectedElements).catch(err => {
        console.warn("System clipboard write failed:", err);
    });
}

async function copySelectionToClipboard() {
    const selectedElements = _cloneSelectedElements();
    if (!selectedElements.length) {
        setProjectSaveHint?.("Select a text or image element first", "warn");
        return false;
    }
    _clipboard = { elements: selectedElements };
    try {
        await _copySelectionToSystemClipboard(selectedElements);
        return true;
    } catch (err) {
        console.warn("Explicit clipboard copy failed:", err);
        setProjectSaveHint?.("Clipboard copy was blocked by the browser", "danger");
        return false;
    }
}

function _normalizeClipboardPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.elements)) return payload.elements;
    return [];
}

function _escapeClipboardText(text) {
    const node = document.createElement("div");
    node.textContent = String(text || "");
    return node.innerHTML.replace(/\n/g, "<br>");
}

function _createClipboardTextElement(text, x = 100, y = 100) {
    const theme = getPresentationTheme();
    return {
        id: generateId("el"),
        type: "text",
        x,
        y,
        width: "420px",
        height: "auto",
        autoHeight: true,
        textFitMode: "autoHeight",
        content: _escapeClipboardText(text),
        styles: {
            color: theme.defaultTextColor,
            fontSize: "28px",
            fontFamily: theme.bodyFont,
            textAlign: "left",
            lineHeight: "1.45",
            zIndex: getNextZIndex(),
            backgroundColor: "transparent",
        },
    };
}

function _createClipboardImageElement(dataUrl, origWidth, origHeight, x = 100, y = 100) {
    const targetWidth = 400;
    const aspect = origHeight / Math.max(1, origWidth);
    const imageAspectRatio = Math.max(0.01, origWidth / Math.max(1, origHeight));
    return {
        id: generateId("el"),
        type: "image",
        x,
        y,
        width: `${targetWidth}px`,
        height: `${Math.round(targetWidth * aspect)}px`,
        lockAspectRatio: true,
        imageAspectRatio,
        content: dataUrl,
        styles: { zIndex: getNextZIndex(), borderRadius: "8px" },
    };
}

function _looksLikeImageSource(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    if (value.startsWith("data:image/")) return true;
    return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
}

function _insertClipboardTextAsBestFit(text, x = 100, y = 100) {
    const activeIndex = ensureActiveSlideSync();
    const value = String(text || "").trim();
    if (!value) return false;

    saveStateToUndo();
    if (_looksLikeImageSource(value)) {
        const imageEl = _createClipboardImageElement(value, 400, 300, x, y);
        state.slides[activeIndex].elements.push(imageEl);
        renderSlidesFromState();
        selectElement(imageEl.id);
        return true;
    }

    const textEl = _createClipboardTextElement(value, x, y);
    state.slides[activeIndex].elements.push(textEl);
    renderSlidesFromState();
    selectElement(textEl.id);
    return true;
}

function _dataUrlToBlob(dataUrl) {
    const [meta, base64] = String(dataUrl || "").split(",");
    const mimeMatch = meta?.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const binary = atob(base64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

function _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Failed to read blob"));
        reader.readAsDataURL(blob);
    });
}

async function _copySelectionToSystemClipboard(selectedElements) {
    if (!navigator.clipboard) return;

    const textSummary = selectedElements
        .map(el => (el.type === "text" ? String(parseTextFromHtml?.(el.content) || el.content || "") : `[${el.type}]`))
        .filter(Boolean)
        .join("\n");

    if (navigator.clipboard.write && typeof ClipboardItem !== "undefined" && selectedElements.length === 1) {
        const [element] = selectedElements;
        if (element.type === "image" && typeof element.content === "string" && element.content.startsWith("data:")) {
            const blob = _dataUrlToBlob(element.content);
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type || "image/png"]: blob,
                    "text/plain": new Blob([textSummary || "[image]"], { type: "text/plain" }),
                }),
            ]);
            return;
        }
    }

    if (navigator.clipboard.writeText && textSummary) {
        await navigator.clipboard.writeText(textSummary);
    }
}

async function _pasteFromSystemClipboard(activeIndex) {
    if (!navigator.clipboard) return false;

    if (navigator.clipboard.read && typeof ClipboardItem !== "undefined") {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(type => type.startsWith("image/"));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const dataUrl = await _blobToDataUrl(blob);
                    const imageEl = _createClipboardImageElement(dataUrl, 400, 300, 100, 100);
                    saveStateToUndo();
                    state.slides[activeIndex].elements.push(imageEl);
                    renderSlidesFromState();
                    selectElement(imageEl.id);
                    return true;
                }
                if (item.types.includes("text/plain")) {
                    const blob = await item.getType("text/plain");
                    const text = (await blob.text()).trim();
                    if (text) {
                        return _insertClipboardTextAsBestFit(text, 100, 100);
                    }
                }
            }
        } catch (err) {
            console.warn("navigator.clipboard.read failed:", err);
        }
    }

    if (navigator.clipboard.readText) {
        try {
            const text = (await navigator.clipboard.readText()).trim();
            if (text) {
                return _insertClipboardTextAsBestFit(text, 100, 100);
            }
        } catch (err) {
            console.warn("navigator.clipboard.readText failed:", err);
        }
    }

    return false;
}

function pasteElement(payload = null) {
    const activeIndex = ensureActiveSlideSync();
    const sourceElements = _normalizeClipboardPayload(payload).length
        ? _normalizeClipboardPayload(payload)
        : _clipboard.elements;
    if (!sourceElements.length) return;
    saveStateToUndo();
    const newIds = [];
    const groupIdMap = {};
    
    sourceElements.forEach(el => {
        const newId = generateId("el");
        const copy = JSON.parse(JSON.stringify(el));
        copy.id = newId;
        copy.x = (Number(copy.x) || 0) + 40;
        copy.y = (Number(copy.y) || 0) + 40;
        
        if (copy.groupId) {
            if (!groupIdMap[copy.groupId]) {
                groupIdMap[copy.groupId] = generateId("grp");
            }
            copy.groupId = groupIdMap[copy.groupId];
        } else {
            copy.groupId = null;
        }
        
        if (!copy.styles) copy.styles = {};
        copy.styles.zIndex = getNextZIndex();
        
        state.slides[activeIndex].elements.push(copy);
        newIds.push(newId);
    });
    renderSlidesFromState();
    setSelectedIds(newIds);
    buildPropertiesPanel();
    updateGroupBound();
}

async function pasteFromClipboard() {
    const activeIndex = ensureActiveSlideSync();
    const pasted = await _pasteFromSystemClipboard(activeIndex);
    if (pasted) {
        return true;
    }

    if (_clipboard.elements?.length) {
        pasteElement();
        return true;
    }

    setProjectSaveHint?.("Nothing usable was found in the clipboard, or clipboard access was blocked", "warn");
    return false;
}

async function optimizeImageToWebP(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            resolve({
                dataUrl: canvas.toDataURL("image/webp", quality),
                origWidth: img.width,
                origHeight: img.height
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Image conversion failed"));
        };
        img.src = url;
    });
}

async function handlePaste(e) {
    const isTextEditing = document.activeElement && document.activeElement.isContentEditable;
    const items = e.clipboardData?.items || [];
    let hasImage = false;
    let handled = false;
    for (const item of items) {
        if (item.type.startsWith("image/")) {
            hasImage = true;
            break;
        }
    }
    
    // Prevent pasting raw base64 string into contenteditable if we are handling it
    if (hasImage && isTextEditing) {
        e.preventDefault();
    }

    if (!hasImage && !isTextEditing) {
        const customData = e.clipboardData?.getData("application/x-slideforge-elements");
        if (customData) {
            try {
                const parsed = JSON.parse(customData);
                e.preventDefault();
                pasteElement(parsed);
                return;
            } catch (err) {
                console.error("Clipboard parse error:", err);
            }
        }
    }

    const activeIndex = ensureActiveSlideSync();

    if (!hasImage && !isTextEditing) {
        const plainText = e.clipboardData?.getData("text/plain") || "";
        const htmlText = e.clipboardData?.getData("text/html") || "";
        const incomingText = String(plainText || "").trim()
            || (htmlText ? new DOMParser().parseFromString(htmlText, "text/html").body.innerText.trim() : "");
        if (incomingText) {
            e.preventDefault();
            handled = _insertClipboardTextAsBestFit(incomingText, 100, 100);
        }
    }

    if (handled) return;

    for (const item of items) {
        if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            try {
                const { dataUrl, origWidth, origHeight } = await optimizeImageToWebP(file);
                saveStateToUndo();
                const imageEl = _createClipboardImageElement(dataUrl, origWidth, origHeight, 100, 100);
                state.slides[activeIndex].elements.push(imageEl);
                renderSlidesFromState();
                selectElement(imageEl.id);
                handled = true;
            } catch (err) {
                console.error("Paste image error:", err);
            }
        }
    }

    if (handled) {
        e.preventDefault();
        return;
    }

    if (!isTextEditing) {
        const pasted = await _pasteFromSystemClipboard(activeIndex);
        if (pasted) {
            e.preventDefault();
        }
    }
}

async function handleImageFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        setProjectSaveHint?.("Please choose a valid image file", "danger");
        return;
    }

    try {
        const { dataUrl, origWidth, origHeight } = await optimizeImageToWebP(file);
        const activeIndex = ensureActiveSlideSync();
        saveStateToUndo();
        const id = generateId("el");
        
        const targetWidth = 420;
        const aspect = origHeight / origWidth;
        const targetHeight = targetWidth * aspect;
        const imageAspectRatio = Math.max(0.01, origWidth / Math.max(1, origHeight));
        
        state.slides[activeIndex].elements.push({
            id,
            type: "image",
            x: 100,
            y: 100,
            width: `${targetWidth}px`,
            height: `${Math.round(targetHeight)}px`,
            lockAspectRatio: true,
            imageAspectRatio,
            content: dataUrl,
            styles: { zIndex: getNextZIndex(), borderRadius: "8px" },
        });
        renderSlidesFromState();
        selectElement(id);
    } catch (err) {
        console.error("Image insert error:", err);
        setProjectSaveHint?.("Failed to process image", "danger");
    }
}

function handleVideoFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
        setProjectSaveHint?.("Please choose a valid video file", "danger");
        return;
    }

    _insertUploadedVideo(file).catch(err => {
        console.error("Video insert error:", err);
        setProjectSaveHint?.(err?.message || "Failed to process video", "danger");
    });
}

async function handlePdfFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
        setProjectSaveHint?.("Please choose a valid PDF file", "danger");
        return;
    }

    if (typeof setProjectSaveHint === "function") {
        setProjectSaveHint("Uploading PDF…", "warn");
    }

    let content;
    try {
        const upload = await _uploadAssetFile(file);
        content = upload.url;
    } catch (err) {
        const backendMissing =
            err?.message === "Backend API unavailable" ||
            /404|NetworkError|Failed to fetch|fetch resource/i.test(err?.message || "");
        if (!backendMissing) throw err;
        content = _createSessionObjectUrl(file);
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("PDF stored for this session only", "warn");
        }
    }

    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const id = generateId("el");
    state.slides[activeIndex].elements.push({
        id,
        type: "pdf",
        x: 100,
        y: 100,
        width: "520px",
        height: "360px",
        content,
        pdfInteractive: true,
        pdfEditorMode: "navigate",
        pdfAnnotations: [],
        pdfSelectedAnnotationId: "",
        localMimeType: "application/pdf",
        styles: { zIndex: getNextZIndex(), borderRadius: "8px", backgroundColor: "#ffffff" },
    });
    renderSlidesFromState();
    selectElement(id);
    schedulePresentationAutosave?.(150);
}

async function _uploadAssetFile(file, { presentationId = currentPresentationId } = {}) {
    if (typeof isBackendApiAvailable === "function" && !isBackendApiAvailable()) {
        throw new Error("Backend API unavailable");
    }
    const formData = new FormData();
    formData.append("file", file, file.name || "asset");
    if (presentationId) formData.append("presentationId", presentationId);

    const response = await _apiFetch("/api/assets/upload/", {
        method: "POST",
        body: formData,
    });

    let payload = {};
    try {
        payload = await response.json();
    } catch (_err) {}

    if (!response.ok) {
        throw new Error(payload.error || `Upload failed (${response.status})`);
    }
    return payload;
}

const _sessionObjectUrls = new Set();

function _createSessionObjectUrl(file) {
    const url = URL.createObjectURL(file);
    _sessionObjectUrls.add(url);
    return url;
}

async function _resolveSlideBackgroundAsset(file) {
    try {
        const upload = await _uploadAssetFile(file);
        return { url: upload.url, mimeType: file.type || "" };
    } catch (err) {
        const backendMissing =
            err?.message === "Backend API unavailable" ||
            /404|NetworkError|Failed to fetch|fetch resource/i.test(err?.message || "");
        if (!backendMissing) throw err;
        return { url: _createSessionObjectUrl(file), mimeType: file.type || "" };
    }
}

function setCurrentSlideBackground(background) {
    const activeIndex = ensureActiveSlideSync();
    const slide = state.slides[activeIndex];
    if (!slide) return;
    slide.background = background ? normalizeSlideBackground(background) : null;
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
    schedulePresentationAutosave?.(150);
}

function setCurrentSlideBackgroundFit(fit) {
    const activeIndex = ensureActiveSlideSync();
    const slide = state.slides[activeIndex];
    if (!slide?.background) return;
    const nextFit = ["cover", "contain", "fill"].includes(fit) ? fit : "cover";
    saveStateToUndo();
    slide.background = {
        ...normalizeSlideBackground(slide.background),
        fit: nextFit,
    };
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
    schedulePresentationAutosave?.(150);
}

function setCurrentSlideBackgroundAdjustments(updates = {}) {
    const activeIndex = ensureActiveSlideSync();
    const slide = state.slides[activeIndex];
    const current = normalizeSlideBackground(slide?.background);
    if (!slide || !current) return;
    saveStateToUndo();
    slide.background = normalizeSlideBackground({
        ...current,
        ...updates,
    });
    renderSlidesFromState?.();
    buildPropertiesPanel?.();
    schedulePresentationAutosave?.(150);
}

async function setCurrentSlideBackgroundFromFile(file) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
        setProjectSaveHint?.("Choose an image, GIF, or video background", "danger");
        return;
    }
    const resolved = await _resolveSlideBackgroundAsset(file);
    saveStateToUndo();
    setCurrentSlideBackground({
        type: isVideo ? "video" : "image",
        content: resolved.url,
        mimeType: resolved.mimeType,
        fit: "cover",
    });
}

function pickCurrentSlideBackgroundFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/mp4,video/webm,video/ogg";
    input.onchange = async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await setCurrentSlideBackgroundFromFile(file);
        } catch (err) {
            console.error("Slide background upload failed:", err);
            setProjectSaveHint?.(err?.message || "Failed to set slide background", "danger");
        }
    };
    input.click();
}

function setCurrentSlideBackgroundFromUrl(url) {
    const value = String(url || "").trim();
    if (!value) return;
    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(value) || /^data:video\//i.test(value);
    saveStateToUndo();
    setCurrentSlideBackground({
        type: isVideo ? "video" : "image",
        content: value,
        mimeType: "",
        fit: normalizeSlideBackground(state.slides?.[ensureActiveSlideSync()]?.background)?.fit || "cover",
        opacity: normalizeSlideBackground(state.slides?.[ensureActiveSlideSync()]?.background)?.opacity ?? 1,
        blur: normalizeSlideBackground(state.slides?.[ensureActiveSlideSync()]?.background)?.blur ?? 0,
        brightness: normalizeSlideBackground(state.slides?.[ensureActiveSlideSync()]?.background)?.brightness ?? 100,
        saturate: normalizeSlideBackground(state.slides?.[ensureActiveSlideSync()]?.background)?.saturate ?? 100,
    });
}

function clearCurrentSlideBackground() {
    saveStateToUndo();
    setCurrentSlideBackground(null);
}

async function _insertUploadedVideo(file) {
    if (typeof setProjectSaveHint === "function") {
        setProjectSaveHint("Uploading video…", "warn");
    }

    let content;
    let localMimeType = file.type || "video/mp4";
    try {
        const upload = await _uploadAssetFile(file);
        content = upload.url;
        localMimeType = upload.contentType || localMimeType;
    } catch (err) {
        const backendMissing =
            err?.message === "Backend API unavailable" ||
            /404|NetworkError|Failed to fetch|fetch resource/i.test(err?.message || "");
        if (!backendMissing) throw err;
        content = _createSessionObjectUrl(file);
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Video stored for this session only", "warn");
        }
    }

    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
    const id = generateId("el");
    state.slides[activeIndex].elements.push({
        id,
        type: "video",
        x: 100,
        y: 100,
        width: "480px",
        height: "270px",
        content,
        videoType: "local",
        localMimeType,
        muted: true,
        autoplay: false,
        loop: false,
        styles: { zIndex: getNextZIndex(), borderRadius: "8px" },
    });
    renderSlidesFromState();
    selectElement(id);
    schedulePresentationAutosave?.(150);
}

function _dataUrlToFile(dataUrl, filename = "video.mp4") {
    const parts = String(dataUrl || "").split(",", 2);
    if (parts.length < 2) throw new Error("Invalid data URL");
    const mime = parts[0].match(/^data:([^;]+);base64$/)?.[1] || "application/octet-stream";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
}

async function migrateInlineVideoAssets() {
    if (typeof isBackendApiAvailable === "function" && !isBackendApiAvailable()) return false;
    if (window.__inlineVideoMigrationPromise) return window.__inlineVideoMigrationPromise;

    window.__inlineVideoMigrationPromise = (async () => {
        const candidates = [];
        (state.slides || []).forEach((slide, slideIndex) => {
            (slide.elements || []).forEach((el, elementIndex) => {
                if (el?.type === "video" && typeof el.content === "string" && el.content.startsWith("data:video/")) {
                    candidates.push({ slideIndex, elementIndex, el });
                }
            });
        });

        if (!candidates.length) return false;

        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Optimizing local videos…", "warn");
        }

        let changed = false;
        for (const candidate of candidates) {
            const filename = `${candidate.el.id || "video"}${candidate.el.content.includes("data:video/webm") ? ".webm" : ".mp4"}`;
            const file = _dataUrlToFile(candidate.el.content, filename);
            const upload = await _uploadAssetFile(file);
            const target = state.slides[candidate.slideIndex]?.elements?.[candidate.elementIndex];
            if (!target) continue;
            target.content = upload.url;
            target.videoType = "local";
            changed = true;
        }

        if (changed) {
            renderSlidesFromState?.();
            schedulePresentationAutosave?.(150);
            if (typeof setProjectSaveHint === "function") {
                setProjectSaveHint("Local videos optimized", "success");
            }
        }
        return changed;
    })();

    try {
        return await window.__inlineVideoMigrationPromise;
    } finally {
        window.__inlineVideoMigrationPromise = null;
    }
}

window.addEventListener("beforeunload", () => {
    _sessionObjectUrls.forEach(url => URL.revokeObjectURL(url));
    _sessionObjectUrls.clear();
});

function handleHtmlFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
        const htmlContent = String(ev.target.result || "");
        const activeIndex = ensureActiveSlideSync();
        saveStateToUndo();
        const id = generateId("el");
        state.slides[activeIndex].elements.push({
            id,
            type: "html",
            htmlInteractive: true,
            htmlMode: "responsive",
            x: 120,
            y: 120,
            width: "520px",
            height: "320px",
            content: htmlContent,
            styles: { zIndex: getNextZIndex(), borderRadius: "8px", backgroundColor: "#111827", border: "1px solid #334155" },
        });
        renderSlidesFromState();
        selectElement(id);
    };
    reader.readAsText(file);
}

function _makeTextElement({
    x,
    y,
    width,
    height = null,
    content,
    fontSize,
    fontWeight = "400",
    color = "#172033",
    fontFamily = '"Manrope", sans-serif',
    lineHeight = "1.4",
    textAlign = "left",
    autoHeight = true,
}) {
    return {
        id: generateId("el"),
        type: "text",
        x,
        y,
        width: `${width}px`,
        height: height == null ? "auto" : `${height}px`,
        autoHeight,
        textFitMode: autoHeight ? "autoHeight" : "fixed",
        content,
        styles: {
            color,
            fontSize: `${fontSize}px`,
            fontFamily,
            fontWeight,
            lineHeight,
            textAlign,
            zIndex: 2,
            backgroundColor: "transparent",
        },
    };
}

function _makeImageElement({ x, y, width, height, content }) {
    return {
        id: generateId("el"),
        type: "image",
        x,
        y,
        width: `${width}px`,
        height: `${height}px`,
        lockAspectRatio: true,
        imageAspectRatio: Math.max(0.01, width / Math.max(1, height)),
        content,
        styles: {
            zIndex: 2,
            borderRadius: "12px",
        },
    };
}

function _makeEquationElement({ x, y, width = 320, height = 88, latexSrc }) {
    let renderedHtml = latexSrc;
    try {
        if (typeof katex !== "undefined") {
            renderedHtml = katex.renderToString(latexSrc, { throwOnError: false, displayMode: true });
        }
    } catch (err) {
        renderedHtml = latexSrc;
    }
    return {
        id: generateId("el"),
        type: "equation",
        latexSrc,
        x,
        y,
        width: `${width}px`,
        height: `${height}px`,
        content: renderedHtml,
        styles: {
            color: "#172033",
            fontSize: "20px",
            zIndex: 3,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: "12px",
            border: "1px solid rgba(148,163,184,0.22)",
        },
    };
}

function _makeShapeElement({
    x,
    y,
    width,
    height,
    backgroundColor,
    border = null,
    borderRadius = "0px",
    opacity = null,
    zIndex = 1,
}) {
    return {
        id: generateId("el"),
        type: "shape",
        shapeType: "rectangle",
        x,
        y,
        width: `${width}px`,
        height: `${height}px`,
        content: "",
        styles: {
            backgroundColor,
            ...(border ? { border } : {}),
            ...(opacity !== null ? { opacity: String(opacity) } : {}),
            borderRadius,
            zIndex,
        },
    };
}

function _normalizeImportedImagePath(rawPath) {
    const value = String(rawPath || "").trim();
    if (!value) return "";
    if (/^(data:|https?:\/\/|blob:|\/(?:assets|media|extracted_figures)\/|assets\/)/i.test(value)) {
        return value;
    }

    const normalized = value.replace(/\\/g, "/");
    const mediaIdx = normalized.lastIndexOf("/media/");
    if (mediaIdx !== -1) {
        return normalized.slice(mediaIdx);
    }
    const extractedIdx = normalized.lastIndexOf("/extracted_figures/");
    if (extractedIdx !== -1) {
        return normalized.slice(extractedIdx);
    }
    const fileName = normalized.split("/").pop();
    return fileName ? `/extracted_figures/${fileName}` : value;
}

function _buildBulletContent(points) {
    const rows = [];
    (Array.isArray(points) ? points : []).forEach(point => {
        const heading = _bridgeWordClamp(point?.heading, 7);
        const bullets = Array.isArray(point?.content) ? point.content : [point?.content];
        if (heading) {
            rows.push({ html: `<strong>${heading}</strong>`, level: 0 });
        }
        bullets
            .map(item => _bridgeWordClamp(item, 22))
            .filter(Boolean)
            .forEach(item => rows.push({ html: item, level: heading ? 1 : 0 }));
    });
    return rows.length ? rows : [{ html: "Imported content", level: 0 }];
}

function _bridgeWordClamp(text, maxWords = 22) {
    const words = _bridgeCleanImportedText(text).split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return words.join(" ");
    return `${words.slice(0, maxWords).join(" ")}...`;
}

function _bridgeTokenSet(text) {
    const stop = new Set([
        "the", "and", "for", "with", "that", "this", "from", "into", "over", "under", "across", "after",
        "before", "figure", "panel", "shows", "show", "display", "displays", "result", "results", "using",
        "method", "methods", "simulation", "simulations",
    ]);
    return new Set(
        String(text || "")
            .toLowerCase()
            .match(/[a-z0-9][a-z0-9-]{2,}/g)
            ?.filter(token => !stop.has(token)) || [],
    );
}

function _bridgeTextMatchScore(left, right) {
    const a = _bridgeTokenSet(left);
    const b = _bridgeTokenSet(right);
    if (!a.size || !b.size) return 0;
    let overlap = 0;
    a.forEach(token => {
        if (b.has(token)) overlap += 1;
    });
    return overlap / Math.max(1, Math.min(a.size, b.size));
}

function _bridgeSlideMatchText(slide) {
    const parts = [slide?.title, slide?.claim, slide?.goal];
    (Array.isArray(slide?.points) ? slide.points : []).forEach(point => {
        parts.push(point?.heading);
        const content = Array.isArray(point?.content) ? point.content : [point?.content];
        parts.push(...content);
    });
    return parts.filter(Boolean).join(" ");
}

function _bridgeChoosePrimaryVisual(slide) {
    const visuals = Array.isArray(slide?.visuals) ? slide.visuals.filter(item => item?.path) : [];
    if (!visuals.length) return null;
    const preferred = slide?.primary_visual_id ? visuals.find(item => item.id === slide.primary_visual_id) : null;
    if (preferred) return preferred;
    const weakPreferredId = slide?.fig_id || slide?.visual_id;
    const slideText = _bridgeSlideMatchText(slide);
    return visuals
        .map((visual, index) => ({
            visual,
            index,
            score: _bridgeTextMatchScore(slideText, [visual.caption, visual.finding, visual.type, visual.id].filter(Boolean).join(" ")),
            preferred: weakPreferredId && visual.id === weakPreferredId ? 1 : 0,
        }))
        .sort((a, b) => (b.score - a.score) || (b.preferred - a.preferred) || (a.index - b.index))[0].visual;
}

function _normalizeBridgeContentSlide(slide) {
    const visuals = Array.isArray(slide?.visuals) ? slide.visuals.filter(Boolean) : [];
    const primaryVisual = _bridgeChoosePrimaryVisual({ ...slide, visuals });
    const normalizedFigPath =
        typeof slide?.fig_path === "string" && slide.fig_path.trim()
            && (!primaryVisual || primaryVisual.id === slide?.visual_id || primaryVisual.path === slide.fig_path)
            ? slide.fig_path
            : primaryVisual?.path || "";
    const normalizedFigCap =
        typeof slide?.fig_cap === "string" && slide.fig_cap.trim()
            ? slide.fig_cap
            : primaryVisual?.caption || "";

    return {
        ...slide,
        visuals,
        visual_id: primaryVisual?.id || slide?.visual_id || null,
        fig_path: normalizedFigPath,
        fig_cap: normalizedFigCap,
    };
}

function _bridgePlanPrimaryVisuals(slides) {
    const contentSlides = (slides || []).filter(slide => slide?.type === "content");
    const visualUsage = new Map();
    const candidates = [];

    contentSlides.forEach((slide, slideIndex) => {
        const primary = _bridgeChoosePrimaryVisual(slide);
        if (primary?.id) visualUsage.set(primary.id, (visualUsage.get(primary.id) || 0) + 1);
        (Array.isArray(slide.visuals) ? slide.visuals : []).forEach(visual => {
            if (!visual?.id || !visual?.path) return;
            candidates.push({
                slide,
                slideIndex,
                visual,
                score: _bridgeTextMatchScore(
                    _bridgeSlideMatchText(slide),
                    [visual.caption, visual.finding, visual.type, visual.id].filter(Boolean).join(" "),
                ),
            });
        });
    });

    const allVisualIds = new Set(candidates.map(item => item.visual.id));
    allVisualIds.forEach(visualId => {
        if (visualUsage.has(visualId)) return;
        const best = candidates
            .filter(item => item.visual.id === visualId)
            .sort((a, b) => (b.score - a.score) || ((visualUsage.get(_bridgeChoosePrimaryVisual(a.slide)?.id) || 0) - (visualUsage.get(_bridgeChoosePrimaryVisual(b.slide)?.id) || 0)))[0];
        if (!best) return;
        const previous = _bridgeChoosePrimaryVisual(best.slide);
        if (previous?.id) visualUsage.set(previous.id, Math.max(0, (visualUsage.get(previous.id) || 1) - 1));
        best.slide.primary_visual_id = best.visual.id;
        visualUsage.set(best.visual.id, 1);
    });

    return slides;
}

function _bridgeSlideMetrics(slide) {
    const points = Array.isArray(slide?.points) ? slide.points : [];
    let bulletCount = 0;
    let wordCount = 0;
    for (const point of points) {
        const heading = String(point?.heading || "").trim();
        if (heading) wordCount += heading.split(/\s+/).filter(Boolean).length;
        const bullets = Array.isArray(point?.content) ? point.content : [point?.content];
        for (const bullet of bullets) {
            const clean = String(bullet || "").trim();
            if (!clean) continue;
            bulletCount += 1;
            wordCount += clean.split(/\s+/).filter(Boolean).length;
        }
    }
    return {
        pointCount: points.length,
        bulletCount,
        wordCount,
        hasFigure: Boolean(slide?.fig_path),
        hasCaption: Boolean(slide?.fig_cap),
    };
}

function _bridgeIsDenseSlide(slide) {
    const metrics = _bridgeSlideMetrics(slide);
    return metrics.wordCount >= 62 || metrics.bulletCount >= 5 || (metrics.hasFigure && metrics.wordCount >= 42);
}

function _bridgePointsAsCards(points, maxCards = 3) {
    return (Array.isArray(points) ? points : [])
        .map(point => {
            const heading = _bridgeCleanImportedText(point?.heading, "Takeaway");
            const bullets = (Array.isArray(point?.content) ? point.content : [point?.content])
                .map(item => _bridgeCleanImportedText(item))
                .filter(Boolean);
            return {
                heading: _bridgeWordClamp(heading, 6),
                body: _bridgeWordClamp(bullets.join(" "), 28),
            };
        })
        .filter(card => card.heading || card.body)
        .slice(0, maxCards);
}

function _bridgeNarrativeSummary(points, maxSentences = 2) {
    const chunks = [];
    _bridgePointsAsCards(points, maxSentences + 1).forEach(card => {
        if (card.body) chunks.push(card.body);
    });
    return chunks.slice(0, maxSentences).join(" ");
}

function _bridgeVisualMeta(theme) {
    return {
        accent: theme.accentStrong || "#2563EB",
        accentSoft: `${theme.accentStrong || "#2563EB"}18`,
        text: theme.defaultTextColor,
        muted: theme.defaultMutedColor,
        headingFont: theme.headingFont,
        bodyFont: theme.bodyFont,
        surface: theme.surfaceColor || "rgba(255,255,255,0.72)",
        surfaceBorder: theme.surfaceBorder || "rgba(148,163,184,0.22)",
    };
}

function _bridgeBuildPresetSlide(presetId, theme, mutator = null) {
    if (typeof buildPresetSlideState === "function" && SLIDE_PRESETS?.[presetId]) {
        const slideState = buildPresetSlideState(presetId, theme, {
            slideId: generateId("slide"),
            notes: "",
            background: "",
        });
        if (mutator) mutator(slideState.elements || []);
        return slideState;
    }
    return { id: generateId("slide"), layoutId: presetId, elements: [] };
}

function _bridgeTextPlain(value) {
    return String(value || "").replace(/<[^>]*>/g, "").trim();
}

const BRIDGE_CASE_ACRONYMS = [
    "MD", "ML", "AI", "DNA", "RNA", "PDB", "RMSD", "RMSF", "PCA", "UMAP", "t-SNE", "GNN", "CNN", "RNN",
    "AUC", "ROC", "MSE", "RMSE", "MAE", "GPU", "CPU", "NVT", "NPT", "PMF", "MSM", "FEP", "TI",
];

function _bridgeHumanizeImportedCase(value) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const letters = raw.match(/[A-Za-z]/g) || [];
    if (letters.length < 8 && !/\s/.test(raw)) return raw;
    const uppercase = letters.filter(ch => ch === ch.toUpperCase()).length;
    const lowercase = letters.filter(ch => ch === ch.toLowerCase()).length;
    if (uppercase / letters.length < 0.78 || lowercase > 2) return raw;
    let text = raw.toLowerCase();
    text = text.replace(/(^|[.!?:]\s+)([a-z])/g, (_, prefix, ch) => `${prefix}${ch.toUpperCase()}`);
    BRIDGE_CASE_ACRONYMS.forEach(acronym => {
        const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), acronym);
    });
    text = text.replace(/\b([a-z]+)(\d+)\b/g, (_, word, number) => `${word.toUpperCase()}${number}`);
    return text;
}

function _bridgeCleanImportedText(value, fallback = "") {
    const cleaned = String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/^[•\-\u2022]\s*/, "").trim();
    return cleaned ? _bridgeHumanizeImportedCase(cleaned) : fallback;
}

function _bridgeIsPlaceholderText(text) {
    return /^(imported presentation|imported (slide )?content|imported figure|imported section from the source document|insert figure( \/ chart)? here|chart \/ graph placeholder|insert figure or chart here|insert chart:.*)$/i.test(
        String(text || "").replace(/[\[\]]/g, "").trim(),
    );
}

function _bridgeFindText(elements, matcher) {
    return (elements || []).find(el => el.type === "text" && matcher(_bridgeTextPlain(el.content), el));
}

function _bridgeSetTextByPlaceholder(elements, placeholder, content) {
    const el = _bridgeFindText(elements, text => text === placeholder);
    if (el) el.content = content || "";
    return el;
}

function _bridgeSetTextByPlaceholders(elements, placeholders, content) {
    for (const placeholder of placeholders) {
        const el = _bridgeSetTextByPlaceholder(elements, placeholder, content);
        if (el) return el;
    }
    return null;
}

function _bridgeSetFirstBulletBlock(elements, content, options = {}) {
    const el = (elements || []).find(item => item.type === "text" && Array.isArray(item.content));
    if (!el) return null;
    el.content = content;
    if (options.x != null) el.x = options.x;
    if (options.y != null) el.y = options.y;
    if (options.width != null) el.width = `${options.width}px`;
    if (options.fontSize) el.styles.fontSize = options.fontSize;
    return el;
}

function _bridgeBulletPlainText(item) {
    if (typeof item === "string") return _bridgeCleanImportedText(item);
    return _bridgeCleanImportedText(item?.html || item?.text || "");
}

function _bridgeSetBulletLines(elements, content, options = {}) {
    const structured = _bridgeSetFirstBulletBlock(elements, content, options);
    if (structured) return structured;
    const bulletTexts = (Array.isArray(content) ? content : [])
        .map(_bridgeBulletPlainText)
        .filter(Boolean);
    if (!bulletTexts.length) return null;
    const bulletEls = (elements || []).filter(item => item.type === "text" && /^•\s+/.test(_bridgeTextPlain(item.content)));
    bulletEls.forEach((el, idx) => {
        el.content = bulletTexts[idx] ? `• ${bulletTexts[idx]}` : "";
    });
    return bulletEls[0] || null;
}

function _bridgeContentText(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => _bridgeTextPlain(item?.html || item?.text || ""))
            .filter(Boolean)
            .join(" ");
    }
    return _bridgeTextPlain(value);
}

function _bridgeTextLineCount(value, charsPerLine) {
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => {
            const text = _bridgeTextPlain(item?.html || item?.text || "");
            if (!text) return sum;
            return sum + Math.max(1, Math.ceil(text.length / charsPerLine)) + (item?.level ? 0.15 : 0.35);
        }, 0);
    }
    const chunks = String(_bridgeTextPlain(value) || "").split(/\n+/).filter(Boolean);
    if (!chunks.length) return 1;
    return chunks.reduce((sum, chunk) => sum + Math.max(1, Math.ceil(chunk.length / charsPerLine)), 0);
}

function _bridgeFitTextElement(el, { maxHeight, minFontSize = 11, minLineHeight = 1.16 } = {}) {
    if (!el || el.type !== "text" || !maxHeight) return;
    const width = parseFloat(el.width) || 320;
    const styles = el.styles || {};
    const originalFont = parseFloat(styles.fontSize) || 18;
    let fontSize = originalFont;
    let lineHeight = parseFloat(styles.lineHeight) || 1.35;
    const text = _bridgeContentText(el.content);
    if (!text) return;

    for (let i = 0; i < 16; i += 1) {
        const charsPerLine = Math.max(8, Math.floor(width / Math.max(5.5, fontSize * 0.54)));
        const lines = _bridgeTextLineCount(el.content, charsPerLine);
        const estimatedHeight = Math.ceil(lines * fontSize * lineHeight + 10);
        if (estimatedHeight <= maxHeight || fontSize <= minFontSize) break;
        if (lineHeight > minLineHeight + 0.01) {
            lineHeight = Math.max(minLineHeight, lineHeight - 0.05);
        } else {
            fontSize = Math.max(minFontSize, fontSize - 1);
        }
    }

    el.styles = {
        ...styles,
        fontSize: `${Math.round(fontSize)}px`,
        lineHeight: String(Number(lineHeight.toFixed(2))),
        overflow: "hidden",
    };
    el.height = `${maxHeight}px`;
    el.autoHeight = false;
}

function _bridgeFindNearText(elements, x, y, tolerance = 8) {
    return (elements || []).find(el => {
        if (el.type !== "text") return false;
        return Math.abs((parseFloat(el.x) || 0) - x) <= tolerance && Math.abs((parseFloat(el.y) || 0) - y) <= tolerance;
    });
}

function _bridgeApplyContentAwareFit(slideState) {
    const layoutId = slideState?.layoutId;
    const elements = slideState?.elements || [];
    const fitAt = (x, y, maxHeight, options = {}) => _bridgeFitTextElement(_bridgeFindNearText(elements, x, y), { maxHeight, ...options });
    const fitArrayText = (index, maxHeight, options = {}) => {
        const el = elements.filter(item => item.type === "text" && Array.isArray(item.content))[index];
        _bridgeFitTextElement(el, { maxHeight, ...options });
    };

    if (layoutId === "title-page") {
        fitAt(80, 220, 126, { minFontSize: 30, minLineHeight: 1.02 });
        fitAt(80, 358, 36, { minFontSize: 13 });
        fitAt(80, 400, 56, { minFontSize: 11 });
        return slideState;
    }
    if (layoutId === "section-divider") {
        fitAt(400, 270, 72, { minFontSize: 26, minLineHeight: 1.02 });
        fitAt(400, 355, 112, { minFontSize: 13 });
        return slideState;
    }
    if (layoutId === "content-slide") {
        fitAt(76, 44, 60, { minFontSize: 24, minLineHeight: 1.02 });
        fitAt(54, 126, 42, { minFontSize: 13 });
        fitArrayText(0, 370, { minFontSize: 14, minLineHeight: 1.18 });
        fitAt(790, 384, 72, { minFontSize: 12 });
        return slideState;
    }
    if (layoutId === "two-column") {
        fitAt(76, 22, 62, { minFontSize: 24, minLineHeight: 1.05 });
        fitArrayText(0, 548, { minFontSize: 13, minLineHeight: 1.18 });
        fitArrayText(1, 548, { minFontSize: 13, minLineHeight: 1.18 });
        return slideState;
    }
    if (layoutId === "figure-caption") {
        fitAt(76, 22, 62, { minFontSize: 23, minLineHeight: 1.05 });
        fitAt(54, 106, 36, { minFontSize: 12 });
        fitAt(54, 582, 48, { minFontSize: 10 });
        fitAt(698, 202, 122, { minFontSize: 12, minLineHeight: 1.18 });
        fitAt(698, 330, 34, { minFontSize: 15 });
        fitAt(698, 368, 52, { minFontSize: 10 });
        return slideState;
    }
    if (layoutId === "results-data") {
        fitAt(76, 22, 62, { minFontSize: 23, minLineHeight: 1.05 });
        fitAt(54, 106, 34, { minFontSize: 12 });
        fitAt(54, 538, 46, { minFontSize: 10 });
        [136, 276, 416].forEach(y => {
            fitAt(716, y + 18, 36, { minFontSize: 14 });
            fitAt(716, y + 58, 44, { minFontSize: 10 });
        });
        return slideState;
    }
    if (layoutId === "conclusion") {
        fitAt(76, 18, 58, { minFontSize: 26, minLineHeight: 1.05 });
        fitArrayText(0, 432, { minFontSize: 13, minLineHeight: 1.18 });
        fitAt(54, 614, 44, { minFontSize: 10 });
    }
    return slideState;
}

function _bridgeSlideSummary(slide) {
    const direct = _bridgeNarrativeSummary(slide?.points, 1);
    return direct || String(slide?.claim || slide?.goal || slide?.fig_cap || slide?.title || "");
}

function _bridgePresetForContentSlide(slide) {
    const title = String(slide?.title || "");
    const hint = String(slide?.layout_hint || "").toLowerCase();
    const metrics = _bridgeSlideMetrics(slide);
    if (/summary|conclusion|impact/.test(hint)) return "conclusion";
    if (/comparison|compare|contrast/.test(hint)) return slide?.fig_path ? "results-data" : "two-column";
    if (/results|data|metric|benchmark/.test(hint)) return "results-data";
    if (/figure|mechanism|workflow/.test(hint) && slide?.fig_path) return "figure-caption";
    if (/text|argument|setup|problem/.test(hint) && !slide?.fig_path) return metrics.pointCount >= 3 ? "two-column" : "content-slide";
    if (/future|impact|implication|conclusion|summary|takeaway|limit|direction/i.test(title)) return "conclusion";
    if (slide?.fig_path) return "figure-caption";
    if (metrics.pointCount >= 4 || metrics.bulletCount >= 7 || metrics.wordCount >= 78) return "two-column";
    if (/result|finding|data|performance|metric|accuracy|increase|decrease|effect/i.test(title)) return "results-data";
    return "content-slide";
}

function _bridgeHydrateContentPreset(slideState, slide, theme) {
    const elements = slideState.elements || [];
    const title = _bridgeCleanImportedText(slide?.title, "Imported Slide");
    const summary = _bridgeWordClamp(_bridgeSlideSummary(slide), 18);
    const bullets = _buildBulletContent(slide.points);
    const presetId = slideState.layoutId;

    if (presetId === "figure-caption") {
        _bridgeSetTextByPlaceholders(elements, ["Results / Figure", "Trajectory result"], title);
        _bridgeSetTextByPlaceholder(elements, "FIGURE", "Figure");
        _bridgeSetTextByPlaceholders(elements, [
            "Key finding stated as a clear assertion — the figure supports this claim",
            "Replace the placeholder with RMSD, free-energy, PCA, contact, or clustering plots.",
        ], summary);
        _bridgeSetTextByPlaceholders(elements, [
            "Figure 1. Descriptive caption explaining the figure content.",
            "Figure 1. Short caption describing the simulation system, model, and key observation.",
        ], _bridgeWordClamp(slide.fig_cap || summary || title, 26));
        _bridgeSetTextByPlaceholders(elements, ["Key Insight", "Interpretation"], "Interpretation");
        const insight =
            _bridgeFindText(elements, text => text.startsWith("Explain what this result means"))
            || _bridgeFindText(elements, text => text.startsWith("What changed in the ensemble"));
        if (insight) insight.content = _bridgeWordClamp(_bridgeNarrativeSummary(slide.points, 2) || summary || slide.fig_cap || title, 34);
        const stat = _bridgeFindText(elements, text => text === "p < 0.001");
        if (stat) stat.content = _bridgeWordClamp((slide.points?.[0]?.heading || "Evidence"), 5);
        const sig = _bridgeFindText(elements, text => text === "Statistical significance");
        if (sig) sig.content = _bridgeWordClamp(slide.fig_cap || slide.points?.[0]?.content?.[0] || "Figure evidence", 9);
        elements.push(
            _makeImageElement({
                x: 72,
                y: 162,
                width: 564,
                height: slide.fig_cap ? 382 : 420,
                content: _normalizeImportedImagePath(slide.fig_path),
            }),
        );
        return;
    }

    if (presetId === "two-column") {
        _bridgeSetTextByPlaceholders(elements, ["Comparative Analysis", "Two complementary views"], title);
        _bridgeSetTextByPlaceholder(elements, "COMPARE", "Compare");
        _bridgeSetTextByPlaceholder(elements, "Use this layout to compare physical simulation and learned models.", summary);
        const midpoint = Math.ceil(bullets.length / 2);
        const left = bullets.slice(0, midpoint);
        const right = bullets.slice(midpoint);
        const textBlocks = elements.filter(item => item.type === "text" && Array.isArray(item.content));
        if (textBlocks[0]) textBlocks[0].content = left.length ? left : bullets;
        if (textBlocks[1]) textBlocks[1].content = right.length ? right : bullets.slice(0, 2);
        _bridgeSetTextByPlaceholders(elements, ["Column A", "Molecular dynamics"], slide.fig_path ? "Figure evidence" : "Evidence");
        _bridgeSetTextByPlaceholders(elements, ["Column B", "Machine learning"], "Model implication");
        if (!textBlocks.length) {
            const bulletEls = elements.filter(item => item.type === "text" && /^•\s+/.test(_bridgeTextPlain(item.content)));
            const leftEls = bulletEls.filter(el => (parseFloat(el.x) || 0) < 500);
            const rightEls = bulletEls.filter(el => (parseFloat(el.x) || 0) >= 500);
            leftEls.forEach((el, idx) => { el.content = left[idx] ? `• ${_bridgeBulletPlainText(left[idx])}` : ""; });
            rightEls.forEach((el, idx) => { el.content = right[idx] ? `• ${_bridgeBulletPlainText(right[idx])}` : ""; });
        }
        return;
    }

    if (presetId === "results-data") {
        _bridgeSetTextByPlaceholders(elements, ["Key Results", "Quantitative summary"], title);
        _bridgeSetTextByPlaceholder(elements, "RESULTS", "Results");
        _bridgeSetTextByPlaceholders(elements, [
            "Main finding stated as a clear assertion — the chart below supports this",
            "Use simple metrics that are easy to edit and defend.",
        ], summary);
        _bridgeSetTextByPlaceholder(elements, "Figure 1. Short caption for chart.", _bridgeWordClamp(slide.fig_cap || summary || title, 20));
        const labels = _bridgePointsAsCards(slide.points, 3);
        ["p < 0.001", "n = 1,024", "R² = 0.94"].forEach((placeholder, idx) => {
            const el = _bridgeSetTextByPlaceholder(elements, placeholder, labels[idx]?.heading || ["Finding", "Evidence", "Impact"][idx]);
            if (el) el.styles.fontSize = "24px";
        });
        ["3 x 500 ns", "5 clusters", "0.91"].forEach((placeholder, idx) => {
            const el = _bridgeSetTextByPlaceholder(elements, placeholder, labels[idx]?.heading || ["Finding", "Evidence", "Impact"][idx]);
            if (el) el.styles.fontSize = "24px";
        });
        ["Statistical Significance", "Sample Size", "Model Fit"].forEach((placeholder, idx) => {
            _bridgeSetTextByPlaceholder(elements, placeholder, labels[idx]?.body || summary || title);
        });
        ["Trajectory", "States", "Model AUC"].forEach((placeholder, idx) => {
            _bridgeSetTextByPlaceholder(elements, placeholder, labels[idx]?.body || summary || title);
        });
        if (slide.fig_path) {
            elements.push(
                _makeImageElement({
                    x: 72,
                    y: 154,
                    width: 584,
                    height: 354,
                    content: _normalizeImportedImagePath(slide.fig_path),
                }),
            );
        }
        return;
    }

    if (presetId === "conclusion") {
        _bridgeSetTextByPlaceholder(elements, "Conclusions", title);
        _bridgeSetTextByPlaceholder(elements, "WRAP-UP", "Wrap-up");
        _bridgeSetTextByPlaceholder(elements, "Keep the final slide direct and editable.", summary);
        _bridgeSetBulletLines(elements, bullets);
        _bridgeSetTextByPlaceholders(elements, ["Acknowledgements · Funding · Grant Reference", "Acknowledgements - compute resources - funding"], summary);
        _bridgeSetTextByPlaceholders(elements, ["author@university.edu", "email@institute.edu"], "");
        return;
    }

    _bridgeSetTextByPlaceholders(elements, ["Slide Title", "Key claim from simulation and learning"], title);
    _bridgeSetTextByPlaceholders(elements, [
        "One clear assertion that summarises the content on this slide",
        "State one result clearly, then support it with evidence.",
    ], summary);
    _bridgeSetTextByPlaceholders(elements, ["Signal", "Finding", "FINDING"], _bridgeWordClamp(slide.points?.[0]?.heading || "Takeaway", 3));
    _bridgeSetBulletLines(elements, bullets);
    const takeHome = _bridgeFindText(elements, text => text.startsWith("A compact sentence explaining why"));
    if (takeHome) takeHome.content = _bridgeWordClamp(_bridgeNarrativeSummary(slide.points, 2) || summary || title, 28);
}

function _bridgeFinalizeSlide(slideState) {
    if (!slideState) return slideState;
    slideState.elements = (slideState.elements || []).filter(el => {
        if (el.type !== "text") return true;
        const text = _bridgeContentText(el.content);
        if (!text) return false;
        return !_bridgeIsPlaceholderText(text);
    });
    return _bridgeApplyContentAwareFit(slideState);
}

function _makeBeamerHeader(theme, sectionTitle) {
    const ui = _bridgeVisualMeta(theme);
    return [
        _makeShapeElement({
            x: 0, y: 0, width: 1024, height: 72,
            backgroundColor: ui.accent,
            zIndex: 1,
            borderRadius: "0px"
        }),
        _makeTextElement({
            x: 40, y: 20, width: 944,
            content: String(sectionTitle || "Overview"),
            fontSize: 26, fontWeight: "700", color: "#ffffff", fontFamily: ui.headingFont,
            textAlign: "left"
        })
    ];
}

function _makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides) {
    const ui = _bridgeVisualMeta(theme);
    const content = `${String(presentationTitle || "Presentation")} — Slide ${slideNumber} of ${totalSlides}`;
    return [
        _makeShapeElement({
            x: 0, y: 736, width: 1024, height: 32,
            backgroundColor: "rgba(0,0,0,0.04)",
            zIndex: 1,
            borderRadius: "0px"
        }),
        _makeTextElement({
            x: 40, y: 742, width: 944,
            content: content,
            fontSize: 12, fontWeight: "500", color: ui.muted, fontFamily: ui.bodyFont,
            textAlign: "center"
        })
    ];
}

function _createBridgeTitleSlide(data, theme, presentationTitle, slideNumber, totalSlides) {
    return _bridgeFinalizeSlide(_bridgeBuildPresetSlide("title-page", theme, elements => {
        _bridgeSetTextByPlaceholders(elements, ["RESEARCH PRESENTATION", "Molecular Dynamics and Machine Learning"], data.journal_name || "Imported Presentation");
        _bridgeSetTextByPlaceholder(elements, "Research Title Goes Here", _bridgeCleanImportedText(presentationTitle, "Imported Presentation"));
        _bridgeSetTextByPlaceholders(elements, ["Author Name · Co-Author Name", "Author Name - Group / Institute - Date"], data.authors || "");
        const metaText = [data.journal_name, data.publish_date, data.doi ? `DOI: ${data.doi}` : ""].filter(Boolean).join(" · ");
        _bridgeSetTextByPlaceholders(elements, [
            "Department · University · Conference 2025",
            "MD trajectories | protein dynamics | learned representations",
        ], metaText || _bridgeCleanImportedText(data.sub, "AI-generated research presentation"));
        _bridgeSetTextByPlaceholder(elements, "contact@university.edu", "");
    }));
/*
    const ui = _bridgeVisualMeta(theme);
    const summary = String(data.sub || "AI-generated research presentation");
    const elements = [
        _makeShapeElement({
            x: 0, y: 0, width: 1024, height: 768,
            backgroundColor: ui.surface, opacity: 0.18, zIndex: 1, borderRadius: "0px"
        }),
        _makeShapeElement({
            x: 0, y: 160, width: 1024, height: 340,
            backgroundColor: ui.accent, opacity: 0.05, zIndex: 1, borderRadius: "0px"
        }),
        _makeShapeElement({
            x: 0, y: 160, width: 16, height: 340,
            backgroundColor: ui.accent, zIndex: 2, borderRadius: "0px"
        }),
        _makeTextElement({
            x: 80, y: 200, width: 864,
            content: presentationTitle,
            fontSize: 50, fontWeight: "800", color: ui.text, fontFamily: ui.headingFont, lineHeight: "1.15",
        }),
        _makeTextElement({
            x: 80, y: 380, width: 864,
            content: summary,
            fontSize: 24, fontWeight: "500", color: ui.muted, fontFamily: ui.bodyFont, lineHeight: "1.45",
        }),
    ];

    if (data.authors) {
        elements.push(
            _makeTextElement({
                x: 80, y: 540, width: 864,
                content: String(data.authors),
                fontSize: 20, fontWeight: "600", color: ui.text, fontFamily: ui.bodyFont, lineHeight: "1.3",
            })
        );
    }
    
    let metaText = [];
    if (data.journal_name) metaText.push(String(data.journal_name));
    if (data.publish_date) metaText.push(String(data.publish_date));
    if (data.doi) metaText.push(`DOI: ${data.doi}`);

    if (metaText.length > 0) {
        elements.push(
            _makeTextElement({
                x: 80, y: 580, width: 864,
                content: metaText.join(" | "),
                fontSize: 16, fontWeight: "500", color: ui.muted, fontFamily: ui.bodyFont, lineHeight: "1.3",
            })
        );
    }

    elements.push(..._makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides));

    return {
        id: generateId("slide"),
        elements
    };
*/
}

function _createBridgeSectionSlide(slide, theme, presentationTitle, slideNumber, totalSlides) {
    return _bridgeFinalizeSlide(_bridgeBuildPresetSlide("section-divider", theme, elements => {
        _bridgeSetTextByPlaceholder(elements, "02", String(Math.max(1, slideNumber - 1)).padStart(2, "0"));
        _bridgeSetTextByPlaceholder(elements, "Section Title", _bridgeCleanImportedText(slide.title, "Section"));
        const description = slide.goal || slide.claim || slide.summary || presentationTitle || "";
        _bridgeSetTextByPlaceholders(elements, [
            "A brief description of what this section covers",
            "Short framing sentence for this part of the MD/ML story.",
        ], _bridgeWordClamp(description, 18));
    }));
/*
    const ui = _bridgeVisualMeta(theme);
    return {
        id: generateId("slide"),
        elements: [
            _makeShapeElement({
                x: 0, y: 0, width: 1024, height: 768,
                backgroundColor: ui.accent, opacity: 0.9, zIndex: 1, borderRadius: "0px"
            }),
            _makeTextElement({
                x: 80, y: 330, width: 864,
                content: "Section",
                fontSize: 24, fontWeight: "700", color: "rgba(255,255,255,0.7)", fontFamily: ui.bodyFont, lineHeight: "1.2",
            }),
            _makeTextElement({
                x: 80, y: 380, width: 864,
                content: String(slide.title || "Section"),
                fontSize: 56, fontWeight: "800", color: "#ffffff", fontFamily: ui.headingFont, lineHeight: "1.15",
            }),
            ..._makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides)
        ],
    };
*/
}

function _createBridgeEvidenceSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides) {
    const slideState = _bridgeBuildPresetSlide("figure-caption", theme);
    _bridgeHydrateContentPreset(slideState, slide, theme);
    return _bridgeFinalizeSlide(slideState);
/*
    const ui = _bridgeVisualMeta(theme);
    const hasFigure = Boolean(slide.fig_path);
    const bulletContent = _buildBulletContent(slide.points);
    const dense = _bridgeIsDenseSlide(slide);

    const elements = [
        ..._makeBeamerHeader(theme, currentSectionName),
        _makeTextElement({
            x: 40, y: 110, width: 944,
            content: String(slide.title || "Content"),
            fontSize: 34, fontWeight: "700", color: ui.text, fontFamily: ui.headingFont, lineHeight: "1.2",
        }),
        _makeTextElement({
            x: 40, y: 180, width: hasFigure ? 440 : 944,
            content: bulletContent,
            fontSize: dense ? 18 : 22, fontWeight: "400", color: ui.text, fontFamily: ui.bodyFont, lineHeight: "1.5",
        }),
        ..._makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides)
    ];

    if (hasFigure) {
        elements.push(
            _makeImageElement({
                x: 520, y: 180, width: 460, height: slide.fig_cap ? 460 : 500,
                content: _normalizeImportedImagePath(slide.fig_path),
            })
        );
        if (slide.fig_cap) {
            elements.push(
                _makeTextElement({
                    x: 520, y: 660, width: 460,
                    content: _bridgeWordClamp(String(slide.fig_cap), 30),
                    fontSize: 14, fontWeight: "400", color: ui.muted, fontFamily: ui.bodyFont, lineHeight: "1.35",
                })
            );
        }
    }

    return { id: generateId("slide"), elements };
*/
}

function _createBridgeArgumentSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides) {
    const presetId = _bridgePresetForContentSlide(slide);
    const slideState = _bridgeBuildPresetSlide(presetId, theme);
    _bridgeHydrateContentPreset(slideState, slide, theme);
    return _bridgeFinalizeSlide(slideState);
/*
    const ui = _bridgeVisualMeta(theme);
    const bulletContent = _buildBulletContent(slide.points);
    const hasFigure = Boolean(slide.fig_path);
    
    const elements = [
        ..._makeBeamerHeader(theme, currentSectionName),
        _makeTextElement({
            x: 40, y: 110, width: 944,
            content: String(slide.title || "Content"),
            fontSize: 34, fontWeight: "700", color: ui.text, fontFamily: ui.headingFont, lineHeight: "1.2",
        }),
        _makeTextElement({
            x: 40, y: 180, width: hasFigure ? 460 : 944,
            content: bulletContent,
            fontSize: 22, fontWeight: "400", color: ui.text, fontFamily: ui.bodyFont, lineHeight: "1.5",
        }),
        ..._makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides)
    ];

    if (hasFigure) {
        elements.push(
            _makeImageElement({
                x: 540, y: 180, width: 440, height: slide.fig_cap ? 400 : 440,
                content: _normalizeImportedImagePath(slide.fig_path),
            })
        );
        if (slide.fig_cap) {
            elements.push(
                _makeTextElement({
                    x: 540, y: 630, width: 440,
                    content: _bridgeWordClamp(String(slide.fig_cap), 30),
                    fontSize: 14, fontWeight: "400", color: ui.muted, fontFamily: ui.bodyFont, lineHeight: "1.35",
                })
            );
        }
    }
    return { id: generateId("slide"), elements };
*/
}

function _createBridgeSummarySlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides) {
    const slideState = _bridgeBuildPresetSlide("conclusion", theme);
    _bridgeHydrateContentPreset(slideState, slide, theme);
    return _bridgeFinalizeSlide(slideState);
/*
    const ui = _bridgeVisualMeta(theme);
    const bulletContent = _buildBulletContent(slide.points);
    
    return {
        id: generateId("slide"),
        elements: [
            ..._makeBeamerHeader(theme, currentSectionName),
            _makeShapeElement({
                x: 40, y: 110, width: 944, height: 100,
                backgroundColor: ui.accentSoft, borderRadius: "12px", zIndex: 1
            }),
            _makeTextElement({
                x: 60, y: 140, width: 900,
                content: String(slide.title || "Summary"),
                fontSize: 36, fontWeight: "700", color: ui.accent, fontFamily: ui.headingFont, lineHeight: "1.2",
            }),
            _makeTextElement({
                x: 40, y: 240, width: 944,
                content: bulletContent,
                fontSize: 22, fontWeight: "400", color: ui.text, fontFamily: ui.bodyFont, lineHeight: "1.6",
            }),
            ..._makeBeamerFooter(theme, presentationTitle, slideNumber, totalSlides)
        ],
    };
*/
}

function _createBridgeContentSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides) {
    const hasFigure = Boolean(slide.fig_path);
    const pointCount = (Array.isArray(slide.points) ? slide.points.length : 0);
    const dense = _bridgeIsDenseSlide(slide);
    const summaryLike = /future|impact|implication|conclusion|limit|direction/i.test(String(slide.title || ""));
    const hint = String(slide?.layout_hint || "").toLowerCase();
    
    if (summaryLike && pointCount >= 2) {
        return _createBridgeSummarySlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides);
    }
    if (/text|summary/.test(hint) && !hasFigure) {
        return _createBridgeArgumentSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides);
    }
    if (/comparison|results|data/.test(hint)) {
        return _createBridgeArgumentSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides);
    }
    if (hasFigure && !dense && (slideNumber % 2 === 0 || pointCount <= 2)) {
        return _createBridgeEvidenceSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides);
    }
    return _createBridgeArgumentSlide(slide, theme, currentSectionName, presentationTitle, slideNumber, totalSlides);
}

function _attachBridgeEquations(slideState, slide) {
    const equations = Array.isArray(slide?.equations) ? slide.equations : [];
    const usable = equations.filter(item => item && (
        (typeof item.path === "string" && item.path.trim())
        || (typeof item.latex === "string" && item.latex.trim())
    )).slice(0, slide?.equation_slide ? 4 : 1);
    if (!usable.length) return slideState;

    if (slide?.equation_slide) {
        const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : {};
        const elements = (slideState.elements || []).filter(el => !(el.type === "text" && Array.isArray(el.content)));
        usable.forEach((equation, idx) => {
            elements.push(_makeTextElement({
                x: 64,
                y: 158 + idx * 132,
                width: 190,
                height: 34,
                content: String(equation.label || `Equation ${idx + 1}`),
                fontSize: 18,
                fontWeight: "700",
                color: theme.accentStrong || "#2563EB",
                fontFamily: theme.headingFont || '"Manrope", sans-serif',
                lineHeight: "1.2",
                autoHeight: false,
            }));
            if (equation.path) {
                elements.push(_makeImageElement({
                    x: 274,
                    y: 140 + idx * 132,
                    width: 660,
                    height: 92,
                    content: _normalizeImportedImagePath(equation.path),
                }));
            } else {
                elements.push(_makeEquationElement({
                    x: 274,
                    y: 140 + idx * 132,
                    width: 660,
                    height: 92,
                    latexSrc: equation.latex,
                }));
            }
        });
        return _bridgeFinalizeSlide({ ...slideState, elements });
    }

    const hasFigure = Boolean(slide?.fig_path);
    const first = usable[0];
    const eqEl = first.path
        ? _makeImageElement({
            x: hasFigure ? 590 : 660,
            y: hasFigure ? 652 : 620,
            width: hasFigure ? 300 : 280,
            height: 70,
            content: _normalizeImportedImagePath(first.path),
        })
        : _makeEquationElement({
            x: hasFigure ? 590 : 660,
            y: hasFigure ? 652 : 620,
            width: hasFigure ? 300 : 280,
            height: 70,
            latexSrc: first.latex,
        });
    return {
        ...slideState,
        elements: [...(slideState.elements || []), eqEl],
    };
}

function _looksLikeBridgeExport(data) {
    return Boolean(
        data &&
        Array.isArray(data.slides) &&
        data.slides.every(slide => slide && typeof slide === "object" && "type" in slide && !("elements" in slide)),
    );
}

function _bridgeInferPresentationTitle(data) {
    const direct = _bridgeCleanImportedText(data?.title);
    if (direct && !/^untitled|imported presentation$/i.test(direct)) return direct;
    const firstContent = (data?.slides || []).find(slide => slide?.type === "content" && String(slide?.title || "").trim());
    if (firstContent?.title) return _bridgeCleanImportedText(firstContent.title);
    const firstSection = (data?.slides || []).find(slide => slide?.type === "section" && String(slide?.title || "").trim());
    if (firstSection?.title) return _bridgeCleanImportedText(firstSection.title);
    return direct || "Imported Presentation";
}

function _convertBridgeExportToEditorState(data) {
    const themeId = state.presentationTheme || "editorial";
    const theme = getPresentationTheme(themeId);
    const targetPageSetup = getPresentationPageSetupId();
    const bridgeBaseConfig = PRESENTATION_PAGE_SETUPS[DEFAULT_PRESENTATION_PAGE_SETUP];
    const targetConfig = getPresentationPageSetupConfig();
    const slides = [];

    const addBridgeSlide = slideState => {
        const nextSlide =
            targetConfig.id === bridgeBaseConfig.id
                ? slideState
                : scaleSlideElementsForPageSetup(slideState, bridgeBaseConfig, targetConfig);
        slides.push(nextSlide);
    };

    const presentationTitle = _bridgeInferPresentationTitle(data);
    const shouldAddTitleSlide = Boolean(presentationTitle || data.sub || data.authors || data.journal_name || data.doi);
    const totalSlides = (data.slides || []).length + (shouldAddTitleSlide ? 1 : 0);
    let currentSlideNumber = 1;

    if (shouldAddTitleSlide) {
        addBridgeSlide(_createBridgeTitleSlide(data, theme, presentationTitle, currentSlideNumber++, totalSlides));
    }

    let currentSectionName = "";
    
    const bridgeSlides = _bridgePlanPrimaryVisuals((data.slides || []).map(slide => ({ ...slide })));

    for (const slide of bridgeSlides) {
        if (slide.type === "section") {
            currentSectionName = slide.title || "Section";
            addBridgeSlide(_createBridgeSectionSlide(slide, theme, presentationTitle, currentSlideNumber++, totalSlides));
        } else if (slide.type === "content") {
            const normalizedSlide = _normalizeBridgeContentSlide(slide);
            addBridgeSlide(
                _attachBridgeEquations(
                    _createBridgeContentSlide(normalizedSlide, theme, currentSectionName, presentationTitle, currentSlideNumber++, totalSlides),
                    normalizedSlide,
                ),
            );
        }
    }

    return {
        presentationTheme: themeId,
        pageSetup: targetPageSetup,
        slides: slides.length ? slides : [{ id: generateId("slide"), elements: [] }],
        selectedIds: [],
        clipboard: null,
    };
}

function showAIImportProgress(message = "Preparing AI import…", percent = 0, eventName = "queued") {
    const modal = document.getElementById("ai-import-progress-modal");
    const cardEl = document.getElementById("ai-import-progress-card");
    const titleEl = document.getElementById("ai-import-progress-title");
    const messageEl = document.getElementById("ai-import-progress-message");
    const barEl = document.getElementById("ai-import-progress-bar");
    const labelEl = document.getElementById("ai-import-progress-label");
    const eventEl = document.getElementById("ai-import-progress-event");
    if (modal) modal.classList.remove("hidden");
    if (modal) modal.classList.add("flex");
    if (cardEl) {
        cardEl.classList.remove("border-emerald-200", "bg-emerald-50/70");
        cardEl.classList.add("border-slate-200", "bg-white");
    }
    if (titleEl) titleEl.textContent = "AI Import In Progress";
    if (messageEl) messageEl.textContent = message;
    if (barEl) {
        barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        barEl.classList.remove("from-emerald-500", "to-teal-500");
        barEl.classList.add("from-violet-500", "to-sky-500");
    }
    if (labelEl) labelEl.textContent = `${Math.round(percent)}%`;
    if (eventEl) eventEl.textContent = eventName;
}

function showAIImportSuccess(message = "Presentation generated successfully!") {
    const modal = document.getElementById("ai-import-progress-modal");
    const cardEl = document.getElementById("ai-import-progress-card");
    const titleEl = document.getElementById("ai-import-progress-title");
    const messageEl = document.getElementById("ai-import-progress-message");
    const barEl = document.getElementById("ai-import-progress-bar");
    const labelEl = document.getElementById("ai-import-progress-label");
    const eventEl = document.getElementById("ai-import-progress-event");
    if (modal) modal.classList.remove("hidden");
    if (modal) modal.classList.add("flex");
    if (cardEl) {
        cardEl.classList.remove("border-slate-200", "bg-white");
        cardEl.classList.add("border-emerald-200", "bg-emerald-50/70");
    }
    if (titleEl) titleEl.textContent = "AI Import Complete";
    if (messageEl) messageEl.textContent = message;
    if (barEl) {
        barEl.style.width = "100%";
        barEl.classList.remove("from-violet-500", "to-sky-500");
        barEl.classList.add("from-emerald-500", "to-teal-500");
    }
    if (labelEl) labelEl.textContent = "100%";
    if (eventEl) eventEl.textContent = "success";
}

function hideAIImportProgress() {
    const modal = document.getElementById("ai-import-progress-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

function importPresentationData(data, { showSuccessAlert = true } = {}) {
    let importedState = null;

    if (_looksLikeBridgeExport(data)) {
        importedState = _convertBridgeExportToEditorState(data);
    } else if (data.slides) {
        importedState = {
            ...data,
            presentationTheme: data.presentationTheme || state.presentationTheme || "editorial",
        };
    }

    if (!importedState) {
        throw new Error("Unsupported presentation JSON format.");
    }

    saveStateToUndo();
    state = importedState;
    if (typeof setCurrentPresentationTitle === "function" && data?.title) {
        setCurrentPresentationTitle(data.title);
    }
    setCurrentSlideIndex(0);
    normalizeStateIds();
    applyPresentationTheme(state.presentationTheme, { persist: false });
    renderSlidesFromState();
    updateSlideCounter();
    if (typeof schedulePresentationAutosave === "function") {
        schedulePresentationAutosave(0);
    }
    if (showSuccessAlert) {
        setProjectSaveHint?.("Presentation imported successfully", "success");
    }
}

async function runAIPdfImport(file) {
    showAIImportProgress("Uploading PDF…", 4, "upload");

    const formData = new FormData();
    formData.append("file", file, file.name);

    const startResp = await _apiFetch(`/api/ai-import-start?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: formData,
    });
    if (!startResp.ok) {
        let msg = `Upload failed (${startResp.status})`;
        try {
            const errData = await startResp.json();
            if (errData.error) msg = errData.error;
        } catch (e) {}
        throw new Error(msg);
    }

    const startData = await startResp.json();
    const jobId = startData.job_id;
    if (!jobId) {
        throw new Error("AI import server did not return a job id.");
    }

    let lastPercent = 4;
    for (;;) {
        const statusResp = await _apiFetch(`/api/ai-import-status?job_id=${encodeURIComponent(jobId)}`);
        if (!statusResp.ok) {
            throw new Error(`Status check failed (${statusResp.status})`);
        }
        const status = await statusResp.json();
        lastPercent = Math.max(lastPercent, Number(status.percent) || 0);
        showAIImportProgress(
            status.message || "Processing PDF…",
            lastPercent,
            status.event || status.state || "running",
        );

        if (status.state === "completed") {
            showAIImportProgress("Importing generated slides…", 99, "import");
            if (status.presentation_id && typeof adoptPresentationRecord === "function") {
                adoptPresentationRecord(status.presentation_id, status.result?.title || "Imported Presentation", 1);
            }
            importPresentationData(status.result, { showSuccessAlert: false });
            showAIImportSuccess(`Presentation generated successfully${status.result?.title ? `: ${status.result.title}` : "!"}`);
            setTimeout(() => hideAIImportProgress(), 1400);
            setProjectSaveHint?.("AI import complete", "success");
            return;
        }
        if (status.state === "failed") {
            throw new Error(status.error || "PDF processing failed.");
        }
        await new Promise(resolve => setTimeout(resolve, 900));
    }
}

function handleAIJsonUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            importPresentationData(data);
        } catch (err) {
            setProjectSaveHint?.(`Invalid JSON file: ${err.message}`, "danger");
        }
    };
    reader.readAsText(file);
}

async function handleAIImportUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lowerName = String(file.name || "").toLowerCase();
    if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
        try {
            await runAIPdfImport(file);
        } catch (err) {
            hideAIImportProgress();
            setProjectSaveHint?.(`AI PDF import failed: ${err.message}`, "danger");
        }
        return;
    }

    handleAIJsonUpload({ target: { files: [file], value: "" } });
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

function undo() {
    if (undoStack.length === 0) {
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Nothing to undo", "muted");
        }
        return;
    }
    if (restoreUndoState()) {
        renderSlidesFromState();
        clearSelection();
        Reveal.slide(Math.min(currentSlideIndex, state.slides.length - 1));
        updateSlideCounter();
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Action undone", "success");
        }
    }
}

function redo() {
    if (redoStack.length === 0) {
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Nothing to redo", "muted");
        }
        return;
    }
    if (restoreRedoState()) {
        renderSlidesFromState();
        clearSelection();
        Reveal.slide(Math.min(currentSlideIndex, state.slides.length - 1));
        updateSlideCounter();
        if (typeof setProjectSaveHint === "function") {
            setProjectSaveHint("Action redone", "success");
        }
    }
}

// ─── Play Mode ───────────────────────────────────────────────────────────────

async function _syncBrowserFullscreen(shouldEnter) {
    const target = document.getElementById("canvas-wrapper") || document.documentElement;
    const isFullscreen = !!document.fullscreenElement;

    if (shouldEnter && !isFullscreen && target?.requestFullscreen) {
        try {
            await target.requestFullscreen();
            return true;
        } catch (err) {
            console.warn("Entering fullscreen failed:", err);
        }
    } else if (!shouldEnter && isFullscreen && document.exitFullscreen) {
        try {
            await document.exitFullscreen();
            return true;
        } catch (err) {
            console.warn("Exiting fullscreen failed:", err);
        }
    }
    return false;
}

const _presentationToolsState = {
    bound: false,
    chalkEnabled: false,
    laserEnabled: false,
    isDrawing: false,
    lastDrawPoint: null,
    chalkColor: "#fff59d",
};

function _presentationToolsElements() {
    return {
        wrapper: document.getElementById("canvas-wrapper"),
        chalkboard: document.getElementById("presentation-chalkboard"),
        laser: document.getElementById("presentation-laser-pointer"),
        chalkTools: document.getElementById("present-chalk-tools"),
        chalkIndicator: document.getElementById("present-chalk-indicator"),
        chalkColorChip: document.getElementById("present-chalk-color-chip"),
        chalkEraserBtn: document.getElementById("present-chalk-eraser-btn"),
        chalkBtn: document.getElementById("present-chalk-btn"),
        laserBtn: document.getElementById("present-laser-btn"),
        clearBtn: document.getElementById("present-clear-chalk-btn"),
        presenterBtn: document.getElementById("present-presenter-btn"),
        colorInput: document.getElementById("present-chalk-color"),
        fullscreenBtn: document.getElementById("present-menu-fullscreen-btn"),
        exitBtn: document.getElementById("present-exit-btn"),
        menuToggle: document.getElementById("present-menu-toggle"),
        menu: document.getElementById("present-menu"),
        contextMenu: document.getElementById("present-context-menu"),
        contextLaserBtn: document.getElementById("present-context-laser-btn"),
        contextChalkBtn: document.getElementById("present-context-chalk-btn"),
        contextClearBtn: document.getElementById("present-context-clear-btn"),
        contextFullscreenBtn: document.getElementById("present-context-fullscreen-btn"),
        contextExitBtn: document.getElementById("present-context-exit-btn"),
    };
}

function _updatePresentationToolButtons() {
    const {
        chalkBtn,
        laserBtn,
        contextChalkBtn,
        contextLaserBtn,
        fullscreenBtn,
        contextFullscreenBtn,
        menuToggle,
        chalkTools,
        chalkColorChip,
    } =
        _presentationToolsElements();
    chalkBtn?.classList.toggle("is-active", _presentationToolsState.chalkEnabled);
    laserBtn?.classList.toggle("is-active", _presentationToolsState.laserEnabled);
    contextChalkBtn?.classList.toggle("is-active", _presentationToolsState.chalkEnabled);
    contextLaserBtn?.classList.toggle("is-active", _presentationToolsState.laserEnabled);
    const fullscreen = !!document.fullscreenElement;
    fullscreenBtn?.classList.toggle("is-active", fullscreen);
    contextFullscreenBtn?.classList.toggle("is-active", fullscreen);
    menuToggle?.classList.toggle("is-active", _presentationToolsState.chalkEnabled || _presentationToolsState.laserEnabled);
    chalkTools?.classList.toggle("hidden", !_presentationToolsState.chalkEnabled);
    if (chalkColorChip) {
        chalkColorChip.value = _presentationToolsState.chalkColor;
        chalkColorChip.style.boxShadow = `0 0 0 2px ${_presentationToolsState.chalkColor}`;
    }
}

function closePresentationMenus() {
    const { menu, contextMenu } = _presentationToolsElements();
    menu?.classList.add("hidden");
    contextMenu?.classList.add("hidden");
}

function togglePresentationMenu() {
    const { menu, contextMenu } = _presentationToolsElements();
    contextMenu?.classList.add("hidden");
    menu?.classList.toggle("hidden");
}

function openPresentationContextMenu(clientX, clientY) {
    const { contextMenu, menu } = _presentationToolsElements();
    if (!contextMenu) return;
    menu?.classList.add("hidden");
    contextMenu.classList.remove("hidden");
    const margin = 12;
    const width = contextMenu.offsetWidth || 220;
    const height = contextMenu.offsetHeight || 220;
    const left = Math.min(window.innerWidth - width - margin, Math.max(margin, clientX));
    const top = Math.min(window.innerHeight - height - margin, Math.max(margin, clientY));
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
}

function _resizePresentationChalkboard() {
    const { wrapper, chalkboard, laser } = _presentationToolsElements();
    if (!wrapper || !chalkboard) return;
    const slideConfig = getPresentationPageSetupConfig();
    const width = Number(slideConfig.width) || 1024;
    const height = Number(slideConfig.height) || 768;
    const scale = Math.max(0.1, Math.min(wrapper.clientWidth / width, wrapper.clientHeight / height));
    const snapshot =
        chalkboard.width > 0 && chalkboard.height > 0
            ? chalkboard.getContext("2d")?.getImageData(0, 0, chalkboard.width, chalkboard.height)
            : null;

    chalkboard.width = width;
    chalkboard.height = height;
    chalkboard.style.transform = `scale(${scale})`;

    const ctx = chalkboard.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = _presentationToolsState.chalkColor;
    ctx.lineWidth = 5;
    if (snapshot && snapshot.width === width && snapshot.height === height) {
        ctx.putImageData(snapshot, 0, 0);
    }
}

function _getPresentationStagePoint(event) {
    const { chalkboard } = _presentationToolsElements();
    if (!chalkboard) return null;
    const rect = chalkboard.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
        x: Math.max(0, Math.min(chalkboard.width, ((event.clientX - rect.left) / rect.width) * chalkboard.width)),
        y: Math.max(0, Math.min(chalkboard.height, ((event.clientY - rect.top) / rect.height) * chalkboard.height)),
    };
}

function _drawPresentationSegment(from, to) {
    const { chalkboard } = _presentationToolsElements();
    const ctx = chalkboard?.getContext("2d");
    if (!ctx || !from || !to) return;
    ctx.strokeStyle = _presentationToolsState.chalkColor;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
}

function _updatePresentationCursorMode() {
    const { wrapper } = _presentationToolsElements();
    if (!wrapper) return;
    wrapper.classList.toggle("presentation-cursor-hidden", _presentationToolsState.laserEnabled);
    wrapper.classList.toggle("presentation-cursor-chalk", _presentationToolsState.chalkEnabled && !_presentationToolsState.laserEnabled);
}

function setPresentationLaserActive(enabled) {
    _presentationToolsState.laserEnabled = !!enabled;
    const { laser } = _presentationToolsElements();
    laser?.classList.toggle("is-active", _presentationToolsState.laserEnabled);
    if (!_presentationToolsState.laserEnabled && laser) {
        laser.style.left = "-100px";
        laser.style.top = "-100px";
    }
    _updatePresentationToolButtons();
    _updatePresentationCursorMode();
}

function setPresentationChalkActive(enabled) {
    _presentationToolsState.chalkEnabled = !!enabled;
    _presentationToolsState.isDrawing = false;
    _presentationToolsState.lastDrawPoint = null;
    const { chalkboard } = _presentationToolsElements();
    chalkboard?.classList.toggle("is-active", _presentationToolsState.chalkEnabled);
    _updatePresentationToolButtons();
    _updatePresentationCursorMode();
}

function clearPresentationChalkboard() {
    const { chalkboard } = _presentationToolsElements();
    const ctx = chalkboard?.getContext("2d");
    if (!ctx || !chalkboard) return;
    ctx.clearRect(0, 0, chalkboard.width, chalkboard.height);
}

function resetPresentationTools() {
    setPresentationChalkActive(false);
    setPresentationLaserActive(false);
    closePresentationMenus();
}

function initPresentationTools() {
    if (_presentationToolsState.bound) return;
    _presentationToolsState.bound = true;
    const {
        wrapper,
        chalkboard,
        chalkEraserBtn,
        chalkColorChip,
        chalkBtn,
        laserBtn,
        clearBtn,
        presenterBtn,
        colorInput,
        fullscreenBtn,
        exitBtn,
        menuToggle,
        contextLaserBtn,
        contextChalkBtn,
        contextClearBtn,
        contextFullscreenBtn,
        contextExitBtn,
    } = _presentationToolsElements();
    if (!wrapper || !chalkboard) return;

    chalkBtn?.addEventListener("click", () => {
        setPresentationChalkActive(!_presentationToolsState.chalkEnabled);
        closePresentationMenus();
    });
    laserBtn?.addEventListener("click", () => {
        setPresentationLaserActive(!_presentationToolsState.laserEnabled);
        closePresentationMenus();
    });
    clearBtn?.addEventListener("click", () => {
        clearPresentationChalkboard();
        closePresentationMenus();
    });
    presenterBtn?.addEventListener("click", () => {
        openPresenterView();
        closePresentationMenus();
    });
    chalkEraserBtn?.addEventListener("click", () => {
        clearPresentationChalkboard();
    });
    colorInput?.addEventListener("input", event => {
        _presentationToolsState.chalkColor = event.target.value || "#fff59d";
        closePresentationMenus();
        _updatePresentationToolButtons();
    });
    chalkColorChip?.addEventListener("input", event => {
        _presentationToolsState.chalkColor = event.target.value || "#fff59d";
        if (colorInput) colorInput.value = _presentationToolsState.chalkColor;
        _updatePresentationToolButtons();
    });
    fullscreenBtn?.addEventListener("click", async () => {
        if (document.fullscreenElement) {
            await _syncBrowserFullscreen(false);
        } else {
            await _syncBrowserFullscreen(true);
        }
        _updatePresentationToolButtons();
        closePresentationMenus();
    });
    exitBtn?.addEventListener("click", () => {
        closePresentationMenus();
        togglePlayMode();
    });
    menuToggle?.addEventListener("click", event => {
        event.stopPropagation();
        togglePresentationMenu();
    });

    contextLaserBtn?.addEventListener("click", () => {
        setPresentationLaserActive(!_presentationToolsState.laserEnabled);
        closePresentationMenus();
    });
    contextChalkBtn?.addEventListener("click", () => {
        setPresentationChalkActive(!_presentationToolsState.chalkEnabled);
        closePresentationMenus();
    });
    contextClearBtn?.addEventListener("click", () => {
        clearPresentationChalkboard();
        closePresentationMenus();
    });
    contextFullscreenBtn?.addEventListener("click", async () => {
        if (document.fullscreenElement) {
            await _syncBrowserFullscreen(false);
        } else {
            await _syncBrowserFullscreen(true);
        }
        _updatePresentationToolButtons();
        closePresentationMenus();
    });
    contextExitBtn?.addEventListener("click", () => {
        closePresentationMenus();
        togglePlayMode();
    });

    chalkboard.addEventListener("pointerdown", event => {
        if (!_presentationToolsState.chalkEnabled) return;
        const point = _getPresentationStagePoint(event);
        if (!point) return;
        _presentationToolsState.isDrawing = true;
        _presentationToolsState.lastDrawPoint = point;
        _drawPresentationSegment(point, point);
        chalkboard.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    });
    chalkboard.addEventListener("pointermove", event => {
        if (_presentationToolsState.laserEnabled) {
            const { laser } = _presentationToolsElements();
            const rect = wrapper.getBoundingClientRect();
            if (laser) {
                laser.style.left = `${event.clientX - rect.left}px`;
                laser.style.top = `${event.clientY - rect.top}px`;
            }
        }
        if (!_presentationToolsState.chalkEnabled || !_presentationToolsState.isDrawing) return;
        const point = _getPresentationStagePoint(event);
        if (!point || !_presentationToolsState.lastDrawPoint) return;
        _drawPresentationSegment(_presentationToolsState.lastDrawPoint, point);
        _presentationToolsState.lastDrawPoint = point;
        event.preventDefault();
    });
    chalkboard.addEventListener("pointerup", () => {
        _presentationToolsState.isDrawing = false;
        _presentationToolsState.lastDrawPoint = null;
    });
    chalkboard.addEventListener("pointerleave", () => {
        _presentationToolsState.isDrawing = false;
        _presentationToolsState.lastDrawPoint = null;
    });

    wrapper.addEventListener("pointermove", event => {
        if (!_presentationToolsState.laserEnabled) return;
        const { laser } = _presentationToolsElements();
        const rect = wrapper.getBoundingClientRect();
        if (laser) {
            laser.style.left = `${event.clientX - rect.left}px`;
            laser.style.top = `${event.clientY - rect.top}px`;
        }
    });
    wrapper.addEventListener("contextmenu", event => {
        if (!document.body.classList.contains("play-mode-active")) return;
        event.preventDefault();
        openPresentationContextMenu(event.clientX, event.clientY);
    });

    document.addEventListener("mousedown", event => {
        const { menu, contextMenu, menuToggle: toggle } = _presentationToolsElements();
        if (menu?.contains(event.target) || contextMenu?.contains(event.target) || toggle?.contains(event.target)) return;
        closePresentationMenus();
    });

    document.addEventListener("keydown", event => {
        if (!document.body.classList.contains("play-mode-active")) return;
        const key = String(event.key || "").toLowerCase();
        if (key === "b") {
            event.preventDefault();
            setPresentationChalkActive(!_presentationToolsState.chalkEnabled);
        } else if (key === "l") {
            event.preventDefault();
            setPresentationLaserActive(!_presentationToolsState.laserEnabled);
        } else if (key === "x") {
            event.preventDefault();
            clearPresentationChalkboard();
        } else if (key === "m") {
            event.preventDefault();
            togglePresentationMenu();
        } else if (key === "p") {
            event.preventDefault();
            openPresenterView();
        } else if (["arrowright", "arrowdown", "pagedown", " "].includes(key)) {
            event.preventDefault();
            presentationNextStep();
        } else if (["arrowleft", "arrowup", "pageup"].includes(key)) {
            event.preventDefault();
            presentationPrevStep();
        }
    });
}

const _presentationRuntimeState = {
    slideIndex: -1,
    clickGroups: [],
    revealedGroups: 0,
    restorePreviousSlideFully: false,
    channel: null,
    presenterWindow: null,
    presenterStartTs: 0,
    presenterBound: false,
};
const _PRESENTER_SYNC_STORAGE_KEY = "slideforge_presenter_sync";
const _PRESENTER_COMMAND_STORAGE_KEY = "slideforge_presenter_command";

function _getAnimatedSlideEntries(slideIndex) {
    const slide = state.slides?.[slideIndex];
    if (!slide) return [];
    return (slide.elements || [])
        .map(el => ({ el, animation: normalizeElementAnimation(el) }))
        .filter(entry => entry.animation)
        .sort((a, b) => {
            const triggerDelta =
                (a.animation.trigger === "on-slide" ? 0 : 1) - (b.animation.trigger === "on-slide" ? 0 : 1);
            if (triggerDelta !== 0) return triggerDelta;
            const orderDelta = (Number(a.animation.order) || 0) - (Number(b.animation.order) || 0);
            if (orderDelta !== 0) return orderDelta;
            return String(a.el.id).localeCompare(String(b.el.id));
        });
}

function _groupAnimatedEntries(entries) {
    const groups = [];
    entries.forEach(entry => {
        if (entry.animation.trigger !== "on-click") return;
        const order = Number(entry.animation.order) || 0;
        const current = groups[groups.length - 1];
        if (current && current.order === order) {
            current.entries.push(entry);
        } else {
            groups.push({ order, entries: [entry] });
        }
    });
    return groups;
}

function _clearAnimationClasses(dom) {
    if (!dom) return;
    [
        "sf-anim-hidden",
        "sf-anim-visible",
        "sf-anim-playing",
        "sf-anim-effect-fade-in",
        "sf-anim-effect-slide-up",
        "sf-anim-effect-slide-down",
        "sf-anim-effect-slide-left",
        "sf-anim-effect-slide-right",
        "sf-anim-effect-zoom-in",
        "sf-anim-effect-pop-in",
        "sf-anim-effect-wipe-in",
        "sf-anim-effect-pulse",
        "sf-anim-effect-glow",
    ].forEach(className => dom.classList.remove(className));
    dom.style.removeProperty("--sf-anim-duration");
    dom.style.removeProperty("--sf-anim-delay");
    dom.style.removeProperty("--sf-anim-easing");
    dom.style.removeProperty("--sf-anim-distance");
    dom.style.removeProperty("--sf-anim-scale");
}

function _applyAnimationDomState(dom, animation) {
    if (!dom || !animation) return;
    _clearAnimationClasses(dom);
    dom.classList.add(`sf-anim-effect-${animation.effect}`);
    dom.style.setProperty("--sf-base-transform", dom.style.transform || "");
    dom.style.setProperty("--sf-anim-duration", `${Math.max(100, Number(animation.durationMs) || 800)}ms`);
    dom.style.setProperty("--sf-anim-delay", `${Math.max(0, Number(animation.delayMs) || 0)}ms`);
    dom.style.setProperty("--sf-anim-easing", animation.easing || "ease-out");
    dom.style.setProperty("--sf-anim-distance", `${Math.max(8, Number(animation.distancePx) || 48)}px`);
    dom.style.setProperty("--sf-anim-scale", String(Number(animation.scaleFrom) || 0.88));
}

function _hideAnimatedEntry(entry) {
    const dom = document.getElementById(entry.el.id);
    if (!dom) return;
    _applyAnimationDomState(dom, entry.animation);
    dom.classList.remove("sf-anim-visible", "sf-anim-playing");
    dom.classList.add("sf-anim-hidden");
}

function _showAnimatedEntry(entry, { animate = true } = {}) {
    const dom = document.getElementById(entry.el.id);
    if (!dom) return;
    _applyAnimationDomState(dom, entry.animation);
    dom.classList.remove("sf-anim-hidden");
    dom.classList.add("sf-anim-visible");
    if (!animate) {
        dom.classList.remove("sf-anim-playing");
        return;
    }
    dom.classList.remove("sf-anim-playing");
    void dom.offsetWidth;
    dom.classList.add("sf-anim-playing");
}

function _resetAnimatedEntry(entry) {
    const dom = document.getElementById(entry.el.id);
    if (!dom) return;
    _clearAnimationClasses(dom);
}

function _syncPresenterPayload() {
    if (!document.body.classList.contains("play-mode-active")) return;
    const slideConfig = getPresentationPageSetupConfig();
    const currentSection = document.getElementById(state.slides?.[currentSlideIndex]?.id || "");
    const nextSlide = state.slides?.[currentSlideIndex + 1];
    const nextSection = nextSlide ? document.getElementById(nextSlide.id) : null;
    const payload = {
        type: "state",
        currentIndex: currentSlideIndex,
        total: state.slides?.length || 0,
        notes: state.slides?.[currentSlideIndex]?.notes || "",
        elapsedMs: Math.max(0, Date.now() - (_presentationRuntimeState.presenterStartTs || Date.now())),
        slideWidth: Number(slideConfig.width) || 1024,
        slideHeight: Number(slideConfig.height) || 768,
        currentHtml: currentSection ? currentSection.outerHTML : "",
        nextHtml: nextSection ? nextSection.outerHTML : "",
    };
    if (_presentationRuntimeState.channel) {
        _presentationRuntimeState.channel.postMessage(payload);
    } else {
        localStorage.setItem(_PRESENTER_SYNC_STORAGE_KEY, JSON.stringify({ ...payload, stamp: Date.now() }));
    }
}

function _ensurePresenterMessaging() {
    if (_presentationRuntimeState.presenterBound) return;
    _presentationRuntimeState.presenterBound = true;
    if (typeof BroadcastChannel !== "undefined") {
        _presentationRuntimeState.channel = new BroadcastChannel("slideforge-presenter");
        _presentationRuntimeState.channel.addEventListener("message", event => {
            const msg = event.data || {};
            if (msg.type === "command") {
                if (msg.action === "next") presentationNextStep();
                if (msg.action === "prev") presentationPrevStep();
                if (msg.action === "jump") presentationGoToSlide(Number(msg.index) || 0);
                if (msg.action === "reset-timer") {
                    _presentationRuntimeState.presenterStartTs = Date.now();
                    _syncPresenterPayload();
                }
            }
        });
    }
    window.addEventListener("storage", event => {
        if (event.key !== _PRESENTER_COMMAND_STORAGE_KEY || !event.newValue) return;
        try {
            const msg = JSON.parse(event.newValue);
            if (msg.action === "next") presentationNextStep();
            if (msg.action === "prev") presentationPrevStep();
            if (msg.action === "jump") presentationGoToSlide(Number(msg.index) || 0);
            if (msg.action === "reset-timer") {
                _presentationRuntimeState.presenterStartTs = Date.now();
                _syncPresenterPayload();
            }
        } catch (_err) {
            return;
        }
    });
}

function _presenterWindowHtml() {
    const stylesheetMarkup = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(node => node.outerHTML)
        .join("\n");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Presenter View</title>
${stylesheetMarkup}
<style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
.presenter-shell{display:grid;grid-template-columns:minmax(0,1.45fr) 360px;min-height:100vh}
.presenter-main{padding:20px;display:grid;grid-template-rows:auto 1fr auto;gap:14px}
.presenter-side{padding:20px;border-left:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.88);display:flex;flex-direction:column;gap:14px}
.presenter-card{background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.18);border-radius:18px;padding:14px;box-shadow:0 18px 48px rgba(2,6,23,.28)}
.presenter-stage,.presenter-next{position:relative;overflow:hidden;border-radius:16px;background:#020617;display:grid;place-items:center}
.presenter-stage{min-height:0}
.presenter-next{aspect-ratio:16/9}
.presenter-slide-frame{width:100%;height:100%;display:grid;place-items:center}
.presenter-slide-frame section{position:relative !important;visibility:visible !important;opacity:1 !important;pointer-events:none !important;transform:none !important;inset:auto !important}
.presenter-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.presenter-title{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}
.presenter-meta{font-size:28px;font-weight:800}
.presenter-notes{white-space:pre-wrap;font-size:14px;line-height:1.6;color:#cbd5e1;min-height:160px}
.presenter-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.presenter-controls button,.presenter-controls input{border-radius:12px;border:1px solid rgba(148,163,184,.22);background:#0f172a;color:#e2e8f0;padding:10px 12px;font-size:13px}
.presenter-controls button{cursor:pointer;font-weight:700}
</style>
</head>
<body>
<div class="presenter-shell">
  <div class="presenter-main">
    <div class="presenter-head">
      <div><div class="presenter-title">Current Slide</div><div id="presenter-meta" class="presenter-meta">1 / 1</div></div>
      <div><div class="presenter-title">Elapsed</div><div id="presenter-timer" class="presenter-meta">00:00</div></div>
    </div>
    <div class="presenter-card presenter-stage"><div id="presenter-current" class="presenter-slide-frame"></div></div>
    <div class="presenter-controls">
      <button data-action="prev" type="button">Previous</button>
      <button data-action="next" type="button">Next</button>
      <input id="presenter-jump" type="number" min="1" placeholder="Slide #" />
      <button data-action="reset-timer" type="button">Reset Timer</button>
    </div>
  </div>
  <aside class="presenter-side">
    <div class="presenter-card">
      <div class="presenter-title">Next Slide</div>
      <div class="presenter-next"><div id="presenter-next" class="presenter-slide-frame"></div></div>
    </div>
    <div class="presenter-card">
      <div class="presenter-title">Notes</div>
      <div id="presenter-notes" class="presenter-notes">No notes for this slide.</div>
    </div>
  </aside>
</div>
<script>
const syncKey = "${_PRESENTER_SYNC_STORAGE_KEY}";
const commandKey = "${_PRESENTER_COMMAND_STORAGE_KEY}";
const currentEl = document.getElementById("presenter-current");
const nextEl = document.getElementById("presenter-next");
const notesEl = document.getElementById("presenter-notes");
const metaEl = document.getElementById("presenter-meta");
const timerEl = document.getElementById("presenter-timer");
const jumpEl = document.getElementById("presenter-jump");
function formatTime(ms){const s=Math.max(0,Math.floor(ms/1000));const m=String(Math.floor(s/60)).padStart(2,"0");const r=String(s%60).padStart(2,"0");return m+":"+r;}
function updateFromPayload(payload){
  currentEl.innerHTML = payload.currentHtml || "";
  nextEl.innerHTML = payload.nextHtml || "";
  notesEl.textContent = payload.notes || "No notes for this slide.";
  metaEl.textContent = (payload.currentIndex + 1) + " / " + Math.max(1, payload.total || 1);
  timerEl.textContent = formatTime(payload.elapsedMs || 0);
  document.querySelectorAll(".presenter-slide-frame section").forEach(section => {
    section.style.width = (payload.slideWidth || 1024) + "px";
    section.style.height = (payload.slideHeight || 768) + "px";
  });
}
function sendCommand(action, index){
  const msg = { type: "command", action, index, stamp: Date.now() };
  if (window.presenterChannel) window.presenterChannel.postMessage(msg);
  else localStorage.setItem(commandKey, JSON.stringify(msg));
}
if (typeof BroadcastChannel !== "undefined") {
  window.presenterChannel = new BroadcastChannel("slideforge-presenter");
  window.presenterChannel.addEventListener("message", event => {
    const payload = event.data || {};
    if (payload.type === "state") updateFromPayload(payload);
  });
}
window.addEventListener("storage", event => {
  if (event.key === syncKey && event.newValue) {
    try { updateFromPayload(JSON.parse(event.newValue)); } catch (_err) {}
  }
});
document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.getAttribute("data-action");
    if (action === "next" || action === "prev" || action === "reset-timer") sendCommand(action);
  });
});
jumpEl.addEventListener("change", () => sendCommand("jump", Math.max(0, (parseInt(jumpEl.value, 10) || 1) - 1)));
</script>
</body>
</html>`;
}

function openPresenterView() {
    _ensurePresenterMessaging();
    const existing = _presentationRuntimeState.presenterWindow;
    if (existing && !existing.closed) {
        existing.focus();
        _syncPresenterPayload();
        return existing;
    }
    const presenterWindow = window.open("", "slideforge-presenter", "popup=yes,width=1400,height=900");
    if (!presenterWindow) return null;
    presenterWindow.document.open();
    presenterWindow.document.write(_presenterWindowHtml());
    presenterWindow.document.close();
    _presentationRuntimeState.presenterWindow = presenterWindow;
    setTimeout(() => _syncPresenterPayload(), 300);
    return presenterWindow;
}

function _preparePresentationSlideAnimations(slideIndex) {
    _presentationRuntimeState.slideIndex = slideIndex;
    const entries = _getAnimatedSlideEntries(slideIndex);
    entries.forEach(entry => _hideAnimatedEntry(entry));
    entries
        .filter(entry => entry.animation.trigger === "on-slide")
        .forEach(entry => _showAnimatedEntry(entry, { animate: true }));
    _presentationRuntimeState.clickGroups = _groupAnimatedEntries(entries);
    _presentationRuntimeState.revealedGroups = 0;
    if (_presentationRuntimeState.restorePreviousSlideFully) {
        _presentationRuntimeState.revealedGroups = _presentationRuntimeState.clickGroups.length;
        _presentationRuntimeState.clickGroups.forEach(group => group.entries.forEach(entry => _showAnimatedEntry(entry, { animate: false })));
        _presentationRuntimeState.restorePreviousSlideFully = false;
    }
    _syncPresenterPayload();
}

function _runPresentationSlideAnimations(slideIndex) {
    _preparePresentationSlideAnimations(slideIndex);
}

function _revealNextAnimationGroup() {
    const group = _presentationRuntimeState.clickGroups[_presentationRuntimeState.revealedGroups];
    if (!group) return false;
    group.entries.forEach(entry => _showAnimatedEntry(entry, { animate: true }));
    _presentationRuntimeState.revealedGroups += 1;
    _syncPresenterPayload();
    return true;
}

function _hidePreviousAnimationGroup() {
    const previousIndex = _presentationRuntimeState.revealedGroups - 1;
    if (previousIndex < 0) return false;
    const group = _presentationRuntimeState.clickGroups[previousIndex];
    if (!group) return false;
    group.entries.forEach(entry => _hideAnimatedEntry(entry));
    _presentationRuntimeState.revealedGroups = previousIndex;
    _syncPresenterPayload();
    return true;
}

function _hasRevealFragmentAdvance(reverse = false) {
    if (typeof Reveal === "undefined") return false;
    const fn = reverse ? Reveal.prevFragment : Reveal.nextFragment;
    if (typeof fn !== "function") return false;
    return Boolean(fn.call(Reveal));
}

function presentationGoToSlide(index) {
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, Math.max(0, (state.slides?.length || 1) - 1)));
    currentSlideIndex = safeIndex;
    if (typeof Reveal !== "undefined" && typeof Reveal.slide === "function") {
        Reveal.slide(safeIndex, 0, 0);
    } else {
        _preparePresentationSlideAnimations(safeIndex);
    }
}

function presentationNextStep() {
    if (!document.body.classList.contains("play-mode-active")) return false;
    if (_revealNextAnimationGroup()) return true;
    if (_hasRevealFragmentAdvance(false)) {
        _syncPresenterPayload();
        return true;
    }
    const nextIndex = Math.min((state.slides?.length || 1) - 1, currentSlideIndex + 1);
    if (nextIndex === currentSlideIndex) return true;
    presentationGoToSlide(nextIndex);
    return true;
}

function presentationPrevStep() {
    if (!document.body.classList.contains("play-mode-active")) return false;
    if (_hidePreviousAnimationGroup()) return true;
    if (_hasRevealFragmentAdvance(true)) {
        _syncPresenterPayload();
        return true;
    }
    const prevIndex = Math.max(0, currentSlideIndex - 1);
    if (prevIndex === currentSlideIndex) return true;
    _presentationRuntimeState.restorePreviousSlideFully = true;
    presentationGoToSlide(prevIndex);
    return true;
}

async function togglePlayMode() {
    const willPlay = !document.body.classList.contains("play-mode-active");
    if (willPlay) {
        if (typeof suspendEditorZoom === "function") suspendEditorZoom();
        await _syncBrowserFullscreen(true);
    }

    const isPlaying = document.body.classList.toggle("play-mode-active");
    const indices = Reveal.getIndices?.() || {};
    const targetH = Number.isInteger(indices.h) ? indices.h : currentSlideIndex;
    const targetV = Number.isInteger(indices.v) ? indices.v : 0;
    const targetF = Number.isInteger(indices.f) ? indices.f : 0;

    if (window.renderSlidesFromState) {
        window.renderSlidesFromState();
    }

    if (typeof Reveal !== "undefined" && typeof Reveal.configure === "function") {
        Reveal.configure({
            controls: false,
            progress: false,
            keyboard: false,
        });
        Reveal.sync?.();
    }
    requestAnimationFrame(() => {
        if (isPlaying && typeof suspendEditorZoom === "function") suspendEditorZoom();
        Reveal.layout?.();
        Reveal.slide?.(targetH, targetV, targetF);
        if (isPlaying && typeof _resizePresentationChalkboard === "function") {
            requestAnimationFrame(() => _resizePresentationChalkboard());
        }
        
        // Update button UI
        const btn = document.getElementById("btn-present");
        if (btn) {
            if (isPlaying) {
                btn.innerHTML = '<i class="fa-solid fa-stop text-sm text-red-500"></i><span class="text-xs font-medium hidden md:inline">Stop</span>';
                btn.title = "Exit Presentation (Esc)";
            } else {
                btn.innerHTML = '<i class="fa-solid fa-play text-sm"></i><span class="text-xs font-medium hidden md:inline">Present</span>';
                btn.title = "Present";
            }
        }
    });
    if (isPlaying) {
        clearSelection();
        _resizePresentationChalkboard();
        _ensurePresenterMessaging();
        _presentationRuntimeState.presenterStartTs = Date.now();
        _preparePresentationSlideAnimations(currentSlideIndex);
    } else {
        _resetAnimations();
        resetPresentationTools();
        await _syncBrowserFullscreen(false);
        requestAnimationFrame(() => {
            if (typeof restoreEditorZoom === "function") restoreEditorZoom();
        });
    }
}

function handlePresentationFullscreenChange() {
    const isFullscreen = !!document.fullscreenElement;
    const isPlaying = document.body.classList.contains("play-mode-active");
    if (!isFullscreen && isPlaying) {
        document.body.classList.remove("play-mode-active");
        if (window.renderSlidesFromState) {
            window.renderSlidesFromState();
        }
        if (typeof Reveal !== "undefined" && typeof Reveal.configure === "function") {
            Reveal.configure({
                controls: false,
                progress: false,
                keyboard: false,
            });
            Reveal.sync?.();
        }
        requestAnimationFrame(() => {
            Reveal.layout?.();
            Reveal.slide?.(currentSlideIndex, 0, 0);
            const btn = document.getElementById("btn-present");
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-play text-sm"></i><span class="text-xs font-medium hidden md:inline">Present</span>';
                btn.title = "Present";
            }
        });
        _resetAnimations();
        resetPresentationTools();
        requestAnimationFrame(() => {
            if (typeof restoreEditorZoom === "function") restoreEditorZoom();
        });
        try {
            _presentationRuntimeState.presenterWindow?.close?.();
        } catch (_err) {
            // ignore cross-window close errors
        }
        _presentationRuntimeState.presenterWindow = null;
    }
}

function _playSlideAnimations(slideIndex) {
    _runPresentationSlideAnimations(slideIndex);
}

function _resetAnimations() {
    document.querySelectorAll(".canvas-element").forEach(el => _clearAnimationClasses(el));
    _presentationRuntimeState.slideIndex = -1;
    _presentationRuntimeState.clickGroups = [];
    _presentationRuntimeState.revealedGroups = 0;
    _presentationRuntimeState.restorePreviousSlideFully = false;
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportJSON() {
    const filenameBase =
        (typeof currentPresentationTitle !== "undefined" && currentPresentationTitle
            ? currentPresentationTitle
            : "presentation")
            .replace(/[^\w\-]+/g, "_")
            .replace(/^_+|_+$/g, "") || "presentation";
    const a = document.createElement("a");
    a.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2)));
    a.setAttribute("download", `${filenameBase}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportPresentationJson() {
    exportJSON();
}

function importPresentationJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const imported = JSON.parse(event.target.result);
                let importedState = null;
                if (_looksLikeBridgeExport(imported)) {
                    importedState = _convertBridgeExportToEditorState(imported);
                } else if (imported.slides) {
                    importedState = {
                        ...imported,
                        presentationTheme: imported.presentationTheme || state.presentationTheme || "editorial",
                    };
                }
                if (!importedState) {
                    throw new Error("Unsupported presentation JSON format.");
                }
                saveStateToUndo();
                state = importedState;
                normalizeStateIds();
                currentSlideIndex = 0;
                if (typeof setCurrentPresentationTitle === "function") {
                    setCurrentPresentationTitle(
                        imported.title ||
                        file.name.replace(/\.json$/i, "") ||
                        "Imported Presentation",
                    );
                }
                applyPresentationTheme(state.presentationTheme, { persist: false });
                renderSlidesFromState();
                updateSlideCounter();
                if (typeof duplicateCurrentStateToNewProject === "function") {
                    await duplicateCurrentStateToNewProject(currentPresentationTitle);
                }
            } catch (err) {
                setProjectSaveHint?.(`Invalid JSON file: ${err.message}`, "danger");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportPresentationZip() {
    if (typeof exportZip === "function") {
        exportZip();
    } else {
        console.error("exportZip function not found. Ensure export.js is loaded.");
    }
}

function exportPresentationPDF() {
    if (typeof exportPDF === "function") {
        exportPDF();
    } else {
        console.error("exportPDF function not found. Ensure export.js is loaded.");
    }
}

function exportPresentationPPTX() {
    if (typeof exportPPTX === "function") {
        exportPPTX();
    } else {
        console.error("exportPPTX function not found. Ensure export.js is loaded.");
    }
}
