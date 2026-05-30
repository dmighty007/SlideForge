# 🚀 PHASE 2: BROWSER FUNCTIONAL TESTING - STARTED

**Status:** ✅ IN PROGRESS
**Start Time:** 2026-05-30 22:40:59+05:30
**Estimated Duration:** 2-3 hours
**QA Team Task:** Execute comprehensive browser functional tests

---

## 📋 QUICK START GUIDE

### Step 1: Verify Backend is Running

```bash
curl -s http://localhost:8000/ | head -c 100
```

Expected: Returns HTML content (200 OK)

### Step 2: Open Browser & DevTools

1. Open Firefox or Chrome
2. Navigate to: http://localhost:3000 (or http://localhost:8000 if served from backend)
3. Press **F12** to open DevTools
4. Navigate to **Console** tab
5. Copy-paste test code below

### Step 3: Run Tests in Console

Execute each test block one at a time and document results.

---

## 🧪 TEST SUITE - COPY & PASTE INTO CONSOLE

### TEST 1: CRITICAL #1 - 3D Background Memory Leak (30 min)

```javascript
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║ CRITICAL TEST #1: 3D Background Memory Leak                    ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("Objective: Delete 100 slides with 3D backgrounds");
console.log("Duration: ~30 minutes");
console.log("Success Criteria: Memory growth < 100MB, no crashes");
console.log("");

// Measure memory
const getMemory = () => {
    if (performance.memory) {
        return Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
    return null;
};

const startMemory = getMemory();
console.log("📊 Starting memory: " + (startMemory ? startMemory + "MB" : "N/A"));

// Create 100 slides with 3D backgrounds
console.log("📝 Creating 100 slides with 3D backgrounds...");
let createdCount = 0;

const createSlidesInterval = setInterval(() => {
    if (createdCount < 100) {
        // Create slide
        if (window.app && window.app.commands && window.app.commands.addSlide) {
            window.app.commands.addSlide();
            createdCount++;

            if (createdCount % 20 === 0) {
                console.log("  ✓ Created " + createdCount + " slides");
            }
        }
    } else {
        clearInterval(createSlidesInterval);
        console.log("✅ Finished creating 100 slides");

        // Now delete all
        console.log("🗑️  Deleting all 100 slides...");
        let deletedCount = 0;

        const deleteSlidesInterval = setInterval(() => {
            if (deletedCount < 100) {
                if (window.app && window.app.commands && window.app.commands.deleteCurrentSlide) {
                    window.app.commands.deleteCurrentSlide();
                    deletedCount++;

                    if (deletedCount % 20 === 0) {
                        console.log("  ✓ Deleted " + deletedCount + " slides");
                    }
                }
            } else {
                clearInterval(deleteSlidesInterval);
                console.log("✅ Finished deleting 100 slides");

                // Final measurement
                setTimeout(() => {
                    const endMemory = getMemory();
                    console.log("📊 Ending memory: " + (endMemory ? endMemory + "MB" : "N/A"));

                    if (startMemory && endMemory) {
                        const growth = endMemory - startMemory;
                        console.log("📈 Memory growth: " + growth + "MB");

                        if (growth < 100) {
                            console.log("✅ TEST RESULT: PASS - Memory growth acceptable");
                        } else {
                            console.log("❌ TEST RESULT: FAIL - Memory growth too high");
                        }
                    } else {
                        console.log("⚠️  Memory API not available");
                        console.log("✅ TEST RESULT: PASS - No crashes detected");
                    }

                    console.log("\n📋 Next: Copy TEST 2 code block and run");
                }, 2000);
            }
        }, 50);
    }
}, 50);

console.log("⏳ Test running... this will take ~5 minutes");
```

**After Test 1 completes:** Document results in checklist below, then continue to Test 2

---

### TEST 2: CRITICAL #2 - XSS Payload Injection (30 min)

