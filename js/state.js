
// --- Core State Layer ---
let _idCounter = 0;

function generateId(prefix) {
    const hasUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
    const raw = hasUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}_${(_idCounter++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return `${prefix}_${raw}`;
}

function buildDefaultPresentationState() {
    return {
        presentationTheme: "editorial",
        pageSetup: DEFAULT_PRESENTATION_PAGE_SETUP,
        slides: [
            {
                id: generateId("slide"),
                layoutId: "blank-titled",
                notes: "",
                elements: [
                    {
                        id: generateId("el"),
                        type: "text",
                        x: 250,
                        y: 250,
                        width: "auto",
                        height: "auto",
                        autoHeight: true,
                        content: "Interactive Builder",
                        styles: {
                            color: "#172033",
                            fontSize: "64px",
                            fontFamily: '"Manrope", sans-serif',
                            textAlign: "left",
                            zIndex: 1,
                        },
                        animation: null,
                    },
                ],
            },
        ],
        selectedIds: [],
        clipboard: null,
    };
}

let state = buildDefaultPresentationState();

let currentSlideIndex = 0;
let undoStack = [];
let redoStack = [];
let currentPresentationId = null;
let currentPresentationAutosaveVersion = 0;
let currentPresentationTitle = "Untitled Presentation";
let currentAuthUser = null;
let currentAuthMode = "login";
let _authReady = false;
let _presentationPersistenceReady = false;
let _presentationPersistenceEnabled = true;
let _presentationHydrating = false;
let _autosaveTimer = null;
let _lastPersistedFingerprint = "";
let _backendApiAvailable = true;
const PRESENTATION_STORAGE_KEY = "pptmaker_presentation_id";
const PRESENTATION_ANIMATION_EFFECTS = [
    "fade-in",
    "slide-up",
    "slide-down",
    "slide-left",
    "slide-right",
    "zoom-in",
    "pop-in",
    "wipe-in",
    "pulse",
    "glow",
];
const PRESENTATION_ENTRANCE_EFFECTS = new Set([
    "fade-in",
    "slide-up",
    "slide-down",
    "slide-left",
    "slide-right",
    "zoom-in",
    "pop-in",
    "wipe-in",
]);
const PRESENTATION_EMPHASIS_EFFECTS = new Set(["pulse", "glow"]);

function createDefaultTableData(rows = 3, cols = 4) {
    const safeRows = Math.max(1, Number(rows) || 3);
    const safeCols = Math.max(1, Number(cols) || 4);
    const cells = Array.from({ length: safeRows }, (_, rowIndex) =>
        Array.from({ length: safeCols }, (_, colIndex) => ({
            text:
                rowIndex === 0
                    ? `Header ${colIndex + 1}`
                    : rowIndex === 1 && colIndex === 0
                      ? "Item"
                      : rowIndex === 1 && colIndex === 1
                        ? "Value"
                        : "",
            styles: {},
        })),
    );
    return {
        rows: safeRows,
        cols: safeCols,
        headerRow: true,
        zebra: false,
        borderColor: "#cbd5e1",
        borderWidth: 1,
        cellPadding: 10,
        headerFill: "#e2e8f0",
        bodyFill: "#ffffff",
        altFill: "#f8fafc",
        textColor: "#172033",
        headerTextColor: "#172033",
        cells,
    };
}

function normalizeTableData(tableData) {
    const fallback = createDefaultTableData();
    if (!tableData || typeof tableData !== "object") return fallback;
    const rows = Math.max(1, Number(tableData.rows) || fallback.rows);
    const cols = Math.max(1, Number(tableData.cols) || fallback.cols);
    const rawCells = Array.isArray(tableData.cells) ? tableData.cells : [];
    const cells = Array.from({ length: rows }, (_, rowIndex) =>
        Array.from({ length: cols }, (_, colIndex) => {
            const rawCell = rawCells[rowIndex]?.[colIndex];
            if (rawCell && typeof rawCell === "object") {
                return {
                    text: typeof rawCell.text === "string" ? rawCell.text : "",
                    styles: rawCell.styles && typeof rawCell.styles === "object" ? { ...rawCell.styles } : {},
                };
            }
            return {
                text: rowIndex === 0 ? `Header ${colIndex + 1}` : "",
                styles: {},
            };
        }),
    );
    return {
        rows,
        cols,
        headerRow: tableData.headerRow !== false,
        zebra: Boolean(tableData.zebra),
        borderColor: typeof tableData.borderColor === "string" ? tableData.borderColor : fallback.borderColor,
        borderWidth: Math.max(0, Number(tableData.borderWidth) || fallback.borderWidth),
        cellPadding: Math.max(2, Number(tableData.cellPadding) || fallback.cellPadding),
        headerFill: typeof tableData.headerFill === "string" ? tableData.headerFill : fallback.headerFill,
        bodyFill: typeof tableData.bodyFill === "string" ? tableData.bodyFill : fallback.bodyFill,
        altFill: typeof tableData.altFill === "string" ? tableData.altFill : fallback.altFill,
        textColor: typeof tableData.textColor === "string" ? tableData.textColor : fallback.textColor,
        headerTextColor:
            typeof tableData.headerTextColor === "string" ? tableData.headerTextColor : fallback.headerTextColor,
        cells,
    };
}

function isStructuredAnimationEffect(effect) {
    return PRESENTATION_ANIMATION_EFFECTS.includes(effect);
}

function createDefaultAnimation(effect = "fade-in", overrides = {}) {
    const safeEffect = isStructuredAnimationEffect(effect) ? effect : "fade-in";
    return {
        effect: safeEffect,
        trigger: overrides.trigger === "on-click" ? "on-click" : "on-slide",
        order: Number.isFinite(Number(overrides.order)) ? Number(overrides.order) : 0,
        durationMs: Math.max(100, Number(overrides.durationMs) || 800),
        delayMs: Math.max(0, Number(overrides.delayMs) || 0),
        easing: ["ease-out", "ease-in-out", "linear"].includes(overrides.easing) ? overrides.easing : "ease-out",
        direction: typeof overrides.direction === "string" ? overrides.direction : "",
        distancePx: Number.isFinite(Number(overrides.distancePx)) ? Number(overrides.distancePx) : 48,
        scaleFrom: Number.isFinite(Number(overrides.scaleFrom)) ? Number(overrides.scaleFrom) : 0.88,
        emphasisStyle:
            overrides.emphasisStyle === "glow" || overrides.emphasisStyle === "shake" || overrides.emphasisStyle === "pulse"
                ? overrides.emphasisStyle
                : PRESENTATION_EMPHASIS_EFFECTS.has(safeEffect)
                  ? safeEffect
                  : "pulse",
    };
}

function normalizeElementAnimation(el = {}) {
    const legacyValue = typeof el.animation === "string" ? el.animation.trim() : "";
    const raw = legacyValue ? { effect: legacyValue } : el.animation && typeof el.animation === "object" ? el.animation : null;
    if (!raw || !raw.effect || !isStructuredAnimationEffect(raw.effect)) {
        return null;
    }
    const normalized = createDefaultAnimation(raw.effect, {
        ...raw,
        durationMs: raw.durationMs ?? el.animDuration,
        delayMs: raw.delayMs ?? el.animDelay,
    });
    if (PRESENTATION_ENTRANCE_EFFECTS.has(normalized.effect)) {
        if (!normalized.direction) {
            normalized.direction =
                normalized.effect === "slide-up"
                    ? "up"
                    : normalized.effect === "slide-down"
                      ? "down"
                      : normalized.effect === "slide-left"
                        ? "left"
                        : normalized.effect === "slide-right"
                          ? "right"
                          : "";
        }
    }
    return normalized;
}

function isElementAnimationConfigured(el = {}) {
    return Boolean(normalizeElementAnimation(el));
}

function normalizeSlideBackground(background) {
    if (!background) return null;
    if (typeof background === "string") {
        const trimmed = background.trim();
        if (!trimmed) return null;
        return {
            type: /\.(mp4|webm|ogg)(\?.*)?$/i.test(trimmed) || /^data:video\//i.test(trimmed) ? "video" : "image",
            content: trimmed,
            mimeType: "",
            fit: "cover",
        };
    }
    if (typeof background !== "object") return null;
    const content = String(background.content || "").trim();
    if (!content) return null;
    const type = background.type === "video" ? "video" : "image";
    const fit = ["cover", "contain", "fill"].includes(background.fit) ? background.fit : "cover";
    return {
        type,
        content,
        mimeType: typeof background.mimeType === "string" ? background.mimeType : "",
        fit,
    };
}

function updateProjectTitleUi() {
    const input = document.getElementById("project-title-input");
    if (!input) return;
    input.value = currentPresentationTitle || "Untitled Presentation";
}

function setProjectSaveHint(message, tone = "muted") {
    const hint = document.getElementById("project-save-hint");
    if (!hint) return;
    hint.textContent = message;
    hint.style.color =
        tone === "success" ? "#047857" :
        tone === "warn" ? "#b45309" :
        tone === "danger" ? "#b91c1c" :
        "#94a3b8";
}

function markBackendUnavailable(reason = "Backend API unavailable") {
    _backendApiAvailable = false;
    _presentationPersistenceEnabled = false;
    _presentationPersistenceReady = true;
    setAuthState(null);
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    setProjectSaveHint("Local only mode", "warn");
    console.warn(reason);
}

function isBackendApiAvailable() {
    return _backendApiAvailable;
}

function closeUserMenu() {
    const menu = document.getElementById("auth-menu");
    if (!menu) return;
    menu.classList.add("hidden");
}

function toggleUserMenu() {
    const menu = document.getElementById("auth-menu");
    if (!menu) return;
    menu.classList.toggle("hidden");
}

function bindUserMenu() {
    if (document.body.dataset.userMenuBound === "true") return;
    document.body.dataset.userMenuBound = "true";
    document.addEventListener("mousedown", event => {
        const menu = document.getElementById("auth-menu");
        const button = document.getElementById("auth-menu-button");
        if (!menu || menu.classList.contains("hidden")) return;
        if (menu.contains(event.target) || button?.contains(event.target)) return;
        closeUserMenu();
    });
}

function updateAuthUi() {
    const authStatus = document.getElementById("auth-status");
    const authHeader = document.getElementById("auth-menu-header");
    const authPrimary = document.getElementById("auth-primary-btn");
    const authSecondary = document.getElementById("auth-secondary-btn");
    const authGlyph = document.getElementById("auth-user-glyph");
    const aiImportBtn = document.getElementById("toolbar-ai-import");
    const autosaveBadge = document.getElementById("autosave-status");

    if (authStatus) {
        authStatus.textContent = currentAuthUser ? currentAuthUser.username : "Guest";
    }

    if (authHeader) {
        authHeader.textContent = currentAuthUser ? `Signed in as ${currentAuthUser.username}` : "Not signed in";
    }

    if (authGlyph) {
        authGlyph.innerHTML = currentAuthUser
            ? `<span>${(currentAuthUser.username || "U").slice(0, 1).toUpperCase()}</span>`
            : `<i class="fa-regular fa-user"></i>`;
    }

    if (authPrimary) {
        authPrimary.innerHTML = currentAuthUser
            ? `<i class="fa-solid fa-folder-open"></i><span>Saved projects</span>`
            : `<i class="fa-solid fa-right-to-bracket"></i><span>Sign In</span>`;
        authPrimary.onclick = currentAuthUser ? () => { closeUserMenu(); openProjectsModal(); } : () => openAuthModal("login");
    }

    if (authSecondary) {
        authSecondary.innerHTML = currentAuthUser
            ? `<i class="fa-solid fa-arrow-right-from-bracket"></i><span>Logout</span>`
            : `<i class="fa-solid fa-user-plus"></i><span>Register</span>`;
        authSecondary.onclick = currentAuthUser ? () => { closeUserMenu(); logoutCurrentUser(); } : () => openAuthModal("register");
    }

    if (aiImportBtn) {
        aiImportBtn.disabled = !currentAuthUser;
        aiImportBtn.classList.toggle("opacity-50", !currentAuthUser);
    }

    if (autosaveBadge) {
        autosaveBadge.textContent = currentAuthUser ? "Autosave on" : "Local only";
    }
}

function setAuthState(user) {
    currentAuthUser = user || null;
    _authReady = true;
    updateAuthUi();
    updateProjectTitleUi();
}

function normalizeStateIds() {
    if (!state.presentationTheme || typeof state.presentationTheme !== "string") {
        state.presentationTheme = "editorial";
    }
    ensurePresentationPageSetup(state);

    const usedSlideIds = new Set();
    const usedElementIds = new Set();

    state.slides = (state.slides || []).map(slide => {
        const safeSlide = slide || { elements: [] };
        const nextSlideId = safeSlide.id && !usedSlideIds.has(safeSlide.id) ? safeSlide.id : generateId("slide");
        usedSlideIds.add(nextSlideId);

        const nextElements = Array.isArray(safeSlide.elements) ? safeSlide.elements : [];
        const normalizedElements = nextElements.map(el => {
            const safeEl = el || {};
            const nextElId = safeEl.id && !usedElementIds.has(safeEl.id) ? safeEl.id : generateId("el");
            usedElementIds.add(nextElId);

            const fallbackType = safeEl.type || "text";
            const fallbackStyles = {
                zIndex: 1,
                borderRadius: "0px",
                ...(fallbackType === "text"
                    ? {
                          color: "#172033",
                          fontSize: "32px",
                          fontFamily: '"Manrope", sans-serif',
                          backgroundColor: "transparent",
                          textAlign: "left",
                      }
                    : fallbackType === "table"
                      ? {
                            color: "#172033",
                            fontSize: "16px",
                            fontFamily: '"Manrope", sans-serif',
                            backgroundColor: "transparent",
                            textAlign: "left",
                        }
                    : {}),
                ...(fallbackType === "shape" ? { backgroundColor: "#6366f1" } : {}),
                ...(fallbackType === "connector"
                    ? {
                          color: "#2563eb",
                          backgroundColor: "transparent",
                          borderRadius: "0px",
                          strokeWidth: 4,
                      }
                    : {}),
            };

            const normalizedAnimation = normalizeElementAnimation(safeEl);
            return {
                ...safeEl,
                id: nextElId,
                type: fallbackType,
                animation: normalizedAnimation,
                animDuration: undefined,
                animDelay: undefined,
                ...(fallbackType === "video"
                    ? {
                          videoType:
                              safeEl.videoType === "youtube" ||
                              safeEl.videoType === "vimeo" ||
                              safeEl.videoType === "local"
                                  ? safeEl.videoType
                                  : "direct",
                          muted: safeEl.muted ?? safeEl.mute ?? true,
                          autoplay: safeEl.autoplay ?? false,
                          loop: safeEl.loop ?? false,
                      }
                    : {}),
                ...(fallbackType === "html"
                    ? {
                          htmlInteractive: safeEl.htmlInteractive ?? true,
                          htmlMode: safeEl.htmlMode === "autofit" ? "autofit" : "responsive",
                      }
                    : {}),
                ...(fallbackType === "pdf"
                    ? {
                          pdfInteractive: safeEl.pdfInteractive ?? true,
                          pdfEditorMode:
                              safeEl.pdfEditorMode === "highlight" || safeEl.pdfEditorMode === "note"
                                  ? safeEl.pdfEditorMode
                                  : "navigate",
                          pdfAnnotations: Array.isArray(safeEl.pdfAnnotations) ? safeEl.pdfAnnotations : [],
                          pdfSelectedAnnotationId:
                              typeof safeEl.pdfSelectedAnnotationId === "string" ? safeEl.pdfSelectedAnnotationId : "",
                          localMimeType: safeEl.localMimeType || "application/pdf",
                      }
                    : {}),
                ...(fallbackType === "text"
                    ? {
                          bulletStyle:
                              typeof safeEl.bulletStyle === "string" && safeEl.bulletStyle
                                  ? safeEl.bulletStyle
                                  : "default",
                          autoHeight: safeEl.autoHeight !== false,
                          themeManaged: safeEl.themeManaged ?? true,
                      }
                    : fallbackType === "table"
                      ? {
                            tableData: normalizeTableData(safeEl.tableData),
                        }
                    : fallbackType === "shape"
                      ? {
                            themeManaged: safeEl.themeManaged ?? true,
                        }
                      : fallbackType === "connector"
                        ? {
                              connectorType:
                                  safeEl.connectorType === "curve" || safeEl.connectorType === "poly"
                                      ? safeEl.connectorType
                                      : "line",
                              connectorStart: typeof safeEl.connectorStart === "string" ? safeEl.connectorStart : "none",
                              connectorEnd: typeof safeEl.connectorEnd === "string" ? safeEl.connectorEnd : "arrow",
                              connectorHeadWidth: Number.isFinite(Number(safeEl.connectorHeadWidth)) ? Math.max(4, Math.min(40, Number(safeEl.connectorHeadWidth))) : 14,
                              connectorHeadLength: Number.isFinite(Number(safeEl.connectorHeadLength)) ? Math.max(4, Math.min(40, Number(safeEl.connectorHeadLength))) : 14,
                              points: Array.isArray(safeEl.points) ? safeEl.points : null,
                              themeManaged: safeEl.themeManaged ?? true,
                          }
                      : {}),
                x: Number.isFinite(Number(safeEl.x)) ? Number(safeEl.x) : 100,
                y: Number.isFinite(Number(safeEl.y)) ? Number(safeEl.y) : 100,
                width:
                    safeEl.width ||
                    (fallbackType === "shape"
                        ? "150px"
                        : fallbackType === "connector"
                          ? "280px"
                        : fallbackType === "table"
                          ? "520px"
                        : fallbackType === "image"
                          ? "300px"
                          : fallbackType === "pdf"
                            ? "520px"
                          : fallbackType === "html"
                            ? "520px"
                            : "auto"),
                height:
                    safeEl.height ||
                    (fallbackType === "shape"
                        ? "150px"
                        : fallbackType === "connector"
                          ? "140px"
                        : fallbackType === "table"
                          ? "240px"
                        : fallbackType === "image"
                          ? "200px"
                          : fallbackType === "pdf"
                            ? "360px"
                          : fallbackType === "html"
                            ? "320px"
                            : "auto"),
                content:
                    fallbackType === "text"
                        ? normalizeTextElementContent(safeEl.content)
                        : typeof safeEl.content === "string"
                          ? safeEl.content
                          : fallbackType === "image"
                            ? "https://picsum.photos/400/300"
                            : fallbackType === "html"
                              ? "<html><body style='font-family: sans-serif; padding: 16px;'>Embedded HTML</body></html>"
                              : "",
                styles: { ...fallbackStyles, ...(safeEl.styles || {}) },
            };
        });

        return {
            ...safeSlide,
            id: nextSlideId,
            layoutId: typeof safeSlide.layoutId === "string" && safeSlide.layoutId ? safeSlide.layoutId : "blank-titled",
            notes: typeof safeSlide.notes === "string" ? safeSlide.notes : "",
            background: normalizeSlideBackground(safeSlide.background),
            elements: normalizedElements,
        };
    });

    if (!state.slides.length) {
        state.slides = [{ id: generateId("slide"), layoutId: "blank-titled", notes: "", background: null, elements: [] }];
    }

    if (currentSlideIndex > state.slides.length - 1) {
        currentSlideIndex = state.slides.length - 1;
    }
    if (currentSlideIndex < 0) {
        currentSlideIndex = 0;
    }

    const currentElements = state.slides[currentSlideIndex]?.elements || [];
    const validSelected = new Set(currentElements.map(el => el.id));
    state.selectedIds = (state.selectedIds || []).filter(id => validSelected.has(id));
}

function setCurrentSlideIndex(index) {
    currentSlideIndex = index;
}

function setSelectedIds(ids) {
    const asArray = Array.isArray(ids) ? ids : [ids];
    state.selectedIds = Array.from(new Set(asArray.filter(Boolean)));
}

function _serializeEditorSnapshot() {
    return JSON.stringify({
        state,
        currentSlideIndex,
    });
}

function _restoreEditorSnapshot(rawSnapshot) {
    const parsed = JSON.parse(rawSnapshot);
    if (parsed && typeof parsed === "object" && parsed.state && Array.isArray(parsed.state.slides)) {
        state = parsed.state;
        currentSlideIndex = Number.isInteger(parsed.currentSlideIndex) ? parsed.currentSlideIndex : currentSlideIndex;
        return true;
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.slides)) {
        state = parsed;
        return true;
    }
    return false;
}

