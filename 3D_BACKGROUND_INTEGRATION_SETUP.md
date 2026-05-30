# 3D Background Integration - Installation Guide

## Quick Setup (2 Steps)

### Step 1: Add Script Tags to HTML

In `frontend/index.html`, add these script tags in order (after other editor scripts):

```html
<!-- 3D Background System -->
<script src="js/editor/background-3d.js"></script>

<!-- 3D Background Integration (must come after background-3d.js) -->
<script src="js/editor/background-3d-integration.js"></script>
```

**Important:** The integration module must load AFTER the main background-3d.js file.

### Step 2: Verify Integration

Open the browser console and check for these messages:

```
✅ [3D Background Integration] Initialized
✅ [3D Background Integration] Ready
   Styles: 14
   Categories: 8
```

## What Gets Enabled

Once integrated, the following automatically work:

1. **Slide Background Property**
    - Each slide can have a 3D background
    - Stored in `slide.background` with type '3d'
    - Persisted when saving presentations

2. **Properties Panel**
    - When a slide is selected, properties panel shows "3D Background" dropdown
    - 14 styles organized by category
    - Controls for opacity, blur, brightness, saturation

3. **Rendering**
    - Slides with 3D backgrounds render Canvas3DBackground automatically
    - Proper cleanup when slides change
    - Memory-safe lifecycle management

4. **Slide Format**
    - 3D background config stored as:
        ```javascript
        {
          type: '3d',
          style: 'particle-float',
          opacity: 1,
          blur: 0,
          brightness: 100,
          saturate: 100
        }
        ```

## Usage Examples

### Programmatically Set 3D Background

```javascript
// Set 3D background on current slide
updateSlideBackground({
    type: "3d",
    style: "particle-float",
});

// With custom adjustments
updateSlideBackground({
    type: "3d",
    style: "wave-ripple",
    opacity: 0.8,
    blur: 5,
    brightness: 110,
});

// Remove background
updateSlideBackground(null);
```

### Check Current Background

```javascript
const currentSlide = state.slides[currentSlideIndex];
if (currentSlide.background?.type === "3d") {
    console.log("3D background:", currentSlide.background.style);
}
```

### List Available Backgrounds

```javascript
// Get all available styles
console.log(Object.keys(BACKGROUND_STYLES_3D));

// Get styles by category
const particleStyles = BACKGROUND_CATEGORIES["particle"].styles;
particleStyles.forEach(style => {
    console.log(`${style.id}: ${style.name}`);
});
```

## Integration Architecture

The integration module provides:

### 1. State Normalization

- Extends `normalizeSlideBackground()` to handle type '3d'
- Validates and clamps all numeric properties
- Converts string style IDs to full configuration objects

### 2. Rendering Integration

- Extends `createSlideBackgroundNode()` to create canvas elements
- Initializes Canvas3DBackground on each render
- Applies opacity/blur/brightness/saturation filters
- Manages lifecycle with cleanup handlers

### 3. UI Integration

- Builds 3D background selector dropdown for properties panel
- Organizes 14 styles into 8 categories
- Provides sliders for effect adjustments (opacity, blur, brightness, saturate)
- Auto-updates slides when settings change

### 4. Lifecycle Management

- Cleans up Canvas3DBackground instances when slides change
- Prevents memory leaks
- Handles safety checks (e.g., element removed from DOM)

## File Structure

```
frontend/
├── js/
│   ├── editor/
│   │   ├── background-3d.js              (Main system - 785 lines)
│   │   └── background-3d-integration.js  (Integration - 16 KB)
│   ├── core/
│   │   ├── state.js                      (Uses normalizeSlideBackground)
│   │   └── commands.js                   (Uses createSlideBackgroundNode)
│   └── ...
└── index.html                            (Include both scripts here)
```

## Debugging

### Enable Console Logging

Add this to see integration details:

```javascript
// In browser console
window.DEBUG_3D_BACKGROUND = true;
```

### Check Loaded Modules

```javascript
// Verify background-3d is loaded
console.log(typeof Canvas3DBackground); // "function"
console.log(Object.keys(BACKGROUND_STYLES_3D).length); // 14

// Verify integration is loaded
console.log(typeof updateSlideBackground); // "function"
console.log(typeof buildSlideBackground3DSelector); // "function"
```

### Test Rendering

```javascript
// Create a test slide with 3D background
const testSlide = state.slides[currentSlideIndex];
testSlide.background = {
    type: "3d",
    style: "particle-float",
};

// Render to see it work
renderSlidesFromState();
```

## Troubleshooting

### 3D backgrounds not appearing?

1. Check console for errors:

    ```
    [3D Background] Failed to initialize: particle-float
    ```

2. Verify scripts are loaded in correct order:
    - background-3d.js must load first
    - background-3d-integration.js must load second

3. Verify theme exists:
    ```javascript
    console.log(typeof getPresentationTheme); // "function"
    console.log(typeof PRESENTATION_THEMES); // "object"
    ```

### Properties panel not showing 3D selector?

1. Verify integration loaded:

    ```javascript
    console.log(typeof buildSlideBackground3DSelector); // "function"
    ```

2. Click on a slide to select it
3. Properties panel should update

### Performance issues?

1. Use performance-optimized styles:
    - particle-float (60 FPS)
    - wave-ripple (60 FPS)
    - gradient-nebula (60 FPS)

2. Avoid CPU-intensive styles on slower devices:
    - sphere-cluster (30 FPS)
    - cube-matrix (30 FPS)

## Exported Functions

For external use:

```javascript
// Update slide background
window._updateSlideBackground3D(backgroundConfig);

// Build UI selector
window._buildSlideBackground3DSelector();

// Create DOM node
window._createSlideBackground3DNode(background, options);

// Normalize config
window._normalizeSlideBackground3D(config);
```

## API Reference

### updateSlideBackground(config)

Updates the current slide's background.

**Parameters:**

- `config` (object | null): Background configuration or null to remove
    - `type`: '3d' (required)
    - `style`: style ID (required)
    - `opacity`: 0-1 (default: 1)
    - `blur`: 0-40 (default: 0)
    - `brightness`: 10-200 (default: 100)
    - `saturate`: 0-250 (default: 100)

**Example:**

```javascript
updateSlideBackground({
    type: "3d",
    style: "particle-float",
    opacity: 0.9,
});
```

### buildSlideBackground3DSelector()

Builds the UI element for background selection.

**Returns:** DOM element

**Used by:** Properties panel

### createSlideBackground3DNode(background, options)

Creates a canvas node for 3D background rendering.

**Parameters:**

- `background`: Normalized background config
- `options`: { forPreview, slideIndex }

**Returns:** DOM element

**Used by:** Slide rendering system

## Integration Complete ✅

The 3D Background System is now fully integrated with SlideForge's settings system. Users can:

✅ Select 3D backgrounds from properties panel
✅ Adjust opacity, blur, brightness, saturation
✅ Save/load backgrounds with presentations
✅ Switch between 14 professional styles
✅ All saved in existing slide.background property

No additional setup required!
