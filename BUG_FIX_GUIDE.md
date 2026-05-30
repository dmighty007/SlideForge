# SlideForge - Critical Bug Fix Guide

**Report Date:** 2026-05-30  
**Total Bugs:** 20 (2 Critical, 5 High, 10 Medium, 3 Low)

## IMMEDIATE ACTION REQUIRED

### 🔴 CRITICAL: 3D Background Memory Leak
**Files to Fix:**
- `frontend/js/core/commands.js` - addSlide function cleanup
- `frontend/js/core/commands.js` - deleteCurrentSlide function  
- `frontend/js/core/commands.js` - duplicateCurrentSlide function

**The Problem:**
When slides are deleted or duplicated, 3D Canvas backgrounds are NOT cleaned up. Canvas3DBackground instances accumulate in memory, causing browser slowdown and eventual crash.

**Quick Fix - Add Cleanup:**
```javascript
// In deleteCurrentSlide function (around line 4158):
function deleteCurrentSlide(targetIndex = null) {
    const activeIndex = _normalizeSlideIndex(targetIndex) ?? ensureActiveSlideSync();
    if (state.slides.length <= 1) return;
    
    // ADD THIS BLOCK:
    const slideElement = document.querySelector(
        `.presentation-slide[data-slide-index="${activeIndex}"]`
    );
    if (slideElement && typeof cleanupSlideBackground3D === 'function') {
        cleanupSlideBackground3D(slideElement);
    }
    
    saveStateToUndo();
    state.slides.splice(activeIndex, 1);
    // ... rest of function
}
```

**Impact:** Prevents memory accumulation that causes crashes in long sessions.

---

### 🔴 CRITICAL: XSS Vulnerability  
**Files to Fix:**
- `frontend/js/animations/animation-export.js`
- `frontend/js/editor/render.js`
- `frontend/js/core/commands.js`

**The Problem:**
140 `innerHTML` assignments without content sanitization. User-controlled content (Mermaid diagrams, equations, HTML elements) could execute malicious scripts.

**Quick Fix - Use DOMPurify:**
```javascript
// BEFORE: Vulnerable
element.innerHTML = userContent;

// AFTER: Safe
const safe = DOMPurify.sanitize(userContent);
element.innerHTML = safe;
```

**Implementation Steps:**
1. Add DOMPurify to index.html: `<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.0/dist/purify.min.js"></script>`
2. Replace all unsafe innerHTML calls with DOMPurify
3. Test: Try injecting `<img src=x onerror="alert(1)">` - should not execute

**Impact:** Prevents code injection attacks and protects user data.

---

## HIGH PRIORITY FIXES

### 🟠 Event Listeners Memory Leak
**Issue:** 333 event listeners without cleanup  
**Impact:** Progressive memory leak  

**Fix:** Create cleanup function and call on module unload:
```javascript
function cleanupEventListeners() {
    // Implement centralized listener tracking
    // Remove all listeners on page unload
}

window.addEventListener('beforeunload', cleanupEventListeners);
```

### 🟠 Unhandled Promise Rejections
**Issue:** 23 API calls without error handling  
**Impact:** Silent failures  

**Fix:** Wrap all fetch calls:
```javascript
async function safeFetch(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    } catch (error) {
        console.error(`API Error [${url}]:`, error);
        // Show user-friendly error message
        throw error;
    }
}
```

---

## MEDIUM PRIORITY FIXES

### 🟡 Performance Issues
**Large Deck Performance (>100 slides):**
- Implement virtualization for slide rail
- Lazy-load slide previews
- Batch theme updates

**3D Background FPS Drop:**
- Use performance.now() to track frame time
- Reduce particle count on low-end devices
- Add frame rate cap

### 🟡 Properties Panel Lag
**Issue:** Panel doesn't update on rapid selection  
**Fix:** Add debouncing:
```javascript
let panelUpdateTimeout;
function debouncePropertiesUpdate() {
    clearTimeout(panelUpdateTimeout);
    panelUpdateTimeout = setTimeout(() => {
        renderPropertiesPanel();
    }, 100);
}
```

---

## Testing Checklist After Fixes

- [ ] Create slide with 3D background, delete 100 times, check memory stable
- [ ] Try injecting `<img src=x onerror="alert(1)">` in text, verify blocked
- [ ] Open/close project 50 times, check listener count stable
- [ ] Test with network offline, verify error handling works
- [ ] Switch between 10 themes rapidly, verify no flickering
- [ ] Create 100-slide deck, verify FPS >30
- [ ] Export 100-slide PDF, verify completes <30s
- [ ] Run 500 undo operations, verify state correct

---

## Code Review Checklist

Before merging any fixes, verify:

- [ ] No new console errors
- [ ] Memory usage stable (DevTools > Memory)
- [ ] Event listeners cleaned up (getEventListeners().length stable)
- [ ] No XSS vulnerabilities (try injection attacks)
- [ ] Performance metrics acceptable (FPS, load time)
- [ ] All unit tests passing
- [ ] Regression tests pass

---

## Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Load 10 slides | 400ms | <200ms | NEEDS WORK |
| Theme switch | 200ms | <100ms | NEEDS WORK |
| Memory (idle) | ~80MB | <50MB | NEEDS WORK |
| 3D BG FPS | 20-45 | >50 | NEEDS WORK |
| Export PDF | Varies | <30s | OK |

---

## Full Bug Details

See `QA_COMPREHENSIVE_REPORT.md` for detailed bug reports including:
- Reproduction steps
- Code locations
- Expected vs actual behavior
- Detailed fixes
- Security vulnerabilities
- Performance findings

