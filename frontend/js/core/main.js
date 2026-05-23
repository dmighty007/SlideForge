// ─── Global window bindings (Exposed immediately for inline HTML onclick) ─────

window.onload = async () => {
    await initPresentationPersistence();
    bindProjectTitleInput();
    bindUserMenu();
    initPropertiesPanelToggle();
    initLayersPopover();
    normalizeStateIds();
    if (typeof migrateInlineVideoAssets === "function") {
        try {
            await migrateInlineVideoAssets();
        } catch (err) {
            console.warn("Inline video migration failed:", err);
        }
    }
    if (typeof syncPresentationThemeFromState === "function") {
        syncPresentationThemeFromState({ persist: false });
    } else {
        applyPresentationTheme(state.presentationTheme, { persist: false });
    }
    syncPresentationPageSetup();
    if (typeof initZoom === "function") initZoom();
    if (typeof initContextMenu === "function") initContextMenu();

    const slideConfig = getPresentationPageSetupConfig();

    Reveal.initialize({
        embedded: true,
        center: false,
        hash: false,
        transition: "none",
        backgroundTransition: "none",
        width: slideConfig.width,
        height: slideConfig.height,
        margin: 0,
        disableLayout: false,
        controls: false,
        progress: false,
        keyboard: false,
    });

    // Global slide navigation helper used by export routines
    function switchSlide(index) {
        if (typeof Reveal !== "undefined" && Reveal.slide) {
            Reveal.slide(index);
        }
    }
    window.switchSlide = switchSlide;

    const relayoutReveal = () => {
        if (typeof Reveal === "undefined" || !Reveal.isReady?.()) return;
        Reveal.layout();
        const indices = Reveal.getIndices?.();
        Reveal.slide(indices?.h ?? 0, indices?.v ?? 0, indices?.f ?? 0);
    };

    Reveal.on("ready", () => {
        renderSlidesFromState();
        requestAnimationFrame(() => {
            relayoutReveal();
            if (typeof resetZoom === "function") resetZoom();
            requestAnimationFrame(() => {
                relayoutReveal();
                if (typeof applyZoom === "function") applyZoom();
            });
        });
    });

    Reveal.on("slidechanged", event => {
        setCurrentSlideIndex(event.indexh);
        syncPresentationThemeFromState?.({ persist: false });
        updateSlideCounter();
        clearSelection();
        if (typeof syncActiveSlideMedia === "function") {
            requestAnimationFrame(syncActiveSlideMedia);
        }

        if (document.body.classList.contains("play-mode-active")) {
            if (typeof _playSlideAnimations === "function") {
                _playSlideAnimations(event.indexh);
            }
        } else if (typeof centerSlide === "function") {
            // Editor-only recentering. In presentation mode this causes a visible
            // stage bump because the fullscreen wrapper is intentionally fixed.
            centerSlide();
        }
        if (typeof updateActiveSlidePreview === "function") {
            updateActiveSlidePreview(event.indexh);
        } else {
            renderSlidePreviews();
        }
    });

    // Deselect on empty-canvas click (main.js checks isGroupBound; marquee is in interact.js)
    document.getElementById("canvas-wrapper").addEventListener("mousedown", e => {
        if (document.body.classList.contains("play-mode-active")) return;
        const path = e.composedPath();
        const isElement = path.some(n => n.classList?.contains("canvas-element"));
        const isGroupBound = path.some(n => n.id === "group-bound");
        const isUi = path.some(
            n =>
                n.id === "properties-panel" ||
                n.id === "app-toolbar" ||
                n.id === "floating-text-toolbar" ||
                n.closest?.("#floating-text-toolbar"),
        );
        if (!isElement && !isGroupBound && !isUi && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            clearSelection();
        }
    });

    syncPresentationThemeFromState?.({ persist: false });

    syncPresentationPageSetup();
    const shapePickerModal = document.getElementById("shape-picker-modal");
    if (shapePickerModal) {
        shapePickerModal.addEventListener("mousedown", e => {
            if (e.target === shapePickerModal) closeShapePicker();
        });
    }
    window.addEventListener("resize", () =>
        window.requestAnimationFrame(() => {
            relayoutReveal();
            if (typeof handleEditorViewportResize === "function") {
                handleEditorViewportResize();
            }
            updateFloatingToolbars();
        }),
    );
    document.addEventListener("fullscreenchange", () => {
        if (typeof handlePresentationFullscreenChange === "function") {
            handlePresentationFullscreenChange();
        }
        if (typeof _resizePresentationChalkboard === "function") {
            requestAnimationFrame(() => {
                if (
                    typeof _syncPresentationViewportLayout === "function" &&
                    document.body.classList.contains("play-mode-active")
                ) {
                    _syncPresentationViewportLayout();
                } else {
                    _resizePresentationChalkboard();
                }
            });
        }
    });

    initPresentationTools?.();
    initInteract();
    initKeyboard();
    updateSlideCounter();
    runAutosaveSmokeTest();
};

