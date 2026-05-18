# Animation Properties Enhancement - Complete Reference

## Overview

This document describes the new animation properties and types added to the Manim-inspired animation engine. These enhancements enable direct control over position, color, z-index, and combined transforms with full GUI support.

## New Animation Types

### 1. moveInPlace - Direct Position Animation

**Type**: `moveInPlace`

**Purpose**: Animate an element's position using x/y coordinates instead of direction-based sliding.

**Properties**:

- `startX` (number): Initial X coordinate in pixels (default: 0)
- `endX` (number): Final X coordinate in pixels (default: 0)
- `startY` (number): Initial Y coordinate in pixels (default: 0)
- `endY` (number): Final Y coordinate in pixels (default: 0)
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("moveInPlace", {
    startX: 0,
    endX: 200,
    startY: 0,
    endY: -100,
    duration: 800,
    easing: "easeOut",
});
```

**Use Cases**:

- Smooth position transitions between slide states
- Auto-animate object movement between slides
- Custom path-like animations with linear interpolation
- UI element repositioning

**Presets**:

- `moveRight`: Slides element 100px to the right
- `moveUp`: Slides element 100px upward
- `floatAround`: Creates a floating effect (50px right, 30px up)

---

### 2. colorShift - Color Interpolation Animation

**Type**: `colorShift`

**Purpose**: Animate color transitions for fill, stroke, text, or background colors.

**Properties**:

- `startColor` (string): Starting color in hex format (default: "#000000")
- `endColor` (string): Ending color in hex format (default: "#ffffff")
- `colorProperty` (string): Which color property to animate:
    - `"fill"`: SVG fill color or element fill
    - `"stroke"`: SVG stroke color
    - `"backgroundColor"`: Element background color
    - `"color"`: Text color
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("colorShift", {
    startColor: "#0000ff",
    endColor: "#ff0000",
    colorProperty: "fill",
    duration: 600,
    easing: "easeInOut",
});
```

**Use Cases**:

- Highlight/emphasis animations
- Color transitions in scientific visualizations
- Status indicator color changes
- Gradient-like color morphing
- Data visualization color updates

**Presets**:

- `colorFadeFromRed`: Fades from red to black
- `colorPulse`: Blue to cyan pulse
- `highlightBlink`: Yellow highlight blink

---

### 3. strokeAnimate - SVG Stroke Width Animation

**Type**: `strokeAnimate`

**Purpose**: Animate stroke width for SVG elements or borders.

**Properties**:

- `startStrokeWidth` (number): Starting stroke width in pixels (default: 0)
- `endStrokeWidth` (number): Ending stroke width in pixels (default: 2)
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("strokeAnimate", {
    startStrokeWidth: 1,
    endStrokeWidth: 5,
    duration: 500,
    easing: "easeOut",
});
```

**Use Cases**:

- SVG shape emphasis
- Line drawing animations with thickness changes
- Scientific diagram emphasis
- Molecular structure visualization
- Progressive drawing with stroke changes

**Presets**:

- `strokeDraw`: Draws stroke from 0 to 2px
- `strokeThicken`: Thickens stroke from 1 to 4px

---

### 4. scaleXY - Independent X/Y Scaling

**Type**: `scaleXY`

**Purpose**: Animate separate scaling on X and Y axes for distortion and stretch effects.

**Properties**:

- `startScaleX` (number): Starting X scale factor (default: 1)
- `endScaleX` (number): Ending X scale factor (default: 1)
- `startScaleY` (number): Starting Y scale factor (default: 1)
- `endScaleY` (number): Ending Y scale factor (default: 1)
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("scaleXY", {
    startScaleX: 1,
    endScaleX: 1.5,
    startScaleY: 1,
    endScaleY: 0.8,
    duration: 600,
    easing: "easeOut",
});
```

**Use Cases**:

- Squash/stretch animations (bouncing effects)
- Morphing between shapes
- Perspective-like scaling
- Non-uniform growth/shrinkage
- Playful UI animations

**Presets**:

- `scaleUpDown`: Stretches horizontally while shrinking vertically
- `stretchHorizontal`: Expands from 50% to 100% width

---

### 5. combinedTransform - Position + Scale + Rotation

**Type**: `combinedTransform`

**Purpose**: Simultaneously animate position, scale, and rotation for complex motion effects.

**Properties**:

