/**
 * Animation Inspector Panel
 * UI for managing animations on selected elements
 */

// Helper: Build type-specific animation property inputs
function buildAnimationTypeSpecificProps(anim, elementId, timelineIdx, animIdx) {
    const id = `${elementId}_${timelineIdx}_${animIdx}`;
    let html = "";

    switch (anim.type) {
        case "colorShift":
            html += `
              <div class="prop">
                <label>Color Property:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'colorProperty', this.value)">
                  <option value="fill" ${anim.colorProperty === "fill" ? "selected" : ""}>Fill</option>
                  <option value="stroke" ${anim.colorProperty === "stroke" ? "selected" : ""}>Stroke</option>
                  <option value="backgroundColor" ${anim.colorProperty === "backgroundColor" ? "selected" : ""}>Background</option>
                  <option value="color" ${anim.colorProperty === "color" ? "selected" : ""}>Text Color</option>
                </select>
              </div>
              <div class="prop">
                <label>Start Color:</label>
                <input type="color" value="${anim.startColor || '#000000'}"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startColor', this.value)">
              </div>
              <div class="prop">
                <label>End Color:</label>
                <input type="color" value="${anim.endColor || '#ffffff'}"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endColor', this.value)">
              </div>
            `;
            break;

        case "moveInPlace":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start X:</label>
                  <input type="number" value="${anim.startX || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startX', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>End X:</label>
                  <input type="number" value="${anim.endX || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endX', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Y:</label>
                  <input type="number" value="${anim.startY || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startY', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>End Y:</label>
                  <input type="number" value="${anim.endY || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endY', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
            `;
            break;

        case "scaleXY":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start Scale X:</label>
                  <input type="number" value="${anim.startScaleX || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startScaleX', this.value)">
                </div>
                <div class="prop">
                  <label>End Scale X:</label>
                  <input type="number" value="${anim.endScaleX || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endScaleX', this.value)">
                </div>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Scale Y:</label>
                  <input type="number" value="${anim.startScaleY || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startScaleY', this.value)">
                </div>
                <div class="prop">
                  <label>End Scale Y:</label>
                  <input type="number" value="${anim.endScaleY || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endScaleY', this.value)">
                </div>
              </div>
            `;
            break;

        case "strokeAnimate":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start Width:</label>
                  <input type="number" value="${anim.startStrokeWidth || 0}" step="0.5" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startStrokeWidth', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>End Width:</label>
                  <input type="number" value="${anim.endStrokeWidth || 2}" step="0.5" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endStrokeWidth', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
            `;
            break;

        case "combinedTransform":
            html += `
              <div class="prop-group-title">Position</div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start X:</label>
                  <input type="number" value="${anim.startX || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startX', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>End X:</label>
                  <input type="number" value="${anim.endX || 0}" step="10"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endX', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
              <div class="prop-group-title">Scale</div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Scale X:</label>
                  <input type="number" value="${anim.startScaleX || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startScaleX', this.value)">
                </div>
                <div class="prop">
                  <label>End Scale X:</label>
                  <input type="number" value="${anim.endScaleX || 1}" step="0.1" min="0"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endScaleX', this.value)">
                </div>
              </div>
              <div class="prop-group-title">Rotation</div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Angle:</label>
                  <input type="number" value="${anim.startRotation || 0}" step="15"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startRotation', this.value)">
                  <span class="unit">°</span>
                </div>
                <div class="prop">
                  <label>End Angle:</label>
                  <input type="number" value="${anim.endRotation || 0}" step="15"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endRotation', this.value)">
                  <span class="unit">°</span>
                </div>
              </div>
            `;
            break;

        case "zIndex":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start Z:</label>
                  <input type="number" value="${anim.startZIndex || 0}" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startZIndex', this.value)">
                </div>
                <div class="prop">
                  <label>End Z:</label>
                  <input type="number" value="${anim.endZIndex || 100}" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endZIndex', this.value)">
                </div>
              </div>
            `;
            break;

        case "emphasis":
            html += `
              <div class="prop">
                <label>Type:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'emphasisType', this.value)">
                  ${["pulse","wiggle","bounce","heartbeat","flash","shake"].map(t =>
                    `<option value="${t}" ${(anim.emphasisType||'pulse')===t?'selected':''}>${t}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Cycles:</label>
                  <input type="number" value="${anim.cycles || 2}" min="1" max="10" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'cycles', this.value)">
                </div>
                <div class="prop">
                  <label>Intensity:</label>
                  <input type="number" value="${anim.intensity || 0.2}" min="0" max="1" step="0.05"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'intensity', this.value)">
                </div>
              </div>
            `;
            break;

        case "blur":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start Blur:</label>
                  <input type="number" value="${anim.startBlur || 0}" min="0" max="50" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startBlur', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>End Blur:</label>
                  <input type="number" value="${anim.endBlur || 15}" min="0" max="50" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endBlur', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
            `;
            break;

        case "flip3D":
            html += `
              <div class="prop">
                <label>Axis:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'axis', this.value)">
                  <option value="y" ${(anim.axis||'y')==='y'?'selected':''}>Horizontal (Y)</option>
                  <option value="x" ${anim.axis==='x'?'selected':''}>Vertical (X)</option>
                </select>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Rotation:</label>
                  <input type="number" value="${anim.rotation || 180}" step="90"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'rotation', this.value)">
                  <span class="unit">°</span>
                </div>
                <div class="prop">
                  <label>Perspective:</label>
                  <input type="number" value="${anim.perspective || 1000}" step="100" min="200"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'perspective', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
            `;
            break;

        case "glow":
            html += `
              <div class="prop">
                <label>Glow Color:</label>
                <input type="color" value="${anim.glowColor || '#ffff00'}"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'glowColor', this.value)">
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Blur:</label>
                  <input type="number" value="${anim.startBlur || 5}" min="0" max="50" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startBlur', this.value)">
                  <span class="unit">px</span>
                </div>
                <div class="prop">
                  <label>Peak Blur:</label>
                  <input type="number" value="${anim.peakBlur || 25}" min="0" max="80" step="1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'peakBlur', this.value)">
                  <span class="unit">px</span>
                </div>
              </div>
              <div class="prop">
                <label>Pulses:</label>
                <input type="number" value="${anim.pulses || 2}" min="1" max="10" step="1"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'pulses', this.value)">
              </div>
            `;
            break;

        case "replacementTransform":
            html += `
              <div class="prop-row">
                <div class="prop">
                  <label>Start Color:</label>
                  <input type="color" value="${anim.startColor || '#4488ff'}"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startColor', this.value)">
                </div>
                <div class="prop">
                  <label>End Color:</label>
                  <input type="color" value="${anim.endColor || '#ff4488'}"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endColor', this.value)">
                </div>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Scale:</label>
                  <input type="number" value="${anim.startScale || 1}" min="0" step="0.1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startScale', this.value)">
                </div>
                <div class="prop">
                  <label>End Scale:</label>
                  <input type="number" value="${anim.endScale || 1.2}" min="0" step="0.1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endScale', this.value)">
                </div>
              </div>
            `;
            break;

        case "moveAlongPath":
            html += `
              <div class="prop">
                <label>Path Type:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'pathType', this.value)">
                  <option value="bezier" ${(anim.pathType||'bezier')==='bezier'?'selected':''}>Bezier Curve</option>
                  <option value="svgPath" ${anim.pathType==='svgPath'?'selected':''}>SVG Path</option>
                </select>
              </div>
              <div class="prop">
                <label>Follow Path:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'followPath', this.value==='true')">
                  <option value="true" ${anim.followPath?'selected':''}>Yes (rotate to tangent)</option>
                  <option value="false" ${!anim.followPath?'selected':''}>No</option>
                </select>
              </div>
            `;
            break;

        case "textMorph":
            html += `
              <div class="prop">
                <label>Mode:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'morphMode', this.value)">
                  ${["letter-by-letter","word-by-word","fade","typewriter"].map(m =>
                    `<option value="${m}" ${(anim.morphMode||'letter-by-letter')===m?'selected':''}>${m}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="prop-row">
                <div class="prop">
                  <label>Start Opacity:</label>
                  <input type="number" value="${anim.startOpacity ?? 0}" min="0" max="1" step="0.1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'startOpacity', this.value)">
                </div>
                <div class="prop">
                  <label>End Opacity:</label>
                  <input type="number" value="${anim.endOpacity ?? 1}" min="0" max="1" step="0.1"
                    onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'endOpacity', this.value)">
                </div>
              </div>
            `;
            break;

        case "animatedChart":
            html += `
              <div class="prop">
                <label>Chart Type:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'chartType', this.value)">
                  ${["bar","line","scatter","pie"].map(t =>
                    `<option value="${t}" ${(anim.chartType||'bar')===t?'selected':''}>${t}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="prop">
                <label>Mode:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'animationMode', this.value)">
                  ${["staggered","progressive","simultaneous"].map(m =>
                    `<option value="${m}" ${(anim.animationMode||'staggered')===m?'selected':''}>${m}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="prop">
                <label>Stagger Delay:</label>
                <input type="number" value="${anim.staggerDelay || 150}" min="0" max="500" step="25"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'staggerDelay', this.value)">
                <span class="unit">ms</span>
              </div>
            `;
            break;

        case "uncreateAdvanced":
            html += `
              <div class="prop">
                <label>Mode:</label>
                <select onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'destructionMode', this.value)">
                  ${["fade","shrink","explode","disintegrate"].map(m =>
                    `<option value="${m}" ${(anim.destructionMode||'explode')===m?'selected':''}>${m}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="prop">
                <label>Fragment Count:</label>
                <input type="number" value="${anim.fragmentCount || 12}" min="4" max="64" step="4"
                  onchange="updateAnimationProperty('${elementId}', ${timelineIdx}, ${animIdx}, 'fragmentCount', this.value)">
              </div>
            `;
            break;

        default:
            // Standard properties for common animation types
            break;
    }

    return html;
}