function setPropertiesPanelVisible(visible, { persist = true } = {}) {
    const panel = document.getElementById("properties-panel");
    const button = document.getElementById("toggle-properties-panel");
    if (!panel) return;

    panel.classList.toggle("hidden", !visible);
    if (button) {
        button.setAttribute("aria-pressed", visible ? "true" : "false");
        button.title = visible ? "Hide Properties" : "Show Properties";
    }
    if (persist) {
        localStorage.setItem("pptmaker_properties_panel_visible", visible ? "1" : "0");
    }

    requestAnimationFrame(() => {
        if (typeof handleEditorViewportResize === "function") {
            handleEditorViewportResize();
        } else if (typeof applyZoom === "function") {
            applyZoom({ preserveViewport: true });
        }
        if (typeof updateFloatingToolbars === "function") {
            updateFloatingToolbars();
        }
    });
}
window.setPropertiesPanelVisible = setPropertiesPanelVisible;

function togglePropertiesPanel() {
    const panel = document.getElementById("properties-panel");
    setPropertiesPanelVisible(panel?.classList.contains("hidden"));
}
window.togglePropertiesPanel = togglePropertiesPanel;

function initPropertiesPanelToggle() {
    const saved = localStorage.getItem("pptmaker_properties_panel_visible");
    setPropertiesPanelVisible(saved === "1", { persist: false });
}

function setLayersPopoverVisible(visible) {
    const popover = document.getElementById("layers-popover");
    const button = document.getElementById("toggle-layers-popover");
    if (!popover) return;

    popover.classList.toggle("hidden", !visible);
    if (button) {
        button.setAttribute("aria-pressed", visible ? "true" : "false");
        button.title = visible ? "Hide Layers" : "Layers";
    }
    if (visible && typeof renderLayersList === "function") {
        renderLayersList();
    }
}

function toggleLayersPopover() {
    const popover = document.getElementById("layers-popover");
    closeExportMenu?.();
    closeUserMenu?.();
    setLayersPopoverVisible(popover?.classList.contains("hidden"));
}
window.toggleLayersPopover = toggleLayersPopover;
window.closeLayersPopover = () => setLayersPopoverVisible(false);

function initLayersPopover() {
    if (document.body.dataset.layersPopoverBound === "true") return;
    document.body.dataset.layersPopoverBound = "true";

    document.addEventListener("mousedown", event => {
        const popover = document.getElementById("layers-popover");
        const button = document.getElementById("toggle-layers-popover");
        if (!popover || popover.classList.contains("hidden")) return;
        if (popover.contains(event.target) || button?.contains(event.target)) return;
        setLayersPopoverVisible(false);
    });
}

// ─── Debounced preview refresh (used by properties.js via window) ─────────────

let _previewTimer;