function saveStateToUndo() {
    undoStack.push(_serializeEditorSnapshot());
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
}

function restoreUndoState() {
    if (undoStack.length > 0) {
        redoStack.push(_serializeEditorSnapshot());
        if (redoStack.length > 30) redoStack.shift();
        return _restoreEditorSnapshot(undoStack.pop());
    }
    return false;
}

function restoreRedoState() {
    if (redoStack.length > 0) {
        undoStack.push(_serializeEditorSnapshot());
        if (undoStack.length > 30) undoStack.shift();
        return _restoreEditorSnapshot(redoStack.pop());
    }
    return false;
}

function updateElementState(id, updates) {
    const el = state.slides[currentSlideIndex].elements.find(e => e.id === id);
    if (el) Object.assign(el, updates);
}

function updateElementStyleState(id, styleUpdates) {
    const el = state.slides[currentSlideIndex].elements.find(e => e.id === id);
    if (!el) return;
    if (!el.styles) el.styles = {};
    Object.assign(el.styles, styleUpdates);
}

function getPersistableState() {
    return {
        presentationTheme: state.presentationTheme,
        pageSetup: getPresentationPageSetupId(state),
        slides: JSON.parse(JSON.stringify(state.slides || [])),
        selectedIds: [],
        clipboard: null,
    };
}

