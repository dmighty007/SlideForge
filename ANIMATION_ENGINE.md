# Modern Animation Engine Documentation

## Overview

The slide editor now includes a powerful, cinematic animation system inspired by Manim and professional motion design tools. This engine enables smooth, GPU-accelerated animations for objects, supporting timeline-based control, presets, and advanced scientific visualization animations.

## Features

### Core Capabilities

- **Timeline-based animations**: Full control over duration, delay, easing, and timing
- **GPU-accelerated transforms**: Smooth 60 FPS playback using CSS transforms
- **Preset-based GUI**: Drag-and-drop animation application without coding
- **Timeline editor**: Visual scrubbing, keyframe management, and real-time preview
- **Easing library**: 20+ built-in easing functions plus spring physics and cubic-bezier curves
- **Staggered animations**: LaggedStart for coordinated multi-object animations
- **Scientific visualization**: SVG path drawing, plot animation, molecular trajectory support
- **Auto-animate transitions**: Smooth morphing between consecutive slides

### Supported Animation Types

#### Entrance Animations

- **fadeIn** - Object fades in from transparent
- **slideInUp/Down/Left/Right** - Object slides into view with fade
- **zoomIn** - Object scales up while fading in
- **popIn** - Quick scale-in with emphasis
- **bounce** - Elastic bounce entrance effect

#### Exit Animations

- **fadeOut** - Object fades to transparent
- **slideOutUp/Down/Left/Right** - Object slides out with fade
- **zoomOut** - Object scales down while fading out

#### Emphasis Animations

- **pulse** - Rhythmic scale pulsing
- **rotate** - 360° rotation
- **spin** - Continuous rotation

#### Scientific Animations

- **write** - Progressive SVG path drawing
- **create** - Fade in with object creation
- **uncreate** - Fade out with object destruction

#### Cinematic Presets

- **cinematicEnter** - Sophisticated enter with easeOutBack
- **cinematicExit** - Sophisticated exit with easeInBack

#### Minimal Presets

- **subtleEnter** - Understated entrance
- **subtleExit** - Understated exit

## Quick Start

### 1. Apply Animation via GUI

1. **Select an object** on the slide
2. **Open Properties panel** (right side)
3. **Scroll to "Animation" section**
4. **Click "+ Add Animation"**
5. **Choose a preset** from the modal
6. **Configure duration, delay, easing** as needed

### 2. Programmatic Animation

```javascript
// Get selected element ID
const elementId = state.selectedIds[0];

// Apply a preset animation
applyAnimationPreset(elementId, "fadeIn");

// Or create custom animation
const animation = createAnimation("scaleInPlace", {
    duration: 800,
    delay: 0,
    easing: "easeOut",
    startScale: 0.5,
    startOpacity: 0,
    endScale: 1,
    endOpacity: 1,
});

// Add to element
const element = getElementDataById(elementId);
if (!element.animation) {
    element.animation = createDefaultAnimationConfig(elementId);
}

const timeline = createElementTimeline(elementId);
timeline.animations.push(animation);
element.animation.timelines.push(timeline);

// Render
renderSlidesFromState();
```

### 3. Play Animations

```javascript
// Using the animation engine
const engine = getAnimationEngine();

// Play all animations
engine.play();

// Pause
engine.pause();

// Seek to specific time (ms)
engine.seek(500);

// Stop and reset
engine.pause();
engine.seek(0);

// Set playback speed
engine.setSpeed(0.5); // Half speed
engine.setSpeed(2); // Double speed
```

### 4. Timeline Editor

```javascript
// Get the timeline editor
const editor = getTimelineEditor();

// Initialize if not done automatically
editor.initialize();

// Toggle visibility
toggleTimelineEditor();

// Update timeline display for selected objects
editor.updateTimeline();

// Playback controls
editor.play();
editor.pause();
editor.stop();
editor.seek(1000); // Seek to 1000ms

// Zoom
editor.zoomIn();
editor.zoomOut();
editor.resetZoom();
```

## Animation Properties

### Duration

- **Range**: 100 - 5000 ms
- **Default**: 600 ms
- **Step**: 50 ms
- Controls how long the animation plays

### Delay

- **Range**: 0 - 2000 ms
- **Default**: 0 ms
- **Step**: 50 ms
- Time to wait before animation starts

### Easing Functions

