# SlideForge Functionality Reference

This document describes the main user-facing functionality in SlideForge and the related implementation areas. It is intended as a comprehensive product and QA reference for the editor.

## 1. App Shell And Workspace

SlideForge is a browser-based presentation editor with a canvas workspace, slide rail, properties panel, layers panel, animation timeline, presenter mode, and export menu.

Core workspace regions:

- **Top toolbar**: project actions, command palette, undo/redo, copy/paste, properties, layers, timeline, AI cleanup, present, export, and account controls.
- **Insert toolbar**: element insertion tools for text, tables, media, charts, diagrams, equations, symbols, icons, shapes, connectors, whiteboard, sketch board, PDFs, HTML, and molecular files.
- **Slide rail**: deck thumbnails, slide selection, new slide creation, slide ordering UI, and collapse/expand behavior.
- **Canvas**: Reveal.js-backed slide surface used for both editing and presentation mode.
- **Properties panel**: slide-level settings when nothing is selected, and element-specific settings when an element is selected.
- **Layers popover**: ordered slide element list with layer selection, visibility toggles, and bring-forward/send-backward actions.
- **Timeline panel**: motion and animation editing surface.

Relevant files:

- `frontend/index.html`
- `frontend/js/core/main.js`
- `frontend/js/core/commands.js`
- `frontend/js/editor/render.js`
- `frontend/js/properties.js`
- `frontend/css/layout.css`
- `frontend/css/components.css`

## 2. Project And Account Controls

The header project controls support local and backend-backed workflows.

Available actions:

- **New Project**: resets the current deck to a fresh presentation state.
- **Open Saved Project**: opens the saved-project modal and uses backend project APIs when available.
- **Project title**: inline editable title stored with the presentation.
- **Save Project**: saves to the backend when authenticated/API is available, otherwise gives clear local/offline feedback.
- **Account menu**: sign in, register, session state, and sign out actions.
- **Autosave status**: visible toolbar metadata for save/autosave state.

Backend API coverage includes:

- Authentication: register, login, logout, session.
- Asset upload.
- Presentation create/read/update/delete.
- PPTX export endpoint.

## 3. Command Palette And Global Commands

The command palette opens from the toolbar or keyboard and exposes common editor actions. It is intended as a fast-access layer for users who know the command they want.

Related global commands:

- Open command palette: `Ctrl/Cmd+K`.
- Open shortcuts/help: `F1`.
- Undo: `Ctrl/Cmd+Z`.
- Redo: `Ctrl/Cmd+Y`.
- Escape: close transient UI, exit active mode, or return focus depending on context.

## 4. Slide Management

Slide management is centered in the slide rail.

Supported behavior:

- Add new slides.
- Select active slide by clicking a thumbnail.
- Render live thumbnails from slide state.
- Collapse and expand the slide rail.
- Preserve active slide index across render updates.
- Keep slide numbers and footer elements in sync.
- Maintain slide-specific transition settings.
- Apply a transition to all slides intentionally through the slide properties panel.

Slide state includes:

- Slide ID.
- Layout ID.
- Master slide ID.
- Notes.
- Background.
- Slide-specific transition.
- Elements.
- Whiteboard annotations.

## 5. Slide Layouts, Presets, And Master Slides

SlideForge includes a preset layout browser and master slide system.

Preset functionality:

- Apply a preset layout to the active slide.
- Insert a new slide from a preset.
- Search preset layouts.
- Filter presets by category.
- Recommended presets can react to the current slide content, theme, and recent choices.
- Presets are designed to be minimal, aesthetic, and theme-aware.

Master slide functionality:

- `content` master for footer, slide number, and subtle rule.
- `title` master for title treatment.
- `section` master for section divider treatment.
- `none` master for slides without shared master elements.
- Master footer text, logo text, slide number visibility, and footer visibility can be edited.
- Master elements are rebuilt theme-aware during slide rendering.

Related files:

- `frontend/js/editor/slide-presets.js`
- `frontend/js/editor/masterSlides.js`
- `frontend/js/properties.js`

## 6. Themes

Themes define presentation-level visual tokens used by slides, presets, master slides, elements, and 3D backgrounds.

Theme-controlled values include:

- Slide background.
- Foreground text color.
- Muted text color.
- Accent colors.
- Surface colors.
- Borders.
- Shape defaults.
- Heading and body fonts.
- Reveal.js theme mapping.

Important behavior:

- Theme changes retint theme-managed text, shapes, connectors, and tables.
- Locally customized colors can opt out of theme retinting.
- Presentation mode avoids abrupt theme CSS reloads while the deck is being presented.
- Slide rendering reads the active theme but should not mutate theme state as a side effect.

Related files:

- `frontend/js/editor/themes.js`
- `frontend/js/editor/render.js`
- `frontend/js/editor/slide-presets.js`

