/**
 * Animation State Management
 * Manages animation timeline, keyframes, and serialization
 */

// Animation configuration types
const ANIMATION_TRANSITION_TYPES = [
    "fadeIn",
    "fadeOut",
    "transform",
    "replacementTransform",
    "moveAlongPath",
    "scaleInPlace",
    "rotate",
    "write",
    "create",
    "uncreate",
    "moveInPlace",
    "colorShift",
    "strokeAnimate",
    "scaleXY",
    "combinedTransform",
    "zIndex",
];

const ANIMATION_EASINGS = [
    "linear",
    "easeIn",
    "easeOut",
    "easeInOut",
    "easeInQuad",
    "easeOutQuad",
    "easeInCubic",
    "easeOutCubic",
    "easeInQuart",
    "easeOutQuart",
    "easeInQuint",
    "easeOutQuint",
    "easeInExpo",
    "easeOutExpo",
    "easeInCirc",
    "easeOutCirc",
    "easeInBack",
    "easeOutBack",
    "easeInElastic",
    "easeOutElastic",
];

// Create a keyframe for an animation
function createKeyframe(time = 0, property = "opacity", value = 1, easing = "easeOut") {
    return {
        time: Math.max(0, Number(time) || 0),
        property: String(property),
        value,
        easing: ANIMATION_EASINGS.includes(easing) ? easing : "easeOut",
    };
}

// Create an animation object
function createAnimation(type = "fadeIn", overrides = {}) {
    const isValidType = ANIMATION_TRANSITION_TYPES.includes(type);
    const safeType = isValidType ? type : "fadeIn";

    return {
        id: generateId("anim"),
        type: safeType,
        duration: Math.max(100, Number(overrides.duration) || 600),
        delay: Math.max(0, Number(overrides.delay) || 0),
        easing: ANIMATION_EASINGS.includes(overrides.easing) ? overrides.easing : "easeOut",
        repeatCount: Math.max(0, Number(overrides.repeatCount) || 0),
        repeatDelay: Math.max(0, Number(overrides.repeatDelay) || 0),
        autoReverse: Boolean(overrides.autoReverse),
        keyframes: [],
        // Type-specific properties
        startScale: Number(overrides.startScale) || 0.8,
        startOpacity: Math.max(0, Math.min(1, Number(overrides.startOpacity) || 0)),
        endScale: Number(overrides.endScale) || 1,
        endOpacity: Math.max(0, Math.min(1, Number(overrides.endOpacity) || 1)),
        startColor: String(overrides.startColor || "#000000"),
        endColor: String(overrides.endColor || "#000000"),
        path: String(overrides.path || ""),
        strokeLength: Number(overrides.strokeLength) || 0,
        direction: String(overrides.direction || "up"),
        rotation: Number(overrides.rotation) || 0,
        // NEW: Position animation properties
        startX: Number(overrides.startX) || 0,
        endX: Number(overrides.endX) || 0,
        startY: Number(overrides.startY) || 0,
        endY: Number(overrides.endY) || 0,
        // NEW: Separate X/Y scale properties
        startScaleX: Number(overrides.startScaleX) || 1,
        endScaleX: Number(overrides.endScaleX) || 1,
        startScaleY: Number(overrides.startScaleY) || 1,
        endScaleY: Number(overrides.endScaleY) || 1,
        // NEW: Color animation properties
        colorProperty: String(overrides.colorProperty || "fill"),
        // NEW: Stroke width properties
        startStrokeWidth: Number(overrides.startStrokeWidth) || 0,
        endStrokeWidth: Number(overrides.endStrokeWidth) || 2,
        // NEW: Z-index properties
        startZIndex: Number(overrides.startZIndex) || 0,
        endZIndex: Number(overrides.endZIndex) || 100,
        // NEW: Combined transform - rotation
        startRotation: Number(overrides.startRotation) || 0,
        endRotation: Number(overrides.endRotation) || 0,
    };
}

// Create a timeline for an element
function createElementTimeline(elementId = "") {
    return {
        elementId: String(elementId),
        animations: [],
        totalDuration: 0,
    };
}

// Add animation to timeline
function addAnimationToTimeline(timeline, animation, startTime = 0) {
    if (!timeline || !animation) return timeline;

    const newTimeline = { ...timeline };
    newTimeline.animations = [...(timeline.animations || [])];

    newTimeline.animations.push({
        ...animation,
        startTime: Math.max(0, Number(startTime) || 0),
    });

    newTimeline.totalDuration = Math.max(
        newTimeline.totalDuration,
        Math.max(...newTimeline.animations.map(a => a.startTime + a.duration)),
    );

    return newTimeline;
}

// Remove animation from timeline
function removeAnimationFromTimeline(timeline, animationId) {
    if (!timeline) return timeline;

    const newTimeline = { ...timeline };
    newTimeline.animations = (timeline.animations || []).filter(a => a.id !== animationId);

    newTimeline.totalDuration =
        newTimeline.animations.length > 0 ? Math.max(...newTimeline.animations.map(a => a.startTime + a.duration)) : 0;

    return newTimeline;
}

