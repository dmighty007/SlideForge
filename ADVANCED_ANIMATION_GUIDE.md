# Advanced Animation Types - Implementation Guide

## Overview

This document describes the new advanced animation types added to the slide editor's animation engine. These animations enable sophisticated visual effects including object morphing, trajectory animation, text transformation, and interactive emphasis effects.

## New Animation Types

### 1. ReplacementTransform

**Purpose**: Smoothly morph one object state into another through geometry, color, scale, and rotation interpolation.

**When to Use**:

- Transforming one shape into another
- Morphing UI elements
- Color and scale transitions during object transformation
- Creating sophisticated object metamorphosis effects

**Properties**:

```javascript
{
    type: 'replacementTransform',
    duration: 800,                          // Animation duration in ms
    delay: 0,                               // Delay before animation starts
    easing: 'easeInOut',                   // Easing function
    startGeometry: { width, height, x, y }, // Starting position/size
    endGeometry: { width, height, x, y },   // Ending position/size
    startColor: '#000000',                 // Starting color
    endColor: '#ffffff',                   // Ending color
    startOpacity: 1,                       // Starting transparency
    endOpacity: 1,                         // Ending transparency
    startScale: 1,                         // Starting scale factor
    endScale: 1,                           // Ending scale factor
    startRotation: 0,                      // Starting rotation in degrees
    endRotation: 360,                      // Ending rotation in degrees
}
```

**Example**:

```javascript
const animation = createReplacementTransformAnimation({
    duration: 1000,
    startGeometry: { width: 100, height: 100, x: 0, y: 0 },
    endGeometry: { width: 150, height: 150, x: 50, y: 50 },
    startColor: "#ff0000",
    endColor: "#0000ff",
    startScale: 1,
    endScale: 1.2,
    easing: "easeInOut",
});
applyAnimationToElement("shape-1", animation);
```

---

### 2. MoveAlongPath

**Purpose**: Animate object movement along a Bézier curve, SVG path, or series of linear points. Optionally rotate object to follow path direction.

**When to Use**:

- Molecular trajectory animation
- Object following curved paths
- Particle effects and motion paths
- Camera panning animations
- Data flow visualization

**Properties**:

```javascript
{
    type: 'moveAlongPath',
    duration: 2000,
    delay: 0,
    easing: 'easeInOut',
    pathType: 'bezier',                    // 'bezier', 'svgPath', or 'linearPoints'
    controlPoints: {                       // For Bézier paths
        start: { x: 0, y: 0 },
        cp1: { x: 100, y: -100 },         // Control point 1
        cp2: { x: 200, y: -100 },         // Control point 2
        end: { x: 300, y: 0 }
    },
    svgPath: "M100,100 Q200,200 300,100", // Or SVG path string
    linearPoints: [                        // Or array of waypoints
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 200, y: 100 }
    ],
    followPath: true,                      // Rotate to match path direction
    startRotation: 0,                      // If not following path
    endRotation: 0,
}
```

**Example - Bézier Path**:

```javascript
const animation = createMoveAlongPathAnimation({
    pathType: "bezier",
    controlPoints: {
        start: { x: 0, y: 0 },
        cp1: { x: 100, y: -200 },
        cp2: { x: 200, y: -200 },
        end: { x: 300, y: 0 },
    },
    followPath: true, // Rotate along path
    duration: 3000,
    easing: "easeInOut",
});
applyAnimationToElement("molecule", animation);
```

**Example - SVG Path**:

```javascript
const animation = createMoveAlongPathAnimation({
    pathType: "svgPath",
    svgPath: "M50,50 Q150,150 250,50",
    followPath: true,
    duration: 2000,
});
```

---

### 3. TextMorph

**Purpose**: Smoothly transform text content with letter-by-letter reveal, full morphing, or crossfade effects.

**When to Use**:

- Revealing equation terms one at a time
- Text reveal animations for emphasis
- Title transformations
- Animated captions

**Properties**:

```javascript
{
    type: 'textMorph',
    duration: 1000,
    delay: 0,
    easing: 'easeOut',
    startText: 'Start',                    // Initial text
    endText: 'End',                        // Final text
    morphMode: 'letter-by-letter',         // 'letter-by-letter', 'full', 'crossfade'
    startColor: '#000000',
    endColor: '#0000ff',
    startOpacity: 0,
    endOpacity: 1,
    startScale: 1,
    endScale: 1,
}
```