- `startX` (number): Starting X position in pixels (default: 0)
- `endX` (number): Ending X position in pixels (default: 0)
- `startY` (number): Starting Y position in pixels (default: 0)
- `endY` (number): Ending Y position in pixels (default: 0)
- `startScaleX` (number): Starting X scale (default: 1)
- `endScaleX` (number): Ending X scale (default: 1)
- `startScaleY` (number): Starting Y scale (default: 1)
- `endScaleY` (number): Ending Y scale (default: 1)
- `startRotation` (number): Starting rotation in degrees (default: 0)
- `endRotation` (number): Ending rotation in degrees (default: 0)
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("combinedTransform", {
    startX: -100,
    endX: 0,
    startY: 100,
    endY: 0,
    startScaleX: 0,
    endScaleX: 1,
    startScaleY: 0,
    endScaleY: 1,
    startRotation: -45,
    endRotation: 0,
    duration: 1000,
    easing: "easeOut",
});
```

**Use Cases**:

- Cinematic entrance animations
- Complex morphing effects
- Spinning growth/shrink combinations
- 3D-like perspective animations
- Advanced scientific visualizations
- Particle-like effects

**Presets**:

- `slideAndGrow`: Slides in from left while growing and rotating
- `spinAndMove`: Spins 360° while moving to the right

---

### 6. zIndex - Stacking Order Animation

**Type**: `zIndex`

**Purpose**: Animate an element's stacking order (z-index) to change layering during animations.

**Properties**:

- `startZIndex` (number): Starting z-index value (default: 0)
- `endZIndex` (number): Ending z-index value (default: 100)
- `duration` (number): Animation duration in milliseconds
- `delay` (number): Delay before animation starts
- `easing` (string): Easing function to use

**Example**:

```javascript
const animation = createAnimation("zIndex", {
    startZIndex: 1,
    endZIndex: 1000,
    duration: 300,
    easing: "linear",
});
```

**Use Cases**:

- Bring forward/send backward animations
- Layering effects with timing
- Progressive reveal of overlapping elements
- Depth simulation in 2D presentations
- UI component stacking changes

---

## GUI Property Controls

### Animation Properties Panel

When selecting an animated element, the properties panel shows type-specific controls:

**For colorShift**:

- Color property dropdown (fill, stroke, background, text color)
- Start color picker
- End color picker

**For moveInPlace**:

- Start X/End X number inputs (pixels)
- Start Y/End Y number inputs (pixels)

**For scaleXY**:

- Start Scale X / End Scale X inputs
- Start Scale Y / End Scale Y inputs

**For strokeAnimate**:

- Start Width / End Width inputs (pixels)

**For combinedTransform**:

- Position section: X/Y start and end
- Scale section: X/Y start and end
- Rotation section: Start angle / End angle

**For zIndex**:

- Start Z-Index / End Z-Index number inputs

### Timeline Editor

The timeline editor has been enhanced to:

- Show color gradients for colorShift animations
- Display position changes visually
- Indicate scale/rotation values
- Support property editing via inline popover

---

## Animation Presets

### Color Animations

- **colorFadeFromRed**: Smooth transition from red (#ff4444) to neutral (#000000)
- **colorPulse**: Blue to cyan pulse effect
- **highlightBlink**: Yellow highlight that fades to black

### Position Animations

- **moveRight**: Slides 100px to the right (600ms)
- **moveUp**: Slides 100px upward (600ms)
- **floatAround**: Creates gentle floating motion (1200ms)

### Scale Animations

- **scaleUpDown**: Stretches horizontally while shrinking vertically
- **stretchHorizontal**: Expands width from 50% to 100%

### SVG Animations

- **strokeDraw**: Draws stroke from 0 to 2px width
- **strokeThicken**: Thickens stroke from 1 to 4px

### Advanced/Cinematic Animations

- **slideAndGrow**: Combines slide-in, scale-up, and rotation
- **spinAndMove**: 360° spin while moving right with easing

---

## API Reference

### Creating Animations Programmatically

```javascript
// Create moveInPlace animation
const moveAnim = createAnimation("moveInPlace", {
    startX: 0,
    endX: 150,
    startY: 0,
    endY: -50,
    duration: 800,
    easing: "easeOut",
});

// Create colorShift animation
const colorAnim = createAnimation("colorShift", {
    startColor: "#3b82f6",
    endColor: "#ef4444",
    colorProperty: "fill",
    duration: 600,
    easing: "easeInOut",
});

// Create combinedTransform animation
const complexAnim = createAnimation("combinedTransform", {
    startX: -200,
    endX: 0,
    startY: 0,
    endY: 0,
    startScaleX: 0.5,
    endScaleX: 1,
    startScaleY: 0.5,
    endScaleY: 1,
    startRotation: -30,
    endRotation: 0,
    duration: 1000,
    easing: "easeOut",
});
```

### Adding to Elements

```javascript
const engine = getAnimationEngine();

