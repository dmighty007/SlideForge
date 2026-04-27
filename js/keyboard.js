// js/keyboard.js

function navigateSlidesWithArrow(direction) {
    if (typeof Reveal === "undefined" || typeof Reveal.isReady !== "function" || !Reveal.isReady()) {
        return false;
    }

    const totalSlides = state.slides?.length || 0;
    if (!totalSlides) return false;

    const indices = Reveal.getIndices?.() || {};
    const currentIndex = Number.isInteger(indices.h) ? indices.h : currentSlideIndex;
    const previousDirections = new Set(["ArrowLeft", "ArrowUp"]);
    const nextDirections = new Set(["ArrowRight", "ArrowDown"]);

    let targetIndex = currentIndex;
    if (previousDirections.has(direction)) {
        targetIndex = Math.max(0, currentIndex - 1);
    } else if (nextDirections.has(direction)) {
        targetIndex = Math.min(totalSlides - 1, currentIndex + 1);
    } else {
        return false;
    }

    if (targetIndex === currentIndex) {
        return true;
    }

    Reveal.slide(targetIndex, 0, 0);
    return true;
}

function initKeyboard() {
    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
        // Do not trigger shortcuts in play mode
        if (document.body.classList.contains("play-mode-active")) return;

        const key = e.key.toLowerCase();
        const isEditingField =
            e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;

        // Ctrl/Cmd+S: Save current project
        if ((e.ctrlKey || e.metaKey) && key === "s") {
            e.preventDefault();
            if (typeof setProjectSaveHint === "function") {
                setProjectSaveHint("Saving project…", "muted");
            }
            Promise.resolve(saveCurrentProject?.()).catch(err => {
                console.warn("Manual save failed:", err);
                if (typeof setProjectSaveHint === "function") {
                    setProjectSaveHint("Save failed", "danger");
                }
            });
            return;
        }

        // Do not trigger other shortcuts if user is typing in an input, textarea, or contenteditable element
        if (isEditingField) return;

        // Ctrl+A: Select all elements
        if ((e.ctrlKey || e.metaKey) && key === "a") {
            e.preventDefault();
            const slideElements = state.slides[currentSlideIndex].elements.map(el => el.id);
            if (slideElements.length) {
                setSelectedIds(slideElements);
                slideElements.forEach(id => document.getElementById(id)?.classList.add("selected"));
                buildPropertiesPanel();
                if (typeof updateGroupBound === "function") updateGroupBound();
            }
        }
        
        // Delete / Backspace: Delete selected elements
        if ((e.key === "Delete" || e.key === "Backspace") && state.selectedIds.length) {
            e.preventDefault();
            deleteSelectedElements();
        }
        
        // Ctrl+D: Duplicate current slide
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "d") {
            e.preventDefault();
            duplicateCurrentSlide();
        }

        // Ctrl+Shift+D: Duplicate selected elements
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "d" && state.selectedIds.length) {
            e.preventDefault();
            duplicateSelectedElements();
        }
        
        // Ctrl+C: Copy element
        if ((e.ctrlKey || e.metaKey) && key === "c") {
            e.preventDefault();
            copyElement();
        }
        
        // Ctrl+V: Paste element
        if ((e.ctrlKey || e.metaKey) && key === "v") {
            e.preventDefault();
            pasteElement();
        }
        
        // Ctrl+Z: Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "z") {
            e.preventDefault();
            undo();
        }
        
        // Ctrl+Shift+Z or Ctrl+Y: Redo
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z") || ((e.ctrlKey || e.metaKey) && key === "y")) {
            e.preventDefault();
            redo();
        }

        // Ctrl+M: Add new slide
        if ((e.ctrlKey || e.metaKey) && key === "m") {
            e.preventDefault();
            addSlide();
        }

        // Ctrl+G: Group selected
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === "g") {
            e.preventDefault();
            if (typeof groupSelected === "function") groupSelected();
        }

        // Ctrl+Shift+G: Ungroup selected
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "g") {
            e.preventDefault();
            if (typeof ungroupSelected === "function") ungroupSelected();
        }

        // Arrow keys: Nudge elements
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(-step, 0);
        }
        if (e.key === "ArrowRight" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(step, 0);
        }
        if (e.key === "ArrowUp" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(0, -step);
        }
        if (e.key === "ArrowDown" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(0, step);
        }
        if (
            !state.selectedIds.length &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
            navigateSlidesWithArrow(e.key)
        ) {
            e.preventDefault();
        }

        // Tab: Cycle selection
        if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (typeof cycleSelection === "function") {
                cycleSelection(e.shiftKey ? -1 : 1);
            }
        }

        // Escape: Clear selection
        if (e.key === "Escape" && state.selectedIds.length) {
            e.preventDefault();
            clearSelection();
        }
    });

    document.addEventListener("copy", e => {
        if (document.body.classList.contains("play-mode-active")) return;
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
        if (!state.selectedIds.length) return;
        copyElement(e);
    });

    // Paste event for images/files
    document.addEventListener("paste", handlePaste);
}

// Ensure it is globally available
window.initKeyboard = initKeyboard;
