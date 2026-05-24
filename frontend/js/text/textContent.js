const BULLET_STYLE_THEMES = {
    default: {
        levels: [
            { type: "symbol", value: "•", fontSize: 1.0, color: "inherit", indent: 0 },
            { type: "symbol", value: "◦", fontSize: 0.9, color: "inherit", indent: 20 },
            { type: "symbol", value: "▪", fontSize: 0.85, color: "inherit", indent: 40 },
        ],
    },
    square: {
        levels: [
            { type: "symbol", value: "■", fontSize: 0.9, color: "inherit", indent: 0 },
            { type: "symbol", value: "□", fontSize: 0.9, color: "inherit", indent: 20 },
            { type: "symbol", value: "▪", fontSize: 0.85, color: "inherit", indent: 40 },
        ],
    },
    diamond: {
        levels: [
            { type: "symbol", value: "◆", fontSize: 0.9, color: "#f59e0b", indent: 0 },
            { type: "symbol", value: "◇", fontSize: 0.9, color: "inherit", indent: 20 },
            { type: "symbol", value: "◈", fontSize: 0.85, color: "inherit", indent: 40 },
        ],
    },
    modern: {
        levels: [
            { type: "icon", value: "arrow-right", color: "#60a5fa", indent: 0 },
            { type: "symbol", value: "–", color: "inherit", indent: 20 },
        ],
    },
    chevron: {
        levels: [
            { type: "symbol", value: "»", fontSize: 1.0, color: "#38bdf8", indent: 0 },
            { type: "symbol", value: "›", fontSize: 1.0, color: "inherit", indent: 20 },
            { type: "symbol", value: "–", fontSize: 0.9, color: "inherit", indent: 40 },
        ],
    },
    dash: {
        levels: [
            { type: "symbol", value: "–", fontSize: 1.0, color: "inherit", indent: 0 },
            { type: "symbol", value: "—", fontSize: 1.0, color: "inherit", indent: 20 },
            { type: "symbol", value: "·", fontSize: 1.0, color: "inherit", indent: 40 },
        ],
    },
    checklist: {
        levels: [{ type: "icon", value: "check", color: "#22c55e", indent: 0 }],
    },
    star: {
        levels: [
            { type: "symbol", value: "✦", fontSize: 0.95, color: "#f472b6", indent: 0 },
            { type: "symbol", value: "✧", fontSize: 0.95, color: "inherit", indent: 20 },
            { type: "symbol", value: "•", fontSize: 0.9, color: "inherit", indent: 40 },
        ],
    },
};

const ICON_MAP = {
    "arrow-right": "→",
    "check": "✓",
    "circle": "●",
    "square": "■",
    "star": "★",
    "diamond": "◆",
    "chevron": "»"
};

const NUMBERED_STYLE_THEMES = {
    'decimal': '1, 2, 3...',
    'decimal-leading-zero': '01, 02, 03...',
    'lower-roman': 'i, ii, iii...',
    'upper-roman': 'I, II, III...',
    'lower-alpha': 'a, b, c...',
    'upper-alpha': 'A, B, C...',
    'lower-greek': 'α, β, γ...'
};

const BULLETED_LIST_STYLE_TYPES = {
    default: "disc",
    square: "square",
    diamond: "disc",
    modern: "disc",
    chevron: "disc",
    dash: "disc",
    checklist: "disc",
    star: "disc",
};

function getBulletedListStyleType(style = "default") {
    return BULLETED_LIST_STYLE_TYPES[style] || BULLETED_LIST_STYLE_TYPES.default;
}

function escapeCssString(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}

