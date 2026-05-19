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

function buildAnimationInspectorPanel(data) {
    if (!data) data = (typeof getSelectedElementData === "function") ? getSelectedElementData() : null;
    if (!data) return "";

    const animation = (typeof getElementAnimationConfig === "function") ? getElementAnimationConfig(data) : null;
    const config    = (typeof normalizeElementAnimationConfig === "function") ? normalizeElementAnimationConfig(data) : null;
    const hasTimelines = config?.timelines?.length > 0;
    const isEnabled = !!animation;
    const isOnClick = (animation?.trigger || "on-slide") === "on-click";

    // Effect options
    const effectOpts = (typeof PRESENTATION_ANIMATION_EFFECTS !== "undefined" ? PRESENTATION_ANIMATION_EFFECTS : [
        "fade-in","slide-up","slide-down","slide-left","slide-right","zoom-in","pop-in","wipe-in","pulse","glow"
    ]).map(e => `<option value="${e}" ${(animation?.effect||"fade-in")===e?"selected":""}>${
        typeof describeAnimationEffect === "function" ? describeAnimationEffect(e) : e}</option>`).join("");

    // Easing options
    const easingOpts = [
        ["ease-out","Ease Out"],["ease-in","Ease In"],["ease-in-out","Ease In-Out"],["linear","Linear"],
        ["cubic-bezier(0.34,1.56,0.64,1)","Spring"],["cubic-bezier(0.4,0,0.2,1)","Material"]
    ].map(([v,l]) => `<option value="${v}" ${(animation?.easing||"ease-out")===v?"selected":""}>${l}</option>`).join("");

    // Timeline items
    let timelineHTML = "";
    if (hasTimelines) {
        config.timelines.forEach((tl, ti) => {
            tl.animations.forEach((anim, ai) => {
                const typeLabel = anim.type || "animation";
                const icon = { fadeIn:"✦", slideUp:"↑", slideDown:"↓", slideLeft:"←", slideRight:"→",
                    zoomIn:"⊕", popIn:"⊛", emphasis:"★", blur:"◎", glow:"✵",
                    colorShift:"🎨", flip3D:"⟳", textMorph:"Ꞇ", moveAlongPath:"⤷" }[typeLabel] || "▶";
                timelineHTML += `
                <div class="sf-anim-item" data-ti="${ti}" data-ai="${ai}">
                    <div class="sf-anim-item-header">
                        <span class="sf-anim-item-icon">${icon}</span>
                        <span class="sf-anim-item-type">${typeLabel}</span>
                        <span class="sf-anim-item-meta">${anim.duration||600}ms · ${anim.trigger||"on-slide"}</span>
                        <div class="sf-anim-item-actions">
                            <button class="sf-anim-edit-btn" onclick="editAnimation('${data.id}',${ti},${ai})" title="Edit">✎</button>
                            <button class="sf-anim-del-btn" onclick="removeAnimation('${data.id}',${ti},${ai})" title="Remove">✕</button>
                        </div>
                    </div>
                    <div class="sf-anim-item-props">
                        <div class="sf-anim-prop-row">
                            <label>Trigger</label>
                            <select onchange="updateAnimationProperty('${data.id}',${ti},${ai},'trigger',this.value)">
                                <option value="on-slide" ${(anim.trigger||"on-slide")==="on-slide"?"selected":""}>With slide</option>
                                <option value="on-click" ${anim.trigger==="on-click"?"selected":""}>On click</option>
                            </select>
                        </div>
                        <div class="sf-anim-prop-row">
                            <label>Duration</label>
                            <input type="number" min="100" max="5000" step="100" value="${anim.duration||600}"
                                onchange="updateAnimationProperty('${data.id}',${ti},${ai},'duration',this.value)">
                            <span class="sf-anim-unit">ms</span>
                        </div>
                        <div class="sf-anim-prop-row">
                            <label>Delay</label>
                            <input type="number" min="0" max="3000" step="50" value="${anim.delay||0}"
                                onchange="updateAnimationProperty('${data.id}',${ti},${ai},'delay',this.value)">
                            <span class="sf-anim-unit">ms</span>
                        </div>
                        <div class="sf-anim-prop-row">
                            <label>Easing</label>
                            <select onchange="updateAnimationProperty('${data.id}',${ti},${ai},'easing',this.value)">
                                ${(typeof ANIMATION_EASINGS !== "undefined" ? ANIMATION_EASINGS : ["ease-out","ease-in","ease-in-out","linear"])
                                    .map(e => `<option value="${e}" ${anim.easing===e?"selected":""}>${e}</option>`).join("")}
                            </select>
                        </div>
                        ${buildAnimationTypeSpecificProps(anim, data.id, ti, ai)}
                    </div>
                </div>`;
            });
        });
    }

    return `
<div class="sf-anim-panel">
  <div class="sf-anim-panel-header">
    <span class="sf-anim-panel-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </span>
    <span class="sf-anim-panel-title">Animation</span>
    <label class="sf-anim-toggle-wrap" title="Enable animation">
      <input type="checkbox" id="prop-anim-enabled" class="sf-anim-toggle-input" ${isEnabled ? "checked" : ""}>
      <span class="sf-anim-toggle-track"><span class="sf-anim-toggle-thumb"></span></span>
    </label>
  </div>

  <div id="prop-anim-controls" class="sf-anim-controls${isEnabled ? "" : " sf-anim-hidden"}">

    <!-- Slide Animation (Reveal.js) -->
    <div class="sf-anim-section">
      <div class="sf-anim-section-label">Slide Entry</div>
      <div class="sf-anim-grid-2">
        <div class="sf-anim-field">
          <label>Effect</label>
          <select id="prop-anim-effect">${effectOpts}</select>
        </div>
        <div class="sf-anim-field">
          <label>Trigger</label>
          <select id="prop-anim-trigger">
            <option value="on-slide" ${!isOnClick?"selected":""}>With Slide</option>
            <option value="on-click" ${isOnClick?"selected":""}>On Click</option>
          </select>
        </div>
      </div>
      <div id="prop-anim-order-wrap" class="sf-anim-field${isOnClick?"":" sf-anim-hidden"}">
        <label>Click Order</label>
        <input type="number" id="prop-anim-order" min="0" max="99" value="${animation?.order??0}">
      </div>
      <div class="sf-anim-grid-3">
        <div class="sf-anim-field">
          <label>Duration</label>
          <div class="sf-anim-input-unit">
            <input type="number" id="prop-anim-duration" min="100" step="50" value="${animation?.durationMs??800}">
            <span>ms</span>
          </div>
        </div>
        <div class="sf-anim-field">
          <label>Delay</label>
          <div class="sf-anim-input-unit">
            <input type="number" id="prop-anim-delay" min="0" step="50" value="${animation?.delayMs??0}">
            <span>ms</span>
          </div>
        </div>
        <div class="sf-anim-field">
          <label>Easing</label>
          <select id="prop-anim-easing">${easingOpts}</select>
        </div>
      </div>
    </div>

    <!-- Advanced Timeline -->
    <div class="sf-anim-section">
      <div class="sf-anim-section-label">Advanced Timeline</div>
      ${hasTimelines
        ? `<div class="sf-anim-timeline-list">${timelineHTML}</div>`
        : `<div class="sf-anim-empty">No timeline animations yet.</div>`}
      <button class="sf-anim-add-btn" onclick="openAnimationPresetSelector('${data.id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Timeline Animation
      </button>
    </div>

  </div>
</div>

<style>
.sf-anim-panel {
    margin: 6px 0;
    border: 1px solid rgba(148,163,184,0.22);
    border-radius: 12px;
    background: var(--panel-card, #fff);
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.sf-anim-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: linear-gradient(90deg, rgba(37,99,235,0.07) 0%, rgba(99,102,241,0.04) 100%);
    border-bottom: 1px solid rgba(148,163,184,0.15);
}
.sf-anim-panel-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px; height: 24px;
    border-radius: 7px;
    background: linear-gradient(135deg, #2563eb, #4f46e5);
    color: #fff;
    flex-shrink: 0;
}
.sf-anim-panel-title {
    flex: 1;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-main, #0f172a);
    letter-spacing: 0.01em;
}
/* Toggle switch */
.sf-anim-toggle-wrap { display: inline-flex; align-items: center; cursor: pointer; }
.sf-anim-toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
.sf-anim-toggle-track {
    position: relative;
    width: 32px; height: 18px;
    border-radius: 999px;
    background: rgba(148,163,184,0.4);
    transition: background 0.2s ease;
}
.sf-anim-toggle-input:checked + .sf-anim-toggle-track { background: #2563eb; }
.sf-anim-toggle-thumb {
    position: absolute;
    top: 2px; left: 2px;
    width: 14px; height: 14px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.sf-anim-toggle-input:checked + .sf-anim-toggle-track .sf-anim-toggle-thumb { transform: translateX(14px); }

.sf-anim-controls { padding: 12px 14px; display: flex; flex-direction: column; gap: 14px; }
.sf-anim-hidden { display: none !important; }

.sf-anim-section { display: flex; flex-direction: column; gap: 8px; }
.sf-anim-section-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-sub, #64748b);
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(148,163,184,0.18);
}
.sf-anim-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sf-anim-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.sf-anim-field { display: flex; flex-direction: column; gap: 3px; }
.sf-anim-field label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-sub, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.sf-anim-field input,
.sf-anim-field select {
    padding: 5px 7px;
    border: 1px solid rgba(148,163,184,0.35);
    border-radius: 7px;
    font-size: 11px;
    font-family: inherit;
    background: var(--surface, #f8fafc);
    color: var(--text-main, #0f172a);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    width: 100%;
    box-sizing: border-box;
}
.sf-anim-field input:focus,
.sf-anim-field select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.12);
}
.sf-anim-input-unit { display: flex; align-items: center; gap: 4px; }
.sf-anim-input-unit input { flex: 1; min-width: 0; }
.sf-anim-input-unit span { font-size: 10px; color: var(--text-sub,#94a3b8); flex-shrink: 0; }

/* Timeline items */
.sf-anim-timeline-list { display: flex; flex-direction: column; gap: 6px; }
.sf-anim-item {
    border: 1px solid rgba(148,163,184,0.22);
    border-radius: 9px;
    background: var(--surface-soft, #f8fafc);
    overflow: hidden;
    transition: border-color 0.15s;
}
.sf-anim-item:hover { border-color: rgba(37,99,235,0.3); }
.sf-anim-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    background: rgba(255,255,255,0.7);
    border-bottom: 1px solid rgba(148,163,184,0.12);
    cursor: default;
}
.sf-anim-item-icon { font-size: 12px; width: 18px; text-align: center; flex-shrink: 0; }
.sf-anim-item-type { font-size: 11px; font-weight: 700; color: var(--text-main,#0f172a); flex: 1; min-width: 0; }
.sf-anim-item-meta { font-size: 10px; color: var(--text-sub,#94a3b8); }
.sf-anim-item-actions { display: flex; gap: 3px; }
.sf-anim-edit-btn, .sf-anim-del-btn {
    width: 22px; height: 22px;
    border: none; background: transparent;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-sub,#94a3b8);
    display: inline-flex; align-items: center; justify-content: center;
    transition: background 0.14s, color 0.14s;
}
.sf-anim-edit-btn:hover { background: rgba(37,99,235,0.1); color: #2563eb; }
.sf-anim-del-btn:hover { background: rgba(220,38,38,0.08); color: #dc2626; }
.sf-anim-item-props { padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; }
.sf-anim-prop-row {
    display: grid;
    grid-template-columns: 54px 1fr auto;
    align-items: center;
    gap: 6px;
    font-size: 11px;
}
.sf-anim-prop-row label { font-size: 10px; font-weight: 600; color: var(--text-sub,#64748b); }
.sf-anim-prop-row input,
.sf-anim-prop-row select {
    padding: 3px 6px;
    border: 1px solid rgba(148,163,184,0.3);
    border-radius: 5px;
    font-size: 11px; font-family: inherit;
    background: var(--surface,#fff);
    color: var(--text-main,#0f172a);
}
.sf-anim-prop-row input:focus,
.sf-anim-prop-row select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
.sf-anim-unit { font-size: 10px; color: var(--text-sub,#94a3b8); }

.sf-anim-empty {
    text-align: center;
    padding: 12px 8px;
    font-size: 11px;
    color: var(--text-sub,#94a3b8);
    background: rgba(148,163,184,0.06);
    border-radius: 8px;
    border: 1px dashed rgba(148,163,184,0.3);
}
.sf-anim-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 7px 12px;
    border: 1px dashed rgba(37,99,235,0.3);
    border-radius: 8px;
    background: rgba(37,99,235,0.04);
    color: #2563eb;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.sf-anim-add-btn:hover { background: rgba(37,99,235,0.1); border-color: rgba(37,99,235,0.5); }
/* prop / prop-row used by buildAnimationTypeSpecificProps */
.sf-anim-item-props .prop { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.sf-anim-item-props .prop label { flex: 0 0 68px; font-size: 10px; font-weight: 600; color: var(--text-sub,#64748b); }
.sf-anim-item-props .prop input,
.sf-anim-item-props .prop select { flex: 1; padding: 3px 6px; border: 1px solid rgba(148,163,184,0.3); border-radius: 5px; font-size: 11px; font-family: inherit; background: var(--surface,#fff); }
.sf-anim-item-props .prop .unit { flex: 0 0 20px; font-size: 10px; color: var(--text-sub,#94a3b8); }
.sf-anim-item-props .prop-row { display: flex; gap: 10px; }
.sf-anim-item-props .prop-row .prop { flex: 1; }
.sf-anim-item-props .prop-group-title { font-size: 10px; font-weight: 700; color: var(--text-sub,#64748b); text-transform: uppercase; margin: 6px 0 2px; padding-bottom: 3px; border-bottom: 1px solid rgba(148,163,184,0.2); }
</style>`;
}

