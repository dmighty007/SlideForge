import { SvgGraphRenderer } from "../../graph/renderers/SvgGraphRenderer.js";
import { layoutTextBlock } from "../typography/TextLayoutEngine.js";
import { attrsToString, escapeAttr, escapeXml, sanitizeSvgFragment } from "../serializers/SvgSerializer.js";

function transformAttr(node = {}) {
    const rotate = Number(node.transform?.rotate) || 0;
    if (!rotate) return "";
    const b = node.bounds || {};
    return ` rotate(${rotate} ${(b.x || 0) + (b.width || 0) / 2} ${(b.y || 0) + (b.height || 0) / 2})`;
}

function dashArray(style = {}) {
    if (style.strokeStyle === "dashed") return `${Math.max(1, style.strokeWidth) * 3} ${Math.max(1, style.strokeWidth) * 2}`;
    if (style.strokeStyle === "dotted") return `${Math.max(1, style.strokeWidth)} ${Math.max(1, style.strokeWidth) * 2}`;
    return "";
}

function renderShape(node = {}) {
    const b = node.bounds || {};
    const s = node.vectorStyle || {};
    const common = {
        fill: s.fill || "transparent",
        stroke: s.hasStroke ? s.stroke : "none",
        "stroke-width": s.hasStroke ? s.strokeWidth : 0,
        "stroke-linejoin": "round",
        opacity: node.opacity ?? s.opacity ?? 1,
    };
    const dash = dashArray(s);
    if (dash) common["stroke-dasharray"] = dash;
    const gTransform = transformAttr(node);
    const wrap = content => `<g data-node-id="${escapeAttr(node.id)}" transform="${gTransform.trim()}">${content}</g>`;
    if (node.geometry?.primitive === "ellipse") {
        return wrap(`<ellipse ${attrsToString({
            ...common,
            cx: b.x + b.width / 2,
            cy: b.y + b.height / 2,
            rx: b.width / 2,
            ry: b.height / 2,
        })}/>`); 
    }
    if (node.geometry?.primitive === "polygon") {
        const points = (node.geometry.points || [])
            .map(([x, y]) => `${b.x + (x / 100) * b.width},${b.y + (y / 100) * b.height}`)
            .join(" ");
        return wrap(`<polygon ${attrsToString({ ...common, points })}/>`); 
    }
    return wrap(`<rect ${attrsToString({
        ...common,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        rx: s.radius || 0,
        ry: s.radius || 0,
    })}/>`); 
}