#### Standard Easings

- `linear` - Constant speed
- `easeIn` - Slow start, fast end
- `easeOut` - Fast start, slow end (default)
- `easeInOut` - Slow start and end
- `easeInQuad`, `easeOutQuad` - Quadratic
- `easeInCubic`, `easeOutCubic` - Cubic
- `easeInQuart`, `easeOutQuart` - Quartic
- `easeInQuint`, `easeOutQuint` - Quintic
- `easeInExpo`, `easeOutExpo` - Exponential
- `easeInCirc`, `easeOutCirc` - Circular
- `easeInBack`, `easeOutBack` - Back (overshoot)
- `easeInElastic`, `easeOutElastic` - Elastic

#### Advanced Easing

```javascript
// Spring physics
const springEasing = createSpringEasing(
    100, // stiffness
    30, // damping
    1, // mass
);

// Cubic Bézier curves
const customEasing = createCubicBezierEasing(
    0.25, // p1x
    0.46, // p1y
    0.45, // p2x
    0.94, // p2y
);
```

## Animation Types & Properties

### FadeIn / FadeOut

```javascript
createAnimation("fadeIn", {
    duration: 600,
    easing: "easeOut",
    startOpacity: 0, // 0-1
    endOpacity: 1, // 0-1
});
```

### Transform (Slide)

```javascript
createAnimation("transform", {
    duration: 600,
    easing: "easeOut",
    direction: "up", // 'up', 'down', 'left', 'right'
    startOpacity: 0,
    endOpacity: 1,
});
```

### ScaleInPlace

```javascript
createAnimation("scaleInPlace", {
    duration: 600,
    easing: "easeOut",
    startScale: 0.8, // Starting scale factor
    endScale: 1, // Ending scale factor
    startOpacity: 0,
    endOpacity: 1,
});
```

### Rotate

```javascript
createAnimation("rotate", {
    duration: 600,
    easing: "easeOut",
    rotation: 360, // Degrees
});
```

### Write (SVG Path Drawing)

```javascript
createAnimation("write", {
    duration: 2000,
    easing: "easeOut",
    // Animates SVG stroke-dasharray for progressive drawing
});
```

### Create / Uncreate

```javascript
createAnimation("create", {
    duration: 800,
    easing: "easeOut",
    startOpacity: 0,
    endOpacity: 1,
    // Use for appearing/disappearing objects
});
```

## Staggered (Lagged Start) Animations

Apply the same animation to multiple objects with sequential delays:

```javascript
const delay = 100; // 100ms between each object

state.selectedIds.forEach((elementId, index) => {
    applyAnimationPreset(elementId, "fadeIn");

    // Manually set delays
    const element = getElementDataById(elementId);
    const anim = element.animation.timelines[0].animations[0];
    anim.delay = index * delay;
});

renderSlidesFromState();
```

## Scientific Visualization Animations

### SVG Path Drawing

For diagrams, molecular structures, plots:

```javascript
const elementId = state.selectedIds[0];
const animation = createAnimation("write", {
    duration: 2000,
    easing: "easeOut",
});

applyAnimationToElement(elementId, "write", { duration: 2000 });
```

The engine uses the SVG `stroke-dasharray` technique for smooth path animation.

### Molecular Trajectory

```javascript
// Animate molecular coordinates across frames
const animation = createAnimation("transform", {
    duration: 5000, // 5 second trajectory
    direction: "up",
    // Position updates can be integrated with physics data
});
```

### Equation Animation

```javascript
// Animate equation symbols appearing/disappearing
const createAnim = createAnimation("create", { duration: 800 });
const uncreateAnim = createAnimation("uncreate", { duration: 800 });

// Create equation, pause 1 second, then uncreate
engine.addAnimation(elementId, createAnim, 0);
engine.addAnimation(elementId, uncreateAnim, 1800); // 800ms anim + 1000ms pause
```

## Animation State Management

### Serialization

Animations are stored in the element state as JSON:

```javascript
const element = getElementDataById(elementId);
const config = element.animation;

// Serialize to JSON
const json = JSON.stringify(config);

// Or use helper
const serialized = serializeAnimationConfig(config);
```

### Deserialization

```javascript
const json = JSON.parse(animationJSON);
const config = deserializeAnimationConfig(json);

element.animation = config;
```

### Checking Animations

