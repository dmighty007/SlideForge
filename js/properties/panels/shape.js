function buildShapePanel(panel, data) {
    if (data.type !== "shape") return;

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
        </select>
    `,
        ),
    );
    panel.appendChild(shapeGrp);

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
                };
                const visual = shapeVisuals[value] || shapeVisuals.rectangle;
                data.shapeType = value;
                if (typeof renderShapeContent === "function") {
                    renderShapeContent(dom, data);
                } else {
                    dom.style.clipPath = visual.clipPath;
                    dom.style.borderRadius = visual.borderRadius;
                }
                updateElementStyleState(data.id, { borderRadius: visual.borderRadius });
            });
        };
    }
}