**Example**:

```javascript
const animation = createTextMorphAnimation({
    startText: "Press Space",
    endText: "Continue",
    morphMode: "letter-by-letter",
    duration: 800,
    startColor: "#888888",
    endColor: "#000000",
    easing: "easeOut",
});
applyAnimationToElement("caption", animation);
```

---

### 4. AnimatedChart

**Purpose**: Progressively reveal chart elements (bars, lines, scatter points) with staggered or smooth timing.

**When to Use**:

- Bar chart animations
- Line plot drawing
- Scatter plot point reveals
- Area chart filling
- Data visualization presentations

**Properties**:

```javascript
{
    type: 'animatedChart',
    duration: 2000,
    delay: 0,
    easing: 'easeOut',
    chartType: 'bar',                      // 'bar', 'line', 'scatter', 'area'
    animationMode: 'staggered',            // 'all-at-once', 'staggered', 'progressive'
    staggerDelay: 100,                     // Delay between each element (ms)
    dataValues: [100, 200, 300, 250],     // For bar/area charts
    maxValue: 300,                         // Scale reference
    direction: 'from-zero',                // 'from-zero', 'from-right', 'from-bottom'
    lineDrawMode: 'stroke-dash',           // 'stroke-dash' or 'point-by-point'
}
```

**Example**:

```javascript
const animation = createAnimatedChartAnimation({
    chartType: "bar",
    animationMode: "staggered",
    staggerDelay: 150,
    duration: 1500,
    dataValues: [50, 150, 200, 175, 100],
    maxValue: 200,
    easing: "easeOut",
});
applyAnimationToElement("chart-svg", animation);
```

---

### 5. UncreateAdvanced

**Purpose**: Sophisticated object destruction effects with multiple destruction modes.

**When to Use**:

- Exit animations with visual flair
- Object disappearance effects
- Destruction/disintegration visual feedback
- Advanced exit sequences

**Destruction Modes**:

- `fade`: Simple opacity fade out
- `shrink`: Scale down while fading
- `explode`: Objects fly outward in random directions
- `disintegrate`: Blur effect during fade

**Properties**:

```javascript
{
    type: 'uncreateAdvanced',
    duration: 800,
    delay: 0,
    easing: 'easeIn',
    destructionMode: 'fade',               // See modes above
    startOpacity: 1,
    endOpacity: 0,
    explosionVelocity: 5,                  // For explode mode
    fragmentCount: 8,                      // For disintegrate mode
}
```

**Example**:

```javascript
const animation = createUncreateAdvancedAnimation({
    destructionMode: "explode",
    explosionVelocity: 8,
    duration: 600,
    easing: "easeOut",
});
applyAnimationToElement("particle", animation);
```

---

### 6. Emphasis

**Purpose**: Emphasize objects with pulsing, wiggling, bouncing, or heartbeat effects.

**When to Use**:

- Highlighting important elements
- Drawing attention to specific objects
- Pulse effects for emphasis
- Interactive feedback animations

**Emphasis Types**:

- `pulse`: Rhythmic scale pulsing
- `wiggle`: Side-to-side oscillation
- `bounce`: Vertical bounce effect
- `heartbeat`: Double pulse heartbeat pattern

**Properties**:

```javascript
{
    type: 'emphasis',
    duration: 600,
    delay: 0,
    easing: 'easeInOut',
    emphasisType: 'pulse',                 // See types above
    cycles: 1,                             // Number of repetitions
    intensity: 0.2,                        // Strength of effect (0-1)
    amplitude: 5,                          // For wiggle: horizontal displacement
}
```

**Example**:

```javascript
const animation = createEmphasisAnimation({
    emphasisType: "pulse",
    cycles: 2,
    intensity: 0.25,
    duration: 800,
    easing: "easeInOut",
});
applyAnimationToElement("important-element", animation);
```

---

### 7. Blur

**Purpose**: Progressive blur in or out with optional opacity fade.

**When to Use**:

- Focus transitions
- Soft reveal/hide effects
- Depth of field simulation
- Transition between scenes