async function runAutosaveSmokeTest() {
    if (new URLSearchParams(window.location.search).get("autosave_smoke") !== "1") return;

    const resultEl = document.createElement("pre");
    resultEl.id = "autosave-smoke-result";
    resultEl.style.cssText =
        "position:fixed;top:8px;left:8px;z-index:9999;background:#fff;color:#111;padding:12px;border:1px solid #ccc;max-width:420px;white-space:pre-wrap;";
    resultEl.textContent = "running";
    document.body.appendChild(resultEl);

    const waitFor = async (fn, timeoutMs = 15000, pollMs = 150) => {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const value = await fn();
            if (value) return value;
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
        throw new Error("Timed out waiting for smoke test state");
    };

    try {
        const presentationId = await waitFor(
            () => currentPresentationId || localStorage.getItem("pptmaker_presentation_id"),
        );
        const initial = await fetch(`/api/presentations/${presentationId}/`).then(r => r.json());
        addSlide();
        await waitFor(async () => {
            const saved = await fetch(`/api/presentations/${presentationId}/`).then(r => r.json());
            return saved.autosaveVersion > initial.autosaveVersion ? saved : null;
        });
        const after = await fetch(`/api/presentations/${presentationId}/`).then(r => r.json());
        resultEl.textContent = JSON.stringify(
            {
                ok: true,
                presentationId,
                initialAutosaveVersion: initial.autosaveVersion,
                initialSlideCount: initial.state?.slides?.length,
                afterAutosaveVersion: after.autosaveVersion,
                afterSlideCount: after.state?.slides?.length,
            },
            null,
            2,
        );
    } catch (err) {
        resultEl.textContent = JSON.stringify(
            {
                ok: false,
                error: err?.message || String(err),
            },
            null,
            2,
        );
    }
}

// ─── Symbol Picker ─────────────────────────────────────────────────────────────

const _symbols = [
    "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω",
    "Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Κ", "Λ", "Μ", "Ν", "Ξ", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω",
    "∞", "∂", "∇", "∫", "∬", "∭", "∮", "∑", "∏", "√", "∛", "∜", "∈", "∉", "∩", "∪", "⊂", "⊃", "⊆", "⊇", "≈", "≠", "≡", "≤", "≥", "±", "×", "÷",
    "→", "←", "↑", "↓", "↔", "⇒", "⇐", "⇔", "⇑", "⇓", "↗", "↘", "↖", "↙", "∀", "∃", "∄", "¬", "∧", "∨", "⊕", "⊗", "∅", "∝", "∠", "⊥", "∥",
    "ℝ", "ℤ", "ℕ", "ℂ", "ℚ", "°", "′", "″", "‰", "‱", "∼", "≃", "≅", "≇", "ℏ", "ℓ", "℃", "℉", "Å", "Ω", "μ", "π",
    "€", "£", "¥", "₹", "₽", "₩", "₿", "$", "¢", "©", "®", "™", "✓", "✗", "★", "☆", "♥", "♦", "♣", "♠", "✓", "✔", "✕", "✖",
    "✝", "☪", "✡", "☯", "♿", "♻", "⚠", "⚡"
];

function openSymbolPicker() {
    captureInlineSelection?.();
    beginFormattingInteraction?.();
    const modal = document.getElementById("symbol-picker-modal");
    const grid = document.getElementById("symbol-grid");
    if (!modal || !grid) return;
    grid.innerHTML = "";
    _symbols.forEach(sym => {
        const btn = document.createElement("button");
        btn.textContent = sym;
        btn.title = sym;
        btn.style.cssText =
            "aspect-ratio:1;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;color:#0F172A;padding:4px;";
        btn.onmouseenter = () => {
            btn.style.background = "#EFF6FF";
            btn.style.borderColor = "#2563EB";
        };
        btn.onmouseleave = () => {
            btn.style.background = "white";
            btn.style.borderColor = "#E5E7EB";
        };
        btn.onpointerdown = e => {
            e.preventDefault();
            restoreInlineSelection?.();
        };
        btn.onclick = () => _insertSymbol(sym);
        grid.appendChild(btn);
    });
    modal.style.display = "flex";
}

function closeSymbolPicker() {
    const modal = document.getElementById("symbol-picker-modal");
    if (modal) modal.style.display = "none";
    requestAnimationFrame(() => endFormattingInteraction?.());
}

function openShapePicker() {
    const modal = document.getElementById("shape-picker-modal");
    if (modal) modal.style.display = "flex";
}

function closeShapePicker() {
    const modal = document.getElementById("shape-picker-modal");
    if (modal) modal.style.display = "none";
}