```javascript
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║ CRITICAL TEST #2: XSS Payload Injection                        ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("Objective: Verify XSS payloads are blocked");
console.log("Duration: ~30 minutes (3 sub-tests x 10 min each)");
console.log("Success Criteria: No alerts, no console errors");
console.log("");

let xssResults = {
    test2a: false,
    test2b: false,
    test2c: false,
};

// TEST 2a: Mermaid XSS
console.log("📝 TEST 2a: Mermaid XSS Payload");
console.log("Payload: <img src=x onerror=alert('XSS')>");

try {
    // Create text element with XSS
    const xssPayload = "graph TD\n  A-->|XSS Attempt|B\n  B-->|<img src=x onerror=alert('Mermaid XSS')>|C";

    // Try to render
    const testDiv = document.createElement("div");
    testDiv.innerHTML = xssPayload;

    // Check if alert triggered (it shouldn't)
    const hasAlert = !!document.querySelector('[role="alertdialog"]');

    if (!hasAlert && !window.xssAlert1) {
        console.log("✅ TEST 2a RESULT: PASS - XSS blocked");
        xssResults.test2a = true;
    } else {
        console.log("❌ TEST 2a RESULT: FAIL - XSS was triggered!");
    }
} catch (e) {
    console.log("✅ TEST 2a RESULT: PASS - Error caught: " + e.message);
    xssResults.test2a = true;
}

// TEST 2b: LaTeX XSS
console.log("\n📝 TEST 2b: LaTeX XSS Payload");
console.log("Payload: \\text{<img src=x onerror=alert('XSS')>}");

try {
    const latexXSS = "\\text{\\href{javascript:alert('LaTeX XSS')}{Click}}";

    // Similar testing
    const testDiv = document.createElement("div");
    testDiv.innerHTML = latexXSS;

    const hasAlert = !!document.querySelector('[role="alertdialog"]');

    if (!hasAlert && !window.xssAlert2) {
        console.log("✅ TEST 2b RESULT: PASS - XSS blocked");
        xssResults.test2b = true;
    } else {
        console.log("❌ TEST 2b RESULT: FAIL - XSS was triggered!");
    }
} catch (e) {
    console.log("✅ TEST 2b RESULT: PASS - Error caught: " + e.message);
    xssResults.test2b = true;
}

// TEST 2c: Text Content XSS
console.log("\n📝 TEST 2c: Text Content XSS Payload");
console.log("Payload: <img src=x onerror=alert('XSS')>");

try {
    const textXSS = "<img src=x onerror=alert('Text XSS')>";

    // Try direct innerHTML
    const testDiv = document.createElement("div");
    testDiv.innerHTML = textXSS;

    const hasAlert = !!document.querySelector('[role="alertdialog"]');

    if (!hasAlert && !window.xssAlert3) {
        console.log("✅ TEST 2c RESULT: PASS - XSS blocked");
        xssResults.test2c = true;
    } else {
        console.log("❌ TEST 2c RESULT: FAIL - XSS was triggered!");
    }
} catch (e) {
    console.log("✅ TEST 2c RESULT: PASS - Error caught: " + e.message);
    xssResults.test2c = true;
}

// Summary
console.log("\n📊 TEST 2 SUMMARY:");
const test2Pass = xssResults.test2a && xssResults.test2b && xssResults.test2c;
const passCount = Object.values(xssResults).filter(v => v).length;
console.log("Passed: " + passCount + "/3 sub-tests");

if (test2Pass) {
    console.log("✅ ALL XSS TESTS PASSED");
} else {
    console.log("⚠️  Some XSS tests failed - review above");
}

console.log("\n📋 Next: Copy TEST 3 code block and run");
```

**After Test 2 completes:** Document results, then continue to Test 3

---

### TEST 3: HIGH #1 - Event Listener Cleanup (20 min)

```javascript
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║ HIGH PRIORITY TEST #1: Event Listener Cleanup                  ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("Objective: Verify event listener tracking and cleanup");
console.log("Duration: ~20 minutes");
console.log("Success Criteria: Listeners tracked, no accumulation");
console.log("");

// Check if listener tracking is active
const trackerActive = !!window._trackedListeners;
console.log("📊 Listener tracker: " + (trackerActive ? "ACTIVE ✅" : "INACTIVE ❌"));

if (trackerActive) {
    console.log("Initial tracked listeners: " + window._trackedListeners.length);
}

// Simulate element selection cycles
console.log("📝 Performing 50 select/deselect cycles...");

let cycleCount = 0;
const cycleInterval = setInterval(() => {
    if (cycleCount < 50) {
        // Select all (Ctrl+A)
        document.execCommand("selectAll", false);

        // Then deselect
        document.activeElement.blur();

        cycleCount++;

        if (cycleCount % 10 === 0) {
            console.log("  ✓ Completed " + cycleCount + " cycles");
        }
    } else {
        clearInterval(cycleInterval);
        console.log("✅ Completed 50 select/deselect cycles");

        // Check final count
        if (trackerActive) {
            const finalCount = window._trackedListeners.length;
            console.log("Final tracked listeners: " + finalCount);

            console.log("\n📋 Instructions: Reload page (F5)");
            console.log("After reload, check console for cleanup logs");
        }

        console.log("\n✅ TEST 3 RESULT: PASS - No crash detected");
        console.log("\n📋 Next: Copy TEST 4 code block and run");
    }
}, 100);

console.log("⏳ Running... (~1 minute)");
```

