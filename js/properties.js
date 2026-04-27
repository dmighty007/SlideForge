

function getCanvasScale() {
    return typeof Reveal !== "undefined" && typeof Reveal.getScale === "function" ? Reveal.getScale() || 1 : 1;
}

function getActiveInlineTextContext(data = getSelectedElementData()) {
    if (!data || data.type !== "text") return null;
    const dom = document.getElementById(data.id);
    if (!dom) return null;
    const editor = dom.querySelector(".text-element-content");
    if (!editor) return null;
    
    // Check if the editor is in edit mode (either attribute or class based)
    const isEditing = editor.contentEditable === "true" || 
                      (dom.classList.contains("editing-text")) ||
                      (typeof getActiveInlineEditor === "function" && editor === getActiveInlineEditor());

    if (isEditing) {
        return { editor, dom, data };
    }
    return null;
}

function onCommit(cb) {
    saveStateToUndo();
    cb();
    if (window.renderSlidesFromState) window.renderSlidesFromState();
    if (window.refreshPreviews) window.refreshPreviews();
}

function markTextElementStyleAsLocal(data, prop) {
    if (!data || data.type !== "text") return;
    if (!["color"].includes(prop)) return;
    if (data.themeManaged === false) return;
    updateElementState(data.id, { themeManaged: false });
    data.themeManaged = false;
}

const PROPERTY_PANEL_REVEAL_FRAGMENT_CLASSES = [
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

function applyTextFormatting(prop, value, options = {}) {
    const data = getSelectedElementData();
    if (!data || data.type !== "text") return;

    const inlineContext = getActiveInlineTextContext(data);
    
    if (inlineContext) {
        // We have an active editor context. 
        // We MUST restore the selection before checking or applying styles
        // because the focus is likely on the sidebar/color picker now.
        if (typeof restoreInlineSelection === "function") {
            restoreInlineSelection();
        }

        saveStateToUndo();
        const success = applyInlineTextStyle(
            options.inlineAction || prop,
            options.inlineValue !== undefined ? options.inlineValue : value,
        );
        
        if (success) {
            updateElementState(data.id, { content: inlineContext.editor.innerHTML });
            data.content = inlineContext.editor.innerHTML;
            markTextElementStyleAsLocal(data, prop);
            const layout = syncTextBoxLayout(inlineContext.dom, data);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(data.id, { height: `${layout.height}px` });
                data.height = `${layout.height}px`;
            }
            captureInlineSelection();
            if (window.refreshPreviews) window.refreshPreviews();
            return;
        }
    }

    // Fallback: Apply to the entire element ONLY if not in edit mode or inline failed
    if (["fontWeight", "fontStyle", "fontFamily", "fontSize", "color"].includes(prop)) {
        applyStyle(prop, value);
    }
}

// --- Selection & Property UI ---
function selectElement(id, selectionMode = "replace") {
    const elData = state.slides[currentSlideIndex].elements.find(e => e.id === id);
    if (!elData) return;

    // Clicking any group member selects the whole group
    let idsToSelect = [id];
    if (elData.groupId) {
        idsToSelect = state.slides[currentSlideIndex].elements.filter(e => e.groupId === elData.groupId).map(e => e.id);
    }

    if (selectionMode === "add") {
        idsToSelect.forEach(iid => {
            if (!state.selectedIds.includes(iid)) {
                state.selectedIds.push(iid);
            }
        });
    } else if (selectionMode === "toggle") {
        const allAlreadySelected = idsToSelect.every(iid => state.selectedIds.includes(iid));
        idsToSelect.forEach(iid => {
            if (allAlreadySelected) {
                state.selectedIds = state.selectedIds.filter(x => x !== iid);
                document.getElementById(iid)?.classList.remove("selected", "group-member-selected");
            } else if (!state.selectedIds.includes(iid)) {
                state.selectedIds.push(iid);
            }
        });
    } else {
        // Single selection — clear old visual state directly WITHOUT calling
        // clearSelection(), which would trigger an extra buildPropertiesPanel()
        // and updateGroupBound() with empty selectedIds before we've set the new ones.
        state.selectedIds.forEach(prevId => {
            document.getElementById(prevId)?.classList.remove("selected", "group-member-selected");
        });
        state.selectedIds = idsToSelect;
    }

    // Single render pass with the correct final state
    buildPropertiesPanel();
    updateGroupBound();
}

function clearSelection() {
    state.selectedIds.forEach(id => {
        const domEl = document.getElementById(id);
        if (domEl) {
            domEl.classList.remove("selected", "group-member-selected");
        }
    });
    state.selectedIds = [];
    buildPropertiesPanel();
    updateGroupBound();
}

function updateGroupBound() {
    const bound = document.getElementById("group-bound");
    if (!bound) return;
    if (state.selectedIds.length < 1) {
        bound.classList.add("hidden");
        document
            .querySelectorAll(".canvas-element.group-member-selected")
            .forEach(el => el.classList.remove("group-member-selected"));
        return;
    }

    const scale = getCanvasScale();
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    // Use the wrapper rect as the positioning origin for the group-bound overlay.
    // The group-bound is a direct child of canvas-wrapper so its translate() is
    // relative to the wrapper's top-left corner.
    const wrapperRect = document.getElementById("canvas-wrapper").getBoundingClientRect();

    // The Reveal.js slide section may be centered inside the wrapper.
    // We compute element screen positions relative to the wrapper to keep
    // the group-bound in the same coordinate space it is rendered in.
    state.selectedIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();

        minX = Math.min(minX, rect.left - wrapperRect.left);
        minY = Math.min(minY, rect.top - wrapperRect.top);
        maxX = Math.max(maxX, rect.right - wrapperRect.left);
        maxY = Math.max(maxY, rect.bottom - wrapperRect.top);

        if (state.selectedIds.length > 1) {
            el.classList.add("group-member-selected");
            el.classList.remove("selected");
        } else {
            el.classList.remove("group-member-selected");
            el.classList.add("selected");
        }
    });

    if (state.selectedIds.length > 1) {
        bound.classList.remove("hidden");
        bound.style.width = maxX - minX + "px";
        bound.style.height = maxY - minY + "px";
        bound.style.transform = `translate(${minX}px, ${minY}px)`;

        // Store the slide-section's top-left offset relative to wrapper so
        // the group resize move handler can correctly back-compute logical coords.
        const slideEl = document.querySelector(".reveal .slides section.present");
        const slideRect = slideEl ? slideEl.getBoundingClientRect() : wrapperRect;
        const slideOffsetX = (slideRect.left - wrapperRect.left) / scale;
        const slideOffsetY = (slideRect.top - wrapperRect.top) / scale;

        // Logical coords = screen offset from wrapper, adjusted for slide offset, then unscaled
        bound.setAttribute("data-logical-x", minX / scale - slideOffsetX);
        bound.setAttribute("data-logical-y", minY / scale - slideOffsetY);
        bound.setAttribute("data-logical-w", (maxX - minX) / scale);
        bound.setAttribute("data-logical-h", (maxY - minY) / scale);
        bound.setAttribute("data-slide-offset-x", slideOffsetX);
        bound.setAttribute("data-slide-offset-y", slideOffsetY);
    } else {
        bound.classList.add("hidden");
    }
}

function getSelectedElementData() {
    if (state.selectedIds.length !== 1) return null;
    return state.slides[currentSlideIndex].elements.find(e => e.id === state.selectedIds[0]);
}

function getSlideDimensions() {
    const cfg = typeof Reveal !== "undefined" && Reveal.getConfig ? Reveal.getConfig() : {};
    return {
        width: Number(cfg.width) || 1024,
        height: Number(cfg.height) || 768,
    };
}

function syncHtmlEmbedDom(data) {
    const dom = document.getElementById(data.id);
    if (!dom) return;

    dom.classList.toggle("html-interactive", Boolean(data.htmlInteractive));
    dom.setAttribute("data-html-mode", normalizeHtmlMode(data));

    const frame = dom.querySelector(".html-embed-frame");
    if (frame) {
        frame.srcdoc = buildHtmlEmbedSrcdoc(data.content || "", data);
    }

    const badge = dom.querySelector(".html-embed-badge");
    if (badge) {
        badge.innerText = normalizeHtmlMode(data) === "autofit" ? "HTML Autofit" : "HTML Responsive";
    }
}

function syncPdfEmbedDom(data) {
    const dom = document.getElementById(data.id);
    if (!dom) return;

    dom.classList.toggle("pdf-interactive", Boolean(data.pdfInteractive));
    dom.setAttribute("data-pdf-mode", data.pdfEditorMode || "navigate");

    const frame = dom.querySelector(".pdf-embed-frame");
    if (frame) {
        frame.src = buildPdfEmbedSrc(data.content || "");
    }

    const badge = dom.querySelector(".pdf-embed-badge");
    if (badge) {
        const mode =
            data.pdfEditorMode === "highlight" ? "PDF Highlight" :
            data.pdfEditorMode === "note" ? "PDF Note" :
            "PDF Navigate";
        badge.innerText = mode;
    }
}

function syncTextDomContent(data) {
    const dom = document.getElementById(data.id);
    if (!dom) return;
    const contentHost = dom.querySelector(".text-element-content");
    if (contentHost) {
        contentHost.innerHTML = renderTextContent(data);
        const layout = syncTextBoxLayout(dom, data);
        if (layout?.autoHeight && Number.isFinite(layout.height)) {
            updateElementState(data.id, { height: `${layout.height}px` });
            data.height = `${layout.height}px`;
        }
        return;
    }
    dom.innerHTML = renderTextContent(data);
}

