export class RoughRenderer {
    static seededRandom(seed) {
        let value = seed || 1;
        return () => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    static _rand(style) {
        if (typeof style.random === "function") return style.random();
        return Math.random();
    }

    static getJitterOffset(length, roughness, rand = Math.random) {
        const offsetRange = roughness * (length * 0.018);
        const maxOffset = Math.max(1.2, Math.min(offsetRange, 10));
        return (rand() - 0.5) * maxOffset;
    }

    static getCurvePoints(x1, y1, x2, y2, roughness, bowing, rand = Math.random) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const nx = -dy / length;
        const ny = dx / length;
        const bowAmp = (rand() - 0.5) * bowing * 2.0;
        return {
            midJitterX: mx + nx * bowAmp + this.getJitterOffset(length, roughness, rand),
            midJitterY: my + ny * bowAmp + this.getJitterOffset(length, roughness, rand),
        };
    }

    static applyStrokeStyle(ctx, style) {
        const strokeStyle = style.strokeStyle || "solid";
        if (strokeStyle === "dashed") ctx.setLineDash([10, 8]);
        else if (strokeStyle === "dotted") ctx.setLineDash([2, 7]);
        else ctx.setLineDash([]);
    }

    static drawRoughLine(ctx, x1, y1, x2, y2, style = {}) {
        const roughness = style.roughness ?? 1.5;
        const bowing = style.bowing ?? 1.0;
        const rand = style.random || Math.random;
        ctx.save();
        ctx.lineWidth = style.strokeWidth ?? 2;
        ctx.strokeStyle = style.strokeColor ?? "#000000";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        this.applyStrokeStyle(ctx, style);

        const passes = roughness <= 0.2 ? 1 : 2;
        for (let i = 0; i < passes; i++) {
            ctx.beginPath();
            const { midJitterX, midJitterY } = this.getCurvePoints(x1, y1, x2, y2, roughness, bowing, rand);
            const startJitterX = x1 + (rand() - 0.5) * roughness * 1.4;
            const startJitterY = y1 + (rand() - 0.5) * roughness * 1.4;
            const endJitterX = x2 + (rand() - 0.5) * roughness * 1.4;
            const endJitterY = y2 + (rand() - 0.5) * roughness * 1.4;
            ctx.moveTo(startJitterX, startJitterY);
            ctx.quadraticCurveTo(midJitterX, midJitterY, endJitterX, endJitterY);
            ctx.stroke();
        }
        ctx.restore();
    }

    static fillPolygon(ctx, points, style = {}) {
        const fill = style.backgroundColor || "transparent";
        if (style.fillStyle === "none") return;
        if (!fill || fill === "transparent") return;
        ctx.save();
        ctx.globalAlpha *= style.fillOpacity ?? 0.45;
        ctx.fillStyle = fill;
        ctx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();

        if (style.fillStyle === "hachure" || style.fillStyle === "cross-hatch") {
            const minX = Math.min(...points.map(p => p.x));
            const maxX = Math.max(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));
            ctx.clip();
            ctx.globalAlpha *= 0.75;
            ctx.strokeStyle = fill;
            ctx.lineWidth = 1.5;
            const gap = 10;
            for (let x = minX - (maxY - minY); x < maxX + (maxY - minY); x += gap) {
                ctx.beginPath();
                ctx.moveTo(x, maxY + gap);
                ctx.lineTo(x + (maxY - minY) + gap, minY - gap);
                ctx.stroke();
            }
            if (style.fillStyle === "cross-hatch") {
                for (let x = minX - (maxY - minY); x < maxX + (maxY - minY); x += gap) {
                    ctx.beginPath();
                    ctx.moveTo(x, minY - gap);
                    ctx.lineTo(x + (maxY - minY) + gap, maxY + gap);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    static drawRoughRect(ctx, x, y, w, h, style = {}) {
        this.fillPolygon(ctx, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], style);
        this.drawRoughLine(ctx, x, y, x + w, y, style);
        this.drawRoughLine(ctx, x + w, y, x + w, y + h, style);
        this.drawRoughLine(ctx, x + w, y + h, x, y + h, style);
        this.drawRoughLine(ctx, x, y + h, x, y, style);
    }

    static drawRoughDiamond(ctx, x, y, w, h, style = {}) {
        const points = [
            { x: x + w / 2, y },
            { x: x + w, y: y + h / 2 },
            { x: x + w / 2, y: y + h },
            { x, y: y + h / 2 },
        ];
        this.fillPolygon(ctx, points, style);
        for (let i = 0; i < points.length; i += 1) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            this.drawRoughLine(ctx, a.x, a.y, b.x, b.y, style);
        }
    }

    static drawRoughEllipse(ctx, cx, cy, rx, ry, style = {}) {
        const roughness = style.roughness ?? 1.5;
        const strokeWidth = style.strokeWidth ?? 2;
        const strokeColor = style.strokeColor ?? "#000000";
        const rand = style.random || Math.random;

        if (style.backgroundColor && style.backgroundColor !== "transparent") {
            ctx.save();
            ctx.globalAlpha *= style.fillOpacity ?? 0.45;
            ctx.fillStyle = style.backgroundColor;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        this.applyStrokeStyle(ctx, style);
        const passes = roughness <= 0.2 ? 1 : 2;
        const maxRadius = Math.max(Math.abs(rx), Math.abs(ry));
        const pointsCount = Math.max(48, Math.min(160, Math.ceil(maxRadius * 0.75)));
        const step = (Math.PI * 2) / pointsCount;
        for (let i = 0; i < passes; i++) {
            ctx.beginPath();
            const rXOffset = rx * (1 + (rand() - 0.5) * roughness * 0.045);
            const rYOffset = ry * (1 + (rand() - 0.5) * roughness * 0.045);
            for (let j = 0; j <= pointsCount + 1; j++) {
                const angle = j * step;
                const jitterX = (rand() - 0.5) * roughness * 0.9;
                const jitterY = (rand() - 0.5) * roughness * 0.9;
                const px = cx + Math.cos(angle) * rXOffset + jitterX;
                const py = cy + Math.sin(angle) * rYOffset + jitterY;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    static drawRoughArrow(ctx, x1, y1, x2, y2, style = {}) {
        this.drawRoughLine(ctx, x1, y1, x2, y2, style);
        const arrowLength = 12 + (style.strokeWidth ?? 2) * 2.4;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const leftHeadX = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
        const leftHeadY = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
        const rightHeadX = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
        const rightHeadY = y2 - arrowLength * Math.sin(angle + Math.PI / 6);
        this.drawRoughLine(ctx, x2, y2, leftHeadX, leftHeadY, style);
        this.drawRoughLine(ctx, x2, y2, rightHeadX, rightHeadY, style);
    }
}