function renderText(node = {}) {
    const b = node.bounds || {};
    const style = node.style || {};
    if (node.textDocument && typeof window !== "undefined" && window.SlideForgeText?.layoutTextDocument) {
        const layout = window.SlideForgeText.layoutTextDocument(node.textDocument, b, style);
        const baseFontSize = Number.parseFloat(String(style.fontSize || "24").replace("px", "")) || 24;
        const align = style.textAlign || "left";
        const lineNodes = (layout.lines || []).map((line, lineIndex) => {
            const runs = line.runs || [];
            const lineWidth = runs.reduce((sum, run) => sum + (Number(run.width) || 0), 0);
            const lineOffset =
                align === "center"
                    ? Math.max(0, (b.width - lineWidth) / 2)
                    : align === "right"
                      ? Math.max(0, b.width - lineWidth)
                      : 0;
            let cursorX = b.x + (line.x || 0) + lineOffset;
            const bullet =
                lineIndex === 0 || layout.lines[lineIndex - 1]?.block?.id !== line.block?.id
                    ? line.block?.type === "listItem"
                        ? line.block
                        : null
                    : null;
            const bulletNode = bullet
                ? `<text ${attrsToString({
                      x: b.x + (Number(bullet.list?.level) || 0) * 20,
                      y: b.y + line.y,
                      fill: style.color || "#111827",
                      "font-family": style.fontFamily || "Inter, Arial, sans-serif",
                      "font-size": baseFontSize,
                  })}>${bullet.list?.kind === "numbered" ? `${bullet.list?.ordinal || 1}.` : "•"}</text>`
                : "";
            const runNodes = runs.map(run => {
                const runStyle = run.style || style;
                const attrs = {
                    x: cursorX,
                    y: b.y + line.y,
                    fill: runStyle.color || style.color || "#111827",
                    "font-family": runStyle.fontFamily || style.fontFamily || "Inter, Arial, sans-serif",
                    "font-size": Number.parseFloat(String(runStyle.fontSize || style.fontSize || baseFontSize).replace("px", "")) || baseFontSize,
                    "font-weight": runStyle.fontWeight || style.fontWeight || "400",
                    "font-style": runStyle.fontStyle || style.fontStyle || undefined,
                    "text-decoration": runStyle.textDecoration || undefined,
                };
                if (style.textShadow && style.textShadow !== "none") {
                    attrs.filter = `url(#text-shadow-${escapeAttr(node.id)})`;
                }
                const out = `<text ${attrsToString(attrs)}>${escapeXml(run.text)}</text>`;
                cursorX += Number(run.width) || 0;
                return out;
            });
            return `${bulletNode}${runNodes.join("")}`;
        });
        const shadowDef =
            style.textShadow && style.textShadow !== "none"
                ? `<defs><filter id="text-shadow-${escapeAttr(node.id)}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.35)"/></filter></defs>`
                : "";
        return `<g data-node-id="${escapeAttr(node.id)}" opacity="${node.opacity ?? 1}" transform="${transformAttr(node).trim()}">${shadowDef}${lineNodes.join("")}</g>`;
    }
    const layout = layoutTextBlock(node);
    const fill = style.color || "#111827";
    const fontFamily = style.fontFamily || "Inter, Arial, sans-serif";
    const fontWeight = style.fontWeight || "400";
    const textAnchor = style.textAlign === "center" ? "middle" : style.textAlign === "right" ? "end" : "start";
    const x = textAnchor === "middle" ? b.x + b.width / 2 : textAnchor === "end" ? b.x + b.width : b.x;
    const lines = layout.lines.map((line, index) => {
        const y = b.y + layout.fontSize + index * layout.lineHeightPx;
        return `<text ${attrsToString({
            x,
            y,
            fill,
            "font-family": fontFamily,
            "font-size": layout.fontSize,
            "font-weight": fontWeight,
            "text-anchor": textAnchor,
        })}>${escapeXml(line)}</text>`;
    });
    return `<g data-node-id="${escapeAttr(node.id)}" opacity="${node.opacity ?? 1}" transform="${transformAttr(node).trim()}">${lines.join("")}</g>`;
}

function renderImage(node = {}) {
    const b = node.bounds || {};
    if (!node.src) return renderPlaceholder(node, "Image");
    return `<image ${attrsToString({
        "data-node-id": node.id,
        href: node.src,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        opacity: node.opacity ?? 1,
        preserveAspectRatio: "xMidYMid slice",
        transform: transformAttr(node).trim() || undefined,
    })}/>`;
}

function renderTable(node = {}) {
    const b = node.bounds || {};
    const table = node.tableData || {};
    const rows = Math.max(1, Number(table.rows) || table.cells?.length || 1);
    const cols = Math.max(1, Number(table.cols) || table.cells?.[0]?.length || 1);
    const cellWidth = b.width / cols;
    const cellHeight = b.height / rows;
    const parts = [];
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const cell = table.cells?.[row]?.[col] || {};
            const x = b.x + col * cellWidth;
            const y = b.y + row * cellHeight;
            parts.push(`<rect ${attrsToString({
                x,
                y,
                width: cellWidth,
                height: cellHeight,
                fill: cell.styles?.backgroundColor || (row === 0 && table.headerRow ? table.headerFill || "#f8fafc" : table.bodyFill || "#ffffff"),
                stroke: table.borderColor || "#cbd5e1",
                "stroke-width": table.borderWidth ?? 1,
            })}/>`);
            if (cell.text || cell.content) {
                parts.push(`<text ${attrsToString({
                    x: x + 8,
                    y: y + Math.min(cellHeight - 8, 20),
                    fill: cell.styles?.color || table.textColor || "#111827",
                    "font-size": table.fontSize || 14,
                    "font-family": table.fontFamily || "Inter, Arial, sans-serif",
                })}>${escapeXml(cell.text || cell.content)}</text>`);
            }
        }
    }
    return `<g data-node-id="${escapeAttr(node.id)}" opacity="${node.opacity ?? 1}">${parts.join("")}</g>`;
}