function insertShapeFromPicker(shapeType) {
    if (typeof addShape === "function") {
        addShape(shapeType);
    }
    closeShapePicker();
}

function insertConnectorFromPicker(connectorType) {
    if (typeof addConnector === "function") {
        addConnector(connectorType);
    }
    closeShapePicker();
}

function _insertSymbol(sym) {
    const activeIndex = typeof currentSlideIndex !== "undefined" ? currentSlideIndex : 0;
    const selectedTextEl = state.slides[activeIndex]?.elements.find(
        e => state.selectedIds.includes(e.id) && e.type === "text",
    );
    if (selectedTextEl) {
        const dom = document.getElementById(selectedTextEl.id);
        const editor = dom?.querySelector(".text-element-content");
        if (editor && editor.contentEditable === "true") {
            saveStateToUndo();
            restoreInlineSelection?.();
            const inserted = document.execCommand?.("insertText", false, sym);
            if (!inserted) {
                const selection = window.getSelection?.();
                if (selection && selection.rangeCount) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    const node = document.createTextNode(sym);
                    range.insertNode(node);
                    range.setStartAfter(node);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
            updateElementState(selectedTextEl.id, { content: editor.innerHTML });
            selectedTextEl.content = editor.innerHTML;
            captureInlineSelection?.();
            const layout = syncTextBoxLayout?.(dom, selectedTextEl);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(selectedTextEl.id, { height: `${layout.height}px` });
                selectedTextEl.height = `${layout.height}px`;
            }
            refreshPreviews?.();
        } else {
            // Append to end of content
            saveStateToUndo();
            const cur = typeof selectedTextEl.content === "string" ? selectedTextEl.content : "";
            updateElementState(selectedTextEl.id, { content: cur + sym });
            renderSlidesFromState();
        }
    } else {
        // Create new text element with symbol
        saveStateToUndo();
        const id = generateId("el");
        const theme =
            typeof getPresentationTheme === "function"
                ? getPresentationTheme()
                : { defaultTextColor: "#ffffff", bodyFont: "Inter, sans-serif" };
        state.slides[activeIndex].elements.push({
            id,
            type: "text",
            x: 200,
            y: 200,
            width: "120px",
            height: "auto",
            autoHeight: true,
            textFitMode: "autoHeight",
            content: sym,
            styles: {
                color: theme.defaultTextColor,
                fontSize: "48px",
                fontFamily: theme.bodyFont,
                zIndex: getNextZIndex(),
            },
        });
        renderSlidesFromState();
        selectElement(id);
    }
    closeSymbolPicker();
}

// ─── Grouping Logic ──────────────────────────────────────────────────────────

function groupSelected() {
    if (state.selectedIds.length < 2) return;
    saveStateToUndo();
    const groupId = generateId("group");
    state.selectedIds.forEach(id => {
        updateElementState(id, { groupId });
    });
    buildPropertiesPanel();
}

function ungroupSelected() {
    if (state.selectedIds.length === 0) return;
    saveStateToUndo();

    // Collect all groupIds present in selection
    const groupIdsToClear = new Set();
    state.selectedIds.forEach(id => {
        const el = state.slides[currentSlideIndex].elements.find(e => e.id === id);
        if (el?.groupId) groupIdsToClear.add(el.groupId);
    });

    if (groupIdsToClear.size === 0) return;

    // Clear these groupIds from ALL elements on the slide
    state.slides[currentSlideIndex].elements.forEach(el => {
        if (el.groupId && groupIdsToClear.has(el.groupId)) {
            updateElementState(el.id, { groupId: null });
        }
    });

    buildPropertiesPanel();
}

window.groupSelected = groupSelected;
window.ungroupSelected = ungroupSelected;

// ─── Equation Element ─────────────────────────────────────────────────────────

