// Salpicadero 2D: cuentarrevoluciones, velocímetro, marcha, intermitentes, límite vigente
export class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blink = 0;
  }

  dial(cx, cy, r, frac, redFrom, label, value, unit) {
    const ctx = this.ctx;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.lineWidth = 10; ctx.strokeStyle = '#2a3550'; ctx.stroke();
    if (redFrom < 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0 + (a1 - a0) * redFrom, a1);
      ctx.strokeStyle = '#a92642'; ctx.stroke();
    }
    // ticks
    ctx.strokeStyle = '#5a6a8c'; ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.lineTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
      ctx.stroke();
    }
    // aguja
    const a = a0 + (a1 - a0) * Math.max(0, Math.min(1, frac));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff8787'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8787'; ctx.fill();
    // texto
    ctx.fillStyle = '#e8eef8'; ctx.textAlign = 'center';
    ctx.font = 'bold 22px Segoe UI';
    ctx.fillText(value, cx, cy + r * 0.55);
    ctx.font = '11px Segoe UI'; ctx.fillStyle = '#8b9cba';
    ctx.fillText(unit, cx, cy + r * 0.55 + 15);
    ctx.fillText(label, cx, cy - r * 0.35);
  }

  limitSign(cx, cy, r, limit) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = '#c1121f'; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(r * 0.95)}px Arial`;
    ctx.fillText(String(limit), cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }

  draw(car, limit, dt) {
    this.blink += dt;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // panel
    ctx.fillStyle = 'rgba(13, 18, 32, 0.82)';
    ctx.beginPath();
    ctx.roundRect(60, 18, W - 120, H - 22, 18);
    ctx.fill();
    ctx.strokeStyle = '#2a3550'; ctx.lineWidth = 1.5; ctx.stroke();

    const cy = H / 2 + 12;
    // cuentarrevoluciones
    this.dial(215, cy, 72, car.rpm / 7000, 6000 / 7000, 'rpm ×1000',
      (car.rpm / 1000).toFixed(1), car.engineOn ? '' : 'CALADO');
    // velocímetro
    this.dial(W - 215, cy, 72, car.kmh / 140, 2, 'km/h', String(Math.round(car.kmh)), '');

    // marcha
    ctx.fillStyle = '#0e1424';
    ctx.beginPath(); ctx.roundRect(W / 2 - 42, cy - 48, 84, 74, 10); ctx.fill();
    ctx.strokeStyle = '#3a4a6b'; ctx.stroke();
    ctx.fillStyle = car.engineOn ? '#7cd9ff' : '#5a6a8c';
    ctx.font = 'bold 44px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(car.gearLabel, W / 2, cy + 8);
    ctx.font = '11px Segoe UI'; ctx.fillStyle = '#8b9cba';
    ctx.fillText(car.transmission === 'manual' ? 'MARCHA' : 'AUTO', W / 2, cy + 23);

    // intermitentes
    const on = Math.floor(this.blink * 2.2) % 2 === 0;
    ctx.font = 'bold 30px Segoe UI';
    ctx.fillStyle = car.indicator === 'left' && on ? '#51cf66' : '#2a3550';
    ctx.fillText('◀', W / 2 - 75, cy - 12);
    ctx.fillStyle = car.indicator === 'right' && on ? '#51cf66' : '#2a3550';
    ctx.fillText('▶', W / 2 + 75, cy - 12);

    // límite vigente
    this.limitSign(W / 2 + 150, cy - 15, 26, limit);

    // volante (indicador de dirección)
    const wx = W / 2 - 150, wy = cy - 15, wr = 26;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(car.steerAngle * 5);
    ctx.beginPath(); ctx.arc(0, 0, wr, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = '#4a5a7d'; ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-wr, 0); ctx.lineTo(wr, 0);
    ctx.moveTo(0, 0); ctx.lineTo(0, wr);
    ctx.stroke();
    ctx.restore();

    // barras de embrague y freno (manual)
    if (car.transmission === 'manual') {
      const bx = W / 2 - 42, by = cy + 38;
      ctx.font = '10px Segoe UI'; ctx.textAlign = 'left';
      ctx.fillStyle = '#8b9cba'; ctx.fillText('EMBRAGUE', bx, by + 4);
      ctx.fillStyle = '#1d2740'; ctx.fillRect(bx + 62, by - 4, 90, 8);
      ctx.fillStyle = '#4dabf7';
      ctx.fillRect(bx + 62, by - 4, 90 * (1 - car.clutchK), 8);
    }
    const brk = car.controls.brake;
    if (brk > 0) {
      ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 13px Segoe UI'; ctx.textAlign = 'center';
      ctx.fillText('● FRENO', W / 2, H - 10);
    }
  }
}

// avisos emergentes
export function toast(kind, text, ms = 4200) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const prefix = { leve: 'FALTA LEVE · ', deficiente: 'DEFICIENTE · ', eliminatoria: 'ELIMINATORIA · ', info: '' }[kind] ?? '';
  el.textContent = prefix + text;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s'; el.style.opacity = '0';
    setTimeout(() => el.remove(), 550);
  }, ms);
}
