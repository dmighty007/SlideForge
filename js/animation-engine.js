/**
 * Modern Animation Engine
 * GSAP-inspired timeline-based animation system for slide objects
 */

class AnimationEngine {
    constructor() {
        this.timelines = new Map();
        this.activeAnimations = new Map();
        this.playheadTime = 0;
        this.isPlaying = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.speed = 1;
        this.onUpdate = null;
        this.onComplete = null;
    }

    /**
     * Create or get animation timeline for element
     */
    getTimeline(elementId) {
        if (!this.timelines.has(elementId)) {
            this.timelines.set(elementId, {
                elementId,
                animations: [],
                currentFrame: 0,
            });
        }
        return this.timelines.get(elementId);
    }

    /**
     * Add animation to element timeline
     */
    addAnimation(elementId, animation, startTime = 0) {
        if (!elementId || !animation) return;

        const timeline = this.getTimeline(elementId);
        timeline.animations.push({
            ...animation,
            startTime: Math.max(0, Number(startTime) || 0),
            id: animation.id || `anim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        });

        timeline.animations.sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * Remove animation from timeline
     */
    removeAnimation(elementId, animationId) {
        const timeline = this.getTimeline(elementId);
        timeline.animations = timeline.animations.filter(a => a.id !== animationId);
    }

    /**
     * Clear all animations for element
     */
    clearAnimations(elementId) {
        if (elementId) {
            this.timelines.delete(elementId);
        } else {
            this.timelines.clear();
        }
    }

    /**
     * Get total duration of animations for element
     */
    getMaxDuration(elementId) {
        const timeline = this.getTimeline(elementId);
        if (!timeline.animations.length) return 0;

        return Math.max(...timeline.animations.map(anim => anim.startTime + anim.duration));
    }

    /**
     * Play animations from current position
     */
    play() {
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this._updateFrame();
    }

    /**
     * Pause animations
     */
    pause() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Seek to specific time (ms)
     */
    seek(time) {
        this.playheadTime = Math.max(0, Number(time) || 0);
        this._updateFrame();
    }

    /**
     * Set animation speed multiplier
     */
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(2, Number(speed) || 1));
    }

    /**
     * Internal frame update loop
     */
    _updateFrame() {
        const now = performance.now();
        const deltaMs = now - this.lastFrameTime;
        this.lastFrameTime = now;

        if (this.isPlaying) {
            this.playheadTime += deltaMs * this.speed;
            this._updateAnimations();

            if (this.onUpdate) {
                this.onUpdate({
                    time: this.playheadTime,
                    isPlaying: this.isPlaying,
                });
            }

            this.animationFrameId = requestAnimationFrame(() => this._updateFrame());
        }
    }

    /**
     * Update all active animations based on playhead position
     */
    _updateAnimations() {
        for (const [elementId, timeline] of this.timelines) {
            const element = document.getElementById(elementId);
            if (!element) continue;

            for (const animation of timeline.animations) {
                const { startTime, duration, type } = animation;
                const currentTime = this.playheadTime;

                if (currentTime >= startTime && currentTime <= startTime + duration) {
                    const progress = (currentTime - startTime) / duration;
                    this._applyAnimation(element, animation, progress);
                } else if (currentTime < startTime) {
                    // Animation hasn't started, apply initial state
                    this._applyAnimationInitial(element, animation);
                } else if (currentTime > startTime + duration) {
                    // Animation finished, apply final state
                    this._applyAnimationFinal(element, animation);
                }
            }
        }
    }

    /**
     * Apply animation at specific progress (0-1)
     */
    _applyAnimation(element, animation, progress) {
        const easing = getEasingFunction(animation.easing);
        const easedProgress = easing(progress);

        switch (animation.type) {
            case "fadeIn":
                this._applyFadeIn(element, animation, easedProgress);
                break;
            case "fadeOut":
                this._applyFadeOut(element, animation, easedProgress);
                break;
            case "transform":
                this._applyTransform(element, animation, easedProgress);
                break;
            case "scaleInPlace":
                this._applyScaleInPlace(element, animation, easedProgress);
                break;
            case "rotate":
                this._applyRotate(element, animation, easedProgress);
                break;
            case "write":
                this._applyWrite(element, animation, easedProgress);
                break;
            case "create":
                this._applyCreate(element, animation, easedProgress);
                break;
            case "uncreate":
                this._applyUncreate(element, animation, easedProgress);
                break;
            case "moveInPlace":
                this._applyMoveInPlace(element, animation, easedProgress);
                break;
            case "colorShift":
                this._applyColorShift(element, animation, easedProgress);
                break;
            case "strokeAnimate":
                this._applyStrokeAnimate(element, animation, easedProgress);
                break;
            case "scaleXY":
                this._applyScaleXY(element, animation, easedProgress);
                break;
            case "combinedTransform":
                this._applyCombinedTransform(element, animation, easedProgress);
                break;
            default:
                break;
        }
    }

    /**
     * Apply initial state (before animation starts)
     */
    _applyAnimationInitial(element, animation) {
        switch (animation.type) {
            case "fadeIn":
                element.style.opacity = String(animation.startOpacity ?? 0);
                break;
            case "fadeOut":
                element.style.opacity = "1";
                break;
            case "scaleInPlace":
                element.style.transform = `scale3d(${animation.startScale}, ${animation.startScale}, 1)`;
                break;
            case "moveInPlace":
                const startX = animation.startX ?? 0;
                const startY = animation.startY ?? 0;
                element.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
                break;
            case "colorShift":
                const startColor = animation.startColor ?? "#000000";
                const colorProperty = animation.colorProperty ?? "fill";
                if (colorProperty === "fill" || colorProperty === "backgroundColor") {
                    if (colorProperty === "backgroundColor") {
                        element.style.backgroundColor = startColor;
                    } else {
                        element.style.fill = startColor;
                    }
                } else if (colorProperty === "stroke") {
                    element.style.stroke = startColor;
                } else if (colorProperty === "color") {
                    element.style.color = startColor;
                }
                break;
            case "strokeAnimate":
                element.style.strokeWidth = String(animation.startStrokeWidth ?? 0);
                break;
            case "scaleXY":
                element.style.transform = `scale3d(${animation.startScaleX ?? 1}, ${animation.startScaleY ?? 1}, 1)`;
                break;
            case "combinedTransform":
                element.style.transform = `translate3d(${animation.startX ?? 0}px, ${animation.startY ?? 0}px, 0) scale3d(${animation.startScaleX ?? 1}, ${animation.startScaleY ?? 1}, 1) rotate(${animation.startRotation ?? 0}deg)`;
                break;
            case "zIndex":
                element.style.zIndex = String(animation.startZIndex ?? 0);
                break;
            default:
                break;
        }
    }

    /**
     * Apply final state (after animation completes)
     */
    _applyAnimationFinal(element, animation) {
        switch (animation.type) {
            case "fadeIn":
                element.style.opacity = String(animation.endOpacity ?? 1);
                break;
            case "fadeOut":
                element.style.opacity = "0";
                break;
            case "scaleInPlace":
                element.style.transform = `scale3d(${animation.endScale}, ${animation.endScale}, 1)`;
                break;
            case "moveInPlace":
                const endX = animation.endX ?? 0;
                const endY = animation.endY ?? 0;
                element.style.transform = `translate3d(${endX}px, ${endY}px, 0)`;
                break;
            case "colorShift":
                const endColor = animation.endColor ?? "#ffffff";
                const colorProperty = animation.colorProperty ?? "fill";
                if (colorProperty === "fill" || colorProperty === "backgroundColor") {
                    if (colorProperty === "backgroundColor") {
                        element.style.backgroundColor = endColor;
                    } else {
                        element.style.fill = endColor;
                    }
                } else if (colorProperty === "stroke") {
                    element.style.stroke = endColor;
                } else if (colorProperty === "color") {
                    element.style.color = endColor;
                }
                break;
            case "strokeAnimate":
                element.style.strokeWidth = String(animation.endStrokeWidth ?? 2);
                break;
            case "scaleXY":
                element.style.transform = `scale3d(${animation.endScaleX ?? 1}, ${animation.endScaleY ?? 1}, 1)`;
                break;
            case "combinedTransform":
                element.style.transform = `translate3d(${animation.endX ?? 0}px, ${animation.endY ?? 0}px, 0) scale3d(${animation.endScaleX ?? 1}, ${animation.endScaleY ?? 1}, 1) rotate(${animation.endRotation ?? 0}deg)`;
                break;
            case "zIndex":
                element.style.zIndex = String(animation.endZIndex ?? 100);
                break;
            default:
                break;
        }
    }

    // Animation implementations
    _applyFadeIn(element, animation, progress) {
        const startOpacity = animation.startOpacity ?? 0;
        const endOpacity = animation.endOpacity ?? 1;
        const opacity = interpolate(startOpacity, endOpacity, progress);
        element.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    }

    _applyFadeOut(element, animation, progress) {
        const opacity = interpolate(1, 0, progress);
        element.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    }

    _applyTransform(element, animation, progress) {
        const direction = animation.direction || "up";
        let x = 0,
            y = 0;
        const distance = 50;

        switch (direction) {
            case "up":
                y = interpolate(distance, 0, progress);
                break;
            case "down":
                y = interpolate(-distance, 0, progress);
                break;
            case "left":
                x = interpolate(distance, 0, progress);
                break;
            case "right":
                x = interpolate(-distance, 0, progress);
                break;
        }

        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        element.style.opacity = String(interpolate(0, 1, progress));
    }

    _applyScaleInPlace(element, animation, progress) {
        const startScale = animation.startScale ?? 0.8;
        const endScale = animation.endScale ?? 1;
        const scale = interpolate(startScale, endScale, progress);
        const opacity = interpolate(0, 1, progress);

        element.style.transform = `scale3d(${scale}, ${scale}, 1)`;
        element.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    }

    _applyRotate(element, animation, progress) {
        const rotation = interpolate(0, animation.rotation ?? 360, progress);
        element.style.transform = `rotate(${rotation}deg)`;
    }

    _applyWrite(element, animation, progress) {
        // For SVG elements, use stroke-dasharray technique
        if (element.tagName.toLowerCase() === "svg" || element.querySelector("svg")) {
            const svg = element.tagName.toLowerCase() === "svg" ? element : element.querySelector("svg");
            const paths = svg.querySelectorAll("path, circle, line, rect, polyline");

            paths.forEach(path => {
                const length = path.getTotalLength?.() || 0;
                if (length > 0) {
                    const drawLength = length * progress;
                    path.style.strokeDasharray = `${drawLength} ${length}`;
                    path.style.strokeDashoffset = "0";
                }
            });
        } else if (element.tagName.toLowerCase() === "path") {
            const length = element.getTotalLength?.() || 0;
            if (length > 0) {
                const drawLength = length * progress;
                element.style.strokeDasharray = `${drawLength} ${length}`;
                element.style.strokeDashoffset = "0";
            }
        }
    }

    _applyCreate(element, animation, progress) {
        // Similar to write, but also fade in
        this._applyWrite(element, animation, progress);
        element.style.opacity = String(progress);
    }

    _applyUncreate(element, animation, progress) {
        // Reverse of create
        this._applyWrite(element, animation, 1 - progress);
        element.style.opacity = String(1 - progress);
    }

    // NEW: Position-based animation (direct x, y movement)
    _applyMoveInPlace(element, animation, progress) {
        const startX = animation.startX ?? 0;
        const endX = animation.endX ?? 0;
        const startY = animation.startY ?? 0;
        const endY = animation.endY ?? 0;

        const x = interpolate(startX, endX, progress);
        const y = interpolate(startY, endY, progress);

        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // NEW: Color animation (fill/stroke color interpolation)
    _applyColorShift(element, animation, progress) {
        const startColor = animation.startColor ?? "#000000";
        const endColor = animation.endColor ?? "#ffffff";
        const colorProperty = animation.colorProperty ?? "fill";

        const interpolatedColor = interpolateColor(startColor, endColor, progress);

        if (colorProperty === "fill" || colorProperty === "backgroundColor") {
            if (colorProperty === "backgroundColor") {
                element.style.backgroundColor = interpolatedColor;
            } else {
                element.style.fill = interpolatedColor;
            }
        } else if (colorProperty === "stroke") {
            element.style.stroke = interpolatedColor;
        } else if (colorProperty === "color") {
            element.style.color = interpolatedColor;
        }
    }

    // NEW: SVG stroke width animation
    _applyStrokeAnimate(element, animation, progress) {
        const startStrokeWidth = animation.startStrokeWidth ?? 0;
        const endStrokeWidth = animation.endStrokeWidth ?? 2;

        const strokeWidth = interpolate(startStrokeWidth, endStrokeWidth, progress);

        if (element.tagName.toLowerCase() === "svg") {
            const paths = element.querySelectorAll("path, circle, line, rect, polyline");
            paths.forEach(path => {
                path.style.strokeWidth = String(strokeWidth);
            });
        } else if (element.tagName.toLowerCase() === "path") {
            element.style.strokeWidth = String(strokeWidth);
        } else {
            element.style.borderWidth = String(strokeWidth) + "px";
        }
    }

    // NEW: Separate X/Y scale animation
    _applyScaleXY(element, animation, progress) {
        const startScaleX = animation.startScaleX ?? 1;
        const endScaleX = animation.endScaleX ?? 1;
        const startScaleY = animation.startScaleY ?? 1;
        const endScaleY = animation.endScaleY ?? 1;

        const scaleX = interpolate(startScaleX, endScaleX, progress);
        const scaleY = interpolate(startScaleY, endScaleY, progress);

        element.style.transform = `scale3d(${scaleX}, ${scaleY}, 1)`;
    }

    // NEW: Combined transform (position + scale + rotation simultaneously)
    _applyCombinedTransform(element, animation, progress) {
        const startX = animation.startX ?? 0;
        const endX = animation.endX ?? 0;
        const startY = animation.startY ?? 0;
        const endY = animation.endY ?? 0;
        const startScaleX = animation.startScaleX ?? 1;
        const endScaleX = animation.endScaleX ?? 1;
        const startScaleY = animation.startScaleY ?? 1;
        const endScaleY = animation.endScaleY ?? 1;
        const startRotation = animation.startRotation ?? 0;
        const endRotation = animation.endRotation ?? 0;

        const x = interpolate(startX, endX, progress);
        const y = interpolate(startY, endY, progress);
        const scaleX = interpolate(startScaleX, endScaleX, progress);
        const scaleY = interpolate(startScaleY, endScaleY, progress);
        const rotation = interpolate(startRotation, endRotation, progress);

        element.style.transform = `translate3d(${x}px, ${y}px, 0) scale3d(${scaleX}, ${scaleY}, 1) rotate(${rotation}deg)`;
    }

    // NEW: Z-index animation
    _applyZIndex(element, animation, progress) {
        const startZIndex = animation.startZIndex ?? 0;
        const endZIndex = animation.endZIndex ?? 100;

        const zIndex = Math.round(interpolate(startZIndex, endZIndex, progress));
        element.style.zIndex = String(zIndex);
    }
}

// Global animation engine instance
let _animationEngine = null;

function getAnimationEngine() {
    if (!_animationEngine) {
        _animationEngine = new AnimationEngine();
    }
    return _animationEngine;
}

// Helper function to apply animation to element
function applyAnimationToElement(elementId, animationType, options = {}) {
    const engine = getAnimationEngine();
    const animation = createAnimation(animationType, options);
    engine.addAnimation(elementId, animation, options.startTime || 0);
    return animation.id;
}

// Helper to play all animations on slide
function playSlideAnimations(slideSelector = ".slide") {
    const engine = getAnimationEngine();
    engine.play();
}

// Helper to stop all animations
function stopSlideAnimations() {
    const engine = getAnimationEngine();
    engine.pause();
    engine.seek(0);
}

// Export
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        AnimationEngine,
        getAnimationEngine,
        applyAnimationToElement,
        playSlideAnimations,
        stopSlideAnimations,
    };
}