function normalizeStructuredBulletItem(item) {
    const safeItem = item || {};
    const html =
        typeof safeItem.html === "string"
            ? String(safeItem.html || "")
            : typeof safeItem.text === "string"
              ? escapeHtml(String(safeItem.text || ""))
              : "";
    return {
        html: typeof sanitizeTextHtml === "function" ? sanitizeTextHtml(html) : html,
        level: Math.max(0, Number(safeItem.level) || 0),
    };
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getLevelStyle(bulletStyle, level) {
    const theme = BULLET_STYLE_THEMES[bulletStyle] || BULLET_STYLE_THEMES.default;
    return theme.levels[Math.min(level, theme.levels.length - 1)] || BULLET_STYLE_THEMES.default.levels[0];
}

function getBulletIndent(level, levelStyle) {
    const themeIndent = Number(levelStyle.indent) || 0;
    const structuralIndent = Math.max(0, Number(level) || 0) * 20;
    return Math.max(themeIndent, structuralIndent);
}

function getBulletGlyph(levelStyle) {
    if (levelStyle.type === "icon") {
        return ICON_MAP[levelStyle.value] || "•";
    }
    return levelStyle.value || "•";
}

function parseTextFromHtml(content) {
    return extractHtmlLines(content).join("\n");
}

function plainTextFromHtmlSnippet(content) {
    const probe = document.createElement("div");
    probe.innerHTML = String(content || "");
    return probe.innerText || probe.textContent || "";
}

function extractHtmlLinePayloads(content) {
    const probe = document.createElement("div");
    probe.innerHTML = String(content || "");
    const lines = [];
    let currentHtml = "";
    const BLOCK_TAGS = new Set(["DIV", "P", "LI", "SECTION", "ARTICLE", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6"]);

    const flushLine = () => {
        const textOnly = plainTextFromHtmlSnippet(currentHtml).replace(/\u00a0/g, " ").trim();
        if (textOnly) {
            lines.push(currentHtml);
        }
        currentHtml = "";
    };

    Array.from(probe.childNodes || []).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            currentHtml += escapeHtml(node.textContent || "");
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName;
        if (node.classList?.contains("ppt-bullet-block")) {
            flushLine();
            Array.from(node.querySelectorAll(".ppt-bullet-row")).forEach(row => {
                const textNode = row.querySelector(".ppt-bullet-text");
                currentHtml = textNode ? textNode.innerHTML : row.innerHTML;
                flushLine();
            });
            return;
        }

        if (node.classList?.contains("ppt-bullet-row")) {
            flushLine();
            const textNode = node.querySelector(".ppt-bullet-text");
            currentHtml = textNode ? textNode.innerHTML : node.innerHTML;
            flushLine();
            return;
        }

        if (tag === "BR") {
            flushLine();
            return;
        }

        if (tag === "OL" || tag === "UL") {
            flushLine();
            Array.from(node.children || []).forEach(child => {
                if (child.tagName === "LI") {
                    currentHtml = child.innerHTML;
                    flushLine();
                }
            });
            return;
        }

        if (BLOCK_TAGS.has(tag)) {
            flushLine();
            currentHtml = node.innerHTML;
            flushLine();
            return;
        }

        currentHtml += node.outerHTML || "";
    });

    flushLine();
    return lines;
}

function extractHtmlLines(content) {
    return extractHtmlLinePayloads(content)
        .map(line => {
            return plainTextFromHtmlSnippet(line).replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
        })
        .filter(Boolean);
}

function isStructuredBulletContent(content) {
    return (
        Array.isArray(content) &&
        content.every(
            item =>
                item &&
                (typeof item.text === "string" || typeof item.html === "string") &&
                Number.isFinite(Number(item.level ?? 0)),
        )
    );
}

function normalizeTextElementContent(content) {
    if (isStructuredBulletContent(content)) {
        return content.map(normalizeStructuredBulletItem);
    }
    const value = typeof content === "string" ? content : "Double click to edit text";
    return typeof sanitizeTextHtml === "function" ? sanitizeTextHtml(value) : value;
}

function getTextListState(content, bulletStyle = "default") {
    const isBullet = isStructuredBulletContent(content);
    
    // Check if it's already a structured bullet list
    if (isBullet) {
        return { kind: "bulleted", style: bulletStyle || "default" };
    }

    // Check if it's a native HTML list (e.g. pasted or from old state)
    const str = String(content || "");
    if (str.includes("<ol")) {
        const probe = document.createElement("div");
        probe.innerHTML = str;
        const ol = probe.querySelector("ol");
        if (ol) {
            return {
                kind: "numbered",
                style: ol.style.listStyleType || "decimal",
            };
        }
    }
    
    if (str.includes("<ul")) {
        return { kind: "bulleted", style: bulletStyle || "default" };
    }

    // If it's plain text but has bullet-like markers (experimental detection)
    if (str.includes("ppt-bullet-row")) {
        return { kind: "bulleted", style: bulletStyle || "default" };
    }

    return { kind: "none", style: "" };
}

function extractPlainLines(content) {
    if (isStructuredBulletContent(content)) {
        return content.map(item => parseTextFromHtml(normalizeStructuredBulletItem(item).html)).filter(Boolean);
    }

    return extractHtmlLines(content);
}

function extractStyledLines(content) {
    if (isStructuredBulletContent(content)) {
        return content.map(item => normalizeStructuredBulletItem(item).html).filter(line => parseTextFromHtml(line).trim());
    }
    return extractHtmlLinePayloads(content);
}

function buildStructuredBulletContent(lines, bulletStyle = "default") {
    const safeLines = Array.isArray(lines) && lines.length ? lines : ["List item"];
    return safeLines.map(line => normalizeStructuredBulletItem({ html: String(line || "").trim() || "List item", level: 0 }));
}

function stripInlineColorFromHtml(html) {
    return stripInlineTextStylesFromHtml(html, ["color"]);
}

function stripInlineTextStylesFromHtml(html, props = []) {
    const removeAll = props === true || props === "all" || (Array.isArray(props) && props.includes("all"));
    const propSet = new Set(Array.isArray(props) ? props : []);
    const probe = document.createElement("div");
    probe.innerHTML = String(html || "");

    Array.from(probe.querySelectorAll("*")).forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (removeAll) {
            node.removeAttribute("style");
            node.removeAttribute("class");
        } else {
            if (propSet.has("color")) node.style.removeProperty("color");
            if (propSet.has("fontFamily")) node.style.removeProperty("font-family");
            if (propSet.has("fontSize")) node.style.removeProperty("font-size");
            if (propSet.has("fontWeight")) node.style.removeProperty("font-weight");
            if (propSet.has("fontStyle")) node.style.removeProperty("font-style");
        }
        if (node.tagName === "FONT") {
            if (removeAll || propSet.has("color")) node.removeAttribute("color");
            if (removeAll || propSet.has("fontFamily")) node.removeAttribute("face");
            if (removeAll || propSet.has("fontSize")) node.removeAttribute("size");
        }
        if (!node.getAttribute("style") || !node.getAttribute("style").trim()) {
            node.removeAttribute("style");
        }
    });

    Array.from(probe.querySelectorAll("span")).reverse().forEach(node => {
        if (node.attributes.length === 0) {
            node.replaceWith(...Array.from(node.childNodes));
        }
    });

    return probe.innerHTML;
}