function applyTextBulletState(data, nextKind, nextStyle = "default") {
    let nextContent = data.content;
    let nextBulletStyle = data.bulletStyle || "default";

    if (nextKind === "none") {
        const lines = extractStyledLines(data.content);
        nextContent = lines.length ? lines.join("<br>") : "Double click to edit text";
        nextBulletStyle = "";
    } else if (nextKind === "numbered") {
        const numberedStyle = NUMBERED_STYLE_THEMES[nextStyle] ? nextStyle : "decimal";
        nextContent = buildNumberedListMarkup(numberedStyle, extractStyledLines(data.content));
        nextBulletStyle = "";
    } else {
        nextBulletStyle = BULLET_STYLE_THEMES[nextStyle] ? nextStyle : "default";
        nextContent = isStructuredBulletContent(data.content)
            ? data.content.map(item => normalizeStructuredBulletItem(item))
            : buildStructuredBulletContent(extractStyledLines(data.content), nextBulletStyle);
    }

    updateElementState(data.id, { content: nextContent, bulletStyle: nextBulletStyle });
    data.content = nextContent;
    data.bulletStyle = nextBulletStyle;
    syncTextDomContent(data);
    requestAnimationFrame(updateFloatingTextToolbar);
}

function syncFragmentDomState(dom, fragmentAnimation, fragmentIndex) {
    if (!dom) return;

    dom.classList.remove("fragment");
    PROPERTY_PANEL_REVEAL_FRAGMENT_CLASSES.forEach(c => dom.classList.remove(c));
    dom.removeAttribute("data-fragment-index");

    if (!fragmentAnimation || fragmentAnimation === "none") {
        dom.querySelector(".anim-badge")?.remove();
        return;
    }

    if (document.body.classList.contains("play-mode-active")) {
        dom.classList.add("fragment", fragmentAnimation);
        if (fragmentIndex != null) {
            dom.setAttribute("data-fragment-index", fragmentIndex);
        }
    }

    const badgeText = `<i class="fa-solid fa-wand-sparkles"></i> ${fragmentIndex ?? 0}`;
    const existingBadge = dom.querySelector(".anim-badge");
    if (existingBadge) {
        existingBadge.innerHTML = badgeText;
    } else {
        const badge = document.createElement("div");
        badge.className = "anim-badge";
        badge.innerHTML = badgeText;
        dom.appendChild(badge);
    }
}

function shiftTextBulletLevels(data, delta) {
    if (!isStructuredBulletContent(data.content)) return;
    const nextContent = data.content.map(item => ({
        ...item,
        level: Math.max(0, Math.min(2, (Number(item.level) || 0) + delta)),
    }));
    updateElementState(data.id, { content: nextContent });
    data.content = nextContent;
    syncTextDomContent(data);
    requestAnimationFrame(updateFloatingTextToolbar);
}



function updateFloatingTextToolbar() {
    const toolbar = document.getElementById("floating-text-toolbar");
    const boldBtn = document.getElementById("floating-text-bold");
    const italicBtn = document.getElementById("floating-text-italic");
    const fontSelect = document.getElementById("floating-text-font");
    const sizeInput = document.getElementById("floating-text-size");
    const colorInput = document.getElementById("floating-text-color");
    const subBtn = document.getElementById("floating-text-sub");
    const supBtn = document.getElementById("floating-text-sup");
    const insertSymbolBtn = document.getElementById("floating-insert-symbol");
    const insertEquationBtn = document.getElementById("floating-insert-equation");

    const data = getSelectedElementData();

    if (!toolbar) return;
    if (!data || data.type !== "text" || document.body.classList.contains("play-mode-active")) {
        toolbar.classList.add("hidden");
        return;
    }

    const dom = document.getElementById(data.id);
    if (!dom) {
        toolbar.classList.add("hidden");
        return;
    }

    const rect = dom.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const top = Math.max(76, rect.top - toolbarRect.height - 12);
    const left = Math.max(220, Math.min(window.innerWidth - toolbarRect.width - 24, rect.left));
    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
    toolbar.classList.remove("hidden");

    if (boldBtn) {
        bindInlineFormattingGuard(boldBtn);
        boldBtn.onclick = () => applyTextFormatting("fontWeight", data.styles.fontWeight === "bold" ? "normal" : "bold", { inlineAction: "bold" });
    }
    if (italicBtn) {
        bindInlineFormattingGuard(italicBtn);
        italicBtn.onclick = () => applyTextFormatting("fontStyle", data.styles.fontStyle === "italic" ? "normal" : "italic", { inlineAction: "italic" });
    }
    if (fontSelect) {
        bindInlineFormattingGuard(fontSelect);
        fontSelect.onchange = e => applyTextFormatting("fontFamily", e.target.value, { inlineAction: "fontFamily" });
        fontSelect.value = data.styles.fontFamily || "Inter, sans-serif";
    }
    if (sizeInput) {
        bindInlineFormattingGuard(sizeInput);
        const commitFontSize = () => {
            const val = sizeInput.value.trim();
            if (val) applyTextFormatting("fontSize", /^\d+$/.test(val) ? val + "px" : val, { inlineAction: "fontSize" });
        };
        sizeInput.onchange = commitFontSize;
        sizeInput.onblur = commitFontSize;
        sizeInput.onfocus = () => sizeInput.select();
        sizeInput.value = parseInt(data.styles.fontSize) || 32;
    }
    if (colorInput) {
        bindInlineFormattingGuard(colorInput);
        colorInput.addEventListener("input", beginFormattingInteraction);
        colorInput.oninput = e => applyTextFormatting("color", e.target.value, { inlineAction: "color" });
        colorInput.onchange = e => {
            applyTextFormatting("color", e.target.value, { inlineAction: "color" });
            endFormattingInteraction();
        };
        colorInput.value = _normalizeColorForInput(data.styles.color, "#000000");
    }

    if (subBtn) {
        bindInlineFormattingGuard(subBtn);
        subBtn.onclick = () => applyTextFormatting("subscript", null, { inlineAction: "subscript" });
    }
    if (supBtn) {
        bindInlineFormattingGuard(supBtn);
        supBtn.onclick = () => applyTextFormatting("superscript", null, { inlineAction: "superscript" });
    }

    if (insertSymbolBtn) {
        bindInlineFormattingGuard(insertSymbolBtn);
        // onclick is handled in HTML but we guard it here
    }
    if (insertEquationBtn) {
        bindInlineFormattingGuard(insertEquationBtn);
        // onclick is handled in HTML but we guard it here
    }

    if (!toolbar.dataset.guarded) {
        toolbar.dataset.guarded = "true";
        bindInlineFormattingGuard(toolbar);
    }
}

