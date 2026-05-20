export class StrokeRenderer {
    static getCatmullRomPoint(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;

        const f0 = -0.5 * t3 + t2 - 0.5 * t;
        const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
        const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
        const f3 = 0.5 * t3 - 0.5 * t2;

        return {
            x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
            y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
            pressure: p0.pressure * f0 + p1.pressure * f1 + p2.pressure * f2 + p3.pressure * f3,
        };
    }

    static generateSplinePoints(points, segmentSamples = 6) {
        if (points.length < 2) return points;
        if (points.length === 2) {
            const pts = [];
            for (let i = 0; i <= segmentSamples; i++) {
                const t = i / segmentSamples;
                pts.push({
                    x: points[0].x + (points[1].x - points[0].x) * t,
                    y: points[0].y + (points[1].y - points[0].y) * t,
                    pressure: points[0].pressure + (points[1].pressure - points[0].pressure) * t,
                });
            }
            return pts;
        }

        const splined = [];
        const extended = [points[0], ...points, points[points.length - 1]];

        for (let i = 1; i < extended.length - 2; i++) {
            const p0 = extended[i - 1];
            const p1 = extended[i];
            const p2 = extended[i + 1];
            const p3 = extended[i + 2];

            for (let j = 0; j < segmentSamples; j++) {
                const t = j / segmentSamples;
                splined.push(this.getCatmullRomPoint(p0, p1, p2, p3, t));
            }
        }
        splined.push(points[points.length - 1]);
        return splined;
    }

    static drawInkStroke(ctx, points, strokeColor, baseWidth = 3) {
        if (!points || points.length === 0) return;
        if (points.length === 1) {
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, baseWidth / 2, 0, Math.PI * 2);
            ctx.fillStyle = strokeColor;
            ctx.fill();
            return;
        }

        ctx.fillStyle = strokeColor;
        ctx.beginPath();

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            // Clamp pressure to valid range [0, 1]
            const pressure1 = Math.max(0, Math.min(1, p1.pressure || 0.5));
            const pressure2 = Math.max(0, Math.min(1, p2.pressure || 0.5));

            const w1 = baseWidth * (0.4 + pressure1 * 1.2);
            const w2 = baseWidth * (0.4 + pressure2 * 1.2);

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) continue;

            const nx = -dy / dist;
            const ny = dx / dist;

            const p1LeftX = p1.x + nx * (w1 / 2);
            const p1LeftY = p1.y + ny * (w1 / 2);
            const p1RightX = p1.x - nx * (w1 / 2);
            const p1RightY = p1.y - ny * (w1 / 2);

            const p2LeftX = p2.x + nx * (w2 / 2);
            const p2LeftY = p2.y + ny * (w2 / 2);
            const p2RightX = p2.x - nx * (w2 / 2);
            const p2RightY = p2.y - ny * (w2 / 2);

            ctx.moveTo(p1LeftX, p1LeftY);
            ctx.lineTo(p2LeftX, p2LeftY);
            ctx.lineTo(p2RightX, p2RightY);
            ctx.lineTo(p1RightX, p1RightY);
            ctx.closePath();

            ctx.arc(p1.x, p1.y, w1 / 2, 0, Math.PI * 2);
            ctx.arc(p2.x, p2.y, w2 / 2, 0, Math.PI * 2);
        }
        ctx.fill();
    }
}
