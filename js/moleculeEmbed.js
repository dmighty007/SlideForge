const MOLECULE_EMBED_3DMOL_SRC = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.5.3/3Dmol-min.js";
const MOLECULE_SUPPORTED_FORMATS = new Set(["pdb", "ent", "gro", "mol2", "xyz", "sdf", "cif", "mmcif"]);

function createDefaultMoleculeContent() {
    return [
        "HEADER    SLIDEFORGE MOLECULE PLACEHOLDER",
        "ATOM      1  N   GLY A   1      -1.250   0.000   0.000  1.00 20.00           N",
        "ATOM      2  CA  GLY A   1       0.000   0.000   0.000  1.00 20.00           C",
        "ATOM      3  C   GLY A   1       1.180   0.720   0.000  1.00 20.00           C",
        "ATOM      4  O   GLY A   1       2.280   0.200   0.000  1.00 20.00           O",
        "ATOM      5  N   SER A   2       0.960   2.020   0.000  1.00 20.00           N",
        "ATOM      6  CA  SER A   2       2.020   2.890   0.000  1.00 20.00           C",
        "ATOM      7  C   SER A   2       3.300   2.150   0.000  1.00 20.00           C",
        "ATOM      8  O   SER A   2       4.420   2.640   0.000  1.00 20.00           O",
        "ATOM      9  CB  SER A   2       1.600   4.340   0.000  1.00 20.00           C",
        "TER",
        "END",
    ].join("\n");
}

function normalizeMoleculeFormat(format = "pdb") {
    const value = String(format || "pdb").toLowerCase().replace(/^\./, "");
    const normalized = value === "ent" ? "pdb" : value;
    return MOLECULE_SUPPORTED_FORMATS.has(normalized) ? normalized : "pdb";
}

function normalizeMoleculeBackgroundColor(value = "#020617") {
    const color = String(value || "").trim();
    if (!color || color.toLowerCase() === "transparent" || /^rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(color)) return "transparent";
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return "#020617";
}

function isMoleculeTrajectoryData(data) {
    const text = String(data || "");
    return (text.match(/^MODEL\b/gm) || []).length > 1 || (/^MODEL\b/m.test(text) && /^ENDMDL\b/m.test(text));
}

function createMoleculeElementData({ data, name = "Molecule", format = "pdb", isTrajectory = false } = {}) {
    return {
        moleculeName: name,
        moleculeFormat: normalizeMoleculeFormat(format),
        moleculeIsTrajectory: Boolean(isTrajectory || isMoleculeTrajectoryData(data)),
        content: String(data || createDefaultMoleculeContent()),
        moleculeInteractive: true,
        moleculeAutoRotate: false,
        moleculeProjection: "perspective",
        moleculeDefaultStyle: "cartoon",
        moleculeDefaultColor: "spectrum",
        moleculeRepresentationLayers: [],
    };
}

function normalizeMoleculeRepresentationLayer(layer = {}) {
    const kind = ["cartoon", "stick", "sphere", "line", "surface", "hidden"].includes(layer.kind) ? layer.kind : "cartoon";
    const colorScheme = ["default", "chain", "amino", "ssJmol", "spectrum", "custom"].includes(layer.colorScheme)
        ? layer.colorScheme
        : "spectrum";
    const selectionQuery = String(layer.selectionQuery || "all").trim() || "all";
    const customColor = /^#[0-9a-f]{6}$/i.test(String(layer.customColor || "")) ? layer.customColor : "#6366f1";
    const label = String(layer.label || `${kind[0].toUpperCase()}${kind.slice(1)} · ${colorScheme} · ${selectionQuery}`);
    return {
        id: layer.id || (typeof generateId === "function" ? generateId("mol_layer") : `mol_layer_${Date.now()}_${Math.random().toString(36).slice(2)}`),
        kind,
        colorScheme,
        selectionQuery,
        customColor,
        label,
    };
}