function stripInlineColorFromTextContent(content) {
    return stripInlineTextStylesFromTextContent(content, ["color"]);
}

function stripInlineTextStylesFromTextContent(content, props = []) {
    if (isStructuredBulletContent(content)) {
        return content.map(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            return normalizeStructuredBulletItem({
                ...item,
                html: stripInlineTextStylesFromHtml(item.html, props),
            });
        });
    }

    return stripInlineTextStylesFromHtml(content, props);
}

function stripAllInlineTextFormattingFromHtml(html) {
    const probe = document.createElement("div");
    probe.innerHTML = stripInlineTextStylesFromHtml(html, "all");
    Array.from(probe.querySelectorAll("b,strong,i,em,u,s,sub,sup,font")).reverse().forEach(node => {
        node.replaceWith(...Array.from(node.childNodes));
    });
    return probe.innerHTML;
}

function stripAllInlineTextFormattingFromTextContent(content) {
    if (isStructuredBulletContent(content)) {
        return content.map(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            return normalizeStructuredBulletItem({
                ...item,
                html: stripAllInlineTextFormattingFromHtml(item.html),
            });
        });
    }
    return stripAllInlineTextFormattingFromHtml(content);
}

function buildNumberedListMarkup(style, lines) {
    const safeLines = (Array.isArray(lines) && lines.length ? lines : ["List item"]).map(line => {
        const raw = String(line || "").trim();
        if (!raw) return "List item";
        return /<[^>]+>/.test(raw) ? raw : escapeHtml(raw);
    });
    return `<ol class="ppt-numbered-block" style="list-style-type:${style || "decimal"};margin:0;padding-left:1.5em;line-height:inherit;width:100%;text-align:inherit;">${safeLines.map(line => `<li style="margin:0;padding:0;line-height:inherit;">${line}</li>`).join("")}</ol>`;
}

