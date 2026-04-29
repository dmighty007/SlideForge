
// ─── Global window bindings (Exposed immediately for inline HTML onclick) ─────

window.onload = async () => {
    await initPresentationPersistence();
    bindProjectTitleInput();
    bindUserMenu();
    initPropertiesPanelToggle();
    initToolDockToggle();
    normalizeStateIds();
    if (typeof migrateInlineVideoAssets === "function") {
        try {
            await migrateInlineVideoAssets();
        } catch (err) {
            console.warn("Inline video migration failed:", err);
        }
    }
    applyPresentationTheme(state.presentationTheme, { persist: false });
    syncPresentationPageSetup();
    if (typeof initZoom === "function") initZoom();
    if (typeof initContextMenu === "function") initContextMenu();

    const slideConfig = getPresentationPageSetupConfig();

    Reveal.initialize({
        embedded: true,
        center: false,
        hash: false,
        transition: "slide",
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
        updateSlideCounter();
        clearSelection();

        // Ensure the new slide is centered, especially if zoomed in
        if (typeof centerSlide === "function") centerSlide();

        if (document.body.classList.contains("play-mode-active")) {
            if (typeof _playSlideAnimations === "function") {
                _playSlideAnimations(event.indexh);
            }
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
        const isUi =
            path.some(
                n =>
                    n.id === "properties-panel" ||
                    n.id === "toolbar" ||
                    n.id === "floating-text-toolbar" ||
                    n.closest?.("#floating-text-toolbar"),
            );
        if (!isElement && !isGroupBound && !isUi && !e.ctrlKey && !e.metaKey) {
            clearSelection();
        }
    });

    populatePresentationThemeSelector?.();
    document.getElementById("theme-selector").addEventListener("change", e => {
        const previousTheme = state.presentationTheme;
        retintPresentationTheme(previousTheme, e.target.value);
        applyPresentationTheme(e.target.value, { persist: false });
        renderSlidesFromState();
        renderSlidePreviews(null, { preserveScroll: true });
    });
    document.getElementById("page-setup-selector").addEventListener("change", e => {
        changePresentationPageSetup(e.target.value);
    });

    if (!PRESENTATION_THEMES[state.presentationTheme]) {
        state.presentationTheme = "editorial";
    }
    document.getElementById("theme-selector").value = state.presentationTheme || "editorial";
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
            updateFloatingTextToolbar();
        }),
    );
    document.addEventListener("fullscreenchange", () => {
        if (typeof handlePresentationFullscreenChange === "function") {
            handlePresentationFullscreenChange();
        }
        if (typeof _resizePresentationChalkboard === "function") {
            requestAnimationFrame(() => _resizePresentationChalkboard());
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
        if (typeof updateFloatingTextToolbar === "function") {
            updateFloatingTextToolbar();
        }
    });
}

function togglePropertiesPanel() {
    const panel = document.getElementById("properties-panel");
    setPropertiesPanelVisible(panel?.classList.contains("hidden"));
}
window.togglePropertiesPanel = togglePropertiesPanel;

function initPropertiesPanelToggle() {
    const saved = localStorage.getItem("pptmaker_properties_panel_visible");
    setPropertiesPanelVisible(saved === "1", { persist: false });
}

function setToolDockVisible(visible, { persist = true } = {}) {
    const dock = document.getElementById("toolbar-tool-dock");
    const button = document.getElementById("toggle-tool-dock");
    if (!dock) return;

    dock.classList.toggle("toolbar-dock-hidden", !visible);
    if (button) {
        button.setAttribute("aria-pressed", visible ? "true" : "false");
        button.title = visible ? "Hide Tools" : "Show Tools";
    }
    if (persist) {
        localStorage.setItem("pptmaker_tool_dock_visible", visible ? "1" : "0");
    }
}

function toggleToolDock() {
    const dock = document.getElementById("toolbar-tool-dock");
    setToolDockVisible(dock?.classList.contains("toolbar-dock-hidden"));
}
window.toggleToolDock = toggleToolDock;