function buildAnimationInspectorPanel() {
    const data = getSelectedElementData();
    if (!data) return "";

    const config = normalizeElementAnimationConfig(data);
    const hasAnimations = config && config.timelines && config.timelines.length > 0;

    let html = `
    <div class="panel-section animation-inspector">
      <div class="section-header">
        <span class="icon">🎬</span>
        <span class="title">Animation</span>
      </div>

      <div class="section-content">
  `;

    if (!hasAnimations) {
        html += `
      <div class="empty-state">
        <p>No animations yet</p>
        <button class="btn-primary btn-sm" onclick="openAnimationPresetSelector('${data.id}')">
          + Add Animation
        </button>
      </div>
    `;
    } else {
        // Show animation list
        html += `<div class="animation-list">`;

        config.timelines.forEach((timeline, timelineIdx) => {
            timeline.animations.forEach((anim, animIdx) => {
                html += `
          <div class="animation-item">
            <div class="animation-header">
              <span class="animation-type">${anim.type}</span>
              <div class="animation-controls">
                <button class="btn-icon" onclick="editAnimation('${data.id}', ${timelineIdx}, ${animIdx})">✎</button>
                <button class="btn-icon danger" onclick="removeAnimation('${data.id}', ${timelineIdx}, ${animIdx})">✕</button>
              </div>
            </div>
            <div class="animation-props">
              <div class="prop">
                <label>Duration:</label>
                <input type="number" min="100" max="5000" step="100" value="${anim.duration}"
                  onchange="updateAnimationProperty('${data.id}', ${timelineIdx}, ${animIdx}, 'duration', this.value)">
                <span class="unit">ms</span>
              </div>
              <div class="prop">
                <label>Delay:</label>
                <input type="number" min="0" max="2000" step="50" value="${anim.delay || 0}"
                  onchange="updateAnimationProperty('${data.id}', ${timelineIdx}, ${animIdx}, 'delay', this.value)">
                <span class="unit">ms</span>
              </div>
              <div class="prop">
                <label>Easing:</label>
                <select onchange="updateAnimationProperty('${data.id}', ${timelineIdx}, ${animIdx}, 'easing', this.value)">
                  ${ANIMATION_EASINGS.map(
                      easing => `
                    <option value="${easing}" ${anim.easing === easing ? "selected" : ""}>${easing}</option>
                  `,
                  ).join("")}
                </select>
              </div>
              ${buildAnimationTypeSpecificProps(anim, data.id, timelineIdx, animIdx)}
            </div>
          </div>
        `;
            });
        });

        html += `</div>`;

        html += `
      <button class="btn-secondary btn-sm" onclick="openAnimationPresetSelector('${data.id}')">
        + Add Animation
      </button>
    `;
    }

    html += `
      </div>
    </div>

    <style>
      .animation-inspector {
        margin-top: 12px;
      }

      .animation-inspector .section-header {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--divider, #e5e7eb);
        cursor: pointer;
        user-select: none;
      }

      .animation-inspector .icon {
        margin-right: 8px;
        font-size: 16px;
      }

      .animation-inspector .title {
        font-weight: 600;
        flex: 1;
      }

      .animation-inspector .section-content {
        padding: 12px;
      }

      .animation-inspector .empty-state {
        text-align: center;
        padding: 20px 12px;
        color: var(--text-muted, #6b7280);
      }

      .animation-inspector .empty-state p {
        margin: 0 0 12px 0;
        font-size: 13px;
      }

      .animation-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }

      .animation-item {
        border: 1px solid var(--divider, #e5e7eb);
        border-radius: 6px;
        padding: 8px;
        background: var(--bg-secondary, #f9fafb);
      }

      .animation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .animation-type {
        font-weight: 500;
        font-size: 13px;
        color: var(--text-primary, #172033);
      }

      .animation-controls {
        display: flex;
        gap: 4px;
      }

      .btn-icon {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 2px;
        font-size: 12px;
        color: var(--text-secondary, #6b7280);
        border-radius: 3px;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: var(--bg-tertiary, #f3f4f6);
        color: var(--text-primary, #172033);
      }

      .btn-icon.danger:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      .animation-props {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .animation-props .prop {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }

      .animation-props label {
        flex: 0 0 60px;
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
      }

      .animation-props input,
      .animation-props select {
        flex: 1;
        padding: 4px 6px;
        border: 1px solid var(--divider, #e5e7eb);
        border-radius: 3px;
        font-size: 12px;
        font-family: inherit;
      }

      .animation-props input[type="color"] {
        width: 40px;
        height: 32px;
        padding: 2px;
        cursor: pointer;
      }

      .animation-props .unit {
        flex: 0 0 20px;
        color: var(--text-tertiary, #9ca3af);
        font-size: 11px;
      }

      .prop-row {
        display: flex;
        gap: 12px;
      }

      .prop-row .prop {
        flex: 1;
      }

      .prop-group-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
        margin: 8px 0 4px 0;
        padding: 4px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--divider, #e5e7eb);
      }

      .btn-primary, .btn-secondary {
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--accent, #2563eb);
        color: white;
      }

      .btn-primary:hover {
        background: var(--accent-dark, #1d4ed8);
      }

      .btn-secondary {
        background: var(--bg-secondary, #f9fafb);
        color: var(--text-primary, #172033);
        border: 1px solid var(--divider, #e5e7eb);
      }

      .btn-secondary:hover {
        background: var(--bg-tertiary, #f3f4f6);
      }

      .btn-sm {
        padding: 6px 10px;
        font-size: 12px;
      }
    </style>
  `;

    return html;
}

