function buildSelectionPanel(panel) {
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

    selGrp.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-widest">${state.selectedIds.length} Objects</h3>
            <span class="text-[10px] text-accent font-bold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">${isGrouped ? "GROUPED" : "MULTIPLE"}</span>
        </div>
        <div class="flex gap-2">
            <button class="prop-group-action prop-action-btn prop-action-primary flex-1">
                <i class="fa-solid fa-object-group"></i> GROUP
            </button>
            <button class="prop-ungroup prop-action-btn prop-action-secondary flex-1">
                <i class="fa-solid fa-object-ungroup"></i> UNGROUP
            </button>
        </div>
    `;
    panel.appendChild(selGrp);

    const btnGroup = selGrp.querySelector(".prop-group-action");
    const btnUngroup = selGrp.querySelector(".prop-ungroup");
    if (btnGroup) btnGroup.onclick = groupSelected;
    if (btnUngroup) btnUngroup.onclick = ungroupSelected;

    // Shared style when multiple elements are selected
    const data = getSelectedElementData();
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
                    `<input type="color" class="prop-shared-color w-full h-8 rounded border border-slate-300 cursor-pointer" value="${firstColor}">`,
                ),
            );
            panel.appendChild(styleGrp);

            const sharedColor = styleGrp.querySelector(".prop-shared-color");
            if (sharedColor) {
                sharedColor.oninput = e => {
                    state.selectedIds.forEach(id => {
                        const dom = document.getElementById(id);
                        if (dom) dom.style.backgroundColor = e.target.value;
                    });
                    if (window.refreshPreviews) window.refreshPreviews();
                };
                sharedColor.onchange = e => {
                    saveStateToUndo();
                    state.selectedIds.forEach(id => {
                        updateElementStyleState(id, { backgroundColor: e.target.value });
                    });
                    if (window.refreshPreviews) window.refreshPreviews();
                };
            }
        }
    }
}