**Properties**:

```javascript
{
    type: 'blur',
    duration: 600,
    delay: 0,
    easing: 'easeInOut',
    direction: 'in',                       // 'in' (blur→clear) or 'out' (clear→blur)
    startBlur: 10,                         // Starting blur radius (px)
    endBlur: 0,                            // Ending blur radius (px)
    startOpacity: 0.5,
    endOpacity: 1,
}
```

**Example - Blur In Focus**:

```javascript
const animation = createBlurAnimation({
    direction: "in",
    startBlur: 20,
    endBlur: 0,
    startOpacity: 0.3,
    endOpacity: 1,
    duration: 1000,
    easing: "easeOut",
});
applyAnimationToElement("object", animation);
```

---

### 8. Flip3D

**Purpose**: Rotate object in 3D space along X or Y axis.

**When to Use**:

- Card flip animations
- 3D object rotations
- Page turn effects
- Perspective transitions

**Properties**:

```javascript
{
    type: 'flip3D',
    duration: 800,
    delay: 0,
    easing: 'easeInOut',
    axis: 'y',                             // 'x' (vertical) or 'y' (horizontal)
    rotation: 180,                         // Total rotation in degrees
    perspective: 1000,                     // 3D perspective depth (px)
}
```

**Example**:

```javascript
const animation = create3DFlipAnimation({
    axis: "y",
    rotation: 180,
    perspective: 1200,
    duration: 800,
    easing: "easeInOut",
});
applyAnimationToElement("card", animation);
```

---

### 9. Glow

**Purpose**: Pulsing glow effect with customizable color and intensity.

**When to Use**:

- Highlighting important elements
- Energy/power indicators
- Attention-grabbing effects
- Visual feedback

**Properties**:

```javascript
{
    type: 'glow',
    duration: 1000,
    delay: 0,
    easing: 'easeInOut',
    glowColor: '#ffff00',                  // Glow color (hex)
    startBlur: 5,                          // Initial glow blur (px)
    peakBlur: 20,                          // Peak glow blur (px)
    pulses: 2,                             // Number of glow pulses
}
```

**Example**:

```javascript
const animation = createGlowAnimation({
    glowColor: "#44ff44",
    startBlur: 3,
    peakBlur: 30,
    pulses: 3,
    duration: 1500,
    easing: "easeInOut",
});
applyAnimationToElement("highlight", animation);
```

---

## Path Utilities

For advanced path-based animations, use these utility functions:

### interpolateBezierCurve(controlPoints, t)

Calculate a point on a Bézier curve using de Casteljau's algorithm.

```javascript
const point = interpolateBezierCurve(
    {
        start: { x: 0, y: 0 },
        cp1: { x: 100, y: -100 },
        cp2: { x: 200, y: -100 },
        end: { x: 300, y: 0 },
    },
    0.5, // t = 0.5 (halfway through)
);
console.log(point); // { x: 150, y: -75 }
```

### calculateBezierTangent(controlPoints, t, delta)

Calculate the rotation angle (in degrees) tangent to a Bézier curve at progress `t`.

```javascript
const rotation = calculateBezierTangent(controlPoints, 0.5);
console.log(rotation); // Degrees to rotate to follow path
```

### parseSVGPath(pathString)

Parse SVG path string and extract waypoints.

```javascript
const points = parseSVGPath("M100,100 L200,200 Q300,300 400,200");
// Returns: [{x: 100, y: 100}, {x: 200, y: 200}, ...]
```

### interpolateAlongPath(pathPoints, t)

Interpolate position along an array of waypoints.

```javascript
const position = interpolateAlongPath(points, 0.5);
console.log(position); // { x: ..., y: ... }
```

---

## Integration with Animation Engine

All advanced animations integrate seamlessly with the existing animation system:

```javascript
// Get the animation engine
const engine = getAnimationEngine();

// Create advanced animation
const animation = createMoveAlongPathAnimation({
    duration: 2000,
    pathType: "bezier",
    controlPoints: {
        /* ... */
    },
    followPath: true,
});

// Add to element
engine.addAnimation("element-id", animation, 0); // startTime = 0

// Play
engine.play();
engine.pause();
engine.seek(500); // Jump to 500ms
engine.setSpeed(1.5); // 1.5x speed
```