// Update animation in timeline
function updateAnimationInTimeline(timeline, animationId, updates) {
    if (!timeline) return timeline;

    const newTimeline = { ...timeline };
    newTimeline.animations = (timeline.animations || []).map(a => (a.id === animationId ? { ...a, ...updates } : a));

    newTimeline.totalDuration =
        newTimeline.animations.length > 0 ? Math.max(...newTimeline.animations.map(a => a.startTime + a.duration)) : 0;

    return newTimeline;
}

// Normalize animation config from element state
function normalizeElementAnimationConfig(el = {}) {
    const legacyValue = typeof el.animation === "string" ? el.animation.trim() : "";
    const raw = legacyValue
        ? { type: legacyValue }
        : el.animation && typeof el.animation === "object"
          ? el.animation
          : null;

    if (!raw) return null;

    // If it's the old format with 'effect', convert to new 'type'
    if (raw.effect && !raw.type) {
        raw.type = convertLegacyEffectToType(raw.effect);
    }

    if (!ANIMATION_TRANSITION_TYPES.includes(raw.type)) {
        return null;
    }

    return {
        timelines: Array.isArray(raw.timelines) ? raw.timelines : [],
        autoAnimate: Boolean(raw.autoAnimate),
        laggedStart: Boolean(raw.laggedStart),
        laggedStartDelay: Math.max(0, Number(raw.laggedStartDelay) || 50),
    };
}

// Convert legacy animation effect names to new types
function convertLegacyEffectToType(effect) {
    const mapping = {
        "fade-in": "fadeIn",
        "fade-out": "fadeOut",
        "slide-up": "transform",
        "slide-down": "transform",
        "slide-left": "transform",
        "slide-right": "transform",
        "zoom-in": "scaleInPlace",
        "pop-in": "scaleInPlace",
        "wipe-in": "write",
    };
    return mapping[effect] || "fadeIn";
}

// Create default animation config for element
function createDefaultAnimationConfig(elementId = "") {
    return {
        elementId,
        timelines: [],
        autoAnimate: false,
        laggedStart: false,
        laggedStartDelay: 50,
    };
}

// Serialize animation to JSON
function serializeAnimation(animation) {
    if (!animation) return null;
    return JSON.parse(JSON.stringify(animation));
}

// Serialize timeline to JSON
function serializeTimeline(timeline) {
    if (!timeline) return null;
    return JSON.parse(JSON.stringify(timeline));
}

// Serialize animation config to JSON
function serializeAnimationConfig(config) {
    if (!config) return null;
    return JSON.parse(JSON.stringify(config));
}

// Deserialize animation from JSON
function deserializeAnimation(json) {
    if (!json || typeof json !== "object") return null;
    return createAnimation(json.type, json);
}

// Deserialize timeline from JSON
function deserializeTimeline(json) {
    if (!json || typeof json !== "object") return null;
    return {
        elementId: String(json.elementId || ""),
        animations: Array.isArray(json.animations) ? json.animations.map(deserializeAnimation) : [],
        totalDuration: Number(json.totalDuration) || 0,
    };
}

// Deserialize animation config from JSON
function deserializeAnimationConfig(json) {
    if (!json || typeof json !== "object") return null;
    return {
        elementId: String(json.elementId || ""),
        timelines: Array.isArray(json.timelines) ? json.timelines.map(deserializeTimeline) : [],
        autoAnimate: Boolean(json.autoAnimate),
        laggedStart: Boolean(json.laggedStart),
        laggedStartDelay: Math.max(0, Number(json.laggedStartDelay) || 50),
    };
}

// Check if element has animations configured
function hasAnimations(el = {}) {
    const config = normalizeElementAnimationConfig(el);
    return config && config.timelines && config.timelines.length > 0;
}

// Get total animation duration for element
function getAnimationDuration(el = {}) {
    const config = normalizeElementAnimationConfig(el);
    if (!config || !config.timelines) return 0;

    return Math.max(
        0,
        ...config.timelines.map(timeline =>
            Math.max(0, ...timeline.animations.map(anim => (anim.startTime || 0) + anim.duration)),
        ),
    );
}

// Export animation state
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        ANIMATION_TRANSITION_TYPES,
        ANIMATION_EASINGS,
        createKeyframe,
        createAnimation,
        createElementTimeline,
        addAnimationToTimeline,
        removeAnimationFromTimeline,
        updateAnimationInTimeline,
        normalizeElementAnimationConfig,
        convertLegacyEffectToType,
        createDefaultAnimationConfig,
        serializeAnimation,
        serializeTimeline,
        serializeAnimationConfig,
        deserializeAnimation,
        deserializeTimeline,
        deserializeAnimationConfig,
        hasAnimations,
        getAnimationDuration,
    };
}
