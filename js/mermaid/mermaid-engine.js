const MERMAID_CDN_URL = "https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.esm.min.mjs";
const SAFE_SVG_TAGS = new Set([
    "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs", "marker",
    "linearGradient", "radialGradient", "stop", "style", "title", "desc", "use", "pattern", "clipPath", "mask",
    "filter", "feTurbulence", "feDisplacementMap",
]);
const URL_ATTRS = new Set(["href", "xlink:href"]);

let mermaidPromise = null;
let renderQueue = Promise.resolve();
const svgCache = new Map();

function normalizeColor(value, fallback) {
    const color = String(value || "").trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
}

export function normalizeMermaidStyle(style = {}) {
    return {
        fontFamily: String(style.fontFamily || "Inter, Arial, sans-serif").slice(0, 120),
        fontSize: Math.max(10, Math.min(28, Number(style.fontSize) || 16)),
        primaryColor: normalizeColor(style.primaryColor, "#eef2ff"),
        primaryTextColor: normalizeColor(style.primaryTextColor, "#0f172a"),
        lineColor: normalizeColor(style.lineColor, "#4f46e5"),
        backgroundColor: normalizeColor(style.backgroundColor, "#ffffff"),
        handDrawn: Boolean(style.handDrawn),
    };
}

function cacheKey(source, theme, style) {
    return `${theme || "default"}::${JSON.stringify(normalizeMermaidStyle(style))}::${source || ""}`;
}

function idle() {
    return new Promise(resolve => {
        const runner = () => resolve();
        if (typeof requestIdleCallback === "function") requestIdleCallback(runner, { timeout: 800 });
        else setTimeout(runner, 0);
    });
}

export async function loadMermaid() {
    if (!mermaidPromise) {
        mermaidPromise = import(MERMAID_CDN_URL).then(module => {
            const mermaid = module.default || module;
            mermaid.initialize({
                startOnLoad: false,
                securityLevel: "strict",
                theme: "default",
                htmlLabels: false,
                deterministicIds: true,
                deterministicIDSeed: "slideforge",
                fontFamily: "Inter, Arial, sans-serif",
            });
            return mermaid;
        });
    }
    return mermaidPromise;
}

export function sanitizeMermaidSvg(rawSvg = "") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(rawSvg || ""), "image/svg+xml");
    if (doc.querySelector("parsererror")) return "";
    const svg = doc.documentElement;
    if (!svg || svg.tagName.toLowerCase() !== "svg") return "";

    const nodes = Array.from(svg.querySelectorAll("*"));
    for (const node of nodes) {
        const tag = node.tagName;
        if (!SAFE_SVG_TAGS.has(tag)) {
            node.remove();
            continue;
        }
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name;
            const lower = name.toLowerCase();
            const value = attr.value || "";
            if (lower.startsWith("on")) {
                node.removeAttribute(name);
                continue;
            }
            if (lower === "style" && /url\s*\(|expression\s*\(|javascript:/i.test(value)) {
                node.removeAttribute(name);
                continue;
            }
            if (URL_ATTRS.has(lower) && !/^#[-_a-zA-Z0-9:.]+$/.test(value)) {
                node.removeAttribute(name);
                continue;
            }
            if (/javascript:|data:text\/html|<script/i.test(value)) {
                node.removeAttribute(name);
            }
        }
    }
    svg.removeAttribute("height");
    svg.removeAttribute("width");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("role", "img");
    return new XMLSerializer().serializeToString(svg);
}

export async function validateMermaid(source) {
    try {
        const mermaid = await loadMermaid();
        const result = mermaid.parse ? mermaid.parse(String(source || "")) : true;
        if (result && typeof result.then === "function") await result;
        return { ok: true, message: "Syntax looks valid" };
    } catch (error) {
        return { ok: false, message: error?.str || error?.message || String(error) };
    }
}

export async function renderMermaid(source, options = {}) {
    const diagramSource = String(source || "").trim();
    const theme = options.theme || "default";
    const style = normalizeMermaidStyle(options.style || {});
    if (!diagramSource) throw new Error("Mermaid source is empty.");
    const key = cacheKey(diagramSource, theme, style);
    if (svgCache.has(key)) return svgCache.get(key);

    renderQueue = renderQueue.then(async () => {
        await idle();
        const mermaid = await loadMermaid();
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme,
            themeVariables: {
                fontFamily: style.fontFamily,
                fontSize: `${style.fontSize}px`,
                primaryColor: style.primaryColor,
                primaryTextColor: style.primaryTextColor,
                primaryBorderColor: style.lineColor,
                lineColor: style.lineColor,
                textColor: style.primaryTextColor,
                mainBkg: style.primaryColor,
                nodeBorder: style.lineColor,
                clusterBkg: style.backgroundColor,
                background: style.backgroundColor,
            },
            htmlLabels: false,
            deterministicIds: true,
            deterministicIDSeed: `slideforge-${Math.abs(hashCode(key))}`,
            fontFamily: style.fontFamily,
        });
        const id = `sf-mermaid-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const rendered = await mermaid.render(id, diagramSource);
        const svg = sanitizeMermaidSvg(rendered?.svg || "");
        if (!svg) throw new Error("Mermaid rendered an empty or unsafe SVG.");
        const payload = { svg, bindFunctions: rendered?.bindFunctions || null };
        svgCache.set(key, payload);
        return payload;
    });

    return renderQueue;
}

export function clearMermaidCache() {
    svgCache.clear();
}

function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