```javascript
// Check if element has animations
if (hasAnimations(element)) {
    console.log("Has animations");
}

// Get total duration
const duration = getAnimationDuration(element);
console.log(`Total animation time: ${duration}ms`);
```

## Timeline Editor Usage

The Timeline Editor provides visual control over animations:

### Features

1. **Playback Controls**
    - Play, Pause, Stop buttons
    - Time display (current/total)
    - Manual time input

2. **Timeline Visualization**
    - Ruler with time labels
    - Animation blocks for each object
    - Playhead indicator
    - Scrubber for seeking

3. **Track Management**
    - One track per animated object
    - Color-coded by animation type
    - Click to select and edit animations

4. **Zoom Controls**
    - Zoom In/Out buttons
    - Reset Zoom
    - Zoom level display (0.25x - 4x)

5. **Animation Properties Panel**
    - Type selector
    - Duration, delay controls
    - Easing selector
    - Real-time editing

### Keyboard Shortcuts

- **Space**: Play/Pause
- **Left/Right Arrow**: Step through animation (when paused)

## API Reference

### Core Functions

#### `getAnimationEngine()`

Returns the global animation engine instance.

```javascript
const engine = getAnimationEngine();
```

#### `createAnimation(type, overrides)`

Creates an animation object.

```javascript
const anim = createAnimation("fadeIn", {
    duration: 800,
    easing: "easeOut",
});
```

#### `createElementTimeline(elementId)`

Creates an empty timeline for an element.

```javascript
const timeline = createElementTimeline("element-123");
```

#### `applyAnimationToElement(elementId, animationType, options)`

Convenience function to create and add animation.

```javascript
applyAnimationToElement("element-123", "fadeIn", {
    duration: 800,
    startTime: 0,
});
```

#### `applyAnimationPreset(elementId, presetName)`

Apply a named preset animation to an element.

```javascript
applyAnimationPreset("element-123", "zoomIn");
```

### Easing Functions

#### `getEasingFunction(easing)`

Get easing function from name or object.

```javascript
const easing = getEasingFunction("easeOut");
const value = easing(0.5); // Returns eased progress (0-1)
```

#### `createSpringEasing(stiffness, damping, mass)`

Create spring physics easing.

```javascript
const spring = createSpringEasing(100, 30, 1);
```

#### `createCubicBezierEasing(x1, y1, x2, y2)`

Create cubic Bézier curve easing.

```javascript
const custom = createCubicBezierEasing(0.25, 0.46, 0.45, 0.94);
```

### Animation Engine Methods

#### `engine.addAnimation(elementId, animation, startTime)`

Add animation to element.

#### `engine.removeAnimation(elementId, animationId)`

Remove animation by ID.

#### `engine.clearAnimations(elementId)`

Clear all animations (or all if elementId omitted).

#### `engine.play()`

Start playback.

#### `engine.pause()`

Pause playback.

#### `engine.seek(time)`

Seek to specific time in milliseconds.

#### `engine.setSpeed(multiplier)`

Set playback speed (0.1 - 2.0).

### Timeline Editor Methods

#### `getTimelineEditor()`

Get or create timeline editor instance.

#### `editor.initialize()`

Initialize DOM and event listeners.

#### `editor.updateTimeline()`

Update timeline display for current selection.

#### `editor.play()`, `editor.pause()`, `editor.stop()`

Playback controls.

#### `editor.seek(time)`

Seek to time.

#### `editor.zoomIn()`, `editor.zoomOut()`, `editor.resetZoom()`

Zoom controls.

## Performance Optimization

### Best Practices

1. **Use GPU transforms only**: Animate position, scale, rotation, opacity
    - ✅ `transform: translate3d()`, `scale3d()`, `rotate()`
    - ✅ `opacity`
    - ❌ Avoid: `position`, `width`, `height`, `top`, `left`

2. **Limit concurrent animations**: Too many simultaneous animations reduce frame rate
    - Maximum 50-100 animated objects for 60 FPS on typical hardware
    - Use `LaggedStart` to sequence instead of overlapping

3. **Optimize SVG animations**: Large paths can be expensive
    - Simplify SVG geometry before animating
    - Use `write` effect sparingly for complex paths

4. **Profile performance**: Use DevTools to check frame rate
    - Target: 60 FPS (16.67ms per frame)
    - Check: Performance tab → Frame rate

