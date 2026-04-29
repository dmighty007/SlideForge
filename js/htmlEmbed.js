const EMBED_STYLE_ID = "pptmaker-embed-style";
const EMBED_SCRIPT_ID = "pptmaker-embed-script";
const AUTOFIT_ROOT_ID = "pptmaker-autofit-root";

function ensureDocumentShell(content) {
    const raw = String(content || "");
    if (/<html[\s>]/i.test(raw)) {
        return raw;
    }
    return `<!doctype html><html><head></head><body>${raw}</body></html>`;
}

function ensureHead(doc) {
    if (/<head[\s>]/i.test(doc)) {
        return doc;
    }
    return doc.replace(/<html([^>]*)>/i, "<html$1><head></head>");
}

function ensureBody(doc) {
    if (/<body[\s>]/i.test(doc)) {
        return doc;
    }
    if (/<\/head>/i.test(doc)) {
        return doc.replace(/<\/head>/i, "</head><body></body>");
    }
    return doc.replace(/<\/html>/i, "<body></body></html>");
}

function injectIntoHead(doc, markup) {
    if (/<\/head>/i.test(doc)) {
        return doc.replace(/<\/head>/i, `${markup}</head>`);
    }
    return doc.replace(/<html([^>]*)>/i, `<html$1><head>${markup}</head>`);
}

function injectIntoBodyEnd(doc, markup) {
    if (/<\/body>/i.test(doc)) {
        return doc.replace(/<\/body>/i, `${markup}</body>`);
    }
    return doc.replace(/<\/html>/i, `<body>${markup}</body></html>`);
}

function buildResponsiveStyles(mode) {
    const isAutofit = mode === "autofit";
    return `
        <style id="${EMBED_STYLE_ID}">
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background: transparent;
            }

            body {
                position: relative;
                overflow: ${isAutofit ? "hidden" : "auto"};
            }

            img, svg, video, canvas, iframe {
                max-width: 100%;
            }

            #${AUTOFIT_ROOT_ID} {
                position: absolute;
                top: 0;
                left: 0;
                transform-origin: top left;
            }
        </style>
    `;
}

function buildAutofitScript(mode) {
    return `
        <script id="${EMBED_SCRIPT_ID}">
            (() => {
                const mode = ${JSON.stringify(mode)};
                const rootId = ${JSON.stringify(AUTOFIT_ROOT_ID)};
                let rafId = 0;

                function scheduleApply() {
                    if (rafId) return;
                    rafId = window.requestAnimationFrame(() => {
                        rafId = 0;
                        applyResponsiveMode();
                    });
                }

                function wrapBodyChildren() {
                    if (mode !== "autofit") return null;
                    const body = document.body;
                    if (!body) return null;

                    let root = document.getElementById(rootId);
                    if (root) return root;

                    root = document.createElement("div");
                    root.id = rootId;
                    const nodes = Array.from(body.childNodes);
                    nodes.forEach(node => {
                        if (node !== root) root.appendChild(node);
                    });
                    body.appendChild(root);
                    return root;
                }

                function applyResponsiveMode() {
                    const body = document.body;
                    if (!body) return;

                    document.documentElement.style.overflow = mode === "autofit" ? "hidden" : "auto";
                    body.style.overflow = mode === "autofit" ? "hidden" : "auto";

                    if (mode !== "autofit") return;

                    const root = wrapBodyChildren();
                    if (!root) return;

                    root.style.transform = "scale(1)";
                    root.style.left = "0px";
                    root.style.top = "0px";

                    const rawWidth = Math.max(root.scrollWidth, root.offsetWidth, root.getBoundingClientRect().width, 1);
                    const rawHeight = Math.max(root.scrollHeight, root.offsetHeight, root.getBoundingClientRect().height, 1);
                    const scale = window.innerWidth / rawWidth;
                    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
                    const fittedWidth = rawWidth * safeScale;
                    const fittedHeight = rawHeight * safeScale;

                    root.style.transform = "scale(" + safeScale + ")";
                    root.style.left = Math.max(0, (window.innerWidth - fittedWidth) / 2) + "px";
                    root.style.top = "0px";
                    body.style.overflowY = fittedHeight > window.innerHeight ? "auto" : "hidden";
                }

                function boot() {
                    scheduleApply();

                    window.addEventListener("load", scheduleApply);
                    window.addEventListener("resize", scheduleApply);

                    if (mode !== "autofit") return;

                    if (window.ResizeObserver) {
                        const observer = new ResizeObserver(() => scheduleApply());
                        observer.observe(document.documentElement);
                        if (document.body) observer.observe(document.body);
                    }

                    const mutationObserver = new MutationObserver(() => scheduleApply());
                    mutationObserver.observe(document.documentElement, {
                        childList: true,
                        subtree: true,
                    });

                    setTimeout(scheduleApply, 0);
                    setTimeout(scheduleApply, 120);
                }

                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", boot, { once: true });
                } else {
                    boot();
                }
            })();
        </script>
    `;
}

function normalizeHtmlMode(elData) {
    return elData?.htmlMode === "autofit" ? "autofit" : "responsive";
}

function buildHtmlEmbedSrcdoc(content, elData = {}) {
    let doc = ensureDocumentShell(content);
    doc = ensureHead(doc);
    doc = ensureBody(doc);

    if (!/name=["']viewport["']/i.test(doc)) {
        doc = injectIntoHead(doc, '<meta name="viewport" content="width=device-width, initial-scale=1" />');
    }

    const mode = normalizeHtmlMode(elData);
    doc = injectIntoHead(doc, buildResponsiveStyles(mode));
    doc = injectIntoBodyEnd(doc, buildAutofitScript(mode));
    return doc;
}
