/**
 * SIMPLIFIED CROP SYSTEM (Fixed Math)
 * This system allows trimming the image edges while keeping the content stable.
 */

class SimpleCrop {
    constructor(elementId) {
        this.elementId = elementId;
        this.elData = state.slides[currentSlideIndex].elements.find(e => e.id === elementId);
        if (!this.elData || this.elData.type !== "image") return;

        this.originalEl = document.getElementById(this.elementId);
        if (!this.originalEl) return;

        // Save current state for cancellation
        this.initialTransform = this.elData.cropTransform ? { ...this.elData.cropTransform } : null;

        const img = new Image();
        img.src = this.elData.content;
        const init = () => {
            this.naturalW = img.naturalWidth || 1000;
            this.naturalH = img.naturalHeight || 1000;
            this.naturalRatio = this.naturalW / this.naturalH;

            this.width = parseFloat(this.elData.width);
            this.height = parseFloat(this.elData.height);
            this.x = parseFloat(this.elData.x);
            this.y = parseFloat(this.elData.y);

            // Calculate current internal image size in pixels
            if (this.elData.cropTransform) {
                this.imgW = (this.elData.cropTransform.widthPercent / 100) * this.width;
                this.imgH = (this.elData.cropTransform.heightPercent / 100) * this.height;
                this.imgL = (this.elData.cropTransform.leftPercent / 100) * this.width;
                this.imgT = (this.elData.cropTransform.topPercent / 100) * this.height;
            } else {
                // Default: simulate 'object-fit: cover' centering
                const scale = Math.max(this.width / this.naturalW, this.height / this.naturalH);
                this.imgW = this.naturalW * scale;
                this.imgH = this.naturalH * scale;
                this.imgL = (this.width - this.imgW) / 2;
                this.imgT = (this.height - this.imgH) / 2;
            }

            this.buildUI();
            this.setupInteractions();

            const bound = document.getElementById("group-bound");
            if (bound) bound.classList.add("hidden");
        };

        if (img.complete) init(); else img.onload = init;
    }

    buildUI() {
        this.overlay = document.createElement("div");
        this.overlay.className = "crop-simple-overlay";
        this.overlay.style.cssText = "position:absolute; inset:0; background:rgba(0,0,0,0.4); z-index:10000; cursor:crosshair;";

        this.cropBox = document.createElement("div");
        this.cropBox.style.cssText = "position:absolute; border:2px dashed #fbbf24; box-shadow:0 0 0 9999px rgba(0,0,0,0.5); cursor:move; z-index:10001;";

        const handleStyle = "position:absolute; width:12px; height:12px; background:#fbbf24; border:2px solid #000; border-radius:2px;";
        const positions = [
            { id: "tl", css: "top:-6px; left:-6px; cursor:nwse-resize;" },
            { id: "tr", css: "top:-6px; right:-6px; cursor:nesw-resize;" },
            { id: "bl", css: "bottom:-6px; left:-6px; cursor:nesw-resize;" },
            { id: "br", css: "bottom:-6px; right:-6px; cursor:nwse-resize;" },
            { id: "tc", css: "top:-6px; left:50%; margin-left:-6px; cursor:ns-resize;" },
            { id: "bc", css: "bottom:-6px; left:50%; margin-left:-6px; cursor:ns-resize;" },
            { id: "lc", css: "left:-6px; top:50%; margin-top:-6px; cursor:ew-resize;" },
            { id: "rc", css: "right:-6px; top:50%; margin-top:-6px; cursor:ew-resize;" }
        ];

        positions.forEach(p => {
            const h = document.createElement("div");
            h.className = "crop-simple-handle";
            h.dataset.id = p.id;
            h.style.cssText = handleStyle + p.css;
            this.cropBox.appendChild(h);
        });

        this.overlay.appendChild(this.cropBox);
        const section = document.querySelector(".reveal .slides section.present") || document.getElementById("slides-container");
        section.appendChild(this.overlay);

        this.updateDOM();
    }

    updateDOM() {
        // Since this.cropBox is a child of the slide section,
        // we can use logical coordinates directly.
        this.cropBox.style.left = typeof this.elData.x === "number" ? `${this.elData.x}px` : this.elData.x;
        this.cropBox.style.top = typeof this.elData.y === "number" ? `${this.elData.y}px` : this.elData.y;
        this.cropBox.style.width = this.elData.width;
        this.cropBox.style.height = this.elData.height;
    }