function buildPropertiesPanel() {
    const panel = document.getElementById("properties-content");
    if (!panel) return;
    panel.innerHTML = "";
    updateFloatingTextToolbar();

    if (state.selectedIds.length === 0) {
        panel.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 gap-3 opacity-50 pt-20">
                <i class="fa-solid fa-object-ungroup text-3xl"></i>
                <p class="text-sm">Select an element</p>
            </div>`;
        return;
    }

    const createGroup = title => {
        const wrap = document.createElement("div");
        wrap.className = "prop-group space-y-3";
        wrap.innerHTML = `<h3 class="prop-group-title">${title}</h3>`;
        return wrap;
    };
    const createField = (label, inputHTML) => {
        const div = document.createElement("div");
        div.className = "flex flex-col gap-1";
        div.innerHTML = `<label class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">${label}</label>${inputHTML}`;
        return div;
    };

    const onCommit = cb => {
        saveStateToUndo();
        cb();
        if (window.refreshPreviews) window.refreshPreviews();
    };

    // Selection / Grouping Section
    const selGrp = createGroup("Selection");
    const isGrouped =
        state.selectedIds.length > 1 &&
        state.slides[currentSlideIndex].elements
            .filter(e => state.selectedIds.includes(e.id))
            .every(
                e =>
                    e.groupId &&
                    e.groupId ===
                        state.slides[currentSlideIndex].elements.find(x => x.id === state.selectedIds[0]).groupId,
            );

    const isSingle = state.selectedIds.length === 1;
    selGrp.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${state.selectedIds.length} Object${isSingle ? "" : "s"}</h3>
            ${!isSingle ? `<span class="text-[10px] text-accent font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">${isGrouped ? "GROUPED" : "MULTIPLE"}</span>` : ""}
        </div>
        <div class="flex gap-2">
            <button id="prop-group" class="flex-1 py-2 rounded-lg bg-accent text-white font-bold text-[10px] hover:bg-accent/80 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-object-group"></i> GROUP
            </button>
            <button id="prop-ungroup" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-object-ungroup"></i> UNGROUP
            </button>
        </div>
    `;
    panel.appendChild(selGrp);

    const data = getSelectedElementData();
    
    // ── LAYERS & APPEARANCE (Common to all) ──────────────────────────
    if (data) {
        const layerGrp = createGroup("Layers & Appearance");
        
        // Flex row for Background and Opacity Label
        const bgOpacityRow = document.createElement("div");
        bgOpacityRow.className = "flex items-end gap-3";
        
        // Background Color (if not image)
        if (data.type !== "image") {
            const bgField = createField("Fill", `<input type="color" id="prop-bg" class="w-12 h-7 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(data.styles.backgroundColor, "#000000")}">`);
            bgOpacityRow.appendChild(bgField);
        }

        // Opacity Slider (More compact)
        const opacityVal = Math.round((parseFloat(data.styles.opacity ?? 1)) * 100);
        const opField = document.createElement("div");
        opField.className = "flex-1 flex flex-col gap-1";
        opField.innerHTML = `
            <div class="flex items-center justify-between">
                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Opacity</label>
                <span id="prop-op-label" class="text-[10px] font-mono text-slate-500">${opacityVal}%</span>
            </div>
            <input type="range" id="prop-op" min="0" max="100" step="1" value="${opacityVal}" class="h-1.5 accent-primary cursor-pointer">
        `;
        bgOpacityRow.appendChild(opField);
        layerGrp.appendChild(bgOpacityRow);

        // Z-Index Row
        const zVal = data.styles?.zIndex ?? 1;
        const zRow = document.createElement("div");
        zRow.className = "flex items-center gap-2 mt-2";
        zRow.innerHTML = `
            <div class="flex-1">
                <label class="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Layer Order (Z)</label>
                <input type="number" id="prop-zindex" class="w-full text-xs" value="${zVal}" min="0" max="9999">
            </div>
            <div class="flex gap-1 pt-4">
                <button id="prop-zindex-front" class="p-2 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200" title="Bring to Front">
                    <i class="fa-solid fa-angles-up text-[10px]"></i>
                </button>
                <button id="prop-zindex-back" class="p-2 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200" title="Send to Back">
                    <i class="fa-solid fa-angles-down text-[10px]"></i>
                </button>
            </div>
        `;
        layerGrp.appendChild(zRow);
        panel.appendChild(layerGrp);
    }

    if (!data && state.selectedIds.length > 1) {
        const elements = state.selectedIds.map(id => state.slides[currentSlideIndex].elements.find(e => e.id === id));
        const allShapes = elements.every(e => e.type === "shape");
        const allText = elements.every(e => e.type === "text");
        if (allShapes || allText) {
            const firstColor = _normalizeColorForInput(elements[0]?.styles?.backgroundColor, "#6366f1");
            const styleGrp = createGroup("Shared Style");
            styleGrp.appendChild(
                createField(
                    "Color",
                    `<input type="color" id="prop-shared-color" class="w-full h-8 rounded border border-slate-300 cursor-pointer" value="${firstColor}">`,
                ),
            );
            panel.appendChild(styleGrp);
        }
    }

    if (data) {
        if (data.type === "text") {
            const listState = getTextListState(data.content, data.bulletStyle);
            const grp = createGroup("Typography");
            
            // Font Family - Top
            grp.appendChild(
                createField(
                    "Font Family",
                    `
                <select id="prop-font" class="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-accent w-full shadow-sm">
                    <option value='"Manrope", sans-serif' ${data.styles.fontFamily === '"Manrope", sans-serif' ? "selected" : ""}>Manrope</option>
                    <option value='"DM Sans", sans-serif' ${data.styles.fontFamily === '"DM Sans", sans-serif' ? "selected" : ""}>DM Sans</option>
                    <option value='"Work Sans", sans-serif' ${data.styles.fontFamily === '"Work Sans", sans-serif' ? "selected" : ""}>Work Sans</option>
                    <option value='"Space Grotesk", sans-serif' ${data.styles.fontFamily === '"Space Grotesk", sans-serif' ? "selected" : ""}>Space Grotesk</option>
                    <option value='"Montserrat", sans-serif' ${data.styles.fontFamily === '"Montserrat", sans-serif' ? "selected" : ""}>Montserrat</option>
                    <option value='"Fraunces", serif' ${data.styles.fontFamily === '"Fraunces", serif' ? "selected" : ""}>Fraunces</option>
                    <option value='"Newsreader", serif' ${data.styles.fontFamily === '"Newsreader", serif' ? "selected" : ""}>Newsreader</option>
                    <option value="Inter, sans-serif" ${data.styles.fontFamily === "Inter, sans-serif" ? "selected" : ""}>Inter</option>
                </select>
            `,
                ),
            );

            // Compact Row for Size, Color, Bold, Italic
            const textToolsRow = document.createElement("div");
            textToolsRow.className = "grid grid-cols-4 gap-2 items-end mt-2";
            
            // Size
            const sizeCol = document.createElement("div");
            sizeCol.className = "col-span-1";
            sizeCol.innerHTML = `<label class="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Size</label>
                <input type="text" id="prop-fs" class="w-full text-xs p-1" value="${data.styles.fontSize || "32px"}">`;
            
            // Color
            const colorCol = document.createElement("div");
            colorCol.className = "col-span-1";
            colorCol.innerHTML = `<label class="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Color</label>
                <input type="color" id="prop-tc" class="w-full h-7 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(data.styles.color, "#ffffff")}">`;
            
            // Format buttons
            const formatCol = document.createElement("div");
            formatCol.className = "col-span-2 flex gap-1";
            formatCol.innerHTML = `
                <button id="prop-bold" class="flex-1 h-7 rounded bg-white border border-slate-200 text-[11px] font-bold ${data.styles.fontWeight === "bold" ? "bg-primary/10 border-primary text-primary" : "text-slate-600"}">B</button>
                <button id="prop-italic" class="flex-1 h-7 rounded bg-white border border-slate-200 text-[11px] font-serif italic ${data.styles.fontStyle === "italic" ? "bg-primary/10 border-primary text-primary" : "text-slate-600"}">I</button>
            `;
            
            textToolsRow.appendChild(sizeCol);
            textToolsRow.appendChild(colorCol);
            textToolsRow.appendChild(formatCol);
            grp.appendChild(textToolsRow);

            // Alignment
            grp.appendChild(
                createField(
                    "Alignment",
                    `
                <div class="prop-btn-group">
                    ${['left', 'center', 'right', 'justify'].map(align => `
                        <button id="prop-align-${align}" data-value="${align}" class="${ (data.styles.textAlign || "left") === align ? 'active' : '' }">
                            <i class="fa-solid fa-align-${align === 'justify' ? 'justify' : align}"></i>
                        </button>
                    `).join('')}
                </div>
            `,
                ),
            );
            
            // List Type Selector (Visual)
            const listTypeField = createField("List Type", `
                <div class="prop-btn-group">
                    <button id="prop-list-none" class="${listState.kind === 'none' ? 'active' : ''}" title="No List">None</button>
                    <button id="prop-list-bullet" class="${listState.kind === 'bulleted' ? 'active' : ''}" title="Bulleted List"><i class="fa-solid fa-list-ul"></i></button>
                    <button id="prop-list-number" class="${listState.kind === 'numbered' ? 'active' : ''}" title="Numbered List"><i class="fa-solid fa-list-ol"></i></button>
                </div>
            `);
            grp.appendChild(listTypeField);

            // Sub-settings for Bullet/Number
            if (listState.kind !== "none") {
                const subGrp = document.createElement("div");
                subGrp.className = "pl-2 border-l-2 border-slate-100 space-y-2 mt-1";
                
                if (listState.kind === "bulleted") {
                    subGrp.appendChild(createField("Bullet Style", `
                        <select id="prop-list-style" class="text-[10px] py-1">
                            ${Object.keys(BULLET_STYLE_THEMES).map(s => `<option value="${s}" ${s === listState.style ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
                        </select>
                    `));
                } else {
                    subGrp.appendChild(createField("Number Style", `
                        <select id="prop-list-number-style" class="text-[10px] py-1">
                            ${Object.entries(NUMBERED_STYLE_THEMES).map(([k,v]) => `<option value="${k}" ${k === listState.style ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    `));
                }

                if (listState.kind === "bulleted") {
                    const levelField = createField("Nesting & Indent", `
                        <div class="flex gap-1">
                            <button id="prop-list-outdent" class="flex-1 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50" title="Outdent (Shift+Tab)">
                                <i class="fa-solid fa-outdent text-[9px] mr-1"></i> <span class="text-[9px]">Out</span>
                            </button>
                            <button id="prop-list-indent" class="flex-1 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50" title="Indent (Tab)">
                                <i class="fa-solid fa-indent text-[9px] mr-1"></i> <span class="text-[9px]">In</span>
                            </button>
                        </div>
                    `);
                    subGrp.appendChild(levelField);
                }
                grp.appendChild(subGrp);
            }

            panel.appendChild(grp);
        }

        if (data.type === "shape") {
            const shapeGrp = createGroup("Shape Type");
            shapeGrp.appendChild(
                createField(
                    "Shape",
                    `
                <select id="prop-shape-type" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                    <option value="rectangle" ${data.shapeType === "rectangle" ? "selected" : ""}>Rectangle</option>
                    <option value="circle" ${data.shapeType === "circle" ? "selected" : ""}>Circle</option>
                    <option value="triangle" ${data.shapeType === "triangle" ? "selected" : ""}>Triangle</option>
                    <option value="diamond" ${data.shapeType === "diamond" ? "selected" : ""}>Diamond</option>
                    <option value="hexagon" ${data.shapeType === "hexagon" ? "selected" : ""}>Hexagon</option>
                    <option value="parallelogram" ${data.shapeType === "parallelogram" ? "selected" : ""}>Parallelogram</option>
                    <option value="arrow-right" ${data.shapeType === "arrow-right" ? "selected" : ""}>Arrow Right</option>
                    <option value="arrow-left" ${data.shapeType === "arrow-left" ? "selected" : ""}>Arrow Left</option>
                    <option value="arrow-up" ${data.shapeType === "arrow-up" ? "selected" : ""}>Arrow Up</option>
                    <option value="arrow-down" ${data.shapeType === "arrow-down" ? "selected" : ""}>Arrow Down</option>
                </select>
            `,
                ),
            );
            panel.appendChild(shapeGrp);
        }

        if (data.type === "connector") {
            const connectorGrp = createGroup("Connector");
            connectorGrp.innerHTML += `
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Type</label>
                        <select id="prop-connector-type" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                            <option value="line" ${data.connectorType === "line" ? "selected" : ""}>Line</option>
                            <option value="curve" ${data.connectorType === "curve" ? "selected" : ""}>Curve</option>
                            <option value="poly" ${data.connectorType === "poly" ? "selected" : ""}>Polyline</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Stroke</label>
                        <input type="number" id="prop-connector-width" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="1" max="24" value="${Math.max(1, Number(data.styles?.strokeWidth) || 4)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Start</label>
                        <select id="prop-connector-start" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                            <option value="none" ${(data.connectorStart || "none") === "none" ? "selected" : ""}>None</option>
                            <option value="arrow" ${data.connectorStart === "arrow" ? "selected" : ""}>Arrow</option>
                            <option value="triangle" ${data.connectorStart === "triangle" ? "selected" : ""}>Triangle</option>
                            <option value="chevron" ${data.connectorStart === "chevron" ? "selected" : ""}>Chevron</option>
                            <option value="line" ${data.connectorStart === "line" ? "selected" : ""}>Line</option>
                            <option value="dot" ${data.connectorStart === "dot" ? "selected" : ""}>Dot</option>
                            <option value="diamond" ${data.connectorStart === "diamond" ? "selected" : ""}>Diamond</option>
                            <option value="square" ${data.connectorStart === "square" ? "selected" : ""}>Square</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">End</label>
                        <select id="prop-connector-end" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                            <option value="none" ${data.connectorEnd === "none" ? "selected" : ""}>None</option>
                            <option value="arrow" ${(data.connectorEnd || "arrow") === "arrow" ? "selected" : ""}>Arrow</option>
                            <option value="triangle" ${data.connectorEnd === "triangle" ? "selected" : ""}>Triangle</option>
                            <option value="chevron" ${data.connectorEnd === "chevron" ? "selected" : ""}>Chevron</option>
                            <option value="line" ${data.connectorEnd === "line" ? "selected" : ""}>Line</option>
                            <option value="dot" ${data.connectorEnd === "dot" ? "selected" : ""}>Dot</option>
                            <option value="diamond" ${data.connectorEnd === "diamond" ? "selected" : ""}>Diamond</option>
                            <option value="square" ${data.connectorEnd === "square" ? "selected" : ""}>Square</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Color</label>
                        <input type="color" id="prop-connector-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(data.styles?.color, "#2563eb")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Head W</label>
                        <input type="number" id="prop-connector-head-width" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="4" max="40" value="${Math.max(4, Number(data.connectorHeadWidth) || 14)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Head L</label>
                        <input type="number" id="prop-connector-head-length" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="4" max="40" value="${Math.max(4, Number(data.connectorHeadLength) || 14)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold">Nodes</label>
                        <div class="flex gap-2">
                            <button id="prop-connector-add-node" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Add</button>
                            <button id="prop-connector-remove-node" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Remove</button>
                        </div>
                    </div>
                </div>
                <p class="text-[10px] text-slate-500 leading-snug mt-2">Select the connector, then drag its points on the canvas to reshape it.</p>
            `;
            panel.appendChild(connectorGrp);
        }

        const appGrp = createGroup("Appearance");
        // We moved most of this to the top "Layers & Appearance" group.
        // This group can be used for type-specific appearance if needed, or removed.
        // For now, let's keep it empty or remove it if it was fully migrated.

        if (data.type === "video") {
            const grp = createGroup("Video Settings");
            grp.appendChild(
                createField(
                    "Video Source",
                    `
                    <div class="flex flex-col gap-2">
                        <input type="text" id="prop-video-url" class="w-full text-xs" value="${data.content?.startsWith("data:") ? "Local File (Base64 Data)" : data.content || ""}" placeholder="https://..." ${data.content?.startsWith("data:") ? "disabled" : ""}>
                        <button onclick="document.getElementById('video-file-upload').click()" class="w-full py-1.5 px-3 bg-gray-900 border border-gray-700 rounded-lg text-[11px] text-gray-300 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                            <i class="fa-solid fa-upload text-emerald-400"></i> ${data.content?.startsWith("data:") ? "Change Local File" : "Upload Local File"}
                        </button>
                        ${
                            data.content?.startsWith("data:")
                                ? `
                            <button id="prop-video-clear-local" class="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-1">
                                <i class="fa-solid fa-link"></i> Switch to URL source
                            </button>
                        `
                                : ""
                        }
                    </div>
                `,
                ),
            );

            const checksWrap = document.createElement("div");
            checksWrap.className = "space-y-2 mt-2";
            checksWrap.innerHTML = `
                <label class="flex items-center gap-2 cursor-pointer group/chk">
                    <input type="checkbox" id="prop-video-mute" ${data.muted ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.muted ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Muted</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group/chk">
                    <input type="checkbox" id="prop-video-autoplay" ${data.autoplay ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.autoplay ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Autoplay</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group/chk">
                    <input type="checkbox" id="prop-video-loop" ${data.loop ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.loop ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Loop</span>
                </label>
            `;
            grp.appendChild(checksWrap);
            panel.appendChild(grp);
        }

        if (data.type === "image") {
            const imgGrp = createGroup("Image");
            imgGrp.appendChild(
                createField("URL", `<input type="text" id="prop-img" class="w-full" value="${data.content || ""}">`),
            );
            imgGrp.innerHTML += `
                <div class="flex gap-2 mt-2">
                    <div class="flex-1 flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Width</label>
                        <input type="number" id="prop-img-w" class="w-full text-xs" value="${parseFloat(data.width) || 0}">
                    </div>
                    <div class="flex-1 flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Height</label>
                        <input type="number" id="prop-img-h" class="w-full text-xs" value="${parseFloat(data.height) || 0}">
                    </div>
                </div>
                <label class="flex items-center gap-2 cursor-pointer group/chk mt-3 mb-2">
                    <input type="checkbox" id="prop-img-lock-aspect" ${data.lockAspectRatio ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${data.lockAspectRatio ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Lock Aspect Ratio</span>
                </label>
                <div class="h-px bg-gray-800 my-3"></div>
                <p class="text-[11px] text-gray-500 leading-relaxed">
                    Crop mode lets you drag the image area and trim with the edge handles.
                </p>
                <div class="flex gap-2 mt-2">
                    <button id="prop-crop" class="flex-1 py-2 rounded bg-gray-800 text-xs" onclick="enterCropMode('${data.id}')">CROP IMAGE</button>
                    <button id="prop-crop-reset" class="flex-1 py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-300">RESET</button>
                </div>
            `;
            panel.appendChild(imgGrp);
        }

        if (data.type === "html") {
            const embedGrp = createGroup("HTML Embed");
            embedGrp.innerHTML += `
                <button id="prop-html-toggle" class="w-full py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200 mb-2">
                    ${data.htmlInteractive ? "Disable Editor Interaction" : "Enable Editor Interaction"}
                </button>
                <div class="flex flex-col gap-1.5 mb-2">
                    <label class="text-xs font-medium text-gray-400">Mode</label>
                    <select id="prop-html-mode" class="w-full">
                        <option value="responsive" ${normalizeHtmlMode(data) === "responsive" ? "selected" : ""}>Responsive</option>
                        <option value="autofit" ${normalizeHtmlMode(data) === "autofit" ? "selected" : ""}>Autofit Content</option>
                    </select>
                </div>
                <button id="prop-html-fit" class="w-full py-2 rounded bg-accent/20 border border-accent/40 text-xs text-accent font-semibold">
                    Autofit To Full Slide
                </button>
            `;
            panel.appendChild(embedGrp);
        }

        if (data.type === "pdf") {
            const pdfGrp = createGroup("PDF Embed");
            const hasLocalPdf =
                typeof data.content === "string" &&
                (data.content.startsWith("blob:") || data.content.startsWith("data:") || data.content.startsWith("/media/"));
            pdfGrp.innerHTML += `
                <div class="flex flex-col gap-2 mb-3">
                    <input type="text" id="prop-pdf-url" class="w-full text-xs" value="${hasLocalPdf ? "Local PDF File" : data.content || ""}" placeholder="https://.../file.pdf" ${hasLocalPdf ? "disabled" : ""}>
                    <button onclick="document.getElementById('pdf-file-upload').click()" class="w-full py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200">
                        ${hasLocalPdf ? "Replace Local PDF" : "Upload Local PDF"}
                    </button>
                </div>
                <button id="prop-pdf-toggle" class="w-full py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200 mb-2">
                    ${data.pdfInteractive ? "Disable Editor Interaction" : "Enable Editor Interaction"}
                </button>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <button id="prop-pdf-mode-nav" class="py-2 rounded border text-xs ${data.pdfEditorMode === "navigate" ? "bg-accent/20 border-accent/40 text-accent" : "bg-gray-900 border-gray-700 text-gray-200"}">Navigate</button>
                    <button id="prop-pdf-mode-highlight" class="py-2 rounded border text-xs ${data.pdfEditorMode === "highlight" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-gray-900 border-gray-700 text-gray-200"}">Highlight</button>
                    <button id="prop-pdf-mode-note" class="py-2 rounded border text-xs ${data.pdfEditorMode === "note" ? "bg-sky-500/20 border-sky-500/40 text-sky-300" : "bg-gray-900 border-gray-700 text-gray-200"}">Note</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button id="prop-pdf-delete-annotation" class="py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200" ${data.pdfSelectedAnnotationId ? "" : "disabled"}>Delete Selected</button>
                    <button id="prop-pdf-clear-annotations" class="py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200" ${(data.pdfAnnotations || []).length ? "" : "disabled"}>Clear All</button>
                </div>
                <button id="prop-pdf-fit" class="w-full py-2 rounded bg-accent/20 border border-accent/40 text-xs text-accent font-semibold mt-2">
                    Fit To Full Slide
                </button>
                <p class="text-[11px] text-gray-500 leading-relaxed mt-3">
                    In highlight mode, drag to mark an area. In note mode, click to place a note. Annotations are saved with the element.
                </p>
            `;
            panel.appendChild(pdfGrp);
        }

        if (data.type === "equation") {
            const eqGrp = createGroup("Equation");
            eqGrp.innerHTML += `
                <div class="flex flex-col gap-2">
                    <button id="prop-eq-edit" class="w-full py-2 rounded bg-accent/20 border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/30 transition-colors">
                        <i class="fa-solid fa-pen-to-square mr-2"></i>Edit LaTeX
                    </button>
                    <div class="flex gap-2">
                        <div class="flex-1 flex flex-col gap-1">
                            <label class="text-[10px] text-gray-500 uppercase font-semibold">Size</label>
                            <input type="number" id="prop-eq-fs" class="w-full text-xs" value="${parseInt(data.styles?.fontSize) || 24}">
                        </div>
                        <div class="flex-1 flex flex-col gap-1">
                            <label class="text-[10px] text-gray-500 uppercase font-semibold">Color</label>
                            <input type="color" id="prop-eq-color" class="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-none" value="${data.styles?.color || "#ffffff"}">
                        </div>
                    </div>
                </div>
            `;
            panel.appendChild(eqGrp);
        }

        // ── Animation (all element types) ─────────────────────────────────
        {
            const animGrp = createGroup("Animation (Reveal.js)");
            const curAnim  = data.fragmentAnimation || "none";
            const curIndex = data.fragmentIndex != null ? data.fragmentIndex : 0;

            animGrp.innerHTML += `
                <div class="flex flex-col gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Effect</label>
                        <select id="prop-anim-type" class="w-full text-xs">
                            <option value="none"       ${curAnim==="none"              ?"selected":""}>None (always visible)</option>
                            <optgroup label="Entrance">
                                <option value="fade-in"      ${curAnim==="fade-in"         ?"selected":""}>Fade In</option>
                                <option value="fade-in-then-out" ${curAnim==="fade-in-then-out" ?"selected":""}>Fade In Then Out</option>
                                <option value="fade-in-then-semi-out" ${curAnim==="fade-in-then-semi-out" ?"selected":""}>Fade In Then Semi Out</option>
                                <option value="fade-up"      ${curAnim==="fade-up"         ?"selected":""}>Fade Up</option>
                                <option value="fade-down"    ${curAnim==="fade-down"       ?"selected":""}>Fade Down</option>
                                <option value="fade-left"    ${curAnim==="fade-left"       ?"selected":""}>Fade Left</option>
                                <option value="fade-right"   ${curAnim==="fade-right"      ?"selected":""}>Fade Right</option>
                                <option value="grow"         ${curAnim==="grow"            ?"selected":""}>Grow</option>
                            </optgroup>
                            <optgroup label="Exit">
                                <option value="fade-out"     ${curAnim==="fade-out"        ?"selected":""}>Fade Out</option>
                                <option value="shrink"       ${curAnim==="shrink"          ?"selected":""}>Shrink</option>
                                <option value="semi-fade-out" ${curAnim==="semi-fade-out"  ?"selected":""}>Semi Fade Out</option>
                            </optgroup>
                            <optgroup label="Highlight">
                                <option value="highlight-red"   ${curAnim==="highlight-red"  ?"selected":""}>Highlight Red</option>
                                <option value="highlight-green" ${curAnim==="highlight-green"?"selected":""}>Highlight Green</option>
                                <option value="highlight-blue"  ${curAnim==="highlight-blue" ?"selected":""}>Highlight Blue</option>
                                <option value="highlight-current-red" ${curAnim==="highlight-current-red" ?"selected":""}>Highlight Current Red</option>
                                <option value="highlight-current-green" ${curAnim==="highlight-current-green" ?"selected":""}>Highlight Current Green</option>
                                <option value="highlight-current-blue" ${curAnim==="highlight-current-blue" ?"selected":""}>Highlight Current Blue</option>
                                <option value="current-visible" ${curAnim==="current-visible"?"selected":""}>Current Visible (auto-hide)</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1" id="prop-anim-index-wrap">
                        <label class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Order (fragment index)</label>
                        <input type="number" id="prop-anim-index" class="w-full text-xs" min="0" max="99" value="${curIndex}" placeholder="0">
                        <p class="text-[10px] text-gray-600 leading-snug">Lower = appears earlier. Same index = appear together.</p>
                    </div>
                </div>
            `;
            panel.appendChild(animGrp);
        }
    }

    // Listeners
    setTimeout(() => {
        const btnGroup = document.getElementById("prop-group");
        const btnUngroup = document.getElementById("prop-ungroup");
        if (btnGroup) btnGroup.onclick = groupSelected;
        if (btnUngroup) btnUngroup.onclick = ungroupSelected;

        const sharedColor = document.getElementById("prop-shared-color");
        if (sharedColor) {
            sharedColor.oninput = e => {
                saveStateToUndo();
                state.selectedIds.forEach(id => {
                    updateElementStyleState(id, { backgroundColor: e.target.value });
                    document.getElementById(id).style.backgroundColor = e.target.value;
                });
                if (window.refreshPreviews) window.refreshPreviews();
            };
        }

        if (data) {
            const bg = document.getElementById("prop-bg");
            if (bg) bg.oninput = e => applyStyle("backgroundColor", e.target.value);

            const op = document.getElementById("prop-op");
            const opLabel = document.getElementById("prop-op-label");
            if (op) {
                op.oninput = e => {
                    const pct = Number(e.target.value);
                    const val = Math.max(0, Math.min(100, pct)) / 100;
                    if (opLabel) opLabel.textContent = `${Math.round(pct)}%`;
                    applyStyle("opacity", String(val));
                };
            }

            const zIndexInput = document.getElementById("prop-zindex");
            if (zIndexInput) {
                const applyZIndex = () => {
                    const val = parseInt(zIndexInput.value) || 0;
                    applyStyle("zIndex", String(val));
                    const dom = document.getElementById(data.id);
                    if (dom) dom.style.zIndex = val;
                };
                zIndexInput.onchange = applyZIndex;
                zIndexInput.onblur = applyZIndex;
            }

            const frontBtn = document.getElementById("prop-zindex-front");
            if (frontBtn) {
                frontBtn.onclick = () => {
                    // Find max zIndex on this slide and go one above
                    const els = state.slides[currentSlideIndex]?.elements || [];
                    const maxZ = els.reduce((m, e) => Math.max(m, e.styles?.zIndex || 0), 0);
                    const newZ = maxZ + 1;
                    applyStyle("zIndex", String(newZ));
                    const dom = document.getElementById(data.id);
                    if (dom) dom.style.zIndex = newZ;
                    if (zIndexInput) zIndexInput.value = newZ;
                };
            }

            const backBtn = document.getElementById("prop-zindex-back");
            if (backBtn) {
                backBtn.onclick = () => {
                    applyStyle("zIndex", "0");
                    const dom = document.getElementById(data.id);
                    if (dom) dom.style.zIndex = 0;
                    if (zIndexInput) zIndexInput.value = 0;
                };
            }

            if (data.type === "text") {
                const font = document.getElementById("prop-font");
                if (font) {
                    bindInlineFormattingGuard(font);
                    font.onchange = e => applyTextFormatting("fontFamily", e.target.value, { inlineAction: "fontFamily" });
                }
                const bold = document.getElementById("prop-bold");
                if (bold) {
                    bindInlineFormattingGuard(bold);
                    bold.onclick = () => applyTextFormatting("fontWeight", data.styles.fontWeight === "bold" ? "normal" : "bold", { inlineAction: "bold" });
                }

                const italic = document.getElementById("prop-italic");
                if (italic) {
                    bindInlineFormattingGuard(italic);
                    italic.onclick = () =>
                        applyTextFormatting("fontStyle", data.styles.fontStyle === "italic" ? "normal" : "italic", {
                            inlineAction: "italic",
                        });
                }

                const fontSize = document.getElementById("prop-fs");
                if (fontSize) {
                    bindInlineFormattingGuard(fontSize);
                    const commitFontSize = () =>
                        applyTextFormatting("fontSize", _normalizePx(fontSize.value, "32px"), { inlineAction: "fontSize" });
                    fontSize.onchange = commitFontSize;
                    fontSize.onblur = commitFontSize;
                    fontSize.onfocus = () => fontSize.select();
                }

                const textColor = document.getElementById("prop-tc");
                if (textColor) {
                    bindInlineFormattingGuard(textColor);
                    textColor.addEventListener("input", beginFormattingInteraction);
                    textColor.onchange = e => {
                        applyTextFormatting("color", e.target.value, { inlineAction: "color" });
                        endFormattingInteraction();
                    };
                }

                // Alignment Button Group
                ['left', 'center', 'right', 'justify'].forEach(align => {
                    const btn = document.getElementById(`prop-align-${align}`);
                    if (btn) {
                        btn.onclick = () => {
                            applyStyleAndRefresh("textAlign", align);
                        };
                    }
                });

                // List Type Toggles
                const setListKind = (kind) => {
                    onCommit(() => {
                        const currentListState = getTextListState(data.content, data.bulletStyle);
                        const nextStyle =
                            kind === "numbered"
                                ? currentListState.kind === "numbered"
                                    ? currentListState.style || "decimal"
                                    : "decimal"
                                : currentListState.kind === "bulleted"
                                  ? currentListState.style || "default"
                                  : "default";
                        applyTextBulletState(data, kind, nextStyle);
                        buildPropertiesPanel();
                    });
                };

                const btnNone = document.getElementById("prop-list-none");
                const btnBullet = document.getElementById("prop-list-bullet");
                const btnNumber = document.getElementById("prop-list-number");

                if (btnNone) btnNone.onclick = () => setListKind("none");
                if (btnBullet) btnBullet.onclick = () => setListKind("bulleted");
                if (btnNumber) btnNumber.onclick = () => setListKind("numbered");

                const listStyle = document.getElementById("prop-list-style");
                if (listStyle) {
                    listStyle.onchange = e => {
                        onCommit(() => {
                            applyTextBulletState(data, "bulleted", e.target.value);
                            buildPropertiesPanel();
                        });
                    };
                }

                const numberStyle = document.getElementById("prop-list-number-style");
                if (numberStyle) {
                    numberStyle.onchange = e => {
                        onCommit(() => {
                            applyTextBulletState(data, "numbered", e.target.value);
                            buildPropertiesPanel();
                        });
                    };
                }

                const indentBtn = document.getElementById("prop-list-indent");
                const outdentBtn = document.getElementById("prop-list-outdent");

                if (indentBtn) {
                    indentBtn.onclick = () => {
                        if (getTextListState(data.content, data.bulletStyle).kind !== "bulleted") return;
                        onCommit(() => {
                            shiftTextBulletLevels(data, 1);
                            buildPropertiesPanel();
                        });
                    };
                }

                if (outdentBtn) {
                    outdentBtn.onclick = () => {
                        if (getTextListState(data.content, data.bulletStyle).kind !== "bulleted") return;
                        onCommit(() => {
                            shiftTextBulletLevels(data, -1);
                            buildPropertiesPanel();
                        });
                    };
                }
            }

            if (data.type === "shape") {
                const shapeType = document.getElementById("prop-shape-type");
                if (shapeType) {
                    shapeType.onchange = e => {
                        onCommit(() => {
                            const value = e.target.value;
                            updateElementState(data.id, { shapeType: value });
                            const dom = document.getElementById(data.id);
                            if (!dom) return;
                            const shapeVisuals = {
                                rectangle: { clipPath: "none", borderRadius: data.styles.borderRadius || "0px" },
                                circle: { clipPath: "none", borderRadius: "9999px" },
                                triangle: { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: "0px" },
                                diamond: {
                                    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                                    borderRadius: "0px",
                                },
                                hexagon: {
                                    clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                                    borderRadius: "0px",
                                },
                                parallelogram: {
                                    clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)",
                                    borderRadius: "0px",
                                },
                                "arrow-right": {
                                    clipPath: "polygon(0% 32%, 62% 32%, 62% 0%, 100% 50%, 62% 100%, 62% 68%, 0% 68%)",
                                    borderRadius: "0px",
                                },
                                "arrow-left": {
                                    clipPath: "polygon(38% 0%, 38% 32%, 100% 32%, 100% 68%, 38% 68%, 38% 100%, 0% 50%)",
                                    borderRadius: "0px",
                                },
                                "arrow-up": {
                                    clipPath: "polygon(50% 0%, 100% 40%, 68% 40%, 68% 100%, 32% 100%, 32% 40%, 0% 40%)",
                                    borderRadius: "0px",
                                },
                                "arrow-down": {
                                    clipPath: "polygon(32% 0%, 68% 0%, 68% 60%, 100% 60%, 50% 100%, 0% 60%, 32% 60%)",
                                    borderRadius: "0px",
                                },
                            };
                            const visual = shapeVisuals[value] || shapeVisuals.rectangle;
                            dom.style.clipPath = visual.clipPath;
                            dom.style.borderRadius = visual.borderRadius;
                            updateElementStyleState(data.id, { borderRadius: visual.borderRadius });
                        });
                    };
                }
            }

            if (data.type === "connector") {
                const connectorType = document.getElementById("prop-connector-type");
                const connectorWidth = document.getElementById("prop-connector-width");
                const connectorStart = document.getElementById("prop-connector-start");
                const connectorEnd = document.getElementById("prop-connector-end");
                const connectorColor = document.getElementById("prop-connector-color");
                const connectorHeadWidth = document.getElementById("prop-connector-head-width");
                const connectorHeadLength = document.getElementById("prop-connector-head-length");
                const addNode = document.getElementById("prop-connector-add-node");
                const removeNode = document.getElementById("prop-connector-remove-node");

                if (connectorType) {
                    connectorType.onchange = e => {
                        onCommit(() => {
                            const nextType = e.target.value === "curve" || e.target.value === "poly" ? e.target.value : "line";
                            let nextPoints = getConnectorPoints(data).map(point => ({ ...point }));
                            if (nextType === "line") {
                                nextPoints = [nextPoints[0], nextPoints[nextPoints.length - 1]];
                            } else if (nextType === "curve" && nextPoints.length < 3) {
                                const start = nextPoints[0];
                                const end = nextPoints[nextPoints.length - 1];
                                nextPoints = [
                                    start,
                                    { x: Math.round((start.x + end.x) / 2), y: Math.round(Math.min(start.y, end.y) - 60) },
                                    end,
                                ];
                            } else if (nextType === "poly" && nextPoints.length < 3) {
                                const start = nextPoints[0];
                                const end = nextPoints[nextPoints.length - 1];
                                nextPoints = [
                                    start,
                                    { x: Math.round((start.x + end.x) / 2), y: start.y },
                                    end,
                                ];
                            }
                            data.connectorType = nextType;
                            data.points = nextPoints;
                            normalizeConnectorGeometry(data);
                            updateElementState(data.id, {
                                connectorType: nextType,
                                points: data.points,
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                            });
                            syncConnectorDom?.(data.id);
                        });
                    };
                }

                if (connectorWidth) {
                    const commitStrokeWidth = () =>
                        onCommit(() => {
                            const nextWidth = Math.max(1, Math.min(24, Number(connectorWidth.value) || 4));
                            updateElementStyleState(data.id, { strokeWidth: nextWidth });
                            data.styles.strokeWidth = nextWidth;
                            syncConnectorDom?.(data.id);
                        });
                    connectorWidth.onchange = commitStrokeWidth;
                    connectorWidth.onblur = commitStrokeWidth;
                }

                if (connectorStart) {
                    connectorStart.onchange = e =>
                        onCommit(() => {
                            updateElementState(data.id, { connectorStart: e.target.value });
                            data.connectorStart = e.target.value;
                            syncConnectorDom?.(data.id);
                        });
                }

                if (connectorEnd) {
                    connectorEnd.onchange = e =>
                        onCommit(() => {
                            updateElementState(data.id, { connectorEnd: e.target.value });
                            data.connectorEnd = e.target.value;
                            syncConnectorDom?.(data.id);
                        });
                }

                if (connectorColor) {
                    connectorColor.oninput = e =>
                        onCommit(() => {
                            updateElementStyleState(data.id, { color: e.target.value });
                            data.styles.color = e.target.value;
                            syncConnectorDom?.(data.id);
                        });
                }

                if (connectorHeadWidth) {
                    const commitHW = () =>
                        onCommit(() => {
                            const v = Math.max(4, Math.min(40, Number(connectorHeadWidth.value) || 14));
                            updateElementState(data.id, { connectorHeadWidth: v });
                            data.connectorHeadWidth = v;
                            syncConnectorDom?.(data.id);
                        });
                    connectorHeadWidth.onchange = commitHW;
                    connectorHeadWidth.onblur = commitHW;
                }

                if (connectorHeadLength) {
                    const commitHL = () =>
                        onCommit(() => {
                            const v = Math.max(4, Math.min(40, Number(connectorHeadLength.value) || 14));
                            updateElementState(data.id, { connectorHeadLength: v });
                            data.connectorHeadLength = v;
                            syncConnectorDom?.(data.id);
                        });
                    connectorHeadLength.onchange = commitHL;
                    connectorHeadLength.onblur = commitHL;
                }

                if (addNode) {
                    addNode.onclick = () =>
                        onCommit(() => {
                            if ((data.connectorType || "line") === "line") return;
                            const points = getConnectorPoints(data).map(point => ({ ...point }));
                            const prev = points[points.length - 2];
                            const last = points[points.length - 1];
                            points.splice(points.length - 1, 0, {
                                x: Math.round((prev.x + last.x) / 2),
                                y: Math.round((prev.y + last.y) / 2 - (data.connectorType === "curve" ? 36 : 0)),
                            });
                            data.points = points;
                            normalizeConnectorGeometry(data);
                            updateElementState(data.id, {
                                points: data.points,
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                            });
                            syncConnectorDom?.(data.id);
                        });
                }

                if (removeNode) {
                    removeNode.onclick = () =>
                        onCommit(() => {
                            const minPoints = (data.connectorType || "line") === "line" ? 2 : 3;
                            const points = getConnectorPoints(data).map(point => ({ ...point }));
                            if (points.length <= minPoints) return;
                            points.splice(points.length - 2, 1);
                            data.points = points;
                            normalizeConnectorGeometry(data);
                            updateElementState(data.id, {
                                points: data.points,
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                            });
                            syncConnectorDom?.(data.id);
                        });
                }
            }

            if (data.type === "image") {
                const imageUrl = document.getElementById("prop-img");
                if (imageUrl) {
                    const commitImage = () => {
                        const nextUrl = imageUrl.value.trim();
                        if (!nextUrl) return;
                        onCommit(() => {
                            updateElementState(data.id, { content: nextUrl });
                            const dom = document.getElementById(data.id);
                            const img = dom?.querySelector("img");
                            if (img) img.src = nextUrl;
                        });
                    };
                    imageUrl.onchange = commitImage;
                    imageUrl.onblur = commitImage;
                }

                const imgW = document.getElementById("prop-img-w");
                const imgH = document.getElementById("prop-img-h");
                const imgLock = document.getElementById("prop-img-lock-aspect");

                if (imgLock) {
                    imgLock.onchange = e => {
                        saveStateToUndo();
                        const locked = e.target.checked;
                        updateElementState(data.id, { lockAspectRatio: locked });
                        data.lockAspectRatio = locked;
                        
                        // Manually update custom checkbox UI for instant feedback
                        const checkmark = e.target.nextElementSibling?.firstElementChild;
                        if (checkmark) {
                            checkmark.classList.toggle("opacity-100", locked);
                            checkmark.classList.toggle("opacity-0", !locked);
                        }
                    };
                }

                if (imgW && imgH) {
                    const commitDim = (isWidth) => {
                        onCommit(() => {
                            let newW = parseFloat(imgW.value);
                            let newH = parseFloat(imgH.value);
                            if (isNaN(newW) || newW < 10) newW = 10;
                            if (isNaN(newH) || newH < 10) newH = 10;

                            if (data.lockAspectRatio) {
                                const origW = parseFloat(data.width) || newW;
                                const origH = parseFloat(data.height) || newH;
                                const ratio = origW / origH;
                                if (isWidth) {
                                    newH = newW / ratio;
                                    imgH.value = newH;
                                } else {
                                    newW = newH * ratio;
                                    imgW.value = newW;
                                }
                            }

                            updateElementState(data.id, { width: newW + "px", height: newH + "px", heightSetManually: true });
                            data.width = newW + "px";
                            data.height = newH + "px";
                            data.heightSetManually = true;
                            const dom = document.getElementById(data.id);
                            if (dom) {
                                dom.style.width = newW + "px";
                                dom.style.height = newH + "px";
                            }
                            updateGroupBound();
                        });
                    };
                    imgW.onchange = () => commitDim(true);
                    imgW.onblur = () => commitDim(true);
                    imgH.onchange = () => commitDim(false);
                    imgH.onblur = () => commitDim(false);
                }

                const cropResetBtn = document.getElementById("prop-crop-reset");
                if (cropResetBtn) {
                    cropResetBtn.onclick = () => {
                        onCommit(() => {
                            delete data.cropTransform;
                            updateElementState(data.id, { cropTransform: null });
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                }
            }

            if (data.type === "html") {
                const toggleBtn = document.getElementById("prop-html-toggle");
                if (toggleBtn) {
                    toggleBtn.onclick = () => {
                        onCommit(() => {
                            const next = !data.htmlInteractive;
                            updateElementState(data.id, { htmlInteractive: next });
                            syncHtmlEmbedDom({ ...data, htmlInteractive: next });
                            buildPropertiesPanel();
                        });
                    };
                }

                const modeField = document.getElementById("prop-html-mode");
                if (modeField) {
                    modeField.onchange = e => {
                        onCommit(() => {
                            const nextMode = e.target.value === "autofit" ? "autofit" : "responsive";
                            updateElementState(data.id, { htmlMode: nextMode });
                            syncHtmlEmbedDom({ ...data, htmlMode: nextMode });
                            buildPropertiesPanel();
                        });
                    };
                }                const fitBtn = document.getElementById("prop-html-fit");
                if (fitBtn) {
                    fitBtn.onclick = () => {
                        onCommit(() => {
                            const { width, height } = getSlideDimensions();
                            updateElementState(data.id, {
                                x: 0,
                                y: 0,
                                width: `${width}px`,
                                height: `${height}px`,
                                htmlMode: "autofit",
                            });
                            const dom = document.getElementById(data.id);
                            if (dom) {
                                dom.style.transform = `translate(0px, 0px)`;
                                dom.setAttribute("data-x", 0);
                                dom.setAttribute("data-y", 0);
                                dom.style.width = `${width}px`;
                                dom.style.height = `${height}px`;
                            }
                            syncHtmlEmbedDom({
                                ...data,
                                x: 0,
                                y: 0,
                                width: `${width}px`,
                                height: `${height}px`,
                                htmlMode: "autofit",
                            });
                            buildPropertiesPanel();
                        });
                    };
                }
            }

            if (data.type === "equation") {
                const editBtn = document.getElementById("prop-eq-edit");
                if (editBtn) {
                    editBtn.onclick = () => {
                        if (typeof openEquationModal === "function") {
                            openEquationModal(data.latexSrc, data.id);
                        }
                    };
                }

                const fontSize = document.getElementById("prop-eq-fs");
                if (fontSize) {
                    const commitFontSize = () => {
                        onCommit(() => {
                            const val = `${fontSize.value}px`;
                            updateElementState(data.id, { styles: { ...data.styles, fontSize: val } });
                            data.styles.fontSize = val;
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                        });
                    };
                    fontSize.onchange = commitFontSize;
                    fontSize.onblur = commitFontSize;
                }

                const colorPicker = document.getElementById("prop-eq-color");
                if (colorPicker) {
                    colorPicker.oninput = e => {
                        const val = e.target.value;
                        updateElementState(data.id, { styles: { ...data.styles, color: val } });
                        data.styles.color = val;
                        // Real-time update for better UX
                        const dom = document.getElementById(data.id);
                        if (dom) {
                            const container = dom.querySelector(".equation-container");
                            if (container) container.style.color = val;
                        }
                    };
                    colorPicker.onchange = () => {
                        onCommit(() => {
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                        });
                    };
                }
            }

            if (data.type === "pdf") {
                const urlField = document.getElementById("prop-pdf-url");
                if (urlField) {
                    const commitPdfUrl = () => {
                        const nextUrl = urlField.value.trim();
                        if (!nextUrl) return;
                        onCommit(() => {
                            updateElementState(data.id, { content: nextUrl });
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                    urlField.onchange = commitPdfUrl;
                    urlField.onblur = commitPdfUrl;
                }

                const toggleBtn = document.getElementById("prop-pdf-toggle");
                if (toggleBtn) {
                    toggleBtn.onclick = () => {
                        onCommit(() => {
                            const next = !data.pdfInteractive;
                            updateElementState(data.id, { pdfInteractive: next });
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                }

                const setPdfMode = nextMode => {
                    onCommit(() => {
                        updateElementState(data.id, { pdfEditorMode: nextMode });
                        syncPdfEmbedDom({ ...data, pdfEditorMode: nextMode });
                        buildPropertiesPanel();
                    });
                };

                document.getElementById("prop-pdf-mode-nav")?.addEventListener("click", () => setPdfMode("navigate"));
                document.getElementById("prop-pdf-mode-highlight")?.addEventListener("click", () => setPdfMode("highlight"));
                document.getElementById("prop-pdf-mode-note")?.addEventListener("click", () => setPdfMode("note"));

                const deleteBtn = document.getElementById("prop-pdf-delete-annotation");
                if (deleteBtn) {
                    deleteBtn.onclick = () => {
                        onCommit(() => {
                            const nextAnnotations = (data.pdfAnnotations || []).filter(item => item.id !== data.pdfSelectedAnnotationId);
                            updateElementState(data.id, { pdfAnnotations: nextAnnotations, pdfSelectedAnnotationId: "" });
                            schedulePresentationAutosave?.(150);
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                }

                const clearBtn = document.getElementById("prop-pdf-clear-annotations");
                if (clearBtn) {
                    clearBtn.onclick = () => {
                        onCommit(() => {
                            updateElementState(data.id, { pdfAnnotations: [], pdfSelectedAnnotationId: "" });
                            schedulePresentationAutosave?.(150);
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                }

                const fitBtn = document.getElementById("prop-pdf-fit");
                if (fitBtn) {
                    fitBtn.onclick = () => {
                        onCommit(() => {
                            const { width, height } = getSlideDimensions();
                            updateElementState(data.id, {
                                x: 0,
                                y: 0,
                                width: `${width}px`,
                                height: `${height}px`,
                            });
                            const dom = document.getElementById(data.id);
                            if (dom) {
                                dom.style.transform = "translate(0px, 0px)";
                                dom.setAttribute("data-x", 0);
                                dom.setAttribute("data-y", 0);
                                dom.style.width = `${width}px`;
                                dom.style.height = `${height}px`;
                            }
                            updateGroupBound();
                            buildPropertiesPanel();
                        });
                    };
                }
            }

            // ── Animation listeners ─────────────────────────────────────────
            {
                const animType  = document.getElementById("prop-anim-type");
                const animIndex = document.getElementById("prop-anim-index");

                const applyAnimation = () => {
                    const type  = animType  ? animType.value  : "none";
                    const idx   = animIndex ? parseInt(animIndex.value) || 0 : 0;
                    const dom   = document.getElementById(data.id);

                    if (type === "none") {
                        updateElementState(data.id, { fragmentAnimation: "none", fragmentIndex: null });
                        data.fragmentAnimation = "none";
                        data.fragmentIndex = null;
                        syncFragmentDomState(dom, "none", null);
                    } else {
                        updateElementState(data.id, { fragmentAnimation: type, fragmentIndex: idx });
                        data.fragmentAnimation = type;
                        data.fragmentIndex = idx;
                        syncFragmentDomState(dom, type, idx);
                    }
                    // Show/hide order input
                    const wrap = document.getElementById("prop-anim-index-wrap");
                    if (wrap) wrap.style.display = type === "none" ? "none" : "";
                };

                if (animType)  animType.onchange  = applyAnimation;
                if (animIndex) animIndex.onchange  = applyAnimation;
                if (animIndex) animIndex.oninput   = applyAnimation;

                // Initial state: hide order input if no animation
                const wrap = document.getElementById("prop-anim-index-wrap");
                if (wrap && (data.fragmentAnimation || "none") === "none") wrap.style.display = "none";
            }

            if (data.type === "video") {
                const videoUrl = document.getElementById("prop-video-url");
                if (videoUrl) {
                    const commitVideo = () => {
                        const nextUrl = videoUrl.value.trim();
                        if (!nextUrl) return;
                        onCommit(() => {
                            updateElementState(data.id, { content: nextUrl });
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                    videoUrl.onchange = commitVideo;
                    videoUrl.onblur = commitVideo;
                }

                const clearLocalBtn = document.getElementById("prop-video-clear-local");
                if (clearLocalBtn) {
                    clearLocalBtn.onclick = () => {
                        onCommit(() => {
                            updateElementState(data.id, { content: "" });
                            if (window.renderSlidesFromState) window.renderSlidesFromState();
                            buildPropertiesPanel();
                        });
                    };
                }

                [
                    ["mute", "muted"],
                    ["autoplay", "autoplay"],
                    ["loop", "loop"],
                ].forEach(([inputKey, stateKey]) => {
                    const chk = document.getElementById(`prop-video-${inputKey}`);
                    if (chk) {
                        chk.onchange = () => {
                            onCommit(() => {
                                const nextVal = chk.checked;
                                updateElementState(data.id, { [stateKey]: nextVal });
                                if (window.renderSlidesFromState) window.renderSlidesFromState();
                                buildPropertiesPanel();
                            });
                        };
                    }
                });
            }


        }
    }, 0);

    requestAnimationFrame(updateFloatingTextToolbar);
}



function groupSelected() {
    if (state.selectedIds.length < 2) return;
    saveStateToUndo();
    const groupId = generateId("grp");
    state.selectedIds.forEach(id => updateElementState(id, { groupId }));
    buildPropertiesPanel();
    updateGroupBound();
}

function ungroupSelected() {
    saveStateToUndo();
    state.selectedIds.forEach(id => updateElementState(id, { groupId: null }));
    buildPropertiesPanel();
    updateGroupBound();
}

function applyStyle(prop, value) {
    if (state.selectedIds.length === 0) return;
    
    saveStateToUndo();

    state.selectedIds.forEach(id => {
        const data = state.slides[currentSlideIndex].elements.find(e => e.id === id);
        if (!data) return;

        const dom = document.getElementById(id);
        const contentHost = data.type === "text" ? dom?.querySelector(".text-element-content") : null;

        if (data.type === "text" && prop === "color") {
            let nextContent = data.content;
            if (contentHost?.dataset.structuredEdit === "true" && _getStructuredEditorMode(contentHost) === "list") {
                nextContent = stripInlineColorFromTextContent(parseStructuredBulletEditorHtml(contentHost));
                contentHost.innerHTML = buildStructuredBulletEditorHtml(nextContent, data.bulletStyle || "default");
            } else if (!contentHost?.isContentEditable) {
                nextContent = stripInlineColorFromTextContent(data.content);
            }

            if (nextContent !== data.content) {
                updateElementState(id, { content: nextContent });
                data.content = nextContent;
            }
        }

        updateElementStyleState(id, { [prop]: value });
        markTextElementStyleAsLocal(data, prop);
        if (!dom) return;

        const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        // Force important for text styles to override Reveal.js and theme defaults
        const textProps = ["color", "fontSize", "fontFamily", "fontWeight", "fontStyle", "textAlign", "lineHeight"];
        const priority = textProps.includes(prop) ? "important" : "";
        
        dom.style.setProperty(cssProp, value, priority);

        if (data.type === "text") {
            if (contentHost) {
                contentHost.style.setProperty(cssProp, value, priority);
                if (prop === "color" && contentHost.dataset.structuredEdit !== "true") {
                    contentHost.innerHTML = renderTextContent(data);
                }
            }
            const layout = syncTextBoxLayout(dom, data);
            if (layout?.autoHeight && Number.isFinite(layout.height)) {
                updateElementState(id, { height: `${layout.height}px` });
                data.height = `${layout.height}px`;
            }
        }
    });

    if (window.refreshPreviews) window.refreshPreviews();
    updateGroupBound();
}

function applyStyleAndRefresh(prop, value) {
    applyStyle(prop, value);
    buildPropertiesPanel();
}

function updateUIFromSelection() {
    const inline = getStyleAtSelection();
    if (!inline) return;

    // Update Font Family
    const fontSelect = document.getElementById("prop-font");
    if (fontSelect && inline.fontFamily) {
        const family = inline.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
        // Try to find matching option
        for (let opt of fontSelect.options) {
            if (opt.value.toLowerCase().includes(family.toLowerCase())) {
                fontSelect.value = opt.value;
                break;
            }
        }
    }

    // Update Font Size
    const fsInput = document.getElementById("prop-fs");
    if (fsInput && inline.fontSize) {
        fsInput.value = parseInt(inline.fontSize) || 32;
    }

    // Update Color
    const colorInput = document.getElementById("prop-tc");
    if (colorInput && inline.color) {
        // Convert rgb(r, g, b) to #rrggbb
        let color = inline.color;
        if (color.startsWith("rgb")) {
            const match = color.match(/\d+/g);
            if (match) {
                color = "#" + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            }
        }
        colorInput.value = color;
    }

    // Update Bold/Italic states
    const boldBtn = document.getElementById("prop-bold");
    if (boldBtn) {
        boldBtn.classList.toggle("active", inline.fontWeight === "bold");
    }
    const italicBtn = document.getElementById("prop-italic");
    if (italicBtn) {
        italicBtn.classList.toggle("active", inline.fontStyle === "italic");
    }
}

// Global selection listener
let _selectionSyncTimeout = null;
document.addEventListener("selectionchange", () => {
    if (_selectionSyncTimeout) return;
    _selectionSyncTimeout = setTimeout(() => {
        updateUIFromSelection();
        _selectionSyncTimeout = null;
    }, 100);
});

function bindInlineFormattingGuard(element) {
    if (!element) return;
    element.addEventListener("pointerdown", () => {
        if (getActiveInlineEditor()) {
            captureInlineSelection();
            beginFormattingInteraction();
        }
        if (element.tagName === "INPUT" || element.tagName === "SELECT") {
            setTimeout(() => element.focus(), 0);
        }
    });
    const release = () => {
        if (getActiveInlineEditor()) {
            requestAnimationFrame(() => {
                restoreInlineSelection();
                endFormattingInteraction();
            });
        } else {
            endFormattingInteraction();
        }
    };
    element.addEventListener("change", release);
    element.addEventListener("input", release);
    element.addEventListener("click", release);
    element.addEventListener("blur", release);
}

function _normalizePx(value, fallback = "32px") {
    const str = String(value || "").trim();
    if (!str) return fallback;
    if (/^-?\d+(\.\d+)?px$/i.test(str)) return str;
    if (/^-?\d+(\.\d+)?$/.test(str)) return `${str}px`;
    return fallback;
}

function _normalizeColorForInput(value, fallback = "#000000") {
    const str = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(str)) return str;
    if (/^#[0-9a-f]{3}$/i.test(str)) {
        const r = str[1];
        const g = str[2];
        const b = str[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return fallback;
}
