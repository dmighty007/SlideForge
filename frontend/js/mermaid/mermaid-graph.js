import { sanitizeMermaidSvg } from "./mermaid-engine.js";

const DEFAULT_NODE_WIDTH = 138;
const DEFAULT_NODE_HEIGHT = 58;
const MAX_NODE_WIDTH = 520;
const SAFE_ID_RE = /^[A-Za-z_][\w-]*$/;

function escapeHtml(value = "") {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(value = "") {
    return escapeHtml(value).replace(/'/g, "&#39;");
}

function sanitizeId(value = "N") {
    const clean = String(value || "N")
        .trim()
        .replace(/[^\w-]+/g, "_")
        .replace(/^[-\d]+/, "N$&");
    return clean && SAFE_ID_RE.test(clean) ? clean : `N_${Math.abs(hashCode(clean || value || "node"))}`;
}

function hashCode(value) {
    let hash = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
}

export function createEmptyGraphModel(source = "") {
    return {
        version: 1,
        type: "flowchart",
        direction: "TD",
        nodes: [],
        edges: [],
        groups: [],
        mermaidSource: source,
        layoutMetadata: { algorithm: "hierarchical", updatedAt: Date.now() },
        viewport: { x: 0, y: 0, zoom: 1 },
        style: {},
    };
}

export function extractGraphMetadata(source = "") {
    const match = String(source || "").match(/^\s*%%\s*sf:graph\s+({.*})\s*%%\s*$/m);
    if (!match) return {};
    try {
        const parsed = JSON.parse(match[1]);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
        return {};
    }
}

export function stripGraphMetadata(source = "") {
    return String(source || "")
        .split(/\r?\n/)
        .filter(line => !/^\s*%%\s*sf:graph\s+{.*}\s*%%\s*$/.test(line))
        .join("\n")
        .trim();
}

function readNodeToken(token = "") {
    const text = token.trim();
    const patterns = [
        { re: /^([A-Za-z_][\w-]*)\s*\[\((.*?)\)\]$/, shape: "database" },
        { re: /^([A-Za-z_][\w-]*)\s*\{\{(.*?)\}\}$/, shape: "process" },
        { re: /^([A-Za-z_][\w-]*)\s*\{(.*?)\}$/, shape: "decision" },
        { re: /^([A-Za-z_][\w-]*)\s*\[\[(.*?)\]\]$/, shape: "process" },
        { re: /^([A-Za-z_][\w-]*)\s*\[(.*?)\]$/, shape: "process" },
        { re: /^([A-Za-z_][\w-]*)\s*\((.*?)\)$/, shape: "process" },
        { re: /^([A-Za-z_][\w-]*)\s*>"(.*?)"\s*]$/, shape: "process" },
        { re: /^([A-Za-z_][\w-]*)$/, shape: "process" },
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern.re);
        if (match) {
            return {
                id: sanitizeId(match[1]),
                label: match[2] !== undefined ? match[2] : match[1],
                shape: pattern.shape,
            };
        }
    }
    const id = sanitizeId(text.replace(/\W+/g, "_") || "Node");
    return { id, label: text || id, shape: "process" };
}

function ensureNode(model, node, metadata = {}, previous = null) {
    let existing = model.nodes.find(item => item.id === node.id);
    if (!existing) {
        const previousNode = previous?.nodes?.find(item => item.id === node.id);
        const metaPos = metadata.positions?.[node.id] || metadata.nodePositions?.[node.id] || {};
        existing = {
            id: node.id,
            label: node.label || node.id,
            shape: node.shape || previousNode?.shape || "process",
            x: Number.isFinite(Number(metaPos.x)) ? Number(metaPos.x) : Number(previousNode?.x),
            y: Number.isFinite(Number(metaPos.y)) ? Number(metaPos.y) : Number(previousNode?.y),
            width: Number(previousNode?.width) || DEFAULT_NODE_WIDTH,
            height: Number(previousNode?.height) || DEFAULT_NODE_HEIGHT,
            locked: Boolean(previousNode?.locked),
            style: previousNode?.style || {},
        };
        model.nodes.push(existing);
    } else {
        const nextLabel = node.label || "";
        const isDescriptiveLabel = nextLabel && nextLabel !== node.id;
        if (isDescriptiveLabel || !existing.label || existing.label === existing.id) {
            existing.label = nextLabel || existing.label;
        }
        existing.shape = node.shape || existing.shape;
    }
    return existing;
}