## 7. Slide Backgrounds

Slide backgrounds support media, adjustments, and theme-adaptive 3D motion.

Supported background types:

- **Image URL or upload**: rendered as a cover/contain/fill image behind slide content.
- **GIF**: treated as image background.
- **Video URL or upload**: rendered muted, looped, and autoplayed only when the slide is active.
- **Theme 3D background**: animated Three.js/canvas background that adapts to the active presentation theme.

Shared adjustment controls:

- Opacity.
- Blur.
- Brightness.
- Saturation.

Image/video fit controls:

- Cover.
- Contain.
- Stretch.

### 7.1 Theme 3D Background Mode

The integrated 3D background mode is available in the slide properties panel under **Slide Background**.

Current style options:

- Orbital field.
- Connected mesh.
- Soft particles.
- Depth lattice.
- Wave surface.
- Vortex spiral.

Behavior:

- Clicking **Use Theme 3D Background** applies the current selected style.
- Changing the style dropdown applies the 3D background directly.
- The selected style is stored per slide.
- The background adapts to the current theme colors.
- The renderer uses Three.js when `window.THREE` is available.
- A canvas fallback is used when Three.js is unavailable.
- Inactive slides idle their 3D animation loop to avoid unnecessary work.
- Presentation mode keeps the active 3D slide background correctly sized and active.

Relevant state shape:

```json
{
  "type": "three",
  "content": "theme-motion",
  "style": "orbital",
  "fit": "cover",
  "opacity": 0.92,
  "blur": 0,
  "brightness": 100,
  "saturate": 100
}
```

Note: older experimental 3D background documents and files may describe a larger legacy style catalog. The currently integrated slide background control uses the six styles listed above.

## 8. Insertable Elements

SlideForge supports a broad set of element types.

### 8.1 Text

Text blocks support:

- Rich inline editing.
- Font family and size.
- Weight, style, underline, and other inline formatting.
- Text color.
- Alignment.
- Auto-height and text fitting behavior.
- Structured bullet handling.
- Text effects such as shadow/glow/outline presets.
- Theme-managed color retinting.
- Fragment animations for bullet rows in presentation mode.

### 8.2 Tables

Tables support:

- Table insertion.
- Row/column/cell selection.
- Header and body styling.
- Theme retinting for fills, text, and borders.
- Layering and regular element operations.

### 8.3 Charts

Chart insertion supports:

- Bar charts.
- Line charts.
- Pie charts.

Charts are rendered as slide elements and can be moved, resized, layered, and styled through the element/property system.

### 8.4 Images

Image workflows include:

- Local image file upload.
- Canvas rendering as a moveable/resizable element.
- Cropping and crop lock/clamp behavior.
- Layer management.
- Export handling.

### 8.5 Video

Video workflows include:

- Video URL element.
- Local video import.
- Video playback controls.
- Mute, autoplay, loop, and volume controls.
- Timeline scrub and play/pause dashboard.
- Presentation mode lifecycle so inactive videos pause.

### 8.6 PDF

PDF workflows include:

- Local PDF upload.
- PDF embed element.
- Interactive mode.
- Fit-to-slide behavior.
- PDF annotations and annotation deletion/clear controls.

### 8.7 HTML Embed

HTML embed workflows include:

- Local HTML file upload.
- Sandboxed frame rendering.
- Presentation mode behavior for embedded content.

### 8.8 Molecule / Scientific Files

Molecular embed workflows include:

- PDB or trajectory upload entry point.
- Molecule frame rendering.
- Representation style controls such as cartoon, stick, sphere, line, and surface.
- Coloring controls such as default, chain, amino, secondary-structure/Jmol, and spectrum.
- Auto-rotate.
- Projection toggle.
- Representation layer editing.
- Per-layer selection, style, color, radius, opacity, add/edit/delete, and clear-layer controls.

### 8.9 Equations

Equation workflows include:

- LaTeX equation modal.
- Live KaTeX rendering.
- Equation insertion as a slide element.
- Equation font size and color controls.

### 8.10 Symbols And Icons

Symbols and icons support:

- Symbol picker modal.
- Icon picker modal.
- Icon search.
- Insertion into the slide canvas.
- Standard move/resize/style/layer operations after insertion.

### 8.11 Shapes And Connectors

Shape workflows include:

- Shape picker.
- Rectangle and other shape/arrows depending on picker contents.
- Fill, border, radius, and geometry rendering.
- Theme-managed color behavior.

Connector workflows include:

- Straight line connectors.
- Curve connectors.
- Polyline connectors.
- Stroke styling.
- Layering and selection behavior.

### 8.12 Sketch Board

Sketch board functionality supports a drawable element that can be inserted into a slide and edited through sketch-specific properties.