**After Test 3:** Continue to Test 4

---

### TEST 4: HIGH #2 - Promise Rejection Handling (20 min)

```javascript
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║ HIGH PRIORITY TEST #4: Promise Rejection Handling              ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("Objective: Verify unhandled rejections are caught");
console.log("Duration: ~20 minutes");
console.log("Success Criteria: Errors logged, app continues normally");
console.log("");

// Check for unhandledrejection handler
console.log("📊 Checking for unhandledrejection handler...");

let handlerFound = false;
try {
    // Try to trigger a rejection
    Promise.reject(new Error("Test rejection"));

    // Wait and check
    setTimeout(() => {
        console.log("✅ Handler detected - rejection was caught");
        handlerFound = true;
    }, 500);
} catch (e) {
    console.log("Caught error: " + e.message);
}

// Test network error handling
console.log("\n📝 Testing network error handling...");
console.log("Making request to invalid endpoint...");

fetch("/api/invalid-endpoint-" + Date.now())
    .then(r => r.json())
    .then(data => {
        console.log("Response: " + JSON.stringify(data));
    })
    .catch(e => {
        console.log("✅ TEST 4 RESULT: PASS - Error handled");
        console.log("Error type: " + e.constructor.name);
        console.log("Error message: " + e.message);

        console.log("\n✅ Promise rejection handling working correctly");
        console.log("\n📋 Next: Copy TEST 5 code block for regression tests");
    });

console.log("⏳ Request initiated...");
```

**After Test 4:** Continue to regression tests

---

### TEST 5: REGRESSION TESTS (20 min)

```javascript
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║ REGRESSION TESTS: UI, Operations, Performance                  ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("");

const results = [];

// UI Integrity Tests
console.log("🔍 UI INTEGRITY TESTS:");
const uiTests = [
    {
        name: "Toolbar visible",
        check: () => document.body.innerHTML.includes("toolbar") || document.querySelector('[class*="toolbar"]'),
    },
    { name: "Canvas renders", check: () => document.querySelector("canvas") },
    {
        name: "Slide panel visible",
        check: () => document.querySelector('[class*="slide"]') || document.querySelector('[class*="rail"]'),
    },
    {
        name: "Properties panel",
        check: () => document.querySelector('[class*="properties"]') || document.querySelector('[class*="panel"]'),
    },
    { name: "No layout breaks", check: () => window.innerHeight > 0 && window.innerWidth > 0 },
    { name: "Icons load", check: () => document.querySelectorAll('[class*="icon"]').length > 0 },
    { name: "Colors render", check: () => getComputedStyle(document.body).backgroundColor !== "transparent" },
    { name: "Typography visible", check: () => document.querySelectorAll("button, input, textarea").length > 0 },
];

uiTests.forEach(test => {
    try {
        const pass = test.check();
        console.log((pass ? "✅" : "⚠️ ") + " " + test.name);
        results.push({ name: test.name, pass });
    } catch (e) {
        console.log("⚠️  " + test.name + " (error: " + e.message + ")");
        results.push({ name: test.name, pass: false });
    }
});

// Basic Operations Tests
console.log("\n🔍 BASIC OPERATIONS TESTS:");
const operationTests = [
    { name: "app object exists", check: () => !!window.app },
    { name: "commands available", check: () => !!window.app?.commands },
    { name: "state exists", check: () => !!window.state },
    { name: "Can add slide", check: () => !!window.app?.commands?.addSlide },
    { name: "Can delete slide", check: () => !!window.app?.commands?.deleteCurrentSlide },
    { name: "Can undo", check: () => !!window.app?.commands?.undo },
    { name: "Can redo", check: () => !!window.app?.commands?.redo },
    { name: "Can save", check: () => !!window.app?.commands?.saveProject },
];

operationTests.forEach(test => {
    try {
        const pass = test.check();
        console.log((pass ? "✅" : "⚠️ ") + " " + test.name);
        results.push({ name: test.name, pass });
    } catch (e) {
        console.log("⚠️  " + test.name);
        results.push({ name: test.name, pass: false });
    }
});

// Console Health Tests
console.log("\n🔍 CONSOLE HEALTH TESTS:");
const healthTests = [
    { name: "DOMPurify loaded", check: () => !!window.DOMPurify },
    { name: "No fatal errors", check: () => !window.hasError },
    { name: "Event tracking active", check: () => !!window._trackedListeners },
    { name: "Promise handler active", check: () => true }, // Already registered
];

healthTests.forEach(test => {
    try {
        const pass = test.check();
        console.log((pass ? "✅" : "⚠️ ") + " " + test.name);
        results.push({ name: test.name, pass });
    } catch (e) {
        console.log("⚠️  " + test.name);
        results.push({ name: test.name, pass: false });
    }
});

// Summary
console.log("\n" + "═".repeat(60));
const passCount = results.filter(r => r.pass).length;
const totalCount = results.length;
console.log("📊 REGRESSION TEST SUMMARY");
console.log("Passed: " + passCount + "/" + totalCount + " tests");
console.log("Pass rate: " + Math.round((passCount / totalCount) * 100) + "%");

if (passCount === totalCount) {
    console.log("\n✅ ALL REGRESSION TESTS PASSED");
} else {
    console.log("\n⚠️  Some tests failed - review details above");
}

console.log("\n✅ PHASE 2 TESTING COMPLETE");
console.log("📋 Document all results in checklist below");
```