function parseEdgeLine(line) {
    const arrowMatch = line.match(/(.+?)\s*(-{1,3}(?:\.|=)?(?:>|x|o)?|\.-\.>|==>|-->)\s*(.+)/);
    if (!arrowMatch) return null;
    let fromToken = arrowMatch[1].trim();
    let arrow = arrowMatch[2].trim();
    let toToken = arrowMatch[3].trim();
    let label = "";
    const labelMatch = toToken.match(/^\|([^|]+)\|\s*(.+)$/);
    if (labelMatch) {
        label = labelMatch[1].trim();
        toToken = labelMatch[2].trim();
    }
    const trailingComment = toToken.indexOf("%%");
    if (trailingComment >= 0) toToken = toToken.slice(0, trailingComment).trim();
    return {
        from: readNodeToken(fromToken),
        to: readNodeToken(toToken),
        label,
        arrow,
    };
}

export function parseMermaidToGraph(source = "", previousGraph = null) {
    const raw = stripGraphMetadata(source);
    const metadata = extractGraphMetadata(source);
    const model = createEmptyGraphModel(source);
    const lines = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const header = lines.find(line => /^(flowchart|graph)\s+/i.test(line));
    if (header) {
        const match = header.match(/^(?:flowchart|graph)\s+([A-Z]{2})/i);
        model.direction = (match?.[1] || previousGraph?.direction || "TD").toUpperCase();
    }

    lines.forEach((line, index) => {
        if (
            /^(flowchart|graph)\s+/i.test(line) ||
            line.startsWith("%%") ||
            line.startsWith("classDef") ||
            line.startsWith("class ")
        )
            return;
        const parsedEdge = parseEdgeLine(line);
        if (parsedEdge) {
            const from = ensureNode(model, parsedEdge.from, metadata, previousGraph);
            const to = ensureNode(model, parsedEdge.to, metadata, previousGraph);
            const id = `e_${from.id}_${to.id}_${model.edges.length}`;
            const previousEdge = previousGraph?.edges?.find(
                edge => edge.from === from.id && edge.to === to.id && edge.label === parsedEdge.label,
            );
            model.edges.push({
                id: previousEdge?.id || id,
                from: from.id,
                to: to.id,
                label: parsedEdge.label,
                arrow: parsedEdge.arrow.includes("x") ? "cross" : parsedEdge.arrow.includes("o") ? "circle" : "arrow",
                routingStyle: previousEdge?.routingStyle || metadata.routingStyle || "orthogonal",
                waypoints: Array.isArray(previousEdge?.waypoints) ? previousEdge.waypoints : [],
                labelOffset: previousEdge?.labelOffset ||
                    metadata.edgeLabels?.[previousEdge?.id || id] || { x: 0, y: 0 },
                style: previousEdge?.style || {},
            });
            return;
        }
        const node = readNodeToken(line);
        if (node.id) ensureNode(model, node, metadata, previousGraph);
    });

    const previousPositions = previousGraph?.nodePositions || metadata.positions || {};
    model.nodePositions = {};
    model.nodes.forEach(node => {
        const pos = previousPositions[node.id] || {};
        if (!Number.isFinite(node.x) && Number.isFinite(Number(pos.x))) node.x = Number(pos.x);
        if (!Number.isFinite(node.y) && Number.isFinite(Number(pos.y))) node.y = Number(pos.y);
        if (Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y))) {
            model.nodePositions[node.id] = { x: Number(node.x), y: Number(node.y) };
        }
    });
    model.lockedLayout = Boolean(previousGraph?.lockedLayout || metadata.lockedLayout);
    model.autoLayout = previousGraph?.autoLayout ?? metadata.autoLayout ?? true;
    model.routingStyle = previousGraph?.routingStyle || metadata.routingStyle || "orthogonal";
    model.connectionStyle = previousGraph?.connectionStyle || metadata.connectionStyle || "arrow";
    return layoutGraphModel(model, { preservePositions: true });
}