function initToolDockToggle() {
    const saved = localStorage.getItem("pptmaker_tool_dock_visible");
    setToolDockVisible(saved !== "0", { persist: false });
}

// ─── Debounced preview refresh (used by properties.js via window) ─────────────

let _previewTimer;

async function runAutosaveSmokeTest() {
    if (new URLSearchParams(window.location.search).get("autosave_smoke") !== "1") return;

    const resultEl = document.createElement("pre");
    resultEl.id = "autosave-smoke-result";
    resultEl.style.cssText = "position:fixed;top:8px;left:8px;z-index:9999;background:#fff;color:#111;padding:12px;border:1px solid #ccc;max-width:420px;white-space:pre-wrap;";
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
        const presentationId = await waitFor(() => currentPresentationId || localStorage.getItem("pptmaker_presentation_id"));
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
    'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ',
    'ν','ξ','π','ρ','σ','τ','υ','φ','χ','ψ','ω',
    'Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Κ','Λ','Μ','Ν',
    'Ξ','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω',
    '∞','∂','∇','∫','∑','∏','√','∈','∉','∩','∪',
    '⊂','⊃','⊆','⊇','≈','≠','≡','≤','≥','±','×','÷',
    '→','←','↑','↓','↔','⇒','⇐','⇔',
    '∀','∃','¬','∧','∨','⊕','⊗','ℝ','ℤ','ℕ','ℂ',
    '°','′','″','‰','∝','∼','≃','≅','≇','⊥','∥',
    'ℏ','ℓ','℃','℉','Å','μ','Ω',
];

function openSymbolPicker() {
    captureInlineSelection?.();
    beginFormattingInteraction?.();
    const modal = document.getElementById('symbol-picker-modal');
    const grid = document.getElementById('symbol-grid');
    if (!modal || !grid) return;
    grid.innerHTML = '';
    _symbols.forEach(sym => {
        const btn = document.createElement('button');
        btn.textContent = sym;
        btn.title = sym;
        btn.style.cssText = 'aspect-ratio:1;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;color:#0F172A;padding:4px;';
        btn.onmouseenter = () => { btn.style.background='#EFF6FF'; btn.style.borderColor='#2563EB'; };
        btn.onmouseleave = () => { btn.style.background='white'; btn.style.borderColor='#E5E7EB'; };
        btn.onpointerdown = e => {
            e.preventDefault();
            restoreInlineSelection?.();
        };
        btn.onclick = () => _insertSymbol(sym);
        grid.appendChild(btn);
    });
    modal.style.display = 'flex';
}

function closeSymbolPicker() {
    const modal = document.getElementById('symbol-picker-modal');
    if (modal) modal.style.display = 'none';
    requestAnimationFrame(() => endFormattingInteraction?.());
}

function openShapePicker() {
    const modal = document.getElementById('shape-picker-modal');
    if (modal) modal.style.display = 'flex';
}

function closeShapePicker() {
    const modal = document.getElementById('shape-picker-modal');
    if (modal) modal.style.display = 'none';
}

function insertShapeFromPicker(shapeType) {
    if (typeof addShape === 'function') {
        addShape(shapeType);
    }
    closeShapePicker();
}

function insertConnectorFromPicker(connectorType) {
    if (typeof addConnector === 'function') {
        addConnector(connectorType);
    }
    closeShapePicker();
}

