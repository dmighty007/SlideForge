

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
        if (editor.contentEditable !== "true") {
            editor.contentEditable = "true";
        }
        if (typeof setActiveInlineEditor === "function") {
            setActiveInlineEditor(editor);
        }
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

let _propertiesPanelSelectionSignature = "";

function markTextElementStyleAsLocal(data, prop) {
    if (!data || data.type !== "text") return;
    if (!["color"].includes(prop)) return;
    if (data.themeManaged === false) return;
    const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : null;
    const currentColor = String(data.styles?.color || "").trim().toLowerCase();
    const normalizedThemeColors = new Set(
        [
            theme?.defaultTextColor,
            theme?.defaultMutedColor,
            theme?.accentStrong,
            theme?.defaultShapeColor,
            theme?.cssVars?.["--slide-accent"],
            theme?.cssVars?.["--slide-accent-2"],
        ]
            .filter(Boolean)
            .map(value => String(value).trim().toLowerCase()),
    );
    if (normalizedThemeColors.has(currentColor)) return;
    updateElementState(data.id, { themeManaged: false });
    data.themeManaged = false;
}

function _normalizeStrokeWidthValue(value, fallback = "0px") {
    const raw = String(value ?? "").trim();
    if (!raw) return fallback;
    const num = Number.parseFloat(raw.replace("px", ""));
    return Number.isFinite(num) && num >= 0 ? `${num}px` : fallback;
}

function _parseTextShadowValue(value) {
    const fallback = { offsetX: 0, offsetY: 0, blur: 0, color: "#000000" };
    if (!value || value === "none") return fallback;
    const match = String(value)
        .trim()
        .match(/^(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(.+)$/i);
    if (!match) return fallback;
    return {
        offsetX: Number(match[1]) || 0,
        offsetY: Number(match[2]) || 0,
        blur: Math.max(0, Number(match[3]) || 0),
        color: _normalizeColorForInput(match[4], "#000000"),
    };
}

function _buildTextShadowValue(offsetX, offsetY, blur, color) {
    const x = Number(offsetX) || 0;
    const y = Number(offsetY) || 0;
    const b = Math.max(0, Number(blur) || 0);
    const c = _normalizeColorForInput(color, "#000000");
    if (x === 0 && y === 0 && b === 0) return "none";
    return `${x}px ${y}px ${b}px ${c}`;
}

function _buildTextEffectPresetMap(data) {
    const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : null;
    const themeId = typeof state !== "undefined" ? state.presentationTheme : "";
    const accent = _normalizeColorForInput(theme?.accentStrong, "#2563eb");
    const textColor = _normalizeColorForInput(data?.styles?.color, "#172033");
    const fontSize = parseFloat(String(data?.styles?.fontSize || "32").replace("px", "")) || 32;
    const isTitleLike = fontSize >= 40;
    return {
        none: {
            textShadow: "none",
            textStrokeWidth: "0px",
            textStrokeColor: "#000000",
        },
        soft: {
            textShadow: _buildTextShadowValue(0, 2, 10, "#00000044"),
            textStrokeWidth: "0px",
            textStrokeColor: "#000000",
        },
        dramatic: {
            textShadow: _buildTextShadowValue(0, 5, 18, "#00000088"),
            textStrokeWidth: "0px",
            textStrokeColor: "#000000",
        },
        glow: {
            textShadow: _buildTextShadowValue(0, 0, isTitleLike ? 18 : 12, `${accent}cc`),
            textStrokeWidth: "0px",
            textStrokeColor: accent,
        },
        outline: {
            textShadow: "none",
            textStrokeWidth: isTitleLike ? "2px" : "1px",
            textStrokeColor: textColor === "#ffffff" ? "#111827" : "#ffffff",
        },
        auto: {
            textShadow: isTitleLike
                ? _buildTextShadowValue(0, 4, 16, themeId === "chalkboard" ? "#00000066" : "#00000055")
                : _buildTextShadowValue(0, 2, 8, "#00000033"),
            textStrokeWidth: themeId === "chalkboard" && isTitleLike ? "1px" : "0px",
            textStrokeColor: themeId === "chalkboard" ? "#f6f1d1" : accent,
        },
    };
}

function _applyTextEffectPreset(data, presetName) {
    if (!data || data.type !== "text") return;
    const preset = _buildTextEffectPresetMap(data)[presetName];
    if (!preset) return;
    applyStyle("textShadow", preset.textShadow);
    applyStyle("textStrokeWidth", preset.textStrokeWidth);
    applyStyle("textStrokeColor", preset.textStrokeColor);
}

function applySelectedTextEffectPreset(presetName) {
    const data = getSelectedElementData();
    if (!data || data.type !== "text") return;
    _applyTextEffectPreset(data, presetName);
    buildPropertiesPanel();
}

function mutateSelectedTableData(mutator) {
    const data = getSelectedElementData();
    if (!data || data.type !== "table") return;
    saveStateToUndo();
    const nextTableData = normalizeTableData(data.tableData);
    mutator(nextTableData);
    const normalized = normalizeTableData(nextTableData);
    updateElementState(data.id, { tableData: normalized });
    data.tableData = normalized;
    if (window.renderSlidesFromState) window.renderSlidesFromState();
    buildPropertiesPanel();
}

function setSelectedTablePart(tableId, selection) {
    const data = state.slides[currentSlideIndex]?.elements?.find(e => e.id === tableId);
    if (!data || data.type !== "table") return;
    const tableData = normalizeTableData(data.tableData);
    tableData.selection = selection || null;
    updateElementState(tableId, { tableData });
    data.tableData = tableData;
    selectElement(tableId, "replace");
    syncTableDomSelection(tableId, tableData.selection);
    buildPropertiesPanel();
}

function syncTableDomSelection(tableId, selection = null) {
    const dom = document.getElementById(tableId);
    if (!dom) return;
    dom.querySelectorAll(".table-element-cell").forEach(cell => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        cell.classList.toggle("is-active", selection?.type === "cell" && selection.row === row && selection.col === col);
        cell.classList.toggle("is-row-selected", selection?.type === "row" && selection.row === row);
        cell.classList.toggle("is-col-selected", selection?.type === "col" && selection.col === col);
    });
}

function clearTablePartSelections() {
    document
        .querySelectorAll(".table-element-cell.is-active, .table-element-cell.is-row-selected, .table-element-cell.is-col-selected")
        .forEach(node => node.classList.remove("is-active", "is-row-selected", "is-col-selected"));
}

function _renderTextEffectPresetButton(data, presetName, label) {
    const preset = _buildTextEffectPresetMap(data)[presetName];
    const baseColor = _normalizeColorForInput(data?.styles?.color, "#172033");
    const strokeWidth = _normalizeStrokeWidthValue(preset?.textStrokeWidth, "0px");
    const strokeColor = _normalizeColorForInput(preset?.textStrokeColor, "#000000");
    const shadow = preset?.textShadow || "none";
    const swatchStyle = [
        `color:${baseColor}`,
        `text-shadow:${shadow === "none" ? "none" : shadow}`,
        `-webkit-text-stroke-width:${strokeWidth}`,
        `-webkit-text-stroke-color:${strokeColor}`,
    ].join(";");
    return `
        <button type="button" id="prop-effect-${presetName}" class="prop-effect-btn" title="${label}" onclick="applySelectedTextEffectPreset('${presetName}')">
            <span class="prop-effect-swatch" style="${swatchStyle}">Aa</span>
            <span class="prop-effect-label">${label}</span>
        </button>
    `;
}