function buildBulletedListMarkup(style, lines) {
    const safeStyle = BULLET_STYLE_THEMES[style] ? style : "default";
    const levelStyle = getLevelStyle(safeStyle, 0);
    const marker = getBulletGlyph(levelStyle);
    const markerColor = levelStyle.color || "currentColor";
    const markerScale = Number(levelStyle.fontSize) || 1;
    const normalizedLines = normalizeBulletedListLines(lines);
    const safeLines = (normalizedLines.length ? normalizedLines : ["List item"]).map(line => {
        const raw = String(line || "").trim();
        if (!raw) return "List item";
        return /<[^>]+>/.test(raw) ? raw : escapeHtml(raw);
    });
    return `<ul class="ppt-bulleted-block" data-bullet-style="${escapeHtml(safeStyle)}" style="--bullet-marker:'${escapeCssString(marker)}';--bullet-color:${markerColor};--bullet-font-scale:${markerScale};">${safeLines.map(line => `<li class="ppt-bulleted-item">${line}</li>`).join("")}</ul>`;
}

function applyTextNumberedState(elData, style = "decimal") {
    const lines = extractStyledLines(elData.content);
    elData.content = buildNumberedListMarkup(style, lines);
    elData.bulletStyle = ""; // Clear bullet style if switching to numbered
}

function applyTextBulletState(elData, kind, style = "default") {
    if (kind === "none") {
        elData.content = extractStyledLines(elData.content).join("<br>");
        elData.bulletStyle = "";
        return;
    }

    if (kind === "bulleted") {
        const lines = extractStyledLines(elData.content);
        elData.content = buildBulletedListMarkup(style, lines);
        elData.bulletStyle = style;
    } else if (kind === "numbered") {
        applyTextNumberedState(elData, style);
    }
}

function getSafeIconHtml(elData) {
    const raw = String(elData?.iconClass || elData?.content || "");
    const classMatch =
        raw.match(/class\s*=\s*["']([^"']+)["']/i) ||
        raw.match(/class\s*=\s*&quot;([^&]+)&quot;/i);
    const classSource = classMatch ? classMatch[1] : raw;
    const safeClasses = classSource
        .split(/\s+/)
        .map(cls => cls.trim())
        .filter(cls => /^fa-/.test(cls) || /^fa[srltdbk]?$/.test(cls));
    const iconClass = safeClasses.length ? safeClasses.join(" ") : "fa-solid fa-icons";
    return `<i class="${iconClass}"></i>`;
}