export function layoutGraphModel(graph, options = {}) {
    const model = clone(graph) || createEmptyGraphModel();
    const preserve = options.preservePositions !== false;
    const rankGap = 118;
    const nodeGap = 62;
    const indegree = new Map(model.nodes.map(node => [node.id, 0]));
    model.edges.forEach(edge => indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1));
    const ranks = new Map();
    const queue = model.nodes.filter(node => (indegree.get(node.id) || 0) === 0).map(node => node.id);
    if (!queue.length && model.nodes[0]) queue.push(model.nodes[0].id);
    queue.forEach(id => ranks.set(id, 0));
    while (queue.length) {
        const id = queue.shift();
        const rank = ranks.get(id) || 0;
        model.edges
            .filter(edge => edge.from === id)
            .forEach(edge => {
                const nextRank = Math.max(ranks.get(edge.to) || 0, rank + 1);
                if (!ranks.has(edge.to) || nextRank > ranks.get(edge.to)) {
                    ranks.set(edge.to, nextRank);
                    queue.push(edge.to);
                }
            });
    }
    model.nodes.forEach(node => {
        if (!ranks.has(node.id)) ranks.set(node.id, 0);
    });
    const byRank = new Map();
    model.nodes.forEach(node => {
        const rank = ranks.get(node.id) || 0;
        if (!byRank.has(rank)) byRank.set(rank, []);
        byRank.get(rank).push(node);
    });
    [...byRank.entries()].forEach(([rank, nodes]) => {
        nodes.forEach((node, index) => {
            const hasPosition =
                node.x !== null &&
                node.y !== null &&
                node.x !== undefined &&
                node.y !== undefined &&
                Number.isFinite(Number(node.x)) &&
                Number.isFinite(Number(node.y));
            if (preserve && hasPosition) return;
            const major = 48 + rank * rankGap;
            const minor = 48 + index * (DEFAULT_NODE_WIDTH + nodeGap);
            if (model.direction === "LR" || model.direction === "RL") {
                node.x = major;
                node.y = minor;
            } else {
                node.x = minor;
                node.y = major;
            }
        });
    });
    model.nodePositions = {};
    model.nodes.forEach(node => {
        const measured = measureNode(node);
        node.x = Math.round(Number(node.x) || 48);
        node.y = Math.round(Number(node.y) || 48);
        const explicitWidth = Number(node.width);
        const explicitHeight = Number(node.height);
        node.width = Math.max(
            72,
            Math.min(
                MAX_NODE_WIDTH,
                Number.isFinite(explicitWidth) && explicitWidth > 0 ? Math.max(explicitWidth, measured.width) : measured.width,
            ),
        );
        node.height = Math.max(
            42,
            Math.min(
                320,
                Number.isFinite(explicitHeight) && explicitHeight > 0 ? Math.max(explicitHeight, measured.height) : measured.height,
            ),
        );
        model.nodePositions[node.id] = { x: node.x, y: node.y };
    });
    model.layoutMetadata = { ...(model.layoutMetadata || {}), algorithm: "hierarchical", updatedAt: Date.now() };
    return model;
}