function _insertSymbol(sym) {
    const activeIndex = typeof currentSlideIndex !== 'undefined' ? currentSlideIndex : 0;
    const selectedTextEl = state.slides[activeIndex]?.elements.find(e => state.selectedIds.includes(e.id) && e.type === 'text');
    if (selectedTextEl) {
        const dom = document.getElementById(selectedTextEl.id);
        const editor = dom?.querySelector('.text-element-content');
        if (editor && editor.contentEditable === 'true') {
            saveStateToUndo();
            restoreInlineSelection?.();
            const inserted = document.execCommand?.('insertText', false, sym);
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
            const cur = typeof selectedTextEl.content === 'string' ? selectedTextEl.content : '';
            updateElementState(selectedTextEl.id, { content: cur + sym });
            renderSlidesFromState();
        }
    } else {
        // Create new text element with symbol
        saveStateToUndo();
        const id = generateId('el');
        const theme = typeof getPresentationTheme === 'function' ? getPresentationTheme() : { defaultTextColor: '#ffffff', bodyFont: 'Inter, sans-serif' };
        state.slides[activeIndex].elements.push({
            id, type: 'text', x: 200, y: 200,
            width: '120px', height: 'auto', autoHeight: true,
            textFitMode: 'autoHeight',
            content: sym,
            styles: { color: theme.defaultTextColor, fontSize: '48px', fontFamily: theme.bodyFont, zIndex: getNextZIndex() },
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
    const groupId = generateId('group');
    state.selectedIds.forEach(id => {
        updateElementState(id, { groupId });
    });
    // Show a small toast or visual feedback if desired
    console.log(`Grouped ${state.selectedIds.length} elements under ${groupId}`);
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

    console.log(`Ungrouped ${groupIdsToClear.size} groups`);
    buildPropertiesPanel();
}

window.groupSelected = groupSelected;
window.ungroupSelected = ungroupSelected;

// ─── Equation Element ─────────────────────────────────────────────────────────

function addEquationElement(latexSrc) {
    const activeIndex = typeof currentSlideIndex !== 'undefined' ? currentSlideIndex : 0;
    saveStateToUndo();
    const id = generateId('el');
    const theme = typeof getPresentationTheme === 'function' ? getPresentationTheme() : { defaultTextColor: '#ffffff' };

    // Render KaTeX to HTML string
    let renderedHtml = latexSrc;
    try {
        if (typeof katex !== 'undefined') {
            renderedHtml = katex.renderToString(latexSrc, { throwOnError: false, displayMode: true });
        }
    } catch(e) {
        renderedHtml = `<span style="color:red">${latexSrc}</span>`;
    }

    state.slides[activeIndex].elements.push({
        id,
        type: 'equation',
        latexSrc,
        x: 200,
        y: 200,
        width: '400px',
        height: 'auto',
        content: renderedHtml,
        styles: {
            color: theme.defaultTextColor || '#ffffff',
            fontSize: '24px',
            zIndex: getNextZIndex(),
            backgroundColor: 'transparent',
        },
    });
    renderSlidesFromState();
    selectElement(id);
}

function switchSidebarTab(tabName) {
    const panels = {
        'elements': document.getElementById('panel-elements'),
        'slides': document.getElementById('panel-slides')
    };
    const tabs = {
        'elements': document.getElementById('tab-elements'),
        'slides': document.getElementById('tab-slides')
    };

    Object.keys(panels).forEach(key => {
        if (panels[key]) panels[key].classList.toggle('hidden', key !== tabName);
        if (tabs[key]) tabs[key].classList.toggle('sidebar-tab-active', key === tabName);
    });
}

// ─── Window Bindings (Exposed for inline HTML onclick) ───────────────────────
window.addSlide = addSlide;
window.duplicateCurrentSlide = duplicateCurrentSlide;
window.deleteCurrentSlide = deleteCurrentSlide;
window.addElement = addElement;
window.addShape = addShape;
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
window.handleAIImportUpload = handleAIImportUpload;
window.handleAIJsonUpload = handleAIJsonUpload;
window.hideAIImportProgress = hideAIImportProgress;
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
window.triggerAIImportPicker = triggerAIImportPicker;
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
    if (typeof _previewTimer !== 'undefined') clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => {
        if (typeof refreshActiveSlidePreview === "function") {
            refreshActiveSlidePreview();
        } else {
            renderSlidePreviews(currentSlideIndex);
        }
    }, 300);
};
