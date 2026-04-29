function buildTextPanel(panel, data) {
            const listState = getTextListState(data.content, data.bulletStyle);
            const grp = createGroup("Typography");
            grp.appendChild(
                createField(
                    "Font Family",
                    `
                <select id="prop-font" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-accent w-full shadow-sm">
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
            const styleWrap = document.createElement("div");
            styleWrap.className = "flex gap-2";
            styleWrap.innerHTML = `
                <button id="prop-bold" class="flex-1 py-1.5 rounded-lg bg-white border shadow-sm transition-colors ${data.styles.fontWeight === "bold" ? "border-accent text-accent bg-blue-50/50" : "border-slate-300 text-slate-600 hover:bg-slate-50"}">B</button>
                <button id="prop-italic" class="flex-1 py-1.5 rounded-lg bg-white border shadow-sm transition-colors font-serif italic ${data.styles.fontStyle === "italic" ? "border-accent text-accent bg-blue-50/50" : "border-slate-300 text-slate-600 hover:bg-slate-50"}">I</button>
                <button id="prop-sub" class="flex-1 py-1.5 rounded-lg bg-white border shadow-sm transition-colors font-serif border-slate-300 text-slate-600 hover:bg-slate-50" title="Subscript">X₂</button>
                <button id="prop-sup" class="flex-1 py-1.5 rounded-lg bg-white border shadow-sm transition-colors font-serif border-slate-300 text-slate-600 hover:bg-slate-50" title="Superscript">X²</button>
            `;
            grp.appendChild(styleWrap);
            grp.appendChild(
                createField(
                    "Font Size",
                    `<input type="text" id="prop-fs" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent" value="${data.styles.fontSize || "32px"}">`,
                ),
            );
            grp.appendChild(
                createField(
                    "Color",
                    `<input type="color" id="prop-tc" class="w-full h-8 rounded border border-slate-300 cursor-pointer" value="${_normalizeColorForInput(data.styles.color, "#ffffff")}">`,
                ),
            );
            grp.appendChild(
                createField(
                    "Alignment",
                    `
                <select id="prop-text-align" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                    <option value="left" ${(data.styles.textAlign || "left") === "left" ? "selected" : ""}>Left</option>
                    <option value="center" ${data.styles.textAlign === "center" ? "selected" : ""}>Center</option>
                    <option value="right" ${data.styles.textAlign === "right" ? "selected" : ""}>Right</option>
                    <option value="justify" ${data.styles.textAlign === "justify" ? "selected" : ""}>Justify</option>
                </select>
            `,
                ),
            );
            grp.appendChild(
                createField(
                    "List Type",
                    `
                <select id="prop-list-kind" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent">
                    <option value="none" ${listState.kind === "none" ? "selected" : ""}>No List</option>
                    <option value="bulleted" ${listState.kind === "bulleted" ? "selected" : ""}>Bulleted</option>
                </select>
            `,
                ),
            );
            grp.appendChild(
                createField(
                    "Bullet Style",
                    `
                <select id="prop-list-style" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:border-accent" ${listState.kind === "none" ? "disabled" : ""}>
                    ${
                        Object.keys(BULLET_STYLE_THEMES)
                            .map(
                                option =>
                                    `<option value="${option}" ${option === listState.style ? "selected" : ""}>${option}</option>`,
                            )
                            .join("")
                    }
                </select>
            `,
                ),
            );
            grp.appendChild(
                createField(
                    "Levels",
                    `
                <div class="flex gap-2">
                    <button id="prop-list-indent" class="flex-1 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                        <i class="fa-solid fa-indent mr-1"></i> Indent
                    </button>
                    <button id="prop-list-outdent" class="flex-1 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                        <i class="fa-solid fa-outdent mr-1"></i> Outdent
                    </button>
                </div>
            `,
                ),
            );
            grp.innerHTML += `<p class="text-[11px] text-slate-400 leading-relaxed">Use <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-600">Tab</kbd> to indent, <kbd class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-600">Shift+Tab</kbd> to outdent in the text editor.</p>`;
            panel.appendChild(grp);
        }

                const font = document.getElementById("prop-font");
                if (font) {
                    bindInlineFormattingGuard(font);
                    font.onchange = e => {
                        restoreInlineSelection?.();
                        applyTextFormatting("fontFamily", e.target.value, { inlineAction: "fontFamily" });
                    };
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

                const subBtn = document.getElementById("prop-sub");
                if (subBtn) {
                    bindInlineFormattingGuard(subBtn);
                    subBtn.onclick = () => applyTextFormatting("subscript", null, { inlineAction: "subscript" });
                }

                const supBtn = document.getElementById("prop-sup");
                if (supBtn) {
                    bindInlineFormattingGuard(supBtn);
                    supBtn.onclick = () => applyTextFormatting("superscript", null, { inlineAction: "superscript" });
                }

                const fontSize = document.getElementById("prop-fs");
                if (fontSize) {
                    bindInlineFormattingGuard(fontSize);
                    let lastCommitted = fontSize.value;
                    const commitFontSize = () => {
                        if (fontSize.value === lastCommitted) return;
                        lastCommitted = fontSize.value;
                        restoreInlineSelection?.();
                        applyTextFormatting("fontSize", _normalizePx(fontSize.value, "32px"), { inlineAction: "fontSize" });
                    };
                    
                    fontSize.addEventListener("keydown", e => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            commitFontSize();
                            fontSize.blur();
                            
                            const editor = getActiveInlineEditor();
                            if (editor) editor.focus();
                        }
                    });
                    
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

                const textAlign = document.getElementById("prop-text-align");
                if (textAlign) textAlign.onchange = e => applyStyleAndRefresh("textAlign", e.target.value);

                const listKind = document.getElementById("prop-list-kind");
                const listStyle = document.getElementById("prop-list-style");
                const indentBtn = document.getElementById("prop-list-indent");
                const outdentBtn = document.getElementById("prop-list-outdent");
                const refreshListStyleOptions = kind => {
                    if (!listStyle) return;
                    if (kind === "none") {
                        listStyle.disabled = true;
                        return;
                    }

                    const options = Object.keys(BULLET_STYLE_THEMES);
                    const currentState = getTextListState(getSelectedElementData()?.content || data.content, data.bulletStyle);
                    const fallbackValue = options.includes(currentState.style) ? currentState.style : options[0];
                    listStyle.disabled = false;
                    listStyle.innerHTML = options
                        .map(
                            option =>
                                `<option value="${option}" ${option === fallbackValue ? "selected" : ""}>${option}</option>`,
                        )
                        .join("");
                };

                if (listKind) {
                    listKind.onchange = e => {
                        const nextKind = e.target.value;
                        onCommit(() => {
                            if (nextKind === "none") {
                                applyTextBulletState(data, "none");
                            } else {
                                refreshListStyleOptions(nextKind);
                                const nextStyle = document.getElementById("prop-list-style")?.value || "default";
                                applyTextBulletState(data, nextKind, nextStyle);
                            }
                            buildPropertiesPanel();
                        });
                    };
                }

                if (listStyle) {
                    const applyPanelStyleChange = e => {
                        const nextKind = document.getElementById("prop-list-kind")?.value || "none";
                        if (nextKind === "none") return;
                        onCommit(() => {
                            applyTextBulletState(data, nextKind, e.target.value);
                            buildPropertiesPanel();
                        });
                    };
                    listStyle.oninput = applyPanelStyleChange;
                    listStyle.onchange = applyPanelStyleChange;
                }

                if (indentBtn) {
                    indentBtn.onclick = () => {
                        onCommit(() => {
                            shiftTextBulletLevels(data, 1);
                            buildPropertiesPanel();
                        });
                    };
                }

                if (outdentBtn) {
                    outdentBtn.onclick = () => {
                        onCommit(() => {
                            shiftTextBulletLevels(data, -1);
                            buildPropertiesPanel();
                        });
                    };
                }
            