function renderTextContent(elData) {
    if (elData?.iconMode) {
        return getSafeIconHtml(elData);
    }

    if (elData?.textDocument && typeof renderSemanticTextDocumentToHtml === "function") {
        return renderSemanticTextDocumentToHtml(elData.textDocument, { bulletStyle: elData.bulletStyle || "default" });
    }

    if (!isStructuredBulletContent(elData.content)) {
        return typeof sanitizeTextHtml === "function"
            ? sanitizeTextHtml(elData.content || "")
            : String(elData.content || "");
    }

    const bulletStyle = elData.bulletStyle || "default";
    const rows = elData.content
        .map(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            const html = item.html;
            const text = parseTextFromHtml(html);
            if (!text.trim()) {
                return `<div class="ppt-bullet-spacer"></div>`;
            }
            const level = item.level;
            const levelStyle = getLevelStyle(bulletStyle, level);
            const glyph = escapeHtml(getBulletGlyph(levelStyle));
            const color = levelStyle.color || "inherit";
            const fontSizeScale = Number(levelStyle.fontSize) || 1;
            const indent = getBulletIndent(level, levelStyle);
            return `
                <div class="ppt-bullet-row" style="--bullet-indent:${indent}px;--bullet-color:${color};--bullet-font-scale:${fontSizeScale};">
                    <span class="ppt-bullet-marker">${glyph}</span>
                    <span class="ppt-bullet-text">${html || escapeHtml(text)}</span>
                </div>
            `;
        })
        .join("");

    return `<div class="ppt-bullet-block" data-bullet-style="${escapeHtml(bulletStyle)}">${rows}</div>`;
}

const EDITABLE_BULLET_MARKERS = Array.from(
    new Set(
        Object.values(BULLET_STYLE_THEMES)
            .flatMap(theme => (theme.levels || []).map(levelStyle => getBulletGlyph(levelStyle)))
            .concat(["•", "◦", "▪", "■", "□", "◆", "◇", "◈", "»", "›", "–", "—", "·", "✦", "✧", "✓", "→"]),
    ),
).sort((a, b) => String(b).length - String(a).length);

function getEditableBulletPrefix(level, bulletStyle = "default") {
    const safeLevel = Math.max(0, Number(level) || 0);
    const marker = getBulletGlyph(getLevelStyle(bulletStyle, safeLevel));
    return `${"  ".repeat(safeLevel)}${marker} `;
}

function getBulletLevelMeta(level, bulletStyle = "default") {
    const safeLevel = Math.max(0, Number(level) || 0);
    const levelStyle = getLevelStyle(bulletStyle, safeLevel);
    return {
        level: safeLevel,
        marker: getBulletGlyph(levelStyle),
        indent: getBulletIndent(safeLevel, levelStyle),
    };
}

function stripEditableBulletPrefix(rawLine) {
    const raw = String(rawLine || "").replace(/\r/g, "");
    const leading = raw.match(/^[\t ]*/)?.[0] || "";
    const tabCount = (leading.match(/\t/g) || []).length;
    const spaceCount = leading.replace(/\t/g, "").length;
    const level = Math.max(0, tabCount + Math.floor(spaceCount / 2));
    let text = raw.slice(leading.length);

    for (const marker of EDITABLE_BULLET_MARKERS) {
        if (text === marker) {
            text = "";
            break;
        }
        if (text.startsWith(marker) && /^\s/.test(text.slice(marker.length, marker.length + 1))) {
            text = text.slice(marker.length).replace(/^[\t ]+/, "");
            break;
        }
    }

    return { level, text };
}