### 8.13 Mermaid Diagrams

Mermaid support includes:

- Flowchart / Mermaid dialog.
- Flowcharts, sequence diagrams, state charts, Gantt timelines, ER diagrams, and mind maps.
- Hybrid visual/code flowchart editing.
- Mermaid source synchronization.
- SVG rendering and sanitization.
- Canvas object behavior for move, resize, copy, duplicate, style, and animation.
- Export support with SVG/PNG fallback behavior.

Relevant files:

- `frontend/js/mermaid/mermaid-engine.js`
- `frontend/js/mermaid/mermaid-graph.js`
- `frontend/js/mermaid/mermaid-dialog.js`
- `frontend/js/mermaid/mermaid-object.js`
- `frontend/js/mermaid/mermaid-export.js`

## 9. Selection, Editing, And Layering

Core editing behavior:

- Single and multi-selection.
- Dragging and resizing elements.
- Copy/paste selected elements.
- Undo/redo.
- Group and ungroup selected elements.
- Layer visibility toggles.
- Bring forward and send backward controls.
- Hidden layers cannot be selected until shown.
- Element-specific properties update state and re-render the canvas.

The properties panel changes based on selection:

- No selection: slide workspace panel.
- Single element: element-specific panel.
- Multiple elements: multi-selection controls.
- Whiteboard mode: whiteboard properties.

## 10. Animation And Timeline

SlideForge has both simple element animation settings and more advanced timeline/presentation behavior.

Animation-related functionality:

- Timeline panel toggle.
- Element animation presets.
- Advanced animation properties.
- Click-triggered presentation animation groups.
- Bullet fragment animation per row.
- Presentation animation scheduling on slide entry.
- Escape/reset behavior for animations.

Presentation mode integrates element animations with Reveal slide navigation. Cross-slide transitions are handled by Reveal.js native transitions rather than custom clone layers.

Relevant docs:

- `ANIMATION_IMPROVEMENTS.md`
- `ANIMATION_STANDARDS_IMPROVEMENTS.md`
- `CROSS_SLIDE_ANIMATION_FIXES.md`
- `CROSS_SLIDE_TRANSITION_STANDARDS.md`
- `FADE_DIFFUSE_QUALITY_FIX.md`

## 11. Slide Transitions

Slide transitions are configured in the slide properties panel.

Available transition choices:

- None.
- Fade.
- Diffuse.
- Slide.
- Convex.
- Concave.
- Zoom.

Behavior:

- Changing the slide transition selector affects only the active slide.
- **Apply to all slides** intentionally copies the active slide transition to every slide.
- Presentation mode reads the active slide transition and applies Reveal.js configuration.
- Fade uses Reveal native fade.
- Diffuse currently maps to Reveal-compatible fade behavior unless a dedicated Reveal-compatible diffuse plugin is added.
- Custom transition clone layers should not be created.

## 12. Presentation Mode

Presentation mode is entered with the **Present** button.

Behavior:

- Requests fullscreen from the user gesture path when possible.
- Hides editor chrome.
- Locks the canvas into presentation layout.
- Uses Reveal.js for slide navigation and transitions.
- Disables editor keyboard handling and enables presentation controls.
- Keeps active media running and pauses inactive media.
- Runs scheduled slide/element animations.
- Supports slide navigation by click/keyboard depending on presentation runtime handling.
- Exits cleanly back to editor mode.

Presentation tools:

- Presentation menu.
- Fullscreen toggle.
- Laser pointer.
- Chalkboard.
- Chalk color.
- Clear chalk.
- Save annotations.
- Undo annotation.
- Freeze annotations.
- Spotlight.
- Presenter view.
- Exit presentation.

Presenter view:

- Opens a separate presenter window when allowed by the browser.
- Shows current slide.
- Shows next slide.
- Shows notes.
- Shows elapsed time.
- Supports next, previous, reset timer, and jump controls.
- Uses BroadcastChannel/localStorage-style sync paths for control messaging.

## 13. Whiteboard And Annotations

Whiteboard functionality exists in two related forms:

- **Whiteboard mode** from the insert toolbar for drawing/annotation workflows.
- **Presentation chalkboard** for live annotation during presentation mode.

Whiteboard/presentation annotation capabilities:

- Toggle whiteboard mode.
- Draw on a slide.
- Render whiteboard layers.
- Preserve slide whiteboard elements.
- Use chalk during presentation.
- Change chalk color.
- Clear annotations.
- Save annotations.
- Undo annotation.
- Freeze annotations.

## 14. AI And Cleanup Workflows

The toolbar includes **AI Clean Up** for visual polish and cleanup workflows.

Backend-related cleanup functionality includes:

- Slide cleanup API endpoint.
- Imported presentation cleanup.
- Content polishing helpers.

