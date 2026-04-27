let activeEditor = null;
let savedRange = null;
let formattingInteractionDepth = 0;

function normalizeFontFamily(value) {
    return String(value || "")
        .split(",")[0]
        .replace(/['"]/g, "")
        .trim();
}

function _getNativeSelection() {
    return window.getSelection ? window.getSelection() : null;
}

function isEditorActive(editor) {
    return (
        !!editor &&
        editor.classList?.contains("text-element-content") &&
        editor.contentEditable === "true" &&
        editor.dataset.structuredEdit !== "true"
    );
}

function getActiveInlineEditor() {
    return isEditorActive(activeEditor) ? activeEditor : null;
}

function setActiveInlineEditor(editor) {
    activeEditor = isEditorActive(editor) ? editor : null;
    if (!activeEditor) {
        savedRange = null;
    }
}

function clearActiveInlineEditor(editor = null) {
    if (!editor || activeEditor === editor) {
        activeEditor = null;
        savedRange = null;
    }
}

function beginFormattingInteraction() {
    formattingInteractionDepth += 1;
}

function endFormattingInteraction() {
    formattingInteractionDepth = Math.max(0, formattingInteractionDepth - 1);
}

function shouldKeepInlineEditorOpen(e) {
    if (formattingInteractionDepth > 0) return true;
    const target = (e && e.relatedTarget) || document.activeElement;
    if (target && target.closest && (target.closest('#properties-panel') || target.closest('#floating-text-toolbar'))) {
        return true;
    }
    return false;
}

function captureInlineSelection() {
    const editor = getActiveInlineEditor();
    const selection = _getNativeSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;
    savedRange = range.cloneRange();
    return true;
}

function restoreInlineSelection() {
    const editor = getActiveInlineEditor();
    const selection = _getNativeSelection();
    if (!editor || !selection || !savedRange) return false;
    selection.removeAllRanges();
    selection.addRange(savedRange.cloneRange());
    return true;
}

function selectInsertedNode(node) {
    const selection = _getNativeSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
}

function wrapSelectionWithStyledSpan(styleMap) {
    const editor = getActiveInlineEditor();
    const selection = _getNativeSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;

    const wrapper = document.createElement("span");
    Object.entries(styleMap).forEach(([prop, value]) => {
        wrapper.style[prop] = value;
    });

    if (range.collapsed) {
        wrapper.textContent = "\u200B";
        range.insertNode(wrapper);
        
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedRange = newRange.cloneRange();
    } else {
        const fragment = range.extractContents();
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
        selectInsertedNode(wrapper);
        editor.normalize();
    }
    return true;
}

function applyInlineTextStyle(action, value) {
    let editor = getActiveInlineEditor();
    
    // If no active editor found, try to find it from the current selection if possible
    if (!editor) {
        const selection = _getNativeSelection();
        const node = selection?.anchorNode;
        if (node) {
            editor = (node.nodeType === 3 ? node.parentElement : node).closest(".text-element-content");
        }
    }
    
    if (!editor) return false;
    
    // Force re-enable if it was temporarily disabled
    if (editor.contentEditable !== "true") {
        editor.contentEditable = "true";
        editor.classList.add("editing-text");
    }
    
    editor.focus();
    restoreInlineSelection();

    switch (action) {
        case "bold":
            document.execCommand?.("styleWithCSS", false, true);
            return document.execCommand?.("bold", false) ?? false;
        case "italic":
            document.execCommand?.("styleWithCSS", false, true);
            return document.execCommand?.("italic", false) ?? false;
        case "fontFamily":
            return wrapSelectionWithStyledSpan({ fontFamily: value });
        case "fontSize":
            return wrapSelectionWithStyledSpan({ fontSize: value });
        case "color":
            return wrapSelectionWithStyledSpan({ color: value });
        case "subscript":
            return document.execCommand?.("subscript", false) ?? false;
        case "superscript":
            return document.execCommand?.("superscript", false) ?? false;
        default:
            return false;
    }
}
function getStyleAtSelection() {
    const editor = getActiveInlineEditor();
    if (!editor) return null;

    // Use queryCommandValue for standard props
    const isBold = document.queryCommandState?.("bold") ?? false;
    const isItalic = document.queryCommandState?.("italic") ?? false;
    const fontName = document.queryCommandValue?.("fontName") ?? "";
    const foreColor = document.queryCommandValue?.("foreColor") ?? "";

    // For font size, it's trickier because queryCommandValue returns 1-7
    // We can check the computed style of the selection's anchor node
    const selection = _getNativeSelection();
    let fontSize = "";
    if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        if (node) {
            const style = window.getComputedStyle(node);
            fontSize = style.fontSize;
        }
    }

    return {
        fontWeight: isBold ? "bold" : "normal",
        fontStyle: isItalic ? "italic" : "normal",
        fontFamily: fontName,
        fontSize: fontSize,
        color: foreColor
    };
}