function _setElementDomStyleProperty(dom, prop, value, priority = "") {
    if (!dom) return;
    if (prop === "textStrokeWidth") {
        if (!value || value === "0px" || value === "0") dom.style.removeProperty("-webkit-text-stroke-width");
        else dom.style.setProperty("-webkit-text-stroke-width", value, priority);
        return;
    }
    if (prop === "textStrokeColor") {
        if (!value || value === "transparent") dom.style.removeProperty("-webkit-text-stroke-color");
        else dom.style.setProperty("-webkit-text-stroke-color", value, priority);
        return;
    }
    const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
    if (value === undefined || value === null || value === "") dom.style.removeProperty(cssProp);
    else dom.style.setProperty(cssProp, value, priority);
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

function getThemeTextStyleDefaults() {
    const theme = typeof getPresentationTheme === "function" ? getPresentationTheme() : null;
    return {
        fontFamily: theme?.bodyFont || '"Manrope", sans-serif',
        fontSize: "32px",
        fontWeight: "normal",
        fontStyle: "normal",
        color: theme?.defaultTextColor || "#2E2E2E",
    };
}

function setTextControlActive(element, isActive) {
    if (!element) return;
    element.classList.toggle("active", Boolean(isActive));
    element.classList.toggle("text-style-active", Boolean(isActive));
}

function normalizeBorderWidthValue(value, fallback = "0px") {
    const num = Number.parseFloat(String(value ?? "").replace("px", ""));
    return Number.isFinite(num) && num >= 0 ? `${num}px` : fallback;
}

function getElementOutlineState(data) {
    const width = normalizeBorderWidthValue(data?.styles?.borderWidth, "0px");
    const style = data?.styles?.borderStyle || (parseFloat(width) > 0 ? "solid" : "none");
    return {
        width,
        style,
        color: _normalizeColorForInput(data?.styles?.borderColor, "#334155"),
        radius: normalizeBorderWidthValue(data?.styles?.borderRadius, "0px"),
    };
}

function appendElementOutlineControls(group, data) {
    if (!data || !["text", "shape"].includes(data.type)) return;
    const outline = getElementOutlineState(data);
    group.appendChild(
        createField(
            "Outline",
            `
        <div class="grid grid-cols-4 gap-2 items-end">
            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Style</label>
                <select id="prop-outline-style" class="prop-input-sm">
                    <option value="none" ${outline.style === "none" ? "selected" : ""}>None</option>
                    <option value="solid" ${outline.style === "solid" ? "selected" : ""}>Solid</option>
                    <option value="dashed" ${outline.style === "dashed" ? "selected" : ""}>Dash</option>
                    <option value="dotted" ${outline.style === "dotted" ? "selected" : ""}>Dot</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Width</label>
                <input type="number" id="prop-outline-width" class="prop-input-sm" min="0" max="32" step="1" value="${parseFloat(outline.width) || 0}">
            </div>
            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Color</label>
                <input type="color" id="prop-outline-color" class="prop-color-input" value="${outline.color}">
            </div>
            <div>
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Radius</label>
                <input type="number" id="prop-outline-radius" class="prop-input-sm" min="0" max="999" step="1" value="${parseFloat(outline.radius) || 0}">
            </div>
        </div>
    `,
        ),
    );
}

function bindElementOutlineControls(data) {
    if (!data || !["text", "shape"].includes(data.type)) return;
    const styleInput = document.getElementById("prop-outline-style");
    const widthInput = document.getElementById("prop-outline-width");
    const colorInput = document.getElementById("prop-outline-color");
    const radiusInput = document.getElementById("prop-outline-radius");
    if (!styleInput || !widthInput || !colorInput || !radiusInput) return;

    const commit = () => {
        const nextStyle = styleInput.value || "none";
        const nextWidth = nextStyle === "none" ? "0px" : normalizeBorderWidthValue(widthInput.value, "1px");
        const nextColor = _normalizeColorForInput(colorInput.value, "#334155");
        const nextRadius = normalizeBorderWidthValue(radiusInput.value, "0px");

        saveStateToUndo();
        updateElementStyleState(data.id, {
            borderStyle: nextStyle,
            borderWidth: nextWidth,
            borderColor: nextColor,
            borderRadius: nextRadius,
        });
        Object.assign(data.styles, {
            borderStyle: nextStyle,
            borderWidth: nextWidth,
            borderColor: nextColor,
            borderRadius: nextRadius,
        });

        const dom = document.getElementById(data.id);
        if (dom) {
            _setElementDomStyleProperty(dom, "borderStyle", nextStyle);
            _setElementDomStyleProperty(dom, "borderWidth", nextWidth);
            _setElementDomStyleProperty(dom, "borderColor", nextColor);
            _setElementDomStyleProperty(dom, "borderRadius", nextRadius);
            if (data.type === "text") {
                const layout = syncTextBoxLayout(dom, data);
                if (layout?.autoHeight && Number.isFinite(layout.height)) {
                    updateElementState(data.id, { height: `${layout.height}px` });
                    data.height = `${layout.height}px`;
                }
            }
        }
        refreshPreviews?.();
    };

    styleInput.onchange = () => {
        if (styleInput.value !== "none" && Number(widthInput.value) === 0) widthInput.value = "1";
        commit();
    };
    widthInput.onchange = commit;
    widthInput.onblur = commit;
    colorInput.oninput = commit;
    radiusInput.onchange = commit;
    radiusInput.onblur = commit;
}

function isControlBeingEdited(element) {
    return Boolean(element && document.activeElement === element && ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName));
}

function bindFontSizeFormattingControl(input) {
    if (!input || input.dataset.fontSizeFormattingBound === "true") return;
    input.dataset.fontSizeFormattingBound = "true";
    bindInlineFormattingGuard(input);

    const commit = () => {
        const raw = String(input.value || "").trim();
        if (!raw) return;
        const nextValue = _normalizePx(raw, "");
        if (!nextValue) return;
        if (input.dataset.lastCommittedValue === nextValue) return;
        input.dataset.lastCommittedValue = nextValue;
        restoreInlineSelection?.();
        applyTextFormatting("fontSize", nextValue, { inlineAction: "fontSize" });
    };

    input.addEventListener("input", () => {
        setTextControlActive(input, _normalizePx(input.value, "32px") !== getThemeTextStyleDefaults().fontSize);
    });
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit();
        input.blur();
    });
    input.addEventListener("focus", () => input.select());
}

function clearTextFormatting(data = getSelectedElementData()) {
    if (!data || data.type !== "text") return;
    const defaults = getThemeTextStyleDefaults();
    const dom = document.getElementById(data.id);
    const contentHost = dom?.querySelector(".text-element-content");
    const sourceContent = contentHost?.isContentEditable ? contentHost.innerHTML : data.content;
    const nextContent = stripAllInlineTextFormattingFromTextContent(sourceContent);
    const nextStyles = {
        ...data.styles,
        fontFamily: defaults.fontFamily,
        fontSize: defaults.fontSize,
        fontWeight: defaults.fontWeight,
        fontStyle: defaults.fontStyle,
        color: defaults.color,
    };

    saveStateToUndo();
    updateElementState(data.id, { content: nextContent, styles: nextStyles, themeManaged: true });
    data.content = nextContent;
    data.styles = nextStyles;
    data.themeManaged = true;

    if (contentHost) {
        contentHost.innerHTML = renderTextContent({ ...data, content: nextContent });
        ["fontFamily", "fontSize", "fontWeight", "fontStyle", "color"].forEach(prop => {
            _setElementDomStyleProperty(contentHost, prop, nextStyles[prop], "important");
            _setElementDomStyleProperty(dom, prop, nextStyles[prop], "important");
        });
        if (contentHost.isContentEditable) {
            const selection = window.getSelection?.();
            const range = document.createRange();
            range.selectNodeContents(contentHost);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
            captureInlineSelection?.();
        }
    } else if (dom) {
        syncTextDomContent(data);
    }

    const layout = dom ? syncTextBoxLayout(dom, data) : null;
    if (layout?.autoHeight && Number.isFinite(layout.height)) {
        updateElementState(data.id, { height: `${layout.height}px` });
        data.height = `${layout.height}px`;
    }
    updateFloatingTextToolbar?.();
    buildPropertiesPanel();
    refreshPreviews?.();
}

function applyTextFormatting(prop, value, options = {}) {
    const data = getSelectedElementData();
    if (!data || data.type !== "text") return;

    const inlineContext = getActiveInlineTextContext(data);
    const isInlineEditingSession = !!document.querySelector(
        ".canvas-element.editing-text .text-element-content[contenteditable='true']"
    );
    
    if (inlineContext) {
        // We have an active editor context. 
        // We MUST restore the selection before checking or applying styles
        // because the focus is likely on the sidebar/color picker now.
        if (typeof restoreInlineSelection === "function") {
            restoreInlineSelection();
        }

        if (typeof hasNonCollapsedInlineSelection === "function" && !hasNonCollapsedInlineSelection()) {
            if (["fontWeight", "fontStyle", "fontFamily", "fontSize", "color"].includes(prop)) {
                applyStyle(prop, value);
            }
            return;
        }

        saveStateToUndo();
        inlineContext.editor.dataset.undoSnapshotCaptured = "true";
        const success = applyInlineTextStyle(
            options.inlineAction || prop,
            options.inlineValue !== undefined ? options.inlineValue : value,
        );
        
        if (success) {
            const nextContent =
                inlineContext.editor.dataset.structuredEdit === "true" &&
                _getStructuredEditorMode(inlineContext.editor) === "list"
                    ? parseStructuredBulletEditorHtml(inlineContext.editor)
                    : inlineContext.editor.innerHTML;
            updateElementState(data.id, { content: nextContent });
            data.content = nextContent;
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

    // Fallback: Apply to the entire element only outside inline edit mode.
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
            if (!idsToSelect.includes(prevId)) {
                const prevData = state.slides[currentSlideIndex]?.elements?.find(e => e.id === prevId);
                if (prevData?.type === "table") {
                    const prevTableData = normalizeTableData(prevData.tableData);
                    if (prevTableData.selection) {
                        prevTableData.selection = null;
                        updateElementState(prevId, { tableData: prevTableData });
                        prevData.tableData = prevTableData;
                    }
                }
            }
        });
        state.selectedIds = idsToSelect;
    }

    // Single render pass with the correct final state
    buildPropertiesPanel();
    updateGroupBound();
}