// Open animation preset selector
function openAnimationPresetSelector(elementId) {
    const presets = getAllPresets();
    const categories = Object.keys(PRESET_CATEGORIES);

    let html = `
    <div class="modal-overlay" onclick="closeAnimationPresetSelector()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>Choose Animation</h3>
          <button class="btn-close" onclick="closeAnimationPresetSelector()">×</button>
        </div>

        <div class="modal-body">
  `;

    // Show presets by category
    categories.forEach(category => {
        const categoryPresets = getPresetsByCategory(category);
        if (categoryPresets.length === 0) return;

        const categoryInfo = PRESET_CATEGORIES[category];
        html += `
      <div class="preset-category">
        <h4 class="category-title">${categoryInfo.name}</h4>
        <div class="preset-grid">
    `;

        categoryPresets.forEach(preset => {
            html += `
        <button class="preset-card" onclick="applyAnimationPreset('${elementId}', '${preset.id}')">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-duration">${preset.duration}ms</span>
        </button>
      `;
        });

        html += `
        </div>
      </div>
    `;
    });

    html += `
        </div>

        <style>
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
          }

          .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .btn-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
            padding: 0;
            width: 24px;
            height: 24px;
          }

          .btn-close:hover {
            color: #172033;
          }

          .modal-body {
            padding: 20px;
          }

          .preset-category {
            margin-bottom: 24px;
          }

          .category-title {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
            letter-spacing: 0.5px;
          }

          .preset-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
          }

          .preset-card {
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #f9fafb;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            text-align: center;
          }

          .preset-card:hover {
            background: #f3f4f6;
            border-color: #2563eb;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          }

          .preset-name {
            font-weight: 500;
            font-size: 13px;
            color: #172033;
          }

          .preset-duration {
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </div>
    </div>
  `;

    const overlay = document.createElement("div");
    overlay.innerHTML = html;
    overlay.id = "animation-preset-selector";
    document.body.appendChild(overlay);
}

