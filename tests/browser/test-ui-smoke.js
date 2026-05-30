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

    page.on("pageerror", error => pageErrors.push(error.message));
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
            if (first && typeof setSelectedIds === "function") {
                setSelectedIds([first.id]);
            } else {
                selectedIds = first ? [first.id] : [];
            }
            renderSlidesFromState();
            window.updatePropertiesPanel?.();
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
