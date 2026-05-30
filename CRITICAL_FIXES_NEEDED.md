# 🔴 CRITICAL FIXES REQUIRED - IMMEDIATE ACTION

**Last Updated:** 2026-05-30  
**Status:** BLOCKING PRODUCTION DEPLOYMENT  
**Estimated Fix Time:** 1-2 hours each

---

## CRITICAL #1: 3D Background Memory Leak

**Severity:** CRITICAL | **Effort:** 1 hour  
**Risk of Not Fixing:** Browser crash after 100+ slide operations

### The Problem
When slides are deleted or duplicated, Canvas3DBackground instances are never destroyed. They accumulate in memory indefinitely.

### Where to Fix
File: `frontend/js/core/commands.js`

Function 1: `deleteCurrentSlide()` - around line 4158
Function 2: `duplicateCurrentSlide()` - around line 4180

### The Fix
```javascript
// ADD this before existing code in deleteCurrentSlide():
if (typeof cleanupSlideBackground3D === 'function') {
    const slideElement = document.querySelector(
        `.presentation-slide[data-slide-index="${activeIndex}"]`
    );
    if (slideElement) cleanupSlideBackground3D(slideElement);
}

// ADD the same block to duplicateCurrentSlide() after getting sourceSlide
```

### How to Verify
```javascript
// In browser console:
let count = 0;
for (let i = 0; i < 100; i++) {
    deleteCurrentSlide();
}
console.log('Memory should be stable - check DevTools Memory tab');
```

---

## CRITICAL #2: XSS Vulnerability

**Severity:** CRITICAL | **Effort:** 2 hours  
**Risk of Not Fixing:** Arbitrary code execution, data theft

### The Problem
140 direct `innerHTML` assignments without sanitization. User-controlled content (Mermaid, equations, HTML) could execute malicious scripts.

### Where to Fix
Files: 
- `frontend/js/core/commands.js`
- `frontend/js/editor/render.js`  
- `frontend/js/animations/animation-export.js`

Search pattern: `\.innerHTML\s*=`

### The Fix
Step 1: Add DOMPurify to `frontend/index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.0/dist/purify.min.js"></script>
```

Step 2: Replace all `element.innerHTML = userContent` with:
```javascript
element.innerHTML = DOMPurify.sanitize(userContent);
```

### How to Verify
```javascript
// Try injecting XSS payload
const malicious = '<img src=x onerror="alert(1)">';
// If sanitized correctly: <img src="x"> (script removed)
// If vulnerable: alert(1) executes
```

---

## HIGH #1: Event Listener Cleanup

**Severity:** HIGH | **Effort:** 2 hours  
**Risk of Not Fixing:** Progressive memory leak, browser slowdown

### The Problem
333 `addEventListener` calls without matching `removeEventListener`. Over time, listeners accumulate.

### Where to Fix
File: `frontend/js/core/main.js` - lines 96, 118, 122, 131, 222, etc.

### The Fix
Create a cleanup manager:
```javascript
const eventListeners = [];

function addEventListener_tracked(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    eventListeners.push({ element, event, handler });
}

function cleanupAllListeners() {
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners.length = 0;
}

window.addEventListener('beforeunload', cleanupAllListeners);
```

Then replace all `addEventListener` calls with `addEventListener_tracked`.

---

## HIGH #2: Unhandled Promise Rejections

**Severity:** HIGH | **Effort:** 1 hour  
**Risk of Not Fixing:** Silent failures, user confusion

### The Problem
23 fetch calls without try-catch. Network errors crash silently.

### Where to Fix
Files:
- `frontend/js/core/main.js` - API calls
- `frontend/js/core/commands.js` - Save/load operations

### The Fix
Wrap all fetch calls:
```javascript
// BEFORE:
const resp = await fetch('/api/presentations/');
const data = await resp.json();

// AFTER:
try {
    const resp = await fetch('/api/presentations/');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
} catch (error) {
    console.error('API failed:', error);
    showUserError('Failed to load presentation');
    throw error;
}
```

---

## Testing After Fixes

### Critical #1 Memory Leak Test
```javascript
// Step 1: Create slide with 3D background
addSlide();
// Set background to 'particle-float'

// Step 2: Delete 100 times and monitor memory
for (let i = 0; i < 100; i++) {
    deleteCurrentSlide();
}

// Step 3: Check memory
// Expected: Stable around 80-100MB
// If > 300MB: Still leaking
```

### Critical #2 XSS Test
```javascript
// Try to inject script in various places:
// 1. Mermaid diagram
// 2. Math equation
// 3. HTML element
// 4. Shape label

const payloads = [
    '<img src=x onerror="alert(1)">',
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '<svg onload="alert(1)">',
];

payloads.forEach(payload => {
    // Try to inject in each field
    // If alert() executes: VULNERABLE
    // If blocked: SAFE
});
```

### High #1 Event Listener Test
```javascript
// Before fix:
console.log(Object.keys(getEventListeners(document)).length);  // ~333

// After fix:
// Close and reopen project 10 times
// Should return to baseline
```

---

## Sign-Off Checklist

- [ ] 3D background memory leak fixed and tested
- [ ] XSS vulnerabilities patched with DOMPurify
- [ ] Event listener cleanup implemented
- [ ] Promise rejection handling added
- [ ] All fixes tested in browser console
- [ ] No new regressions introduced
- [ ] Memory usage stable after 100+ operations
- [ ] XSS injection attempts blocked
- [ ] Console shows no errors

---

## Estimated Timeline

| Fix | Effort | Testing | Total |
|-----|--------|---------|-------|
| 3D Background Memory Leak | 1h | 30m | 1.5h |
| XSS Vulnerability | 2h | 30m | 2.5h |
| Event Listener Cleanup | 2h | 30m | 2.5h |
| Promise Rejection Handling | 1h | 30m | 1.5h |
| **TOTAL** | **6h** | **2h** | **8 hours** |

---

## Dependencies

- DOMPurify 3.0+ (for XSS fix)
- No other external dependencies needed

---

## After Fixes Are Complete

1. Run full regression test suite
2. Re-run QA comprehensive audit
3. Test large deck performance (100-500 slides)
4. Get security team sign-off
5. Deploy to staging
6. User acceptance testing
7. Deploy to production

---

**DO NOT DEPLOY TO PRODUCTION UNTIL THESE CRITICAL FIXES ARE COMPLETED**

Questions? See `QA_COMPREHENSIVE_REPORT.md` for detailed analysis.