function closeAnimationPresetSelector() {
    const selector = document.getElementById("animation-preset-selector");
    if (selector) {
        selector.remove();
    }
}

function applyAnimationPreset(elementId, presetName) {
    const preset = getPreset(presetName);
    if (!preset) return;

    closeAnimationPresetSelector();

    // Create animation from preset
    const animation = createPresetAnimation(presetName);

    // Add to element
    saveStateToUndo();

    const element = getElementDataById(elementId);
    if (!element) return;

    // Initialize animation config if needed
    if (!element.animation || typeof element.animation !== "object") {
        element.animation = createDefaultAnimationConfig(elementId);
    }

    // Add timeline and animation
    const timeline = createElementTimeline(elementId);
    timeline.animations.push(animation);

    if (!element.animation.timelines) {
        element.animation.timelines = [];
    }
    element.animation.timelines.push(timeline);

    // Update UI
    renderSlidesFromState();
    buildPropertiesPanel();
    if (typeof getTimelineEditor === "function" && typeof _timelineEditor !== "undefined" && _timelineEditor?.isVisible) {
        getTimelineEditor().updateFromSelection();
    }
    if (typeof playConfiguredSlideAnimations === "function" && typeof currentSlideIndex !== "undefined") {
        requestAnimationFrame(() => playConfiguredSlideAnimations(currentSlideIndex, { restoreOnComplete: true }));
    }

    // Show success feedback
    showNotification(`Added animation: ${preset.name}`, "success");
}

