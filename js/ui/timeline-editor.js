/**
 * Timeline Editor UI
 * Interactive timeline panel for scrubbing, keyframe management, and animation editing
 */

class TimelineEditor {
    constructor(containerId = "timeline-editor-panel") {
        this.containerId = containerId;
        this.isVisible = false;
        this.playheadTime = 0;
        this.totalDuration = 0;
        this.zoomLevel = 1;
        this.selectedAnimation = null;
        this.onPlayheadChange = null;
    }

    /**
     * Initialize timeline editor
     */
    initialize() {
        this._createDOM();
        this._attachEventListeners();
    }

    /**
     * Create DOM structure
     */
    _createDOM() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
      <div class="timeline-editor-wrapper">
        <!-- Controls -->
        <div class="timeline-controls">
          <div class="playback-controls">
            <button id="timeline-play" class="timeline-btn timeline-btn-play" title="Play">
              ▶️
            </button>
            <button id="timeline-pause" class="timeline-btn timeline-btn-pause" title="Pause">
              ⏸️
            </button>
            <button id="timeline-stop" class="timeline-btn timeline-btn-stop" title="Stop">
              ⏹️
            </button>
          </div>

          <div class="timeline-time-display">
            <input id="timeline-current-time" type="number" min="0" value="0" class="time-input">
            <span class="time-unit">ms</span>
            <span class="time-divider">/</span>
            <span id="timeline-total-time" class="time-display">0ms</span>
          </div>

          <div class="timeline-zoom-controls">
            <button id="timeline-zoom-out" class="timeline-btn" title="Zoom Out">🔍−</button>
            <span id="timeline-zoom-level" class="zoom-display">100%</span>
            <button id="timeline-zoom-in" class="timeline-btn" title="Zoom In">🔍+</button>
            <button id="timeline-zoom-reset" class="timeline-btn" title="Reset Zoom">↺</button>
          </div>
        </div>

        <!-- Timeline track -->
        <div class="timeline-container">
          <div class="timeline-header">
            <div class="timeline-ruler">
              <div class="ruler-labels"></div>
              <div class="playhead-indicator"></div>
            </div>
          </div>

          <div class="timeline-tracks">
            <div id="timeline-tracks-list" class="tracks-list">
              <!-- Dynamically populated with animation tracks -->
            </div>
          </div>

          <!-- Scrubber -->
          <div class="timeline-scrubber-area">
            <input id="timeline-scrubber" type="range" min="0" max="0" value="0" class="timeline-scrubber">
          </div>
        </div>

        <!-- Animation properties panel -->
        <div class="timeline-properties" id="timeline-properties">
          <div class="properties-header">
            <h4>Animation Properties</h4>
          </div>
          <div id="timeline-properties-content" class="properties-content">
            <p class="empty-state">Select an animation to edit</p>
          </div>
        </div>
      </div>

      <style>
        .timeline-editor-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #ffffff);
          border-top: 1px solid var(--divider, #e5e7eb);
        }

