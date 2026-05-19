/**
 * Advanced Animation Types
 * ReplacementTransform, MoveAlongPath, TextMorph, and more
 * Extends the base animation engine with sophisticated transformation and morphing capabilities
 */

/**
 * Create a ReplacementTransform animation
 * Morphs one object into another through smooth interpolation
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createReplacementTransformAnimation(options = {}) {
    return {
        type: "replacementTransform",
        duration: options.duration || 800,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        // Starting geometry/properties (captured from source element)
        startGeometry: options.startGeometry || { width: 100, height: 100, x: 0, y: 0 },
        endGeometry: options.endGeometry || { width: 100, height: 100, x: 0, y: 0 },
        startColor: options.startColor || "#000000",
        endColor: options.endColor || "#000000",
        startOpacity: options.startOpacity !== undefined ? options.startOpacity : 1,
        endOpacity: options.endOpacity !== undefined ? options.endOpacity : 1,
        startScale: options.startScale || 1,
        endScale: options.endScale || 1,
        startRotation: options.startRotation || 0,
        endRotation: options.endRotation || 0,
    };
}

/**
 * Create a MoveAlongPath animation
 * Animates object movement along a Bézier curve or SVG path
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createMoveAlongPathAnimation(options = {}) {
    return {
        type: "moveAlongPath",
        duration: options.duration || 2000,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        // Path definition: either Bézier control points or SVG path string
        pathType: options.pathType || "bezier", // 'bezier', 'svgPath', 'linearPoints'
        // Bézier control points: { start, cp1, cp2, end } where each is {x, y}
        controlPoints: options.controlPoints || {
            start: { x: 0, y: 0 },
            cp1: { x: 100, y: -100 },
            cp2: { x: 200, y: -100 },
            end: { x: 300, y: 0 },
        },
        // Or SVG path: "M100,100 Q200,200 300,100"
        svgPath: options.svgPath || null,
        // Array of points: [{x, y}, {x, y}, ...]
        linearPoints: options.linearPoints || null,
        // Rotation: follow path (true) or fixed (false)
        followPath: options.followPath !== undefined ? options.followPath : false,
        // Start and end rotation (if not following path)
        startRotation: options.startRotation || 0,
        endRotation: options.endRotation || 0,
        // Optional: loop the path
        loop: options.loop || false,
    };
}

/**
 * Create a TextMorph animation
 * Smoothly transforms one text string to another
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createTextMorphAnimation(options = {}) {
    return {
        type: "textMorph",
        duration: options.duration || 1000,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        startText: options.startText || "Start",
        endText: options.endText || "End",
        morphMode: options.morphMode || "letter-by-letter", // 'full', 'letter-by-letter', 'crossfade'
        startColor: options.startColor || "#000000",
        endColor: options.endColor || "#000000",
        startOpacity: options.startOpacity !== undefined ? options.startOpacity : 1,
        endOpacity: options.endOpacity !== undefined ? options.endOpacity : 1,
        startScale: options.startScale || 1,
        endScale: options.endScale || 1,
    };
}

/**
 * Create an AnimatedChart animation
 * Progressive reveal of chart elements (bars, lines, points)
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createAnimatedChartAnimation(options = {}) {
    return {
        type: "animatedChart",
        duration: options.duration || 2000,
        delay: options.delay || 0,
        easing: options.easing || "easeOut",
        chartType: options.chartType || "bar", // 'bar', 'line', 'scatter', 'area'
        animationMode: options.animationMode || "staggered", // 'all-at-once', 'staggered', 'progressive'
        staggerDelay: options.staggerDelay || 100,
        // Data values: used for bar/area charts
        dataValues: options.dataValues || [100, 200, 300, 250],
        // Max value for scaling
        maxValue: options.maxValue || 300,
        // Direction: 'from-zero', 'from-right', 'from-bottom'
        direction: options.direction || "from-zero",
        // For line charts: reveal path progressively
        lineDrawMode: options.lineDrawMode || "stroke-dash", // 'stroke-dash', 'point-by-point'
    };
}

/**
 * Create an Uncreate animation (advanced version)
 * More sophisticated than the basic version, supports different destruction modes
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createUncreateAdvancedAnimation(options = {}) {
    return {
        type: "uncreateAdvanced",
        duration: options.duration || 800,
        delay: options.delay || 0,
        easing: options.easing || "easeIn",
        // Destruction modes: 'fade', 'shrink', 'explode', 'disintegrate'
        destructionMode: options.destructionMode || "fade",
        startOpacity: options.startOpacity !== undefined ? options.startOpacity : 1,
        endOpacity: options.endOpacity || 0,
        // For explode mode: particle velocity
        explosionVelocity: options.explosionVelocity || 5,
        // For disintegrate mode: fragment count
        fragmentCount: options.fragmentCount || 8,
    };
}

/**
 * Create an Emphasis animation - Pulse/Wiggle/Bounce
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createEmphasisAnimation(options = {}) {
    return {
        type: "emphasis",
        duration: options.duration || 600,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        emphasisType: options.emphasisType || "pulse", // 'pulse', 'wiggle', 'bounce', 'heartbeat'
        // Number of cycles/repetitions
        cycles: options.cycles || 1,
        // Intensity: 0-1 (how much scale/position change)
        intensity: options.intensity || 0.2,
        // For wiggle: amplitude
        amplitude: options.amplitude || 5,
    };
}

/**
 * Create a Blur transition animation
 * Progressive blur in or out
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createBlurAnimation(options = {}) {
    return {
        type: "blur",
        duration: options.duration || 600,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        // Blur direction: 'in' (appears from blur) or 'out' (blurs away)
        direction: options.direction || "in",
        startBlur: options.startBlur || 10,
        endBlur: options.endBlur || 0,
        startOpacity: options.startOpacity !== undefined ? options.startOpacity : 1,
        endOpacity: options.endOpacity !== undefined ? options.endOpacity : 1,
    };
}

/**
 * Create a Flip/3D rotation animation
 * Flip object in 3D space along X or Y axis
 * @param {Object} options
 * @returns {Object} Animation config
 */