function renderGraph(node = {}) {
    const b = node.bounds || {};
    let svg = "";
    if (node.graphDocument?.nodes?.length) {
        svg = SvgGraphRenderer.render(node.graphDocument, { selectedIds: [], showConnectHandles: false, showResizeHandles: false });
    } else {
        svg = node.svgContent || "";
    }
    svg = sanitizeSvgFragment(svg)
        .replace(/<\?xml[^>]*>/gi, "")
        .replace(/<!doctype[^>]*>/gi, "");
    if (!svg) return renderPlaceholder(node, "Diagram");
    return `<g data-node-id="${escapeAttr(node.id)}" transform="translate(${b.x} ${b.y}) ${transformAttr({ ...node, bounds: { x: 0, y: 0, width: b.width, height: b.height } }).trim()}">
        <svg x="0" y="0" width="${b.width}" height="${b.height}" viewBox="0 0 ${b.width} ${b.height}" preserveAspectRatio="xMidYMid meet">${svg}</svg>
    </g>`;
}

function renderAnnotationLayer(node = {}) {
    const annotations = node.annotations || [];
    const paths = annotations.map(annotation => {
        const kind = annotation.kind || annotation.type;
        const style = annotation.style || annotation;
        const points = annotation.points || annotation.geometry?.points || [];
        if (points.length) {
            const d = points.map((point, index) => `${index ? "L" : "M"} ${Number(point.x) || 0} ${Number(point.y) || 0}`).join(" ");
            return `<path ${attrsToString({
                d,
                fill: "none",
                stroke: style.strokeColor || style.color || "#1f2937",
                "stroke-width": style.strokeWidth || 3,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                opacity: annotation.opacity ?? style.opacity ?? 1,
            })}/>`;
        }
        if (kind === "label" && annotation.text) {
            return `<text ${attrsToString({
                x: annotation.x || annotation.geometry?.x || 0,
                y: annotation.y || annotation.geometry?.y || 0,
                fill: style.strokeColor || "#1f2937",
                "font-size": style.fontSize || 18,
            })}>${escapeXml(annotation.text)}</text>`;
        }
        return "";
    });
    return `<g data-node-id="${escapeAttr(node.id)}" data-layer="annotations">${paths.join("")}</g>`;
}

function renderPlaceholder(node = {}, label = "Unsupported") {
    const b = node.bounds || {};
    return `<g data-node-id="${escapeAttr(node.id)}" opacity="0.86">
        <rect ${attrsToString({ x: b.x, y: b.y, width: b.width, height: b.height, fill: "#f8fafc", stroke: "#94a3b8", "stroke-dasharray": "6 6", "stroke-width": 1 })}/>
        <text ${attrsToString({ x: b.x + b.width / 2, y: b.y + b.height / 2, fill: "#475569", "font-size": 14, "text-anchor": "middle", "dominant-baseline": "middle" })}>${escapeXml(label)}</text>
    </g>`;
}

export class SvgRenderer {
    static renderNode(node = {}) {
        switch (node.type) {
            case "shape":
                return renderShape(node);
            case "text":
                return renderText(node);
            case "image":
                return renderImage(node);
            case "table":
                return renderTable(node);
            case "graph":
                return renderGraph(node);
            case "annotationLayer":
                return renderAnnotationLayer(node);
            default:
                return renderPlaceholder(node, node.type || "Unsupported");
        }
    }

    static renderSlide(slide = {}, scene = {}) {
        const page = scene.deck?.page || { width: 1024, height: 768 };
        const background = slide.background || { kind: "solid", color: "#ffffff" };
        const bg = background.kind === "solid"
            ? `<rect x="0" y="0" width="${page.width}" height="${page.height}" fill="${escapeAttr(background.color || "#ffffff")}"/>`
            : `<rect x="0" y="0" width="${page.width}" height="${page.height}" fill="#ffffff"/>`;
        const nodes = (slide.layers || [])
            .flatMap(layer => layer.nodes || [])
            .map(node => this.renderNode(node))
            .join("");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}" role="img" data-slide-id="${escapeAttr(slide.id)}">
            <title>${escapeXml(slide.title || "Slide")}</title>
            ${bg}
            ${nodes}
        </svg>`;
    }

    static renderScene(scene = {}) {
        const page = scene.deck?.page || { width: 1024, height: 768 };
        const slides = (scene.slides || []).map(slide => {
            const svg = this.renderSlide(slide, scene);
            return `<g data-slide-id="${escapeAttr(slide.id)}" transform="translate(0 ${(slide.index || 0) * page.height})">${svg}</g>`;
        });
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height * Math.max(1, scene.slides?.length || 1)}" viewBox="0 0 ${page.width} ${page.height * Math.max(1, scene.slides?.length || 1)}" role="img" data-slideforge-render-scene="${escapeAttr(scene.schemaVersion || 1)}">${slides.join("")}</svg>`;
    }
}
