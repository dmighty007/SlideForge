

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
    if (!state.slides[idx]) state.slides[idx] = { id: generateId("slide"), elements: [] };
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
    state.slides.splice(activeIndex + 1, 0, { id: generateId("slide"), elements: [] });
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
        ...(type === "shape" ? { shapeType } : {}),
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
                  : type === "video"
                    ? "270px"
                    : type === "pdf"
                      ? "360px"
                    : "auto",
        content:
            type === "text"
                ? "Double click to edit text"
                : type === "image"
                  ? "https://picsum.photos/400/300"
                  : type === "video"
                    ? "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
                    : type === "pdf"
                      ? ""
                    : "",
        styles: {
            backgroundColor: type === "shape" ? theme.defaultShapeColor : "transparent",
            color: type === "text" ? theme.defaultTextColor : "transparent",
            fontSize: type === "text" ? "32px" : "0px",
            fontFamily: theme.bodyFont,
            textAlign: type === "text" ? "left" : undefined,
            zIndex: 1,
            borderRadius: type === "shape" ? shapeBorderRadius : type === "video" || type === "pdf" ? "8px" : "0px",
        },
    });
    renderSlidesFromState();
    selectElement(id);
}

function addShape(shapeType = "rectangle") {
    addElement("shape", { shapeType });
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
            zIndex: 1,
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
    template.elements.forEach(el => {
        const id = generateId("el");
        state.slides[activeIndex].elements.push({
            ...el,
            id,
            groupId,
            themeManaged: true,
            x: 200 + (el.offsetX || 0),
            y: 200 + (el.offsetY || 0),
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
        el => !state.selectedIds.includes(el.id),
    );
    clearSelection();
    renderSlidesFromState();
}

function deleteElement(id) {
    const activeIndex = ensureActiveSlideSync();
    saveStateToUndo();
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
        if (!el) return;
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
    renderSlidePreviews();
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
        alert("Select a text or image element first.");
        return false;
    }
    _clipboard = { elements: selectedElements };
    try {
        await _copySelectionToSystemClipboard(selectedElements);
        return true;
    } catch (err) {
        console.warn("Explicit clipboard copy failed:", err);
        alert("Clipboard copy was blocked by the browser.");
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
        content: _escapeClipboardText(text),
        styles: {
            color: theme.defaultTextColor,
            fontSize: "28px",
            fontFamily: theme.bodyFont,
            textAlign: "left",
            lineHeight: "1.45",
            zIndex: 1,
            backgroundColor: "transparent",
        },
    };
}

function _createClipboardImageElement(dataUrl, origWidth, origHeight, x = 100, y = 100) {
    const targetWidth = 400;
    const aspect = origHeight / Math.max(1, origWidth);
    return {
        id: generateId("el"),
        type: "image",
        x,
        y,
        width: `${targetWidth}px`,
        height: `${Math.round(targetWidth * aspect)}px`,
        content: dataUrl,
        styles: { zIndex: 1, borderRadius: "8px" },
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

    alert("Nothing usable was found in the clipboard, or clipboard access was blocked.");
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
        alert("Please choose a valid image file.");
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
        
        state.slides[activeIndex].elements.push({
            id,
            type: "image",
            x: 100,
            y: 100,
            width: `${targetWidth}px`,
            height: `${Math.round(targetHeight)}px`,
            content: dataUrl,
            styles: { zIndex: 1, borderRadius: "8px" },
        });
        renderSlidesFromState();
        selectElement(id);
    } catch (err) {
        console.error("Image insert error:", err);
        alert("Failed to process image.");
    }
}

function handleVideoFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
        alert("Please choose a valid video file.");
        return;
    }

    _insertUploadedVideo(file).catch(err => {
        console.error("Video insert error:", err);
        alert(err?.message || "Failed to process video.");
    });
}

