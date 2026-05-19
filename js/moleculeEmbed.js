const MOLECULE_EMBED_NGL_SRC = "https://unpkg.com/ngl@2.4.0/dist/ngl.js";
const MOLECULE_SUPPORTED_FORMATS = new Set(["pdb", "ent", "gro", "mol2", "xyz", "sdf", "cif", "mmcif"]);
const MOLECULE_INLINE_CONTENT_LIMIT = 2 * 1024 * 1024;
const MOLECULE_LARGE_CONTENT_LIMIT = 64 * 1024 * 1024;

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

function isMoleculeContentUrl(value) {
    const text = String(value || "").trim();
    return /^(?:blob:|https?:\/\/|\/media\/|\/static\/|assets\/|\/assets\/)/i.test(text);
}

function isMoleculeTrajectoryData(data) {
    if (isMoleculeContentUrl(data)) return false;
    const text = String(data || "");
    let modelCount = 0;
    let endCount = 0;
    let atomOneCount = 0;
    const recordPattern = /^(MODEL|ENDMDL)\b/gm;
    let match;
    while ((match = recordPattern.exec(text))) {
        if (match[1] === "MODEL") {
            modelCount += 1;
            if (modelCount > 1) return true;
        } else if (modelCount > 0) return true;
    }
    const framePattern = /^(END|ATOM\s+1\b)/gm;
    while ((match = framePattern.exec(text))) {
        if (match[1] === "END") {
            endCount += 1;
            if (endCount > 1 && atomOneCount > 1) return true;
        } else {
            atomOneCount += 1;
            if (endCount > 0 && atomOneCount > 1) return true;
        }
    }
    return false;
}

function createMoleculeElementData({ data, name = "Molecule", format = "pdb", isTrajectory = false, sourceUrl = "" } = {}) {
    const content = sourceUrl || String(data || createDefaultMoleculeContent());
    return {
        moleculeName: name,
        moleculeFormat: normalizeMoleculeFormat(format),
        moleculeIsTrajectory: Boolean(isTrajectory || (!sourceUrl && isMoleculeTrajectoryData(data))),
        content,
        moleculeSourceType: sourceUrl ? "url" : "inline",
        moleculeInteractive: true,
        moleculeAutoRotate: false,
        moleculeProjection: "perspective",
        moleculeDefaultStyle: "cartoon",
        moleculeDefaultColor: "spectrum",
        moleculeRepresentationLayers: [],
        moleculeViewState: null,
    };
}

function normalizeMoleculeRepresentationLayer(layer = {}) {
    const kind = ["cartoon", "stick", "sphere", "line", "surface", "hidden"].includes(layer.kind) ? layer.kind : "cartoon";
    const colorScheme = ["default", "chain", "amino", "ssJmol", "spectrum", "custom"].includes(layer.colorScheme)
        ? layer.colorScheme
        : "spectrum";
    const selectionQuery = String(layer.selectionQuery || "all").trim() || "all";
    const customColor = /^#[0-9a-f]{6}$/i.test(String(layer.customColor || "")) ? layer.customColor : "#6366f1";
    const radius = Number.isFinite(Number(layer.radius)) ? Math.max(0.01, Math.min(5, Number(layer.radius))) : null;
    const opacity = Number.isFinite(Number(layer.opacity)) ? Math.max(0.02, Math.min(1, Number(layer.opacity))) : null;
    const labelParts = [`${kind[0].toUpperCase()}${kind.slice(1)}`, colorScheme, selectionQuery];
    if (radius != null && ["stick", "sphere", "line", "cartoon"].includes(kind)) labelParts.push(`r ${radius}`);
    if (opacity != null && kind === "surface") labelParts.push(`${Math.round(opacity * 100)}%`);
    const label = String(layer.label || labelParts.join(" · "));
    return {
        id: layer.id || (typeof generateId === "function" ? generateId("mol_layer") : `mol_layer_${Date.now()}_${Math.random().toString(36).slice(2)}`),
        kind,
        colorScheme,
        selectionQuery,
        customColor,
        radius,
        opacity,
        label,
    };
}

