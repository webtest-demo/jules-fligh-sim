export class InstrumentPanel {
    constructor() {
        this.canvasASI = document.getElementById('gauge-asi');
        this.canvasADI = document.getElementById('gauge-adi');
        this.canvasALT = document.getElementById('gauge-alt');
        this.canvasHDG = document.getElementById('gauge-hdg');
        this.canvasVSI = document.getElementById('gauge-vsi');
        this.canvasRPM = document.getElementById('gauge-rpm');

        this.ctxASI = this.canvasASI ? this.canvasASI.getContext('2d') : null;
        this.ctxADI = this.canvasADI ? this.canvasADI.getContext('2d') : null;
        this.ctxALT = this.canvasALT ? this.canvasALT.getContext('2d') : null;
        this.ctxHDG = this.canvasHDG ? this.canvasHDG.getContext('2d') : null;
        this.ctxVSI = this.canvasVSI ? this.canvasVSI.getContext('2d') : null;
        this.ctxRPM = this.canvasRPM ? this.canvasRPM.getContext('2d') : null;

        this.valSpeed = document.getElementById('val-speed');
        this.valAlt = document.getElementById('val-alt');
        this.valPitch = document.getElementById('val-pitch');
        this.valRoll = document.getElementById('val-roll');
        this.valThrottle = document.getElementById('val-throttle');
        this.valFlaps = document.getElementById('val-flaps');
        this.valTrim = document.getElementById('val-trim');

        this.stallWarning = document.getElementById('stall-warning');
        this.brakeIndicator = document.getElementById('brake-indicator');
        this.helpPanel = document.getElementById('help-panel');

        this.initHelpToggle();
    }

    initHelpToggle() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') {
                if (this.helpPanel) {
                    this.helpPanel.style.display = (this.helpPanel.style.display === 'none') ? 'block' : 'none';
                }
            }
        });
    }

    update(physics) {
        // Update Telemetry HTML
        if (this.valSpeed) this.valSpeed.textContent = Math.round(physics.airspeedKts);
        if (this.valAlt) this.valAlt.textContent = Math.round(physics.altitudeFt);
        if (this.valPitch) this.valPitch.textContent = (physics.pitch * 180 / Math.PI).toFixed(1);
        if (this.valRoll) this.valRoll.textContent = (physics.roll * 180 / Math.PI).toFixed(1);
        if (this.valThrottle) this.valThrottle.textContent = Math.round(physics.controls.throttle * 100);
        if (this.valFlaps) this.valFlaps.textContent = Math.round(physics.controls.flaps * 30);
        if (this.valTrim) this.valTrim.textContent = (physics.controls.trim * 10).toFixed(1);

        if (this.stallWarning) this.stallWarning.style.display = physics.isStalling ? 'block' : 'none';
        if (this.brakeIndicator) this.brakeIndicator.style.display = physics.controls.brakes ? 'block' : 'none';

        // Draw Canvas Gauges
        if (this.ctxASI) this.drawASI(physics.airspeedKts);
        if (this.ctxADI) this.drawADI(physics.pitch, physics.roll);
        if (this.ctxALT) this.drawALT(physics.altitudeFt);
        if (this.ctxHDG) this.drawHDG(physics.heading);
        if (this.ctxVSI) this.drawVSI(physics.verticalSpeedFpm);
        if (this.ctxRPM) this.drawRPM(physics.engineRPM);
    }

    // Helper: Draw gauge face background & rim
    drawGaugeFace(ctx, title) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Face background
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Title text
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, cx, cy + 38);
    }

    // 1. Airspeed Indicator (0 - 200 Knots)
    drawASI(speedKts) {
        const ctx = this.ctxASI;
        const cx = 70, cy = 70;
        this.drawGaugeFace(ctx, 'KNOTS');

        // Color arcs (White arc for flaps 40-85, Green arc normal 50-140, Yellow caution 140-160, Red line 160)
        const speedToAngle = (s) => (Math.PI * 0.75) + (s / 200) * (Math.PI * 1.5);

        ctx.lineWidth = 5;
        // White Arc (Flaps)
        ctx.beginPath();
        ctx.arc(cx, cy, 54, speedToAngle(40), speedToAngle(85));
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Green Arc (Normal)
        ctx.beginPath();
        ctx.arc(cx, cy, 54, speedToAngle(50), speedToAngle(140));
        ctx.strokeStyle = '#22c55e';
        ctx.stroke();

        // Yellow Arc (Caution)
        ctx.beginPath();
        ctx.arc(cx, cy, 54, speedToAngle(140), speedToAngle(160));
        ctx.strokeStyle = '#eab308';
        ctx.stroke();

        // Ticks & Numbers
        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px sans-serif';
        for (let s = 0; s <= 200; s += 20) {
            const ang = speedToAngle(s);
            const x1 = cx + Math.cos(ang) * 58;
            const y1 = cy + Math.sin(ang) * 58;
            const x2 = cx + Math.cos(ang) * 48;
            const y2 = cy + Math.sin(ang) * 48;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            if (s % 40 === 0) {
                const tx = cx + Math.cos(ang) * 38;
                const ty = cy + Math.sin(ang) * 38 + 3;
                ctx.fillText(s.toString(), tx, ty);
            }
        }

        // Needle
        const needleAngle = speedToAngle(Math.min(200, Math.max(0, speedKts)));
        this.drawNeedle(ctx, cx, cy, needleAngle, 50, '#ef4444');
    }

    // 2. Artificial Horizon / Attitude Indicator
    drawADI(pitchRad, rollRad) {
        const ctx = this.ctxADI;
        const w = 140, h = 140;
        const cx = 70, cy = 70;

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        // Clip circular gauge face
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.clip();

        // Rotate for Roll
        ctx.translate(cx, cy);
        ctx.rotate(-rollRad);

        // Pitch translation (pixels per degree pitch)
        const pitchDeg = pitchRad * 180 / Math.PI;
        const pitchOffset = pitchDeg * 1.8;

        // Sky (Blue)
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-100, -200 + pitchOffset, 200, 200);

        // Ground (Brown)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-100, pitchOffset, 200, 200);

        // Horizon Line
        ctx.beginPath();
        ctx.moveTo(-100, pitchOffset);
        ctx.lineTo(100, pitchOffset);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Pitch Ladder Lines (+10, +20, -10, -20 deg)
        [-20, -10, 10, 20].forEach(p => {
            const y = pitchOffset - (p * 1.8);
            ctx.beginPath();
            ctx.moveTo(-15, y);
            ctx.lineTo(15, y);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        });

        ctx.restore();

        // Fixed Aircraft Symbol (Wing crosshairs)
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx - 10, cy);
        ctx.lineTo(cx - 10, cy + 6);
        ctx.moveTo(cx + 10, cy);
        ctx.lineTo(cx + 30, cy);
        ctx.lineTo(cx + 10, cy + 6);
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(cx + 4, cy);
        ctx.stroke();

        // Bezel Outer Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.stroke();
    }

    // 3. Altimeter (0 - 10,000 Feet)
    drawALT(altFt) {
        const ctx = this.ctxALT;
        const cx = 70, cy = 70;
        this.drawGaugeFace(ctx, 'ALTITUDE');

        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px sans-serif';

        for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 1.5) + (i / 10) * (Math.PI * 2);
            const x1 = cx + Math.cos(ang) * 58;
            const y1 = cy + Math.sin(ang) * 58;
            const x2 = cx + Math.cos(ang) * 48;
            const y2 = cy + Math.sin(ang) * 48;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            const tx = cx + Math.cos(ang) * 38;
            const ty = cy + Math.sin(ang) * 38 + 3;
            ctx.fillText(i.toString(), tx, ty);
        }

        // Long Needle (Hundreds of feet: 1 rev = 1000 ft)
        const hundredAngle = (Math.PI * 1.5) + ((altFt % 1000) / 1000) * (Math.PI * 2);
        this.drawNeedle(ctx, cx, cy, hundredAngle, 52, '#ffffff', 2);

        // Short Needle (Thousands of feet: 1 rev = 10,000 ft)
        const thousandAngle = (Math.PI * 1.5) + ((altFt % 10000) / 10000) * (Math.PI * 2);
        this.drawNeedle(ctx, cx, cy, thousandAngle, 34, '#ef4444', 3.5);
    }

    // 4. Heading Indicator / Compass
    drawHDG(headingRad) {
        const ctx = this.ctxHDG;
        const cx = 70, cy = 70;
        ctx.clearRect(0, 0, 140, 140);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.clip();

        ctx.translate(cx, cy);
        ctx.rotate(-headingRad);

        const cardDirs = ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';

        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(ang) * 58;
            const y1 = Math.sin(ang) * 58;
            const x2 = Math.cos(ang) * 48;
            const y2 = Math.sin(ang) * 48;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            const tx = Math.cos(ang) * 36;
            const ty = Math.sin(ang) * 36 + 4;
            ctx.fillText(cardDirs[i], tx, ty);
        }

        ctx.restore();

        // Top Lubber Line Marker (Orange Airplane indicator)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 64);
        ctx.lineTo(cx - 6, cy - 52);
        ctx.lineTo(cx + 6, cy - 52);
        ctx.closePath();
        ctx.fillStyle = '#f97316';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#334155';
        ctx.stroke();
    }

    // 5. Vertical Speed Indicator (VSI: -2000 to +2000 FPM)
    drawVSI(vsiFpm) {
        const ctx = this.ctxVSI;
        const cx = 70, cy = 70;
        this.drawGaugeFace(ctx, '100 FPM');

        // -20 to +20 (x100)
        const vsiToAngle = (v) => Math.PI + (v / 2000) * (Math.PI * 0.75);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px sans-serif';

        [-20, -15, -10, -5, 0, 5, 10, 15, 20].forEach(val => {
            const ang = vsiToAngle(val * 100);
            const x1 = cx + Math.cos(ang) * 58;
            const y1 = cy + Math.sin(ang) * 58;
            const x2 = cx + Math.cos(ang) * 48;
            const y2 = cy + Math.sin(ang) * 48;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            if (Math.abs(val) % 10 === 0) {
                const tx = cx + Math.cos(ang) * 36;
                const ty = cy + Math.sin(ang) * 36 + 3;
                ctx.fillText(Math.abs(val).toString(), tx, ty);
            }
        });

        const needleAngle = vsiToAngle(Math.min(2000, Math.max(-2000, vsiFpm)));
        this.drawNeedle(ctx, cx, cy, needleAngle, 50, '#ef4444');
    }

    // 6. Tachometer / Engine RPM Indicator (0 - 3000 RPM)
    drawRPM(rpm) {
        const ctx = this.ctxRPM;
        const cx = 70, cy = 70;
        this.drawGaugeFace(ctx, 'RPM');

        const rpmToAngle = (r) => (Math.PI * 0.75) + (r / 3000) * (Math.PI * 1.5);

        // Green Arc (Normal Operating 2100 - 2700)
        ctx.beginPath();
        ctx.arc(cx, cy, 54, rpmToAngle(2100), rpmToAngle(2700));
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#22c55e';
        ctx.stroke();

        // Red Line (Max RPM 2700)
        ctx.beginPath();
        ctx.arc(cx, cy, 54, rpmToAngle(2700), rpmToAngle(3000));
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px sans-serif';

        for (let r = 0; r <= 3000; r += 500) {
            const ang = rpmToAngle(r);
            const x1 = cx + Math.cos(ang) * 58;
            const y1 = cy + Math.sin(ang) * 58;
            const x2 = cx + Math.cos(ang) * 48;
            const y2 = cy + Math.sin(ang) * 48;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#f8fafc';
            ctx.stroke();

            const tx = cx + Math.cos(ang) * 36;
            const ty = cy + Math.sin(ang) * 36 + 3;
            ctx.fillText((r / 100).toString(), tx, ty);
        }

        const needleAngle = rpmToAngle(Math.min(3000, Math.max(0, rpm)));
        this.drawNeedle(ctx, cx, cy, needleAngle, 50, '#ef4444');
    }

    drawNeedle(ctx, cx, cy, angle, length, color, width = 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Center cap dot
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.restore();
    }
}