function normalizeBulletedListLines(lines) {
    return (Array.isArray(lines) && lines.length ? lines : ["List item"])
        .map(line => {
            const raw = String(line || "").trim();
            if (!raw) return "";
            if (/<[^>]+>/.test(raw)) {
                const plain = plainTextFromHtmlSnippet(raw).replace(/\u00a0/g, " ").trim();
                const parsedPlain = stripEditableBulletPrefix(plain);
                if (!parsedPlain.text.trim()) return "";

                const probe = document.createElement("div");
                probe.innerHTML = raw;
                const firstText = Array.from(probe.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                if (firstText) {
                    firstText.textContent = stripEditableBulletPrefix(firstText.textContent).text;
                    return probe.innerHTML.trim();
                }
                return parsedPlain.text;
            }
            return stripEditableBulletPrefix(raw).text.trim();
        })
        .filter(Boolean);
}

function structuredContentToEditableText(content, bulletStyle = "default") {
    if (!isStructuredBulletContent(content)) {
        return parseTextFromHtml(content);
    }

    return content
        .map(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            const level = item.level;
            const plainText = parseTextFromHtml(item.html);
            const prefix = getEditableBulletPrefix(level, bulletStyle);
            if (!plainText.trim()) {
                return prefix;
            }
            return `${prefix}${plainText}`;
        })
        .join("\n");
}

function parseEditableStructuredText(value, previousContent = []) {
    const lines = String(value || "")
        .split("\n")
        .map(raw => raw.replace(/\r/g, ""));

    const preservedHtmlByKey = new Map();
    if (Array.isArray(previousContent)) {
        previousContent.forEach(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            const plainText = parseTextFromHtml(item.html);
            const key = `${item.level}::${plainText}`;
            if (!preservedHtmlByKey.has(key)) preservedHtmlByKey.set(key, []);
            preservedHtmlByKey.get(key).push(item.html);
        });
    }

    const result = lines.map(raw => {
        const parsed = stripEditableBulletPrefix(raw);
        const normalizedText = String(parsed.text || "");
        const key = `${parsed.level}::${normalizedText}`;
        const preservedHtml = preservedHtmlByKey.has(key) ? preservedHtmlByKey.get(key).shift() : null;
        return normalizeStructuredBulletItem({
            html: preservedHtml ?? escapeHtml(normalizedText),
            level: parsed.level,
        });
    });

    // Remove empty trailing items generated by accidental trailing newlines
    while (result.length > 1 && !parseTextFromHtml(result[result.length - 1].html).trim()) {
        result.pop();
    }

    if (result.length === 0) {
        return [normalizeStructuredBulletItem({ html: "List item", level: 0 })];
    }

    return result;
}

function buildStructuredBulletEditorHtml(content, bulletStyle = "default") {
    if (!isStructuredBulletContent(content)) {
        return String(content || "");
    }

    const rows = content
        .map(rawItem => {
            const item = normalizeStructuredBulletItem(rawItem);
            const meta = getBulletLevelMeta(item.level, bulletStyle);
            const innerHtml = item.html && item.html.trim() ? item.html : "<br>";
            return `<li class="ppt-bullet-edit-item" data-level="${meta.level}" data-marker="${escapeHtml(meta.marker)}" style="--bullet-indent:${meta.indent}px;">${innerHtml}</li>`;
        })
        .join("");

    return `<ul class="ppt-bullet-edit-list" data-bullet-style="${escapeHtml(bulletStyle)}">${rows || '<li class="ppt-bullet-edit-item" data-level="0" data-marker="•" style="--bullet-indent:0px;"><br></li>'}</ul>`;
}

function parseStructuredBulletEditorHtml(host, options = {}) {
    if (!host) return [normalizeStructuredBulletItem({ html: "List item", level: 0 })];
    const preserveTrailingEmpty = Boolean(options.preserveTrailingEmpty);
    const items = Array.from(host.querySelectorAll(".ppt-bullet-edit-item")).map(item =>
        normalizeStructuredBulletItem({
            html: item.innerHTML === "<br>" ? "" : item.innerHTML,
            level: Number(item.dataset.level) || 0,
        }),
    );

    while (!preserveTrailingEmpty && items.length > 1 && !plainTextFromHtmlSnippet(items[items.length - 1].html).trim()) {
        items.pop();
    }

    return items.length ? items : [normalizeStructuredBulletItem({ html: "List item", level: 0 })];
}