function getPersistableFingerprint() {
    return JSON.stringify(getPersistableState());
}

function setPresentationHydrating(value) {
    _presentationHydrating = Boolean(value);
}

function isPresentationHydrating() {
    return _presentationHydrating;
}

function _getCsrfToken() {
    const cookie = document.cookie
        .split(";")
        .map(part => part.trim())
        .find(part => part.startsWith("csrftoken="));
    return cookie ? decodeURIComponent(cookie.split("=", 2)[1] || "") : "";
}

async function _apiFetch(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData) && !("Content-Type" in headers)) {
        headers["Content-Type"] = "application/json";
    }
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
        const csrfToken = _getCsrfToken();
        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }
    }
    return fetch(path, {
        credentials: "same-origin",
        ...options,
        method,
        headers,
    });
}

async function _presentationRequest(path, options = {}) {
    let response;
    try {
        response = await _apiFetch(path, options);
    } catch (err) {
        markBackendUnavailable(`Presentation API request failed: ${err.message || err}`);
        throw err;
    }
    if (response.status === 401) {
        setAuthState(null);
        _presentationPersistenceEnabled = false;
        openAuthModal("login");
        throw new Error("401 Unauthorized");
    }
    if (response.status === 404) {
        markBackendUnavailable(`Presentation API endpoint not found: ${path}`);
    }
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function _authRequest(path, options = {}) {
    let response;
    try {
        response = await _apiFetch(path, options);
    } catch (err) {
        markBackendUnavailable(`Auth API request failed: ${err.message || err}`);
        throw err;
    }
    let payload = {};
    try {
        payload = await response.json();
    } catch (_err) {}
    if (response.status === 404) {
        markBackendUnavailable(`Auth API endpoint not found: ${path}`);
    }
    if (!response.ok) {
        throw new Error(payload.error || `${response.status} ${response.statusText}`);
    }
    return payload;
}

async function refreshAuthSession() {
    const session = await _authRequest("/api/auth/session/", { method: "GET" });
    setAuthState(session.user || null);
    return session;
}

function switchAuthMode(mode = "login") {
    currentAuthMode = mode === "register" ? "register" : "login";
    const title = document.getElementById("auth-modal-title");
    const submit = document.getElementById("auth-submit-btn");
    const toggle = document.getElementById("auth-toggle-btn");
    const subtitle = document.getElementById("auth-modal-subtitle");
    const error = document.getElementById("auth-error");
    if (title) title.textContent = currentAuthMode === "register" ? "Create account" : "Sign in";
    if (submit) submit.textContent = currentAuthMode === "register" ? "Create account" : "Sign in";
    if (toggle) toggle.textContent = currentAuthMode === "register" ? "Use existing account" : "Create account";
    if (subtitle) subtitle.textContent = currentAuthMode === "register" ? "Create a user to enable autosave and AI import." : "Sign in to load, save, and import presentations.";
    if (error) error.textContent = "";
}

function toggleAuthMode() {
    switchAuthMode(currentAuthMode === "login" ? "register" : "login");
}

function openAuthModal(mode = "login") {
    if (!_backendApiAvailable) return;
    const modal = document.getElementById("auth-modal");
    closeUserMenu();
    switchAuthMode(mode);
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal && currentAuthUser) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
}