Behavior depends on backend/API availability and configured LLM support.

## 15. Import, Persistence, And Assets

Persistence and import workflows include:

- Presentation JSON import.
- Raw JSON state export.
- Backend project save/open/delete.
- Asset upload API for images, video, and other files.
- Session-only object URL fallback for local/offline uploads when backend upload is unavailable.
- Autosave scheduling.

State normalization protects against malformed slides and unsupported background/element values.

## 16. Export

Export menu options:

- **Web ZIP**: standalone web presentation package.
- **PDF Document**: rendered PDF export.
- **Slide Image PNG**: current slide/image export.
- **Deterministic SVG**: scene-compiler/SVG path for deterministic vector output.
- **PowerPoint PPTX**: backend/API PowerPoint export.
- **Raw JSON State**: full presentation state download.

Export behavior:

- Media backgrounds and video placeholders are handled separately.
- 3D backgrounds degrade to theme-aware static/canvas/solid fallbacks depending on export path.
- Mermaid diagrams export as SVG when possible and fall back to high-resolution PNG.
- PPTX export is backend-assisted.

Relevant files:

- `frontend/js/export/export.js`
- `frontend/js/rendering/scene/SceneCompiler.js`
- `frontend/js/rendering/renderers/SvgRenderer.js`
- `backend/bridge/pptx_exporter.py`

## 17. Keyboard And Accessibility Basics

Core keyboard behavior:

- `Ctrl/Cmd+K`: command palette.
- `F1`: shortcuts modal.
- `Escape`: close transient UI, exit active tools, or presentation mode depending on context.
- Common undo/redo/copy/paste shortcuts.
- Mermaid visual editor supports additional diagram editing shortcuts.

Accessibility and UX behavior:

- Main controls have labels, titles, or aria labels.
- Modals and pickers can be opened and closed from toolbar entry points.
- Presentation mode hides editor chrome from the viewport.
- Tool buttons expose active/pressed state where implemented.

## 18. Automated Verification

Frontend syntax check:

```sh
npm run check:frontend
```

Backend checks:

```sh
npm run check:backend
npm run test:backend
```

Browser UI smoke suite:

```sh
SLIDEFORGE_TEST_URL=http://127.0.0.1:8076/ npm run test:ui
```

If no static server is running:

```sh
cd frontend
python3 -m http.server 8076
```

Animation probe:

```sh
npm run test:animations
```

The current UI smoke suite covers:

- Editor boot.
- Header project buttons.
- Slide rail add/select.
- Slide-specific transitions.
- Insert toolbar core element types.
- Pickers and modals.
- Properties, layers, timeline, and export menu toggles.
- Selection, copy/paste, undo, and redo.
- Whiteboard mode.
- Presentation mode.
- Keyboard shortcuts.
- Unexpected browser console errors.

## 19. Regression Watchlist

When changing the app, pay special attention to:

- Header buttons opening the correct UI and not being blocked by overlays.
- Slide-specific transition changes not leaking globally.
- Presentation transitions not strobing or creating clone layers.
- Theme changes not snapping abruptly during presentation mode.
- 3D background styles visibly changing and staying per-slide.
- 3D backgrounds not animating every inactive slide at full speed.
- Presets maintaining readable text contrast across themes.
- Master slide footers remaining consistent.
- Text fitting on narrow panels and buttons.
- Properties panel scroll and visibility after rebuilds.
- Export commands staying present in the export menu.
- No unexpected browser errors in smoke tests.

## 20. Main Implementation Map

High-level frontend files:

- `frontend/index.html`: editor shell, toolbar, panels, modals, and script/style loading.
- `frontend/js/core/state.js`: default state, normalization, state loading, and state safety.
- `frontend/js/core/commands.js`: high-level user commands, project actions, presentation mode, import/export hooks, slide actions.
- `frontend/js/core/main.js`: app initialization and boot wiring.
- `frontend/js/editor/render.js`: slide/canvas rendering, media lifecycle, 3D backgrounds, element DOM creation.
- `frontend/js/editor/themes.js`: theme definitions, theme application, retinting.
- `frontend/js/editor/slide-presets.js`: preset layouts and preset browser data.
- `frontend/js/editor/masterSlides.js`: master slide config and generated master elements.
- `frontend/js/properties.js`: properties panel rendering and bindings.
- `frontend/js/export/export.js`: frontend export workflows.
- `tests/browser/test-ui-smoke.js`: automated browser smoke coverage.

Backend files:

- `backend/manage.py`: Django entry point.
- `backend/pptmaker_backend/`: Django settings and root URL routing.
- `backend/studio/`: API views, auth, assets, presentations, exports.
- `backend/bridge/`: document parsing, LLM helpers, PPTX export.