async function handlePdfFileInsert(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
        alert("Please choose a valid PDF file.");
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
        styles: { zIndex: 1, borderRadius: "8px", backgroundColor: "#ffffff" },
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

    const response = await fetch("/api/assets/upload/", {
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
        styles: { zIndex: 1, borderRadius: "8px" },
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
            styles: { zIndex: 1, borderRadius: "8px", backgroundColor: "#111827", border: "1px solid #334155" },
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
        const heading = _bridgeWordClamp(String(point?.heading || "").trim(), 7);
        const bullets = Array.isArray(point?.content) ? point.content : [point?.content];
        if (heading) {
            rows.push({ html: `<strong>${heading}</strong>`, level: 0 });
        }
        bullets
            .map(item => _bridgeWordClamp(String(item || "").trim(), 22))
            .filter(Boolean)
            .forEach(item => rows.push({ html: item, level: heading ? 1 : 0 }));
    });
    return rows.length ? rows : [{ html: "Imported content", level: 0 }];
}

function _bridgeWordClamp(text, maxWords = 22) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return words.join(" ");
    return `${words.slice(0, maxWords).join(" ")}...`;
}

function _normalizeBridgeContentSlide(slide) {
    const visuals = Array.isArray(slide?.visuals) ? slide.visuals.filter(Boolean) : [];
    const primaryVisual = visuals.find(item => typeof item.path === "string" && item.path.trim()) || null;
    const normalizedFigPath =
        typeof slide?.fig_path === "string" && slide.fig_path.trim()
            ? slide.fig_path
            : primaryVisual?.path || "";
    const normalizedFigCap =
        typeof slide?.fig_cap === "string" && slide.fig_cap.trim()
            ? slide.fig_cap
            : primaryVisual?.caption || "";

    return {
        ...slide,
        visuals,
        visual_id: slide?.visual_id || primaryVisual?.id || null,
        fig_path: normalizedFigPath,
        fig_cap: normalizedFigCap,
    };
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
            const heading = String(point?.heading || "").trim() || "Takeaway";
            const bullets = (Array.isArray(point?.content) ? point.content : [point?.content])
                .map(item => String(item || "").trim())
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

function _createBridgeTitleSlide(data, theme) {
    const ui = _bridgeVisualMeta(theme);
    const summary = String(data.sub || "AI-generated research presentation");
    return {
        id: generateId("slide"),
        elements: [
            _makeShapeElement({
                x: 0,
                y: 0,
                width: 1024,
                height: 768,
                backgroundColor: ui.surface,
                opacity: 0.18,
                zIndex: 1,
            }),
            _makeShapeElement({
                x: 64,
                y: 104,
                width: 896,
                height: 470,
                backgroundColor: "rgba(255,255,255,0.72)",
                border: `1px solid ${ui.surfaceBorder}`,
                borderRadius: "26px",
                zIndex: 1,
            }),
            _makeShapeElement({
                x: 64,
                y: 104,
                width: 10,
                height: 470,
                backgroundColor: ui.accent,
                borderRadius: "26px 0 0 26px",
                zIndex: 2,
            }),
            _makeTextElement({
                x: 96,
                y: 146,
                width: 740,
                content: "Research story",
                fontSize: 12,
                fontWeight: "700",
                color: ui.accent,
                fontFamily: ui.bodyFont,
                lineHeight: "1.2",
            }),
            _makeTextElement({
                x: 96,
                y: 178,
                width: 780,
                content: String(data.title || "Imported Presentation"),
                fontSize: 48,
                fontWeight: "700",
                color: ui.text,
                fontFamily: ui.headingFont,
                lineHeight: "1.15",
            }),
            _makeTextElement({
                x: 96,
                y: 314,
                width: 700,
                content: summary,
                fontSize: 23,
                fontWeight: "500",
                color: ui.muted,
                fontFamily: ui.bodyFont,
                lineHeight: "1.45",
            }),
            _makeTextElement({
                x: 96,
                y: 616,
                width: 340,
                content: "Imported from AI PDF analysis",
                fontSize: 14,
                fontWeight: "500",
                color: ui.muted,
                fontFamily: ui.bodyFont,
                lineHeight: "1.3",
            }),
        ],
    };
}

function _createBridgeSectionSlide(slide, theme) {
    const ui = _bridgeVisualMeta(theme);
    return {
        id: generateId("slide"),
        elements: [
            _makeShapeElement({
                x: 0,
                y: 0,
                width: 1024,
                height: 768,
                backgroundColor: ui.surface,
                opacity: 0.1,
                zIndex: 1,
            }),
            _makeShapeElement({
                x: 54,
                y: 150,
                width: 912,
                height: 330,
                backgroundColor: "rgba(255,255,255,0.76)",
                border: `1px solid ${ui.surfaceBorder}`,
                borderRadius: "28px",
                zIndex: 1,
            }),
            _makeShapeElement({
                x: 54,
                y: 150,
                width: 14,
                height: 330,
                backgroundColor: ui.accent,
                borderRadius: "28px 0 0 28px",
                zIndex: 2,
            }),
            _makeTextElement({
                x: 96,
                y: 202,
                width: 760,
                content: "Section",
                fontSize: 13,
                fontWeight: "700",
                color: ui.accent,
                fontFamily: ui.bodyFont,
                lineHeight: "1.2",
            }),
            _makeTextElement({
                x: 96,
                y: 234,
                width: 780,
                content: String(slide.title || "Section"),
                fontSize: 44,
                fontWeight: "700",
                color: ui.text,
                fontFamily: ui.headingFont,
                lineHeight: "1.15",
            }),
        ],
    };
}

function _createBridgeEvidenceSlide(slide, theme) {
    const ui = _bridgeVisualMeta(theme);
    const hasFigure = Boolean(slide.fig_path);
    const cards = _bridgePointsAsCards(slide.points, 3);
    const metrics = _bridgeSlideMetrics(slide);
    const lead = _bridgeWordClamp(_bridgeNarrativeSummary(slide.points, 1) || String(slide.fig_cap || ""), 26);
    const cardBodyFont = metrics.wordCount >= 42 ? 14 : 15;
    const elements = [
        _makeShapeElement({
            x: 42,
            y: 36,
            width: 940,
            height: 680,
            backgroundColor: "rgba(255,255,255,0.72)",
            border: `1px solid ${ui.surfaceBorder}`,
            borderRadius: "24px",
            zIndex: 1,
        }),
        _makeTextElement({
            x: 64,
            y: 54,
            width: 860,
            content: String(slide.title || "Content"),
            fontSize: 32,
            fontWeight: "700",
            color: ui.text,
            fontFamily: ui.headingFont,
            lineHeight: "1.2",
        }),
        _makeTextElement({
            x: 64,
            y: 104,
            width: 820,
            content: lead,
            fontSize: metrics.wordCount >= 42 ? 16 : 18,
            fontWeight: "500",
            color: ui.muted,
            fontFamily: ui.bodyFont,
            lineHeight: "1.45",
            height: 42,
            autoHeight: false,
        }),
    ];

    if (hasFigure) {
        elements.push(
            _makeImageElement({
                x: 64,
                y: 158,
                width: metrics.hasCaption ? 520 : 548,
                height: metrics.hasCaption ? 330 : 366,
                content: _normalizeImportedImagePath(slide.fig_path),
            }),
        );
        elements.push(
            _makeShapeElement({
                x: 620,
                y: 158,
                width: 322,
                height: 366,
                backgroundColor: "rgba(248,250,252,0.96)",
                border: `1px solid ${ui.surfaceBorder}`,
                borderRadius: "18px",
                zIndex: 1,
            }),
        );
        cards.forEach((card, idx) => {
            const y = 180 + idx * 108;
            elements.push(
                _makeTextElement({
                    x: 642,
                    y,
                    width: 268,
                    content: card.heading,
                    fontSize: 16,
                    fontWeight: "700",
                    color: ui.accent,
                    fontFamily: ui.bodyFont,
                    lineHeight: "1.2",
                    height: 22,
                    autoHeight: false,
                }),
            );
            elements.push(
                _makeTextElement({
                    x: 642,
                    y: y + 26,
                    width: 268,
                    content: card.body,
                    fontSize: cardBodyFont,
                    fontWeight: "400",
                    color: ui.text,
                    fontFamily: ui.bodyFont,
                    lineHeight: "1.42",
                    height: 74,
                    autoHeight: false,
                }),
            );
        });
        if (slide.fig_cap) {
            elements.push(
                _makeTextElement({
                    x: 64,
                    y: 500,
                    width: 548,
                    content: _bridgeWordClamp(String(slide.fig_cap), 38),
                    fontSize: 12,
                    fontWeight: "400",
                    color: ui.muted,
                    fontFamily: ui.bodyFont,
                    lineHeight: "1.35",
                    height: 50,
                    autoHeight: false,
                }),
            );
        }
    }

    return { id: generateId("slide"), elements };
}

function _createBridgeArgumentSlide(slide, theme) {
    const ui = _bridgeVisualMeta(theme);
    const hasFigure = Boolean(slide.fig_path);
    const cards = _bridgePointsAsCards(slide.points, 3);
    const bulletContent = _buildBulletContent(slide.points);
    const metrics = _bridgeSlideMetrics(slide);
    const dense = _bridgeIsDenseSlide(slide);
    const elements = [
        _makeShapeElement({
            x: 40,
            y: 42,
            width: 944,
            height: 664,
            backgroundColor: "rgba(255,255,255,0.68)",
            border: `1px solid ${ui.surfaceBorder}`,
            borderRadius: "24px",
            zIndex: 1,
        }),
        _makeShapeElement({
            x: 40,
            y: 42,
            width: 10,
            height: 664,
            backgroundColor: ui.accent,
            borderRadius: "24px 0 0 24px",
            zIndex: 2,
        }),
        _makeTextElement({
            x: 72,
            y: 56,
            width: 850,
            content: String(slide.title || "Content"),
            fontSize: 31,
            fontWeight: "700",
            color: ui.text,
            fontFamily: ui.headingFont,
            lineHeight: "1.18",
        }),
        _makeTextElement({
            x: 72,
            y: 122,
            width: hasFigure ? 470 : 840,
            content: bulletContent,
            fontSize: dense ? (hasFigure ? 17 : 18) : hasFigure ? 19 : 21,
            fontWeight: "400",
            color: ui.text,
            fontFamily: ui.bodyFont,
            lineHeight: dense ? "1.42" : "1.52",
            height: hasFigure ? 500 : 520,
            autoHeight: false,
        }),
    ];

    if (hasFigure) {
        elements.push(
            _makeImageElement({
                x: 578,
                y: 144,
                width: dense ? 320 : 344,
                height: dense ? 228 : 258,
                content: _normalizeImportedImagePath(slide.fig_path),
            }),
        );
        elements.push(
            _makeShapeElement({
                x: 578,
                y: dense ? 392 : 428,
                width: 344,
                height: dense ? 210 : 212,
                backgroundColor: "rgba(248,250,252,0.96)",
                border: `1px solid ${ui.surfaceBorder}`,
                borderRadius: "18px",
                zIndex: 1,
            }),
        );
        const insight = cards[0] || { heading: "Why it matters", body: _bridgeNarrativeSummary(slide.points, 2) };
        elements.push(
            _makeTextElement({
                x: 602,
                y: dense ? 414 : 452,
                width: 292,
                content: insight.heading,
                fontSize: 16,
                fontWeight: "700",
                color: ui.accent,
                fontFamily: ui.bodyFont,
                lineHeight: "1.2",
                height: 22,
                autoHeight: false,
            }),
        );
        elements.push(
            _makeTextElement({
                x: 602,
                y: dense ? 442 : 480,
                width: 292,
                content: insight.body,
                fontSize: dense ? 14 : 15,
                fontWeight: "400",
                color: ui.text,
                fontFamily: ui.bodyFont,
                lineHeight: "1.42",
                height: dense ? 92 : 84,
                autoHeight: false,
            }),
        );
        if (slide.fig_cap) {
            elements.push(
                _makeTextElement({
                    x: 578,
                    y: dense ? 608 : 642,
                    width: 344,
                    content: _bridgeWordClamp(String(slide.fig_cap), 26),
                    fontSize: 12,
                    fontWeight: "400",
                    color: ui.muted,
                    fontFamily: ui.bodyFont,
                    lineHeight: "1.3",
                    height: 32,
                    autoHeight: false,
                }),
            );
        }
    }

    return { id: generateId("slide"), elements };
}

function _createBridgeSummarySlide(slide, theme) {
    const ui = _bridgeVisualMeta(theme);
    const cards = _bridgePointsAsCards(slide.points, 3);
    const dense = _bridgeIsDenseSlide(slide);
    const elements = [
        _makeShapeElement({
            x: 56,
            y: 92,
            width: 912,
            height: 540,
            backgroundColor: "rgba(255,255,255,0.74)",
            border: `1px solid ${ui.surfaceBorder}`,
            borderRadius: "24px",
            zIndex: 1,
        }),
        _makeTextElement({
            x: 84,
            y: 118,
            width: 820,
            content: String(slide.title || "Summary"),
            fontSize: 36,
            fontWeight: "700",
            color: ui.text,
            fontFamily: ui.headingFont,
            lineHeight: "1.15",
        }),
    ];

    cards.forEach((card, idx) => {
        const x = 84 + idx * 280;
        elements.push(
            _makeShapeElement({
                x,
                y: 218,
                width: 248,
                height: 280,
                backgroundColor: "rgba(248,250,252,0.95)",
                border: `1px solid ${ui.surfaceBorder}`,
                borderRadius: "18px",
                zIndex: 1,
            }),
        );
        elements.push(
            _makeTextElement({
                x: x + 20,
                y: 244,
                width: 208,
                content: card.heading,
                fontSize: dense ? 16 : 17,
                fontWeight: "700",
                color: ui.accent,
                fontFamily: ui.bodyFont,
                lineHeight: "1.2",
                height: 24,
                autoHeight: false,
            }),
        );
        elements.push(
            _makeTextElement({
                x: x + 20,
                y: 280,
                width: 208,
                content: card.body,
                fontSize: dense ? 14 : 15,
                fontWeight: "400",
                color: ui.text,
                fontFamily: ui.bodyFont,
                lineHeight: "1.42",
                height: 170,
                autoHeight: false,
            }),
        );
    });

    return { id: generateId("slide"), elements };
}

function _createBridgeContentSlide(slide, theme, index = 0, sectionIndex = 0, totalSlides = 1) {
    const hasFigure = Boolean(slide.fig_path);
    const pointCount = (Array.isArray(slide.points) ? slide.points.length : 0);
    const dense = _bridgeIsDenseSlide(slide);
    const summaryLike = /future|impact|implication|conclusion|limit|direction/i.test(String(slide.title || ""));
    if (summaryLike && pointCount >= 2) {
        return _createBridgeSummarySlide(slide, theme);
    }
    if (hasFigure && !dense && (index % 2 === 0 || pointCount <= 2)) {
        return _createBridgeEvidenceSlide(slide, theme);
    }
    return _createBridgeArgumentSlide(slide, theme);
}

function _attachBridgeEquations(slideState, slide) {
    const equations = Array.isArray(slide?.equations) ? slide.equations : [];
    const first = equations.find(item => item && typeof item.latex === "string" && item.latex.trim());
    if (!first) return slideState;

    const hasFigure = Boolean(slide?.fig_path);
    const eqEl = _makeEquationElement({
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
        data.slides.length &&
        data.slides.every(slide => slide && typeof slide === "object" && "type" in slide && !("elements" in slide)),
    );
}

function _convertBridgeExportToEditorState(data) {
    const themeId = state.presentationTheme || "editorial";
    const theme = getPresentationTheme(themeId);
    const slides = [];

    if (data.title || data.sub) {
        slides.push(_createBridgeTitleSlide(data, theme));
    }

    let sectionIndex = -1;
    let contentIndex = 0;
    const contentTotal = (data.slides || []).filter(slide => slide.type === "content").length;
    for (const slide of data.slides || []) {
        if (slide.type === "section") {
            sectionIndex += 1;
            slides.push(_createBridgeSectionSlide(slide, theme));
        } else if (slide.type === "content") {
            const normalizedSlide = _normalizeBridgeContentSlide(slide);
            slides.push(
                _attachBridgeEquations(
                    _createBridgeContentSlide(normalizedSlide, theme, contentIndex, sectionIndex, contentTotal),
                    normalizedSlide,
                ),
            );
            contentIndex += 1;
        }
    }

    return {
        presentationTheme: themeId,
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
        alert("Presentation imported successfully!");
    }
}

async function runAIPdfImport(file) {
    showAIImportProgress("Uploading PDF…", 4, "upload");

    const formData = new FormData();
    formData.append("file", file, file.name);

    const startResp = await fetch(`/api/ai-import-start?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: formData,
    });
    if (!startResp.ok) {
        throw new Error(`Upload failed (${startResp.status})`);
    }

    const startData = await startResp.json();
    const jobId = startData.job_id;
    if (!jobId) {
        throw new Error("AI import server did not return a job id.");
    }

    let lastPercent = 4;
    for (;;) {
        const statusResp = await fetch(`/api/ai-import-status?job_id=${encodeURIComponent(jobId)}`);
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
            alert("Presentation imported successfully!");
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
            alert("Invalid JSON file: " + err.message);
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
            alert(`AI PDF import failed: ${err.message}`);
        }
        return;
    }

    handleAIJsonUpload({ target: { files: [file], value: "" } });
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

function undo() {
    if (restoreUndoState()) {
        renderSlidesFromState();
        clearSelection();
        Reveal.slide(Math.min(currentSlideIndex, state.slides.length - 1));
        updateSlideCounter();
    }
}

function redo() {
    if (restoreRedoState()) {
        renderSlidesFromState();
        clearSelection();
        Reveal.slide(Math.min(currentSlideIndex, state.slides.length - 1));
        updateSlideCounter();
    }
}

// ─── Play Mode ───────────────────────────────────────────────────────────────

function togglePlayMode() {
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
            controls: isPlaying,
            progress: isPlaying,
            keyboard: isPlaying
                ? {
                      66: () => window.RevealChalkboard?.toggleChalkboard?.(),
                      67: () => window.RevealChalkboard?.toggleNotesCanvas?.(),
                  }
                : false,
        });
        Reveal.sync?.();
    }
    requestAnimationFrame(() => {
        Reveal.layout?.();
        Reveal.slide?.(targetH, targetV, targetF);
        
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
        _playSlideAnimations(currentSlideIndex);
    } else {
        _resetAnimations();
    }
}

function _playSlideAnimations(slideIndex) {
    const slide = state.slides[slideIndex];
    if (!slide) return;
    slide.elements.forEach(el => {
        if (!el.animation) return;
        const dom = document.getElementById(el.id);
        if (!dom) return;
        dom.style.transition = "none";
        dom.classList.remove("anim-active");
        dom.classList.add("anim-pending", el.animation);
        setTimeout(() => {
            dom.style.transition = `all ${el.animDuration || 800}ms ease-out`;
            dom.classList.remove("anim-pending");
            dom.classList.add("anim-active");
        }, el.animDelay || 0);
    });
}

function _resetAnimations() {
    document.querySelectorAll(".canvas-element").forEach(el => {
        el.style.transition = "";
        el.classList.remove("anim-pending", "anim-active");
    });
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
                alert("Invalid JSON file: " + err.message);
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