function create3DFlipAnimation(options = {}) {
    return {
        type: "flip3D",
        duration: options.duration || 800,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        // Flip axis: 'x' (horizontal) or 'y' (vertical)
        axis: options.axis || "y",
        // Rotation amount in degrees
        rotation: options.rotation || 180,
        // Perspective depth
        perspective: options.perspective || 1000,
    };
}

/**
 * Create a Glow/Highlight animation
 * Pulsing glow effect or highlight emphasis
 * @param {Object} options
 * @returns {Object} Animation config
 */
function createGlowAnimation(options = {}) {
    return {
        type: "glow",
        duration: options.duration || 1000,
        delay: options.delay || 0,
        easing: options.easing || "easeInOut",
        // Glow color
        glowColor: options.glowColor || "#ffff00",
        // Starting glow blur radius
        startBlur: options.startBlur || 5,
        // Peak glow blur radius
        peakBlur: options.peakBlur || 20,
        // Number of pulses
        pulses: options.pulses || 2,
    };
}

/**
 * Path interpolation utilities for MoveAlongPath animations
 */

/**
 * Calculate point on Bézier curve using de Casteljau's algorithm
 * @param {Object} controlPoints { start, cp1, cp2, end } each with {x, y}
 * @param {number} t Progress (0-1)
 * @returns {Object} {x, y} point on curve
 */
function interpolateBezierCurve(controlPoints, t) {
    const { start, cp1, cp2, end } = controlPoints;

    // de Casteljau's algorithm
    const m0 = lerp(start, cp1, t);
    const m1 = lerp(cp1, cp2, t);
    const m2 = lerp(cp2, end, t);

    const m3 = lerp(m0, m1, t);
    const m4 = lerp(m1, m2, t);

    return lerp(m3, m4, t);
}