function addEquationElement(latexSrc) {
    const activeIndex = typeof currentSlideIndex !== "undefined" ? currentSlideIndex : 0;
    saveStateToUndo();
    const id = generateId("el");
    const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : { defaultTextColor: "#ffffff" };

    // Render KaTeX to HTML string
    let renderedHtml = latexSrc;
    try {
        if (typeof katex !== "undefined") {
            renderedHtml = katex.renderToString(latexSrc, { throwOnError: false, displayMode: true });
        }
    } catch (e) {
        renderedHtml = `<span style="color:red">${latexSrc}</span>`;
    }

    state.slides[activeIndex].elements.push({
        id,
        type: "equation",
        latexSrc,
        x: 200,
        y: 200,
        width: "400px",
        height: "auto",
        content: renderedHtml,
        styles: {
            color: theme.defaultTextColor || "#ffffff",
            fontSize: "24px",
            zIndex: getNextZIndex(),
            backgroundColor: "transparent",
        },
    });
    renderSlidesFromState();
    selectElement(id);
}

function switchSidebarTab(tabName) {
    const panels = {
        elements: document.getElementById("panel-elements"),
        slides: document.getElementById("panel-slides"),
    };
    const tabs = {
        elements: document.getElementById("tab-elements"),
        slides: document.getElementById("tab-slides"),
    };

    Object.keys(panels).forEach(key => {
        if (panels[key]) panels[key].classList.toggle("hidden", key !== tabName);
        if (tabs[key]) tabs[key].classList.toggle("sidebar-tab-active", key === tabName);
    });
}

// ─── Window Bindings (Exposed for inline HTML onclick) ───────────────────────
window.addSlide = addSlide;
window.duplicateCurrentSlide = duplicateCurrentSlide;
window.deleteCurrentSlide = deleteCurrentSlide;
window.addElement = addElement;
window.addShape = addShape;
window.addSketchElement = addSketchElement;
window.addChart = addChart;
window.addConnector = addConnector;
window.addComponent = addComponent;
window.aiCleanUpSlide = aiCleanUpSlide;
window.syncConnectorDom = syncConnectorDom;
window.deleteElement = deleteElement;
window.duplicateElement = duplicateElement;
window.duplicateSelectedElements = duplicateSelectedElements;
window.copyElement = copyElement;
window.pasteElement = pasteElement;
window.copySelectionToClipboard = copySelectionToClipboard;
window.pasteFromClipboard = pasteFromClipboard;
window.togglePlayMode = togglePlayMode;
window.undo = undo;
window.redo = redo;
window.exportPresentationZip = exportPresentationZip;
window.exportPresentationPDF = exportPresentationPDF;
window.exportPresentationPPTX = exportPresentationPPTX;
window.exportPresentationJson = exportPresentationJson;
window.importPresentationJson = importPresentationJson;
window.handleImageFileInsert = handleImageFileInsert;
window.handleHtmlFileInsert = handleHtmlFileInsert;
window.handleVideoFileInsert = handleVideoFileInsert;
window.handlePdfFileInsert = handlePdfFileInsert;
window.nudgeSelectedElements = nudgeSelectedElements;
window.schedulePresentationAutosave = schedulePresentationAutosave;
window.adoptPresentationRecord = adoptPresentationRecord;
window.saveCurrentProject = saveCurrentProject;
window.createNewProject = createNewProject;
window.openProjectsModal = openProjectsModal;
window.closeProjectsModal = closeProjectsModal;
window.loadProjectById = loadProjectById;
window.setCurrentPresentationTitle = setCurrentPresentationTitle;
window.bindProjectTitleInput = bindProjectTitleInput;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.toggleAuthMode = toggleAuthMode;
window.toggleUserMenu = toggleUserMenu;
window.toggleExportMenu = toggleExportMenu;
window.closeExportMenu = closeExportMenu;
window.closeUserMenu = closeUserMenu;
window.submitAuthForm = submitAuthForm;
window.submitEntryAuthForm = submitEntryAuthForm;
window.switchEntryAuthMode = switchEntryAuthMode;
window.toggleEntryAuthMode = toggleEntryAuthMode;
window.continueAsGuest = continueAsGuest;
window.logoutCurrentUser = logoutCurrentUser;
window.addEquationElement = addEquationElement;
window.openSymbolPicker = openSymbolPicker;
window.closeSymbolPicker = closeSymbolPicker;
window.openShapePicker = openShapePicker;
window.closeShapePicker = closeShapePicker;
window.insertShapeFromPicker = insertShapeFromPicker;
window.insertConnectorFromPicker = insertConnectorFromPicker;
window.switchSidebarTab = switchSidebarTab;
window.renderSlidesFromState = renderSlidesFromState;
window.renderSlidePreviews = renderSlidePreviews;
window.refreshActiveSlidePreview = refreshActiveSlidePreview;
window.changePresentationPageSetup = changePresentationPageSetup;
window.refreshPreviews = () => {
    if (typeof _previewTimer !== "undefined") clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => {
        if (typeof refreshActiveSlidePreview === "function") {
            refreshActiveSlidePreview();
        } else {
            renderSlidePreviews(currentSlideIndex);
        }
    }, 300);
};