export function graphToMermaid(graph) {
    const model = graph || createEmptyGraphModel();
    const lines = [`flowchart ${model.direction || "TD"}`];
    const metadata = {
        positions: Object.fromEntries(
            (model.nodes || []).map(node => [node.id, { x: Math.round(node.x || 0), y: Math.round(node.y || 0) }]),
        ),
        routingStyle: model.routingStyle || "orthogonal",
        connectionStyle: model.connectionStyle || "arrow",
        lockedLayout: Boolean(model.lockedLayout),
        autoLayout: model.autoLayout !== false,
        edgeLabels: Object.fromEntries(
            (model.edges || [])
                .filter(edge => edge.labelOffset)
                .map(edge => [
                    edge.id,
                    {
                        x: Math.round(Number(edge.labelOffset?.x) || 0),
                        y: Math.round(Number(edge.labelOffset?.y) || 0),
                    },
                ]),
        ),
    };
    lines.push(`%% sf:graph ${JSON.stringify(metadata)} %%`);
    (model.edges || []).forEach(edge => {
        const from = model.nodes.find(node => node.id === edge.from);
        const to = model.nodes.find(node => node.id === edge.to);
        if (!from || !to) return;
        const arrow = edge.arrow === "circle" ? "--o" : edge.arrow === "cross" ? "--x" : "-->";
        const label = edge.label ? `|${edge.label}| ` : "";
        lines.push(`    ${nodeToMermaid(from)} ${arrow} ${label}${nodeToMermaid(to)}`);
    });
    const connected = new Set((model.edges || []).flatMap(edge => [edge.from, edge.to]));
    (model.nodes || [])
        .filter(node => !connected.has(node.id))
        .forEach(node => {
            lines.push(`    ${nodeToMermaid(node)}`);
        });
    return lines.join("\n");
}

function nodeToMermaid(node) {
    const id = sanitizeId(node.id);
    const label = String(node.label || id)
        .replace(/]/g, "")
        .replace(/}/g, "");
    if (node.shape === "decision") return `${id}{${label}}`;
    if (node.shape === "database") return `${id}[(${label})]`;
    return `${id}[${label}]`;
}