/**
 * Linear interpolation between two points
 */
function lerp(p1, p2, t) {
    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
    };
}

/**
 * Calculate angle (rotation) from Bézier curve tangent
 * @param {Object} controlPoints
 * @param {number} t Progress
 * @param {number} delta Small step for tangent calculation
 * @returns {number} Rotation in degrees
 */
function calculateBezierTangent(controlPoints, t, delta = 0.01) {
    const p1 = interpolateBezierCurve(controlPoints, Math.max(0, t - delta));
    const p2 = interpolateBezierCurve(controlPoints, Math.min(1, t + delta));

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return (angle * 180) / Math.PI;
}

/**
 * Parse SVG path and extract points
 * Simple parser for common SVG path commands (M, L, Q, C, Z)
 * @param {string} pathString SVG path string like "M100,100 L200,200 Q300,300 400,200"
 * @returns {Array} Array of {x, y} points
 */
function parseSVGPath(pathString) {
    const points = [];
    const commands = pathString.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];

    let currentPoint = { x: 0, y: 0 };
    let i = 0;

    while (i < commands.length) {
        const cmd = commands[i];

        if (/[MmLl]/.test(cmd)) {
            // MoveTo or LineTo
            const isRelative = cmd === "m" || cmd === "l";
            const x = parseFloat(commands[i + 1]);
            const y = parseFloat(commands[i + 2]);
            const nextPoint = isRelative ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
            currentPoint = nextPoint;
            points.push(currentPoint);
            i += 3;
        } else if (/[HhVv]/.test(cmd)) {
            // Horizontal or Vertical line
            if (cmd === "H") {
                currentPoint = { ...currentPoint, x: parseFloat(commands[i + 1]) };
            } else if (cmd === "h") {
                currentPoint.x += parseFloat(commands[i + 1]);
            } else if (cmd === "V") {
                currentPoint = { ...currentPoint, y: parseFloat(commands[i + 1]) };
            } else {
                currentPoint.y += parseFloat(commands[i + 1]);
            }
            points.push(currentPoint);
            i += 2;
        } else if (/[Zz]/.test(cmd)) {
            i += 1;
        } else {
            i += 1;
        }
    }

    return points.length > 0 ? points : [{ x: 0, y: 0 }];
}

/**
 * Find closest point on path for smooth interpolation
 * @param {Array} pathPoints Array of {x, y}
 * @param {number} t Progress (0-1)
 * @returns {Object} {x, y} interpolated point
 */
function interpolateAlongPath(pathPoints, t) {
    if (pathPoints.length === 0) return { x: 0, y: 0 };
    if (pathPoints.length === 1) return pathPoints[0];

    const index = t * (pathPoints.length - 1);
    const floorIndex = Math.floor(index);
    const fraction = index - floorIndex;

    const p1 = pathPoints[floorIndex];
    const p2 = pathPoints[Math.min(floorIndex + 1, pathPoints.length - 1)];

    return {
        x: p1.x + (p2.x - p1.x) * fraction,
        y: p1.y + (p2.y - p1.y) * fraction,
    };
}

/**
 * Export advanced animation creation functions
 */
window.createReplacementTransformAnimation = createReplacementTransformAnimation;
window.createMoveAlongPathAnimation = createMoveAlongPathAnimation;
window.createTextMorphAnimation = createTextMorphAnimation;
window.createAnimatedChartAnimation = createAnimatedChartAnimation;
window.createUncreateAdvancedAnimation = createUncreateAdvancedAnimation;
window.createEmphasisAnimation = createEmphasisAnimation;
window.createBlurAnimation = createBlurAnimation;
window.create3DFlipAnimation = create3DFlipAnimation;
window.createGlowAnimation = createGlowAnimation;

// Path utilities
window.interpolateBezierCurve = interpolateBezierCurve;
window.calculateBezierTangent = calculateBezierTangent;
window.parseSVGPath = parseSVGPath;
window.interpolateAlongPath = interpolateAlongPath;
