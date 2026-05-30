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
    document.addEventListener("keydown", event => {
        const e = event || window.event || {};
        const rawKey = typeof e.key === "string" ? e.key : "";
        const key = rawKey.toLowerCase();
        const target = e.target || document.activeElement || null;

        // Do not trigger shortcuts in play mode
        if (document.body.classList.contains("play-mode-active")) return;

        const isUndoShortcut = (e.ctrlKey || e.metaKey) && !e.shiftKey && key === "z";
        const isRedoShortcut =
            ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z") || ((e.ctrlKey || e.metaKey) && key === "y");
        const isEditingField =
            target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
        const isInlineEditor =
            target?.closest?.(".text-element-content, .table-element-cell") && target?.isContentEditable;

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

        // Inline slide text/table edits are part of the presentation state, so
        // Ctrl/Cmd+Z must use app undo. Plain form fields keep native undo.
        if (isInlineEditor && (isUndoShortcut || isRedoShortcut)) {
            e.preventDefault();
            e.target.blur?.();
            requestAnimationFrame(() => {
                if (isUndoShortcut) undo();
                else redo();
            });
            return;
        }

        // Let focused form fields keep native text undo/redo.
        if (isEditingField) {
            return;
        }

        // 'w' Key: Toggle whiteboard mode
        if (key === "w" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (typeof toggleWhiteboardMode === "function") {
                toggleWhiteboardMode();
            }
            return;
        }

        // Ctrl+A: Select all elements
        if ((e.ctrlKey || e.metaKey) && key === "a") {
            e.preventDefault();
            const slide = state.slides?.[currentSlideIndex];
            if (slide && Array.isArray(slide.elements)) {
                const slideElements = slide.elements.map(el => el.id);
                if (slideElements.length) {
                    setSelectedIds(slideElements);
                    slideElements.forEach(id => document.getElementById(id)?.classList.add("selected"));
                    buildPropertiesPanel();
                    if (typeof updateGroupBound === "function") updateGroupBound();
                }
            }
        }

        // Delete / Backspace: Delete selected elements
        if ((rawKey === "Delete" || rawKey === "Backspace") && state.selectedIds.length) {
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

        // Ctrl+Z: Undo
        if (isUndoShortcut) {
            e.preventDefault();
            undo();
            return;
        }

        // Ctrl+Shift+Z or Ctrl+Y: Redo
        if (isRedoShortcut) {
            e.preventDefault();
            redo();
            return;
        }

        // Ctrl+M: Add new slide
        if ((e.ctrlKey || e.metaKey) && key === "m") {
            e.preventDefault();
            addSlide();
        }

        // Ctrl+K: Open Command Palette
        if ((e.ctrlKey || e.metaKey) && key === "k") {
            e.preventDefault();
            if (typeof openCommandPalette === "function") openCommandPalette();
        }

        // Alt+G: Group selected
        if (e.altKey && !e.shiftKey && key === "g") {
            e.preventDefault();
            if (typeof groupSelected === "function") groupSelected();
        }

        // Alt+Shift+G: Ungroup selected
        if (e.altKey && e.shiftKey && key === "g") {
            e.preventDefault();
            if (typeof ungroupSelected === "function") ungroupSelected();
        }

        // Arrow keys: Nudge elements
        const step = e.shiftKey ? 10 : 1;
        if (rawKey === "ArrowLeft" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(-step, 0);
        }
        if (rawKey === "ArrowRight" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(step, 0);
        }
        if (rawKey === "ArrowUp" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(0, -step);
        }
        if (rawKey === "ArrowDown" && state.selectedIds.length) {
            e.preventDefault();
            nudgeSelectedElements(0, step);
        }
        if (
            !state.selectedIds.length &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(rawKey) &&
            navigateSlidesWithArrow(rawKey)
        ) {
            e.preventDefault();
        }

        // Tab: Cycle selection
        if (rawKey === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (typeof cycleSelection === "function") {
                cycleSelection(e.shiftKey ? -1 : 1);
            }
        }

        // Escape: Clear selection or close modal
        if (rawKey === "Escape") {
            const shortcutsModal = document.getElementById("shortcuts-modal");
            if (shortcutsModal && !shortcutsModal.classList.contains("hidden")) {
                closeShortcutsModal();
                return;
            }
            const commandPaletteModal = document.getElementById("command-palette-modal");
            if (commandPaletteModal?.style.display === "flex") {
                closeCommandPalette?.();
                return;
            }
            if (state.selectedIds.length) {
                e.preventDefault();
                clearSelection();
            }
        }

        // F1: Show shortcuts modal
        if (rawKey === "F1") {
            e.preventDefault();
            openShortcutsModal();
        }
    });

    document.addEventListener("copy", e => {
        if (document.body.classList.contains("play-mode-active")) return;
        if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA" || e.target?.isContentEditable) return;
        if (!state.selectedIds.length) return;
        copyElement(e);
    });

    // Paste event for images/files
    document.addEventListener("paste", handlePaste);
}

// Ensure it is globally available
window.initKeyboard = initKeyboard;

function openShortcutsModal() {
    const modal = document.getElementById("shortcuts-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

function closeShortcutsModal() {
    const modal = document.getElementById("shortcuts-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

window.openShortcutsModal = openShortcutsModal;
window.closeShortcutsModal = closeShortcutsModal;
