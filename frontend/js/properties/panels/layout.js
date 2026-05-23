function buildLayoutPanel(panel, data) {
        if (data.type !== "image") {
            appGrp.appendChild(
                createField(
                    "Background",
                    `<input type="color" id="prop-bg" value="${_normalizeColorForInput(data.styles.backgroundColor, "#000000")}">`,
                ),
            );
        }
        appGrp.appendChild(
            createField(
                "Opacity",
                `<input type="number" step="0.1" id="prop-op" value="${data.styles.opacity || "1"}">`,
            ),
        );
        panel.appendChild(appGrp);


            const bg = document.getElementById("prop-bg");
            if (bg) {
                bg.oninput = e => applyStyle("backgroundColor", e.target.value, false);
                bg.onchange = e => applyStyle("backgroundColor", e.target.value, true);
            }

            const op = document.getElementById("prop-op");
            if (op) {
                op.oninput = e => {
                    const next = Math.max(0, Math.min(1, Number(e.target.value)));
                    applyStyle("opacity", String(Number.isNaN(next) ? 1 : next));
                };
            }

}