---

## Preset Library

Use pre-configured animation presets for common scenarios:

```javascript
// Smooth morphing
applyAnimationPreset("shape-1", "replacementTransformSmooth");

// Trajectory animation
applyAnimationPreset("molecule", "trajectorySmooth");

// Text reveals
applyAnimationPreset("equation", "textReveal");

// Emphasis effects
applyAnimationPreset("button", "pulseEmphasis");
applyAnimationPreset("warning", "bounceEmphasis");

// Chart animations
applyAnimationPreset("bar-chart", "chartBarsReveal");
applyAnimationPreset("line-chart", "chartLinesDraw");

// Visual effects
applyAnimationPreset("focus-element", "blurInFocus");
applyAnimationPreset("card", "flip3DHorizontal");
applyAnimationPreset("glow", "energyGlow");
```

---

## Scientific Visualization Examples

### Molecular Trajectory

```javascript
// Animate molecule movement along trajectory
const animation = createMoveAlongPathAnimation({
    pathType: "linearPoints",
    linearPoints: [
        { x: 0, y: 0 }, // Frame 0
        { x: 10, y: 5 }, // Frame 1
        { x: 20, y: 8 }, // Frame 2
        { x: 30, y: 10 }, // Frame 3
    ],
    duration: 4000, // 1000ms per frame
    followPath: false,
    easing: "linear",
});
engine.addAnimation("molecule", animation);
```

### Progressive Plot Drawing

```javascript
// Reveal bar chart data progressively
const animation = createAnimatedChartAnimation({
    chartType: "bar",
    animationMode: "staggered",
    staggerDelay: 100,
    dataValues: [150, 200, 180, 220, 190],
    maxValue: 250,
    duration: 1500,
    direction: "from-zero",
});
engine.addAnimation("chart", animation);
```

### Equation Transformation

```javascript
// Reveal equation terms one at a time
const animation = createTextMorphAnimation({
    startText: "E = ",
    endText: "E = mc²",
    morphMode: "letter-by-letter",
    duration: 1500,
    easing: "easeOut",
});
engine.addAnimation("equation", animation);
```

---

## Performance Considerations

1. **Bezier curves**: Using `bezier` pathType is computationally optimal
2. **SVG paths**: `svgPath` mode requires parsing, slightly slower
3. **Linear points**: `linearPoints` is fastest for simple waypoints
4. **Transform-only**: GPU-accelerated animations maintain 60 FPS
5. **Concurrent animations**: Limit to 50-100 simultaneous to maintain performance

---

## Browser Support

All advanced animations use standard JavaScript and CSS 3D transforms:

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: No support (requires polyfills)

---

## Troubleshooting

**Animation not playing**:

- Check element is visible in DOM
- Verify animation engine is playing: `engine.isPlaying`
- Call `renderSlidesFromState()` after adding animation

**Laggy performance**:

- Reduce concurrent animations
- Use `linearPoints` instead of `svgPath`
- Simplify SVG paths
- Profile with DevTools Performance tab

**Path animation not following curve**:

- Verify `pathType` matches provided data
- Check control points are numeric
- Ensure `followPath` is set correctly for rotation

---

## API Reference

```javascript
// Create animations
createReplacementTransformAnimation(options);
createMoveAlongPathAnimation(options);
createTextMorphAnimation(options);
createAnimatedChartAnimation(options);
createUncreateAdvancedAnimation(options);
createEmphasisAnimation(options);
createBlurAnimation(options);
create3DFlipAnimation(options);
createGlowAnimation(options);

// Apply to elements
applyAnimationToElement(elementId, animation);
applyAnimationPreset(elementId, presetName);

// Engine control
const engine = getAnimationEngine();
engine.addAnimation(elementId, animation, startTime);
engine.play();
engine.pause();
engine.seek(ms);
engine.setSpeed(multiplier);
```

---

## Next Steps

- **Drag-to-reorder timeline**: Organize animations visually
- **Keyframe markers**: Mark important animation points
- **Cubic Bézier editor**: Visual easing curve design
- **Animation path visualization**: See motion paths on slide
- **Extended easing library**: More curve options