// ─── Icon Picker ─────────────────────────────────────────────────────────────

const _icons = [
    { name: "user", class: "fa-solid fa-user" },
    { name: "home", class: "fa-solid fa-house" },
    { name: "settings", class: "fa-solid fa-gear" },
    { name: "heart", class: "fa-solid fa-heart" },
    { name: "star", class: "fa-solid fa-star" },
    { name: "check", class: "fa-solid fa-check" },
    { name: "xmark", class: "fa-solid fa-xmark" },
    { name: "arrow right", class: "fa-solid fa-arrow-right" },
    { name: "arrow left", class: "fa-solid fa-arrow-left" },
    { name: "envelope", class: "fa-solid fa-envelope" },
    { name: "phone", class: "fa-solid fa-phone" },
    { name: "bell", class: "fa-solid fa-bell" },
    { name: "calendar", class: "fa-solid fa-calendar" },
    { name: "chart", class: "fa-solid fa-chart-simple" },
    { name: "image", class: "fa-regular fa-image" },
    { name: "camera", class: "fa-solid fa-camera" },
    { name: "video", class: "fa-solid fa-video" },
    { name: "music", class: "fa-solid fa-music" },
    { name: "magnifying glass", class: "fa-solid fa-magnifying-glass" },
    { name: "location", class: "fa-solid fa-location-dot" },
    { name: "thumbs up", class: "fa-solid fa-thumbs-up" },
    { name: "thumbs down", class: "fa-solid fa-thumbs-down" },
    { name: "comment", class: "fa-solid fa-comment" },
    { name: "share", class: "fa-solid fa-share" },
    { name: "folder", class: "fa-solid fa-folder" },
    { name: "file", class: "fa-solid fa-file" },
    { name: "paperclip", class: "fa-solid fa-paperclip" },
    { name: "link", class: "fa-solid fa-link" },
    { name: "trash", class: "fa-solid fa-trash" },
    { name: "pen", class: "fa-solid fa-pen" },
    { name: "flag", class: "fa-solid fa-flag" },
    { name: "lock", class: "fa-solid fa-lock" },
    { name: "key", class: "fa-solid fa-key" },
    { name: "lightbulb", class: "fa-solid fa-lightbulb" },
    { name: "bolt", class: "fa-solid fa-bolt" },
    { name: "clock", class: "fa-solid fa-clock" },
    { name: "globe", class: "fa-solid fa-globe" },
    { name: "cloud", class: "fa-solid fa-cloud" },
    { name: "wifi", class: "fa-solid fa-wifi" },
    { name: "battery", class: "fa-solid fa-battery-full" },
    { name: "download", class: "fa-solid fa-download" },
    { name: "upload", class: "fa-solid fa-upload" },
    { name: "save", class: "fa-solid fa-floppy-disk" },
    { name: "print", class: "fa-solid fa-print" },
    { name: "copy", class: "fa-regular fa-copy" },
    { name: "paste clipboard", class: "fa-regular fa-clipboard" },
    { name: "filter", class: "fa-solid fa-filter" },
    { name: "sliders", class: "fa-solid fa-sliders" },
    { name: "database", class: "fa-solid fa-database" },
    { name: "server", class: "fa-solid fa-server" },
    { name: "code", class: "fa-solid fa-code" },
    { name: "terminal", class: "fa-solid fa-terminal" },
    { name: "bug", class: "fa-solid fa-bug" },
    { name: "shield", class: "fa-solid fa-shield-halved" },
    { name: "fingerprint", class: "fa-solid fa-fingerprint" },
    { name: "rocket", class: "fa-solid fa-rocket" },
    { name: "flask", class: "fa-solid fa-flask" },
    { name: "microscope", class: "fa-solid fa-microscope" },
    { name: "atom", class: "fa-solid fa-atom" },
    { name: "dna", class: "fa-solid fa-dna" },
    { name: "brain", class: "fa-solid fa-brain" },
    { name: "stethoscope", class: "fa-solid fa-stethoscope" },
    { name: "capsules", class: "fa-solid fa-capsules" },
    { name: "chart line", class: "fa-solid fa-chart-line" },
    { name: "chart pie", class: "fa-solid fa-chart-pie" },
    { name: "chart bar", class: "fa-solid fa-chart-column" },
    { name: "bullseye", class: "fa-solid fa-bullseye" },
    { name: "trophy", class: "fa-solid fa-trophy" },
    { name: "award", class: "fa-solid fa-award" },
    { name: "medal", class: "fa-solid fa-medal" },
    { name: "handshake", class: "fa-solid fa-handshake" },
    { name: "users", class: "fa-solid fa-users" },
    { name: "person chalkboard", class: "fa-solid fa-person-chalkboard" },
    { name: "school", class: "fa-solid fa-school" },
    { name: "landmark", class: "fa-solid fa-landmark" },
    { name: "scale balanced", class: "fa-solid fa-scale-balanced" },
    { name: "gavel", class: "fa-solid fa-gavel" },
    { name: "factory", class: "fa-solid fa-industry" },
    { name: "gear process", class: "fa-solid fa-gears" },
    { name: "wrench", class: "fa-solid fa-wrench" },
    { name: "screwdriver wrench", class: "fa-solid fa-screwdriver-wrench" },
    { name: "map", class: "fa-regular fa-map" },
    { name: "compass", class: "fa-regular fa-compass" },
    { name: "route", class: "fa-solid fa-route" },
    { name: "train", class: "fa-solid fa-train" },
    { name: "bus", class: "fa-solid fa-bus" },
    { name: "bicycle", class: "fa-solid fa-bicycle" },
    { name: "utensils", class: "fa-solid fa-utensils" },
    { name: "mug hot", class: "fa-solid fa-mug-hot" },
    { name: "seedling", class: "fa-solid fa-seedling" },
    { name: "recycle", class: "fa-solid fa-recycle" },
    { name: "solar panel", class: "fa-solid fa-solar-panel" },
    { name: "plug", class: "fa-solid fa-plug" },
    { name: "temperature", class: "fa-solid fa-temperature-half" },
    { name: "sun", class: "fa-regular fa-sun" },
    { name: "moon", class: "fa-regular fa-moon" },
    { name: "palette", class: "fa-solid fa-palette" },
    { name: "brush", class: "fa-solid fa-paintbrush" },
    { name: "wand magic", class: "fa-solid fa-wand-magic-sparkles" },
    { name: "layer group", class: "fa-solid fa-layer-group" },
    { name: "shapes", class: "fa-solid fa-shapes" },
    { name: "diamond", class: "fa-solid fa-diamond" },
    { name: "circle", class: "fa-regular fa-circle" },
    { name: "square", class: "fa-regular fa-square" },
    { name: "triangle", class: "fa-solid fa-play" },
    { name: "question", class: "fa-regular fa-circle-question" },
    { name: "info", class: "fa-solid fa-circle-info" },
    { name: "warning", class: "fa-solid fa-triangle-exclamation" },
    { name: "clipboard check", class: "fa-solid fa-clipboard-check" },
    { name: "list check", class: "fa-solid fa-list-check" },
    { name: "timeline", class: "fa-solid fa-timeline" },
    { name: "calendar check", class: "fa-regular fa-calendar-check" },
    { name: "hourglass", class: "fa-regular fa-hourglass-half" },
    { name: "car", class: "fa-solid fa-car" },
    { name: "plane", class: "fa-solid fa-plane" },
    { name: "truck", class: "fa-solid fa-truck" },
    { name: "ship", class: "fa-solid fa-ship" },
    { name: "shopping cart", class: "fa-solid fa-cart-shopping" },
    { name: "bag", class: "fa-solid fa-bag-shopping" },
    { name: "credit card", class: "fa-solid fa-credit-card" },
    { name: "money bill", class: "fa-solid fa-money-bill" },
    { name: "wallet", class: "fa-solid fa-wallet" },
    { name: "gift", class: "fa-solid fa-gift" },
    { name: "book", class: "fa-solid fa-book" },
    { name: "graduation cap", class: "fa-solid fa-graduation-cap" },
    { name: "briefcase", class: "fa-solid fa-briefcase" },
    { name: "building", class: "fa-solid fa-building" },
    { name: "hospital", class: "fa-solid fa-hospital" },
    { name: "tree", class: "fa-solid fa-tree" },
    { name: "leaf", class: "fa-solid fa-leaf" },
    { name: "fire", class: "fa-solid fa-fire" },
    { name: "water", class: "fa-solid fa-droplet" },
    { name: "wind", class: "fa-solid fa-wind" }
];