function clearSelection() {
    state.selectedIds.forEach(id => {
        const data = state.slides[currentSlideIndex]?.elements?.find(e => e.id === id);
        if (data?.type === "table") {
            const tableData = normalizeTableData(data.tableData);
            if (tableData.selection) {
                tableData.selection = null;
                updateElementState(id, { tableData });
                data.tableData = tableData;
            }
        }
    });
    clearTablePartSelections();
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

function getTextPanelEditableValue(data) {
    if (!data || data.type !== "text") return "";
    if (isStructuredBulletContent(data.content)) {
        return structuredContentToEditableText(data.content, data.bulletStyle || "default");
    }
    return parseTextFromHtml(data.content || "");
}

function buildTextContentFromSidebarValue(data, value) {
    const rawValue = String(value || "").replace(/\r/g, "");
    const lines = rawValue.split("\n");
    const listState = getTextListState(data.content, data.bulletStyle);

    if (isStructuredBulletContent(data.content)) {
        return {
            content: parseEditableStructuredText(rawValue, data.content),
            bulletStyle: data.bulletStyle || "default",
        };
    }

    if (listState.kind === "numbered") {
        const populatedLines = lines.map(line => line.trim()).filter(Boolean);
        return {
            content: buildNumberedListMarkup(listState.style || "decimal", populatedLines.length ? populatedLines : ["List item"]),
            bulletStyle: "",
        };
    }

    const html = lines
        .map(line => escapeHtml(line))
        .join("<br>")
        .trim();
    return {
        content: html || "Double click to edit text",
        bulletStyle: "",
    };
}

function applySidebarTextContent(data, value) {
    if (!data || data.type !== "text") return;
    const next = buildTextContentFromSidebarValue(data, value);
    const contentChanged = JSON.stringify(next.content) !== JSON.stringify(data.content);
    const bulletStyleChanged = next.bulletStyle !== (data.bulletStyle || "");
    if (!contentChanged && !bulletStyleChanged) return;

    updateElementState(data.id, next);
    data.content = next.content;
    data.bulletStyle = next.bulletStyle;

    const dom = document.getElementById(data.id);
    const contentHost = dom?.querySelector(".text-element-content");
    if (contentHost?.contentEditable === "true") {
        if (isStructuredBulletContent(next.content)) {
            contentHost.dataset.structuredEdit = "true";
            contentHost.dataset.structuredEditMode = "list";
            contentHost.dataset.structuredEditBulletStyle = next.bulletStyle || "default";
            contentHost.innerHTML = buildStructuredBulletEditorHtml(next.content, next.bulletStyle || "default");
        } else {
            contentHost.innerHTML = renderTextContent(data);
        }
        if (typeof _focusEditableHost === "function") _focusEditableHost(contentHost);
        if (typeof captureInlineSelection === "function") captureInlineSelection();
    } else {
        syncTextDomContent(data);
    }

    const layout = dom ? syncTextBoxLayout(dom, data) : null;
    if (layout?.autoHeight && Number.isFinite(layout.height)) {
        updateElementState(data.id, { height: `${layout.height}px` });
        data.height = `${layout.height}px`;
    }
    if (window.refreshPreviews) window.refreshPreviews();
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

function getElementAnimationConfig(el) {
    return normalizeElementAnimation(el);
}

function getSlideAnimationEntries(slide = state.slides[currentSlideIndex]) {
    if (!slide) return [];
    return (slide.elements || [])
        .map(el => ({ el, animation: getElementAnimationConfig(el) }))
        .filter(entry => entry.animation)
        .sort((a, b) => {
            const triggerDelta =
                (a.animation.trigger === "on-slide" ? 0 : 1) - (b.animation.trigger === "on-slide" ? 0 : 1);
            if (triggerDelta !== 0) return triggerDelta;
            const orderDelta = (a.animation.order || 0) - (b.animation.order || 0);
            if (orderDelta !== 0) return orderDelta;
            return String(a.el.id).localeCompare(String(b.el.id));
        });
}

function describeAnimationEffect(effect) {
    const labels = {
        "fade-in": "Fade In",
        "slide-up": "Slide Up",
        "slide-down": "Slide Down",
        "slide-left": "Slide Left",
        "slide-right": "Slide Right",
        "zoom-in": "Zoom In",
        "pop-in": "Pop In",
        "wipe-in": "Wipe In",
        pulse: "Pulse",
        glow: "Glow",
    };
    return labels[effect] || effect;
}

function setElementAnimationConfig(id, config, { skipUndo = false } = {}) {
    const data = state.slides[currentSlideIndex]?.elements?.find(e => e.id === id);
    if (!data) return;
    if (!skipUndo) saveStateToUndo();
    updateElementState(id, {
        animation: config ? createDefaultAnimation(config.effect, config) : null,
        fragmentAnimation: "none",
        fragmentIndex: null,
        animDuration: undefined,
        animDelay: undefined,
    });
    if (window.renderSlidesFromState) window.renderSlidesFromState();
    buildPropertiesPanel();
}

function moveElementAnimationOrder(id, direction) {
    const slide = state.slides[currentSlideIndex];
    if (!slide) return;
    const target = slide.elements.find(el => el.id === id);
    const targetAnimation = getElementAnimationConfig(target);
    if (!targetAnimation) return;
    const peers = getSlideAnimationEntries(slide)
        .filter(entry => entry.animation.trigger === targetAnimation.trigger)
        .map(entry => entry.el.id);
    const currentIndex = peers.indexOf(id);
    const swapIndex = currentIndex + direction;
    if (currentIndex === -1 || swapIndex < 0 || swapIndex >= peers.length) return;
    saveStateToUndo();
    const swapId = peers[swapIndex];
    const swapEl = slide.elements.find(el => el.id === swapId);
    const swapAnimation = getElementAnimationConfig(swapEl);
    if (!swapAnimation) return;
    updateElementState(id, { animation: { ...targetAnimation, order: swapAnimation.order } });
    updateElementState(swapId, { animation: { ...swapAnimation, order: targetAnimation.order } });
    if (window.renderSlidesFromState) window.renderSlidesFromState();
    buildPropertiesPanel();
}

function applyAnimationConfigToSelection(config, { assignSequentialOrder = false } = {}) {
    if (!state.selectedIds.length) return;
    saveStateToUndo();
    let nextOrder = 0;
    if (assignSequentialOrder) {
        const entries = getSlideAnimationEntries();
        nextOrder = entries
            .filter(entry => entry.animation.trigger === "on-click")
            .reduce((maxOrder, entry) => Math.max(maxOrder, Number(entry.animation.order) || 0), -1) + 1;
    }
    state.selectedIds.forEach((id, offset) => {
        updateElementState(id, {
            animation: config
                ? createDefaultAnimation(config.effect, {
                      ...config,
                      order: assignSequentialOrder ? nextOrder + offset : config.order,
                  })
                : null,
            fragmentAnimation: "none",
            fragmentIndex: null,
            animDuration: undefined,
            animDelay: undefined,
        });
    });
    if (window.renderSlidesFromState) window.renderSlidesFromState();
    buildPropertiesPanel();
}

function updateCurrentSlideNotes(value) {
    const slide = state.slides[currentSlideIndex];
    if (!slide) return;
    slide.notes = String(value || "");
    schedulePresentationAutosave?.(150);
}

function _buildSlideWorkspacePanel(panel) {
    const createGroup = title => {
        const wrap = document.createElement("div");
        wrap.className = "prop-group space-y-3";
        wrap.innerHTML = `<h3 class="prop-group-title">${title}</h3>`;
        return wrap;
    };

    const slide = state.slides[currentSlideIndex] || { layoutId: "blank-titled", notes: "" };
    const background = normalizeSlideBackground(slide.background);
    const layoutGrp = createGroup("Slide Layout");
    const presetOptions = Object.entries(window.SLIDE_PRESETS || {})
        .map(([id, preset]) => `<option value="${id}" ${slide.layoutId === id ? "selected" : ""}>${preset.name}</option>`)
        .join("");
    layoutGrp.innerHTML += `
        <div class="space-y-2">
            <select id="prop-slide-layout" class="w-full text-xs">${presetOptions}</select>
            <div class="grid grid-cols-2 gap-2">
                <button id="prop-apply-layout" class="prop-action-btn prop-action-primary">Apply Layout</button>
                <button id="prop-insert-layout-slide" class="prop-action-btn prop-action-secondary">New Slide</button>
            </div>
            <div class="text-xs text-slate-600">Applying a layout replaces the current slide contents but keeps its notes and slide identity.</div>
        </div>
    `;
    panel.appendChild(layoutGrp);

    const bgGrp = createGroup("Slide Background");
    bgGrp.innerHTML += `
        <div class="space-y-2">
            <input id="prop-slide-bg-url" class="w-full text-xs" type="text" value="${background?.content || ""}" placeholder="Paste image/GIF/MP4 URL">
            <select id="prop-slide-bg-fit" class="w-full text-xs">
                <option value="cover" ${(background?.fit || "cover") === "cover" ? "selected" : ""}>Fit: Cover</option>
                <option value="contain" ${background?.fit === "contain" ? "selected" : ""}>Fit: Contain</option>
                <option value="fill" ${background?.fit === "fill" ? "selected" : ""}>Fit: Stretch</option>
            </select>
            <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Opacity</label>
                        <span id="prop-slide-bg-opacity-label" class="text-[10px] font-mono text-slate-500">${Math.round((background?.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input id="prop-slide-bg-opacity" type="range" min="0" max="100" value="${Math.round((background?.opacity ?? 1) * 100)}" class="h-1.5 accent-primary cursor-pointer" ${background ? "" : "disabled"}>
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Blur</label>
                        <span id="prop-slide-bg-blur-label" class="text-[10px] font-mono text-slate-500">${Math.round(background?.blur || 0)}px</span>
                    </div>
                    <input id="prop-slide-bg-blur" type="range" min="0" max="40" value="${Math.round(background?.blur || 0)}" class="h-1.5 accent-primary cursor-pointer" ${background ? "" : "disabled"}>
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Brightness</label>
                        <span id="prop-slide-bg-brightness-label" class="text-[10px] font-mono text-slate-500">${Math.round(background?.brightness ?? 100)}%</span>
                    </div>
                    <input id="prop-slide-bg-brightness" type="range" min="10" max="200" value="${Math.round(background?.brightness ?? 100)}" class="h-1.5 accent-primary cursor-pointer" ${background ? "" : "disabled"}>
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Saturation</label>
                        <span id="prop-slide-bg-saturate-label" class="text-[10px] font-mono text-slate-500">${Math.round(background?.saturate ?? 100)}%</span>
                    </div>
                    <input id="prop-slide-bg-saturate" type="range" min="0" max="250" value="${Math.round(background?.saturate ?? 100)}" class="h-1.5 accent-primary cursor-pointer" ${background ? "" : "disabled"}>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <button id="prop-slide-bg-apply" class="py-2 rounded-lg bg-primary text-white text-xs font-semibold">Apply URL</button>
                <button id="prop-slide-bg-upload" class="py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold">Upload</button>
                <button id="prop-slide-bg-clear" class="py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold">Clear</button>
            </div>
            <div class="text-xs text-slate-600">Supports PNG, GIF, and MP4/WebM backgrounds. Media is rendered behind slide content.</div>
        </div>
    `;
    panel.appendChild(bgGrp);

    const notesGrp = createGroup("Slide Notes");
    notesGrp.innerHTML += `
        <div class="space-y-2">
            <textarea id="prop-slide-notes" class="w-full min-h-[140px] text-xs leading-5" placeholder="Presenter notes for this slide...">${slide.notes || ""}</textarea>
            <div class="text-xs text-slate-600">Notes are visible in presenter view and hidden from the audience.</div>
        </div>
    `;
    panel.appendChild(notesGrp);

    setTimeout(() => {
        const layoutSelect = document.getElementById("prop-slide-layout");
        const applyBtn = document.getElementById("prop-apply-layout");
        const insertBtn = document.getElementById("prop-insert-layout-slide");
        const bgUrlInput = document.getElementById("prop-slide-bg-url");
        const bgFitInput = document.getElementById("prop-slide-bg-fit");
        const bgApplyBtn = document.getElementById("prop-slide-bg-apply");
        const bgUploadBtn = document.getElementById("prop-slide-bg-upload");
        const bgClearBtn = document.getElementById("prop-slide-bg-clear");
        const bgAdjustmentInputs = [
            ["prop-slide-bg-opacity", "prop-slide-bg-opacity-label", "opacity", value => Math.max(0, Math.min(100, Number(value) || 0)) / 100, value => `${Math.round(value)}%`],
            ["prop-slide-bg-blur", "prop-slide-bg-blur-label", "blur", value => Math.max(0, Math.min(40, Number(value) || 0)), value => `${Math.round(value)}px`],
            ["prop-slide-bg-brightness", "prop-slide-bg-brightness-label", "brightness", value => Math.max(10, Math.min(200, Number(value) || 100)), value => `${Math.round(value)}%`],
            ["prop-slide-bg-saturate", "prop-slide-bg-saturate-label", "saturate", value => Math.max(0, Math.min(250, Number(value) || 100)), value => `${Math.round(value)}%`],
        ];
        const notesInput = document.getElementById("prop-slide-notes");

        if (applyBtn) {
            applyBtn.onclick = () => {
                const layoutId = layoutSelect?.value || "blank-titled";
                applyPresetLayoutToCurrentSlide?.(layoutId);
            };
        }
        if (insertBtn) {
            insertBtn.onclick = () => {
                const layoutId = layoutSelect?.value || "blank-titled";
                insertPresetSlide?.(layoutId);
            };
        }
        if (bgApplyBtn) {
            bgApplyBtn.onclick = () => {
                setCurrentSlideBackgroundFromUrl?.(bgUrlInput?.value || "");
            };
        }
        if (bgFitInput) {
            bgFitInput.onchange = e => {
                setCurrentSlideBackgroundFit?.(e.target.value || "cover");
            };
        }
        if (bgUploadBtn) {
            bgUploadBtn.onclick = () => {
                pickCurrentSlideBackgroundFile?.();
            };
        }
        if (bgClearBtn) {
            bgClearBtn.onclick = () => {
                clearCurrentSlideBackground?.();
            };
        }
        bgAdjustmentInputs.forEach(([inputId, labelId, key, normalize, format]) => {
            const input = document.getElementById(inputId);
            const label = document.getElementById(labelId);
            if (!input) return;
            input.oninput = e => {
                const value = Number(e.target.value);
                if (label) label.textContent = format(value);
                const normalized = normalize(value);
                const bgNode = document.querySelector(".reveal .slides section.present .slide-background-media");
                if (!bgNode) return;
                if (key === "opacity") bgNode.style.opacity = String(normalized);
                else {
                    const currentBackground = normalizeSlideBackground(state.slides[currentSlideIndex]?.background);
                    const nextBackground = { ...currentBackground, [key]: normalized };
                    bgNode.style.filter = `blur(${nextBackground.blur || 0}px) brightness(${nextBackground.brightness || 100}%) saturate(${nextBackground.saturate || 100}%)`;
                    bgNode.style.transform = nextBackground.blur ? `scale(${1 + Math.min(40, nextBackground.blur) / 120})` : "";
                }
            };
            input.onchange = e => {
                setCurrentSlideBackgroundAdjustments?.({ [key]: normalize(e.target.value) });
            };
        });
        if (notesInput) {
            let lastValue = notesInput.value;
            notesInput.oninput = e => updateCurrentSlideNotes(e.target.value);
            notesInput.onchange = e => {
                if (e.target.value === lastValue) return;
                saveStateToUndo();
                updateCurrentSlideNotes(e.target.value);
                lastValue = e.target.value;
            };
        }
    });
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
    const clearBtn = document.getElementById("floating-text-clear");
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

    const applyFloatingTextFormatting = (prop, value, options = {}) => {
        applyTextFormatting(prop, value, options);
        requestAnimationFrame(() => {
            updateFloatingTextToolbar();
            updateUIFromSelection?.();
        });
    };

    if (boldBtn) {
        bindInlineFormattingGuard(boldBtn);
        boldBtn.onclick = () => {
            const latest = getSelectedElementData();
            const nextWeight = latest?.styles?.fontWeight === "bold" ? "normal" : "bold";
            applyFloatingTextFormatting("fontWeight", nextWeight, { inlineAction: "bold" });
        };
        setTextControlActive(boldBtn, data.styles.fontWeight === "bold");
    }
    if (italicBtn) {
        bindInlineFormattingGuard(italicBtn);
        italicBtn.onclick = () => {
            const latest = getSelectedElementData();
            const nextStyle = latest?.styles?.fontStyle === "italic" ? "normal" : "italic";
            applyFloatingTextFormatting("fontStyle", nextStyle, { inlineAction: "italic" });
        };
        setTextControlActive(italicBtn, data.styles.fontStyle === "italic");
    }
    if (fontSelect) {
        bindInlineFormattingGuard(fontSelect);
        if (!isControlBeingEdited(fontSelect) && typeof buildFontOptions === "function") {
            const nextOptions = buildFontOptions(data.styles.fontFamily);
            if (fontSelect.innerHTML !== nextOptions) {
                fontSelect.innerHTML = nextOptions;
            }
        }
        fontSelect.onchange = e => {
            restoreInlineSelection?.();
            applyFloatingTextFormatting("fontFamily", e.target.value, { inlineAction: "fontFamily" });
        };
        if (!isControlBeingEdited(fontSelect)) {
            fontSelect.value = data.styles.fontFamily || "Inter, sans-serif";
        }
        setTextControlActive(fontSelect, normalizeFontFamily(fontSelect.value) !== normalizeFontFamily(getThemeTextStyleDefaults().fontFamily));
    }
    if (sizeInput) {
        bindFontSizeFormattingControl(sizeInput);
        if (!isControlBeingEdited(sizeInput)) {
            sizeInput.value = parseInt(data.styles.fontSize) || 32;
            sizeInput.dataset.lastCommittedValue = _normalizePx(sizeInput.value, "32px");
        }
        setTextControlActive(sizeInput, `${parseInt(data.styles.fontSize) || 32}px` !== getThemeTextStyleDefaults().fontSize);
    }
    if (colorInput) {
        bindInlineFormattingGuard(colorInput);
        colorInput.oninput = e => {
            if (colorInput.dataset.floatingColorFormattingActive !== "true") {
                beginFormattingInteraction();
                colorInput.dataset.floatingColorFormattingActive = "true";
            }
            applyFloatingTextFormatting("color", e.target.value, { inlineAction: "color" });
        };
        colorInput.onchange = () => {
            if (colorInput.dataset.floatingColorFormattingActive === "true") {
                delete colorInput.dataset.floatingColorFormattingActive;
                endFormattingInteraction();
            }
        };
        if (!isControlBeingEdited(colorInput)) {
            colorInput.value = _normalizeColorForInput(data.styles.color, "#000000");
        }
        setTextControlActive(colorInput, _normalizeColorForInput(data.styles.color, "#000000").toLowerCase() !== _normalizeColorForInput(getThemeTextStyleDefaults().color, "#000000").toLowerCase());
    }

    const paletteContainer = document.getElementById("floating-text-palette");
    if (paletteContainer) {
        paletteContainer.innerHTML = "";
        (state.colorPalette || []).forEach(color => {
            const swatch = document.createElement("button");
            swatch.className = "w-4 h-4 rounded-full border border-slate-200 hover:scale-110 transition-transform shadow-sm";
            swatch.style.backgroundColor = color;
            swatch.title = color;
            bindInlineFormattingGuard(swatch);
            swatch.onclick = () => {
                applyFloatingTextFormatting("color", color, { inlineAction: "color" });
                if (colorInput) colorInput.value = color;
            };
            paletteContainer.appendChild(swatch);
        });
    }

    if (subBtn) {
        bindInlineFormattingGuard(subBtn);
        subBtn.onclick = () => applyFloatingTextFormatting("subscript", null, { inlineAction: "subscript" });
    }
    if (supBtn) {
        bindInlineFormattingGuard(supBtn);
        supBtn.onclick = () => applyFloatingTextFormatting("superscript", null, { inlineAction: "superscript" });
    }
    if (clearBtn) {
        bindInlineFormattingGuard(clearBtn);
        clearBtn.onclick = () => clearTextFormatting(data);
    }

    if (insertSymbolBtn) {
        bindInlineFormattingGuard(insertSymbolBtn);
        // onclick is handled in HTML but we guard it here
    }
    if (insertEquationBtn) {
        bindInlineFormattingGuard(insertEquationBtn);
        // onclick is handled in HTML but we guard it here
    }

    toolbar.dataset.guarded = "true";
}

function createGroup(title) {
    const wrap = document.createElement("div");
    wrap.className = "prop-group space-y-3";
    wrap.innerHTML = `<h3 class="prop-group-title">${title}</h3>`;
    return wrap;
}

function createField(label, inputHTML) {
    const div = document.createElement("div");
    div.className = "flex flex-col gap-1";
    div.innerHTML = `<label class="text-xs font-bold text-slate-600 uppercase tracking-wide">${label}</label>${inputHTML}`;
    return div;
}

function buildPropertiesPanel() {
    const panel = document.getElementById("properties-content");
    if (!panel) return;
    const selectionSignature = `${currentSlideIndex}:${state.selectedIds.join("|")}`;
    const previousScrollTop = panel.scrollTop;
    const shouldRestoreScroll = _propertiesPanelSelectionSignature === selectionSignature;
    _propertiesPanelSelectionSignature = selectionSignature;
    const restorePropertiesScroll = () => {
        if (!shouldRestoreScroll) return;
        requestAnimationFrame(() => {
            panel.scrollTop = previousScrollTop;
        });
    };

    panel.innerHTML = "";
    updateFloatingTextToolbar();

    if (state.selectedIds.length === 0) {
        _buildSlideWorkspacePanel(panel);
        restorePropertiesScroll();
        return;
    }

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
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-widest">${state.selectedIds.length} Object${isSingle ? "" : "s"}</h3>
            ${!isSingle ? `<span class="text-[10px] text-accent font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">${isGrouped ? "GROUPED" : "MULTIPLE"}</span>` : ""}
        </div>
        <div class="flex gap-2">
            <button id="prop-group" class="prop-action-btn prop-action-primary flex-1">
                <i class="fa-solid fa-object-group"></i> GROUP
            </button>
            <button id="prop-ungroup" class="prop-action-btn prop-action-secondary flex-1">
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
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Opacity</label>
                <span id="prop-op-label" class="text-[10px] font-mono text-slate-500">${opacityVal}%</span>
            </div>
            <input type="range" id="prop-op" min="0" max="100" step="1" value="${opacityVal}" class="h-1.5 accent-primary cursor-pointer">
        `;
        bgOpacityRow.appendChild(opField);
        layerGrp.appendChild(bgOpacityRow);

        appendElementOutlineControls(layerGrp, data);

        // Z-Index Row
        const zVal = data.styles?.zIndex ?? 1;
        const zRow = document.createElement("div");
        zRow.className = "flex items-center gap-2 mt-2";
        zRow.innerHTML = `
            <div class="flex-1">
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Layer Order (Z)</label>
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
            buildTextPanel(panel, data);
        }

        if (data.type === "shape") {
            const shapeGrp = createGroup("Shape");
            const isArrowShape = typeof isBlockArrowShape === "function" && isBlockArrowShape(data.shapeType);
            const arrowHeadSize = Math.max(12, Math.min(80, Number(data.arrowHeadSize) || 38));
            const arrowShaftSize = Math.max(12, Math.min(90, Number(data.arrowShaftSize) || 36));
            shapeGrp.innerHTML += `
                <div class="space-y-3">
                    <div class="grid grid-cols-[1fr_auto] gap-2 items-end">
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Type</span>
                            <select id="prop-shape-type" class="prop-select">
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
                        </label>
                        <span class="shape-type-chip">${isArrowShape ? "Block arrow" : "Shape"}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Width</span>
                            <input type="number" id="prop-shape-width" class="prop-input-sm" min="12" max="3000" step="1" value="${Math.round(parseFloat(data.width) || 150)}">
                        </label>
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Height</span>
                            <input type="number" id="prop-shape-height" class="prop-input-sm" min="12" max="3000" step="1" value="${Math.round(parseFloat(data.height) || 150)}">
                        </label>
                    </div>
                    ${
                        isArrowShape
                            ? `
                    <div class="shape-arrow-controls">
                        <label class="shape-range-row">
                            <span>Head</span>
                            <input type="range" id="prop-shape-arrow-head-range" min="12" max="80" step="1" value="${arrowHeadSize}">
                            <input type="number" id="prop-shape-arrow-head" class="prop-input-sm" min="12" max="80" step="1" value="${arrowHeadSize}">
                        </label>
                        <label class="shape-range-row">
                            <span>Shaft</span>
                            <input type="range" id="prop-shape-arrow-shaft-range" min="12" max="90" step="1" value="${arrowShaftSize}">
                            <input type="number" id="prop-shape-arrow-shaft" class="prop-input-sm" min="12" max="90" step="1" value="${arrowShaftSize}">
                        </label>
                    </div>
                    `
                            : ""
                    }
                </div>
            `;
            panel.appendChild(shapeGrp);
        }

        if (data.type === "table") {
            const tableData = normalizeTableData(data.tableData);
            const tableSelection = tableData.selection;
            const selectedRow = tableSelection?.type === "row" || tableSelection?.type === "cell" ? tableSelection.row : null;
            const selectedCol = tableSelection?.type === "col" || tableSelection?.type === "cell" ? tableSelection.col : null;
            const selectedCell =
                tableSelection?.type === "cell" && selectedRow !== null && selectedCol !== null
                    ? tableData.cells[selectedRow]?.[selectedCol]
                    : null;
            const selectedStyles = selectedCell?.styles || {};
            const effectiveTableFontFamily = selectedStyles.fontFamily || tableData.fontFamily || '"Manrope", sans-serif';
            const effectiveTableFontSize = selectedStyles.fontSize || tableData.fontSize || "16px";
            const effectiveTableTextColor = selectedStyles.color || tableData.textColor || "#172033";
            const effectiveTableFontWeight = selectedStyles.fontWeight || tableData.fontWeight || "400";
            const effectiveTableFontStyle = selectedStyles.fontStyle || tableData.fontStyle || "normal";
            const effectiveTableTextAlign = selectedStyles.textAlign || tableData.textAlign || "left";
            const tableGrp = createGroup("Table");
            tableGrp.innerHTML += `
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Table Width</label>
                        <input type="number" id="prop-table-element-width" class="prop-input-sm" min="80" value="${Math.round(parseFloat(data.width) || 420)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Table Height</label>
                        <input type="number" id="prop-table-element-height" class="prop-input-sm" min="60" value="${Math.round(parseFloat(data.height) || 220)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Selected Row H</label>
                        <input type="number" id="prop-table-row-height" class="prop-input-sm" min="24" value="${selectedRow !== null ? Math.round(tableData.rowHeights[selectedRow] || 44) : ""}" placeholder="Select row">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Selected Col W</label>
                        <input type="number" id="prop-table-col-width" class="prop-input-sm" min="36" value="${selectedCol !== null ? Math.round(tableData.colWidths[selectedCol] || 140) : ""}" placeholder="Select column">
                    </div>
                </div>
                <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span>${tableSelection ? `Selected ${tableSelection.type}${selectedRow !== null ? ` R${selectedRow + 1}` : ""}${selectedCol !== null ? ` C${selectedCol + 1}` : ""}` : "No row, column, or cell selected"}</span>
                    <button id="prop-table-clear-selection" class="font-semibold text-primary">Clear</button>
                </div>
                <div class="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-slate-600 uppercase font-semibold">Text Style</span>
                        <span class="text-[10px] text-slate-400">${tableSelection ? "Applies to selection" : "Applies to table default"}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Font</span>
                            <select id="prop-table-font" class="prop-select">${buildFontOptions(effectiveTableFontFamily)}</select>
                        </label>
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Size</span>
                            <input type="text" id="prop-table-font-size" class="prop-input-sm" value="${escapeHtml(effectiveTableFontSize)}">
                        </label>
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Color</span>
                            <input type="color" id="prop-table-cell-text-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(effectiveTableTextColor, "#172033")}">
                        </label>
                        <label class="flex flex-col gap-1">
                            <span class="text-xs text-slate-600 uppercase font-semibold">Align</span>
                            <select id="prop-table-text-align" class="prop-select">
                                ${["left", "center", "right"].map(align => `<option value="${align}" ${effectiveTableTextAlign === align ? "selected" : ""}>${align[0].toUpperCase() + align.slice(1)}</option>`).join("")}
                            </select>
                        </label>
                    </div>
                    <div class="flex gap-2">
                        <button id="prop-table-bold" class="prop-icon-btn ${effectiveTableFontWeight === "700" || effectiveTableFontWeight === "bold" ? "active" : ""}" title="Bold">B</button>
                        <button id="prop-table-italic" class="prop-icon-btn italic ${effectiveTableFontStyle === "italic" ? "active" : ""}" title="Italic">I</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Rows</label>
                        <div class="flex gap-2">
                            <button id="prop-table-add-row" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Add</button>
                            <button id="prop-table-remove-row" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50" ${tableData.rows <= 1 ? "disabled" : ""}>Remove</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Columns</label>
                        <div class="flex gap-2">
                            <button id="prop-table-add-col" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Add</button>
                            <button id="prop-table-remove-col" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50" ${tableData.cols <= 1 ? "disabled" : ""}>Remove</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Border</label>
                        <input type="color" id="prop-table-border-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.borderColor, "#cbd5e1")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Border W</label>
                        <input type="number" id="prop-table-border-width" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="0" max="8" value="${tableData.borderWidth}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Header Fill</label>
                        <input type="color" id="prop-table-header-fill" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.headerFill, "#e2e8f0")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Body Fill</label>
                        <input type="color" id="prop-table-body-fill" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.bodyFill, "#ffffff")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Alt Fill</label>
                        <input type="color" id="prop-table-alt-fill" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.altFill, "#f8fafc")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Padding</label>
                        <input type="number" id="prop-table-padding" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="2" max="24" value="${tableData.cellPadding}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Text</label>
                        <input type="color" id="prop-table-text-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.textColor, "#172033")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Header Text</label>
                        <input type="color" id="prop-table-header-text-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(tableData.headerTextColor, "#172033")}">
                    </div>
                </div>
                <label class="flex items-center gap-2 cursor-pointer group/chk mt-3">
                    <input type="checkbox" id="prop-table-header-row" ${tableData.headerRow ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${tableData.headerRow ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Header Row</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group/chk mt-2">
                    <input type="checkbox" id="prop-table-zebra" ${tableData.zebra ? "checked" : ""} class="hidden">
                    <div class="w-4 h-4 rounded border border-gray-600 flex items-center justify-center group-hover/chk:border-accent transition-colors">
                        <div class="w-2.5 h-2.5 rounded-sm bg-accent transition-opacity ${tableData.zebra ? "opacity-100" : "opacity-0"}"></div>
                    </div>
                    <span class="text-xs text-gray-400">Zebra Rows</span>
                </label>
                <p class="text-xs text-slate-600 leading-snug mt-2">Double click a cell on the slide to edit it.</p>
            `;
            panel.appendChild(tableGrp);
        }

        if (data.type === "connector") {
            const connectorGrp = createGroup("Connector");
            connectorGrp.innerHTML += `
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Type</label>
                        <select id="prop-connector-type" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                            <option value="line" ${data.connectorType === "line" ? "selected" : ""}>Line</option>
                            <option value="curve" ${data.connectorType === "curve" ? "selected" : ""}>Curve</option>
                            <option value="poly" ${data.connectorType === "poly" ? "selected" : ""}>Polyline</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Stroke</label>
                        <input type="number" id="prop-connector-width" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="1" max="24" value="${Math.max(1, Number(data.styles?.strokeWidth) || 4)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Start</label>
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
                        <label class="text-xs text-slate-600 uppercase font-semibold">End</label>
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
                        <label class="text-xs text-slate-600 uppercase font-semibold">Color</label>
                        <input type="color" id="prop-connector-color" class="w-full h-8 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(data.styles?.color, "#2563eb")}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Head W</label>
                        <input type="number" id="prop-connector-head-width" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="4" max="40" value="${Math.max(4, Number(data.connectorHeadWidth) || 14)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Head L</label>
                        <input type="number" id="prop-connector-head-length" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm" min="4" max="40" value="${Math.max(4, Number(data.connectorHeadLength) || 14)}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold">Nodes</label>
                        <div class="flex gap-2">
                            <button id="prop-connector-add-node" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Add</button>
                            <button id="prop-connector-remove-node" class="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50">Remove</button>
                        </div>
                    </div>
                </div>
                <p class="text-xs text-slate-600 leading-snug mt-2">Select the connector, then drag its points on the canvas to reshape it.</p>
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
                            <i class="fa-solid fa-upload text-primary"></i> ${data.content?.startsWith("data:") ? "Change Local File" : "Upload Local File"}
                        </button>
                        ${
                            data.content?.startsWith("data:")
                                ? `
                            <button id="prop-video-clear-local" class="text-xs text-primary hover:text-primary-hover transition-colors flex items-center gap-1 mt-1">
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
                        <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Width</label>
                        <input type="number" id="prop-img-w" class="w-full text-xs" value="${parseFloat(data.width) || 0}">
                    </div>
                    <div class="flex-1 flex flex-col gap-1">
                        <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Height</label>
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
                            <label class="text-xs text-slate-600 uppercase font-semibold">Size</label>
                            <input type="number" id="prop-eq-fs" class="w-full text-xs" value="${parseInt(data.styles?.fontSize) || 24}">
                        </div>
                        <div class="flex-1 flex flex-col gap-1">
                            <label class="text-xs text-slate-600 uppercase font-semibold">Color</label>
                            <input type="color" id="prop-eq-color" class="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-none" value="${data.styles?.color || "#ffffff"}">
                        </div>
                    </div>
                </div>
            `;
            panel.appendChild(eqGrp);
        }

        {
            const animation = getElementAnimationConfig(data);
            const animGrp = createGroup("Animation");
            animGrp.innerHTML += `
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input id="prop-anim-enabled" type="checkbox" class="rounded" ${animation ? "checked" : ""}>
                        <span class="text-xs text-slate-700 font-medium">Enable animation</span>
                    </label>
                    <div id="prop-anim-controls" class="space-y-2 ${animation ? "" : "hidden"}">
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Effect</label>
                            <select id="prop-anim-effect" class="w-full text-xs">
                                ${PRESENTATION_ANIMATION_EFFECTS.map(effect => `
                                    <option value="${effect}" ${(animation?.effect || "fade-in") === effect ? "selected" : ""}>${describeAnimationEffect(effect)}</option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Trigger</label>
                            <select id="prop-anim-trigger" class="w-full text-xs">
                                <option value="on-slide" ${(animation?.trigger || "on-slide") === "on-slide" ? "selected" : ""}>With Slide</option>
                                <option value="on-click" ${animation?.trigger === "on-click" ? "selected" : ""}>On Click</option>
                            </select>
                        </div>
                        <div id="prop-anim-order-wrap" class="flex flex-col gap-1 ${(animation?.trigger || "on-slide") === "on-click" ? "" : "hidden"}">
                            <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Click Order</label>
                            <input type="number" id="prop-anim-order" class="w-full text-xs" min="0" max="99" value="${animation?.order ?? 0}">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Duration</label>
                                <input type="number" id="prop-anim-duration" class="w-full text-xs" min="100" step="50" value="${animation?.durationMs ?? 800}">
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Delay</label>
                                <input type="number" id="prop-anim-delay" class="w-full text-xs" min="0" step="50" value="${animation?.delayMs ?? 0}">
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-slate-600 uppercase font-semibold tracking-wider">Easing</label>
                            <select id="prop-anim-easing" class="w-full text-xs">
                                <option value="ease-out" ${(animation?.easing || "ease-out") === "ease-out" ? "selected" : ""}>Ease Out</option>
                                <option value="ease-in-out" ${animation?.easing === "ease-in-out" ? "selected" : ""}>Ease In-Out</option>
                                <option value="linear" ${animation?.easing === "linear" ? "selected" : ""}>Linear</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            panel.appendChild(animGrp);
        }
    }

    if (!data && state.selectedIds.length > 1) {
        const multiAnimGrp = createGroup("Animation");
        multiAnimGrp.innerHTML += `
            <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input id="prop-multi-anim-enabled" type="checkbox" class="rounded">
                    <span class="text-xs text-slate-700 font-medium">Apply animation to selection</span>
                </label>
                <div id="prop-multi-anim-controls" class="space-y-2 hidden">
                    <select id="prop-multi-anim-effect" class="w-full text-xs">
                        ${PRESENTATION_ANIMATION_EFFECTS.map(effect => `<option value="${effect}">${describeAnimationEffect(effect)}</option>`).join("")}
                    </select>
                    <select id="prop-multi-anim-trigger" class="w-full text-xs">
                        <option value="on-slide">With Slide</option>
                        <option value="on-click">On Click</option>
                    </select>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" id="prop-multi-anim-duration" class="w-full text-xs" min="100" step="50" value="800" placeholder="Duration">
                        <input type="number" id="prop-multi-anim-delay" class="w-full text-xs" min="0" step="50" value="0" placeholder="Delay">
                    </div>
                    <select id="prop-multi-anim-easing" class="w-full text-xs">
                        <option value="ease-out">Ease Out</option>
                        <option value="ease-in-out">Ease In-Out</option>
                        <option value="linear">Linear</option>
                    </select>
                    <button id="prop-multi-anim-apply" class="w-full py-2 rounded bg-primary text-white text-xs font-semibold">Apply To Selection</button>
                </div>
            </div>
        `;
        panel.appendChild(multiAnimGrp);
    }

    {
        const slide = state.slides[currentSlideIndex] || { notes: "", elements: [] };
        const notesGrp = createGroup("Slide Notes");
        notesGrp.innerHTML += `
            <div class="space-y-2">
                <textarea id="prop-slide-notes" class="w-full min-h-[120px] text-xs leading-5" placeholder="Presenter notes for this slide...">${slide.notes || ""}</textarea>
                <div class="text-xs text-slate-600">Notes are saved with the slide and used in presenter view only.</div>
            </div>
        `;
        panel.appendChild(notesGrp);
    }

    {
        const slideEntries = getSlideAnimationEntries();
        const listGrp = createGroup("Slide Animation Order");
        listGrp.innerHTML += slideEntries.length
            ? `<div class="space-y-2">${slideEntries
                  .map(
                      entry => `
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                        <div class="flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="text-[11px] font-semibold text-slate-700">${describeAnimationEffect(entry.animation.effect)}</div>
                                <div class="text-xs text-slate-600">${entry.animation.trigger === "on-click" ? `On click #${entry.animation.order}` : "With slide"}</div>
                            </div>
                            <div class="flex items-center gap-1">
                                <button class="prop-anim-move-up rounded border border-slate-200 bg-white px-2 py-1 text-[10px]" data-anim-id="${entry.el.id}" title="Move earlier">Up</button>
                                <button class="prop-anim-move-down rounded border border-slate-200 bg-white px-2 py-1 text-[10px]" data-anim-id="${entry.el.id}" title="Move later">Down</button>
                            </div>
                        </div>
                    </div>`,
                  )
                  .join("")}</div>`
            : `<div class="text-[11px] text-slate-500">No slide animations yet.</div>`;
        panel.appendChild(listGrp);
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

        const slideNotes = document.getElementById("prop-slide-notes");
        if (slideNotes) {
            let lastNotesValue = slideNotes.value;
            slideNotes.oninput = e => {
                updateCurrentSlideNotes(e.target.value);
            };
            slideNotes.onchange = e => {
                if (e.target.value === lastNotesValue) return;
                saveStateToUndo();
                updateCurrentSlideNotes(e.target.value);
                lastNotesValue = e.target.value;
            };
        }

        document.querySelectorAll(".prop-anim-move-up").forEach(button => {
            button.onclick = () => moveElementAnimationOrder(button.dataset.animId, -1);
        });
        document.querySelectorAll(".prop-anim-move-down").forEach(button => {
            button.onclick = () => moveElementAnimationOrder(button.dataset.animId, 1);
        });

        const multiAnimEnabled = document.getElementById("prop-multi-anim-enabled");
        const multiAnimControls = document.getElementById("prop-multi-anim-controls");
        const multiAnimApply = document.getElementById("prop-multi-anim-apply");
        if (multiAnimEnabled && multiAnimControls) {
            multiAnimEnabled.onchange = () => {
                multiAnimControls.classList.toggle("hidden", !multiAnimEnabled.checked);
            };
        }
        if (multiAnimApply) {
            multiAnimApply.onclick = () => {
                const effect = document.getElementById("prop-multi-anim-effect")?.value || "fade-in";
                const trigger = document.getElementById("prop-multi-anim-trigger")?.value === "on-click" ? "on-click" : "on-slide";
                const durationMs = parseInt(document.getElementById("prop-multi-anim-duration")?.value, 10) || 800;
                const delayMs = parseInt(document.getElementById("prop-multi-anim-delay")?.value, 10) || 0;
                const easing = document.getElementById("prop-multi-anim-easing")?.value || "ease-out";
                applyAnimationConfigToSelection(
                    { effect, trigger, durationMs, delayMs, easing, order: 0 },
                    { assignSequentialOrder: trigger === "on-click" },
                );
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

            bindElementOutlineControls(data);

            if (data.type === "text") {
                // Listeners are now handled within buildTextPanel(panel, data) 
                // in js/properties/panels/text.js
            }

            if (data.type === "shape") {
                const shapeType = document.getElementById("prop-shape-type");
                const shapeWidth = document.getElementById("prop-shape-width");
                const shapeHeight = document.getElementById("prop-shape-height");
                const arrowHead = document.getElementById("prop-shape-arrow-head");
                const arrowHeadRange = document.getElementById("prop-shape-arrow-head-range");
                const arrowShaft = document.getElementById("prop-shape-arrow-shaft");
                const arrowShaftRange = document.getElementById("prop-shape-arrow-shaft-range");
                const syncShapeVisual = () => {
                    const dom = document.getElementById(data.id);
                    if (!dom || typeof getShapeStyle !== "function") return;
                    const visual = getShapeStyle(data);
                    dom.style.clipPath = visual.clipPath;
                    dom.style.borderRadius = visual.borderRadius;
                    updateElementStyleState(data.id, { borderRadius: visual.borderRadius });
                };
                const bindShapeDimension = (input, key) => {
                    if (!input) return;
                    const commit = () => {
                        const next = Math.max(12, Math.min(3000, Number(input.value) || 12));
                        onCommit(() => {
                            updateElementState(data.id, { [key]: `${next}px` });
                            data[key] = `${next}px`;
                            const dom = document.getElementById(data.id);
                            if (dom) dom.style[key] = `${next}px`;
                            updateGroupBound?.();
                        });
                    };
                    input.onchange = commit;
                    input.onblur = commit;
                };
                const bindShapeArrowPercent = (numberInput, rangeInput, key, min, max, fallback) => {
                    const clamp = value => Math.max(min, Math.min(max, Number(value) || fallback));
                    const commit = source => {
                        const next = clamp(source.value);
                        if (numberInput) numberInput.value = next;
                        if (rangeInput) rangeInput.value = next;
                        onCommit(() => {
                            updateElementState(data.id, { [key]: next });
                            data[key] = next;
                            syncShapeVisual();
                        });
                    };
                    if (numberInput) {
                        numberInput.onchange = () => commit(numberInput);
                        numberInput.onblur = () => commit(numberInput);
                    }
                    if (rangeInput) {
                        rangeInput.oninput = () => commit(rangeInput);
                    }
                };

                if (shapeType) {
                    shapeType.onchange = e => {
                        onCommit(() => {
                            const value = e.target.value;
                            const patch = { shapeType: value };
                            if (typeof isBlockArrowShape === "function" && isBlockArrowShape(value)) {
                                patch.arrowHeadSize = Number(data.arrowHeadSize) || 38;
                                patch.arrowShaftSize = Number(data.arrowShaftSize) || 36;
                                data.arrowHeadSize = patch.arrowHeadSize;
                                data.arrowShaftSize = patch.arrowShaftSize;
                            }
                            updateElementState(data.id, patch);
                            data.shapeType = value;
                            syncShapeVisual();
                            buildPropertiesPanel();
                        });
                    };
                }
                bindShapeDimension(shapeWidth, "width");
                bindShapeDimension(shapeHeight, "height");
                bindShapeArrowPercent(arrowHead, arrowHeadRange, "arrowHeadSize", 12, 80, 38);
                bindShapeArrowPercent(arrowShaft, arrowShaftRange, "arrowShaftSize", 12, 90, 36);
            }

            if (data.type === "table") {
                const commitTableElementDimension = (inputId, key, min) => {
                    const input = document.getElementById(inputId);
                    if (!input) return;
                    const commit = () => {
                        const next = Math.max(min, Number(input.value) || min);
                        saveStateToUndo();
                        updateElementState(data.id, { [key]: `${next}px` });
                        data[key] = `${next}px`;
                        const dom = document.getElementById(data.id);
                        if (dom) dom.style[key] = `${next}px`;
                        updateGroupBound();
                        refreshPreviews?.();
                    };
                    input.addEventListener("change", commit);
                    input.addEventListener("blur", commit);
                };
                commitTableElementDimension("prop-table-element-width", "width", 80);
                commitTableElementDimension("prop-table-element-height", "height", 60);

                const rowHeightInput = document.getElementById("prop-table-row-height");
                if (rowHeightInput) {
                    const commit = () => {
                        const tableData = normalizeTableData(data.tableData);
                        const row = tableData.selection?.type === "row" || tableData.selection?.type === "cell" ? tableData.selection.row : null;
                        if (row === null || row === undefined) return;
                        mutateSelectedTableData(nextTableData => {
                            nextTableData.rowHeights[row] = Math.max(24, Number(rowHeightInput.value) || 24);
                            nextTableData.selection = tableData.selection;
                        });
                    };
                    rowHeightInput.addEventListener("change", commit);
                    rowHeightInput.addEventListener("blur", commit);
                }

                const colWidthInput = document.getElementById("prop-table-col-width");
                if (colWidthInput) {
                    const commit = () => {
                        const tableData = normalizeTableData(data.tableData);
                        const col = tableData.selection?.type === "col" || tableData.selection?.type === "cell" ? tableData.selection.col : null;
                        if (col === null || col === undefined) return;
                        mutateSelectedTableData(nextTableData => {
                            nextTableData.colWidths[col] = Math.max(36, Number(colWidthInput.value) || 36);
                            nextTableData.selection = tableData.selection;
                        });
                    };
                    colWidthInput.addEventListener("change", commit);
                    colWidthInput.addEventListener("blur", commit);
                }

                document.getElementById("prop-table-clear-selection")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        tableData.selection = null;
                    });
                    clearTablePartSelections();
                });

                const mutateTableTextStyle = (prop, value) => {
                    mutateSelectedTableData(tableData => {
                        const selection = tableData.selection;
                        const applyToCell = (row, col) => {
                            const cell = tableData.cells[row]?.[col];
                            if (!cell) return;
                            cell.styles = { ...(cell.styles || {}), [prop]: value };
                        };

                        if (selection?.type === "cell") {
                            applyToCell(selection.row, selection.col);
                        } else if (selection?.type === "row") {
                            for (let col = 0; col < tableData.cols; col += 1) applyToCell(selection.row, col);
                        } else if (selection?.type === "col") {
                            for (let row = 0; row < tableData.rows; row += 1) applyToCell(row, selection.col);
                        } else {
                            tableData[prop] = value;
                        }
                    });
                };

                const tableFont = document.getElementById("prop-table-font");
                if (tableFont) {
                    tableFont.onchange = e => mutateTableTextStyle("fontFamily", e.target.value);
                }
                const tableFontSize = document.getElementById("prop-table-font-size");
                if (tableFontSize) {
                    const commit = () => {
                        const nextValue = _normalizePx(tableFontSize.value, "16px");
                        tableFontSize.value = nextValue;
                        mutateTableTextStyle("fontSize", nextValue);
                    };
                    tableFontSize.addEventListener("change", commit);
                    tableFontSize.addEventListener("blur", commit);
                    tableFontSize.addEventListener("keydown", e => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        commit();
                        tableFontSize.blur();
                    });
                }
                const tableCellTextColor = document.getElementById("prop-table-cell-text-color");
                if (tableCellTextColor) {
                    tableCellTextColor.oninput = e => mutateTableTextStyle("color", _normalizeColorForInput(e.target.value, "#172033"));
                }
                const tableTextAlign = document.getElementById("prop-table-text-align");
                if (tableTextAlign) {
                    tableTextAlign.onchange = e => mutateTableTextStyle("textAlign", e.target.value);
                }
                document.getElementById("prop-table-bold")?.addEventListener("click", () => {
                    const current = normalizeTableData(data.tableData);
                    const selection = current.selection;
                    const selected =
                        selection?.type === "cell" ? current.cells[selection.row]?.[selection.col]?.styles?.fontWeight : null;
                    const effective = selected || current.fontWeight || "400";
                    mutateTableTextStyle("fontWeight", effective === "700" || effective === "bold" ? "400" : "700");
                });
                document.getElementById("prop-table-italic")?.addEventListener("click", () => {
                    const current = normalizeTableData(data.tableData);
                    const selection = current.selection;
                    const selected =
                        selection?.type === "cell" ? current.cells[selection.row]?.[selection.col]?.styles?.fontStyle : null;
                    const effective = selected || current.fontStyle || "normal";
                    mutateTableTextStyle("fontStyle", effective === "italic" ? "normal" : "italic");
                });

                document.getElementById("prop-table-add-row")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        tableData.rows += 1;
                        tableData.rowHeights.push(44);
                        tableData.cells.push(
                            Array.from({ length: tableData.cols }, () => ({
                                text: "",
                                styles: {},
                            })),
                        );
                    });
                });
                document.getElementById("prop-table-remove-row")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        if (tableData.rows <= 1) return;
                        tableData.rows -= 1;
                        tableData.cells = tableData.cells.slice(0, tableData.rows);
                        tableData.rowHeights = tableData.rowHeights.slice(0, tableData.rows);
                        tableData.selection = null;
                    });
                });
                document.getElementById("prop-table-add-col")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        tableData.cols += 1;
                        tableData.colWidths.push(140);
                        tableData.cells.forEach((row, rowIndex) => {
                            row.push({
                                text: rowIndex === 0 ? `Header ${tableData.cols}` : "",
                                styles: {},
                            });
                        });
                    });
                });
                document.getElementById("prop-table-remove-col")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        if (tableData.cols <= 1) return;
                        tableData.cols -= 1;
                        tableData.cells = tableData.cells.map(row => row.slice(0, tableData.cols));
                        tableData.colWidths = tableData.colWidths.slice(0, tableData.cols);
                        tableData.selection = null;
                    });
                });
                const bindTableValue = (id, key, normalize = value => value) => {
                    const input = document.getElementById(id);
                    if (!input) return;
                    const commit = () => mutateSelectedTableData(tableData => { tableData[key] = normalize(input.value); });
                    input.addEventListener("change", commit);
                    input.addEventListener("blur", commit);
                };
                bindTableValue("prop-table-border-color", "borderColor", value => _normalizeColorForInput(value, "#cbd5e1"));
                bindTableValue("prop-table-border-width", "borderWidth", value => Math.max(0, Number(value) || 0));
                bindTableValue("prop-table-header-fill", "headerFill", value => _normalizeColorForInput(value, "#e2e8f0"));
                bindTableValue("prop-table-body-fill", "bodyFill", value => _normalizeColorForInput(value, "#ffffff"));
                bindTableValue("prop-table-alt-fill", "altFill", value => _normalizeColorForInput(value, "#f8fafc"));
                bindTableValue("prop-table-padding", "cellPadding", value => Math.max(2, Number(value) || 2));
                bindTableValue("prop-table-text-color", "textColor", value => _normalizeColorForInput(value, "#172033"));
                bindTableValue("prop-table-header-text-color", "headerTextColor", value => _normalizeColorForInput(value, "#172033"));
                document.getElementById("prop-table-header-row")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        tableData.headerRow = !tableData.headerRow;
                    });
                });
                document.getElementById("prop-table-zebra")?.addEventListener("click", () => {
                    mutateSelectedTableData(tableData => {
                        tableData.zebra = !tableData.zebra;
                    });
                });
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

            {
                const enabled = document.getElementById("prop-anim-enabled");
                const controls = document.getElementById("prop-anim-controls");
                const effect = document.getElementById("prop-anim-effect");
                const trigger = document.getElementById("prop-anim-trigger");
                const orderWrap = document.getElementById("prop-anim-order-wrap");
                const order = document.getElementById("prop-anim-order");
                const duration = document.getElementById("prop-anim-duration");
                const delay = document.getElementById("prop-anim-delay");
                const easing = document.getElementById("prop-anim-easing");

                const buildConfig = () => ({
                    effect: effect?.value || "fade-in",
                    trigger: trigger?.value === "on-click" ? "on-click" : "on-slide",
                    order: parseInt(order?.value, 10) || 0,
                    durationMs: parseInt(duration?.value, 10) || 800,
                    delayMs: parseInt(delay?.value, 10) || 0,
                    easing: easing?.value || "ease-out",
                });

                const commitAnimation = () => {
                    if (!enabled?.checked) {
                        setElementAnimationConfig(data.id, null);
                        return;
                    }
                    setElementAnimationConfig(data.id, buildConfig());
                };

                enabled && (enabled.onchange = () => {
                    controls?.classList.toggle("hidden", !enabled.checked);
                    commitAnimation();
                });
                trigger && (trigger.onchange = () => {
                    orderWrap?.classList.toggle("hidden", trigger.value !== "on-click");
                    commitAnimation();
                });
                [effect, order, duration, delay, easing].forEach(input => {
                    if (!input) return;
                    input.onchange = commitAnimation;
                });
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

    restorePropertiesScroll();
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

        if (data.type === "text" && ["color", "fontSize", "fontFamily", "fontWeight", "fontStyle"].includes(prop)) {
            let nextContent = contentHost?.isContentEditable ? contentHost.innerHTML : data.content;
            let contentChanged = false;
            if (contentHost?.dataset.structuredEdit === "true" && _getStructuredEditorMode(contentHost) === "list") {
                nextContent = stripInlineTextStylesFromTextContent(parseStructuredBulletEditorHtml(contentHost), [prop]);
                contentHost.innerHTML = buildStructuredBulletEditorHtml(nextContent, data.bulletStyle || "default");
            } else {
                nextContent = stripInlineTextStylesFromTextContent(nextContent, [prop]);
                if (contentHost?.isContentEditable) {
                    contentHost.innerHTML = nextContent;
                    captureInlineSelection();
                }
            }

            if (nextContent !== data.content) {
                updateElementState(id, { content: nextContent });
                data.content = nextContent;
                contentChanged = true;
            }

            if (contentChanged && contentHost && !contentHost.isContentEditable) {
                contentHost.innerHTML = renderTextContent(data);
            }
        }

        updateElementStyleState(id, { [prop]: value });
        markTextElementStyleAsLocal(data, prop);
        if (!dom) return;

        const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
        // Force important for text styles to override Reveal.js and theme defaults
        const textProps = ["color", "fontSize", "fontFamily", "fontWeight", "fontStyle", "textAlign", "lineHeight", "textShadow"];
        const priority = textProps.includes(prop) ? "important" : "";
        
        _setElementDomStyleProperty(dom, prop, value, priority);

        if (data.type === "text") {
            if (contentHost) {
                _setElementDomStyleProperty(contentHost, prop, value, priority);
                if (["color", "fontSize", "fontFamily", "fontWeight", "fontStyle"].includes(prop) && contentHost.dataset.structuredEdit !== "true") {
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
    const active = document.activeElement;
    if (
        active?.matches?.("input, select, textarea") &&
        (active.closest("#floating-text-toolbar") || active.closest("#properties-panel"))
    ) {
        return;
    }

    const inline = getStyleAtSelection();
    if (!inline) return;
    const defaults = getThemeTextStyleDefaults();

    // Update Font Family
    const fontControls = [document.getElementById("prop-font"), document.getElementById("floating-text-font")].filter(Boolean);
    fontControls.forEach(fontSelect => {
        if (!inline.fontFamily) return;
        const family = inline.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
        // Try to find matching option
        for (let opt of fontSelect.options) {
            if (opt.value.toLowerCase().includes(family.toLowerCase())) {
                fontSelect.value = opt.value;
                break;
            }
        }
        setTextControlActive(fontSelect, normalizeFontFamily(fontSelect.value) !== normalizeFontFamily(defaults.fontFamily));
    });

    // Update Font Size
    const sizeControls = [document.getElementById("prop-fs"), document.getElementById("floating-text-size")].filter(Boolean);
    sizeControls.forEach(fsInput => {
        if (!inline.fontSize) return;
        if (!isControlBeingEdited(fsInput)) {
            fsInput.value = parseInt(inline.fontSize) || 32;
            fsInput.dataset.lastCommittedValue = _normalizePx(fsInput.value, "32px");
        }
        setTextControlActive(fsInput, _normalizePx(fsInput.value, "32px") !== defaults.fontSize);
    });

    // Update Color
    const colorControls = [document.getElementById("prop-tc"), document.getElementById("floating-text-color")].filter(Boolean);
    colorControls.forEach(colorInput => {
        if (!inline.color) return;
        // Convert rgb(r, g, b) to #rrggbb
        let color = inline.color;
        if (color.startsWith("rgb")) {
            const match = color.match(/\d+/g);
            if (match) {
                color = "#" + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            }
        }
        colorInput.value = color;
        setTextControlActive(colorInput, color.toLowerCase() !== _normalizeColorForInput(defaults.color, "#000000").toLowerCase());
    });

    // Update Bold/Italic states
    [document.getElementById("prop-bold"), document.getElementById("floating-text-bold")].filter(Boolean).forEach(boldBtn => {
        boldBtn.classList.toggle("active", inline.fontWeight === "bold");
    });
    [document.getElementById("prop-italic"), document.getElementById("floating-text-italic")].filter(Boolean).forEach(italicBtn => {
        italicBtn.classList.toggle("active", inline.fontStyle === "italic");
    });
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
    if (element.dataset.inlineFormattingGuardBound === "true") return;
    element.dataset.inlineFormattingGuardBound = "true";
    const isFormControl = ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName);
    element.addEventListener("pointerdown", event => {
        if (getActiveInlineEditor()) {
            captureInlineSelection();
            beginFormattingInteraction();
        }
        const interactiveTarget = event.target?.closest?.("input, select, textarea, button, label");
        if (!interactiveTarget && !["INPUT", "SELECT", "TEXTAREA", "BUTTON", "LABEL"].includes(element.tagName)) {
            event.preventDefault();
        }
    });
    const release = event => {
        if (event && event.target !== element) return;
        if (getActiveInlineEditor()) {
            requestAnimationFrame(() => endFormattingInteraction());
        } else {
            endFormattingInteraction();
        }
    };
    element.addEventListener("change", release);
    if (!isFormControl) {
        element.addEventListener("click", release);
    }
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