async function submitAuthForm(event) {
    if (event) event.preventDefault();
    const username = document.getElementById("auth-username")?.value?.trim() || "";
    const password = document.getElementById("auth-password")?.value || "";
    const error = document.getElementById("auth-error");
    if (error) error.textContent = "";

    try {
        const path = currentAuthMode === "register" ? "/api/auth/register/" : "/api/auth/login/";
        const session = await _authRequest(path, {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
        setAuthState(session.user || null);
        closeAuthModal();
        await initPresentationPersistence(true);
        renderSlidesFromState?.();
    } catch (err) {
        if (error) error.textContent = err.message || "Authentication failed";
    }
}

async function logoutCurrentUser() {
    await _authRequest("/api/auth/logout/", { method: "POST" });
    setAuthState(null);
    currentPresentationId = null;
    currentPresentationAutosaveVersion = 0;
    _presentationPersistenceEnabled = false;
    _presentationPersistenceReady = true;
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    setProjectSaveHint("Sign in to save projects", "warn");
    openAuthModal("login");
}

function requireAuthenticatedAction(action, mode = "login") {
    if (currentAuthUser) {
        action();
        return true;
    }
    openAuthModal(mode);
    return false;
}

function triggerAIImportPicker() {
    requireAuthenticatedAction(() => {
        document.getElementById("ai-json-upload")?.click();
    });
}

function _inferPresentationTitle() {
    if (currentPresentationTitle && currentPresentationTitle !== "Untitled Presentation") {
        return currentPresentationTitle;
    }
    const firstSlide = (state.slides || [])[0];
    const firstText = (firstSlide?.elements || []).find(el => el.type === "text");
    if (typeof firstText?.content === "string") {
        const text = parseTextFromHtml(firstText.content).split("\n")[0].trim();
        if (text) return text.slice(0, 255);
    }
    return "Untitled Presentation";
}

function setCurrentPresentationTitle(title) {
    currentPresentationTitle = (title || "").trim() || "Untitled Presentation";
    updateProjectTitleUi();
}

async function createPresentationRecord() {
    const payload = {
        title: _inferPresentationTitle(),
        presentationTheme: state.presentationTheme,
        state: getPersistableState(),
    };
    const created = await _presentationRequest("/api/presentations/", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    currentPresentationId = created.id;
    currentPresentationAutosaveVersion = created.autosaveVersion || 1;
    setCurrentPresentationTitle(created.title || payload.title);
    localStorage.setItem(PRESENTATION_STORAGE_KEY, currentPresentationId);
    _lastPersistedFingerprint = JSON.stringify(created.state || payload.state);
    setProjectSaveHint("Project saved", "success");
    return created;
}

async function loadPresentationRecord(presentationId) {
    const loaded = await _presentationRequest(`/api/presentations/${presentationId}/`, { method: "GET" });
    currentPresentationId = loaded.id;
    currentPresentationAutosaveVersion = loaded.autosaveVersion || 1;
    setCurrentPresentationTitle(loaded.title || "Untitled Presentation");
    const hasSlides =
        loaded.state &&
        Array.isArray(loaded.state.slides) &&
        loaded.state.slides.length > 0;
    if (hasSlides) {
        state = loaded.state;
    } else if (
        loaded.bridgeResult &&
        typeof _looksLikeBridgeExport === "function" &&
        _looksLikeBridgeExport(loaded.bridgeResult) &&
        typeof _convertBridgeExportToEditorState === "function"
    ) {
        state = _convertBridgeExportToEditorState(loaded.bridgeResult);
    }
    localStorage.setItem(PRESENTATION_STORAGE_KEY, currentPresentationId);
    _lastPersistedFingerprint = JSON.stringify(hasSlides ? loaded.state : getPersistableState());
    setProjectSaveHint("All changes saved", "success");
    return loaded;
}

async function initPresentationPersistence(force = false) {
    if (_presentationPersistenceReady && !force) return true;
    if (!_backendApiAvailable) return false;
    setPresentationHydrating(true);
    try {
        const session = _authReady ? { user: currentAuthUser } : await refreshAuthSession();
        if (!session.user) {
            _presentationPersistenceEnabled = false;
            _presentationPersistenceReady = true;
            localStorage.removeItem(PRESENTATION_STORAGE_KEY);
            if (_backendApiAvailable) openAuthModal("login");
            return false;
        }
        const storedId = localStorage.getItem(PRESENTATION_STORAGE_KEY);
        if (storedId) {
            try {
                await loadPresentationRecord(storedId);
            } catch (err) {
                console.warn("Stored presentation could not be loaded, creating a new one:", err);
                localStorage.removeItem(PRESENTATION_STORAGE_KEY);
                await createPresentationRecord();
            }
        } else {
            await createPresentationRecord();
        }
        _presentationPersistenceReady = true;
        _presentationPersistenceEnabled = true;
        return true;
    } catch (err) {
        console.warn("Presentation persistence unavailable:", err);
        _presentationPersistenceEnabled = false;
        _presentationPersistenceReady = true;
        if (_backendApiAvailable) setProjectSaveHint("Sign in to save projects", "warn");
        return false;
    } finally {
        setPresentationHydrating(false);
    }
}

async function autosavePresentationNow() {
    if (!_presentationPersistenceEnabled || !_presentationPersistenceReady || !currentPresentationId || isPresentationHydrating()) {
        return false;
    }
    const fingerprint = getPersistableFingerprint();
    if (fingerprint === _lastPersistedFingerprint) {
        setProjectSaveHint("All changes saved", "success");
        return false;
    }

    const payload = {
        title: _inferPresentationTitle(),
        presentationTheme: state.presentationTheme,
        state: getPersistableState(),
    };
    const saved = await _presentationRequest(`/api/presentations/${currentPresentationId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    currentPresentationAutosaveVersion = saved.autosaveVersion || currentPresentationAutosaveVersion;
    setCurrentPresentationTitle(payload.title);
    _lastPersistedFingerprint = fingerprint;
    setProjectSaveHint("All changes saved", "success");
    return true;
}

function schedulePresentationAutosave(delay = 1200) {
    if (!_presentationPersistenceEnabled || !_presentationPersistenceReady || isPresentationHydrating()) {
        return;
    }
    setProjectSaveHint("Unsaved changes", "warn");
    clearTimeout(_autosaveTimer);
    _autosaveTimer = setTimeout(() => {
        autosavePresentationNow().catch(err => {
            console.warn("Autosave failed:", err);
            setProjectSaveHint("Save failed", "danger");
        });
    }, delay);
}

function adoptPresentationRecord(presentationId, title = null, autosaveVersion = 1) {
    if (!presentationId) return;
    currentPresentationId = presentationId;
    currentPresentationAutosaveVersion = autosaveVersion || 1;
    if (title) setCurrentPresentationTitle(title);
    localStorage.setItem(PRESENTATION_STORAGE_KEY, currentPresentationId);
    _lastPersistedFingerprint = "";
}

async function saveCurrentProject() {
    if (!_backendApiAvailable) return false;
    if (!currentAuthUser) {
        openAuthModal("login");
        return false;
    }
    if (!currentPresentationId) {
        await createPresentationRecord();
        setProjectSaveHint("Project saved", "success");
        return true;
    }
    const saved = await autosavePresentationNow();
    if (!saved) {
        setProjectSaveHint("All changes saved", "success");
    }
    return true;
}

async function createNewProject() {
    if (!_backendApiAvailable) {
        saveStateToUndo();
        clearTimeout(_autosaveTimer);
        state = buildDefaultPresentationState();
        normalizeStateIds();
        syncPresentationPageSetup?.();
        currentSlideIndex = 0;
        setCurrentPresentationTitle("Untitled Presentation");
        setProjectSaveHint("New local project", "muted");
        renderSlidesFromState?.();
        updateSlideCounter?.();
        return true;
    }
    if (!currentAuthUser) {
        openAuthModal("login");
        return false;
    }
    saveStateToUndo();
    clearTimeout(_autosaveTimer);
    state = buildDefaultPresentationState();
    normalizeStateIds();
    syncPresentationPageSetup?.();
    currentSlideIndex = 0;
    currentPresentationId = null;
    currentPresentationAutosaveVersion = 0;
    setCurrentPresentationTitle("Untitled Presentation");
    setProjectSaveHint("New project created", "muted");
    _lastPersistedFingerprint = "";
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    await createPresentationRecord();
    applyPresentationTheme(state.presentationTheme, { persist: false });
    renderSlidesFromState?.();
    updateSlideCounter?.();
    return true;
}

async function loadProjectById(presentationId) {
    if (!_backendApiAvailable) return false;
    if (!presentationId) return false;
    if (!currentAuthUser) {
        openAuthModal("login");
        return false;
    }
    setPresentationHydrating(true);
    try {
        await loadPresentationRecord(presentationId);
        normalizeStateIds();
        if (typeof migrateInlineVideoAssets === "function") {
            try {
                await migrateInlineVideoAssets();
            } catch (err) {
                console.warn("Inline video migration failed:", err);
            }
        }
        currentSlideIndex = 0;
        applyPresentationTheme(state.presentationTheme, { persist: false });
        syncPresentationPageSetup?.();
        renderSlidesFromState?.();
        updateSlideCounter?.();
        return true;
    } finally {
        setPresentationHydrating(false);
    }
}

async function duplicateCurrentStateToNewProject(title = null) {
    if (!_backendApiAvailable) return false;
    if (!currentAuthUser) {
        openAuthModal("login");
        return false;
    }
    currentPresentationId = null;
    currentPresentationAutosaveVersion = 0;
    setCurrentPresentationTitle(title || _inferPresentationTitle());
    _lastPersistedFingerprint = "";
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    await createPresentationRecord();
    return true;
}

function bindProjectTitleInput() {
    const input = document.getElementById("project-title-input");
    if (!input || input.dataset.bound === "true") return;
    input.dataset.bound = "true";
    updateProjectTitleUi();

    const commitTitle = () => {
        const nextTitle = (input.value || "").trim() || "Untitled Presentation";
        if (nextTitle === currentPresentationTitle) {
            input.value = currentPresentationTitle;
            return;
        }
        setCurrentPresentationTitle(nextTitle);
        setProjectSaveHint("Unsaved changes", "warn");
        schedulePresentationAutosave(150);
    };

    input.addEventListener("input", () => {
        currentPresentationTitle = (input.value || "").trim() || "Untitled Presentation";
        setProjectSaveHint("Editing title…", "muted");
    });
    input.addEventListener("change", commitTitle);
    input.addEventListener("blur", commitTitle);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
        }
    });
}

async function listSavedProjects() {
    const payload = await _presentationRequest("/api/presentations/", { method: "GET" });
    return payload.presentations || [];
}

async function openProjectsModal() {
    if (!currentAuthUser) {
        openAuthModal("login");
        return;
    }
    closeUserMenu();
    const modal = document.getElementById("projects-modal");
    const list = document.getElementById("projects-list");
    const status = document.getElementById("projects-status");
    if (!modal || !list || !status) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    status.textContent = "Loading projects…";
    list.innerHTML = "";
    try {
        const projects = await listSavedProjects();
        status.textContent = projects.length ? "" : "No saved projects yet.";
        list.innerHTML = projects
            .map(
                project => `
                    <button type="button" class="w-full text-left border border-border rounded-xl px-4 py-3 hover:bg-surface transition-colors" data-project-id="${project.id}">
                        <div class="text-sm font-semibold text-text-main">${escapeHtml(project.title || "Untitled Presentation")}</div>
                        <div class="text-xs text-text-sub mt-1">Updated ${new Date(project.updatedAt).toLocaleString()}</div>
                    </button>
                `,
            )
            .join("");
        list.querySelectorAll("[data-project-id]").forEach(btn => {
            btn.onclick = async () => {
                await loadProjectById(btn.dataset.projectId);
                closeProjectsModal();
            };
        });
    } catch (err) {
        status.textContent = `Failed to load projects: ${err.message}`;
    }
}

function closeProjectsModal() {
    const modal = document.getElementById("projects-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}
