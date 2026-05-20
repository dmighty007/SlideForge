export class ExportManager {
    static esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    static commonAttrs(el) {
        const strokeColor = el.strokeColor || "#000";
        const strokeWidth = Math.max(1, Math.min(50, el.strokeWidth || 2));
        const opacity = el.opacity ?? 1;
        const dash =
            el.strokeStyle === "dashed"
                ? ' stroke-dasharray="10 8"'
                : el.strokeStyle === "dotted"
                  ? ' stroke-dasharray="2 7"'
                  : "";
        return `stroke="${this.esc(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"${dash}`;
    }

    static fillAttrs(el) {
        if (el.fillStyle === "none" || !el.backgroundColor || el.backgroundColor === "transparent") return 'fill="none"';
        const opacity = el.fillStyle === "solid" ? 1 : 0.35;
        return `fill="${this.esc(el.backgroundColor)}" fill-opacity="${opacity}"`;
    }

    static generateSVG(elements, viewport, slideWidth = 1024, slideHeight = 768) {
        if (!elements || elements.length === 0) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${slideWidth} ${slideHeight}" width="100%" height="100%"><rect width="100%" height="100%" fill="white"/></svg>`;
        }

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${slideWidth} ${slideHeight}" width="100%" height="100%">`;
        svgContent += `<rect width="100%" height="100%" fill="white"/>`;
        svgContent += `<g transform="translate(${viewport.panX || 0}, ${viewport.panY || 0}) scale(${viewport.zoom || 1})">`;

        for (let el of elements) {
            try {
                if (el.type === "freehand" && el.points && el.points.length >= 2) {
                    let d = `M ${el.points[0].x.toFixed(1)} ${el.points[0].y.toFixed(1)} `;
                    for (let i = 1; i < el.points.length; i++) d += `L ${el.points[i].x.toFixed(1)} ${el.points[i].y.toFixed(1)} `;
                    svgContent += `<path d="${d.trim()}" fill="none" ${this.commonAttrs(el)} />`;
                } else if (el.type === "text") {
                    const lines = String(el.text || "").split("\n");
                    svgContent += `<text x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" fill="${this.esc(el.strokeColor || "#000")}" font-size="${el.fontSize || 22}" font-family="Comic Sans MS, Segoe Print, cursive" opacity="${el.opacity ?? 1}">`;
                    lines.forEach((line, index) => {
                        svgContent += `<tspan x="${el.x.toFixed(1)}" dy="${index === 0 ? 0 : (el.fontSize || 22) * 1.25}">${this.esc(line)}</tspan>`;
                    });
                    svgContent += `</text>`;
                } else if (el.type === "draw_shape" && el.shapeType) {
                    if (el.shapeType === "rectangle") {
                        svgContent += `<rect x="${el.x.toFixed(1)}" y="${el.y.toFixed(1)}" width="${el.width.toFixed(1)}" height="${el.height.toFixed(1)}" ${this.fillAttrs(el)} ${this.commonAttrs(el)} />`;
                    } else if (el.shapeType === "diamond") {
                        const points = [
                            `${(el.x + el.width / 2).toFixed(1)},${el.y.toFixed(1)}`,
                            `${(el.x + el.width).toFixed(1)},${(el.y + el.height / 2).toFixed(1)}`,
                            `${(el.x + el.width / 2).toFixed(1)},${(el.y + el.height).toFixed(1)}`,
                            `${el.x.toFixed(1)},${(el.y + el.height / 2).toFixed(1)}`,
                        ].join(" ");
                        svgContent += `<polygon points="${points}" ${this.fillAttrs(el)} ${this.commonAttrs(el)} />`;
                    } else if (el.shapeType === "ellipse") {
                        const cx = (el.x + el.width / 2).toFixed(1);
                        const cy = (el.y + el.height / 2).toFixed(1);
                        svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(el.width / 2).toFixed(1)}" ry="${Math.abs(el.height / 2).toFixed(1)}" ${this.fillAttrs(el)} ${this.commonAttrs(el)} />`;
                    } else if (el.shapeType === "line" || el.shapeType === "arrow") {
                        const x2 = el.x + el.width;
                        const y2 = el.y + el.height;
                        svgContent += `<line x1="${el.x.toFixed(1)}" y1="${el.y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ${this.commonAttrs(el)} />`;
                        if (el.shapeType === "arrow") {
                            const angle = Math.atan2(el.height, el.width);
                            const len = 12 + (el.strokeWidth || 2) * 2.4;
                            const p1 = { x: x2 - len * Math.cos(angle - Math.PI / 6), y: y2 - len * Math.sin(angle - Math.PI / 6) };
                            const p2 = { x: x2 - len * Math.cos(angle + Math.PI / 6), y: y2 - len * Math.sin(angle + Math.PI / 6) };
                            svgContent += `<line x1="${x2.toFixed(1)}" y1="${y2.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" ${this.commonAttrs(el)} />`;
                            svgContent += `<line x1="${x2.toFixed(1)}" y1="${y2.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" ${this.commonAttrs(el)} />`;
                        }
                    }
                }
            } catch (error) {
                console.error("Error rendering element in SVG export:", error, el);
            }
        }

        svgContent += `</g></svg>`;
        return svgContent;
    }

    static serializeToJSON(elements, viewport) {
        return JSON.stringify({
            version: "2.0.0",
            viewport: { panX: viewport.panX || 0, panY: viewport.panY || 0, zoom: viewport.zoom || 1 },
            objects: elements || [],
            assets: [],
            metadata: { title: "SlideForge Whiteboard Layer", exportedAt: new Date().toISOString() },
        }, null, 2);
    }
}
