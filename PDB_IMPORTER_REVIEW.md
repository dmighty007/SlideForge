# PDB Importer Bug and Improvement Scope

## Reviewed Scope

- Import path: `index.html` file input and `handleMoleculeFileInsert()` in `js/commands.js`.
- Element data model and sanitization: `js/moleculeEmbed.js`, `js/state.js`.
- Editor rendering and interaction: `js/render.js`, `css/styles.css`, `js/interact.js`.
- Properties panel: molecule controls in `js/properties.js`.
- Presentation/export path: molecule branch in `js/export.js`.

## Current Strengths

- Molecules are modeled as first-class `type: "molecule"` slide elements.
- The importer can replace a selected molecule or insert a new one.
- Recent changes improve editor selection/resize by separating iframe orbit mode from editor select mode.
- Multi-model PDB detection now exposes trajectory play controls in the iframe.
- Background color, including transparent, is now carried into the element, iframe document, and viewer payload.

## Bugs / Risks

### 1. Arbitrary PDB text is embedded directly inside an inline `<script>`

`_moleculeSrcdocScript()` emits `const payload = ${JSON.stringify(payload)};` inside iframe HTML. If an imported file or molecule name contains `</script>`, the browser can terminate the script block early.

Impact: malformed viewer iframe at minimum; script injection inside the sandboxed iframe at worst. The iframe does not allow same-origin, but it does allow scripts, forms, popups, and downloads.

Scope to fix:
- Escape script-breaking sequences in serialized JSON, especially `</script`, `<!--`, and Unicode line separators.
- Prefer a non-script JSON payload such as `<script type="application/json">` with safe text encoding, or base64 payload transfer inside the iframe.

### 2. No import size guard before reading file into state

`handleMoleculeFileInsert()` reads the whole selected file with `FileReader.readAsText()` and then stores it in slide state. State normalization later truncates molecule content to 2 MB, but the import path can already allocate and render a much larger file.

Impact: UI freeze or memory spikes on large trajectories.

Scope to fix:
- Check `file.size` before reading.
- Provide a clear warning for large files and a hard limit for browser-safe import.
- Consider streaming/downsampling trajectories or keeping large trajectory data outside the main presentation JSON.

### 3. Viewer reloads too aggressively from property changes

`refreshMoleculeDom()` rebuilds `iframe.srcdoc` for nearly every molecule property update, including name/background changes. This resets camera position, frame, play state, and forces 3Dmol to reload.

Impact: sluggish property editing, loss of view state, poor UX for large structures.

Scope to fix:
- Use `postMessage` to update background, style, layers, frame, rotate, and projection without recreating the iframe.
- Only rebuild `srcdoc` when the molecule file/content itself changes.
- Preserve camera/frame state across rebuilds when rebuild is unavoidable.

### 4. Trajectory support is limited to `MODEL`/`ENDMDL` PDBs

`isMoleculeTrajectoryData()` and `trajectoryCount()` only detect frames through PDB `MODEL` records.

Impact: multi-state files in formats that 3Dmol can parse differently may import as static molecules.

Scope to fix:
- Confirm 3Dmol support for each accepted format and detect trajectory support per format.
- Add explicit metadata after load if `addModelsAsFrames()` discovers frame count.
- Surface “static structure” vs “trajectory” status in the properties panel.

### 5. Format normalization is permissive but not validated

`normalizeMoleculeFormat()` currently returns almost any extension except `.ent`, while the file input accepts only a subset.

Impact: unsupported extensions can reach 3Dmol and fail late in the iframe.

Scope to fix:
- Use a single allow-list for input `accept`, state normalization, and viewer format.
- Show a user-facing error before inserting unsupported files.

### 6. Editor controls are created inside render logic

The molecule render branch builds DOM controls and attaches event handlers directly in `_applyTypeContent()`.

Impact: rendering, editor behavior, and state mutation are tightly coupled. If this render path is reused for previews or non-editor contexts, controls can leak into places where they should be inert.

Scope to fix:
- Move molecule editor chrome into a small helper such as `renderMoleculeEditorChrome()`.
- Gate editor-only event handlers by actual editor canvas context, not only CSS visibility.
- Keep preview/export rendering passive.

### 7. Undo semantics for background editing are weak

The background color picker updates state on every `input` and then wraps `change` in `onCommit()`. Depending on undo implementation, the saved undo point may occur after state has already changed.

Impact: undo may step through noisy intermediate colors or fail to restore the pre-edit color cleanly.

Scope to fix:
- Capture undo once on pointer/focus start.
- Apply live DOM preview without committing every intermediate value.
- Commit final color on `change`/blur.

### 8. External 3Dmol CDN is a hard runtime dependency

The iframe loads `https://cdnjs.cloudflare.com/.../3Dmol-min.js`.

Impact: molecule rendering fails offline, under restricted networks, or if CDN policy changes.

Scope to fix:
- Vendor a pinned 3Dmol build locally or serve it through the app static pipeline.
- Add clear fallback UI and retry behavior when the viewer library fails.

## Improvement Scope

### Near-term

- Harden iframe payload serialization.
- Add file size and format validation before import.
- Keep the current view/frame when changing non-content properties.
- Add browser tests for import, replace selected molecule, orbit/select toggle, resize, background transparency, and trajectory play controls.

### Medium-term

- Replace iframe rebuilds with a message API between editor and molecule iframe.
- Add richer trajectory controls: first/previous/next frame, loop toggle, FPS display, and frame persistence.
- Improve selection grammar for representation layers beyond `all`, `protein`, `ligand`, `chain A`, and `resi 42`.
- Add a clear error panel inside the molecule element when parsing fails.

### Long-term

- Store large molecular data as project assets instead of embedding all content directly in slide JSON.
- Build a molecule asset manager for reused structures and trajectories.
- Support local static 3Dmol assets and deterministic export behavior.
- Add snapshot or visual regression tests for exported molecule slides.