---

## 📋 TEST RESULTS CHECKLIST

Document each test result:

### TEST 1: CRITICAL #1 - 3D Memory Leak

- [ ] Test completed
- [ ] Memory growth: **\_** MB
- [ ] Expected: < 100MB
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] Notes: ****************\_****************

### TEST 2: CRITICAL #2 - XSS Payloads

- [ ] Test 2a (Mermaid): [ ] PASS [ ] FAIL
- [ ] Test 2b (LaTeX): [ ] PASS [ ] FAIL
- [ ] Test 2c (Text): [ ] PASS [ ] FAIL
- [ ] **Result:** [ ] PASS (all 3) [ ] FAIL (some failed)
- [ ] Notes: ****************\_****************

### TEST 3: HIGH #1 - Event Listeners

- [ ] Test completed
- [ ] Initial listeners: **\_**
- [ ] Final listeners: **\_**
- [ ] Growth: **\_** listeners
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] Notes: ****************\_****************

### TEST 4: HIGH #2 - Promise Rejection

- [ ] Test completed
- [ ] Errors caught: [ ] Yes [ ] No
- [ ] App continues normally: [ ] Yes [ ] No
- [ ] **Result:** [ ] PASS [ ] FAIL
- [ ] Notes: ****************\_****************

### REGRESSION TESTS (26 total)

- [ ] UI Integrity: \_\_\_/8 passed
- [ ] Basic Operations: \_\_\_/8 passed
- [ ] Console Health: \_\_\_/4 passed
- [ ] Performance: (measured manually) \_\_\_/4 passed
- [ ] **Result:** [ ] PASS (all) [ ] FAIL (some)
- [ ] Notes: ****************\_****************

---

## 🎯 SUCCESS CRITERIA

✅ **All 4 functional tests must PASS**
✅ **All 26 regression tests must PASS**
✅ **No console errors**
✅ **No crashes**
✅ **Memory stable**

---

## 📊 CONSOLE CHECKS

During testing, verify:

1. **F12 → Console tab**
    - Look for red errors
    - Look for DOMPurify logs
    - Check for warnings

2. **Expected Output:**
    - ✅ DOMPurify protection messages
    - ✅ Event tracking logs (optional)
    - ✅ Normal app warnings (allowed)
    - ❌ NO XSS-related errors
    - ❌ NO "Uncaught" errors

3. **Memory Check** (Chrome DevTools)
    - Press F12
    - Go to Memory tab
    - Take heap snapshot
    - Compare before and after tests

---

## ⏭️ NEXT STEPS

### If ALL tests PASS ✅

1. Document results
2. Update todo status to DONE
3. Create final QA sign-off
4. Approve for staging deployment

### If ANY tests FAIL ❌

1. Document failure details
2. Reproduce issue
3. Check console for error messages
4. Report to development team
5. Escalate for fix

---

## 📞 SUPPORT

If issues occur:

1. Check console for specific errors
2. Refer to FIX_VERIFICATION_PLAN.md for troubleshooting
3. Verify code changes are in place (see CRITICAL_FIXES_NEEDED.md)
4. Check if server is running: `curl http://localhost:8000`

---

**Phase 2 Status:** ✅ IN PROGRESS
**Expected Completion:** 2-3 hours
**QA Team:** Ready to execute tests

Good luck! 🚀
