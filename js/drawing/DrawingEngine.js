import { HistoryManager } from "./HistoryManager.js";
import { PathSimplifier } from "./PathSimplifier.js";
import { RoughRenderer } from "./RoughRenderer.js";
import { StrokeRenderer } from "./StrokeRenderer.js";

const DRAWING_TOOLS = new Set(["pen", "rectangle", "diamond", "ellipse", "line", "arrow", "text"]);

export class DrawingEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.options = {
            showGrid: options.showGrid !== false,
            allowPanZoom: options.allowPanZoom !== false,
        };
        this.elements = [];
        this.viewport = { panX: 0, panY: 0, zoom: 1.0 };
        this.activeTool = "select";
        this.isDrawing = false;
        this.isPanning = false;
        this.isMovingSelection = false;
        this.panStart = { x: 0, y: 0 };
        this.moveStart = null;
        this.currentStroke = null;
        this.textEditor = null;
        this.capturedPointerId = null;
        this.selectedElementId = null;
        this._handlersAttached = false;
        this._renderLoopStarted = false;
        this._spaceDown = false;

        this.strokeColor = "#1f2937";
        this.backgroundColor = "#fff1a8";
        this.fillStyle = "hachure";
        this.strokeWidth = 2;
        this.strokeStyle = "solid";
        this.roughness = 1.4;
        this.bowing = 1.0;
        this.opacity = 1;
        this.fontFamily = '"Virgil", "Comic Sans MS", "Segoe Print", cursive';
        this.fontSize = 22;

        this.history = new HistoryManager();
        this.boundHandlers = {};
        this.setupEventHandlers();
        this.startRenderLoop();
    }

    setOptions(options = {}) {
        this.options = { ...this.options, ...options };
        if (this.options.allowPanZoom === false) {
            this.viewport = { panX: 0, panY: 0, zoom: 1.0 };
        }
        this.emitChange();
    }

    setElements(elements = []) {
        this.cancelActiveTextEditor();
        this.elements = JSON.parse(JSON.stringify(Array.isArray(elements) ? elements : []));
        this.selectedElementId = null;
        this.currentStroke = null;
        this.history = new HistoryManager();
        this.emitChange();
    }

    getElements() {
        return JSON.parse(JSON.stringify(this.elements));
    }

    setupEventHandlers() {
        if (!this.canvas || this._handlersAttached) return;
        this.boundHandlers.pointerDown = e => this.handlePointerDown(e);
        this.boundHandlers.pointerMove = e => this.handlePointerMove(e);
        this.boundHandlers.pointerUp = e => this.handlePointerUp(e);
        this.boundHandlers.wheel = e => this.handleWheel(e);
        this.boundHandlers.keyDown = e => this.handleKeyDown(e);
        this.boundHandlers.keyUp = e => this.handleKeyUp(e);
        this.canvas.addEventListener("pointerdown", this.boundHandlers.pointerDown);
        this.canvas.addEventListener("pointermove", this.boundHandlers.pointerMove);
        document.addEventListener("pointerup", this.boundHandlers.pointerUp);
        document.addEventListener("keydown", this.boundHandlers.keyDown);
        document.addEventListener("keyup", this.boundHandlers.keyUp);
        this.canvas.addEventListener("wheel", this.boundHandlers.wheel, { passive: false });
        this._handlersAttached = true;
    }

    removeEventHandlers() {
        if (!this.canvas || !this._handlersAttached) return;
        this.commitActiveTextEditor();
        this.canvas.removeEventListener("pointerdown", this.boundHandlers.pointerDown);
        this.canvas.removeEventListener("pointermove", this.boundHandlers.pointerMove);
        document.removeEventListener("pointerup", this.boundHandlers.pointerUp);
        document.removeEventListener("keydown", this.boundHandlers.keyDown);
        document.removeEventListener("keyup", this.boundHandlers.keyUp);
        this.canvas.removeEventListener("wheel", this.boundHandlers.wheel);
        this._handlersAttached = false;
    }

    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        return {
            x: (canvasX - this.viewport.panX) / this.viewport.zoom,
            y: (canvasY - this.viewport.panY) / this.viewport.zoom,
        };
    }

    createBaseElement(type, overrides = {}) {
        return {
            id: `draw_${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            type,
            seed: Math.floor(Math.random() * 1000000000),
            strokeColor: this.strokeColor,
            backgroundColor: this.backgroundColor,
            fillStyle: this.fillStyle,
            strokeWidth: this.strokeWidth,
            strokeStyle: this.strokeStyle,
            roughness: this.roughness,
            bowing: this.bowing,
            opacity: this.opacity,
            ...overrides,
        };
    }

    setTool(tool) {
        this.commitActiveTextEditor();
        this.activeTool = tool;
        if (tool !== "select") this.selectedElementId = null;
        this.updateCursor();
        this.emitChange();
    }

    getSelectedElement() {
        return this.elements.find(el => el.id === this.selectedElementId) || null;
    }

    updateSelectedStyle(updates) {
        const selected = this.getSelectedElement();
        if (selected) Object.assign(selected, updates);
        Object.assign(this, this.normalizeStyleUpdates(updates));
        this.emitChange();
    }

    normalizeStyleUpdates(updates) {
        const allowed = {};
        ["strokeColor", "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness", "opacity"].forEach(key => {
            if (updates[key] !== undefined) allowed[key] = updates[key];
        });
        return allowed;
    }

    handlePointerDown(e) {
        if (e.button === 2) return;
        e.preventDefault();
        const worldPt = this.screenToWorld(e.clientX, e.clientY);
        const shouldPan = this.options.allowPanZoom && (e.button === 1 || this.activeTool === "pan" || this._spaceDown);
        if (shouldPan) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.capturePointer(e);
            return;
        }

        if (this.activeTool === "eraser") {
            this.history.pushState(this.elements);
            this.handleEraser(worldPt);
            return;
        }

        if (this.activeTool === "select") {
            const hit = this.hitTest(worldPt);
            this.selectedElementId = hit?.id || null;
            if (hit) {
                this.history.pushState(this.elements);
                this.isMovingSelection = true;
                this.moveStart = {
                    pointer: worldPt,
                    element: JSON.parse(JSON.stringify(hit)),
                };
                this.capturePointer(e);
            }
            this.emitChange();
            return;
        }

        if (this.activeTool === "text") {
            e.preventDefault();
            e.stopPropagation();
            this.startTextEditor(worldPt, e);
            return;
        }

        if (!DRAWING_TOOLS.has(this.activeTool)) return;
        this.history.pushState(this.elements);
        this.isDrawing = true;
        this.capturePointer(e);
        if (this.activeTool === "pen") {
            this.currentStroke = this.createBaseElement("freehand", {
                points: [this.createPoint(worldPt, e)],
                backgroundColor: "transparent",
                fillStyle: "solid",
            });
        } else {
            this.currentStroke = this.createBaseElement("draw_shape", {
                shapeType: this.activeTool,
                x: worldPt.x,
                y: worldPt.y,
                width: 0,
                height: 0,
            });
            this.shapeStartPt = { ...worldPt };
        }
    }

    handlePointerMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.viewport.panX += dx;
            this.viewport.panY += dy;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.emitChange();
            return;
        }

        const worldPt = this.screenToWorld(e.clientX, e.clientY);
        if (this.isMovingSelection && this.moveStart) {
            const selected = this.getSelectedElement();
            if (!selected) return;
            const dx = worldPt.x - this.moveStart.pointer.x;
            const dy = worldPt.y - this.moveStart.pointer.y;
            this.moveElementTo(selected, this.moveStart.element, dx, dy);
            return;
        }

        if (!this.isDrawing || !this.currentStroke) return;
        if (this.currentStroke.type === "freehand") {
            this.currentStroke.points.push(this.createPoint(worldPt, e));
        } else if (this.currentStroke.type === "draw_shape") {
            const dx = worldPt.x - this.shapeStartPt.x;
            const dy = worldPt.y - this.shapeStartPt.y;
            if (e.shiftKey && ["rectangle", "diamond", "ellipse"].includes(this.currentStroke.shapeType)) {
                const size = Math.max(Math.abs(dx), Math.abs(dy));
                this.currentStroke.x = dx < 0 ? this.shapeStartPt.x - size : this.shapeStartPt.x;
                this.currentStroke.y = dy < 0 ? this.shapeStartPt.y - size : this.shapeStartPt.y;
                this.currentStroke.width = size;
                this.currentStroke.height = size;
            } else if (["line", "arrow"].includes(this.currentStroke.shapeType)) {
                this.currentStroke.width = dx;
                this.currentStroke.height = dy;
            } else {
                this.currentStroke.x = dx < 0 ? worldPt.x : this.shapeStartPt.x;
                this.currentStroke.y = dy < 0 ? worldPt.y : this.shapeStartPt.y;
                this.currentStroke.width = Math.abs(dx);
                this.currentStroke.height = Math.abs(dy);
            }
        }
    }

    handlePointerUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.releasePointer(e);
            return;
        }
        if (this.isMovingSelection) {
            this.isMovingSelection = false;
            this.moveStart = null;
            this.releasePointer(e);
            this.emitChange();
            return;
        }
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.releasePointer(e);

        if (this.finalizeCurrentStroke()) {
            this.emitChange();
        }
    }

    handleKeyDown(e) {
        if (this.textEditor) return;
        if (this.options.allowPanZoom && e.code === "Space") {
            this._spaceDown = true;
            this.updateCursor();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) this.redo();
            else this.undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
            e.preventDefault();
            this.duplicateSelected();
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            if (this.selectedElementId) {
                e.preventDefault();
                this.deleteSelected();
            }
        }
    }

    handleKeyUp(e) {
        if (this.textEditor) return;
        if (e.code === "Space") {
            this._spaceDown = false;
            this.updateCursor();
        }
    }

    createPoint(worldPt, e) {
        return {
            x: worldPt.x,
            y: worldPt.y,
            pressure: Math.max(0, Math.min(1, e.pressure || 0.5)),
            t: Date.now(),
        };
    }

    capturePointer(e) {
        if (!this.canvas || e.pointerId === undefined) return;
        try {
            this.canvas.setPointerCapture(e.pointerId);
            this.capturedPointerId = e.pointerId;
        } catch (_err) {
            this.capturedPointerId = e.pointerId;
        }
    }

    releasePointer(e) {
        if (this.canvas && e.pointerId === this.capturedPointerId) {
            try {
                this.canvas.releasePointerCapture(e.pointerId);
            } catch (_err) {}
        }
        this.capturedPointerId = null;
    }

    handleWheel(e) {
        if (!this.options.allowPanZoom) return;
        e.preventDefault();
        const zoomFactor = 1.08;
        const targetZoom = e.deltaY < 0 ? this.viewport.zoom * zoomFactor : this.viewport.zoom / zoomFactor;
        const finalZoom = Math.max(0.15, Math.min(targetZoom, 6.0));
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const mouseWorld = {
            x: (canvasX - this.viewport.panX) / this.viewport.zoom,
            y: (canvasY - this.viewport.panY) / this.viewport.zoom,
        };
        this.viewport.zoom = finalZoom;
        this.viewport.panX = canvasX - mouseWorld.x * finalZoom;
        this.viewport.panY = canvasY - mouseWorld.y * finalZoom;
        this.emitChange();
    }

    handleEraser(worldPt) {
        const eraserRadius = 24 / this.viewport.zoom;
        this.elements = this.elements.filter(el => !this.elementIntersectsPoint(el, worldPt, eraserRadius));
        if (!this.elements.some(el => el.id === this.selectedElementId)) this.selectedElementId = null;
        this.emitChange();
    }

    hitTest(point) {
        for (let i = this.elements.length - 1; i >= 0; i -= 1) {
            const el = this.elements[i];
            if (this.elementIntersectsPoint(el, point, 8 / this.viewport.zoom)) return el;
        }
        return null;
    }

    elementIntersectsPoint(el, point, tolerance = 8) {
        const b = this.getElementBounds(el);
        if (!b) return false;
        if (point.x < b.x - tolerance || point.x > b.x + b.width + tolerance || point.y < b.y - tolerance || point.y > b.y + b.height + tolerance) {
            return false;
        }
        if (el.type !== "freehand") return true;
        return (el.points || []).some(p => Math.hypot(p.x - point.x, p.y - point.y) <= tolerance + (el.strokeWidth || 2));
    }

    getElementBounds(el) {
        if (!el) return null;
        if (el.type === "freehand") {
            const points = el.points || [];
            if (!points.length) return null;
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const pad = (el.strokeWidth || 2) + 8;
            const minX = Math.min(...xs) - pad;
            const minY = Math.min(...ys) - pad;
            return { x: minX, y: minY, width: Math.max(...xs) - Math.min(...xs) + pad * 2, height: Math.max(...ys) - Math.min(...ys) + pad * 2 };
        }
        if (el.type === "text") {
            const lines = String(el.text || "").split("\n");
            const width = Math.max(...lines.map(line => line.length), 1) * (el.fontSize || 22) * 0.6;
            const height = lines.length * (el.fontSize || 22) * 1.25;
            const pad = Math.max(8, (el.fontSize || 22) * 0.2);
            return { x: el.x - pad, y: el.y - height * 0.85 - pad, width: width + pad * 2, height: height + pad * 2 };
        }
        if (el.type === "draw_shape") {
            const x2 = el.x + el.width;
            const y2 = el.y + el.height;
            const strokePad = (Number(el.strokeWidth) || 2) / 2;
            const roughPad = Math.max(4, (Number(el.roughness) || 1.4) * 6);
            const arrowPad = el.shapeType === "arrow" ? 12 + (Number(el.strokeWidth) || 2) * 2.4 : 0;
            const pad = Math.ceil(strokePad + roughPad + arrowPad);
            return {
                x: Math.min(el.x, x2) - pad,
                y: Math.min(el.y, y2) - pad,
                width: Math.abs(el.width) + pad * 2,
                height: Math.abs(el.height) + pad * 2,
            };
        }
        return null;
    }

    startTextEditor(worldPt, event) {
        this.commitActiveTextEditor();
        const rect = this.canvas.getBoundingClientRect();
        const editor = document.createElement("textarea");
        editor.className = "whiteboard-text-editor";
        editor.placeholder = "Text";
        editor.rows = 1;
        editor.style.left = `${event.clientX - rect.left}px`;
        editor.style.top = `${event.clientY - rect.top}px`;
        editor.style.font = `${this.fontSize}px ${this.fontFamily}`;
        editor.style.color = this.strokeColor || "#1f2937";
        editor.style.minWidth = "120px";
        editor.style.minHeight = `${Math.ceil(this.fontSize * 1.45)}px`;
        editor.style.lineHeight = "1.25";

        const stopEvent = e => e.stopPropagation();
        const resizeEditor = () => {
            editor.style.height = "auto";
            editor.style.height = `${Math.max(this.fontSize * 1.45, editor.scrollHeight)}px`;
            editor.style.width = `${Math.min(Math.max(120, editor.scrollWidth + 8), Math.max(120, rect.width - (event.clientX - rect.left) - 12))}px`;
        };
        editor.addEventListener("pointerdown", stopEvent);
        editor.addEventListener("pointermove", stopEvent);
        editor.addEventListener("keydown", e => {
            e.stopPropagation();
            if (e.key === "Escape") {
                e.preventDefault();
                this.cancelActiveTextEditor();
            } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.commitActiveTextEditor();
            }
        });
        editor.addEventListener("input", resizeEditor);
        editor.addEventListener("blur", () => this.commitActiveTextEditor());

        this.canvas.parentElement?.appendChild(editor);
        this.textEditor = { editor, worldPt: { ...worldPt } };
        requestAnimationFrame(() => {
            editor.focus();
            resizeEditor();
        });
    }

    commitActiveTextEditor() {
        if (!this.textEditor) return;
        const { editor, worldPt } = this.textEditor;
        this.textEditor = null;
        const text = editor.value.trim();
        editor.remove();
        if (!text) return;
        this.history.pushState(this.elements);
        const element = this.createBaseElement("text", {
            x: worldPt.x,
            y: worldPt.y + this.fontSize,
            text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            backgroundColor: "transparent",
            fillStyle: "solid",
        });
        this.elements.push(element);
        this.selectedElementId = element.id;
        this.emitChange();
    }

    cancelActiveTextEditor() {
        if (!this.textEditor) return;
        this.textEditor.editor.remove();
        this.textEditor = null;
    }

    finalizeCurrentStroke() {
        if (!this.currentStroke) return false;
        let didAdd = false;
        if (this.currentStroke.type === "freehand") {
            if (this.currentStroke.points.length >= 2) {
                this.currentStroke.points = PathSimplifier.simplifyRDP(this.currentStroke.points, 0.9);
                this.currentStroke.points = StrokeRenderer.generateSplinePoints(this.currentStroke.points, 4);
                this.elements.push(this.currentStroke);
                this.selectedElementId = this.currentStroke.id;
                didAdd = true;
            }
        } else if (this.currentStroke.type === "draw_shape") {
            const rawWidth = Math.abs(Number(this.currentStroke.width) || 0);
            const rawHeight = Math.abs(Number(this.currentStroke.height) || 0);
            if (rawWidth > 3 || rawHeight > 3) {
                this.elements.push(this.currentStroke);
                this.selectedElementId = this.currentStroke.id;
                didAdd = true;
            }
        }
        this.currentStroke = null;
        this.isDrawing = false;
        return didAdd;
    }

    moveElementTo(el, startEl, dx, dy) {
        if (el.type === "freehand") {
            el.points = (startEl.points || []).map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
        } else {
            el.x = startEl.x + dx;
            el.y = startEl.y + dy;
        }
    }

    bringForward() {
        this.moveSelectedLayer(1);
    }

    sendBackward() {
        this.moveSelectedLayer(-1);
    }

    bringToFront() {
        this.moveSelectedLayer(Infinity);
    }

    sendToBack() {
        this.moveSelectedLayer(-Infinity);
    }

    moveSelectedLayer(delta) {
        const index = this.elements.findIndex(el => el.id === this.selectedElementId);
        if (index < 0) return;
        this.history.pushState(this.elements);
        const [item] = this.elements.splice(index, 1);
        let nextIndex = delta === Infinity ? this.elements.length : delta === -Infinity ? 0 : Math.max(0, Math.min(this.elements.length, index + delta));
        this.elements.splice(nextIndex, 0, item);
        this.emitChange();
    }

    duplicateSelected() {
        const selected = this.getSelectedElement();
        if (!selected) return;
        this.history.pushState(this.elements);
        const copy = JSON.parse(JSON.stringify(selected));
        copy.id = `${selected.id}_copy_${Date.now()}`;
        copy.seed = Math.floor(Math.random() * 1000000000);
        this.moveElementTo(copy, copy, 24, 24);
        this.elements.push(copy);
        this.selectedElementId = copy.id;
        this.emitChange();
    }

    deleteSelected() {
        if (!this.selectedElementId) return;
        this.history.pushState(this.elements);
        this.elements = this.elements.filter(el => el.id !== this.selectedElementId);
        this.selectedElementId = null;
        this.emitChange();
    }

    undo() {
        const prev = this.history.undo(this.elements);
        if (prev) {
            this.elements = prev;
            this.selectedElementId = null;
            this.emitChange();
        }
    }

    redo() {
        const next = this.history.redo(this.elements);
        if (next) {
            this.elements = next;
            this.selectedElementId = null;
            this.emitChange();
        }
    }

    clear() {
        this.history.pushState(this.elements);
        this.elements = [];
        this.selectedElementId = null;
        this.emitChange();
    }

    emitChange() {
        window.dispatchEvent(new CustomEvent("slideforge:whiteboard-change", { detail: { engine: this } }));
    }

    updateCursor() {
        if (!this.canvas) return;
        if (this.isPanning || (this.options.allowPanZoom && this._spaceDown)) this.canvas.style.cursor = "grab";
        else if (this.isMovingSelection) this.canvas.style.cursor = "grabbing";
        else if (this.activeTool === "select") this.canvas.style.cursor = "default";
        else if (this.activeTool === "eraser") this.canvas.style.cursor = "cell";
        else if (this.activeTool === "pan") this.canvas.style.cursor = "grab";
        else this.canvas.style.cursor = "crosshair";
    }

    startRenderLoop() {
        if (this._renderLoopStarted) return;
        this._renderLoopStarted = true;
        const render = () => {
            if (!this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const nextW = Math.max(1, Math.round(rect.width * dpr));
            const nextH = Math.max(1, Math.round(rect.height * dpr));
            if (this.canvas.width !== nextW || this.canvas.height !== nextH) {
                this.canvas.width = nextW;
                this.canvas.height = nextH;
            }
            this.updateCursor();
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.ctx.clearRect(0, 0, rect.width, rect.height);
            this.ctx.save();
            this.ctx.translate(this.viewport.panX, this.viewport.panY);
            this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
            if (this.options.showGrid) this.renderGrid(rect.width, rect.height);
            this.elements.forEach(el => this.renderElement(el));
            if (this.currentStroke) this.renderElement(this.currentStroke);
            const selected = this.getSelectedElement();
            if (selected) this.renderSelection(selected);
            this.ctx.restore();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    renderGrid(width, height) {
        this.ctx.fillStyle = "#d6d9e0";
        const gridSize = 40;
        const leftTop = this.screenToWorld(0, 0);
        const rightBottom = this.screenToWorld(width, height);
        const startX = Math.floor(leftTop.x / gridSize) * gridSize;
        const endX = Math.ceil(rightBottom.x / gridSize) * gridSize;
        const startY = Math.floor(leftTop.y / gridSize) * gridSize;
        const endY = Math.ceil(rightBottom.y / gridSize) * gridSize;
        this.ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            for (let y = startY; y <= endY; y += gridSize) {
                this.ctx.rect(x - 0.75, y - 0.75, 1.5, 1.5);
            }
        }
        this.ctx.fill();
    }

    getRenderStyle(el) {
        return {
            ...el,
            random: RoughRenderer.seededRandom(el.seed || 1),
            fillOpacity: el.fillStyle === "solid" ? 1 : 0.35,
        };
    }

    renderElement(el) {
        this.ctx.save();
        this.ctx.globalAlpha *= el.opacity ?? 1;
        if (el.type === "freehand") {
            StrokeRenderer.drawInkStroke(this.ctx, el.points, el.strokeColor, el.strokeWidth);
        } else if (el.type === "text") {
            this.ctx.font = `${el.fontSize || 22}px ${el.fontFamily || this.fontFamily}`;
            this.ctx.fillStyle = el.strokeColor || "#1f2937";
            this.ctx.textBaseline = "alphabetic";
            String(el.text || "").split("\n").forEach((line, index) => {
                this.ctx.fillText(line, el.x, el.y + index * (el.fontSize || 22) * 1.25);
            });
        } else if (el.type === "draw_shape") {
            const style = this.getRenderStyle(el);
            if (el.shapeType === "rectangle") RoughRenderer.drawRoughRect(this.ctx, el.x, el.y, el.width, el.height, style);
            else if (el.shapeType === "diamond") RoughRenderer.drawRoughDiamond(this.ctx, el.x, el.y, el.width, el.height, style);
            else if (el.shapeType === "ellipse") RoughRenderer.drawRoughEllipse(this.ctx, el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width / 2), Math.abs(el.height / 2), style);
            else if (el.shapeType === "line") RoughRenderer.drawRoughLine(this.ctx, el.x, el.y, el.x + el.width, el.y + el.height, style);
            else if (el.shapeType === "arrow") RoughRenderer.drawRoughArrow(this.ctx, el.x, el.y, el.x + el.width, el.y + el.height, style);
        }
        this.ctx.restore();
    }

    renderSelection(el) {
        const b = this.getElementBounds(el);
        if (!b) return;
        const pad = 6 / this.viewport.zoom;
        this.ctx.save();
        this.ctx.strokeStyle = "#a5b4fc";
        this.ctx.lineWidth = 1.5 / this.viewport.zoom;
        this.ctx.setLineDash([8 / this.viewport.zoom, 6 / this.viewport.zoom]);
        this.ctx.strokeRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = "#6366f1";
        const size = 8 / this.viewport.zoom;
        [[b.x - pad, b.y - pad], [b.x + b.width + pad, b.y - pad], [b.x + b.width + pad, b.y + b.height + pad], [b.x - pad, b.y + b.height + pad]].forEach(([x, y]) => {
            this.ctx.beginPath();
            this.ctx.rect(x - size / 2, y - size / 2, size, size);
            this.ctx.fill();
            this.ctx.stroke();
        });
        this.ctx.restore();
    }
}
