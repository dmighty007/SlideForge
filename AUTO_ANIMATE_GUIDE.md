# Auto-Animate Transitions Guide

## Overview

Auto-Animate is a powerful feature that automatically creates smooth morphing transitions between objects on consecutive slides. When you transition from one slide to the next, objects with matching IDs or similar properties will animate smoothly from their position, size, opacity, color, and rotation on the first slide to their new state on the second slide.

This guide explains how to use, configure, and integrate auto-animate in your presentations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [How It Works](#how-it-works)
3. [Matching Strategy](#matching-strategy)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Examples](#examples)
7. [Performance Tips](#performance-tips)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Setup

Auto-animate is automatically initialized when the presentation loads (via `js/animation-interaction.js`). It hooks into Reveal.js's `slidechanged` event to automatically apply animations when transitioning between slides.

### Enable Auto-Animate for a Slide

1. In the slide properties panel, find the **Auto-Animate** section
2. Toggle **Enable** to turn on auto-animate for that slide
3. Configure duration and easing if desired
4. When you transition to this slide from the previous one, objects will animate automatically

### Programmatic Initialization

```javascript
// Initialize when Reveal.js is ready
initializeAutoAnimateInteraction();

// Or manually set engine reference
setAutoAnimateEngine(animationEngine);
```

## How It Works

### Three-Step Process

1. **Object Matching**: Objects are matched between consecutive slides using two strategies:
   - **ID Matching**: Objects with the same `id` attribute are matched (priority 1)
   - **Similarity Matching**: If no ID match, objects are matched by position, size, color, and opacity (fallback)

2. **Transformation Calculation**: For each matched pair, the system calculates:
   - Position delta (x, y movement)
   - Scale changes (width/height ratios)
   - Opacity changes (fade in/out)
   - Color interpolation
   - Rotation changes

3. **Animation Generation**: Creates smooth interpolated animations with configurable:
   - Duration (default: 600ms)
   - Easing function (default: easeInOut)
   - Stagger delay between object animations (optional)

### Animation Properties

Each auto-animate transition interpolates:

| Property | Range | Default |
|----------|-------|---------|
| Position | x, y pixels | 0, 0 |
| Scale | 0.1 to 5.0 | 1.0 |
| Opacity | 0 to 1 | 1.0 |
| Color | RGB hex values | #000000 |
| Rotation | 0 to 360° | 0° |

## Matching Strategy

### ID-Based Matching (Recommended)

When objects have matching `id` attributes:

```javascript
// Slide 1
{
  id: 'obj1',
  type: 'text',
  x: 100,
  y: 100,
  content: 'Step 1'
}

// Slide 2 - same ID will auto-animate
{
  id: 'obj1',
  type: 'text',
  x: 200,
  y: 150,
  content: 'Step 1'
}
```

**Confidence**: 100% (perfect match)

### Similarity-Based Matching (Fallback)

When objects don't have matching IDs, the system uses weighted scoring:

- **Position** (40%): Objects within ~500px are considered similar
- **Size** (30%): Similar width/height ratios
- **Opacity** (15%): Similar transparency levels
- **Color** (15%): Similar RGB values

**Confidence**: 30-99% depending on match quality

Example:
```javascript
// Slide 1 (no ID)
{
  type: 'shape',
  x: 100,
  y: 100,
  width: 150,
  height: 150,
  styles: { color: '#FF0000' }
}

// Slide 2 (similar properties)
{
  type: 'shape',
  x: 110,
  y: 105,
  width: 160,
  height: 155,
  styles: { color: '#FF0000' }
}
// Confidence: ~95% (very similar)
```

### Matching Rules

- Only objects of the same type can be matched
- Non-animatable element types (e.g., 'master') are skipped
- Each object is matched at most once (no duplicate matches)
- First priority is always ID matching, fallback to similarity

## Configuration

### Global Configuration

```javascript
// Enable/disable auto-animate globally
setAutoAnimateEnabled(true);

// Get current state
console.log(isAutoAnimateEnabled()); // true

// Update all slides at once
updateAllSlidesAutoAnimateConfig({
  enabled: true,
  duration: 800,
  easing: 'easeOutCubic',
  useStagger: true,
  staggerDelay: 100
});
```

### Per-Slide Configuration

```javascript
// Update auto-animate config for a specific slide
updateSlideAutoAnimateConfig(slideIndex, {
  enabled: true,
  duration: 1000,
  easing: 'easeInOut',
  useStagger: false
});

// Get config for a slide
const config = getAutoAnimateConfig(slide);
console.log(config);
// {
//   enabled: true,
//   duration: 600,
//   easing: 'easeInOut',
//   staggerDelay: 0,
//   useStagger: false,
//   matchStrategy: 'id'
// }
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable auto-animate |
| `duration` | number | 600 | Duration in milliseconds |
| `easing` | string | 'easeInOut' | Easing function name |
| `useStagger` | boolean | false | Stagger animations between objects |
| `staggerDelay` | number | 0 | Delay between staggered animations (ms) |
| `matchStrategy` | string | 'id' | 'id', 'similarity', or 'both' |

### Available Easing Functions

- `linear`
- `easeIn`, `easeOut`, `easeInOut`
- `easeInQuad`, `easeOutQuad`
- `easeInCubic`, `easeOutCubic`
- `easeInQuart`, `easeOutQuart`
- `easeInQuint`, `easeOutQuint`
- `easeInExpo`, `easeOutExpo`
- `easeInCirc`, `easeOutCirc`
- `easeInBack`, `easeOutBack`
- `easeInElastic`, `easeOutElastic`

## API Reference

### Core Functions

#### `detectMatchingObjects(fromSlide, toSlide)`

Detects matching objects between two slides.

```javascript
const matches = detectMatchingObjects(slide1, slide2);
// Returns: Array<{fromEl, toEl, confidence, matchType}>

matches.forEach(match => {
  console.log(`${match.fromEl.id} -> ${match.toEl.id}`);
  console.log(`Confidence: ${match.confidence}`);
  console.log(`Type: ${match.matchType}`); // 'id' or 'similarity'
});
```

#### `generateAutoAnimateSequence(fromSlide, toSlide, config)`

Generates a full auto-animate sequence for slide transition.

```javascript
const sequence = generateAutoAnimateSequence(slide1, slide2, {
  duration: 800,
  easing: 'easeInOut',
  useStagger: true,
  staggerDelay: 100
});
// Returns: Array<{elementId, animation, startTime, ...}>
```

#### `createAutoAnimateTransition(fromEl, toEl, duration, easing)`

Creates a single transition animation between two elements.

```javascript
const animation = createAutoAnimateTransition(
  element1,
  element2,
  600,
  'easeInOut'
);
// Returns: Animation object compatible with animation engine
```

### State Management

#### `extendSlideStateWithAutoAnimate(slide)`

Ensures slide has auto-animate state structure.

```javascript
extendSlideStateWithAutoAnimate(slide);
// slide.autoAnimate now contains {config, matchedPairs}
```

#### `updateAutoAnimateConfig(slide, config)`

Updates auto-animate configuration for a slide.

```javascript
updateAutoAnimateConfig(slide, {
  duration: 1000,
  enabled: false
});
```

#### `getAutoAnimateConfig(slide)`

Retrieves auto-animate configuration for a slide.

```javascript
const config = getAutoAnimateConfig(slide);
```

### Engine Integration

#### `applyAutoAnimateSequence(engine, sequence)`

Applies a sequence to the animation engine.

```javascript
const engine = getAnimationEngine();
const sequence = generateAutoAnimateSequence(slide1, slide2);
applyAutoAnimateSequence(engine, sequence);
engine.play();
```

#### `clearAutoAnimateAnimations(engine, elementIds)`

Removes auto-animate animations from engine.

```javascript
clearAutoAnimateAnimations(engine, ['obj1', 'obj2']);
```

### Interaction & Control

#### `triggerAutoAnimate(fromIndex, toIndex)`

Manually trigger auto-animate between two slides.

```javascript
triggerAutoAnimate(0, 1); // Animate from slide 0 to slide 1
```

#### `shouldAutoAnimateSlideTransition(fromIndex, toIndex)`

Check if auto-animate should apply to a transition.

```javascript
if (shouldAutoAnimateSlideTransition(0, 1)) {
  console.log('Auto-animate will apply');
}
```

#### `getAutoAnimateDuration(fromIndex, toIndex)`

Get total duration of auto-animate for a slide pair.

```javascript
const duration = getAutoAnimateDuration(0, 1);
console.log(`Animation duration: ${duration}ms`);
```

### Caching

#### `getCachedMatches(fromSlideId, toSlideId)`
#### `setCachedMatches(fromSlideId, toSlideId, matches)`
#### `clearAutoAnimateCache()`
#### `invalidateCacheForSlide(slideId)`

Cache management for performance optimization.

```javascript
// Manual cache control
clearAutoAnimateCache(); // Clear all
invalidateCacheForSlide('slide1'); // Invalidate specific slide
```

### Debugging

#### `getAutoAnimateState()`

Get current auto-animate state for debugging.

```javascript
console.log(getAutoAnimateState());
// {
//   enabled: true,
//   hasEngine: true,
//   lastSlideIndex: 2,
//   hasActiveSequence: true,
//   sequenceLength: 3
// }
```

#### `getLastAutoAnimateSequenceDetails()`

Get details about the last animation sequence.

```javascript
const details = getLastAutoAnimateSequenceDetails();
details.forEach(item => {
  console.log(`${item.elementId}: ${item.duration}ms (${item.matchType})`);
});
```

#### `logAutoAnimateDebugInfo()`

Log comprehensive debug information to console.

```javascript
logAutoAnimateDebugInfo();
```

## Examples

### Example 1: Simple Position Animation

```html
<!-- Slide 1 -->
<div id="box" style="position: absolute; left: 100px; top: 100px; width: 100px; height: 100px; background: blue;"></div>

<!-- Slide 2 -->
<div id="box" style="position: absolute; left: 300px; top: 200px; width: 100px; height: 100px; background: blue;"></div>
```

Result: Box smoothly moves from (100, 100) to (300, 200) over 600ms.

### Example 2: Complex Morphing

```javascript
// Slide 1
{
  id: 'button',
  type: 'shape',
  x: 50,
  y: 50,
  width: 100,
  height: 50,
  styles: {
    color: '#FF0000',
    opacity: 1
  }
}

// Slide 2
{
  id: 'button',
  type: 'shape',
  x: 200,
  y: 150,
  width: 200,
  height: 100,
  styles: {
    color: '#0000FF',
    opacity: 0.5
  }
}
```

Result: Button morphs with:
- Position: (50, 50) → (200, 150)
- Size: 100×50 → 200×100
- Color: #FF0000 → #0000FF
- Opacity: 1 → 0.5

### Example 3: Staggered Animation

```javascript
updateSlideAutoAnimateConfig(slideIndex, {
  duration: 800,
  useStagger: true,
  staggerDelay: 150
});
```

Result: Multiple objects animate in sequence with 150ms between each.

## Performance Tips

### 1. Use ID Matching

ID matching is faster than similarity matching:

```javascript
// Good - uses ID matching (O(n) complexity)
{id: 'object1', ...}

// Less efficient - uses similarity matching (O(n²) complexity)
{id: null, ...}
```

### 2. Enable Caching

Cache is automatically used but can be manually managed:

```javascript
// Caching is automatic for slide pairs
// Only invalidate when slides change
invalidateCacheForSlide('slide1');
```

### 3. Limit Objects per Slide

For best performance, limit to 50-100 objects per slide:

```javascript
// Good - fast
slide.elements.length <= 50;

// Acceptable
slide.elements.length <= 100;

// May have performance impact
slide.elements.length > 200;
```

### 4. Configure Appropriate Duration

Longer durations don't impact performance but affect UX:

```javascript
updateAutoAnimateConfig(slide, {
  duration: 600  // Good balance
});
```

## Troubleshooting

### Auto-Animate Not Triggering

1. **Check if enabled globally**:
   ```javascript
   console.log(isAutoAnimateEnabled()); // Should be true
   ```

2. **Check if enabled for slide**:
   ```javascript
   const config = getAutoAnimateConfig(slide);
   console.log(config.enabled); // Should be true
   ```

3. **Verify consecutive slides**: Auto-animate only works for consecutive slides (h-index difference of 1).

4. **Check engine initialization**:
   ```javascript
   console.log(getAutoAnimateEngine()); // Should not be null
   ```

### Objects Not Matching

1. **For ID matching**: Ensure object IDs are identical:
   ```javascript
   console.log(fromEl.id === toEl.id); // Should be true
   ```

2. **For similarity matching**: Check similarity score:
   ```javascript
   const matches = detectMatchingObjects(slide1, slide2);
   console.log(matches[0].confidence); // Should be > 0.3
   ```

3. **Type mismatch**: Ensure objects are the same type:
   ```javascript
   console.log(fromEl.type === toEl.type); // Should be true
   ```

### Animation Stuttering or Jank

1. **Reduce number of objects**: Limit to <50 per slide
2. **Use simpler easing**: Try `linear` instead of `easeOutElastic`
3. **Increase duration**: Longer animations are smoother
4. **Check browser performance**: Monitor GPU/CPU usage

### Objects Not Animating Correctly

1. **Check DOM elements exist**:
   ```javascript
   const el = document.getElementById(elementId);
   console.log(el !== null);
   ```

2. **Verify animation engine running**:
   ```javascript
   console.log(engine.isPlaying); // Should be true during animation
   ```

3. **Check z-index conflicts**: Ensure proper stacking order
4. **Inspect generated animation**:
   ```javascript
   const sequence = generateAutoAnimateSequence(slide1, slide2);
   console.log(sequence[0].animation);
   ```

## Integration with Existing Systems

### Working with Manual Animations

Auto-animate animations are stored separately from manual animations and won't interfere:

```javascript
// Both work together
element.animation.timelines.push(...);  // Manual animations
applyAutoAnimateSequence(engine, ...);  // Auto-animate

// Auto-animate applies after manual animations complete
```

### Compatibility with Animation Presets

Auto-animate is independent of animation presets:

```javascript
// Can use both simultaneously
applyAnimationPreset(elementId, 'fadeIn');
applyAutoAnimateSequence(engine, sequence);
```

## File Structure

- **js/animation-auto-animate.js** - Core auto-animate logic (12.7 KB)
  - Object matching, transformation calculation, sequence generation
  - Caching and performance optimization
  
- **js/animation-interaction.js** - Reveal.js integration (9.5 KB)
  - Event handling and lifecycle management
  - State management and debugging utilities

- **index.html** - Script tags for both modules
  - Loaded after animation-presets.js
  - Auto-initialized after main.js

## API Stability

All exported functions are stable and part of the public API. Internal functions (prefixed with `_`) may change without notice.

## Future Enhancements

Potential features for future versions:

- [ ] Path-based morphing (objects follow curved paths)
- [ ] Group animations (animate related objects together)
- [ ] Keyframe-based auto-animate with intermediate states
- [ ] Auto-detect optimal easing based on animation type
- [ ] Parallel matching strategies (combine multiple algorithms)
- [ ] Visual matching preview in editor

## Contributing

To contribute improvements:

1. Test changes with the included test suite
2. Maintain backward compatibility
3. Add documentation for new features
4. Follow existing code style and naming conventions
