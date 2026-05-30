# SlideForge Functional Test Plan

Run this checklist after changes that affect UI logic, presentation mode, slide rendering, element editing, persistence, or export.

## Automated Smoke Coverage

Run:

```sh
npm run check:frontend
SLIDEFORGE_TEST_URL=http://127.0.0.1:8076/ npm run test:ui
```

If no static server is running, start one from `frontend/` first:

```sh
python3 -m http.server 8076
```

## Functional Checklist

1. App boot
   - Entry gate can be dismissed.
   - Local workspace loads without blocking overlays.
   - Toolbar, slide rail, canvas, and properties panel render.

2. Header and project controls
   - Project title can be edited.
   - Save gives clear local/offline/account feedback.
   - Open Saved Project opens and closes cleanly.
   - Account menu opens and shows local/auth actions.
   - Command palette opens from toolbar and keyboard.
   - Undo, redo, copy, paste buttons work without throwing.
   - Properties, layers, timeline, present, and export buttons toggle the expected UI.

3. Slide management
   - Add slide creates a new slide and updates slide counter/rail.
   - Selecting slides changes the active slide.
   - Slide rail collapse/expand works.
   - Slide-specific transition values stay independent.
   - Apply transition to all slides intentionally updates every slide.

4. Insert workflows
   - Text, table, chart, shape, connector, sketch, video placeholder, equation, symbol, icon, Mermaid, whiteboard, and file-input entry points are reachable.
   - Inserted elements appear in state and render on the canvas.
   - Pickers and modals open, accept basic input/search, and close.

5. Properties and editing
   - Selecting an element opens relevant properties.
   - Text formatting controls remain usable.
   - Layers popover lists elements and layer controls do not throw.
   - Timeline panel opens and closes.

6. Presentation mode
   - Present enters play mode and hides editor chrome.
   - Next/previous slide navigation works.
   - Cross-slide transitions use Reveal.js native transitions.
   - Fade uses Reveal `fade`.
   - Diffuse maps to Reveal `fade` unless a real Reveal-compatible diffuse plugin is added.
   - No custom `.presentation-slide-transition-clone` layers are created.
   - Presentation menu, laser/chalk controls, and exit work.

7. Keyboard and accessibility basics
   - `Ctrl/Cmd+K` opens command palette.
   - `F1` opens shortcuts.
   - `Escape` closes transient UI or exits the current mode.
   - Header toggle buttons update visible state/pressed state where applicable.

8. Export menu
   - Export dropdown opens.
   - ZIP, PDF, PNG, SVG, PPTX, and JSON commands are present.
   - Heavy export commands should be tested manually before release when export code changes.

9. Regression watch
   - No unexpected browser console errors.
   - No hidden overlay blocks main editor interaction.
   - No presentation transition strobe, clone leak, or global transition override.
   - No unrelated localStorage/sessionStorage state is required for a clean start.
