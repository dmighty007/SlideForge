function buildSmartPanel(panel, data) {
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
    }

                            syncCropDom(data.id, resetCrop);
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
                            syncHtmlEmbedDom({ ...data, htmlInteractive: next );
                            buildPropertiesPanel();
                        );
                    ;
                

