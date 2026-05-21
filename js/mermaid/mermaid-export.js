import { sanitizeMermaidSvg } from "./mermaid-engine.js";

export function exportMermaidSvg(element) {
    const svg = sanitizeMermaidSvg(element?.svgContent || "");
    if (!svg) return false;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `slideforge-mermaid-${Date.now()}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
}

window.exportMermaidSvg = exportMermaidSvg;
