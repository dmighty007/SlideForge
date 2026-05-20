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
    const isEditing =
        editor.contentEditable === "true" ||
        dom.classList.contains("editing-text") ||
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
    const currentColor = String(data.styles?.color || "")
        .trim()
        .toLowerCase();
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
        cell.classList.toggle(
            "is-active",
            selection?.type === "cell" && selection.row === row && selection.col === col,
        );
        cell.classList.toggle("is-row-selected", selection?.type === "row" && selection.row === row);
        cell.classList.toggle("is-col-selected", selection?.type === "col" && selection.col === col);
    });
}

function clearTablePartSelections() {
    document
        .querySelectorAll(
            ".table-element-cell.is-active, .table-element-cell.is-row-selected, .table-element-cell.is-col-selected",
        )
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
    return Boolean(
        element && document.activeElement === element && ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName),
    );
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
    updateFloatingToolbars?.();
    buildPropertiesPanel();
    refreshPreviews?.();
}

function applyTextFormatting(prop, value, options = {}) {
    const data = getSelectedElementData();
    if (!data || data.type !== "text") return;

    const inlineContext = getActiveInlineTextContext(data);
    const isInlineEditingSession = !!document.querySelector(
        ".canvas-element.editing-text .text-element-content[contenteditable='true']",
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
        applyHtmlEmbedSandbox(frame);
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
            data.pdfEditorMode === "highlight"
                ? "PDF Highlight"
                : data.pdfEditorMode === "note"
                  ? "PDF Note"
                  : "PDF Navigate";
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
        return normalizeBulletedListLines(extractPlainLines(data.content)).join("\n");
    }
    const listState = getTextListState(data.content, data.bulletStyle);
    if (listState.kind === "bulleted") {
        return normalizeBulletedListLines(extractPlainLines(data.content)).join("\n");
    }
    return parseTextFromHtml(data.content || "");
}

function buildTextContentFromSidebarValue(data, value) {
    const rawValue = String(value || "").replace(/\r/g, "");
    const lines = rawValue.split("\n");
    const listState = getTextListState(data.content, data.bulletStyle);

    if (isStructuredBulletContent(data.content)) {
        const style = data.bulletStyle || "default";
        const populatedLines = normalizeBulletedListLines(lines);
        return {
            content: buildStructuredBulletContent(populatedLines.length ? populatedLines : ["List item"], style),
            bulletStyle: style,
        };
    }

    if (listState.kind === "bulleted") {
        const populatedLines = normalizeBulletedListLines(lines);
        return {
            content: buildStructuredBulletContent(
                populatedLines.length ? populatedLines : ["List item"],
                listState.style || "default",
            ),
            bulletStyle: listState.style || "default",
        };
    }

    if (listState.kind === "numbered") {
        const populatedLines = lines.map(line => line.trim()).filter(Boolean);
        return {
            content: buildNumberedListMarkup(
                listState.style || "decimal",
                populatedLines.length ? populatedLines : ["List item"],
            ),
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
        if (isStructuredBulletContent(data.content)) {
            nextContent = data.content;
        } else {
            nextContent = buildStructuredBulletContent(extractStyledLines(data.content), nextBulletStyle);
        }
    }

    updateElementState(data.id, { content: nextContent, bulletStyle: nextBulletStyle });
    data.content = nextContent;
    data.bulletStyle = nextBulletStyle;

    const dom = document.getElementById(data.id);
    const contentHost = dom?.querySelector(".text-element-content");
    if (
        contentHost?.dataset?.structuredEdit === "true" &&
        contentHost?.dataset?.structuredEditMode === "list" &&
        isStructuredBulletContent(nextContent)
    ) {
        contentHost.dataset.structuredEditBulletStyle = nextBulletStyle || "default";
        contentHost.innerHTML = buildStructuredBulletEditorHtml(nextContent, nextBulletStyle || "default");
        contentHost.contentEditable = true;
        if (typeof _focusEditableHost === "function") _focusEditableHost(contentHost);
    } else {
        syncTextDomContent(data);
    }
    requestAnimationFrame(updateFloatingToolbars);
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

function getNextClickAnimationOrder(excludeId = "") {
    return (
        getSlideAnimationEntries()
            .filter(entry => entry.el.id !== excludeId && entry.animation.trigger === "on-click")
            .reduce((maxOrder, entry) => Math.max(maxOrder, Number(entry.animation.order) || 0), -1) + 1
    );
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
        nextOrder =
            entries
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
        wrap.className = "prop-group";

        const header = document.createElement("div");
        header.className = "flex items-center justify-between cursor-pointer py-2";

        const titleEl = document.createElement("h3");
        titleEl.className = "prop-group-title m-0";
        titleEl.textContent = title;

        const chevron = document.createElement("i");
        chevron.className = "fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200";

        header.appendChild(titleEl);
        header.appendChild(chevron);
        wrap.appendChild(header);

        const content = document.createElement("div");
        content.className = "space-y-3 pt-1 pb-2";
        wrap.appendChild(content);

        header.onclick = () => {
            const isHidden = content.style.display === "none";
            content.style.display = isHidden ? "block" : "none";
            chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
        };

        // Redirect innerHTML operations to the content div so backward-compatible append works flawlessly
        Object.defineProperty(wrap, "innerHTML", {
            get() {
                return content.innerHTML;
            },
            set(val) {
                content.innerHTML = val;
            },
            configurable: true,
        });

        return wrap;
    };

    const slide = state.slides[currentSlideIndex] || { layoutId: "blank-titled", notes: "" };
    const background = normalizeSlideBackground(slide.background);

    const globalGrp = createGroup("Global Settings");
    globalGrp.innerHTML += `
        <div class="space-y-3">
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Theme</label>
                <select id="prop-global-theme" class="prop-select">
                    ${Object.entries(typeof PRESENTATION_THEMES !== "undefined" ? PRESENTATION_THEMES : {})
                        .map(
                            ([themeId, theme]) =>
                                `<option value="${escapeHtml(themeId)}" ${state.presentationTheme === themeId ? "selected" : ""}>${escapeHtml(theme.label || themeId)}</option>`,
                        )
                        .join("")}
                </select>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-slate-600 uppercase tracking-wide">Slide Size</label>
                <select id="prop-global-size" class="prop-select">
                    <option value="widescreen-16-9" ${getPresentationPageSetupId(state) === "widescreen-16-9" ? "selected" : ""}>16:9</option>
                    <option value="standard-4-3" ${getPresentationPageSetupId(state) === "standard-4-3" ? "selected" : ""}>4:3</option>
                    <option value="widescreen-16-10" ${getPresentationPageSetupId(state) === "widescreen-16-10" ? "selected" : ""}>16:10</option>
                </select>
            </div>
        </div>
    `;
    panel.appendChild(globalGrp);

    const layoutGrp = createGroup("Slide Layout");
    const presetOptions = Object.entries(window.SLIDE_PRESETS || {})
        .map(
            ([id, preset]) =>
                `<option value="${id}" ${slide.layoutId === id ? "selected" : ""}>${preset.name}</option>`,
        )
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

    const masterId =
        typeof resolveSlideMasterId === "function" ? resolveSlideMasterId(slide) : slide.masterId || "content";
    const masterConfig = state.masterSlides?.[masterId] || {};
    const masterOptions = Object.entries(
        typeof getMasterSlideOptions === "function"
            ? getMasterSlideOptions()
            : typeof MASTER_SLIDE_DEFINITIONS !== "undefined"
              ? MASTER_SLIDE_DEFINITIONS
              : {},
    )
        .map(
            ([id, master]) =>
                `<option value="${escapeHtml(id)}" ${masterId === id ? "selected" : ""}>${escapeHtml(master.name || id)}</option>`,
        )
        .join("");
    const masterGrp = createGroup("Master Slide");
    masterGrp.innerHTML += `
        <div class="space-y-2">
            <select id="prop-slide-master" class="w-full text-xs">${masterOptions}</select>
            <label class="prop-label">Footer</label>
            <div class="grid grid-cols-2 gap-2">
                <input id="prop-master-logo" class="w-full text-xs" type="text" value="${escapeHtml(masterConfig.logoText || "")}" placeholder="Logo / label" ${masterId === "none" ? "disabled" : ""}>
                <input id="prop-master-footer" class="w-full text-xs" type="text" value="${escapeHtml(masterConfig.footerText || "")}" placeholder="Footer text" ${masterId === "none" ? "disabled" : ""}>
            </div>
            <label class="flex items-center gap-2 text-xs text-slate-600">
                <input id="prop-master-slide-number" type="checkbox" class="prop-native-checkbox" ${masterConfig.showSlideNumber !== false ? "checked" : ""} ${masterId === "none" ? "disabled" : ""}>
                Show slide number
            </label>
            <div class="text-xs text-slate-600">Master elements are theme-aware and shared by slides using the same master.</div>
        </div>
    `;
    panel.appendChild(masterGrp);

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
        const masterSelect = document.getElementById("prop-slide-master");
        const masterLogoInput = document.getElementById("prop-master-logo");
        const masterFooterInput = document.getElementById("prop-master-footer");
        const masterSlideNumberInput = document.getElementById("prop-master-slide-number");
        const bgUrlInput = document.getElementById("prop-slide-bg-url");
        const bgFitInput = document.getElementById("prop-slide-bg-fit");
        const bgApplyBtn = document.getElementById("prop-slide-bg-apply");
        const bgUploadBtn = document.getElementById("prop-slide-bg-upload");
        const bgClearBtn = document.getElementById("prop-slide-bg-clear");
        const bgAdjustmentInputs = [
            [
                "prop-slide-bg-opacity",
                "prop-slide-bg-opacity-label",
                "opacity",
                value => Math.max(0, Math.min(100, Number(value) || 0)) / 100,
                value => `${Math.round(value)}%`,
            ],
            [
                "prop-slide-bg-blur",
                "prop-slide-bg-blur-label",
                "blur",
                value => Math.max(0, Math.min(40, Number(value) || 0)),
                value => `${Math.round(value)}px`,
            ],
            [
                "prop-slide-bg-brightness",
                "prop-slide-bg-brightness-label",
                "brightness",
                value => Math.max(10, Math.min(200, Number(value) || 100)),
                value => `${Math.round(value)}%`,
            ],
            [
                "prop-slide-bg-saturate",
                "prop-slide-bg-saturate-label",
                "saturate",
                value => Math.max(0, Math.min(250, Number(value) || 100)),
                value => `${Math.round(value)}%`,
            ],
        ];
        const globalTheme = document.getElementById("prop-global-theme");
        const globalSize = document.getElementById("prop-global-size");
        const notesInput = document.getElementById("prop-slide-notes");

        if (globalTheme) {
            globalTheme.onchange = e => {
                if (typeof changePresentationTheme === "function") changePresentationTheme(e.target.value);
                else applyPresentationTheme(e.target.value);
            };
        }
        if (globalSize) {
            globalSize.onchange = e => applyPresentationPageSetup(e.target.value);
        }

        if (layoutSelect) {
            layoutSelect.onchange = e => {
                const layoutId = e.target.value || "blank-titled";
                applyPresetLayoutToCurrentSlide?.(layoutId);
            };
        }

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
        if (masterSelect) {
            masterSelect.onchange = e => setCurrentSlideMaster?.(e.target.value);
        }
        const updateCurrentMaster = () => {
            const nextMasterId = masterSelect?.value || masterId;
            if (nextMasterId === "none") return;
            updateMasterSlide?.(nextMasterId, {
                logoText: masterLogoInput?.value || "",
                footerText: masterFooterInput?.value || "",
                showSlideNumber: masterSlideNumberInput?.checked !== false,
            });
        };
        if (masterLogoInput) masterLogoInput.onchange = updateCurrentMaster;
        if (masterFooterInput) masterFooterInput.onchange = updateCurrentMaster;
        if (masterSlideNumberInput) masterSlideNumberInput.onchange = updateCurrentMaster;
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
                    bgNode.style.transform = nextBackground.blur
                        ? `scale(${1 + Math.min(40, nextBackground.blur) / 120})`
                        : "";
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
    requestAnimationFrame(updateFloatingToolbars);
}

function updateFloatingToolbars() {
    ["floating-text-toolbar", "floating-shape-toolbar", "floating-image-toolbar"].forEach(id => {
        const tb = document.getElementById(id);
        if (tb) tb.classList.add("hidden");
    });

    const data = getSelectedElementData();
    if (!data || document.body.classList.contains("play-mode-active") || state.selectedIds.length !== 1) return;

    const dom = document.getElementById(data.id);
    if (!dom) return;

    let toolbarId = null;
    if (data.type === "text" && !data.iconMode) toolbarId = "floating-text-toolbar";
    else if (data.type === "shape") toolbarId = "floating-shape-toolbar";
    else if (data.type === "image") toolbarId = "floating-image-toolbar";

    if (!toolbarId) return;

    const toolbar = document.getElementById(toolbarId);
    if (!toolbar) return;

    const rect = dom.getBoundingClientRect();
    positionFloatingToolbar(toolbar, rect, { placement: data.type === "text" ? "top" : "auto" });

    if (data.type === "text") _bindFloatingTextToolbar(data, toolbar);
    else if (data.type === "shape") _bindFloatingShapeToolbar(data, toolbar);
    else if (data.type === "image") _bindFloatingImageToolbar(data, toolbar);
}

function positionFloatingToolbar(toolbar, targetRect, options = {}) {
    if (!toolbar || !targetRect) return;

    const previousVisibility = toolbar.style.visibility;
    toolbar.classList.remove("hidden");
    // Re-trigger the pop-in entry animation each time the toolbar is shown
    toolbar.classList.remove("animate-popIn");
    void toolbar.offsetWidth; // force reflow to reset animation
    toolbar.classList.add("animate-popIn");
    toolbar.style.visibility = "hidden";
    toolbar.style.left = "0px";
    toolbar.style.top = "0px";

    const toolbarRect = toolbar.getBoundingClientRect();
    const toolbarWidth = toolbarRect.width || toolbar.offsetWidth || 320;
    const toolbarHeight = toolbarRect.height || toolbar.offsetHeight || 44;
    const gap = 12;
    const viewportPad = 12;

    const appToolbarRect = document.getElementById("app-toolbar")?.getBoundingClientRect();
    const insertToolbarRect = document.getElementById("insert-toolbar-row")?.getBoundingClientRect();
    const canvasRect = document.getElementById("canvas-wrapper")?.getBoundingClientRect();
    const propertiesRect = document.getElementById("properties-panel")?.classList.contains("hidden")
        ? null
        : document.getElementById("properties-panel")?.getBoundingClientRect();

    const minTop = Math.max(viewportPad, appToolbarRect?.bottom || 0, insertToolbarRect?.bottom || 0) + 8;
    const maxTop = window.innerHeight - toolbarHeight - viewportPad;
    const minLeft = Math.max(viewportPad, (canvasRect?.left || 0) + 8);
    const maxLeft = Math.max(minLeft, (propertiesRect?.left || window.innerWidth) - toolbarWidth - 8);

    const centeredLeft = targetRect.left + targetRect.width / 2 - toolbarWidth / 2;
    const left = Math.max(minLeft, Math.min(maxLeft, centeredLeft));

    const topAbove = targetRect.top - toolbarHeight - gap;
    const topBelow = targetRect.bottom + gap;
    const hasRoomAbove = topAbove >= minTop;
    const hasRoomBelow = topBelow <= maxTop;

    const preferTop = options.placement === "top";

    let top;
    if (preferTop) {
        top = Math.max(minTop, Math.min(maxTop, topAbove));
    } else if (hasRoomAbove) {
        top = topAbove;
    } else if (hasRoomBelow) {
        top = topBelow;
    } else {
        const spaceAbove = Math.max(0, targetRect.top - minTop);
        const spaceBelow = Math.max(0, maxTop - targetRect.bottom);
        top = spaceBelow >= spaceAbove ? topBelow : topAbove;
        top = Math.max(minTop, Math.min(maxTop, top));
    }

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
    const renderedRect = toolbar.getBoundingClientRect();
    const dx = renderedRect.left - left;
    const dy = renderedRect.top - top;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        toolbar.style.left = `${left - dx}px`;
        toolbar.style.top = `${top - dy}px`;
    }
    toolbar.style.visibility = previousVisibility || "";
}