// Add animation to element
engine.addAnimation("element-id", animation, startTime);

// Play animations
engine.play();

// Seek to time
engine.seek(500);

// Pause
engine.pause();
```

### Using Presets

```javascript
// Apply a preset
applyAnimationPreset("element-id", "slideAndGrow");

// Get all presets by category
const colorPresets = getPresetsByCategory("color");
```

---

## Performance Considerations

### Optimization Tips

1. **Use GPU-accelerated properties**: Position, scale, and rotation are GPU-optimized via `transform3d`
2. **Limit concurrent animations**: Best performance with ≤50 simultaneous animations
3. **Use easing carefully**: Complex easing (elastic, spring) is computed per frame
4. **Batch updates**: Multiple animations on same element are efficient
5. **Color animations**: Simple RGB interpolation, avoid on 1000+ elements

### Browser Compatibility

- Chrome/Edge: Full support (all animation types)
- Firefox: Full support
- Safari: Full support
- IE 11: Not supported (legacy only)

---

## Testing

Run the comprehensive test suite in the browser console:

```javascript
runAllAnimationPropertyTests();
```

This validates:

- ✅ Animation type registration
- ✅ Property structure correctness
- ✅ Animation engine handlers
- ✅ Preset availability and validity
- ✅ Color interpolation
- ✅ Position interpolation
- ✅ Full animation workflow

---

## Backward Compatibility

All changes are fully backward compatible:

- Existing animations (fadeIn, transform, scaleInPlace, etc.) unchanged
- New properties only used when specified
- Defaults provided for all new properties
- Legacy code continues to work unchanged

---

## Examples & Use Cases

### Scientific Visualization - Molecule Highlighting

```javascript
// Highlight a molecular bond with color and stroke
const highlightAnim = createAnimation("colorShift", {
    startColor: "#888888",
    endColor: "#ff0000",
    colorProperty: "stroke",
    duration: 400,
});

const strokeAnim = createAnimation("strokeAnimate", {
    startStrokeWidth: 1,
    endStrokeWidth: 4,
    duration: 400,
});
```

### Auto-Animate Slide Transitions

```javascript
// Automatically animate objects between slides
const autoAnim = generateAutoAnimateSequence(fromSlide, toSlide, {
    duration: 600,
    easing: "easeInOut",
});

// Objects with matching IDs smoothly transition position/color/size
```

### Cinematic Presentation

```javascript
// Complex entrance with all properties
const cinematicAnim = createAnimation("combinedTransform", {
    startX: -500,
    endX: 0,
    startScaleX: 0,
    endScaleX: 1,
    startRotation: -90,
    endRotation: 0,
    duration: 1500,
    easing: "easeOut",
});
```

### Data Visualization Update

```javascript
// Animate color change to indicate data status
const statusChangeAnim = createAnimation("colorShift", {
    startColor: "#10b981", // green
    endColor: "#ef4444", // red
    colorProperty: "fill",
    duration: 300,
});
```

---

## Troubleshooting

### Animation Not Playing

- Check element ID is correct
- Verify animation type is supported
- Ensure `engine.play()` is called
- Check browser console for errors

### Color Not Changing

- Verify SVG elements use fill/stroke attributes
- Use `backgroundColor` for div elements
- Check color format is hex (#RRGGBB)
- Ensure colorProperty matches element type

### Position/Scale Not Working

- Use `moveInPlace` for position (not `transform`)
- Use `scaleXY` for separate X/Y scaling
- Ensure element has position: absolute or relative
- Check units are in pixels

### Performance Issues

- Reduce number of concurrent animations
- Use simpler easing functions
- Disable animations during heavy computations
- Profile with DevTools Performance tab

---

## Future Enhancements

Planned improvements for future releases:

- [ ] SVG path morphing (svgMorph type)
- [ ] Bezier path following
- [ ] Keyframe interpolation
- [ ] Physics-based animations (gravity, drag)
- [ ] Group animation synchronization
- [ ] Animation recording/playback

---

## Version History

- **v2.0** (Current): Added 6 new animation types with full GUI support
- **v1.0**: Original 8 animation types (fadeIn, transform, scaleInPlace, rotate, write, create, uncreate, replacementTransform)

---

## Support & Questions

For issues or questions:

1. Check this documentation
2. Review animation-examples.js for working code
3. Run animation-properties-tests.js for diagnostics
4. Check browser console for error messages
5. Review ANIMATION_ENGINE.md for advanced topics