    setupInteractions() {
        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onMouseMove = this.handleMouseMove.bind(this);
        this.onMouseUp = this.handleMouseUp.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);

        this.cropBox.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
        document.addEventListener("keydown", this.onKeyDown, true);
    }

    handleMouseDown(e) {
        e.stopPropagation();
        if (e.target.classList.contains("crop-simple-handle")) {
            this.activeHandle = e.target.dataset.id;
        } else {
            this.isDraggingBox = true;
        }
        this.startX = e.clientX;
        this.startY = e.clientY;

        // Calculate current pixels from state
        const curW = parseFloat(this.elData.width);
        const curH = parseFloat(this.elData.height);

        let imgW, imgH, imgL, imgT;
        if (this.elData.cropTransform) {
            imgW = (this.elData.cropTransform.widthPercent / 100) * curW;
            imgH = imgW / this.naturalRatio; // Force ratio
            imgL = (this.elData.cropTransform.leftPercent / 100) * curW;
            imgT = (this.elData.cropTransform.topPercent / 100) * curH;
        } else {
            const scale = Math.max(curW / this.naturalW, curH / this.naturalH);
            imgW = this.naturalW * scale;
            imgH = this.naturalH * scale;
            imgL = (curW - imgW) / 2;
            imgT = (curH - imgH) / 2;
        }

        this.s = { x: parseFloat(this.elData.x), y: parseFloat(this.elData.y), w: curW, h: curH, imgW, imgH, imgL, imgT };
    }

    handleMouseMove(e) {
        if (!this.activeHandle && !this.isDraggingBox) return;

        const scale = typeof getCanvasScale === "function" ? getCanvasScale() : 1;
        const dx = (e.clientX - this.startX) / scale;
        const dy = (e.clientY - this.startY) / scale;

        let { x, y, w, h, imgW, imgH, imgL, imgT } = this.s;

        if (this.activeHandle) {
            if (this.activeHandle.includes("l")) { x += dx; w -= dx; imgL -= dx; }
            if (this.activeHandle.includes("r")) { w += dx; }
            if (this.activeHandle.includes("t")) { y += dy; h -= dy; imgT -= dy; }
            if (this.activeHandle.includes("b")) { h += dy; }

            if (w < 20) w = 20;
            if (h < 20) h = 20;

            // Update container state
            this.elData.x = x;
            this.elData.y = y;
            this.elData.width = `${w}px`;
            this.elData.height = `${h}px`;

            // Recalculate imgH from imgW to ensure ZERO distortion
            const currentImgH = imgW / this.naturalRatio;

            this.elData.cropTransform = {
                widthPercent: (imgW / w) * 100,
                heightPercent: (currentImgH / h) * 100,
                leftPercent: (imgL / w) * 100,
                topPercent: (imgT / h) * 100
            };
        } else if (this.isDraggingBox) {
            this.elData.x = x + dx;
            this.elData.y = y + dy;
        }

        if (window.renderSlidesFromState) window.renderSlidesFromState();
        this.updateDOM();
    }

    handleMouseUp() {
        this.activeHandle = null;
        this.isDraggingBox = false;
    }

    handleKeyDown(e) {
        if (e.key === "Enter") {
            e.stopPropagation();
            this.confirm();
        } else if (e.key === "Escape") {
            e.stopPropagation();
            this.cancel();
        }
    }

    confirm() {
        this.cleanup();
        if (window.saveStateToUndo) window.saveStateToUndo();
        if (window.renderSlidesFromState) window.renderSlidesFromState();
        if (window.updateGroupBound) window.updateGroupBound();
        if (window.buildPropertiesPanel) window.buildPropertiesPanel();
    }

    cancel() {
        this.cleanup();
        if (this.initialTransform) {
            this.elData.cropTransform = this.initialTransform;
        } else {
            delete this.elData.cropTransform;
        }
        if (window.renderSlidesFromState) window.renderSlidesFromState();
    }

    cleanup() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        document.removeEventListener("keydown", this.onKeyDown, true);
        window._activeCropSession = null;
    }
}

window.enterCropMode = function(id) {
    if (window._activeCropSession) window._activeCropSession.confirm();
    window._activeCropSession = new SimpleCrop(id);
};