let _imageHoverToolbarHideTimer = null;
let _textHoverToolbarHideTimer = null;

function _getToolbarTargetTextData(toolbar, fallbackData = null) {
    const id = toolbar?.dataset?.hoverTextId || fallbackData?.id || state.selectedIds?.[0];
    return state.slides[currentSlideIndex]?.elements?.find(el => el.id === id && el.type === "text") || fallbackData;
}

function _ensureTextToolbarTargetSelected(toolbar, fallbackData = null) {
    const target = _getToolbarTargetTextData(toolbar, fallbackData);
    if (!target) return null;
    if (state.selectedIds.length !== 1 || state.selectedIds[0] !== target.id) {
        selectElement(target.id, "replace");
    }
    return state.slides[currentSlideIndex]?.elements?.find(el => el.id === target.id) || target;
}

function showTextHoverToolbar(id) {
    if (document.body.classList.contains("play-mode-active")) return;

    const data = state.slides[currentSlideIndex]?.elements?.find(el => el.id === id);
    const dom = document.getElementById(id);
    const toolbar = document.getElementById("floating-text-toolbar");
    if (!data || data.type !== "text" || data.iconMode || data.hidden || !dom || !toolbar) return;
    if (dom.classList.contains("editing-text")) return;

    clearTimeout(_textHoverToolbarHideTimer);
    ["floating-shape-toolbar", "floating-image-toolbar"].forEach(toolbarId => {
        document.getElementById(toolbarId)?.classList.add("hidden");
    });

    const rect = dom.getBoundingClientRect();
    positionFloatingToolbar(toolbar, rect, { placement: "top" });
    toolbar.dataset.hoverTextId = id;
    toolbar.dataset.hoverMode = state.selectedIds.includes(id) ? "selected" : "hover";
    _bindFloatingTextToolbar(data, toolbar);
    requestAnimationFrame(() => {
        if (toolbar.dataset.hoverTextId !== id || state.selectedIds.includes(id)) return;
        positionFloatingToolbar(toolbar, dom.getBoundingClientRect(), { placement: "top" });
        toolbar.classList.remove("hidden");
    });
}

function scheduleTextHoverToolbarHide(id) {
    clearTimeout(_textHoverToolbarHideTimer);
    _textHoverToolbarHideTimer = setTimeout(() => {
        const toolbar = document.getElementById("floating-text-toolbar");
        const dom = document.getElementById(id);
        if (!toolbar || state.selectedIds.includes(id)) return;
        if (toolbar.matches(":hover") || dom?.matches(":hover")) return;
        toolbar.classList.add("hidden");
        delete toolbar.dataset.hoverTextId;
        delete toolbar.dataset.hoverMode;
    }, 180);
}

function bindTextHoverToolbarElement(id) {
    const dom = document.getElementById(id);
    const toolbar = document.getElementById("floating-text-toolbar");
    if (!dom || !toolbar || dom.dataset.textHoverToolbarBound === "true") return;
    const data = state.slides[currentSlideIndex]?.elements?.find(el => el.id === id);
    if (!data || data.type !== "text" || data.iconMode) return;
    dom.dataset.textHoverToolbarBound = "true";
    dom.addEventListener("mouseenter", () => showTextHoverToolbar(id));
    dom.addEventListener("mouseleave", () => scheduleTextHoverToolbarHide(id));
    if (toolbar.dataset.textHoverToolbarBound !== "true") {
        toolbar.dataset.textHoverToolbarBound = "true";
        toolbar.addEventListener("mouseenter", () => clearTimeout(_textHoverToolbarHideTimer));
        toolbar.addEventListener("mouseleave", () => {
            const hoverId = toolbar.dataset.hoverTextId;
            if (hoverId) scheduleTextHoverToolbarHide(hoverId);
        });
        toolbar.addEventListener("pointerdown", () => clearTimeout(_textHoverToolbarHideTimer));
    }
}

window.bindTextHoverToolbarElement = bindTextHoverToolbarElement;

function showImageHoverToolbar(id) {
    if (document.body.classList.contains("play-mode-active")) return;
    if (state.selectedIds.length && !state.selectedIds.includes(id)) return;

    const data = state.slides[currentSlideIndex]?.elements?.find(el => el.id === id);
    const dom = document.getElementById(id);
    const toolbar = document.getElementById("floating-image-toolbar");
    if (!data || data.type !== "image" || data.hidden || !dom || !toolbar) return;

    clearTimeout(_imageHoverToolbarHideTimer);
    ["floating-text-toolbar", "floating-shape-toolbar"].forEach(toolbarId => {
        document.getElementById(toolbarId)?.classList.add("hidden");
    });

    const rect = dom.getBoundingClientRect();
    positionFloatingToolbar(toolbar, rect);
    toolbar.dataset.hoverImageId = id;
    _bindFloatingImageToolbar(data, toolbar);
}

function scheduleImageHoverToolbarHide(id) {
    clearTimeout(_imageHoverToolbarHideTimer);
    _imageHoverToolbarHideTimer = setTimeout(() => {
        const toolbar = document.getElementById("floating-image-toolbar");
        const dom = document.getElementById(id);
        if (!toolbar || state.selectedIds.includes(id)) return;
        if (toolbar.matches(":hover") || dom?.matches(":hover")) return;
        toolbar.classList.add("hidden");
        delete toolbar.dataset.hoverImageId;
    }, 160);
}

function bindImageHoverToolbarElement(id) {
    const dom = document.getElementById(id);
    const toolbar = document.getElementById("floating-image-toolbar");
    if (!dom || !toolbar || dom.dataset.imageHoverToolbarBound === "true") return;
    dom.dataset.imageHoverToolbarBound = "true";
    dom.addEventListener("mouseenter", () => showImageHoverToolbar(id));
    dom.addEventListener("mouseleave", () => scheduleImageHoverToolbarHide(id));
    if (toolbar.dataset.imageHoverToolbarBound !== "true") {
        toolbar.dataset.imageHoverToolbarBound = "true";
        toolbar.addEventListener("mouseenter", () => clearTimeout(_imageHoverToolbarHideTimer));
        toolbar.addEventListener("mouseleave", () => {
            const hoverId = toolbar.dataset.hoverImageId;
            if (hoverId) scheduleImageHoverToolbarHide(hoverId);
        });
    }
}

window.bindImageHoverToolbarElement = bindImageHoverToolbarElement;