function openIconPicker() {
    captureInlineSelection?.();
    beginFormattingInteraction?.();
    const modal = document.getElementById("icon-picker-modal");
    const grid = document.getElementById("icon-grid");
    if (!modal || !grid) return;
    const input = document.getElementById("icon-search-input");
    if (input) input.value = "";
    filterIconPicker("");
    modal.style.display = "flex";
}

function closeIconPicker() {
    const modal = document.getElementById("icon-picker-modal");
    if (modal) modal.style.display = "none";
    requestAnimationFrame(() => endFormattingInteraction?.());
}

function filterIconPicker(query) {
    const grid = document.getElementById("icon-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const lowerQuery = query.toLowerCase();
    _icons.forEach(iconObj => {
        if (!iconObj.name.toLowerCase().includes(lowerQuery)) return;
        const btn = document.createElement("button");
        btn.title = iconObj.name;
        btn.style.cssText =
            "aspect-ratio:1;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;color:#0F172A;padding:4px;";
        const i = document.createElement("i");
        i.className = iconObj.class;
        btn.appendChild(i);
        btn.onmouseenter = () => {
            btn.style.background = "#EFF6FF";
            btn.style.borderColor = "#2563EB";
        };
        btn.onmouseleave = () => {
            btn.style.background = "white";
            btn.style.borderColor = "#E5E7EB";
        };
        btn.onpointerdown = e => {
            e.preventDefault();
            restoreInlineSelection?.();
        };
        btn.onclick = () => _insertIcon(iconObj);
        grid.appendChild(btn);
    });
}

function _insertIcon(iconObj) {
    const activeIndex = typeof currentSlideIndex !== "undefined" ? currentSlideIndex : 0;
    saveStateToUndo();
    const id = generateId("el");
    const theme =
        typeof getPresentationTheme === "function"
            ? getPresentationTheme()
            : { defaultTextColor: "#ffffff", bodyFont: "Inter, sans-serif" };
    const slide = state.slides[activeIndex];
    const existingIcons = (slide?.elements || []).filter(el => el.iconMode);
    const cascade = existingIcons.length % 12;
    const x = 200 + cascade * 28;
    const y = 200 + cascade * 24;
            
    slide.elements.push({
        id,
        type: "text",
        iconMode: true,
        iconClass: iconObj.class,
        x,
        y,
        width: "100px",
        height: "100px",
        autoHeight: false,
        textFitMode: "fixed",
        content: `<i class="${iconObj.class}"></i>`,
        styles: {
            color: theme.defaultTextColor,
            fontSize: "64px",
            fontFamily: theme.bodyFont,
            zIndex: getNextZIndex(),
            textAlign: "center",
            backgroundColor: "transparent"
        },
    });
    renderSlidesFromState();
    selectElement(id);
    closeIconPicker();
}

window.openIconPicker = openIconPicker;
window.closeIconPicker = closeIconPicker;
window.filterIconPicker = filterIconPicker;