        .timeline-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: var(--bg-secondary, #f9fafb);
          border-bottom: 1px solid var(--divider, #e5e7eb);
        }

        .playback-controls {
          display: flex;
          gap: 4px;
        }

        .timeline-btn {
          width: 32px;
          height: 32px;
          border: 1px solid var(--divider, #e5e7eb);
          background: var(--bg-tertiary, #f3f4f6);
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .timeline-btn:hover {
          background: var(--bg-secondary, #f9fafb);
          border-color: var(--accent, #2563eb);
        }

        .timeline-btn-play.active,
        .timeline-btn-pause.active {
          background: var(--accent, #2563eb);
          color: white;
          border-color: var(--accent, #2563eb);
        }

        .timeline-time-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary, #6b7280);
        }

        .time-input {
          width: 60px;
          padding: 4px 6px;
          border: 1px solid var(--divider, #e5e7eb);
          border-radius: 3px;
          font-size: 12px;
          text-align: right;
        }

        .time-unit,
        .time-divider {
          font-size: 11px;
          color: var(--text-tertiary, #9ca3af);
        }

        .timeline-zoom-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
        }

        .zoom-display {
          font-size: 11px;
          color: var(--text-secondary, #6b7280);
          min-width: 40px;
          text-align: center;
        }

        .timeline-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .timeline-header {
          height: 40px;
          border-bottom: 1px solid var(--divider, #e5e7eb);
          overflow: hidden;
        }

        .timeline-ruler {
          height: 100%;
          position: relative;
          background: var(--bg-secondary, #f9fafb);
          user-select: none;
        }

        .ruler-labels {
          display: flex;
          height: 20px;
          font-size: 10px;
          color: var(--text-tertiary, #9ca3af);
        }

        .ruler-label {
          flex: 0 0 60px;
          text-align: center;
          border-right: 1px solid var(--divider, #e5e7eb);
          padding: 2px 0;
        }

        .playhead-indicator {
          position: absolute;
          top: 20px;
          left: 0;
          width: 2px;
          height: calc(100% - 20px);
          background: var(--accent, #2563eb);
          pointer-events: none;
        }

        .timeline-tracks {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .tracks-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .timeline-track {
          display: flex;
          min-height: 48px;
          background: var(--bg-tertiary, #f3f4f6);
          border-bottom: 1px solid var(--divider, #e5e7eb);
        }

        .track-label {
          flex: 0 0 150px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          background: var(--bg-secondary, #f9fafb);
          border-right: 1px solid var(--divider, #e5e7eb);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary, #172033);
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-content {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .animation-block {
          position: absolute;
          top: 8px;
          bottom: 8px;
          background: var(--accent, #2563eb);
          border-radius: 3px;
          cursor: pointer;
          opacity: 0.8;
          transition: all 0.2s;
          user-select: none;
        }

        .animation-block:hover {
          opacity: 1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .animation-block.selected {
          box-shadow: 0 0 0 2px var(--accent, #2563eb),
                      0 0 0 4px var(--bg-primary, #ffffff);
        }

        .animation-block-label {
          padding: 4px 6px;
          color: white;
          font-size: 10px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .animation-block-drag-handle {
          position: absolute;
          width: 4px;
          top: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.5);
          cursor: ew-resize;
        }

        .animation-block-drag-handle.start {
          left: 0;
          border-radius: 3px 0 0 3px;
        }

        .animation-block-drag-handle.end {
          right: 0;
          border-radius: 0 3px 3px 0;
        }

        .timeline-scrubber-area {
          height: 20px;
          background: var(--bg-secondary, #f9fafb);
          border-top: 1px solid var(--divider, #e5e7eb);
          padding: 4px 0;
        }

        .timeline-scrubber {
          width: 100%;
          height: 12px;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }

        .timeline-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent, #2563eb);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .timeline-scrubber::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent, #2563eb);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .timeline-properties {
          flex: 0 0 200px;
          border-top: 1px solid var(--divider, #e5e7eb);
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #f9fafb);
        }

        .properties-header {
          padding: 8px 12px;
          border-bottom: 1px solid var(--divider, #e5e7eb);
          font-weight: 600;
          font-size: 12px;
        }

        .properties-header h4 {
          margin: 0;
        }

        .properties-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          font-size: 12px;
        }

        .properties-content .empty-state {
          text-align: center;
          color: var(--text-tertiary, #9ca3af);
          padding: 20px 8px;
          margin: 0;
        }

        .properties-group {
          margin-bottom: 12px;
        }

        .properties-group label {
          display: block;
          font-weight: 500;
          color: var(--text-secondary, #6b7280);
          margin-bottom: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .properties-group input,
        .properties-group select {
          width: 100%;
          padding: 4px 6px;
          border: 1px solid var(--divider, #e5e7eb);
          border-radius: 3px;
          font-size: 11px;
        }

        @media (max-height: 700px) {
          .timeline-properties {
            flex: 0 0 100px;
          }
        }
      </style>
    `;
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners() {
        const playBtn = document.getElementById("timeline-play");
        const pauseBtn = document.getElementById("timeline-pause");
        const stopBtn = document.getElementById("timeline-stop");
        const scrubber = document.getElementById("timeline-scrubber");
        const timeInput = document.getElementById("timeline-current-time");
        const zoomIn = document.getElementById("timeline-zoom-in");
        const zoomOut = document.getElementById("timeline-zoom-out");
        const zoomReset = document.getElementById("timeline-zoom-reset");

        if (playBtn) {
            playBtn.addEventListener("click", () => this.play());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener("click", () => this.pause());
        }
        if (stopBtn) {
            stopBtn.addEventListener("click", () => this.stop());
        }
        if (scrubber) {
            scrubber.addEventListener("input", e => {
                this.playheadTime = Number(e.target.value);
                this._updateTimeDisplay();
                if (this.onPlayheadChange) {
                    this.onPlayheadChange(this.playheadTime);
                }
            });
        }
        if (timeInput) {
            timeInput.addEventListener("change", e => {
                const time = Math.max(0, Math.min(this.totalDuration, Number(e.target.value) || 0));
                this.seek(time);
            });
        }
        if (zoomIn) {
            zoomIn.addEventListener("click", () => this.zoomIn());
        }
        if (zoomOut) {
            zoomOut.addEventListener("click", () => this.zoomOut());
        }
        if (zoomReset) {
            zoomReset.addEventListener("click", () => this.resetZoom());
        }
    }

    /**
     * Update timeline with animations from selected objects
     */
    updateTimeline() {
        if (!state || state.selectedIds.length === 0) {
            this._clearTimeline();
            return;
        }

        const tracksList = document.getElementById("timeline-tracks-list");
        if (!tracksList) return;

        tracksList.innerHTML = "";
        let maxDuration = 0;

        // Get current slide
        const slide = state.slides[currentSlideIndex];
        if (!slide) return;

        // Add track for each selected element
        state.selectedIds.forEach(elementId => {
            const element = slide.elements.find(el => el.id === elementId);
            if (!element) return;

            const config = normalizeElementAnimationConfig(element);
            if (!config || !config.timelines || config.timelines.length === 0) {
                return;
            }

            const trackEl = this._createTrack(elementId, element, config);
            tracksList.appendChild(trackEl);

            // Update max duration
            config.timelines.forEach(timeline => {
                timeline.animations.forEach(anim => {
                    const endTime = (anim.startTime || 0) + anim.duration;
                    maxDuration = Math.max(maxDuration, endTime);
                });
            });
        });

        this.totalDuration = maxDuration;
        this._updateScrubberRange();
        this._updateRuler();
    }

    /**
     * Create track element for an object's animations
     */
    _createTrack(elementId, element, config) {
        const trackEl = document.createElement("div");
        trackEl.className = "timeline-track";

        const label = document.createElement("div");
        label.className = "track-label";
        label.textContent = element.content || element.type || "Element";
        label.title = elementId;

        const content = document.createElement("div");
        content.className = "track-content";

        // Add animation blocks
        config.timelines.forEach((timeline, timelineIdx) => {
            timeline.animations.forEach((anim, animIdx) => {
                const block = this._createAnimationBlock(elementId, anim, timelineIdx, animIdx);
                content.appendChild(block);
            });
        });

        trackEl.appendChild(label);
        trackEl.appendChild(content);

        return trackEl;
    }

    /**
     * Create animation block element
     */
    _createAnimationBlock(elementId, animation, timelineIdx, animIdx) {
        const block = document.createElement("div");
        block.className = "animation-block";
        block.style.left = `${((animation.startTime || 0) / this.totalDuration) * 100}%`;
        block.style.width = `${(animation.duration / this.totalDuration) * 100}%`;
        block.style.background = this._getAnimationColor(animation.type);

        const label = document.createElement("div");
        label.className = "animation-block-label";
        label.textContent = animation.type;

        block.appendChild(label);

        // Add drag handles
        const startHandle = document.createElement("div");
        startHandle.className = "animation-block-drag-handle start";
        block.appendChild(startHandle);

        const endHandle = document.createElement("div");
        endHandle.className = "animation-block-drag-handle end";
        block.appendChild(endHandle);

        // Click to select
        block.addEventListener("click", e => {
            e.stopPropagation();
            this.selectAnimation(elementId, timelineIdx, animIdx);
        });

        return block;
    }

    /**
     * Get color for animation type
     */
    _getAnimationColor(type) {
        const colors = {
            fadeIn: "#3b82f6",
            fadeOut: "#ef4444",
            transform: "#8b5cf6",
            scaleInPlace: "#ec4899",
            rotate: "#f59e0b",
            write: "#10b981",
            create: "#14b8a6",
            uncreate: "#6366f1",
        };
        return colors[type] || "#6b7280";
    }

    /**
     * Update ruler labels
     */
    _updateRuler() {
        const labels = document.querySelector(".ruler-labels");
        if (!labels || this.totalDuration === 0) return;

        labels.innerHTML = "";
        const interval = this._calculateRulerInterval();

        for (let time = 0; time <= this.totalDuration; time += interval) {
            const label = document.createElement("div");
            label.className = "ruler-label";
            label.textContent = `${time}ms`;
            label.style.flex = `0 0 ${(interval / this.totalDuration) * 100}%`;
            labels.appendChild(label);
        }
    }

    /**
     * Calculate appropriate ruler interval
     */
    _calculateRulerInterval() {
        const intervals = [100, 250, 500, 1000, 2000, 5000];
        const targetWidth = 60;
        const containerWidth = document.querySelector(".timeline-header")?.offsetWidth || 600;
        const pixelsPerMs = (containerWidth / this.totalDuration) * this.zoomLevel;

        for (const interval of intervals) {
            if (pixelsPerMs * interval > targetWidth) {
                return interval;
            }
        }
        return 5000;
    }

    /**
     * Update scrubber range
     */
    _updateScrubberRange() {
        const scrubber = document.getElementById("timeline-scrubber");
        if (scrubber) {
            scrubber.max = this.totalDuration;
        }
        this._updateTimeDisplay();
    }

    /**
     * Update time display
     */
    _updateTimeDisplay() {
        const currentDisplay = document.getElementById("timeline-current-time");
        const totalDisplay = document.getElementById("timeline-total-time");

        if (currentDisplay) {
            currentDisplay.value = Math.round(this.playheadTime);
        }
        if (totalDisplay) {
            totalDisplay.textContent = `${Math.round(this.totalDuration)}ms`;
        }
    }

    /**
     * Clear timeline
     */
    _clearTimeline() {
        const tracksList = document.getElementById("timeline-tracks-list");
        if (tracksList) {
            tracksList.innerHTML = '<p class="empty-state">Select objects to show animations</p>';
        }
    }

    /**
     * Select animation for editing
     */
    selectAnimation(elementId, timelineIdx, animIdx) {
        this.selectedAnimation = { elementId, timelineIdx, animIdx };
        this._showAnimationProperties();
    }

    /**
     * Show selected animation properties
     */
    _showAnimationProperties() {
        if (!this.selectedAnimation) return;

        const { elementId, timelineIdx, animIdx } = this.selectedAnimation;
        const slide = state.slides[currentSlideIndex];
        const element = slide.elements.find(el => el.id === elementId);

        if (!element) return;

        const config = normalizeElementAnimationConfig(element);
        const timeline = config.timelines[timelineIdx];
        const animation = timeline.animations[animIdx];

        if (!animation) return;

        const content = document.getElementById("timeline-properties-content");
        if (!content) return;

        content.innerHTML = `
      <div class="properties-group">
        <label>Type</label>
        <select onchange="console.log('Change type')">
          ${ANIMATION_TRANSITION_TYPES.map(
              type => `
            <option value="${type}" ${animation.type === type ? "selected" : ""}>${type}</option>
          `,
          ).join("")}
        </select>
      </div>
      <div class="properties-group">
        <label>Duration (ms)</label>
        <input type="number" value="${animation.duration}" min="100" step="50">
      </div>
      <div class="properties-group">
        <label>Delay (ms)</label>
        <input type="number" value="${animation.delay || 0}" min="0" step="50">
      </div>
      <div class="properties-group">
        <label>Easing</label>
        <select>
          ${ANIMATION_EASINGS.map(
              easing => `
            <option value="${easing}" ${animation.easing === easing ? "selected" : ""}>${easing}</option>
          `,
          ).join("")}
        </select>
      </div>
    `;
    }

    // Playback controls
    play() {
        const engine = getAnimationEngine();
        engine.play();
        this._updatePlayButton();
    }

    pause() {
        const engine = getAnimationEngine();
        engine.pause();
        this._updatePlayButton();
    }

    stop() {
        const engine = getAnimationEngine();
        engine.pause();
        engine.seek(0);
        this.playheadTime = 0;
        this._updateTimeDisplay();
        this._updatePlayButton();
    }

    seek(time) {
        const engine = getAnimationEngine();
        engine.seek(time);
        this.playheadTime = time;
        const scrubber = document.getElementById("timeline-scrubber");
        if (scrubber) {
            scrubber.value = time;
        }
        this._updateTimeDisplay();
    }

    // Zoom controls
    zoomIn() {
        this.zoomLevel = Math.min(4, this.zoomLevel * 1.2);
        this._updateZoomDisplay();
        this._updateRuler();
    }

    zoomOut() {
        this.zoomLevel = Math.max(0.25, this.zoomLevel / 1.2);
        this._updateZoomDisplay();
        this._updateRuler();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this._updateZoomDisplay();
        this._updateRuler();
    }

    _updateZoomDisplay() {
        const display = document.getElementById("timeline-zoom-level");
        if (display) {
            display.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }

    _updatePlayButton() {
        const engine = getAnimationEngine();
        const playBtn = document.getElementById("timeline-play");
        const pauseBtn = document.getElementById("timeline-pause");

        if (playBtn) {
            playBtn.classList.toggle("active", engine.isPlaying);
        }
        if (pauseBtn) {
            pauseBtn.classList.toggle("active", !engine.isPlaying);
        }
    }
}

// Global timeline editor instance
let _timelineEditor = null;

function getTimelineEditor() {
    if (!_timelineEditor) {
        _timelineEditor = new TimelineEditor();
        _timelineEditor.initialize();
    }
    return _timelineEditor;
}

function toggleTimelineEditor() {
    const editor = getTimelineEditor();
    editor.isVisible = !editor.isVisible;
    const container = document.getElementById("timeline-editor-panel");
    if (container) {
        container.style.display = editor.isVisible ? "flex" : "none";
    }
    if (editor.isVisible) {
        editor.updateTimeline();
    }
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        TimelineEditor,
        getTimelineEditor,
        toggleTimelineEditor,
    };
}