function updateAnimationProperty(elementId, timelineIdx, animIdx, property, value) {
    const element = getElementDataById(elementId);
    if (!element || !element.animation) return;

    const timeline = element.animation.timelines?.[timelineIdx];
    if (!timeline) return;

    const animation = timeline.animations?.[animIdx];
    if (!animation) return;

    saveStateToUndo();

    // Update property - handle all supported types
    switch (property) {
        // Base properties
        case "duration":
            animation.duration = Math.max(100, Number(value) || 600);
            break;
        case "delay":
            animation.delay = Math.max(0, Number(value) || 0);
            break;
        case "easing":
            animation.easing = String(value);
            break;
        // colorShift properties
        case "colorProperty":
            animation.colorProperty = String(value);
            break;
        case "startColor":
        case "endColor":
            animation[property] = String(value);
            break;
        // moveInPlace / combinedTransform position properties
        case "startX":
        case "endX":
        case "startY":
        case "endY":
            animation[property] = Number(value) || 0;
            break;
        // scaleXY / combinedTransform scale properties
        case "startScaleX":
        case "endScaleX":
        case "startScaleY":
        case "endScaleY":
            animation[property] = Math.max(0, Number(value) || 1);
            break;
        // combinedTransform rotation properties
        case "startRotation":
        case "endRotation":
            animation[property] = Number(value) || 0;
            break;
        // strokeAnimate properties
        case "startStrokeWidth":
        case "endStrokeWidth":
            animation[property] = Math.max(0, Number(value) || 0);
            break;
        // zIndex properties
        case "startZIndex":
        case "endZIndex":
            animation[property] = Math.round(Number(value) || 0);
            break;
        // replacementTransform / textMorph scale
        case "startScale":
        case "endScale":
            animation[property] = Math.max(0, Number(value) || 1);
            break;
        // blur properties
        case "startBlur":
        case "endBlur":
            animation[property] = Math.max(0, Number(value) || 0);
            break;
        // opacity
        case "startOpacity":
        case "endOpacity":
            animation[property] = Math.max(0, Math.min(1, Number(value) || 0));
            break;
        // emphasis properties
        case "emphasisType":
        case "destructionMode":
        case "morphMode":
        case "colorProperty":
        case "pathType":
        case "chartType":
        case "animationMode":
            animation[property] = String(value);
            break;
        case "cycles":
        case "pulses":
        case "fragmentCount":
            animation[property] = Math.max(1, Number(value) || 1);
            break;
        case "intensity":
        case "amplitude":
        case "staggerDelay":
        case "explosionVelocity":
        case "perspective":
        case "rotation":
            animation[property] = Number(value) || 0;
            break;
        default:
            // Fallback: store raw value
            animation[property] = value;
            break;
    }

    renderSlidesFromState();
    buildPropertiesPanel();
}