function nodeCenter(node) {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function edgeLabelPoint(edge, model) {
    const from = model.nodes.find(node => node.id === edge.from);
    const to = model.nodes.find(node => node.id === edge.to);
    if (!from || !to) return { x: 80, y: 80 };
    const a = nodeCenter(from);
    const b = nodeCenter(to);
    const offset = edge.labelOffset || {};
    return {
        x: (a.x + b.x) / 2 + (Number(offset.x) || 0),
        y: (a.y + b.y) / 2 - 8 + (Number(offset.y) || 0),
    };
}

function splitLabelLines(label = "") {
    const rawLines = String(label || "").split(/\n/);
    const lines = [];
    rawLines.forEach(raw => {
        const line = raw.trim();
        if (!line) {
            lines.push("");
            return;
        }
        const words = line.split(/\s+/);
        let current = "";
        words.forEach(word => {
            if ((current + " " + word).trim().length > 22 && current) {
                lines.push(current);
                current = word;
            } else {
                current = `${current} ${word}`.trim();
            }
        });
        if (current) lines.push(current);
    });
    return lines.slice(0, 8);
}

function measureNode(node) {
    const lines = splitLabelLines(node.label || node.id);
    const longest = Math.max(8, ...lines.map(line => line.replace(/[*_`-]/g, "").length));
    return {
        width: Math.max(DEFAULT_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, longest * 8 + 42)),
        height: Math.max(DEFAULT_NODE_HEIGHT, lines.length * 20 + 30),
    };
}

function labelChunks(line = "") {
    const chunks = [];
    const re = /(\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`)/g;
    let index = 0;
    let match;
    while ((match = re.exec(line))) {
        if (match.index > index) chunks.push({ text: line.slice(index, match.index) });
        if (match[2]) chunks.push({ text: match[2], weight: "800" });
        else if (match[3]) chunks.push({ text: match[3], style: "italic" });
        else if (match[4]) chunks.push({ text: match[4], code: true });
        index = match.index + match[0].length;
    }
    if (index < line.length) chunks.push({ text: line.slice(index) });
    return chunks.length ? chunks : [{ text: line }];
}

function labelToSvg(node, textColor, defaultFontSize = 16, defaultFontFamily = "Inter, Arial, sans-serif") {
    const lines = splitLabelLines(node.label || node.id);
    const cx = node.x + node.width / 2;
    const fontSize = node.style?.fontSize || defaultFontSize;
    const fontFamily = node.style?.fontFamily || defaultFontFamily;
    const lineHeight = fontSize * 1.25;
    const startY = node.y + node.height / 2 - (lines.length - 1) * (lineHeight / 2);
    return lines
        .map((line, lineIndex) => {
            const bullet = /^\s*[-*]\s+/.test(line);
            const clean = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;
            const chunks = labelChunks(clean);
            const tspans = [];
            if (bullet) tspans.push(`<tspan fill="${textColor}">&#8226; </tspan>`);
            chunks.forEach(chunk => {
                const attrs = [
                    chunk.weight ? `font-weight="${chunk.weight}"` : "",
                    chunk.style ? `font-style="${chunk.style}"` : "",
                    chunk.code ? `font-family="'SFMono-Regular', Consolas, monospace"` : "",
                    chunk.code ? `fill="#334155"` : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                tspans.push(`<tspan ${attrs}>${escapeHtml(chunk.text)}</tspan>`);
            });
            return `<text x="${cx}" y="${startY + lineIndex * lineHeight}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" class="mermaid-graph-node-label" style="font-family:${fontFamily};font-size:${fontSize}px;fill:${textColor}">${tspans.join("")}</text>`;
        })
        .join("");
}

function edgePath(edge, model) {
    const from = model.nodes.find(node => node.id === edge.from);
    const to = model.nodes.find(node => node.id === edge.to);
    if (!from || !to) return "";
    const a = nodeCenter(from);
    const b = nodeCenter(to);
    if (edge.routingStyle === "curved") {
        const mx = (a.x + b.x) / 2;
        return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
    }
    const midX = Math.round((a.x + b.x) / 2);
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
}

function roughPoints(points, seed = "") {
    let hash = Math.abs(hashCode(seed));
    return points
        .map((point, index) => {
            hash = (hash * 1664525 + 1013904223 + index) >>> 0;
            const dx = ((hash % 100) / 100 - 0.5) * 5;
            hash = (hash * 1664525 + 1013904223 + index + 7) >>> 0;
            const dy = ((hash % 100) / 100 - 0.5) * 5;
            return `${Math.round(point[0] + dx)},${Math.round(point[1] + dy)}`;
        })
        .join(" ");
}

function roughRectPath(x, y, w, h, r = 10, seed = "") {
    const points = [
        [x + r, y],
        [x + w - r, y],
        [x + w, y + r],
        [x + w, y + h - r],
        [x + w - r, y + h],
        [x + r, y + h],
        [x, y + h - r],
        [x, y + r],
    ];
    return `M ${roughPoints(points, seed).replaceAll(" ", " L ")} Z`;
}

function roughPathD(d, seed = "") {
    if (!d || !seed) return d;
    let hash = Math.abs(hashCode(seed));
    return d.replace(/-?\d+(?:\.\d+)?/g, value => {
        hash = (hash * 1103515245 + 12345) >>> 0;
        const jitter = ((hash % 100) / 100 - 0.5) * 4;
        return String(Math.round((Number(value) + jitter) * 10) / 10);
    });
}

function nodeShape(node, style) {
    const common = `data-node-id="${escapeAttr(node.id)}"`;
    const fill = node.style?.fill || style.primaryColor || "#eef2ff";
    const stroke = node.style?.stroke || style.lineColor || "#4f46e5";
    const renderMode = style.renderMode || (style.handDrawn ? "sketch" : "real");
    const hand = renderMode !== "real";
    const sketch = renderMode === "sketch";
    const pathAttrs = `${common} class="mermaid-graph-node-shape ${hand ? "is-drawn" : ""} ${sketch ? "is-sketch" : ""}" fill="${fill}" stroke="${stroke}"`;
    if (
        hand &&
        !["decision", "cloud", "actor", "queue", "hexagon", "parallelogram", "document", "scientific"].includes(
            node.shape,
        )
    ) {
        return `<path ${pathAttrs} d="${roughRectPath(node.x, node.y, node.width, node.height, node.shape === "database" ? 24 : 10, node.id)}" />`;
    }
    if (node.shape === "decision") {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        const points = hand
            ? roughPoints(
                  [
                      [cx, node.y],
                      [node.x + node.width, cy],
                      [cx, node.y + node.height],
                      [node.x, cy],
                  ],
                  node.id,
              )
            : `${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}`;
        return `<polygon ${common} class="mermaid-graph-node-shape ${hand ? "is-drawn" : ""} ${sketch ? "is-sketch" : ""}" points="${points}" fill="${fill}" stroke="${stroke}" />`;
    }
    if (node.shape === "database") {
        return `<rect ${common} class="mermaid-graph-node-shape ${hand ? "is-drawn" : ""} ${sketch ? "is-sketch" : ""}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="24" fill="${fill}" stroke="${stroke}" />`;
    }
    if (node.shape === "cloud") {
        const x = node.x,
            y = node.y,
            w = node.width,
            h = node.height;
        const d = `M ${x + w * 0.24} ${y + h * 0.72} C ${x + w * 0.05} ${y + h * 0.72}, ${x + w * 0.06} ${y + h * 0.42}, ${x + w * 0.28} ${y + h * 0.44} C ${x + w * 0.32} ${y + h * 0.18}, ${x + w * 0.62} ${y + h * 0.16}, ${x + w * 0.7} ${y + h * 0.42} C ${x + w * 0.92} ${y + h * 0.4}, ${x + w * 0.96} ${y + h * 0.72}, ${x + w * 0.74} ${y + h * 0.72} Z`;
        return `<path ${pathAttrs} d="${hand ? roughPathD(d, node.id) : d}" />`;
    }
    if (node.shape === "actor") {
        const cx = node.x + node.width / 2,
            top = node.y + 8;
        return `<g ${common} class="mermaid-graph-node-shape ${hand ? "is-drawn" : ""} ${sketch ? "is-sketch" : ""}" fill="none" stroke="${stroke}" stroke-width="2.2">
            <circle cx="${cx}" cy="${top + 12}" r="11" fill="${fill}" />
            <path d="${roughPathD(`M ${cx} ${top + 24} L ${cx} ${top + 48} M ${cx - 28} ${top + 34} L ${cx + 28} ${top + 34} M ${cx} ${top + 48} L ${cx - 24} ${top + 72} M ${cx} ${top + 48} L ${cx + 24} ${top + 72}`, node.id)}" />
        </g>`;
    }
    if (node.shape === "queue") {
        return `<path ${pathAttrs} d="${roughPathD(`M ${node.x + 16} ${node.y} H ${node.x + node.width} V ${node.y + node.height} H ${node.x + 16} C ${node.x - 6} ${node.y + node.height}, ${node.x - 6} ${node.y}, ${node.x + 16} ${node.y} Z`, node.id)}" />`;
    }
    if (node.shape === "hexagon") {
        const x = node.x,
            y = node.y,
            w = node.width,
            h = node.height;
        const points = hand
            ? roughPoints(
                  [
                      [x + 24, y],
                      [x + w - 24, y],
                      [x + w, y + h / 2],
                      [x + w - 24, y + h],
                      [x + 24, y + h],
                      [x, y + h / 2],
                  ],
                  node.id,
              )
            : `${x + 24},${y} ${x + w - 24},${y} ${x + w},${y + h / 2} ${x + w - 24},${y + h} ${x + 24},${y + h} ${x},${y + h / 2}`;
        return `<polygon ${pathAttrs} points="${points}" />`;
    }
    if (node.shape === "parallelogram") {
        const x = node.x,
            y = node.y,
            w = node.width,
            h = node.height;
        const points = hand
            ? roughPoints(
                  [
                      [x + 22, y],
                      [x + w, y],
                      [x + w - 22, y + h],
                      [x, y + h],
                  ],
                  node.id,
              )
            : `${x + 22},${y} ${x + w},${y} ${x + w - 22},${y + h} ${x},${y + h}`;
        return `<polygon ${pathAttrs} points="${points}" />`;
    }
    if (node.shape === "document") {
        const x = node.x,
            y = node.y,
            w = node.width,
            h = node.height;
        const d = `M ${x} ${y} H ${x + w} V ${y + h - 10} C ${x + w * 0.68} ${y + h + 8}, ${x + w * 0.34} ${y + h - 24}, ${x} ${y + h - 8} Z`;
        return `<path ${pathAttrs} d="${hand ? roughPathD(d, node.id) : d}" />`;
    }
    if (node.shape === "scientific") {
        const x = node.x,
            y = node.y,
            w = node.width,
            h = node.height;
        const d = `M ${x + 18} ${y} H ${x + w - 18} L ${x + w} ${y + 18} V ${y + h - 18} L ${x + w - 18} ${y + h} H ${x + 18} L ${x} ${y + h - 18} V ${y + 18} Z`;
        return `<path ${pathAttrs} d="${hand ? roughPathD(d, node.id) : d}" />`;
    }
    return `<rect ${common} class="mermaid-graph-node-shape ${hand ? "is-drawn" : ""} ${sketch ? "is-sketch" : ""}" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.shape === "terminal" ? 28 : 10}" fill="${fill}" stroke="${stroke}" />`;
}

export function graphToSvg(graph, style = {}, options = {}) {
    const model = layoutGraphModel(graph, { preservePositions: true });
    const bounds = graphBounds(model);
    const selectedIds = new Set(options.selectedIds || (options.selectedId ? [options.selectedId] : []));
    const showConnectHandles = options.showConnectHandles === true;
    const showResizeHandles = options.showResizeHandles === true;
    const lineColor = style.lineColor || "#4f46e5";
    const textColor = style.primaryTextColor || "#0f172a";
    const fontFamily = style.fontFamily || "Inter, Arial, sans-serif";
    const fontSize = Number(style.fontSize) || 16;
    const edgeLabels = [];
    const renderMode = style.renderMode || (style.handDrawn ? "sketch" : "real");
    const handDrawn = renderMode !== "real";
    const sketch = renderMode === "sketch";
    const interactionStyles = [
        showConnectHandles ? `.mermaid-graph-connect-handle{fill:#ffffff;stroke:${lineColor};stroke-width:2;opacity:.92}` : "",
        showResizeHandles ? `.mermaid-graph-resize-handle{fill:#ffffff;stroke:#f59e0b;stroke-width:2;cursor:nwse-resize}` : "",
    ].filter(Boolean).join("\n                ");
    const edges = model.edges
        .map(edge => {
            const from = model.nodes.find(node => node.id === edge.from);
            const to = model.nodes.find(node => node.id === edge.to);
            if (!from || !to) return "";
            const labelPoint = edgeLabelPoint(edge, model);
            const active = selectedIds.has(edge.id) ? " is-selected" : "";
            if (edge.label) {
                const edgeTextColor = edge.style?.text || textColor;
                const edgeFontSize = edge.style?.fontSize ? edge.style.fontSize - 2 : Math.max(11, fontSize - 2);
                const edgeFontFamily = edge.style?.fontFamily || fontFamily;
                edgeLabels.push(
                    `<text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" class="mermaid-graph-edge-label${active}" data-edge-id="${escapeAttr(edge.id)}" style="font-family:${edgeFontFamily};font-size:${edgeFontSize}px;fill:${edgeTextColor}">${escapeHtml(edge.label)}</text>`,
                );
            }
            return `
            <g class="mermaid-graph-edge${active}" data-edge-id="${escapeAttr(edge.id)}">
                <path d="${handDrawn ? roughPathD(edgePath(edge, model), edge.id) : edgePath(edge, model)}" fill="none" stroke="${edge.style?.stroke || lineColor}" stroke-width="${handDrawn ? 2.4 : 2.2}" marker-end="url(#sfMermaidArrow)" />
            </g>
        `;
        })
        .join("");
    const nodes = model.nodes
        .map(node => {
            const active = selectedIds.has(node.id) ? " is-selected" : "";
            const cy = node.y + node.height / 2;
            const handles = [];
            if (showConnectHandles) {
                handles.push(`<circle class="mermaid-graph-connect-handle" data-node-id="${escapeAttr(node.id)}" cx="${node.x + node.width + 9}" cy="${cy}" r="6" />`);
            }
            if (showResizeHandles && selectedIds.has(node.id)) {
                handles.push(`<rect class="mermaid-graph-resize-handle" data-node-id="${escapeAttr(node.id)}" data-resize-handle="br" x="${node.x + node.width - 5}" y="${node.y + node.height - 5}" width="10" height="10" rx="3" />`);
                handles.push(`<rect class="mermaid-graph-resize-handle" data-node-id="${escapeAttr(node.id)}" data-resize-handle="r" x="${node.x + node.width - 4}" y="${node.y + node.height / 2 - 5}" width="8" height="10" rx="3" />`);
            }
            return `
            <g class="mermaid-graph-node${active}" data-node-id="${escapeAttr(node.id)}">
                ${nodeShape(node, { ...style, lineColor })}
                ${labelToSvg(node, node.style?.text || textColor, fontSize, fontFamily)}
                ${handles.join("")}
            </g>
        `;
        })
        .join("");
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
                <filter id="sfMermaidXkcd" x="-8%" y="-8%" width="116%" height="116%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="1" seed="7" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="${sketch ? 1.15 : 0.45}" />
                </filter>
                <marker id="sfMermaidArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="${lineColor}" />
                </marker>
            </defs>
            <style>
                .mermaid-graph-node-label{font-family:${fontFamily};font-size:${fontSize}px;fill:${textColor};pointer-events:none}
                .mermaid-graph-edge-label{font-family:${fontFamily};font-size:${Math.max(11, fontSize - 2)}px;font-weight:800;fill:${textColor};paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round;cursor:grab;pointer-events:visiblePainted}
                .mermaid-graph-node-shape{stroke-width:${handDrawn ? 2.4 : 2.2};stroke-linecap:round;stroke-linejoin:round}
                .mermaid-graph-node-shape.is-sketch{filter:url(#sfMermaidXkcd)}
                .mermaid-graph-node.is-selected .mermaid-graph-node-shape,.mermaid-graph-edge.is-selected path{stroke:#f59e0b;stroke-width:3}
                .mermaid-graph-edge-label.is-selected{fill:#92400e;stroke:#fffbeb}
                ${interactionStyles}
            </style>
            <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="transparent" />
            <g class="mermaid-graph-edges">${edges}</g>
            <g class="mermaid-graph-nodes">${nodes}</g>
            <g class="mermaid-graph-edge-labels">${edgeLabels.join("")}</g>
        </svg>
    `;
    return sanitizeMermaidSvg(svg);
}

export function graphBounds(graph) {
    const nodes = graph?.nodes || [];
    if (!nodes.length) return { x: 0, y: 0, width: 640, height: 360 };
    const minX = Math.min(...nodes.map(node => node.x)) - 48;
    const minY = Math.min(...nodes.map(node => node.y)) - 48;
    const maxX = Math.max(...nodes.map(node => node.x + node.width)) + 72;
    const maxY = Math.max(...nodes.map(node => node.y + node.height)) + 72;
    return {
        x: Math.floor(minX),
        y: Math.floor(minY),
        width: Math.max(320, Math.ceil(maxX - minX)),
        height: Math.max(220, Math.ceil(maxY - minY)),
    };
}

export function canUseVisualGraph(source = "") {
    const stripped = stripGraphMetadata(source);
    return (
        /^(flowchart|graph)\s+/im.test(stripped) &&
        !/(sequenceDiagram|stateDiagram|classDiagram|erDiagram|gantt|journey|mindmap)/i.test(stripped)
    );
}

export function makeNode(label = "Node", x = 80, y = 80, shape = "process", existingIds = new Set()) {
    let base = sanitizeId(label || "Node");
    if (!base || existingIds.has(base)) base = "Node";
    let id = base;
    let index = 2;
    while (existingIds.has(id)) {
        id = `${base}${index}`;
        index += 1;
    }
    return {
        id,
        label: label || id,
        shape,
        x,
        y,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        locked: false,
        style: {},
    };
}