### Virtualization

For slides with many objects:

```javascript
// Only animate visible objects
state.selectedIds.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element && isElementVisible(element)) {
        // Add animation
    }
});
```

## Export & Playback

### Standalone HTML Export

Animations are preserved in exported presentations:

```javascript
// Export includes all animation config in slide JSON
// GSAP and animation engine code bundled automatically
// No external dependencies required for playback
```

### Reveal.js Integration

Animations trigger on slide navigation:

```javascript
// Auto-animate detects matching objects between slides
// Smooth interpolation of position, size, color
// Configurable easing and duration
```

## Testing & Debugging

### System Status Check

```javascript
testAnimationSystemReady();
// Checks all components are loaded
// Outputs: ✓ for ready, ✗ for missing
```

### Debug Engine State

```javascript
debugAnimationEngine();
// Logs current playhead, status, loaded timelines
```

### Example Usage

See `js/animation-examples.js` for 20+ usage examples:

```javascript
exampleApplyFadeInAnimation();
examplePlayAnimation();
exampleScrubAnimation();
exampleListPresets();
exampleLaggedStartAnimation();
exampleDrawSVGPath();
// ... and more
```

## Troubleshooting

### Animation doesn't play

1. Check element has animation configured
    ```javascript
    console.log(hasAnimations(element));
    ```
2. Verify animation engine is running
    ```javascript
    const engine = getAnimationEngine();
    console.log(engine.isPlaying);
    ```
3. Check element is visible in DOM
    ```javascript
    const el = document.getElementById(elementId);
    console.log(el && !el.style.display === "none");
    ```

### Laggy/choppy animations

1. Check frame rate
    - DevTools → Performance → record and check FPS
2. Reduce number of simultaneous animations
3. Simplify animated element structure
4. Use `requestAnimationFrame` for rendering

### Animation not updating UI

1. Call `renderSlidesFromState()` after changes
    ```javascript
    applyAnimationPreset(elementId, "fadeIn");
    renderSlidesFromState();
    ```
2. Rebuild properties panel
    ```javascript
    buildPropertiesPanel();
    ```

### Timeline editor not showing

1. Verify element has animations
2. Check container div exists:
    ```javascript
    const container = document.getElementById("timeline-editor-panel");
    ```
3. Call `updateTimeline()` after selection changes
    ```javascript
    getTimelineEditor().updateTimeline();
    ```

## Advanced Usage

### Custom Animation Type

Create new animation types by extending the engine:

```javascript
// In animation-engine.js _applyAnimation() method
case 'customEffect':
  this._applyCustomEffect(element, animation, easedProgress);
  break;

// Add handler method
_applyCustomEffect(element, animation, progress) {
  // Custom animation logic
  element.style.customProperty = interpolate(
    animation.startValue,
    animation.endValue,
    progress
  );
}
```

### Integration with Physics

```javascript
// Use spring easing for physics-based motion
const springEasing = createSpringEasing(
    150, // Higher stiffness = faster oscillation
    20, // Lower damping = more bounce
    1,
);

const animation = createAnimation("transform", {
    duration: 1000,
    easing: springEasing,
    direction: "up",
});
```

### Synchronized Animations

```javascript
// Play multiple animations with precise timing
const elementIds = ["el-1", "el-2", "el-3"];
const stagger = 100; // 100ms between each

elementIds.forEach((id, index) => {
    const anim = createAnimation("zoomIn", {
        duration: 600,
        delay: index * stagger,
    });

    applyAnimationToElement(id, "zoomIn", {
        startTime: index * stagger,
    });
});
```

## Future Enhancements

Planned for upcoming releases:

- ✅ Auto-animate transitions between slides
- ✅ Timeline keyframe editor with drag-drop
- ⏳ Morph/shape transitions
- ⏳ Particle systems for advanced effects
- ⏳ Video export of animations
- ⏳ Animation recording/playback from narration
- ⏳ Advanced path following (MoveAlongPath)
- ⏳ Constraint-based animations
- ⏳ Animation composition/stacking

## Support & Feedback

For issues, suggestions, or questions:

1. Check `js/animation-examples.js` for usage patterns
2. Review API reference above
3. Test with `testAnimationSystemReady()`
4. Debug with `debugAnimationEngine()`
5. File issue with reproduction steps

## License

Part of the slide editor presentation system.
