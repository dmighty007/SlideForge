const { chromium } = require("playwright");
const path = require("path");

const TEST_URL =
    process.env.SLIDEFORGE_TEST_URL ||
    process.argv.find(arg => arg.startsWith("--url="))?.slice("--url=".length) ||
    "http://127.0.0.1:8076/";

const results = {
    passed: [],
    failed: [],
};
let cleanupPage = null;

function pass(name) {
    results.passed.push(name);
    console.log(`PASS ${name}`);
}

function fail(name, error) {
    const message = error?.stack || error?.message || String(error);
    results.failed.push({ name, message });
    console.log(`FAIL ${name}\n${message}`);
}

async function step(name, fn) {
    try {
        await fn();
        pass(name);
    } catch (error) {
        fail(name, error);
    } finally {
        if (cleanupPage) {
            await cleanupPage
                .evaluate(() => {
                    if (document.body.classList.contains("play-mode-active")) window.togglePlayMode?.();
                    window.closeAuthModal?.();
                    window.closeProjectsModal?.();
                    window.closeCommandPalette?.();
                    window.closeEquationModal?.();
                    window.closeSymbolPicker?.();
                    window.closeIconPicker?.();
                    window.closeShapePicker?.();
                    window.closeMermaidDialog?.();
                    window.closeExportMenu?.();
                    window.closeUserMenu?.();
                    window.closeLayersPopover?.();
                })
                .catch(() => {});
        }
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function boot(page) {
    await page.addInitScript(() => {
        sessionStorage.setItem("pptmaker_entry_gate_dismissed", "true");
        localStorage.setItem("pptmaker_properties_panel_visible", "1");
        window.prompt = () => "https://example.com/video.mp4";
    });

    const fallbackFileUrl = `file://${path.resolve(__dirname, "../../frontend/index.html")}`;
    try {
        await page.goto(TEST_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    } catch (error) {
        if (TEST_URL.startsWith("file://")) throw error;
        await page.goto(fallbackFileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    }

    await page.waitForFunction(
        () => {
            try {
                return (
                    typeof state !== "undefined" &&
                    Array.isArray(state.slides) &&
                    typeof renderSlidesFromState === "function" &&
                    typeof addElement === "function" &&
                    typeof togglePlayMode === "function" &&
                    typeof Reveal !== "undefined"
                );
            } catch {
                return false;
            }
        },
        null,
        { timeout: 20000 },
    );

    await page.evaluate(() => {
        state.presentationTheme = "editorial";
        state.presentationTransition = "none";
        state.slides = [
            {
                id: generateId("slide"),
                layoutId: "blank-titled",
                masterId: "content",
                notes: "",
                presentationTransition: "none",
                elements: [
                    {
                        id: generateId("el"),
                        type: "text",
                        x: 220,
                        y: 240,
                        width: 520,
                        height: 80,
                        content: "Smoke test deck",
                        styles: {
                            fontSize: "48px",
                            color: "#172033",
                            zIndex: 2,
                        },
                    },
                ],
            },
        ];
        selectedIds = [];
        currentSlideIndex = 0;
        renderSlidesFromState();
    });
}

async function appState(page) {
    return page.evaluate(() => ({
        slideCount: state.slides.length,
        currentSlideIndex,
        selectedIds: [...selectedIds],
        elements: state.slides[currentSlideIndex]?.elements?.map(el => ({
            id: el.id,
            type: el.type,
            shapeType: el.shapeType,
            connectorType: el.connectorType,
            chartType: el.chartType,
            transition: el.presentationTransition,
        })) || [],
        transitions: state.slides.map(slide => slide.presentationTransition || "none"),
        bodyClass: document.body.className,
    }));
}

async function ensureEditor(page) {
    await page.evaluate(() => {
        if (document.body.classList.contains("play-mode-active")) togglePlayMode();
        document.body.classList.remove("whiteboard-mode-active");
    });
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    context.setDefaultTimeout(7000);
    const page = await context.newPage();
    cleanupPage = page;
    const pageErrors = [];

    page.on("pageerror", error => pageErrors.push(error.stack || error.message));
    page.on("console", msg => {
        if (msg.type() === "error") {
            const text = msg.text();
            if (!/Failed to load resource.*(404|api)|Video element error/i.test(text)) pageErrors.push(text);
        }
    });

    await step("Boots editor in local workspace", async () => {
        await boot(page);
        const stateNow = await appState(page);
        assert(stateNow.slideCount === 1, "Expected one seeded slide");
        assert(!stateNow.bodyClass.includes("entry-gate-active"), "Entry gate should be dismissed");
        assert(await page.locator("#app-toolbar").isVisible(), "Toolbar should be visible");
    });

    await step("Header project buttons open expected UI", async () => {
        await page.locator("#project-title-input").fill("Smoke Test Deck");
        await page.locator("button[title='Save Project']").click();
        await page.waitForTimeout(100);
        const hint = await page.locator("#project-save-hint").innerText();
        const authOpened = await page.locator("#auth-modal").isVisible();
        assert(authOpened || /local|saved|offline|unavailable/i.test(hint), `Unexpected save hint: ${hint}`);
        if (authOpened) await page.evaluate(() => closeAuthModal());

        await page.locator("button[title='Open Saved Project']").click();
        await page.waitForTimeout(100);
        const projectsOpened = await page.locator("#projects-modal").isVisible();
        const authOpenedForProjects = await page.locator("#auth-modal").isVisible();
        const projectHint = await page.locator("#project-save-hint").innerText();
        assert(
            projectsOpened || authOpenedForProjects || /unavailable|local/i.test(projectHint),
            "Open Saved Project should open projects/auth UI or show local-mode feedback",
        );
        await page.evaluate(() => {
            closeProjectsModal();
            closeAuthModal();
        });

        await page.locator("#auth-menu-button").click();
        assert(!(await page.locator("#auth-menu").evaluate(el => el.classList.contains("hidden"))), "Account menu should open");
        await page.locator("#auth-menu-button").click();

        await page.locator("button[aria-label='Open command palette']").click();
        assert(await page.locator("#command-palette-modal").isVisible(), "Command palette should open");
        await page.keyboard.press("Escape");
    });

    await step("Slide rail add/select and slide-specific transitions work", async () => {
        await ensureEditor(page);
        await page.locator(".new-slide-btn").click();
        await page.waitForTimeout(150);
        let stateNow = await appState(page);
        assert(stateNow.slideCount === 2, "Add Slide should create a second slide");

        await page.evaluate(() => {
            currentSlideIndex = 0;
            selectedIds = [];
            renderSlidesFromState();
            window.updatePropertiesPanel?.();
        });
        await page.locator("#prop-slide-transition").selectOption("fade");

        await page.evaluate(() => {
            currentSlideIndex = 1;
            selectedIds = [];
            renderSlidesFromState();
            window.updatePropertiesPanel?.();
        });
        await page.locator("#prop-slide-transition").selectOption("diffuse");
        stateNow = await appState(page);
        assert(stateNow.transitions[0] === "fade", "Slide 1 transition should remain fade");
        assert(stateNow.transitions[1] === "diffuse", "Slide 2 transition should be diffuse");

        await page.locator("#prop-apply-transition-all").click();
        stateNow = await appState(page);
        assert(stateNow.transitions.every(value => value === "diffuse"), "Apply all should update every slide");
    });

    await step("Insert toolbar creates core element types", async () => {
        await ensureEditor(page);
        await page.evaluate(() => {
            currentSlideIndex = 0;
            selectedIds = [];
            renderSlidesFromState();
        });

        const before = (await appState(page)).elements.length;
        await page.locator("button[title='Text Block']").click();
        await page.locator("button[title='Table']").click();
        await page.locator("button[title='Bar Chart']").click();
        await page.locator("button[title='Line Chart']").click();
        await page.locator("button[title='Pie Chart']").click();
        await page.locator("button[title='Line Connector']").click();
        await page.locator("button[title='Curve Connector']").click();
        await page.locator("button[title='Polyline Connector']").click();
        await page.evaluate(() => addElement("video", { content: "https://example.com/video.mp4" }));
        await page.waitForTimeout(250);

        const types = (await appState(page)).elements.map(el => el.type);
        assert(types.length >= before + 8, "Expected inserted elements to be added");
        ["text", "table", "chart", "connector", "video"].forEach(type => {
            assert(types.includes(type), `Missing inserted ${type} element`);
        });
    });

    await step("Text formatting survives presentation mode", async () => {
        await ensureEditor(page);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            currentSlideIndex = 0;
            const slide = state.slides[0];
            const text = slide.elements.find(el => el.type === "text");
            const formatted =
                '<span style="font-weight:700;font-style:italic;text-decoration:underline;color:#db2777;font-size:44px;">Formatted Text</span>';
            text.content = formatted;
            text.textDocument =
                typeof createTextDocumentFromLegacyContent === "function"
                    ? createTextDocumentFromLegacyContent(formatted, { bulletStyle: text.bulletStyle || "default" })
                    : text.textDocument;
            text.styles = {
                ...(text.styles || {}),
                color: "#172033",
                fontSize: "32px",
                fontFamily: '"Manrope", sans-serif',
                fontWeight: "400",
                fontStyle: "normal",
            };
            renderSlidesFromState();
            await sleep(120);
            togglePlayMode();
            await sleep(700);
            const host = document.querySelector(`#${CSS.escape(text.id)} .text-element-content`);
            const span = host?.querySelector("span");
            const style = span ? getComputedStyle(span) : null;
            const value = {
                playMode: document.body.classList.contains("play-mode-active"),
                html: host?.innerHTML || "",
                fontWeight: style?.fontWeight || "",
                fontStyle: style?.fontStyle || "",
                textDecoration: style?.textDecorationLine || "",
                color: style?.color || "",
                fontSize: style?.fontSize || "",
            };
            togglePlayMode();
            await sleep(300);

            text.content = formatted;
            text.textDocument =
                typeof createTextDocumentFromLegacyContent === "function"
                    ? createTextDocumentFromLegacyContent("Stale document should not win", {
                          bulletStyle: text.bulletStyle || "default",
                      })
                    : text.textDocument;
            const persisted = getPersistableState();
            state = JSON.parse(JSON.stringify(persisted));
            currentSlideIndex = 0;
            normalizeStateIds();
            renderSlidesFromState();
            await sleep(120);
            const reloadedHost = document.querySelector(`#${CSS.escape(text.id)} .text-element-content`);
            const reloadedSpan = reloadedHost?.querySelector("span");
            const reloadedStyle = reloadedSpan ? getComputedStyle(reloadedSpan) : null;
            value.reloadedHtml = reloadedHost?.innerHTML || "";
            value.reloadedFontWeight = reloadedStyle?.fontWeight || "";
            value.reloadedTextDecoration = reloadedStyle?.textDecorationLine || "";
            value.reloadedColor = reloadedStyle?.color || "";
            value.reloadedFontSize = reloadedStyle?.fontSize || "";
            return value;
        });
        assert(result.playMode, "Presentation mode should activate for formatting check");
        assert(result.fontWeight === "700" || Number(result.fontWeight) >= 700, `Bold should survive: ${JSON.stringify(result)}`);
        assert(result.fontStyle === "italic", `Italic should survive: ${JSON.stringify(result)}`);
        assert(result.textDecoration.includes("underline"), `Underline should survive: ${JSON.stringify(result)}`);
        assert(result.color === "rgb(219, 39, 119)", `Color should survive: ${JSON.stringify(result)}`);
        assert(result.fontSize === "44px", `Inline font size should survive: ${JSON.stringify(result)}`);
        assert(
            result.reloadedFontWeight === "700" || Number(result.reloadedFontWeight) >= 700,
            `Saved/reloaded bold should use edited content: ${JSON.stringify(result)}`,
        );
        assert(
            result.reloadedTextDecoration.includes("underline"),
            `Saved/reloaded underline should survive: ${JSON.stringify(result)}`,
        );
        assert(result.reloadedColor === "rgb(219, 39, 119)", `Saved/reloaded color should survive: ${JSON.stringify(result)}`);
        assert(result.reloadedFontSize === "44px", `Saved/reloaded font size should survive: ${JSON.stringify(result)}`);
    });

    await step("Multiple text boxes support shared formatting without hover toolbar", async () => {
        await ensureEditor(page);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            state.slides = [
                {
                    id: generateId("slide"),
                    layoutId: "blank-titled",
                    masterId: "content",
                    notes: "",
                    presentationTransition: "none",
                    elements: [
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 180,
                            y: 180,
                            width: 360,
                            height: 90,
                            content: "First box",
                            styles: { color: "#172033", fontSize: "30px", fontFamily: '"Manrope", sans-serif', fontWeight: "400", textAlign: "left", zIndex: 2 },
                        },
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 180,
                            y: 320,
                            width: 360,
                            height: 90,
                            content: "Second box",
                            styles: { color: "#172033", fontSize: "30px", fontFamily: '"Manrope", sans-serif', fontWeight: "400", textAlign: "left", zIndex: 3 },
                        },
                    ],
                },
            ];
            currentSlideIndex = 0;
            normalizeStateIds();
            renderSlidesFromState();
            await sleep(120);

            const selectedTextIds = state.slides[0].elements.slice(0, 2).map(el => el.id);
            selectElement(selectedTextIds[0], "replace");
            selectElement(selectedTextIds[1], "add");
            await sleep(120);
            const toolbar = document.getElementById("floating-text-toolbar");
            const multiToolbarHidden = toolbar.classList.contains("hidden");
            const sharedPanelVisible = Boolean(document.getElementById("prop-shared-text-style"));

            document.getElementById("prop-shared-text-size").value = "46";
            document.getElementById("prop-shared-text-size").dispatchEvent(new Event("change", { bubbles: true }));
            await sleep(80);
            document.getElementById("prop-shared-text-color").value = "#db2777";
            document.getElementById("prop-shared-text-color").dispatchEvent(new Event("input", { bubbles: true }));
            document.getElementById("prop-shared-text-color").dispatchEvent(new Event("change", { bubbles: true }));
            await sleep(80);
            document.querySelector('#prop-shared-text-style [data-prop="fontWeight"]').click();
            await sleep(80);
            document.querySelector('#prop-shared-text-style [data-prop="textDecoration"]').click();
            await sleep(80);
            document.querySelector('#prop-shared-text-align [data-align="center"]').click();
            await sleep(120);

            const afterBatch = state.slides[0].elements
                .filter(el => selectedTextIds.includes(el.id))
                .map(el => ({
                    fontSize: el.styles.fontSize,
                    color: el.styles.color,
                    fontWeight: el.styles.fontWeight,
                    textDecoration: el.styles.textDecoration,
                    textAlign: el.styles.textAlign,
                    themeManaged: el.themeManaged,
                }));
            const firstDom = document.querySelector(
                `#slides-container .presentation-slide[data-slide-index="0"] #${CSS.escape(selectedTextIds[0])}`,
            );
            firstDom.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            await sleep(180);
            const hoverToolbarHiddenAfterMulti = toolbar.classList.contains("hidden");
            selectElement(selectedTextIds[0], "replace");
            await sleep(120);
            const singleSelectedToolbarHidden = toolbar.classList.contains("hidden");
            firstDom.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
            await sleep(250);
            return {
                multiToolbarHidden,
                sharedPanelVisible,
                afterBatch,
                hoverToolbarHiddenAfterMulti,
                singleSelectedToolbarHidden,
                editModeToolbarVisible: !toolbar.classList.contains("hidden"),
                editing: document.getElementById(selectedTextIds[0])?.classList.contains("editing-text"),
            };
        });
        assert(result.multiToolbarHidden, "Floating text toolbar should stay hidden for multi-text selection");
        assert(result.sharedPanelVisible, "Shared text style controls should be visible for multi-text selection");
        assert(result.hoverToolbarHiddenAfterMulti, "Hover toolbar should not appear while text boxes are multi-selected");
        assert(result.singleSelectedToolbarHidden, "Single selection should not show text toolbar until edit mode");
        assert(result.editModeToolbarVisible && result.editing, "Double click/edit mode should show the text toolbar");
        assert(
            result.afterBatch.every(
                el =>
                    el.fontSize === "46px" &&
                    /^#?db2777$/i.test(el.color) &&
                    ["700", "bold"].includes(String(el.fontWeight).toLowerCase()) &&
                    String(el.textDecoration || "").includes("underline") &&
                    el.textAlign === "center" &&
                    el.themeManaged === false,
            ),
            `Shared text formatting should apply to both selected boxes: ${JSON.stringify(result)}`,
        );
    });

    await step("Multi-selection bound does not block objects inside its empty area", async () => {
        await ensureEditor(page);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            state.slides = [
                {
                    id: generateId("slide"),
                    layoutId: "blank-titled",
                    masterId: "content",
                    notes: "",
                    presentationTransition: "none",
                    elements: [
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 120,
                            y: 120,
                            width: 320,
                            height: 80,
                            content: "Left",
                            styles: { color: "#172033", fontSize: "30px", zIndex: 2 },
                        },
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 680,
                            y: 470,
                            width: 320,
                            height: 80,
                            content: "Right",
                            styles: { color: "#172033", fontSize: "30px", zIndex: 3 },
                        },
                        {
                            id: generateId("el"),
                            type: "shape",
                            shapeType: "rectangle",
                            x: 455,
                            y: 295,
                            width: "120px",
                            height: "90px",
                            content: "",
                            styles: { backgroundColor: "#db2777", borderRadius: "8px", zIndex: 20 },
                        },
                    ],
                },
            ];
            currentSlideIndex = 0;
            normalizeStateIds();
            renderSlidesFromState();
            await sleep(120);

            const [left, right, shape] = state.slides[0].elements;
            selectElement(left.id, "replace");
            selectElement(right.id, "add");
            updateGroupBound();
            await sleep(120);

            const shapeDom = document.querySelector(
                `#slides-container .presentation-slide[data-slide-index="0"] #${CSS.escape(shape.id)}`,
            );
            const shapeRect = shapeDom.getBoundingClientRect();
            const x = shapeRect.left + shapeRect.width / 2;
            const y = shapeRect.top + shapeRect.height / 2;
            const hitBeforeClick = document.elementFromPoint(x, y)?.closest?.(".canvas-element, #group-bound")?.id || "";
            const bound = document.getElementById("group-bound");
            const boundPointerEvents = getComputedStyle(bound).pointerEvents;
            const handlePointerEvents = getComputedStyle(bound.querySelector(".resize-handle.br")).pointerEvents;

            document.elementFromPoint(x, y)?.dispatchEvent(
                new PointerEvent("pointerdown", {
                    bubbles: true,
                    clientX: x,
                    clientY: y,
                    pointerId: 1,
                    pointerType: "mouse",
                    button: 0,
                }),
            );
            document.elementFromPoint(x, y)?.dispatchEvent(
                new MouseEvent("mousedown", {
                    bubbles: true,
                    clientX: x,
                    clientY: y,
                    button: 0,
                }),
            );
            document.elementFromPoint(x, y)?.dispatchEvent(
                new PointerEvent("pointerup", {
                    bubbles: true,
                    clientX: x,
                    clientY: y,
                    pointerId: 1,
                    pointerType: "mouse",
                    button: 0,
                }),
            );
            document.elementFromPoint(x, y)?.dispatchEvent(
                new MouseEvent("mouseup", {
                    bubbles: true,
                    clientX: x,
                    clientY: y,
                    button: 0,
                }),
            );
            shapeDom.click();
            await sleep(160);
            return {
                selectedIds: [...state.selectedIds],
                shapeId: shape.id,
                hitBeforeClick,
                boundPointerEvents,
                handlePointerEvents,
                groupBoundHidden: bound.classList.contains("hidden"),
            };
        });
        assert(result.hitBeforeClick === result.shapeId, `Selection bound should not intercept hit testing: ${JSON.stringify(result)}`);
        assert(result.boundPointerEvents === "none", "Group bound should be visual-only");
        assert(result.handlePointerEvents === "auto", "Group resize handles should remain interactive");
        assert(
            result.selectedIds.length === 1 && result.selectedIds[0] === result.shapeId && result.groupBoundHidden,
            `Clicking through group bound should select the object: ${JSON.stringify(result)}`,
        );
    });

    await step("Selection highlights stay scoped to the active slide", async () => {
        await ensureEditor(page);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            state.slides = [
                {
                    id: generateId("slide"),
                    layoutId: "blank-titled",
                    masterId: "content",
                    notes: "",
                    presentationTransition: "none",
                    elements: [
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 120,
                            y: 130,
                            width: 260,
                            height: 80,
                            content: "Slide 1 text",
                            styles: { color: "#172033", fontSize: "30px", zIndex: 2 },
                        },
                        {
                            id: generateId("el"),
                            type: "shape",
                            shapeType: "rectangle",
                            x: 450,
                            y: 150,
                            width: "120px",
                            height: "90px",
                            content: "",
                            styles: { backgroundColor: "#2563eb", zIndex: 3 },
                        },
                    ],
                },
                {
                    id: generateId("slide"),
                    layoutId: "blank-titled",
                    masterId: "content",
                    notes: "",
                    presentationTransition: "none",
                    elements: [
                        {
                            id: generateId("el"),
                            type: "text",
                            x: 160,
                            y: 360,
                            width: 260,
                            height: 80,
                            content: "Slide 2 text",
                            styles: { color: "#172033", fontSize: "30px", zIndex: 2 },
                        },
                        {
                            id: generateId("el"),
                            type: "shape",
                            shapeType: "rectangle",
                            x: 640,
                            y: 420,
                            width: "130px",
                            height: "90px",
                            content: "",
                            styles: { backgroundColor: "#db2777", zIndex: 3 },
                        },
                    ],
                },
            ];
            currentSlideIndex = 0;
            normalizeStateIds();
            renderSlidesFromState();
            await sleep(120);

            const slide0Text = state.slides[0].elements[0];
            const slide0Shape = state.slides[0].elements[1];
            selectElement(slide0Text.id, "replace");
            await sleep(80);
            const slide0Selected = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.selected"),
            ).map(el => el.id);
            const offSlideSelectedAfterSlide0 = Array.from(
                document.querySelectorAll(".presentation-slide:not([data-slide-index='0']) .canvas-element.selected, .presentation-slide:not([data-slide-index='0']) .canvas-element.group-member-selected"),
            ).map(el => el.id);

            selectElement(slide0Shape.id, "replace");
            await sleep(80);
            const selectedAfterReplace = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.selected"),
            ).map(el => el.id);
            const staleGroupAfterReplace = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.group-member-selected"),
            ).map(el => el.id);

            selectElement(slide0Text.id, "add");
            await sleep(120);
            const groupMembers = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.group-member-selected"),
            ).map(el => el.id);
            const selectedInMulti = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.selected"),
            ).map(el => el.id);
            const bound = document.getElementById("group-bound");
            const boundRect = bound.getBoundingClientRect();
            const memberRects = groupMembers.map(id =>
                document
                    .querySelector(`.presentation-slide[data-slide-index='0'] #${CSS.escape(id)}`)
                    .getBoundingClientRect(),
            );
            const boundMatches =
                Math.abs(boundRect.left - Math.min(...memberRects.map(rect => rect.left))) < 8 &&
                Math.abs(boundRect.top - Math.min(...memberRects.map(rect => rect.top))) < 8 &&
                Math.abs(boundRect.right - Math.max(...memberRects.map(rect => rect.right))) < 8 &&
                Math.abs(boundRect.bottom - Math.max(...memberRects.map(rect => rect.bottom))) < 8;
            const boundHiddenInMulti = bound.classList.contains("hidden");

            currentSlideIndex = 1;
            renderSlidesFromState();
            await sleep(120);
            const slide1Shape = state.slides[1].elements[1];
            selectElement(slide1Shape.id, "replace");
            await sleep(120);
            const slide1Selected = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='1'] .canvas-element.selected"),
            ).map(el => el.id);
            const staleSlide0Selection = Array.from(
                document.querySelectorAll(".presentation-slide[data-slide-index='0'] .canvas-element.selected, .presentation-slide[data-slide-index='0'] .canvas-element.group-member-selected"),
            ).map(el => el.id);

            return {
                slide0TextId: slide0Text.id,
                slide0ShapeId: slide0Shape.id,
                slide1ShapeId: slide1Shape.id,
                slide0Selected,
                offSlideSelectedAfterSlide0,
                selectedAfterReplace,
                staleGroupAfterReplace,
                groupMembers,
                selectedInMulti,
                boundHiddenInMulti,
                boundMatches,
                slide1Selected,
                staleSlide0Selection,
            };
        });
        assert(result.slide0Selected.length === 1 && result.slide0Selected[0] === result.slide0TextId, `Initial selection should paint slide 0 text only: ${JSON.stringify(result)}`);
        assert(result.offSlideSelectedAfterSlide0.length === 0, `Selection should not paint off-slide nodes: ${JSON.stringify(result)}`);
        assert(result.selectedAfterReplace.length === 1 && result.selectedAfterReplace[0] === result.slide0ShapeId, `Replace selection should clear old highlight: ${JSON.stringify(result)}`);
        assert(result.staleGroupAfterReplace.length === 0, `Replace selection should clear stale group highlights: ${JSON.stringify(result)}`);
        assert(result.groupMembers.length === 2 && result.groupMembers.includes(result.slide0TextId) && result.groupMembers.includes(result.slide0ShapeId), `Multi-select should paint both selected members: ${JSON.stringify(result)}`);
        assert(result.selectedInMulti.length === 0, `Multi-select should not leave single selected outlines: ${JSON.stringify(result)}`);
        assert(!result.boundHiddenInMulti && result.boundMatches, `Group bound should match current selected members: ${JSON.stringify(result)}`);
        assert(result.slide1Selected.length === 1 && result.slide1Selected[0] === result.slide1ShapeId, `Slide switch should paint only slide 1 selection: ${JSON.stringify(result)}`);
        assert(result.staleSlide0Selection.length === 0, `Slide switch should clear stale slide 0 highlights: ${JSON.stringify(result)}`);
    });

    await step("Picker and modal entry points open and close", async () => {
        await page.locator("button[title='LaTeX Equation']").click();
        assert(await page.locator("#equation-modal").isVisible(), "Equation modal should open");
        await page.locator("#equation-input").fill("\\\\frac{a}{b}");
        await page.waitForTimeout(100);
        await page.evaluate(() => closeEquationModal());

        await page.locator("button[title='Symbols']").click();
        assert(await page.locator("#symbol-picker-modal").isVisible(), "Symbol picker should open");
        await page.evaluate(() => closeSymbolPicker());

        await page.locator("button[title='Icons']").click();
        assert(await page.locator("#icon-picker-modal").isVisible(), "Icon picker should open");
        await page.locator("#icon-search-input").fill("star");
        await page.evaluate(() => closeIconPicker());

        await page.locator("button[title='Shapes and Arrows']").click();
        assert(await page.locator("#shape-picker-modal").isVisible(), "Shape picker should open");
        await page.locator(".shape-picker-item").first().click();
        await page.waitForTimeout(100);
        const hasShape = (await appState(page)).elements.some(el => el.type === "shape");
        assert(hasShape, "Shape picker should insert a shape");

        await page.locator("button[title='Flowchart / Mermaid Diagram']").click();
        await page.waitForTimeout(300);
        assert(await page.locator("#mermaid-dialog").isVisible(), "Mermaid dialog should open");
        await page.keyboard.press("Escape");
    });

    await step("Properties, layers, timeline, and export panels toggle", async () => {
        await page.locator("#toggle-properties-panel").click();
        await page.waitForTimeout(50);
        await page.locator("#toggle-properties-panel").click();
        assert(await page.locator("#properties-panel").isVisible(), "Properties panel should be visible after toggle");

        await page.locator("#toggle-layers-popover").click();
        assert(!(await page.locator("#layers-popover").evaluate(el => el.classList.contains("hidden"))), "Layers popover should open");
        await page.locator("#toggle-layers-popover").click();

        await page.locator("#toggle-timeline-editor").click();
        await page.waitForTimeout(100);
        const timelineDisplay = await page.locator("#timeline-editor-panel").evaluate(el => getComputedStyle(el).display);
        assert(timelineDisplay !== "none", "Timeline panel should open");
        await page.locator("#toggle-timeline-editor").click();

        await page.locator("#export-menu-container > button").click();
        assert(await page.locator("#export-menu-dropdown").evaluate(el => el.classList.contains("show")), "Export menu should open");
        await page.locator("#export-menu-container > button").click();
    });

    await step("Selection, copy/paste, undo, and redo operate on elements", async () => {
        await page.evaluate(() => {
            currentSlideIndex = 0;
            const first = state.slides[0].elements.find(el => el.type === "text");
            renderSlidesFromState();
            if (first && typeof selectElement === "function") {
                selectElement(first.id, "replace");
            } else if (first && typeof setSelectedIds === "function") {
                setSelectedIds([first.id]);
                updateGroupBound?.();
                window.updatePropertiesPanel?.();
            }
        });
        const beforeCopy = (await appState(page)).elements.length;
        await page.locator("button[title='Copy Selected Element']").click();
        await page.locator("button[title='Paste From Clipboard']").click();
        await page.waitForTimeout(150);
        assert((await appState(page)).elements.length === beforeCopy + 1, "Paste should duplicate selected element");

        await page.locator("#btn-undo").click();
        await page.waitForTimeout(100);
        assert((await appState(page)).elements.length === beforeCopy, "Undo should remove pasted element");

        await page.locator("#btn-redo").click();
        await page.waitForTimeout(100);
        assert((await appState(page)).elements.length === beforeCopy + 1, "Redo should restore pasted element");
    });

    await step("Whiteboard mode and slide rail controls toggle cleanly", async () => {
        await page.locator("#btn-whiteboard-toggle").click();
        await page.waitForTimeout(100);
        assert((await page.evaluate(() => document.body.classList.contains("whiteboard-mode-active"))), "Whiteboard mode should activate");
        await page.locator("#btn-whiteboard-toggle").click();
        await page.waitForTimeout(100);
        assert(!(await page.evaluate(() => document.body.classList.contains("whiteboard-mode-active"))), "Whiteboard mode should deactivate");

        await page.locator("button[aria-label='Collapse slide rail']").click();
        await page.waitForTimeout(100);
        assert(await page.evaluate(() => document.body.classList.contains("slide-rail-collapsed")), "Slide rail should collapse");
        await page.evaluate(() => toggleSlideRail());
        await page.waitForTimeout(100);
        assert(!(await page.evaluate(() => document.body.classList.contains("slide-rail-collapsed"))), "Slide rail should expand");
        assert(await page.locator("#slide-rail").isVisible(), "Slide rail should be restored");
    });

    await step("Presentation mode uses Reveal-native transitions and exits", async () => {
        await page.evaluate(() => {
            if (!state.slides[1]) {
                state.slides.push({
                    id: generateId("slide"),
                    layoutId: "blank-titled",
                    masterId: "content",
                    notes: "",
                    presentationTransition: "diffuse",
                    elements: [],
                });
            }
            currentSlideIndex = 0;
            state.slides[0].presentationTransition = "fade";
            state.slides[1].presentationTransition = "diffuse";
            renderSlidesFromState();
        });
        await page.locator("#btn-present").click();
        await page.waitForFunction(() => document.body.classList.contains("play-mode-active"));
        assert(await page.locator("#present-menu-toggle").count(), "Presentation menu button should exist");
        await page.waitForTimeout(350);

        await page.evaluate(() => {
            presentationGoToSlide(0);
            presentationGoToSlide(1);
        });
        await page.waitForTimeout(150);
        const revealConfig = await page.evaluate(() => ({
            transition: Reveal.getConfig().transition,
            cloneCount: document.querySelectorAll(".presentation-slide-transition-clone").length,
            currentSlideIndex,
            slideCount: state.slides.length,
        }));
        assert(
            revealConfig.currentSlideIndex === 1,
            `presentationGoToSlide should advance slide: ${JSON.stringify(revealConfig)}`,
        );
        assert(revealConfig.transition === "fade", "Diffuse should map to Reveal fade");
        assert(revealConfig.cloneCount === 0, "Custom transition clones should not be used");

        await page.evaluate(() => togglePresentationMenu());
        assert(!(await page.locator("#present-menu").evaluate(el => el.classList.contains("hidden"))), "Presentation menu should open");
        await page.evaluate(() => togglePlayMode());
        await page.waitForFunction(() => !document.body.classList.contains("play-mode-active"));
    });

    await step("Keyboard shortcuts expose command palette and shortcuts modal", async () => {
        await ensureEditor(page);
        await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
        assert(await page.locator("#command-palette-modal").isVisible(), "Ctrl/Cmd+K should open command palette");
        await page.keyboard.press("Escape");

        await page.evaluate(() => openShortcutsModal());
        assert(await page.locator("#shortcuts-modal").isVisible(), "F1 should open shortcuts modal");
        await page.keyboard.press("Escape");
    });

    await step("No unexpected browser errors during smoke pass", async () => {
        const filtered = pageErrors.filter(message => !/Failed to load resource.*(404|api)|Video element error/i.test(message));
        assert(filtered.length === 0, `Unexpected browser errors:\n${filtered.join("\n")}`);
    });

    await browser.close();

    console.log("\nUI SMOKE TEST SUMMARY");
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    if (results.failed.length) {
        results.failed.forEach(item => console.log(`- ${item.name}: ${item.message.split("\n")[0]}`));
        process.exit(1);
    }
})();