/**
 * Bind all animation panel event listeners.
 * Called by properties.js after the panel HTML is injected into the DOM.
 */
function bindAnimationPanelListeners(data) {
    if (!data) return;
    const enabled   = document.getElementById("prop-anim-enabled");
    const controls  = document.getElementById("prop-anim-controls");
    const effect    = document.getElementById("prop-anim-effect");
    const trigger   = document.getElementById("prop-anim-trigger");
    const orderWrap = document.getElementById("prop-anim-order-wrap");
    const order     = document.getElementById("prop-anim-order");
    const duration  = document.getElementById("prop-anim-duration");
    const delay     = document.getElementById("prop-anim-delay");
    const easing    = document.getElementById("prop-anim-easing");

    const currentAnimation = (typeof getElementAnimationConfig === "function") ? getElementAnimationConfig(data) : null;

    const getNum = (input, fallback) => {
        const p = parseInt(input?.value, 10);
        return Number.isFinite(p) ? p : fallback;
    };

    const buildConfig = () => ({
        effect:     effect?.value  || "fade-in",
        trigger:    trigger?.value === "on-click" ? "on-click" : "on-slide",
        order:      getNum(order, 0),
        durationMs: getNum(duration, 800),
        delayMs:    getNum(delay, 0),
        easing:     easing?.value  || "ease-out",
    });

    const commit = () => {
        if (!enabled?.checked) {
            if (typeof setElementAnimationConfig === "function") setElementAnimationConfig(data.id, null);
            return;
        }
        if (typeof setElementAnimationConfig === "function") setElementAnimationConfig(data.id, buildConfig());
    };

    if (enabled) {
        enabled.onchange = () => {
            controls?.classList.toggle("sf-anim-hidden", !enabled.checked);
            if (enabled.checked && trigger?.value === "on-click" && !currentAnimation && order) {
                if (typeof getNextClickAnimationOrder === "function")
                    order.value = String(getNextClickAnimationOrder(data.id));
            }
            commit();
        };
    }

    if (trigger) {
        trigger.onchange = () => {
            const isClick = trigger.value === "on-click";
            orderWrap?.classList.toggle("sf-anim-hidden", !isClick);
            if (isClick && currentAnimation?.trigger !== "on-click" && order) {
                if (typeof getNextClickAnimationOrder === "function")
                    order.value = String(getNextClickAnimationOrder(data.id));
            }
            commit();
        };
    }

    [effect, order, duration, delay, easing].forEach(input => {
        if (input) input.onchange = commit;
    });
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
    if (!animation) {
        console.warn("Unknown animation preset:", presetName);
        showNotification?.("Could not add animation preset", "error");
        return;
    }

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
    timeline.totalDuration = Math.max(
        0,
        ...timeline.animations.map(anim => (Number(anim.startTime ?? anim.delay) || 0) + (Number(anim.duration) || 0)),
    );

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
        case "trigger":
            animation.trigger = value === "on-click" ? "on-click" : "on-slide";
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