function _bindFloatingTextToolbar(data, toolbar) {
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

    const applyFloatingTextFormatting = (prop, value, options = {}) => {
        const target = _ensureTextToolbarTargetSelected(toolbar, data);
        if (!target) return;
        applyTextFormatting(prop, value, options);
        requestAnimationFrame(() => {
            if (!isControlBeingEdited(document.activeElement)) {
                updateFloatingToolbars();
            }
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
        setTextControlActive(
            fontSelect,
            normalizeFontFamily(fontSelect.value) !== normalizeFontFamily(getThemeTextStyleDefaults().fontFamily),
        );
    }
    if (sizeInput) {
        bindFontSizeFormattingControl(sizeInput);
        if (!isControlBeingEdited(sizeInput)) {
            sizeInput.value = parseInt(data.styles.fontSize) || 32;
            sizeInput.dataset.lastCommittedValue = _normalizePx(sizeInput.value, "32px");
        }
        setTextControlActive(
            sizeInput,
            `${parseInt(data.styles.fontSize) || 32}px` !== getThemeTextStyleDefaults().fontSize,
        );
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
        const endFloatingColorFormatting = () => {
            if (colorInput.dataset.floatingColorFormattingActive === "true") {
                delete colorInput.dataset.floatingColorFormattingActive;
                endFormattingInteraction();
            }
        };
        colorInput.onchange = endFloatingColorFormatting;
        colorInput.onblur = endFloatingColorFormatting;
        if (!isControlBeingEdited(colorInput)) {
            colorInput.value = _normalizeColorForInput(data.styles.color, "#000000");
        }
        setTextControlActive(
            colorInput,
            _normalizeColorForInput(data.styles.color, "#000000").toLowerCase() !==
                _normalizeColorForInput(getThemeTextStyleDefaults().color, "#000000").toLowerCase(),
        );
    }

    const paletteContainer = document.getElementById("floating-text-palette");
    if (paletteContainer) {
        paletteContainer.innerHTML = "";
        (state.colorPalette || []).forEach(color => {
            const swatch = document.createElement("button");
            swatch.className =
                "w-4 h-4 rounded-full border border-slate-200 hover:scale-110 transition-transform shadow-sm";
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
        clearBtn.onclick = () => {
            const target = _ensureTextToolbarTargetSelected(toolbar, data);
            if (target) clearTextFormatting(target);
        };
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
function _bindFloatingShapeToolbar(data, toolbar) {
    const fillInput = document.getElementById("floating-shape-fill");
    const borderInput = document.getElementById("floating-shape-border");
    const widthSelect = document.getElementById("floating-shape-border-width");

    if (fillInput) {
        if (!isControlBeingEdited(fillInput)) {
            fillInput.value = _normalizeColorForInput(data.styles.backgroundColor, "#ffffff");
        }
        fillInput.oninput = e => updateElementState(data.id, { styles: { backgroundColor: e.target.value } });
        fillInput.onchange = () => {
            saveStateToUndo();
            if (window.renderSlidesFromState) renderSlidesFromState();
        };
    }

    if (borderInput) {
        if (!isControlBeingEdited(borderInput)) {
            const borderMatches = (data.styles.border || "").match(
                /solid\s+(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/,
            );
            borderInput.value = borderMatches ? _normalizeColorForInput(borderMatches[1], "#000000") : "#000000";
        }
        borderInput.oninput = e => {
            const currentBorder = data.styles.border || "0px solid #000000";
            const widthMatch = currentBorder.match(/^(\d+)px/);
            const w = widthMatch ? widthMatch[1] : data.styles.borderWidth || "1";
            updateElementState(data.id, { styles: { border: `${Math.max(1, w)}px solid ${e.target.value}` } });
        };
        borderInput.onchange = () => {
            saveStateToUndo();
            if (window.renderSlidesFromState) renderSlidesFromState();
        };
    }

    if (widthSelect) {
        if (!isControlBeingEdited(widthSelect)) {
            const currentBorder = data.styles.border || "0px solid #000000";
            const widthMatch = currentBorder.match(/^(\d+)px/);
            const w = widthMatch ? widthMatch[1] : data.styles.border ? "1" : "0";
            widthSelect.value = w;
        }
        widthSelect.onchange = e => {
            const w = parseInt(e.target.value) || 0;
            if (w === 0) {
                updateElementState(data.id, { styles: { border: "none" } });
            } else {
                const borderMatches = (data.styles.border || "").match(
                    /solid\s+(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/,
                );
                const color = borderMatches ? borderMatches[1] : "#000000";
                updateElementState(data.id, { styles: { border: `${w}px solid ${color}` } });
            }
            saveStateToUndo();
            if (window.renderSlidesFromState) renderSlidesFromState();
        };
    }
}

function _bindFloatingImageToolbar(data, toolbar) {
    const cropBtn = document.getElementById("floating-image-crop");
    const opacityInput = document.getElementById("floating-image-opacity");
    const radiusSelect = document.getElementById("floating-image-radius");
    const dom = document.getElementById(data.id);
    if (!data.styles) data.styles = {};

    if (cropBtn) {
        cropBtn.onclick = () => {
            if (window.triggerImageCrop) triggerImageCrop(data.id);
        };
    }

    if (opacityInput) {
        if (!isControlBeingEdited(opacityInput)) {
            opacityInput.value = data.styles.opacity !== undefined ? data.styles.opacity : 1;
        }
        opacityInput.oninput = e => {
            updateElementStyleState(data.id, { opacity: e.target.value });
            data.styles.opacity = e.target.value;
            if (dom) dom.style.opacity = e.target.value;
        };
        opacityInput.onchange = () => {
            saveStateToUndo();
            if (window.refreshPreviews) refreshPreviews();
        };
    }

    if (radiusSelect) {
        if (!isControlBeingEdited(radiusSelect)) {
            radiusSelect.value = data.styles.borderRadius || "0";
        }
        radiusSelect.onchange = e => {
            updateElementStyleState(data.id, { borderRadius: e.target.value });
            data.styles.borderRadius = e.target.value;
            if (dom) dom.style.borderRadius = e.target.value;
            saveStateToUndo();
            if (window.refreshPreviews) refreshPreviews();
        };
    }
}

function createGroup(title) {
    const wrap = document.createElement("div");
    wrap.className = "prop-group";
    const header = document.createElement("div");
    header.className = "flex items-center justify-between cursor-pointer py-2";
    const titleEl = document.createElement("h3");
    titleEl.className = "prop-group-title m-0";
    titleEl.textContent = title;
    const chevron = document.createElement("i");
    chevron.className = "fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200";
    header.appendChild(titleEl);
    header.appendChild(chevron);
    const content = document.createElement("div");
    content.className = "space-y-3 pt-1 pb-2";

    header.onclick = () => {
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "block" : "none";
        chevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
    };

    wrap.appendChild(header);
    wrap.appendChild(content);

    // We override appendChild and innerHTML on 'wrap' so existing code seamlessly adds to 'content' instead of 'wrap'
    wrap._originalAppendChild = wrap.appendChild;
    wrap.appendChild = function (node) {
        if (node === header || node === content) return wrap._originalAppendChild(node);
        return content.appendChild(node);
    };
    Object.defineProperty(wrap, "innerHTML", {
        get() {
            return content.innerHTML;
        },
        set(html) {
            content.innerHTML = html;
        },
    });

    return wrap;
}

function createField(label, inputHTML) {
    const div = document.createElement("div");
    div.className = "flex flex-col gap-1";
    div.innerHTML = `<label class="text-xs font-bold text-slate-600 uppercase tracking-wide">${label}</label>${inputHTML}`;
    return div;
}

function buildPropertiesPanel() {
    if (typeof renderLayersList === "function") renderLayersList();
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
    updateFloatingToolbars();

    if (document.body.classList.contains("whiteboard-mode-active") && typeof window.renderWhiteboardPropertiesPanel === "function") {
        window.renderWhiteboardPropertiesPanel(panel);
        restorePropertiesScroll();
        return;
    }

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
        ${
            !isSingle
                ? `
        <div class="grid grid-cols-6 gap-1 mb-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <button class="prop-align-btn" onclick="alignSelection('left')" title="Align Left"><i class="fa-solid fa-align-left text-xs"></i></button>
            <button class="prop-align-btn" onclick="alignSelection('center')" title="Align Center"><i class="fa-solid fa-align-center text-xs"></i></button>
            <button class="prop-align-btn" onclick="alignSelection('right')" title="Align Right"><i class="fa-solid fa-align-right text-xs"></i></button>
            <button class="prop-align-btn" onclick="alignSelection('top')" title="Align Top"><i class="fa-solid fa-align-left rotate-90 text-xs"></i></button>
            <button class="prop-align-btn" onclick="alignSelection('middle')" title="Align Middle"><i class="fa-solid fa-align-center rotate-90 text-xs"></i></button>
            <button class="prop-align-btn" onclick="alignSelection('bottom')" title="Align Bottom"><i class="fa-solid fa-align-right rotate-90 text-xs"></i></button>
        </div>
        `
                : ""
        }
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
            const bgField = createField(
                "Fill",
                `<input type="color" id="prop-bg" class="w-12 h-7 cursor-pointer rounded-md p-0" value="${_normalizeColorForInput(data.styles.backgroundColor, "#000000")}">`,
            );
            bgOpacityRow.appendChild(bgField);
        }

        // Opacity Slider (More compact)
        const opacityVal = Math.round(parseFloat(data.styles.opacity ?? 1) * 100);
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
        const elements = state.selectedIds
            .map(id => state.slides[currentSlideIndex].elements.find(e => e.id === id))
            .filter(Boolean);
        const allShapes = elements.every(e => e.type === "shape");
        const allText = elements.every(e => e.type === "text");
        const textElements = elements.filter(e => e.type === "text");
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

        if (textElements.length) {
            const firstAlign = textElements[0]?.styles?.textAlign || "left";
            const sharedAlign = textElements.every(e => (e.styles?.textAlign || "left") === firstAlign)
                ? firstAlign
                : "";
            const textAlignGrp = createGroup(
                textElements.length === elements.length ? "Text Alignment" : "Text in Group",
            );
            textAlignGrp.appendChild(
                createField(
                    "Alignment",
                    `<div class="prop-btn-group" id="prop-shared-text-align">
                        ${["left", "center", "right", "justify"]
                            .map(
                                align => `<button type="button" class="prop-btn ${sharedAlign === align ? "active" : ""}" data-align="${align}" title="${align.charAt(0).toUpperCase() + align.slice(1)}">
                                    <i class="fa-solid fa-align-${align === "justify" ? "justify" : align}"></i>
                                </button>`,
                            )
                            .join("")}
                    </div>`,
                ),
            );
            panel.appendChild(textAlignGrp);
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
            const selectedRow =
                tableSelection?.type === "row" || tableSelection?.type === "cell" ? tableSelection.row : null;
            const selectedCol =
                tableSelection?.type === "col" || tableSelection?.type === "cell" ? tableSelection.col : null;
            const selectedCell =
                tableSelection?.type === "cell" && selectedRow !== null && selectedCol !== null
                    ? tableData.cells[selectedRow]?.[selectedCol]
                    : null;
            const selectedStyles = selectedCell?.styles || {};
            const effectiveTableFontFamily =
                selectedStyles.fontFamily || tableData.fontFamily || '"Manrope", sans-serif';
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
        // For now, keep this group for type-specific controls.
        if (data.type === "video") {
            const grp = createGroup("Video Settings");

            // Format nice human-readable source label
            let displaySource = "";
            let isLocal = false;
            if (data.content) {
                if (
                    data.content.startsWith("data:") ||
                    data.content.startsWith("/media/") ||
                    data.content.startsWith("blob:") ||
                    data.content.startsWith("/")
                ) {
                    isLocal = true;
                    const parts = data.content.split("/");
                    displaySource = parts[parts.length - 1];
                    if (displaySource.length > 25) {
                        displaySource =
                            displaySource.substring(0, 10) + "..." + displaySource.substring(displaySource.length - 10);
                    }
                } else {
                    displaySource = data.content;
                }
            }

            const containerDiv = document.createElement("div");
            containerDiv.className = "flex flex-col gap-3.5 p-1";
            containerDiv.innerHTML = `
                <!-- Video Source Card -->
                <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-sm flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video Source</span>
                        <span class="px-2 py-0.5 text-[9px] font-semibold rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                            ${isLocal ? '<i class="fa-solid fa-file-video mr-1"></i> Local File' : '<i class="fa-solid fa-globe mr-1"></i> External URL'}
                        </span>
                    </div>

                    <div class="relative">
                        <input type="text" id="prop-video-url"
                            class="w-full text-xs bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder-slate-400"
                            value="${data.content?.startsWith("data:") ? "Local File (Base64)" : data.content || ""}"
                            placeholder="Paste URL or absolute local path...">
                        <i class="fa-solid fa-link absolute right-3 top-2.5 text-slate-400 text-xs"></i>
                    </div>

                    <button onclick="const input=document.getElementById('video-file-upload'); input.dataset.targetVideoId='${data.id}'; input.click()"
                        class="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 border border-indigo-500/20">
                        <i class="fa-solid fa-upload"></i> ${data.content ? "Replace Video File" : "Upload Video File"}
                    </button>

                    ${
                        isLocal
                            ? `
                        <button id="prop-video-clear-local" class="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10px] text-rose-600 hover:text-rose-700 transition-all flex items-center justify-center gap-2">
                            <i class="fa-solid fa-trash-can"></i> Clear Local File
                        </button>
                    `
                            : ""
                    }
                </div>

                <!-- Live Preview Controller Card -->
                ${
                    data.content
                        ? `
                <div id="video-live-player" class="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] uppercase font-bold tracking-wider text-slate-500">Live Editor Preview</span>
                        <span id="player-time-display" class="font-mono text-[10px] text-slate-400 tracking-wide">0:00 / 0:00</span>
                    </div>

                    <!-- Timeline scrubber -->
                    <div class="relative flex items-center group/slider">
                        <input type="range" id="player-timeline-scrub" min="0" max="100" value="0" step="0.1"
                            class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all focus:outline-none">
                    </div>

                    <!-- Controls row -->
                    <div class="flex items-center justify-between gap-2 mt-1">
                        <div class="flex items-center gap-2">
                            <button id="player-btn-play" class="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm">
                                <i class="fa-solid fa-play text-[10px]"></i>
                            </button>
                            <button id="player-btn-rewind" class="w-6 h-6 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer" title="Rewind 5s">
                                <i class="fa-solid fa-backward-step text-[9px]"></i>
                            </button>
                            <button id="player-btn-forward" class="w-6 h-6 rounded-lg bg-slate-850 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer" title="Forward 5s">
                                <i class="fa-solid fa-forward-step text-[9px]"></i>
                            </button>
                        </div>

                        <div class="flex items-center gap-1.5 bg-slate-850 rounded-lg px-2 py-1">
                            <button id="player-btn-mute" class="text-slate-450 hover:text-white transition-colors cursor-pointer">
                                <i class="fa-solid fa-volume-high text-[10px]"></i>
                            </button>
                            <input type="range" id="player-volume-scrub" min="0" max="100" value="100"
                                class="w-12 h-1 bg-slate-750 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none transition-all">
                        </div>
                    </div>
                </div>
                `
                        : ""
                }

                <!-- Playback Options Container -->
                <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-3 shadow-sm flex flex-col gap-3">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Playback Behavior</span>

                    <div class="flex items-center justify-between py-0.5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-lg bg-slate-200/60 border border-slate-300/40 flex items-center justify-center text-slate-600">
                                <i id="prop-video-mute-icon" class="fa-solid ${data.muted ? "fa-volume-xmark text-rose-505" : "fa-volume-high"} text-xs"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-semibold text-slate-700">Muted</span>
                                <span class="text-[10px] text-slate-400">Silence video audio</span>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="prop-video-mute" ${data.muted ? "checked" : ""} class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-250 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between py-0.5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-lg bg-slate-200/60 border border-slate-300/40 flex items-center justify-center text-slate-600">
                                <i class="fa-solid fa-play-circle text-xs"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-semibold text-slate-700">Autoplay</span>
                                <span class="text-[10px] text-slate-400">Start playing on load</span>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="prop-video-autoplay" ${data.autoplay ? "checked" : ""} class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-250 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between py-0.5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-lg bg-slate-200/60 border border-slate-300/40 flex items-center justify-center text-slate-600">
                                <i class="fa-solid fa-repeat text-xs"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-semibold text-slate-700">Loop</span>
                                <span class="text-[10px] text-slate-400">Repeat video infinitely</span>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="prop-video-loop" ${data.loop ? "checked" : ""} class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-250 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 transition-colors"></div>
                        </label>
                    </div>
                </div>
            `;
            grp.appendChild(containerDiv);
            panel.appendChild(grp);
        }

        if (data.type === "image") {
            const imgGrp = createGroup("Image");
            imgGrp.appendChild(
                createField("URL", `<input type="text" id="prop-img" class="w-full" value="${data.content || ""}">`),
            );
            imgGrp.innerHTML += `
                <button onclick="const input=document.getElementById('image-file-upload'); input.dataset.targetImageId='${data.id}'; input.click()" class="w-full mt-2 py-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 hover:bg-slate-800 transition-colors">
                    <i class="fa-solid fa-upload mr-1"></i> Replace Image File
                </button>
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
                    <input type="checkbox" id="prop-img-lock-aspect" ${data.lockAspectRatio ? "checked" : ""} class="aspect-lock-checkbox prop-native-checkbox">
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
                (data.content.startsWith("blob:") ||
                    data.content.startsWith("data:") ||
                    data.content.startsWith("/media/"));
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

        if (data.type === "molecule") {
            const moleculeGrp = createGroup("Molecule Viewer");
            const moleculeName = String(data.moleculeName || "Molecule").replace(/"/g, "&quot;");
            const moleculeBackground =
                typeof normalizeMoleculeBackgroundColor === "function"
                    ? normalizeMoleculeBackgroundColor(data.styles?.backgroundColor || "#020617")
                    : data.styles?.backgroundColor || "#020617";
            const moleculeBackgroundInput = _normalizeColorForInput(moleculeBackground, "#020617");
            const moleculeBackgroundTransparent = moleculeBackground === "transparent";
            const moleculeLayers = (
                Array.isArray(data.moleculeRepresentationLayers) ? data.moleculeRepresentationLayers : []
            )
                .map(layer =>
                    typeof normalizeMoleculeRepresentationLayer === "function"
                        ? normalizeMoleculeRepresentationLayer(layer)
                        : layer,
                )
                .slice(0, 12);
            moleculeGrp.innerHTML += `
                <div class="flex flex-col gap-2 mb-3">
                    <input type="text" id="prop-molecule-name" class="w-full text-xs" value="${moleculeName}" placeholder="Molecule name">
                    <button onclick="document.getElementById('molecule-file-upload').click()" class="w-full py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200">
                        Replace PDB / Trajectory
                    </button>
                </div>
                <button id="prop-molecule-toggle" class="w-full py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200 mb-2">
                    ${data.moleculeInteractive ? "3D Orbit Mode On" : "Select / Resize Mode On"}
                </button>
                <div class="grid grid-cols-[1fr_auto] items-end gap-2 mb-2">
                    <label class="flex flex-col gap-1 text-[11px] text-gray-400">
                        Background
                        <input id="prop-molecule-bg" type="color" class="w-full h-8 rounded bg-transparent" value="${moleculeBackgroundInput}" ${moleculeBackgroundTransparent ? "disabled" : ""}>
                    </label>
                    <label class="flex items-center gap-2 h-8 px-2 rounded bg-gray-900 border border-gray-700 text-[11px] text-gray-300">
                        <input id="prop-molecule-bg-transparent" type="checkbox" ${moleculeBackgroundTransparent ? "checked" : ""}>
                        Transparent
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <label class="flex flex-col gap-1 text-[11px] text-gray-400">
                        Style
                        <select id="prop-molecule-style" class="w-full text-xs">
                            <option value="cartoon" ${data.moleculeDefaultStyle === "cartoon" ? "selected" : ""}>Cartoon</option>
                            <option value="stick" ${data.moleculeDefaultStyle === "stick" ? "selected" : ""}>Stick</option>
                            <option value="sphere" ${data.moleculeDefaultStyle === "sphere" ? "selected" : ""}>Sphere</option>
                            <option value="line" ${data.moleculeDefaultStyle === "line" ? "selected" : ""}>Line</option>
                            <option value="surface" ${data.moleculeDefaultStyle === "surface" ? "selected" : ""}>Surface</option>
                        </select>
                    </label>
                    <label class="flex flex-col gap-1 text-[11px] text-gray-400">
                        Color
                        <select id="prop-molecule-color" class="w-full text-xs">
                            <option value="spectrum" ${data.moleculeDefaultColor === "spectrum" ? "selected" : ""}>Spectrum</option>
                            <option value="default" ${data.moleculeDefaultColor === "default" ? "selected" : ""}>Element</option>
                            <option value="chain" ${data.moleculeDefaultColor === "chain" ? "selected" : ""}>Chain</option>
                            <option value="amino" ${data.moleculeDefaultColor === "amino" ? "selected" : ""}>Residue</option>
                            <option value="ssJmol" ${data.moleculeDefaultColor === "ssJmol" ? "selected" : ""}>SS Jmol</option>
                        </select>
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button id="prop-molecule-rotate" class="py-2 rounded border text-xs ${data.moleculeAutoRotate ? "bg-accent/20 border-accent/40 text-accent" : "bg-gray-900 border-gray-700 text-gray-200"}">Auto Rotate</button>
                    <button id="prop-molecule-projection" class="py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-200">
                        ${data.moleculeProjection === "orthographic" ? "Orthographic" : "Perspective"}
                    </button>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-700/70 space-y-2">
                    <div class="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Representation Layer</div>
                    <input type="hidden" id="prop-molecule-layer-edit-id" value="">
                    <input type="text" id="prop-molecule-layer-selection" class="w-full text-xs" value="all" placeholder="all, protein, ligand, chain A, resi 42">
                    <div class="grid grid-cols-2 gap-2">
                        <select id="prop-molecule-layer-style" class="w-full text-xs">
                            <option value="cartoon">Cartoon</option>
                            <option value="stick">Stick</option>
                            <option value="sphere">Sphere</option>
                            <option value="line">Line</option>
                            <option value="surface">Surface</option>
                            <option value="hidden">Hidden</option>
                        </select>
                        <select id="prop-molecule-layer-color" class="w-full text-xs">
                            <option value="spectrum">Spectrum</option>
                            <option value="default">Element</option>
                            <option value="chain">Chain</option>
                            <option value="amino">Residue</option>
                            <option value="ssJmol">SS Jmol</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="flex flex-col gap-1 text-[11px] text-gray-400">
                            Size
                            <input type="number" id="prop-molecule-layer-radius" class="w-full text-xs" min="0.01" max="5" step="0.01" value="0.18">
                        </label>
                        <label class="flex flex-col gap-1 text-[11px] text-gray-400">
                            Opacity
                            <input type="number" id="prop-molecule-layer-opacity" class="w-full text-xs" min="0.02" max="1" step="0.01" value="0.68">
                        </label>
                    </div>
                    <input type="color" id="prop-molecule-layer-custom" class="w-full h-8 rounded bg-transparent" value="#6366f1">
                    <div class="grid grid-cols-[1fr_auto] gap-2">
                        <button id="prop-molecule-add-layer" class="py-2 rounded bg-accent/20 border border-accent/40 text-xs text-accent font-semibold">
                            Add Layer
                        </button>
                        <button id="prop-molecule-cancel-layer-edit" class="hidden px-3 py-2 rounded bg-gray-900 border border-gray-700 text-xs text-gray-300">
                            Cancel
                        </button>
                    </div>
                </div>
                <div class="mt-3 space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Saved Layers</span>
                        <button id="prop-molecule-clear-layers" class="text-[11px] text-gray-400 hover:text-red-400" ${moleculeLayers.length ? "" : "disabled"}>Clear</button>
                    </div>
                    <div id="prop-molecule-layer-list" class="space-y-1">
                        ${
                            moleculeLayers.length
                                ? moleculeLayers
                                      .map(layer => {
                                          const layerLabel =
                                              typeof escapeHtml === "function"
                                                  ? escapeHtml(layer.label || "Layer")
                                                  : String(layer.label || "Layer");
                                          const layerTitle = String(layer.label || "Layer").replace(/"/g, "&quot;");
                                          return `
                            <div class="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-2 py-1.5">
                                <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
                                <span class="min-w-0 flex-1 truncate text-[11px] text-gray-300" title="${layerTitle}">${layerLabel}</span>
                                <button class="prop-molecule-edit-layer text-[12px] text-gray-300 hover:text-accent" data-layer-id="${layer.id}">Edit</button>
                                <button class="prop-molecule-remove-layer text-[12px] text-red-400 hover:text-red-300" data-layer-id="${layer.id}">×</button>
                            </div>
                        `;
                                      })
                                      .join("")
                                : `<div class="text-[11px] text-gray-500 italic">No saved layers</div>`
                        }
                    </div>
                </div>
                <p class="text-[11px] text-gray-500 leading-relaxed mt-3">
                    Layer controls are saved with this element and applied in editor, export, and presentation mode.
                </p>
            `;
            panel.appendChild(moleculeGrp);
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

        if (data.type === "sketch") {
            const sketchGrp = createGroup("Sketch Tools");
            sketchGrp.innerHTML += `
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide">Stroke Color</label>
                        <input type="color" id="prop-sketch-color" class="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-none" value="${data.sketchStrokeColor || "#000000"}">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-slate-700 uppercase tracking-wide">Stroke Width</label>
                        <select id="prop-sketch-width" class="w-full text-xs">
                            <option value="1" ${(data.sketchStrokeWidth || 2) === 1 ? "selected" : ""}>1px</option>
                            <option value="2" ${(data.sketchStrokeWidth || 2) === 2 ? "selected" : ""}>2px</option>
                            <option value="3" ${(data.sketchStrokeWidth || 2) === 3 ? "selected" : ""}>3px</option>
                            <option value="4" ${(data.sketchStrokeWidth || 2) === 4 ? "selected" : ""}>4px</option>
                            <option value="6" ${(data.sketchStrokeWidth || 2) === 6 ? "selected" : ""}>6px</option>
                            <option value="8" ${(data.sketchStrokeWidth || 2) === 8 ? "selected" : ""}>8px</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button id="prop-sketch-clear" class="py-2 rounded bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
                            <i class="fa-solid fa-trash mr-1"></i>Clear
                        </button>
                        <button id="prop-sketch-activate" class="py-2 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors">
                            <i class="fa-solid fa-pen-nib mr-1"></i>Draw
                        </button>
                    </div>
                    <div class="text-xs text-slate-500 text-center py-2 border-t border-slate-200">
                        Click "Draw" to sketch, or select element and draw directly.
                    </div>
                </div>
            `;
            panel.appendChild(sketchGrp);
        }

        if (typeof buildAnimationInspectorPanel === "function") {
            const unifiedAnimDiv = document.createElement("div");
            unifiedAnimDiv.innerHTML = buildAnimationInspectorPanel(data);
            while (unifiedAnimDiv.firstChild) panel.appendChild(unifiedAnimDiv.firstChild);
        }
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

        document.querySelectorAll("#prop-shared-text-align [data-align]").forEach(button => {
            button.onclick = () => applyTextAlignmentToSelection(button.dataset.align);
        });

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
                        const row =
                            tableData.selection?.type === "row" || tableData.selection?.type === "cell"
                                ? tableData.selection.row
                                : null;
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
                        const col =
                            tableData.selection?.type === "col" || tableData.selection?.type === "cell"
                                ? tableData.selection.col
                                : null;
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
                    tableCellTextColor.oninput = e =>
                        mutateTableTextStyle("color", _normalizeColorForInput(e.target.value, "#172033"));
                }
                const tableTextAlign = document.getElementById("prop-table-text-align");
                if (tableTextAlign) {
                    tableTextAlign.onchange = e => mutateTableTextStyle("textAlign", e.target.value);
                }
                document.getElementById("prop-table-bold")?.addEventListener("click", () => {
                    const current = normalizeTableData(data.tableData);
                    const selection = current.selection;
                    const selected =
                        selection?.type === "cell"
                            ? current.cells[selection.row]?.[selection.col]?.styles?.fontWeight
                            : null;
                    const effective = selected || current.fontWeight || "400";
                    mutateTableTextStyle("fontWeight", effective === "700" || effective === "bold" ? "400" : "700");
                });
                document.getElementById("prop-table-italic")?.addEventListener("click", () => {
                    const current = normalizeTableData(data.tableData);
                    const selection = current.selection;
                    const selected =
                        selection?.type === "cell"
                            ? current.cells[selection.row]?.[selection.col]?.styles?.fontStyle
                            : null;
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
                    const commit = () =>
                        mutateSelectedTableData(tableData => {
                            tableData[key] = normalize(input.value);
                        });
                    input.addEventListener("change", commit);
                    input.addEventListener("blur", commit);
                };
                bindTableValue("prop-table-border-color", "borderColor", value =>
                    _normalizeColorForInput(value, "#cbd5e1"),
                );
                bindTableValue("prop-table-border-width", "borderWidth", value => Math.max(0, Number(value) || 0));
                bindTableValue("prop-table-header-fill", "headerFill", value =>
                    _normalizeColorForInput(value, "#e2e8f0"),
                );
                bindTableValue("prop-table-body-fill", "bodyFill", value => _normalizeColorForInput(value, "#ffffff"));
                bindTableValue("prop-table-alt-fill", "altFill", value => _normalizeColorForInput(value, "#f8fafc"));
                bindTableValue("prop-table-padding", "cellPadding", value => Math.max(2, Number(value) || 2));
                bindTableValue("prop-table-text-color", "textColor", value =>
                    _normalizeColorForInput(value, "#172033"),
                );
                bindTableValue("prop-table-header-text-color", "headerTextColor", value =>
                    _normalizeColorForInput(value, "#172033"),
                );
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
                            const nextType =
                                e.target.value === "curve" || e.target.value === "poly" ? e.target.value : "line";
                            let nextPoints = getConnectorPoints(data).map(point => ({ ...point }));
                            if (nextType === "line") {
                                nextPoints = [nextPoints[0], nextPoints[nextPoints.length - 1]];
                            } else if (nextType === "curve" && nextPoints.length < 3) {
                                const start = nextPoints[0];
                                const end = nextPoints[nextPoints.length - 1];
                                nextPoints = [
                                    start,
                                    {
                                        x: Math.round((start.x + end.x) / 2),
                                        y: Math.round(Math.min(start.y, end.y) - 60),
                                    },
                                    end,
                                ];
                            } else if (nextType === "poly" && nextPoints.length < 3) {
                                const start = nextPoints[0];
                                const end = nextPoints[nextPoints.length - 1];
                                nextPoints = [start, { x: Math.round((start.x + end.x) / 2), y: start.y }, end];
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
                    const commitImage = async () => {
                        const nextUrl = imageUrl.value.trim();
                        if (!nextUrl) return;
                        let dimensions = null;
                        if (typeof _getImageSourceDimensions === "function") {
                            try {
                                dimensions = await _getImageSourceDimensions(nextUrl);
                            } catch (_err) {}
                        }
                        onCommit(() => {
                            const updates = { content: nextUrl };
                            if (dimensions?.width && dimensions?.height) {
                                const ratio = dimensions.width / Math.max(1, dimensions.height);
                                updates.imageAspectRatio = ratio;
                                updates.lockAspectRatio = data.lockAspectRatio ?? true;
                                if (data.lockAspectRatio !== false) {
                                    const currentW =
                                        parseFloat(data.width) ||
                                        parseFloat(document.getElementById(data.id)?.style.width) ||
                                        300;
                                    const nextH = currentW / ratio;
                                    updates.height = `${nextH}px`;
                                    updates.heightSetManually = true;
                                    data.height = updates.height;
                                }
                                data.imageAspectRatio = ratio;
                            }
                            updateElementState(data.id, updates);
                            const dom = document.getElementById(data.id);
                            const img = dom?.querySelector("img");
                            if (img) img.src = nextUrl;
                            if (dom && updates.height) dom.style.height = updates.height;
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
                        const ratio = data.cropTransform
                            ? (parseFloat(data.width) || 1) / Math.max(1, parseFloat(data.height) || 1)
                            : typeof getImageAspectRatio === "function"
                              ? getImageAspectRatio(data)
                              : (parseFloat(data.width) || 1) / Math.max(1, parseFloat(data.height) || 1);
                        updateElementState(data.id, { lockAspectRatio: locked, imageAspectRatio: ratio });
                        data.lockAspectRatio = locked;
                        data.imageAspectRatio = ratio;
                    };
                }

                if (imgW && imgH) {
                    const commitDim = isWidth => {
                        onCommit(() => {
                            let newW = parseFloat(imgW.value);
                            let newH = parseFloat(imgH.value);
                            if (isNaN(newW) || newW < 10) newW = 10;
                            if (isNaN(newH) || newH < 10) newH = 10;

                            if (data.lockAspectRatio) {
                                const ratio = data.cropTransform
                                    ? (parseFloat(data.width) || newW) / Math.max(1, parseFloat(data.height) || newH)
                                    : typeof getImageAspectRatio === "function"
                                      ? getImageAspectRatio(data)
                                      : (parseFloat(data.width) || newW) / Math.max(1, parseFloat(data.height) || newH);
                                if (isWidth) {
                                    newH = newW / ratio;
                                    imgH.value = Math.round(newH);
                                } else {
                                    newW = newH * ratio;
                                    imgW.value = Math.round(newW);
                                }
                            }

                            const updates = { width: newW + "px", height: newH + "px", heightSetManually: true };
                            if (data.lockAspectRatio)
                                updates.imageAspectRatio = data.cropTransform
                                    ? newW / Math.max(1, newH)
                                    : typeof getImageAspectRatio === "function"
                                      ? getImageAspectRatio(data)
                                      : newW / Math.max(1, newH);
                            updateElementState(data.id, updates);
                            data.width = newW + "px";
                            data.height = newH + "px";
                            data.heightSetManually = true;
                            if (updates.imageAspectRatio) data.imageAspectRatio = updates.imageAspectRatio;
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
                }
                const fitBtn = document.getElementById("prop-html-fit");
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

            if (data.type === "molecule") {
                const refreshMoleculeDom = updates => {
                    const dom = document.getElementById(data.id);
                    if (!dom) return;
                    const merged = {
                        ...data,
                        ...updates,
                        styles: { ...(data.styles || {}), ...(updates.styles || {}) },
                    };
                    const background =
                        typeof normalizeMoleculeBackgroundColor === "function"
                            ? normalizeMoleculeBackgroundColor(merged.styles.backgroundColor || "#020617")
                            : merged.styles.backgroundColor || "#020617";
                    dom.style.backgroundColor = background;
                    const wrapper = dom.querySelector(".molecule-embed-wrapper");
                    if (wrapper) wrapper.style.backgroundColor = background;
                    dom.classList.toggle("molecule-interactive", Boolean(merged.moleculeInteractive));
                    dom.setAttribute("data-molecule-interactive", merged.moleculeInteractive ? "true" : "false");
                    const shield = dom.querySelector(".molecule-editor-shield");
                    if (shield) shield.hidden = Boolean(merged.moleculeInteractive);
                    const editorToggle = dom.querySelector(".molecule-editor-toggle");
                    if (editorToggle) {
                        const enabled = Boolean(merged.moleculeInteractive);
                        editorToggle.classList.toggle("active", enabled);
                        editorToggle.title = enabled ? "Switch to select and resize mode" : "Enable 3D orbit mode";
                        editorToggle.setAttribute(
                            "aria-label",
                            enabled ? "Switch molecule to select and resize mode" : "Enable molecule 3D orbit mode",
                        );
                        const icon = editorToggle.querySelector("i");
                        if (icon) icon.className = `fa-solid ${enabled ? "fa-cube" : "fa-arrow-pointer"}`;
                        const label = editorToggle.querySelector("span");
                        if (label) label.textContent = enabled ? "Orbit" : "Select";
                    }
                    const iframe = dom.querySelector(".molecule-embed-frame");
                    const rebuildKeys = new Set(["content", "moleculeFormat", "moleculeIsTrajectory"]);
                    const needsRebuild = Object.keys(updates || {}).some(key => rebuildKeys.has(key));
                    if (iframe && needsRebuild && typeof buildMoleculeEmbedSrcdoc === "function") {
                        if (iframe._moleculeDataBridgeCleanup) iframe._moleculeDataBridgeCleanup();
                        if (typeof attachMoleculeDataBridge === "function") attachMoleculeDataBridge(iframe, merged);
                        iframe.srcdoc = buildMoleculeEmbedSrcdoc(merged);
                    } else if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage(
                            {
                                type: "pptmaker:molecule:update",
                                name: merged.moleculeName || "Molecule",
                                backgroundColor: background,
                                autoRotate: Boolean(merged.moleculeAutoRotate),
                                projection:
                                    merged.moleculeProjection === "orthographic" ? "orthographic" : "perspective",
                                defaultStyle: ["cartoon", "stick", "sphere", "line", "surface"].includes(
                                    merged.moleculeDefaultStyle,
                                )
                                    ? merged.moleculeDefaultStyle
                                    : "cartoon",
                                defaultColor: ["default", "chain", "amino", "ssJmol", "spectrum", "custom"].includes(
                                    merged.moleculeDefaultColor,
                                )
                                    ? merged.moleculeDefaultColor
                                    : "spectrum",
                                layers: Array.isArray(merged.moleculeRepresentationLayers)
                                    ? merged.moleculeRepresentationLayers
                                          .map(layer =>
                                              typeof normalizeMoleculeRepresentationLayer === "function"
                                                  ? normalizeMoleculeRepresentationLayer(layer)
                                                  : layer,
                                          )
                                          .slice(0, 12)
                                    : [],
                            },
                            "*",
                        );
                    }
                };
                const normalizedLayers = () =>
                    (Array.isArray(data.moleculeRepresentationLayers) ? data.moleculeRepresentationLayers : [])
                        .map(layer =>
                            typeof normalizeMoleculeRepresentationLayer === "function"
                                ? normalizeMoleculeRepresentationLayer(layer)
                                : layer,
                        )
                        .slice(0, 12);

                const nameInput = document.getElementById("prop-molecule-name");
                if (nameInput) {
                    const commitName = () => {
                        onCommit(() => {
                            const next = nameInput.value.trim() || "Molecule";
                            data.moleculeName = next;
                            updateElementState(data.id, { moleculeName: next });
                            refreshMoleculeDom({ moleculeName: next });
                        });
                    };
                    nameInput.onchange = commitName;
                    nameInput.onblur = commitName;
                }

                const bgInput = document.getElementById("prop-molecule-bg");
                const bgTransparent = document.getElementById("prop-molecule-bg-transparent");
                const applyMoleculeBackground = (next, commit = false) => {
                    const normalized =
                        typeof normalizeMoleculeBackgroundColor === "function"
                            ? normalizeMoleculeBackgroundColor(next)
                            : next;
                    data.styles = { ...(data.styles || {}), backgroundColor: normalized };
                    if (commit) {
                        onCommit(() => updateElementState(data.id, { styles: { backgroundColor: normalized } }));
                    } else {
                        updateElementState(data.id, { styles: { backgroundColor: normalized } });
                    }
                    refreshMoleculeDom({ styles: { backgroundColor: normalized } });
                };
                if (bgInput) {
                    bgInput.oninput = event => applyMoleculeBackground(event.target.value);
                    bgInput.onchange = event => applyMoleculeBackground(event.target.value, true);
                }
                if (bgTransparent) {
                    bgTransparent.onchange = event => {
                        const transparent = event.target.checked;
                        if (bgInput) bgInput.disabled = transparent;
                        applyMoleculeBackground(transparent ? "transparent" : bgInput?.value || "#020617", true);
                    };
                }

                const toggleBtn = document.getElementById("prop-molecule-toggle");
                if (toggleBtn) {
                    toggleBtn.onclick = () => {
                        onCommit(() => {
                            const next = !data.moleculeInteractive;
                            data.moleculeInteractive = next;
                            updateElementState(data.id, { moleculeInteractive: next });
                            refreshMoleculeDom({ moleculeInteractive: next });
                            buildPropertiesPanel();
                        });
                    };
                }

                const styleField = document.getElementById("prop-molecule-style");
                if (styleField) {
                    styleField.onchange = e => {
                        onCommit(() => {
                            const next = ["cartoon", "stick", "sphere", "line", "surface"].includes(e.target.value)
                                ? e.target.value
                                : "cartoon";
                            data.moleculeDefaultStyle = next;
                            updateElementState(data.id, { moleculeDefaultStyle: next });
                            refreshMoleculeDom({ moleculeDefaultStyle: next });
                        });
                    };
                }

                const colorField = document.getElementById("prop-molecule-color");
                if (colorField) {
                    colorField.onchange = e => {
                        onCommit(() => {
                            const next = ["default", "chain", "amino", "ssJmol", "spectrum"].includes(e.target.value)
                                ? e.target.value
                                : "spectrum";
                            data.moleculeDefaultColor = next;
                            updateElementState(data.id, { moleculeDefaultColor: next });
                            refreshMoleculeDom({ moleculeDefaultColor: next });
                        });
                    };
                }

                const rotateBtn = document.getElementById("prop-molecule-rotate");
                if (rotateBtn) {
                    rotateBtn.onclick = () => {
                        onCommit(() => {
                            const next = !data.moleculeAutoRotate;
                            data.moleculeAutoRotate = next;
                            updateElementState(data.id, { moleculeAutoRotate: next });
                            refreshMoleculeDom({ moleculeAutoRotate: next });
                            buildPropertiesPanel();
                        });
                    };
                }

                const projectionBtn = document.getElementById("prop-molecule-projection");
                if (projectionBtn) {
                    projectionBtn.onclick = () => {
                        onCommit(() => {
                            const next = data.moleculeProjection === "orthographic" ? "perspective" : "orthographic";
                            data.moleculeProjection = next;
                            updateElementState(data.id, { moleculeProjection: next });
                            refreshMoleculeDom({ moleculeProjection: next });
                            buildPropertiesPanel();
                        });
                    };
                }

                const layerColorField = document.getElementById("prop-molecule-layer-color");
                const layerCustomField = document.getElementById("prop-molecule-layer-custom");
                const layerStyleField = document.getElementById("prop-molecule-layer-style");
                const layerSelectionField = document.getElementById("prop-molecule-layer-selection");
                const layerRadiusField = document.getElementById("prop-molecule-layer-radius");
                const layerOpacityField = document.getElementById("prop-molecule-layer-opacity");
                const layerEditIdField = document.getElementById("prop-molecule-layer-edit-id");
                const cancelLayerEditBtn = document.getElementById("prop-molecule-cancel-layer-edit");
                const layerSizeLabel = layerRadiusField?.closest("label")?.firstChild;
                if (layerColorField && layerCustomField) {
                    const syncCustomVisibility = () => {
                        layerCustomField.classList.toggle("hidden", layerColorField.value !== "custom");
                    };
                    layerColorField.onchange = syncCustomVisibility;
                    syncCustomVisibility();
                }
                const layerDefaults = {
                    cartoon: { radius: 1, opacity: 1, sizeLabel: "Radius" },
                    stick: { radius: 0.18, opacity: 1, sizeLabel: "Stick Width" },
                    sphere: { radius: 0.35, opacity: 1, sizeLabel: "Sphere Radius" },
                    line: { radius: 2, opacity: 1, sizeLabel: "Line Width" },
                    surface: { radius: 0, opacity: 0.68, sizeLabel: "Size" },
                    hidden: { radius: 0, opacity: 1, sizeLabel: "Size" },
                };
                const syncLayerParameterControls = ({ resetValues = false } = {}) => {
                    const kind = layerStyleField?.value || "cartoon";
                    const defaults = layerDefaults[kind] || layerDefaults.cartoon;
                    if (layerSizeLabel) layerSizeLabel.textContent = defaults.sizeLabel;
                    if (layerRadiusField) {
                        layerRadiusField.disabled = kind === "surface" || kind === "hidden";
                        layerRadiusField.classList.toggle("opacity-50", layerRadiusField.disabled);
                        if (resetValues) layerRadiusField.value = String(defaults.radius);
                    }
                    if (layerOpacityField) {
                        layerOpacityField.disabled = kind !== "surface";
                        layerOpacityField.classList.toggle("opacity-50", layerOpacityField.disabled);
                        if (resetValues) layerOpacityField.value = String(defaults.opacity);
                    }
                };
                const resetLayerForm = () => {
                    if (layerEditIdField) layerEditIdField.value = "";
                    if (layerSelectionField) layerSelectionField.value = "all";
                    if (layerStyleField) layerStyleField.value = "cartoon";
                    if (layerColorField) layerColorField.value = "spectrum";
                    if (layerCustomField) layerCustomField.value = "#6366f1";
                    if (addLayerBtn) addLayerBtn.textContent = "Add Layer";
                    if (cancelLayerEditBtn) cancelLayerEditBtn.classList.add("hidden");
                    if (layerColorField && layerCustomField) layerCustomField.classList.add("hidden");
                    syncLayerParameterControls({ resetValues: true });
                };
                const populateLayerForm = layer => {
                    const normalized =
                        typeof normalizeMoleculeRepresentationLayer === "function"
                            ? normalizeMoleculeRepresentationLayer(layer)
                            : layer;
                    if (layerEditIdField) layerEditIdField.value = normalized.id || "";
                    if (layerSelectionField) layerSelectionField.value = normalized.selectionQuery || "all";
                    if (layerStyleField) layerStyleField.value = normalized.kind || "cartoon";
                    if (layerColorField) layerColorField.value = normalized.colorScheme || "spectrum";
                    if (layerCustomField) {
                        layerCustomField.value = normalized.customColor || "#6366f1";
                        layerCustomField.classList.toggle(
                            "hidden",
                            (normalized.colorScheme || "spectrum") !== "custom",
                        );
                    }
                    syncLayerParameterControls({ resetValues: true });
                    if (layerRadiusField && normalized.radius != null)
                        layerRadiusField.value = String(normalized.radius);
                    if (layerOpacityField && normalized.opacity != null)
                        layerOpacityField.value = String(normalized.opacity);
                    if (addLayerBtn) addLayerBtn.textContent = "Update Layer";
                    if (cancelLayerEditBtn) cancelLayerEditBtn.classList.remove("hidden");
                };
                if (layerStyleField) {
                    layerStyleField.onchange = () => syncLayerParameterControls({ resetValues: true });
                    syncLayerParameterControls({ resetValues: true });
                }
                if (cancelLayerEditBtn) cancelLayerEditBtn.onclick = resetLayerForm;

                const addLayerBtn = document.getElementById("prop-molecule-add-layer");
                if (addLayerBtn) {
                    addLayerBtn.onclick = () => {
                        onCommit(() => {
                            const selectionQuery = layerSelectionField?.value?.trim() || "all";
                            const kind = layerStyleField?.value || "cartoon";
                            const colorScheme = layerColorField?.value || "spectrum";
                            const customColor = layerCustomField?.value || "#6366f1";
                            const editingId = layerEditIdField?.value || "";
                            const radius = Number(layerRadiusField?.value);
                            const opacity = Number(layerOpacityField?.value);
                            const rawLayer = {
                                ...(editingId ? { id: editingId } : {}),
                                selectionQuery,
                                kind,
                                colorScheme,
                                customColor,
                                ...(Number.isFinite(radius) && !["surface", "hidden"].includes(kind) ? { radius } : {}),
                                ...(Number.isFinite(opacity) && kind === "surface" ? { opacity } : {}),
                            };
                            const layer =
                                typeof normalizeMoleculeRepresentationLayer === "function"
                                    ? normalizeMoleculeRepresentationLayer(rawLayer)
                                    : {
                                          ...rawLayer,
                                          id: generateId("mol_layer"),
                                          label: `${kind} · ${selectionQuery}`,
                                      };
                            const existingLayers = normalizedLayers();
                            const nextLayers = editingId
                                ? existingLayers.map(item => (String(item.id) === String(editingId) ? layer : item))
                                : [...existingLayers, layer].slice(0, 12);
                            data.moleculeRepresentationLayers = nextLayers;
                            updateElementState(data.id, { moleculeRepresentationLayers: nextLayers });
                            refreshMoleculeDom({ moleculeRepresentationLayers: nextLayers });
                            buildPropertiesPanel();
                        });
                    };
                }

                document.querySelectorAll(".prop-molecule-edit-layer").forEach(btn => {
                    btn.onclick = () => {
                        const layerId = btn.dataset.layerId;
                        const layer = normalizedLayers().find(item => String(item.id) === String(layerId));
                        if (layer) populateLayerForm(layer);
                    };
                });

                document.querySelectorAll(".prop-molecule-remove-layer").forEach(btn => {
                    btn.onclick = () => {
                        onCommit(() => {
                            const layerId = btn.dataset.layerId;
                            const nextLayers = normalizedLayers().filter(layer => String(layer.id) !== String(layerId));
                            data.moleculeRepresentationLayers = nextLayers;
                            updateElementState(data.id, { moleculeRepresentationLayers: nextLayers });
                            refreshMoleculeDom({ moleculeRepresentationLayers: nextLayers });
                            buildPropertiesPanel();
                        });
                    };
                });

                const clearLayersBtn = document.getElementById("prop-molecule-clear-layers");
                if (clearLayersBtn) {
                    clearLayersBtn.onclick = () => {
                        onCommit(() => {
                            data.moleculeRepresentationLayers = [];
                            updateElementState(data.id, { moleculeRepresentationLayers: [] });
                            refreshMoleculeDom({ moleculeRepresentationLayers: [] });
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

            if (data.type === "sketch") {
                const colorPicker = document.getElementById("prop-sketch-color");
                if (colorPicker) {
                    colorPicker.oninput = e => {
                        saveStateToUndo();
                        updateElementState(data.id, { sketchStrokeColor: e.target.value });
                        data.sketchStrokeColor = e.target.value;
                    };
                }

                const widthSelect = document.getElementById("prop-sketch-width");
                if (widthSelect) {
                    widthSelect.onchange = e => {
                        saveStateToUndo();
                        updateElementState(data.id, { sketchStrokeWidth: Number(e.target.value) });
                        data.sketchStrokeWidth = Number(e.target.value);
                    };
                }

                const clearBtn = document.getElementById("prop-sketch-clear");
                if (clearBtn) {
                    clearBtn.onclick = () => {
                        saveStateToUndo();
                        updateElementState(data.id, { strokes: [] });
                        data.strokes = [];
                        if (window.renderSlidesFromState) window.renderSlidesFromState();
                    };
                }

                const activateBtn = document.getElementById("prop-sketch-activate");
                if (activateBtn) {
                    activateBtn.onclick = () => {
                        if (typeof initSketchMode === "function") {
                            initSketchMode(data.id);
                        }
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
                document
                    .getElementById("prop-pdf-mode-highlight")
                    ?.addEventListener("click", () => setPdfMode("highlight"));
                document.getElementById("prop-pdf-mode-note")?.addEventListener("click", () => setPdfMode("note"));

                const deleteBtn = document.getElementById("prop-pdf-delete-annotation");
                if (deleteBtn) {
                    deleteBtn.onclick = () => {
                        onCommit(() => {
                            const nextAnnotations = (data.pdfAnnotations || []).filter(
                                item => item.id !== data.pdfSelectedAnnotationId,
                            );
                            updateElementState(data.id, {
                                pdfAnnotations: nextAnnotations,
                                pdfSelectedAnnotationId: "",
                            });
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

            if (typeof bindAnimationPanelListeners === "function") {
                bindAnimationPanelListeners(data);
            }

            if (data.type === "video") {
                const videoUrl = document.getElementById("prop-video-url");
                if (videoUrl) {
                    const commitVideo = () => {
                        const nextUrl = videoUrl.value.trim();
                        if (!nextUrl) return;

                        // Check if it looks like an absolute local filesystem path on the host computer
                        if (nextUrl.startsWith("/") || /^[A-Za-z]:\\/.test(nextUrl)) {
                            if (typeof setProjectSaveHint === "function") {
                                setProjectSaveHint("Importing local file from server filesystem...", "warn");
                            }

                            const formData = new FormData();
                            formData.append("local_path", nextUrl);
                            if (typeof currentPresentationId !== "undefined" && currentPresentationId) {
                                formData.append("presentationId", currentPresentationId);
                            }

                            const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
                            const headers = {};
                            if (csrfToken) {
                                headers["X-CSRFToken"] = csrfToken;
                            }

                            fetch("/api/assets/upload/", {
                                method: "POST",
                                body: formData,
                                headers: headers,
                            })
                                .then(response => {
                                    if (!response.ok) {
                                        return response.json().then(json => {
                                            throw new Error(json.error || `Failed with status ${response.status}`);
                                        });
                                    }
                                    return response.json();
                                })
                                .then(dataResponse => {
                                    onCommit(() => {
                                        updateElementState(data.id, {
                                            content: dataResponse.url,
                                            videoType: "local",
                                            localMimeType: dataResponse.contentType || "video/mp4",
                                        });
                                        if (window.renderSlidesFromState) window.renderSlidesFromState();
                                        buildPropertiesPanel();
                                        if (typeof setProjectSaveHint === "function") {
                                            setProjectSaveHint("Local file imported successfully", "success");
                                        }
                                    });
                                })
                                .catch(err => {
                                    console.error("Local file import failed:", err);
                                    if (typeof setProjectSaveHint === "function") {
                                        setProjectSaveHint(`Import failed: ${err.message}`, "danger");
                                    }
                                });

                            return;
                        }

                        onCommit(() => {
                            updateElementState(data.id, {
                                content: nextUrl,
                                videoType:
                                    typeof _inferVideoType === "function" ? _inferVideoType(nextUrl) : data.videoType,
                            });
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

                // Smooth instant toggles instead of hard re-render!
                [
                    ["mute", "muted", "prop-video-mute-icon", "fa-volume-xmark text-rose-400", "fa-volume-high"],
                    ["autoplay", "autoplay"],
                    ["loop", "loop"],
                ].forEach(([inputKey, stateKey, iconId, checkedClass, uncheckedClass]) => {
                    const chk = document.getElementById(`prop-video-${inputKey}`);
                    if (chk) {
                        chk.onchange = () => {
                            const nextVal = chk.checked;

                            // 1. Dynamic UI icon update
                            if (iconId) {
                                const iconEl = document.getElementById(iconId);
                                if (iconEl) {
                                    iconEl.className = `fa-solid ${nextVal ? checkedClass : uncheckedClass} text-xs`;
                                }
                            }

                            // 2. Direct Canvas update for seamless playback!
                            const canvasVideo = document.querySelector(`#${data.id} video`);
                            if (canvasVideo) {
                                if (stateKey === "muted") canvasVideo.muted = nextVal;
                                if (stateKey === "loop") canvasVideo.loop = nextVal;
                                if (stateKey === "autoplay") canvasVideo.autoplay = nextVal;
                            }

                            // 3. Update persistent state
                            updateElementState(data.id, { [stateKey]: nextVal });

                            // 4. Update the live controllers if mute button is clicked
                            if (stateKey === "muted") {
                                const liveMuteBtn = document.getElementById("player-btn-mute");
                                if (liveMuteBtn) {
                                    liveMuteBtn.innerHTML = nextVal
                                        ? '<i class="fa-solid fa-volume-xmark text-xs text-rose-400"></i>'
                                        : '<i class="fa-solid fa-volume-high text-xs"></i>';
                                }
                                const liveVolScrub = document.getElementById("player-volume-scrub");
                                if (liveVolScrub) {
                                    liveVolScrub.value = nextVal ? 0 : 100;
                                }
                            }

                            if (window.refreshPreviews) window.refreshPreviews();
                        };
                    }
                });

                // --- LIVE CONTROLLER BINDINGS ---
                const canvasVideo = document.querySelector(`#${data.id} video`);
                const playBtn = document.getElementById("player-btn-play");
                const muteBtn = document.getElementById("player-btn-mute");
                const timeDisplay = document.getElementById("player-time-display");
                const timelineScrub = document.getElementById("player-timeline-scrub");
                const volumeScrub = document.getElementById("player-volume-scrub");
                const rewindBtn = document.getElementById("player-btn-rewind");
                const forwardBtn = document.getElementById("player-btn-forward");

                if (canvasVideo) {
                    // Set initial volume/muted states
                    if (volumeScrub) volumeScrub.value = canvasVideo.muted ? 0 : Math.round(canvasVideo.volume * 100);
                    if (muteBtn) {
                        muteBtn.innerHTML = canvasVideo.muted
                            ? '<i class="fa-solid fa-volume-xmark text-xs text-rose-400"></i>'
                            : '<i class="fa-solid fa-volume-high text-xs"></i>';
                    }

                    // Play/Pause Action
                    if (playBtn) {
                        playBtn.onclick = () => {
                            if (canvasVideo.paused) {
                                canvasVideo.play().catch(e => console.log("Play interrupted or blocked:", e));
                            } else {
                                canvasVideo.pause();
                            }
                        };
                    }

                    // Rewind / Forward Actions
                    if (rewindBtn) {
                        rewindBtn.onclick = () => {
                            canvasVideo.currentTime = Math.max(0, canvasVideo.currentTime - 5);
                        };
                    }
                    if (forwardBtn) {
                        forwardBtn.onclick = () => {
                            canvasVideo.currentTime = Math.min(canvasVideo.duration || 0, canvasVideo.currentTime + 5);
                        };
                    }

                    // Timeline scrubbing
                    if (timelineScrub) {
                        timelineScrub.oninput = () => {
                            const pct = parseFloat(timelineScrub.value) / 100;
                            canvasVideo.currentTime = pct * (canvasVideo.duration || 0);
                        };
                    }

                    // Volume scrubbing
                    if (volumeScrub) {
                        volumeScrub.oninput = () => {
                            const vol = parseFloat(volumeScrub.value) / 100;
                            canvasVideo.volume = vol;
                            canvasVideo.muted = vol === 0;

                            // Sync state
                            updateElementState(data.id, { muted: canvasVideo.muted });
                            const muteChk = document.getElementById("prop-video-mute");
                            if (muteChk) muteChk.checked = canvasVideo.muted;

                            const muteIcon = document.getElementById("prop-video-mute-icon");
                            if (muteIcon) {
                                muteIcon.className = `fa-solid ${canvasVideo.muted ? "fa-volume-xmark text-rose-400" : "fa-volume-high"} text-xs`;
                            }

                            if (muteBtn) {
                                muteBtn.innerHTML = canvasVideo.muted
                                    ? '<i class="fa-solid fa-volume-xmark text-xs text-rose-400"></i>'
                                    : '<i class="fa-solid fa-volume-high text-xs"></i>';
                            }
                        };
                    }

                    // Mute Quick toggle
                    if (muteBtn) {
                        muteBtn.onclick = () => {
                            const nextMuted = !canvasVideo.muted;
                            canvasVideo.muted = nextMuted;
                            if (volumeScrub) volumeScrub.value = nextMuted ? 0 : Math.round(canvasVideo.volume * 100);

                            // Sync state
                            updateElementState(data.id, { muted: nextMuted });
                            const muteChk = document.getElementById("prop-video-mute");
                            if (muteChk) muteChk.checked = nextMuted;

                            const muteIcon = document.getElementById("prop-video-mute-icon");
                            if (muteIcon) {
                                muteIcon.className = `fa-solid ${nextMuted ? "fa-volume-xmark text-rose-400" : "fa-volume-high"} text-xs`;
                            }

                            muteBtn.innerHTML = nextMuted
                                ? '<i class="fa-solid fa-volume-xmark text-xs text-rose-400"></i>'
                                : '<i class="fa-solid fa-volume-high text-xs"></i>';
                        };
                    }

                    // ─── Real-time update loop ───
                    const formatTime = secs => {
                        if (!Number.isFinite(secs) || isNaN(secs)) return "0:00";
                        const m = Math.floor(secs / 60);
                        const s = Math.floor(secs % 60);
                        return `${m}:${s < 10 ? "0" : ""}${s}`;
                    };

                    const updatePlayerDashboard = () => {
                        // Check if elements are still in DOM
                        if (!document.getElementById("video-live-player")) return;

                        // Sync Play/Pause button style
                        if (playBtn) {
                            playBtn.innerHTML = canvasVideo.paused
                                ? '<i class="fa-solid fa-play text-[10px]"></i>'
                                : '<i class="fa-solid fa-pause text-[10px]"></i>';
                            playBtn.classList.toggle("bg-emerald-600/20", !canvasVideo.paused);
                            playBtn.classList.toggle("text-emerald-400", !canvasVideo.paused);
                            playBtn.classList.toggle("border-emerald-500/20", !canvasVideo.paused);
                            playBtn.classList.toggle("bg-indigo-600/20", canvasVideo.paused);
                            playBtn.classList.toggle("text-indigo-400", canvasVideo.paused);
                            playBtn.classList.toggle("border-indigo-500/20", canvasVideo.paused);
                        }

                        // Sync Time display
                        if (timeDisplay) {
                            timeDisplay.innerText = `${formatTime(canvasVideo.currentTime)} / ${formatTime(canvasVideo.duration)}`;
                        }

                        // Sync scrubber progress
                        if (timelineScrub && document.activeElement !== timelineScrub) {
                            const progress = canvasVideo.duration
                                ? (canvasVideo.currentTime / canvasVideo.duration) * 100
                                : 0;
                            timelineScrub.value = progress;
                        }

                        requestAnimationFrame(updatePlayerDashboard);
                    };

                    // Start loop
                    requestAnimationFrame(updatePlayerDashboard);
                }
            }
        }
    }, 0);

    restorePropertiesScroll();
    requestAnimationFrame(updateFloatingToolbars);
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

function applyTextAlignmentToSelection(align) {
    const allowed = new Set(["left", "center", "right", "justify"]);
    if (!allowed.has(align) || state.selectedIds.length === 0) return;

    const slide = state.slides[currentSlideIndex];
    if (!slide) return;

    const textElements = state.selectedIds
        .map(id => slide.elements.find(e => e.id === id))
        .filter(e => e?.type === "text" && !e.locked);
    if (!textElements.length) return;

    saveStateToUndo();
    textElements.forEach(data => {
        updateElementStyleState(data.id, { textAlign: align });
        markTextElementStyleAsLocal(data, "textAlign");

        const dom = document.getElementById(data.id);
        if (!dom) return;

        _setElementDomStyleProperty(dom, "textAlign", align, "important");
        const contentHost = dom.querySelector(".text-element-content");
        if (contentHost) {
            _setElementDomStyleProperty(contentHost, "textAlign", align, "important");
        }

        const layout = syncTextBoxLayout(dom, data);
        if (layout?.autoHeight && Number.isFinite(layout.height)) {
            updateElementState(data.id, { height: `${layout.height}px` });
            data.height = `${layout.height}px`;
        }
    });

    if (window.refreshPreviews) window.refreshPreviews();
    updateGroupBound();
    schedulePresentationAutosave?.(150);
    buildPropertiesPanel();
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
                nextContent = stripInlineTextStylesFromTextContent(parseStructuredBulletEditorHtml(contentHost), [
                    prop,
                ]);
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
        const textProps = [
            "color",
            "fontSize",
            "fontFamily",
            "fontWeight",
            "fontStyle",
            "textAlign",
            "lineHeight",
            "textShadow",
        ];
        const priority = textProps.includes(prop) ? "important" : "";

        _setElementDomStyleProperty(dom, prop, value, priority);

        if (data.type === "text") {
            if (contentHost) {
                _setElementDomStyleProperty(contentHost, prop, value, priority);
                if (
                    ["color", "fontSize", "fontFamily", "fontWeight", "fontStyle"].includes(prop) &&
                    contentHost.dataset.structuredEdit !== "true" &&
                    !contentHost.isContentEditable
                ) {
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
    const fontControls = [document.getElementById("prop-font"), document.getElementById("floating-text-font")].filter(
        Boolean,
    );
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
        setTextControlActive(
            fontSelect,
            normalizeFontFamily(fontSelect.value) !== normalizeFontFamily(defaults.fontFamily),
        );
    });

    // Update Font Size
    const sizeControls = [document.getElementById("prop-fs"), document.getElementById("floating-text-size")].filter(
        Boolean,
    );
    sizeControls.forEach(fsInput => {
        if (!inline.fontSize) return;
        if (!isControlBeingEdited(fsInput)) {
            fsInput.value = parseInt(inline.fontSize) || 32;
            fsInput.dataset.lastCommittedValue = _normalizePx(fsInput.value, "32px");
        }
        setTextControlActive(fsInput, _normalizePx(fsInput.value, "32px") !== defaults.fontSize);
    });

    // Update Color
    const colorControls = [document.getElementById("prop-tc"), document.getElementById("floating-text-color")].filter(
        Boolean,
    );
    colorControls.forEach(colorInput => {
        if (!inline.color) return;
        // Convert rgb(r, g, b) to #rrggbb
        let color = inline.color;
        if (color.startsWith("rgb")) {
            const match = color.match(/\d+/g);
            if (match) {
                color =
                    "#" +
                    match
                        .slice(0, 3)
                        .map(x => parseInt(x).toString(16).padStart(2, "0"))
                        .join("");
            }
        }
        colorInput.value = color;
        setTextControlActive(
            colorInput,
            color.toLowerCase() !== _normalizeColorForInput(defaults.color, "#000000").toLowerCase(),
        );
    });

    // Update Bold/Italic states
    [document.getElementById("prop-bold"), document.getElementById("floating-text-bold")]
        .filter(Boolean)
        .forEach(boldBtn => {
            boldBtn.classList.toggle("active", inline.fontWeight === "bold");
        });
    [document.getElementById("prop-italic"), document.getElementById("floating-text-italic")]
        .filter(Boolean)
        .forEach(italicBtn => {
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

// ─── Layer Management ───────────────────────────────────────────────────────

function renderLayersList() {
    const container = document.getElementById("layers-list");
    if (!container) return;

    const slide = state.slides[currentSlideIndex];
    if (!slide || !slide.elements) {
        container.innerHTML = '<div class="text-xs text-slate-400 p-2 text-center">No elements on this slide</div>';
        return;
    }

    // Sort elements by z-index descending (top layers first)
    const sortedElements = [...slide.elements].sort((a, b) => {
        const zA = a.styles?.zIndex || 0;
        const zB = b.styles?.zIndex || 0;
        return zB - zA;
    });

    if (sortedElements.length === 0) {
        container.innerHTML = '<div class="text-xs text-slate-400 p-2 text-center">No elements on this slide</div>';
        return;
    }

    container.innerHTML = sortedElements
        .map(el => {
            const isSelected = state.selectedIds.includes(el.id);
            const icon = getElementIcon(el.type);
            const name = getElementDisplayName(el);
            const hiddenClass = el.hidden ? "opacity-55 cursor-default" : "cursor-pointer";
            const hiddenAttrs = el.hidden
                ? 'aria-disabled="true" title="Hidden layer. Use the eye button to show it before selecting."'
                : "";
            return `
            <div class="layer-list-item flex items-center gap-2 p-2 rounded-lg transition-colors border ${hiddenClass} ${isSelected ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-transparent text-slate-700 hover:bg-slate-50"}"
                 ${hiddenAttrs}
                 onclick="layerItemClicked('${el.id}', event)">
                <i class="${icon} w-4 text-center ${isSelected ? "text-primary" : "text-slate-400"}"></i>
                <span class="text-[11px] font-medium truncate flex-1">${name}</span>
                <button class="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors" onclick="toggleLayerVisibility('${el.id}', event)" title="Toggle Visibility">
                    <i class="fa-regular ${el.hidden ? "fa-eye-slash text-slate-300" : "fa-eye"} text-[10px]"></i>
                </button>
            </div>
        `;
        })
        .join("");
}

function layerItemClicked(id, event) {
    const slide = state.slides[currentSlideIndex];
    const el = slide?.elements?.find(item => item.id === id);
    if (!el || el.hidden) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        return;
    }

    if (event.shiftKey) {
        const newIds = [...state.selectedIds];
        if (newIds.includes(id)) {
            newIds.splice(newIds.indexOf(id), 1);
        } else {
            newIds.push(id);
        }
        setSelectedIds(newIds);
    } else {
        setSelectedIds([id]);
    }
    buildPropertiesPanel();
    updateGroupBound();
    renderLayersList();
}

function getElementIcon(type) {
    switch (type) {
        case "text":
            return "fa-solid fa-t";
        case "image":
            return "fa-regular fa-image";
        case "shape":
            return "fa-regular fa-square";
        case "video":
            return "fa-solid fa-video";
        case "connector":
            return "fa-solid fa-arrow-right-long";
        case "table":
            return "fa-solid fa-table";
        case "chart":
            return "fa-solid fa-chart-pie";
        case "molecule":
            return "fa-solid fa-dna";
        case "pdf":
            return "fa-regular fa-file-pdf";
        case "whiteboard":
            return "fa-solid fa-chalkboard";
        case "sketch":
            return "fa-solid fa-pen-nib";
        default:
            return "fa-solid fa-cube";
    }
}

function getElementDisplayName(el) {
    if (el.type === "text") {
        let text = String(el.content || "")
            .replace(/<[^>]+>/g, "")
            .trim();
        if (!text) return "Text Box";
        return text.length > 20 ? text.substring(0, 20) + "..." : text;
    }
    if (el.type === "image") return "Image";
    if (el.type === "shape") {
        const shapeType = el.shapeType || "Rectangle";
        return shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
    }
    if (el.type === "connector") return "Connector";
    if (el.type === "whiteboard") return "Whiteboard";
    if (el.type === "sketch") return "Sketch";
    if (el.type === "video") return "Video";
    if (el.type === "table") return "Table";
    if (el.type === "molecule") return "Molecule";
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

function toggleLayerVisibility(id, event) {
    event.stopPropagation();
    const slide = state.slides[currentSlideIndex];
    if (!slide) return;
    const el = slide.elements.find(e => e.id === id);
    if (!el) return;

    saveStateToUndo();
    el.hidden = !el.hidden;

    if (el.hidden && state.selectedIds.includes(id)) {
        setSelectedIds(state.selectedIds.filter(selectedId => selectedId !== id));
        buildPropertiesPanel();
        updateGroupBound();
    }

    const dom = document.getElementById(id);
    if (dom) {
        dom.style.opacity = el.hidden ? "0" : "1";
        dom.style.pointerEvents = el.hidden ? "none" : "auto";
    }

    renderLayersList();
}

function moveSelectedLayer(direction) {
    if (state.selectedIds.length !== 1) return;
    const id = state.selectedIds[0];

    const slide = state.slides[currentSlideIndex];
    if (!slide) return;

    saveStateToUndo();

    // Sort all elements by current Z index
    slide.elements.sort((a, b) => (a.styles?.zIndex || 0) - (b.styles?.zIndex || 0));

    const currentIndex = slide.elements.findIndex(e => e.id === id);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex < slide.elements.length - 1) {
        // Swap with the element immediately above it
        const tempZ = slide.elements[currentIndex].styles.zIndex;
        slide.elements[currentIndex].styles.zIndex = slide.elements[currentIndex + 1].styles.zIndex;
        slide.elements[currentIndex + 1].styles.zIndex = tempZ;
    } else if (direction === "down" && currentIndex > 0) {
        // Swap with the element immediately below it
        const tempZ = slide.elements[currentIndex].styles.zIndex;
        slide.elements[currentIndex].styles.zIndex = slide.elements[currentIndex - 1].styles.zIndex;
        slide.elements[currentIndex - 1].styles.zIndex = tempZ;
    }

    renderSlidesFromState();
    renderLayersList();
}

window.renderLayersList = renderLayersList;
window.layerItemClicked = layerItemClicked;
window.toggleLayerVisibility = toggleLayerVisibility;
window.moveSelectedLayer = moveSelectedLayer;
window.buildPropertiesPanel = buildPropertiesPanel;
window.selectElement = selectElement;