function removeAnimation(elementId, timelineIdx, animIdx) {
    const element = getElementDataById(elementId);
    if (!element || !element.animation) return;

    const timeline = element.animation.timelines?.[timelineIdx];
    if (!timeline) return;

    saveStateToUndo();

    timeline.animations.splice(animIdx, 1);

    if (timeline.animations.length === 0) {
        element.animation.timelines.splice(timelineIdx, 1);
    }

    if (element.animation.timelines.length === 0) {
        element.animation = null;
    }

    renderSlidesFromState();
    buildPropertiesPanel();
}

// editAnimation - currently a no-op since props are always shown inline
// (UI calls this, but inline editing is the primary workflow)
function editAnimation(elementId, timelineIdx, animIdx) {
    // Future: could open a dedicated modal for complex animation types.
    // For now, properties are already editable inline in the animation list.
    console.log('[Animation] editAnimation called:', elementId, timelineIdx, animIdx);
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: ${type === "success" ? "#10b981" : "#3b82f6"};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    animation: slideIn 0.3s ease-out;
  `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Helper function - get element data by ID
function getElementDataById(elementId) {
    const slide = getCurrentSlide();
    if (!slide) return null;
    return slide.elements.find(el => el.id === elementId) || null;
}

// Helper function - get current slide
function getCurrentSlide() {
    if (typeof state === "undefined") return null;
    const slideIndex = typeof getCurrentSlideIndex === "function" ? getCurrentSlideIndex() : 0;
    return state.slides[slideIndex] || null;
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        buildAnimationInspectorPanel,
        openAnimationPresetSelector,
        closeAnimationPresetSelector,
        applyAnimationPreset,
        updateAnimationProperty,
        removeAnimation,
    };
}