function _escapeMoleculeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function _serializeMoleculePayload(payload) {
    return JSON.stringify(payload)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

function _moleculeSrcdocScript(payload) {
    return `
(() => {
const payload = ${_serializeMoleculePayload(payload)};
const root = document.getElementById("viewer");
const status = document.getElementById("status");
const framePanel = document.getElementById("trajectory-panel");
const playBtn = document.getElementById("traj-play");
const frameInput = document.getElementById("traj-frame");
const frameLabel = document.getElementById("traj-label");
const speedInput = document.getElementById("traj-speed");
const presentPlayBtn = document.getElementById("present-play");
const presentRotateBtn = document.getElementById("present-rotate");
let viewer = null;
let model = null;
let timer = null;
let repId = 0;
let layers = [];
let frameCount = 0;
let currentFrame = 0;
let resizeQueued = false;

function setStatus(text) { status.textContent = text; }
function has3Dmol() { return Boolean(window.$3Dmol); }
function fmt(value) { return String(value || "pdb").toLowerCase() === "ent" ? "pdb" : String(value || "pdb").toLowerCase(); }
function trajectoryCount(data) { return (String(data || "").match(/^MODEL\\b/gm) || []).length; }
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch])); }
function applyBackground(color) {
  const transparent = color === "transparent";
  const bg = transparent ? "transparent" : (color || "#020617");
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  root.style.background = bg;
  if (viewer && viewer.setBackgroundColor) {
    viewer.setBackgroundColor(transparent ? "#020617" : bg, transparent ? 0 : 1);
    viewer.render();
  }
}
function resizeViewer() {
  if (!viewer || resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    viewer.resize();
    viewer.render();
  });
}
function parseSelection(query) {
  const q = String(query || "").trim();
  const l = q.toLowerCase();
  if (!q || l === "all") return {};
  if (l === "protein") return { protein: true };
  if (l === "ligand") return { hetflag: true };
  if (l === "water") return { resn: ["HOH", "WAT"] };
  if (l === "backbone") return { atom: ["N", "CA", "C", "O"] };
  let m = l.match(/^chain\\s+([a-z0-9])$/i);
  if (m) return { chain: m[1].toUpperCase() };
  m = l.match(/^resi(?:due)?\\s+(\\d+)$/i);
  if (m) return { resi: Number(m[1]) };
  m = l.match(/^resn\\s+([a-z0-9]{1,4})$/i);
  if (m) return { resn: m[1].toUpperCase() };
  return {};
}
function baseStyle(kind, color, customHex) {
  const config = {};
  if (color === "custom") config.color = customHex || "#6366f1";
  else if (color === "spectrum") config.color = "spectrum";
  else if (color && color !== "default") config.colorscheme = color;
  return { [kind]: config };
}
function applyDefault() {
  const kind = payload.defaultStyle || "cartoon";
  const color = payload.defaultColor || "spectrum";
  if (kind === "surface") {
    addLayer({}, "surface", { type: "VDW", opacity: 0.68, color: "#ffffff" }, "VDW Surface · all");
  } else {
    viewer.setStyle({}, baseStyle(kind, color));
    layers = [{ id: ++repId, kind, sel: {}, opts: baseStyle(kind, color), label: kind[0].toUpperCase() + kind.slice(1) + " · " + color + " · all", surface: false }];
  }
}
function rebuildAtomStyles() {
  viewer.setStyle({}, {});
  layers.forEach(layer => {
    if (layer.surface) return;
    if (layer.kind === "hidden") viewer.setStyle(layer.sel, {});
    else viewer.addStyle(layer.sel, layer.opts);
  });
}
async function addLayer(sel, kind, opts, label) {
  const layer = { id: ++repId, kind, sel, opts, label, surface: kind === "surface", handle: null };
  if (kind === "surface") {
    const type = window.$3Dmol.SurfaceType[opts.type || "VDW"] || window.$3Dmol.SurfaceType.VDW;
    layer.handle = await viewer.addSurface(type, { opacity: opts.opacity ?? 0.68, color: opts.color || "#ffffff" }, sel, sel);
  } else if (kind === "hidden") {
    viewer.setStyle(sel, {});
  } else {
    viewer.addStyle(sel, opts);
  }
  layers.push(layer);
  viewer.render();
}
async function applySavedLayers() {
  const saved = Array.isArray(payload.layers) ? payload.layers : [];
  for (const layer of saved) {
    const sel = parseSelection(layer.selectionQuery || "all");
    if (layer.kind === "surface") {
      await addLayer(sel, "surface", { type: "VDW", opacity: 0.68, color: layer.colorScheme === "custom" ? layer.customColor : "#ffffff" }, layer.label || "VDW Surface");
    } else if (layer.kind === "hidden") {
      await addLayer(sel, "hidden", {}, layer.label || "Hidden");
    } else {
      await addLayer(sel, layer.kind, baseStyle(layer.kind, layer.colorScheme, layer.customColor), layer.label || layer.kind);
    }
  }
}
function stop() {
  if (timer) window.clearInterval(timer);
  timer = null;
  if (playBtn) playBtn.textContent = "Play";
  if (presentPlayBtn) presentPlayBtn.textContent = "Play";
}
function setFrame(index) {
  if (!frameCount) return;
  currentFrame = Math.max(0, Math.min(Number(index) || 0, frameCount - 1));
  if (model && model.setFrame) model.setFrame(currentFrame);
  else if (viewer.setFrame) viewer.setFrame(currentFrame);
  if (frameInput) frameInput.value = String(currentFrame);
  if (frameLabel) frameLabel.textContent = (currentFrame + 1) + " / " + frameCount;
  viewer.render();
}
function play() {
  if (!frameCount) return;
  stop();
  const delay = Math.max(30, Number(speedInput.value) || 120);
  timer = window.setInterval(() => setFrame((currentFrame + 1) % frameCount), delay);
  playBtn.textContent = "Pause";
  if (presentPlayBtn) presentPlayBtn.textContent = "Pause";
}
function setupTrajectoryControls() {
  const hasFrames = frameCount > 1;
  framePanel.hidden = !hasFrames;
  if (presentPlayBtn) presentPlayBtn.hidden = !hasFrames;
  if (!hasFrames) return;
  if (frameInput) {
    frameInput.max = String(frameCount - 1);
    frameInput.value = "0";
  }
  if (frameLabel) frameLabel.textContent = "1 / " + frameCount;
}
function load() {
  if (!has3Dmol()) {
    setStatus("3Dmol.js failed to load");
    return;
  }
  applyBackground(payload.backgroundColor);
  const transparentBg = payload.backgroundColor === "transparent";
  const viewerBg = transparentBg ? "#020617" : payload.backgroundColor;
  viewer = window.$3Dmol.createViewer(root, { backgroundColor: viewerBg, alpha: transparentBg ? 0 : 1, antialias: true, cartoonQuality: 20 });
  try {
    if (transparentBg && viewer.setBackgroundColor) viewer.setBackgroundColor(viewerBg, 0);
    const format = fmt(payload.format);
    frameCount = payload.isTrajectory ? trajectoryCount(payload.data) : 0;
    if (payload.isTrajectory && frameCount > 0) model = viewer.addModelsAsFrames(payload.data, format);
    else model = viewer.addModel(payload.data, format);
    applyDefault();
    applySavedLayers().then(() => {
      viewer.zoomTo();
      viewer.render();
      setTimeout(resizeViewer, 120);
      setTimeout(resizeViewer, 650);
      setTimeout(resizeViewer, 1400);
    });
    viewer.zoomTo();
    viewer.spin(payload.autoRotate ? "y" : false);
    if (viewer.setProjection) viewer.setProjection(payload.projection === "orthographic" ? "orthographic" : "perspective");
    viewer.render();
    const atoms = model.selectedAtoms({}) || [];
    const residues = new Set(atoms.map(atom => (atom.chain || "") + "-" + atom.resi)).size;
    setStatus((payload.name || "Molecule") + " · " + atoms.length + " atoms · " + residues + " residues" + (frameCount > 1 ? " · " + frameCount + " frames" : ""));
    setupTrajectoryControls();
    root.addEventListener("dblclick", () => {
      if (!viewer) return;
      viewer.zoomTo();
      viewer.render();
    });
    new ResizeObserver(resizeViewer).observe(root);
  } catch (err) {
    setStatus("Could not load molecule: " + err.message);
  }
}
if (presentRotateBtn) {
  presentRotateBtn.addEventListener("click", event => {
    if (!viewer) return;
    const next = event.currentTarget.dataset.on !== "true";
    event.currentTarget.dataset.on = String(next);
    event.currentTarget.textContent = next ? "Rotate On" : "Rotate";
    const rotateBtn = document.getElementById("rotate");
    if (rotateBtn) {
      rotateBtn.dataset.on = String(next);
      rotateBtn.textContent = next ? "Rotate On" : "Rotate";
    }
    viewer.spin(next ? "y" : false);
    viewer.render();
  });
}
if (playBtn) playBtn.addEventListener("click", () => timer ? stop() : play());
if (presentPlayBtn) presentPlayBtn.addEventListener("click", () => timer ? stop() : play());
if (frameInput) frameInput.addEventListener("input", () => { stop(); setFrame(frameInput.value); });
if (speedInput) speedInput.addEventListener("input", () => { if (timer) play(); });
window.addEventListener("message", event => {
  const message = event.data || {};
  if (!message || message.type !== "pptmaker:molecule:update") return;
  if (Object.prototype.hasOwnProperty.call(message, "backgroundColor")) {
    payload.backgroundColor = message.backgroundColor || "#020617";
    applyBackground(payload.backgroundColor);
  }
});
window.addEventListener("resize", resizeViewer);
load();
})();
`;
}

function buildMoleculeEmbedSrcdoc(elementData = {}) {
    const payload = {
        data: String(elementData.content || createDefaultMoleculeContent()),
        format: normalizeMoleculeFormat(elementData.moleculeFormat || "pdb"),
        name: String(elementData.moleculeName || "Molecule"),
        isTrajectory: Boolean(elementData.moleculeIsTrajectory || isMoleculeTrajectoryData(elementData.content)),
        autoRotate: Boolean(elementData.moleculeAutoRotate),
        projection: elementData.moleculeProjection === "orthographic" ? "orthographic" : "perspective",
        defaultStyle: ["cartoon", "stick", "sphere", "line", "surface"].includes(elementData.moleculeDefaultStyle)
            ? elementData.moleculeDefaultStyle
            : "cartoon",
        defaultColor: ["default", "chain", "amino", "ssJmol", "spectrum", "custom"].includes(elementData.moleculeDefaultColor)
            ? elementData.moleculeDefaultColor
            : "spectrum",
        layers: Array.isArray(elementData.moleculeRepresentationLayers)
            ? elementData.moleculeRepresentationLayers.map(normalizeMoleculeRepresentationLayer).slice(0, 12)
            : [],
        presentationMode: Boolean(elementData.moleculePresentationMode),
        backgroundColor: normalizeMoleculeBackgroundColor(elementData.styles?.backgroundColor || "#020617"),
    };
    const title = _escapeMoleculeHtml(payload.name);
    const background = payload.backgroundColor === "transparent" ? "transparent" : payload.backgroundColor;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="${MOLECULE_EMBED_3DMOL_SRC}"><\/script>
<style>
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:${background};color:#e2e8f0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#viewer{position:absolute;inset:0;background:${background}}
.hud{position:absolute;left:10px;right:10px;bottom:10px;display:flex;justify-content:center;gap:8px;align-items:end;pointer-events:none}
.panel{pointer-events:auto;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.82);backdrop-filter:blur(12px);border-radius:8px;padding:8px;box-shadow:0 12px 28px rgba(0,0,0,.28)}
.trajectory-controls{display:flex;align-items:center;gap:8px;min-width:min(520px,calc(100vw - 24px))}
.trajectory-controls button{min-width:56px}
.trajectory-controls input[type=range]{accent-color:#818cf8}
.trajectory-controls #traj-frame{flex:1;min-width:120px}
.trajectory-speed{display:flex;align-items:center;gap:6px;font-size:10px;color:#cbd5e1;white-space:nowrap}
.trajectory-speed input{width:70px}
.trajectory-frame-label{min-width:54px;text-align:right;font-size:11px;color:#e2e8f0;font-variant-numeric:tabular-nums}
.top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;gap:8px;pointer-events:none}
.status{pointer-events:auto;max-width:70%;border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.82);border-radius:999px;padding:6px 10px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cbd5e1}
input,select,button{font:inherit}
button{border:1px solid rgba(99,102,241,.35);background:rgba(79,70,229,.86);color:white;border-radius:6px;padding:6px 8px;font-size:11px;font-weight:700;cursor:pointer}
button.secondary{background:rgba(30,41,59,.9);border-color:rgba(100,116,139,.55);color:#cbd5e1}
#trajectory-panel[hidden]{display:none}
.presentation-only{display:none}
body.presentation-mode .presentation-only{display:flex}
.presentation-controls{gap:8px;padding:7px;background:rgba(15,23,42,.62)}
body.presentation-mode .presentation-controls button[hidden]{display:none}
@media(max-width:520px){.status{max-width:100%}.trajectory-controls{gap:6px}.trajectory-speed span{display:none}.trajectory-speed input{width:52px}}
</style>
</head>
<body class="${payload.presentationMode ? "presentation-mode" : ""}">
<div id="viewer" aria-label="${title} molecular viewer"></div>
<div class="top"><div id="status" class="status">Loading ${title}</div></div>
<div class="hud">
  <div class="panel presentation-controls presentation-only">
    <button id="present-play" type="button" hidden>Play</button>
    <button id="present-rotate" class="secondary" type="button">Rotate</button>
  </div>
  <div id="trajectory-panel" class="panel trajectory-controls" hidden>
    <button id="traj-play" type="button">Play</button>
    <input id="traj-frame" type="range" min="0" max="0" value="0" aria-label="Trajectory frame">
    <span id="traj-label" class="trajectory-frame-label">0 / 0</span>
    <label class="trajectory-speed"><span>Speed</span><input id="traj-speed" type="range" min="40" max="500" step="10" value="120" aria-label="Trajectory speed"></label>
  </div>
</div>
<script>${_moleculeSrcdocScript(payload)}<\/script>
</body>
</html>`;
}

function applyMoleculeEmbedSandbox(iframe) {
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-downloads");
    iframe.setAttribute("referrerpolicy", "no-referrer");
}