function normalizeMoleculeViewState(value) {
    if (!value || typeof value !== "object") return null;
    const orientation = Array.isArray(value.orientation) ? value.orientation.map(Number) : [];
    if (orientation.length !== 16 || !orientation.every(Number.isFinite)) return null;
    return { orientation };
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
let stage = null;
let component = null;
let trajectory = null;
let timer = null;
let frameCount = 0;
let currentFrame = 0;
let resizeQueued = false;
let lifecycleActive = payload.active !== false;
let spinRequested = Boolean(payload.autoRotate);
let resumeTrajectoryOnActive = false;
let viewStateBroadcastTimer = null;

function setStatus(text) { status.textContent = text; }
function hasNgl() { return Boolean(window.NGL && window.NGL.Stage); }
function fmt(value) { return String(value || "pdb").toLowerCase() === "ent" ? "pdb" : String(value || "pdb").toLowerCase(); }
function trajectoryCount(data) {
  let count = 0;
  const text = String(data || "");
  const recordPattern = /^MODEL\\b/gm;
  while (recordPattern.exec(text)) count += 1;
  if (count > 0) return count;
  const endPattern = /^END\\s*$/gm;
  while (endPattern.exec(text)) count += 1;
  return count;
}
function hasModelRecords(data) {
  return /^MODEL\\b/m.test(String(data || ""));
}
function isEndDelimitedPdbTrajectory(data) {
  const text = String(data || "");
  if (hasModelRecords(text)) return false;
  let endCount = 0;
  let atomOneCount = 0;
  const framePattern = /^(END\\s*$|ATOM\\s+1\\b)/gm;
  let match;
  while ((match = framePattern.exec(text))) {
    if (match[1].startsWith("END")) endCount += 1;
    else atomOneCount += 1;
    if (endCount > 1 && atomOneCount > 1) return true;
  }
  return false;
}
function normalizeEndDelimitedPdbTrajectory(data) {
  const lines = String(data || "").split(/\\r?\\n/);
  const header = [];
  const frames = [];
  let current = [];
  let frameStarted = false;
  for (const line of lines) {
    if (/^(ATOM|HETATM)\\b/.test(line)) frameStarted = true;
    if (!frameStarted) {
      if (line.trim()) header.push(line);
      continue;
    }
    if (/^END\\s*$/.test(line)) {
      if (current.length) frames.push(current);
      current = [];
      frameStarted = false;
      continue;
    }
    if (line.trim()) current.push(line);
  }
  if (current.length) frames.push(current);
  if (frames.length <= 1) return String(data || "");
  const output = [];
  frames.forEach((frame, index) => {
    output.push("MODEL     " + String(index + 1).padStart(4, " "));
    if (index === 0) output.push(...header);
    output.push(...frame);
    output.push("ENDMDL");
  });
  output.push("END");
  return output.join("\\n");
}
function requestMoleculeDataFromParent(url) {
  return new Promise((resolve, reject) => {
    const requestId = "mol_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Timed out while loading molecule data"));
    }, 30000);
    function onMessage(event) {
      const message = event.data || {};
      if (!message || message.type !== "pptmaker:molecule:data-response" || message.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      if (message.error) reject(new Error(message.error));
      else resolve(String(message.data || ""));
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "pptmaker:molecule:data-request", requestId, url }, "*");
  });
}
async function resolveMoleculeData() {
  if (!payload.dataUrl) return String(payload.data || "");
  setStatus("Loading molecule data...");
  try {
    return await requestMoleculeDataFromParent(payload.dataUrl);
  } catch (_parentErr) {
    const response = await fetch(payload.dataUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not fetch molecule file");
    return await response.text();
  }
}
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch])); }
function applyBackground(color) {
  const transparent = color === "transparent";
  const bg = transparent ? "transparent" : (color || "#020617");
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  root.style.background = bg;
  if (stage && stage.setParameters) {
    stage.setParameters({ backgroundColor: transparent ? "white" : bg });
    requestRender();
  }
}
function requestRender() {
  if (stage?.viewer?.requestRender) stage.viewer.requestRender();
  else if (stage?.viewer?.render) stage.viewer.render();
}
function normalizeViewMatrix(value) {
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(value?.elements)
      ? value.elements
      : (typeof value?.toArray === "function" ? value.toArray() : []);
  const matrix = raw.map(Number);
  return matrix.length === 16 && matrix.every(Number.isFinite) ? matrix : null;
}
function getViewState() {
  const orientation = normalizeViewMatrix(stage?.viewerControls?.getOrientation?.());
  return orientation ? { orientation } : null;
}
function applyViewState(viewState) {
  const orientation = normalizeViewMatrix(viewState?.orientation);
  const controls = stage?.viewerControls;
  if (!orientation || !controls) return false;
  try {
    if (typeof controls.orient === "function") {
      let matrix = orientation;
      const Matrix4 = window.NGL?.Matrix4 || window.THREE?.Matrix4;
      if (Matrix4) {
        matrix = new Matrix4();
        if (typeof matrix.fromArray === "function") matrix.fromArray(orientation);
        else matrix.elements = orientation.slice();
      }
      controls.orient(matrix);
    } else if (typeof controls.setOrientation === "function") {
      controls.setOrientation(orientation);
    } else {
      return false;
    }
    requestRender();
    return true;
  } catch (_err) {
    return false;
  }
}
function scheduleViewStateBroadcast() {
  if (viewStateBroadcastTimer) window.clearTimeout(viewStateBroadcastTimer);
  viewStateBroadcastTimer = window.setTimeout(() => {
    viewStateBroadcastTimer = null;
    window.parent.postMessage({
      type: "pptmaker:molecule:view-state-changed",
      elementId: payload.elementId || "",
      viewState: getViewState(),
    }, "*");
  }, 180);
}
function resizeViewer() {
  if (!stage || resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    if (stage.handleResize) stage.handleResize();
    requestRender();
  });
}
function normalizeSelectionItems(value) {
  const items = String(value || "").split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  return items.flatMap(item => {
    const range = item.match(/^(-?\\d+)\\s*-\\s*(-?\\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const step = start <= end ? 1 : -1;
      const values = [];
      for (let next = start; step > 0 ? next <= end : next >= end; next += step) values.push(String(next));
      return values;
    }
    return [item];
  }).filter(Boolean);
}
function parseSelection(query) {
  const q = String(query || "").trim();
  if (!q || /^all$/i.test(q)) return "all";
  const lower = q.toLowerCase();
  if (lower === "protein") return "protein";
  if (lower === "ligand") return "ligand";
  if (lower === "water" || lower === "solvent") return "water";
  if (lower === "backbone") return "backbone";
  if (lower === "sidechain") return "sidechainAttached";
  const selectors = [];
  const parts = q.split(/\\s+(?:and|&)\\s+/i).map(part => part.trim()).filter(Boolean);
  for (const part of parts.length ? parts : [q]) {
    let m = part.match(/^(?:chain|ch)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const chains = normalizeSelectionItems(m[1]).map(value => ":" + value.replace(/^:/, ""));
      if (chains.length) selectors.push(chains.length === 1 ? chains[0] : "(" + chains.join(" or ") + ")");
      continue;
    }
    m = part.match(/^(?:resi|residue|resid)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const residues = normalizeSelectionItems(m[1]);
      if (residues.length) selectors.push(residues.length === 1 ? residues[0] : "(" + residues.join(" or ") + ")");
      continue;
    }
    m = part.match(/^(?:resn|resname|residue\\s+name)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const names = normalizeSelectionItems(m[1]).map(value => value.toUpperCase());
      if (names.length) selectors.push(names.length === 1 ? names[0] : "(" + names.join(" or ") + ")");
      continue;
    }
    m = part.match(/^(?:atom|name)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const atoms = normalizeSelectionItems(m[1]).map(value => "." + value.replace(/^\\./, "").toUpperCase());
      if (atoms.length) selectors.push(atoms.length === 1 ? atoms[0] : "(" + atoms.join(" or ") + ")");
      continue;
    }
    m = part.match(/^(?:elem|element)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const elements = normalizeSelectionItems(m[1]).map(value => "_" + value.replace(/^_/, ""));
      if (elements.length) selectors.push(elements.length === 1 ? elements[0] : "(" + elements.join(" or ") + ")");
      continue;
    }
    m = part.match(/^(?:serial|index|atomindex)\\s*[:=]?\\s*(.+)$/i);
    if (m) {
      const indices = normalizeSelectionItems(m[1]);
      if (indices.length) selectors.push(indices.length === 1 ? "@" + indices[0] : "(" + indices.map(value => "@" + value).join(" or ") + ")");
      continue;
    }
    selectors.push(part);
  }
  return selectors.length ? selectors.join(" and ") : "all";
}
function representationKind(kind) {
  if (kind === "stick") return "licorice";
  if (kind === "sphere") return "spacefill";
  if (kind === "surface") return "surface";
  if (kind === "line") return "line";
  return "cartoon";
}
function colorParams(color, customHex) {
  if (color === "custom") return { color: customHex || "#6366f1" };
  if (color === "chain") return { colorScheme: "chainid" };
  if (color === "amino") return { colorScheme: "resname" };
  if (color === "ssJmol") return { colorScheme: "sstruc" };
  if (color === "spectrum") return { colorScheme: "residueindex" };
  return { colorScheme: "element" };
}
function representationParams(kind, color, customHex, selection, layerOptions = {}) {
  const params = { sele: selection || "all", quality: "medium", ...colorParams(color, customHex) };
  const radius = Number.isFinite(Number(layerOptions.radius)) ? Number(layerOptions.radius) : null;
  const opacity = Number.isFinite(Number(layerOptions.opacity)) ? Number(layerOptions.opacity) : null;
  if (kind === "surface") {
    params.opacity = opacity == null ? 0.68 : Math.max(0.02, Math.min(1, opacity));
    params.useWorker = false;
    if (color !== "custom") params.color = "#ffffff";
  }
  if (kind === "sphere") params.radiusScale = radius == null ? 0.35 : Math.max(0.01, Math.min(5, radius));
  if (kind === "stick") params.radius = radius == null ? 0.18 : Math.max(0.01, Math.min(5, radius));
  if (kind === "line") params.linewidth = radius == null ? 2 : Math.max(1, Math.min(20, radius));
  if (kind === "cartoon" && radius != null) params.radius = Math.max(0.01, Math.min(5, radius));
  return params;
}
function structureAtomCount() {
  return Number(component?.structure?.atomCount || 0);
}
function structureResidueCount() {
  return Number(component?.structure?.residueStore?.count || component?.structure?.residueCount || 0);
}
async function applyDefault() {
  let kind = payload.defaultStyle || "cartoon";
  const color = payload.defaultColor || "spectrum";
  const atoms = structureAtomCount();
  if ((kind === "surface" && atoms > 120000) || (kind === "cartoon" && atoms > 0 && atoms < 20)) {
    kind = atoms > 120000 ? "line" : "stick";
  }
  component.addRepresentation(representationKind(kind), representationParams(kind, color, null, "all"));
  if (kind === "line" || kind === "stick") {
    component.addRepresentation("spacefill", { sele: "water", color: "#38bdf8", opacity: 0.72, radiusScale: 0.18, quality: "medium" });
  }
}
async function addLayer(sel, kind, opts, label, options) {
  if (kind === "hidden") return;
  component.addRepresentation(representationKind(kind), { ...opts, sele: sel || "all" });
  if (!options || options.render !== false) requestRender();
}
async function applySavedLayers() {
  const saved = Array.isArray(payload.layers) ? payload.layers : [];
  for (const layer of saved) {
    const sel = parseSelection(layer.selectionQuery || "all");
    if (layer.kind === "hidden") {
      await addLayer(sel, "hidden", {}, layer.label || "Hidden", { render: false });
    } else {
      await addLayer(sel, layer.kind, representationParams(layer.kind, layer.colorScheme, layer.customColor, sel, layer), layer.label || layer.kind, { render: false });
    }
  }
}
async function applyRepresentations() {
  if (!component) return;
  component.removeAllRepresentations();
  await applyDefault();
  await applySavedLayers();
  requestRender();
}
function updateStatus() {
  if (!component) return;
  setStatus((payload.name || "Molecule") + " · " + structureAtomCount() + " atoms · " + structureResidueCount() + " residues" + (frameCount > 1 ? " · " + frameCount + " frames" : ""));
}
function applySpin() {
  if (!stage) return;
  stage.setSpin(Boolean(lifecycleActive && spinRequested));
  requestRender();
}
function stop(options = {}) {
  if (timer && options.remember) resumeTrajectoryOnActive = true;
  if (timer) window.clearInterval(timer);
  timer = null;
  if (playBtn) playBtn.textContent = "Play";
  if (presentPlayBtn) presentPlayBtn.textContent = "Play";
}
function setFrame(index) {
  if (!frameCount) return;
  currentFrame = Math.max(0, Math.min(Number(index) || 0, frameCount - 1));
  if (trajectory?.setFrame) trajectory.setFrame(currentFrame, requestRender);
  if (frameInput) frameInput.value = String(currentFrame);
  if (frameLabel) frameLabel.textContent = (currentFrame + 1) + " / " + frameCount;
  requestRender();
}
function play() {
  if (!frameCount || !lifecycleActive) return;
  resumeTrajectoryOnActive = false;
  stop();
  const delay = Math.max(30, Number(speedInput.value) || 120);
  timer = window.setInterval(() => setFrame((currentFrame + 1) % frameCount), delay);
  playBtn.textContent = "Pause";
  if (presentPlayBtn) presentPlayBtn.textContent = "Pause";
}
function setLifecycleActive(nextActive) {
  const next = Boolean(nextActive);
  if (next === lifecycleActive) return;
  lifecycleActive = next;
  if (!lifecycleActive) {
    stop({ remember: true });
    if (stage) stage.setSpin(false);
    return;
  }
  applySpin();
  if (resumeTrajectoryOnActive) {
    resumeTrajectoryOnActive = false;
    play();
  } else {
    requestRender();
  }
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
function getTrajectoryFromComponent(trajComponent) {
  if (trajComponent?.trajectory) return trajComponent.trajectory;
  if (trajComponent?.traj) return trajComponent.traj;
  const list = component?.trajList || component?.trajectoryList || [];
  const first = list[0];
  return first?.trajectory || first?.traj || first || null;
}
async function load() {
  if (!hasNgl()) {
    setStatus("NGL viewer failed to load");
    return;
  }
  applyBackground(payload.backgroundColor);
  const transparentBg = payload.backgroundColor === "transparent";
  try {
    stage = new window.NGL.Stage(root, {
      backgroundColor: transparentBg ? "white" : (payload.backgroundColor || "#020617"),
      quality: "medium",
      sampleLevel: 1,
      impostor: true,
      cameraType: payload.projection === "orthographic" ? "orthographic" : "perspective",
    });
    if (stage.mouseControls?.remove) {
      stage.mouseControls.remove("scroll-shift");
      stage.mouseControls.remove("drag-middle");
    }
    let moleculeData = await resolveMoleculeData();
    if (!moleculeData) throw new Error("Molecule file is empty");
    const format = fmt(payload.format);
    const endDelimitedTrajectory = format === "pdb" && isEndDelimitedPdbTrajectory(moleculeData);
    if (endDelimitedTrajectory) moleculeData = normalizeEndDelimitedPdbTrajectory(moleculeData);
    const shouldLoadTrajectory = payload.isTrajectory || endDelimitedTrajectory || hasModelRecords(moleculeData);
    frameCount = shouldLoadTrajectory ? trajectoryCount(moleculeData) : 0;
    const blob = new Blob([moleculeData], { type: "text/plain" });
    component = await stage.loadFile(blob, { ext: format === "mmcif" ? "cif" : format, asTrajectory: shouldLoadTrajectory && frameCount > 1 });
    if (shouldLoadTrajectory && frameCount > 1 && component?.addTrajectory) {
      trajectory = getTrajectoryFromComponent(component.addTrajectory());
      if (trajectory?.frameCount) frameCount = trajectory.frameCount;
      if (trajectory?.signals?.frameChanged?.add) {
        trajectory.signals.frameChanged.add(index => {
          currentFrame = Number(index) || trajectory.currentFrame || currentFrame;
          if (frameInput) frameInput.value = String(currentFrame);
          if (frameLabel) frameLabel.textContent = (currentFrame + 1) + " / " + frameCount;
        });
      }
    } else {
      frameCount = 0;
    }
    await applyRepresentations();
    component.autoView(0);
    if (applyViewState(payload.viewState)) {
      setTimeout(() => applyViewState(payload.viewState), 80);
    }
    applySpin();
    stage.setParameters({ cameraType: payload.projection === "orthographic" ? "orthographic" : "perspective" });
    requestRender();
    updateStatus();
    setupTrajectoryControls();
    root.addEventListener("dblclick", () => {
      if (!component) return;
      component.autoView();
      requestRender();
      scheduleViewStateBroadcast();
    });
    ["pointerup", "wheel", "touchend"].forEach(type => {
      root.addEventListener(type, scheduleViewStateBroadcast, { passive: true });
    });
    new ResizeObserver(resizeViewer).observe(root);
    setTimeout(resizeViewer, 120);
    setTimeout(resizeViewer, 650);
    setTimeout(resizeViewer, 1400);
  } catch (err) {
    setStatus("Could not load molecule: " + err.message);
  }
}
if (presentRotateBtn) {
  presentRotateBtn.addEventListener("click", event => {
    if (!stage) return;
    const next = event.currentTarget.dataset.on !== "true";
    event.currentTarget.dataset.on = String(next);
    event.currentTarget.textContent = next ? "Rotate On" : "Rotate";
    const rotateBtn = document.getElementById("rotate");
    if (rotateBtn) {
      rotateBtn.dataset.on = String(next);
      rotateBtn.textContent = next ? "Rotate On" : "Rotate";
    }
    stage.setSpin(next);
    requestRender();
  });
}
if (playBtn) playBtn.addEventListener("click", () => timer ? stop() : play());
if (presentPlayBtn) presentPlayBtn.addEventListener("click", () => timer ? stop() : play());
if (frameInput) frameInput.addEventListener("input", () => { stop(); setFrame(frameInput.value); });
if (speedInput) speedInput.addEventListener("input", () => { if (timer) play(); });
window.addEventListener("message", async event => {
  const message = event.data || {};
  if (!message || message.type !== "pptmaker:molecule:update") return;
  if (Object.prototype.hasOwnProperty.call(message, "backgroundColor")) {
    payload.backgroundColor = message.backgroundColor || "#020617";
    applyBackground(payload.backgroundColor);
  }
  if (Object.prototype.hasOwnProperty.call(message, "name")) {
    payload.name = String(message.name || "Molecule");
    updateStatus();
  }
  if (Object.prototype.hasOwnProperty.call(message, "autoRotate") && stage) {
    payload.autoRotate = Boolean(message.autoRotate);
    spinRequested = payload.autoRotate;
    applySpin();
  }
  if (Object.prototype.hasOwnProperty.call(message, "projection") && stage?.setParameters) {
    payload.projection = message.projection === "orthographic" ? "orthographic" : "perspective";
    stage.setParameters({ cameraType: payload.projection });
    requestRender();
  }
  const representationChanged =
    Object.prototype.hasOwnProperty.call(message, "defaultStyle") ||
    Object.prototype.hasOwnProperty.call(message, "defaultColor") ||
    Object.prototype.hasOwnProperty.call(message, "layers");
  if (representationChanged) {
    if (Object.prototype.hasOwnProperty.call(message, "defaultStyle")) payload.defaultStyle = message.defaultStyle || "cartoon";
    if (Object.prototype.hasOwnProperty.call(message, "defaultColor")) payload.defaultColor = message.defaultColor || "spectrum";
    if (Object.prototype.hasOwnProperty.call(message, "layers")) payload.layers = Array.isArray(message.layers) ? message.layers : [];
    await applyRepresentations();
  }
  if (Object.prototype.hasOwnProperty.call(message, "active")) {
    setLifecycleActive(message.active);
  }
});
window.addEventListener("message", event => {
  const message = event.data || {};
  if (!message || message.type !== "pptmaker:molecule:lifecycle") return;
  setLifecycleActive(message.active);
});
window.addEventListener("message", event => {
  const message = event.data || {};
  if (!message || message.type !== "pptmaker:molecule:view-state-request") return;
  window.parent.postMessage({
    type: "pptmaker:molecule:view-state-response",
    requestId: message.requestId,
    viewState: getViewState(),
  }, "*");
});
window.addEventListener("resize", resizeViewer);
load();
})();
`;
}

function buildMoleculeEmbedSrcdoc(elementData = {}) {
    const rawContent = String(elementData.content || "");
    const externalContent = isMoleculeContentUrl(rawContent);
    const payload = {
        data: externalContent ? "" : String(rawContent || createDefaultMoleculeContent()),
        dataUrl: externalContent ? rawContent : "",
        elementId: String(elementData.id || ""),
        format: normalizeMoleculeFormat(elementData.moleculeFormat || "pdb"),
        name: String(elementData.moleculeName || "Molecule"),
        isTrajectory: Boolean(elementData.moleculeIsTrajectory || (!externalContent && isMoleculeTrajectoryData(elementData.content))),
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
        active: elementData.moleculeActive !== false,
        viewState: normalizeMoleculeViewState(elementData.moleculeViewState),
        backgroundColor: normalizeMoleculeBackgroundColor(elementData.styles?.backgroundColor || "#020617"),
    };
    const title = _escapeMoleculeHtml(payload.name);
    const background = payload.backgroundColor === "transparent" ? "transparent" : payload.backgroundColor;
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>
(() => {
  const ignorePatterns = [
    "useLegacyLights has been deprecated",
    "STAGE LOG",
    "EDTSurface fillvoxels",
    "EDTSurface fastdistancemap",
    "EDTSurface.getVolume"
  ];
  const shouldIgnore = args => ignorePatterns.some(pattern => args.map(value => String(value)).join(" ").includes(pattern));
  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  console.log = (...args) => { if (!shouldIgnore(args)) originalLog(...args); };
  console.warn = (...args) => { if (!shouldIgnore(args)) originalWarn(...args); };
})();
<\/script>
<script src="${MOLECULE_EMBED_NGL_SRC}"><\/script>
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
.top{display:none}
.status{display:none}
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

function attachMoleculeDataBridge(iframe, elementData = {}) {
    if (!iframe || !isMoleculeContentUrl(elementData.content)) return null;
    const sourceUrl = String(elementData.content || "");
    const onMessage = async event => {
        const message = event.data || {};
        if (!message || message.type !== "pptmaker:molecule:data-request") return;
        if (event.source !== iframe.contentWindow) return;
        if (message.url !== sourceUrl) return;
        try {
            const response = await fetch(sourceUrl, { credentials: "same-origin" });
            if (!response.ok) throw new Error(`Molecule fetch failed (${response.status})`);
            const data = await response.text();
            iframe.contentWindow?.postMessage({
                type: "pptmaker:molecule:data-response",
                requestId: message.requestId,
                data,
            }, "*");
        } catch (err) {
            iframe.contentWindow?.postMessage({
                type: "pptmaker:molecule:data-response",
                requestId: message.requestId,
                error: err?.message || "Could not load molecule data",
            }, "*");
        }
    };
    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", () => {
        if (iframe._moleculeDataBridgeCleanup) iframe._moleculeDataBridgeCleanup();
        window.addEventListener("message", onMessage);
        iframe._moleculeDataBridgeCleanup = () => window.removeEventListener("message", onMessage);
    }, { once: true });
    iframe._moleculeDataBridgeCleanup = () => window.removeEventListener("message", onMessage);
    return iframe._moleculeDataBridgeCleanup;
}
