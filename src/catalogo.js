// Catálogo completo de señales para la sección de estudio.
// Cada señal se dibuja con canvas: aproximaciones fieles a la señalización española.
import {
  drawStop, drawYield, drawLimit, drawEndLimit, drawRoundabout, drawCrossing,
  drawCurveRight, drawCurveLeft, drawCurves, drawSlope, drawTown,
  drawCrosswalkWarn, drawAnimals, drawNoOvertake, drawEndProhib, drawNoParking,
} from './signals.js';

const mk = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  return [c, c.getContext('2d')];
};

// ---------- plantillas base ----------
function tri(draw) {
  const [c, ctx] = mk();
  ctx.beginPath(); ctx.moveTo(128, 18); ctx.lineTo(246, 226); ctx.lineTo(10, 226); ctx.closePath();
  ctx.fillStyle = '#c1121f'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(128, 56); ctx.lineTo(216, 208); ctx.lineTo(40, 208); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
  draw(ctx);
  return c;
}

function redRing(draw) {
  const [c, ctx] = mk();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.lineWidth = 24; ctx.strokeStyle = '#c1121f'; ctx.stroke();
  ctx.fillStyle = '#111'; ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
  draw(ctx);
  return c;
}

function slash(ctx, color = '#c1121f', w = 18) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(52, 204); ctx.lineTo(204, 52); ctx.stroke();
}

function blueCircle(draw) {
  const [c, ctx] = mk();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#1d64c8'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  draw(ctx);
  return c;
}

function blueSquare(draw) {
  const [c, ctx] = mk();
  ctx.fillStyle = '#1d64c8';
  ctx.beginPath(); ctx.roundRect(8, 8, 240, 240, 18); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.roundRect(16, 16, 224, 224, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  draw(ctx);
  return c;
}

// ---------- glifos reutilizables ----------
function arrow(ctx, x0, y0, x1, y1, w = 14) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const hl = w * 2.1;
  ctx.lineWidth = w; ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(a) * hl * 0.7, y1 - Math.sin(a) * hl * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * hl, y1 - Math.sin(a - 0.45) * hl);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * hl, y1 - Math.sin(a + 0.45) * hl);
  ctx.closePath(); ctx.fill();
}

function carSide(ctx, cx, cy, s = 1, color = '#111') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(cx - 34 * s, cy - 10 * s, 68 * s, 18 * s, 6 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - 16 * s, cy - 22 * s, 34 * s, 15 * s, 5 * s); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 18 * s, cy + 9 * s, 8 * s, 0, Math.PI * 2);
  ctx.arc(cx + 20 * s, cy + 9 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
}

function truckSide(ctx, cx, cy, s = 1, color = '#111') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(cx - 38 * s, cy - 26 * s, 52 * s, 34 * s, 4 * s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 16 * s, cy - 16 * s, 22 * s, 24 * s, 4 * s); ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 22 * s, cy + 12 * s, 8 * s, 0, Math.PI * 2);
  ctx.arc(cx + 24 * s, cy + 12 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
}

function person(ctx, cx, cy, s = 1) {
  ctx.beginPath(); ctx.arc(cx + 4 * s, cy - 40 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 2 * s, cy - 30 * s); ctx.lineTo(cx - 4 * s, cy + 2 * s);
  ctx.moveTo(cx - 4 * s, cy + 2 * s); ctx.lineTo(cx - 18 * s, cy + 30 * s);
  ctx.moveTo(cx - 4 * s, cy + 2 * s); ctx.lineTo(cx + 10 * s, cy + 28 * s);
  ctx.moveTo(cx, cy - 22 * s); ctx.lineTo(cx + 18 * s, cy - 6 * s);
  ctx.stroke();
}

function bike(ctx, cx, cy, s = 1) {
  ctx.lineWidth = 6 * s;
  ctx.beginPath(); ctx.arc(cx - 26 * s, cy + 10 * s, 18 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 26 * s, cy + 10 * s, 18 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 26 * s, cy + 10 * s); ctx.lineTo(cx - 6 * s, cy - 14 * s);
  ctx.lineTo(cx + 14 * s, cy - 14 * s); ctx.lineTo(cx + 26 * s, cy + 10 * s);
  ctx.lineTo(cx - 2 * s, cy + 10 * s); ctx.lineTo(cx - 6 * s, cy - 14 * s);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 12 * s, cy - 14 * s); ctx.lineTo(cx + 6 * s, cy - 24 * s); ctx.stroke();
}

function moto(ctx, cx, cy, s = 1) {
  ctx.beginPath(); ctx.arc(cx - 30 * s, cy + 12 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 30 * s, cy + 12 * s, 15 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - 26 * s, cy - 10 * s, 52 * s, 14 * s, 6 * s); ctx.fill();
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 22 * s, cy - 8 * s); ctx.lineTo(cx + 34 * s, cy - 26 * s);
  ctx.lineTo(cx + 44 * s, cy - 24 * s);
  ctx.stroke();
}

// ---------- catálogo ----------
export const CATALOG = [
  // ===== PELIGRO =====
  { cat: 'peligro', code: 'P-1', name: 'Intersección con prioridad', draw: drawCrossing,
    desc: 'Próxima intersección donde tienes prioridad. Aun así, modera la velocidad y observa.' },
  { cat: 'peligro', code: 'P-1a', name: 'Intersección con prioridad sobre vía a la derecha', draw: () => tri((ctx) => {
      ctx.lineCap = 'butt';
      ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(128, 96); ctx.lineTo(128, 204); ctx.stroke();
      ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(128, 148); ctx.lineTo(176, 148); ctx.stroke();
    }),
    desc: 'Tienes prioridad sobre la vía que se incorpora por la derecha en la próxima intersección.' },
  { cat: 'peligro', code: 'P-3', name: 'Semáforos', draw: () => tri((ctx) => {
      for (const [y, col] of [[104, '#c1121f'], [140, '#e8a100'], [176, '#2f9e44']]) {
        ctx.beginPath(); ctx.arc(128, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();
      }
    }),
    desc: 'Proximidad de una intersección regulada por semáforos que pueden no verse con antelación suficiente.' },
  { cat: 'peligro', code: 'P-4', name: 'Intersección de sentido giratorio', draw: () => tri((ctx) => {
      ctx.lineWidth = 11;
      for (let i = 0; i < 3; i++) {
        const a0 = (i * 2 * Math.PI) / 3 + 0.5;
        ctx.beginPath(); ctx.arc(128, 148, 34, a0, a0 + 1.45); ctx.stroke();
      }
    }),
    desc: 'Próxima rotonda. Prepárate para ceder el paso a quien ya circule por ella.' },
  { cat: 'peligro', code: 'P-7', name: 'Paso a nivel con barreras', draw: () => tri((ctx) => {
      ctx.lineCap = 'butt'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(70, 150); ctx.lineTo(186, 150); ctx.stroke();
      for (let x = 84; x <= 172; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, 128); ctx.lineTo(x, 172); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(76, 150); ctx.lineTo(76, 204); ctx.moveTo(180, 150); ctx.lineTo(180, 204); ctx.stroke();
    }),
    desc: 'Paso a nivel de ferrocarril protegido con barreras o semibarreras.' },
  { cat: 'peligro', code: 'P-8', name: 'Paso a nivel sin barreras', draw: () => tri((ctx) => {
      ctx.beginPath(); ctx.roundRect(94, 124, 74, 42, 6); ctx.fill();
      ctx.fillRect(104, 104, 14, 22);
      ctx.beginPath();
      ctx.arc(112, 178, 11, 0, Math.PI * 2); ctx.arc(152, 178, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(168, 166); ctx.lineTo(186, 190); ctx.lineTo(160, 190); ctx.closePath(); ctx.fill();
    }),
    desc: 'Paso a nivel SIN barreras: extrema la precaución, detente si es preciso y comprueba que no viene ningún tren.' },
  { cat: 'peligro', code: 'P-13a', name: 'Curva peligrosa a la derecha', draw: drawCurveRight,
    desc: 'Reduce la velocidad ANTES de entrar; frenar en plena curva puede hacer perder el control.' },
  { cat: 'peligro', code: 'P-13b', name: 'Curva peligrosa a la izquierda', draw: drawCurveLeft,
    desc: 'Igual que la P-13a hacia la izquierda. No invadas el sentido contrario al trazarla.' },
  { cat: 'peligro', code: 'P-14a', name: 'Curvas peligrosas (1ª a la derecha)', draw: drawCurves,
    desc: 'Sucesión de curvas próximas entre sí; mantén velocidad moderada y constante en todo el tramo.' },
  { cat: 'peligro', code: 'P-14b', name: 'Curvas peligrosas (1ª a la izquierda)', draw: () => tri((ctx) => {
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(144, 200);
      ctx.quadraticCurveTo(106, 178, 128, 152);
      ctx.quadraticCurveTo(152, 126, 114, 104);
      ctx.stroke();
    }),
    desc: 'Como la P-14a, pero la primera curva es hacia la izquierda.' },
  { cat: 'peligro', code: 'P-15', name: 'Resalto', draw: () => tri((ctx) => {
      ctx.lineCap = 'butt'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(64, 186); ctx.lineTo(192, 186); ctx.stroke();
      ctx.beginPath(); ctx.arc(128, 186, 26, Math.PI, 0); ctx.closePath(); ctx.fill();
    }),
    desc: 'Badén elevado o paso de peatones sobreelevado. Reduce la velocidad para no dañar el vehículo.' },
  { cat: 'peligro', code: 'P-15a', name: 'Badén', draw: () => tri((ctx) => {
      ctx.lineCap = 'butt'; ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(60, 172); ctx.lineTo(102, 172);
      ctx.quadraticCurveTo(128, 196, 154, 172);
      ctx.lineTo(196, 172);
      ctx.stroke();
    }),
    desc: 'Depresión en la calzada. Modera: puede acumular agua o hacer rozar los bajos.' },
  { cat: 'peligro', code: 'P-16a', name: 'Bajada con fuerte pendiente', draw: drawSlope,
    desc: 'Desciende con marcha corta y usa el freno motor para no sobrecalentar los frenos.' },
  { cat: 'peligro', code: 'P-16b', name: 'Subida con fuerte pendiente', draw: () => tri((ctx) => {
      ctx.beginPath();
      ctx.moveTo(204, 204); ctx.lineTo(52, 204); ctx.lineTo(52, 150);
      ctx.closePath(); ctx.fill();
      ctx.font = 'bold 38px Arial'; ctx.textAlign = 'center';
      ctx.fillText('10%', 148, 140);
    }),
    desc: 'Rampa pronunciada: usa marchas cortas; atención a vehículos lentos y al retroceso al arrancar en cuesta.' },
  { cat: 'peligro', code: 'P-17', name: 'Estrechamiento de calzada', draw: () => tri((ctx) => {
      ctx.lineCap = 'butt'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(96, 204); ctx.quadraticCurveTo(102, 150, 116, 118); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(160, 204); ctx.quadraticCurveTo(154, 150, 140, 118); ctx.stroke();
    }),
    desc: 'La calzada se estrecha: puede exigir ceder el paso al sentido contrario si no cabéis los dos.' },
  { cat: 'peligro', code: 'P-18', name: 'Obras', draw: () => tri((ctx) => {
      ctx.beginPath(); ctx.arc(146, 108, 10, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(144, 118); ctx.lineTo(136, 158);
      ctx.moveTo(136, 158); ctx.lineTo(122, 198);
      ctx.moveTo(136, 158); ctx.lineTo(150, 196);
      ctx.moveTo(142, 128); ctx.lineTo(112, 162);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(112, 162); ctx.lineTo(96, 192); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(88, 198, 16, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    }),
    desc: 'Tramo en obras (esta señal suele ir sobre fondo amarillo). Modera y obedece la señalización provisional.' },
  { cat: 'peligro', code: 'P-19', name: 'Pavimento deslizante', draw: () => tri((ctx) => {
      carSide(ctx, 128, 128, 0.9);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(96, 168); ctx.quadraticCurveTo(112, 158, 104, 186); ctx.quadraticCurveTo(98, 200, 116, 196);
      ctx.moveTo(146, 168); ctx.quadraticCurveTo(162, 158, 154, 186); ctx.quadraticCurveTo(148, 200, 166, 196);
      ctx.stroke();
    }),
    desc: 'Riesgo de deslizamiento por lluvia, gravilla, hielo… Suaviza dirección, freno y acelerador.' },
  { cat: 'peligro', code: 'P-20', name: 'Peatones', draw: drawCrosswalkWarn,
    desc: 'Proximidad de un paso de peatones. El peatón que ya cruza tiene SIEMPRE prioridad.' },
  { cat: 'peligro', code: 'P-21', name: 'Niños', draw: () => tri((ctx) => {
      person(ctx, 106, 158, 1.0);
      person(ctx, 152, 164, 0.78);
    }),
    desc: 'Zona frecuentada por niños (colegio, parque). Extrema la precaución: pueden irrumpir en la calzada.' },
  { cat: 'peligro', code: 'P-22', name: 'Ciclistas', draw: () => tri((ctx) => bike(ctx, 128, 156, 1.1)),
    desc: 'Proximidad de un paso o zona frecuentada por ciclistas. Deja al menos 1,5 m al adelantarlos.' },
  { cat: 'peligro', code: 'P-23', name: 'Paso de animales domésticos', draw: () => tri((ctx) => {
      ctx.beginPath(); ctx.roundRect(84, 134, 78, 34, 12); ctx.fill();
      ctx.lineWidth = 8; ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(96, 166); ctx.lineTo(94, 200);
      ctx.moveTo(114, 168); ctx.lineTo(114, 200);
      ctx.moveTo(140, 168); ctx.lineTo(140, 200);
      ctx.moveTo(154, 166); ctx.lineTo(158, 200);
      ctx.stroke();
      ctx.beginPath(); ctx.roundRect(154, 116, 26, 24, 6); ctx.fill();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(160, 116); ctx.lineTo(154, 104); ctx.moveTo(172, 116); ctx.lineTo(178, 104); ctx.stroke();
    }),
    desc: 'Posible presencia de ganado (vacas, ovejas…) cruzando la vía.' },
  { cat: 'peligro', code: 'P-24', name: 'Paso de animales en libertad', draw: drawAnimals,
    desc: 'Animales salvajes sueltos (ciervos, jabalíes). Máximo riesgo al amanecer y al anochecer.' },
  { cat: 'peligro', code: 'P-25', name: 'Circulación en los dos sentidos', draw: () => tri((ctx) => {
      arrow(ctx, 110, 196, 110, 104, 12);
      arrow(ctx, 146, 104, 146, 196, 12);
    }),
    desc: 'Tras un tramo de sentido único, la calzada pasa a doble sentido: no invadas el carril contrario.' },
  { cat: 'peligro', code: 'P-26', name: 'Desprendimientos', draw: () => tri((ctx) => {
      ctx.beginPath(); ctx.moveTo(170, 96); ctx.lineTo(170, 204); ctx.lineTo(196, 204); ctx.closePath(); ctx.fill();
      for (const [x, y, r] of [[132, 130, 8], [116, 158, 10], [138, 172, 7], [102, 190, 9]]) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }),
    desc: 'Riesgo de rocas caídas en la calzada, sobre todo con lluvia. Atención a obstáculos tras las curvas.' },
  { cat: 'peligro', code: 'P-28', name: 'Proyección de gravilla', draw: () => tri((ctx) => {
      carSide(ctx, 140, 132, 0.85);
      for (const [x, y] of [[86, 160], [74, 178], [92, 186], [80, 200], [102, 172]]) {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }),
    desc: 'Gravilla suelta que otros vehículos pueden proyectar: aumenta la distancia y no adelantes rápido.' },
  { cat: 'peligro', code: 'P-29', name: 'Viento transversal', draw: () => tri((ctx) => {
      ctx.lineWidth = 7; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(96, 108); ctx.lineTo(96, 204); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(96, 112); ctx.lineTo(178, 122); ctx.lineTo(170, 148); ctx.lineTo(96, 134);
      ctx.closePath(); ctx.fill();
    }),
    desc: 'Rachas laterales fuertes (puentes, valles): sujeta el volante con firmeza y modera la velocidad.' },
  { cat: 'peligro', code: 'P-33', name: 'Visibilidad reducida', draw: () => tri((ctx) => {
      carSide(ctx, 110, 150, 0.85);
      ctx.lineWidth = 8; ctx.lineCap = 'butt';
      for (const x of [158, 174, 190]) {
        ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x, 196); ctx.stroke();
      }
    }),
    desc: 'Niebla, lluvia intensa, humo… Enciende el alumbrado, aumenta la distancia y reduce la velocidad.' },
  { cat: 'peligro', code: 'P-34', name: 'Pavimento deslizante por hielo o nieve', draw: () => tri((ctx) => {
      ctx.lineWidth = 7;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(128 - Math.cos(a) * 48, 150 - Math.sin(a) * 48);
        ctx.lineTo(128 + Math.cos(a) * 48, 150 + Math.sin(a) * 48);
        ctx.stroke();
      }
    }),
    desc: 'Riesgo de hielo o nieve (umbrías, puentes). Suaviza todos los mandos; si el coche patina, no frenes bruscamente.' },

  // ===== PRIORIDAD =====
  { cat: 'prioridad', code: 'R-1', name: 'Ceda el paso', draw: drawYield,
    desc: 'Cede el paso a la vía a la que te aproximas. No obliga a detenerse si no viene nadie, pero sí a poder hacerlo.' },
  { cat: 'prioridad', code: 'R-2', name: 'Detención obligatoria (STOP)', draw: drawStop,
    desc: 'Detención COMPLETA ante la línea, aunque no venga nadie. No detenerse es eliminatoria en el examen.' },
  { cat: 'prioridad', code: 'R-3', name: 'Calzada con prioridad', draw: () => {
      const [c, ctx] = mk();
      ctx.save(); ctx.translate(128, 128); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9aa2ac'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(-82, -82, 164, 164, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6b40e';
      ctx.beginPath(); ctx.roundRect(-46, -46, 92, 92, 8); ctx.fill();
      ctx.restore();
      return c;
    },
    desc: 'Circulas por una vía con prioridad de paso en las próximas intersecciones.' },
  { cat: 'prioridad', code: 'R-4', name: 'Fin de prioridad', draw: () => {
      const [c, ctx] = mk();
      ctx.save(); ctx.translate(128, 128); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9aa2ac'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(-82, -82, 164, 164, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6b40e';
      ctx.beginPath(); ctx.roundRect(-46, -46, 92, 92, 8); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(66, 190); ctx.lineTo(190, 66); ctx.stroke();
      return c;
    },
    desc: 'Tu vía deja de tener prioridad: en adelante rigen las normas generales (prioridad a la derecha).' },
  { cat: 'prioridad', code: 'R-5', name: 'Prioridad al sentido contrario', draw: () => redRing((ctx) => {
      ctx.fillStyle = '#111';
      arrow(ctx, 100, 90, 100, 172, 13);
      ctx.fillStyle = '#c1121f'; ctx.strokeStyle = '#c1121f';
      arrow(ctx, 156, 172, 156, 90, 13);
      ctx.strokeStyle = '#111';
    }),
    desc: 'En el estrechamiento, el sentido contrario tiene prioridad: detente si viene alguien de frente.' },
  { cat: 'prioridad', code: 'R-6', name: 'Prioridad sobre el sentido contrario', draw: () => blueSquare((ctx) => {
      arrow(ctx, 156, 196, 156, 62, 15);
      ctx.fillStyle = '#c1121f'; ctx.strokeStyle = '#c1121f';
      arrow(ctx, 100, 62, 100, 196, 12);
    }),
    desc: 'Tienes prioridad en el estrechamiento: el sentido contrario debe esperar.' },

  // ===== PROHIBICIÓN =====
  { cat: 'prohibicion', code: 'R-100', name: 'Circulación prohibida', draw: () => redRing(() => {}),
    desc: 'Prohibida la circulación de toda clase de vehículos en ambos sentidos.' },
  { cat: 'prohibicion', code: 'R-101', name: 'Entrada prohibida', draw: () => {
      const [c, ctx] = mk();
      ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
      ctx.fillStyle = '#c1121f'; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(48, 111, 160, 34, 8); ctx.fill();
      return c;
    },
    desc: 'Sentido prohibido: no puedes entrar por esta vía. Es el clásico "dirección prohibida".' },
  { cat: 'prohibicion', code: 'R-102', name: 'Entrada prohibida a vehículos de motor', draw: () => redRing((ctx) => {
      carSide(ctx, 118, 108, 0.85);
      moto(ctx, 136, 168, 0.72);
    }),
    desc: 'Prohibida la entrada a todo vehículo de motor (coches, motos, camiones).' },
  { cat: 'prohibicion', code: 'R-104', name: 'Entrada prohibida a motocicletas', draw: () => redRing((ctx) => moto(ctx, 126, 130, 1.1)),
    desc: 'Prohibida la entrada a motocicletas.' },
  { cat: 'prohibicion', code: 'R-114', name: 'Entrada prohibida a ciclos', draw: () => redRing((ctx) => bike(ctx, 128, 130, 1.15)),
    desc: 'Prohibida la entrada a bicicletas y demás ciclos.' },
  { cat: 'prohibicion', code: 'R-116', name: 'Entrada prohibida a peatones', draw: () => redRing((ctx) => person(ctx, 124, 132, 1.4)),
    desc: 'Prohibido el paso de peatones (típica en autopistas, túneles y accesos restringidos).' },
  { cat: 'prohibicion', code: 'R-201', name: 'Limitación de masa', draw: () => redRing((ctx) => {
      ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('5,5 t', 128, 130);
    }),
    desc: 'Prohibido el paso a vehículos cuya masa total supere la indicada en toneladas.' },
  { cat: 'prohibicion', code: 'R-204', name: 'Limitación de anchura', draw: () => redRing((ctx) => {
      ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('2 m', 128, 130);
      ctx.beginPath(); ctx.moveTo(46, 128); ctx.lineTo(70, 112); ctx.lineTo(70, 144); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(210, 128); ctx.lineTo(186, 112); ctx.lineTo(186, 144); ctx.closePath(); ctx.fill();
    }),
    desc: 'Prohibido el paso si el vehículo (con carga) supera la anchura indicada.' },
  { cat: 'prohibicion', code: 'R-205', name: 'Limitación de altura', draw: () => redRing((ctx) => {
      ctx.font = 'bold 52px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('3,5 m', 128, 130);
      ctx.beginPath(); ctx.moveTo(128, 46); ctx.lineTo(112, 70); ctx.lineTo(144, 70); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(128, 210); ctx.lineTo(112, 186); ctx.lineTo(144, 186); ctx.closePath(); ctx.fill();
    }),
    desc: 'Prohibido el paso si el vehículo (con carga) supera la altura indicada — típica en túneles y puentes.' },
  { cat: 'prohibicion', code: 'R-301', name: 'Velocidad máxima', draw: () => drawLimit(60),
    desc: 'Prohibido superar la velocidad indicada. Rige hasta el fin de limitación, otra señal o una intersección.' },
  { cat: 'prohibicion', code: 'R-302', name: 'Giro a la derecha prohibido', draw: () => redRing((ctx) => {
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(112, 180); ctx.lineTo(112, 130);
      ctx.quadraticCurveTo(112, 104, 138, 104); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(140, 86); ctx.lineTo(168, 104); ctx.lineTo(140, 122); ctx.closePath(); ctx.fill();
      slash(ctx);
    }),
    desc: 'Prohibido girar a la derecha en la próxima intersección.' },
  { cat: 'prohibicion', code: 'R-303', name: 'Giro a la izquierda prohibido', draw: () => redRing((ctx) => {
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(144, 180); ctx.lineTo(144, 130);
      ctx.quadraticCurveTo(144, 104, 118, 104); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(116, 86); ctx.lineTo(88, 104); ctx.lineTo(116, 122); ctx.closePath(); ctx.fill();
      slash(ctx);
    }),
    desc: 'Prohibido girar a la izquierda (también prohíbe el cambio de sentido).' },
  { cat: 'prohibicion', code: 'R-304', name: 'Media vuelta prohibida', draw: () => redRing((ctx) => {
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(150, 180); ctx.lineTo(150, 120);
      ctx.arc(128, 120, 22, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(106, 148); ctx.lineTo(88, 120); ctx.lineTo(124, 120); ctx.closePath(); ctx.fill();
      slash(ctx);
    }),
    desc: 'Prohibido el cambio de sentido (media vuelta) hasta la próxima intersección.' },
  { cat: 'prohibicion', code: 'R-305', name: 'Adelantamiento prohibido', draw: drawNoOvertake,
    desc: 'Prohibido adelantar vehículos de motor (salvo ciclos y ciclomotores si no invades el otro sentido).' },
  { cat: 'prohibicion', code: 'R-306', name: 'Adelantamiento prohibido para camiones', draw: () => redRing((ctx) => {
      truckSide(ctx, 88, 130, 0.85, '#c1121f');
      carSide(ctx, 172, 132, 0.8, '#111');
    }),
    desc: 'Los camiones de más de 3.500 kg no pueden adelantar.' },
  { cat: 'prohibicion', code: 'R-307', name: 'Parada y estacionamiento prohibidos', draw: () => {
      const [c, ctx] = mk();
      ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
      ctx.fillStyle = '#1d64c8'; ctx.fill();
      ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2);
      ctx.lineWidth = 24; ctx.strokeStyle = '#c1121f'; ctx.stroke();
      ctx.lineWidth = 18; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(52, 204); ctx.lineTo(204, 52); ctx.moveTo(52, 52); ctx.lineTo(204, 204); ctx.stroke();
      return c;
    },
    desc: 'Prohibido incluso PARAR (detención menor de 2 min). Más restrictiva que la R-308.' },
  { cat: 'prohibicion', code: 'R-308', name: 'Estacionamiento prohibido', draw: drawNoParking,
    desc: 'Prohibido estacionar; la parada breve sí se permite. Rige hasta la próxima intersección.' },

  // ===== OBLIGACIÓN =====
  { cat: 'obligacion', code: 'R-400a', name: 'Sentido obligatorio (recto)', draw: () => blueCircle((ctx) => arrow(ctx, 128, 196, 128, 58, 16)),
    desc: 'Obligatorio seguir recto: es el único movimiento permitido.' },
  { cat: 'obligacion', code: 'R-400c', name: 'Sentido obligatorio (derecha)', draw: () => blueCircle((ctx) => {
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(100, 196); ctx.lineTo(100, 130);
      ctx.quadraticCurveTo(100, 100, 130, 100); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(134, 76); ctx.lineTo(180, 100); ctx.lineTo(134, 124); ctx.closePath(); ctx.fill();
    }),
    desc: 'Obligatorio girar a la derecha.' },
  { cat: 'obligacion', code: 'R-401a', name: 'Paso obligatorio (por la derecha)', draw: () => blueCircle((ctx) => arrow(ctx, 96, 80, 170, 186, 15)),
    desc: 'Rodea el obstáculo o isleta por el lado que indica la flecha.' },
  { cat: 'obligacion', code: 'R-402', name: 'Intersección de sentido giratorio', draw: drawRoundabout,
    desc: 'Circula en el sentido de las flechas (antihorario). Quien está dentro de la rotonda tiene prioridad.' },
  { cat: 'obligacion', code: 'R-407a', name: 'Vía reservada para ciclos', draw: () => blueCircle((ctx) => bike(ctx, 128, 132, 1.1)),
    desc: 'Carril o vía de uso obligatorio y exclusivo para bicicletas.' },
  { cat: 'obligacion', code: 'R-410', name: 'Camino reservado para peatones', draw: () => blueCircle((ctx) => person(ctx, 124, 132, 1.4)),
    desc: 'Vía de uso exclusivo para peatones: los vehículos no pueden circular por ella.' },
  { cat: 'obligacion', code: 'R-411', name: 'Velocidad mínima', draw: () => blueCircle((ctx) => {
      ctx.font = 'bold 100px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('30', 128, 134);
    }),
    desc: 'Obligatorio circular al menos a la velocidad indicada (si las condiciones lo permiten).' },
  { cat: 'obligacion', code: 'R-413', name: 'Alumbrado de corto alcance', draw: () => blueCircle((ctx) => {
      ctx.beginPath();
      ctx.moveTo(80, 106); ctx.quadraticCurveTo(120, 92, 122, 128); ctx.quadraticCurveTo(120, 164, 80, 150);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = 9; ctx.lineCap = 'round';
      for (const dy of [-18, 0, 18]) {
        ctx.beginPath(); ctx.moveTo(136, 128 + dy); ctx.lineTo(184, 122 + dy * 1.4); ctx.stroke();
      }
    }),
    desc: 'Obligatorio llevar encendida la luz de cruce (por ejemplo, en ciertos túneles).' },

  // ===== FIN DE PROHIBICIÓN =====
  { cat: 'fin', code: 'R-500', name: 'Fin de prohibiciones', draw: drawEndProhib,
    desc: 'Terminan a la vez todas las prohibiciones anteriores para vehículos en marcha.' },
  { cat: 'fin', code: 'R-501', name: 'Fin de limitación de velocidad', draw: () => drawEndLimit(60),
    desc: 'Fin del límite específico: vuelve el límite genérico de la vía.' },
  { cat: 'fin', code: 'R-502', name: 'Fin de adelantamiento prohibido', draw: () => {
      const [c, ctx] = mk();
      ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2);
      ctx.lineWidth = 10; ctx.strokeStyle = '#555'; ctx.stroke();
      const carShape = (x, color) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(x - 22, 100, 44, 62, 10); ctx.fill();
      };
      carShape(88, '#8a8a8a'); carShape(166, '#5a5a5a');
      ctx.strokeStyle = '#333'; ctx.lineWidth = 10;
      for (const off of [-30, 30]) {
        ctx.beginPath(); ctx.moveTo(128 + off - 55, 200); ctx.lineTo(128 + off + 55, 56); ctx.stroke();
      }
      return c;
    },
    desc: 'Fin de la prohibición de adelantar impuesta por una R-305 anterior.' },
  { cat: 'fin', code: 'R-505', name: 'Fin de velocidad mínima', draw: () => {
      const [c, ctx] = mk();
      ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
      ctx.fillStyle = '#1d64c8'; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 100px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('30', 128, 134);
      slash(ctx, '#c1121f', 20);
      return c;
    },
    desc: 'Deja de ser obligatoria la velocidad mínima indicada.' },

  // ===== INDICACIÓN =====
  { cat: 'indicacion', code: 'S-1', name: 'Autopista', draw: () => blueSquare((ctx) => {
      ctx.lineWidth = 13; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(103, 210); ctx.quadraticCurveTo(110, 150, 110, 96); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(153, 210); ctx.quadraticCurveTo(146, 150, 146, 96); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(58, 66, 140, 18, 6); ctx.fill();
      ctx.fillRect(70, 84, 10, 22); ctx.fillRect(176, 84, 10, 22);
    }),
    desc: 'Comienzo de autopista: rigen sus normas (mínimo 60 km/h, máximo 120, prohibido peatones y ciclos).' },
  { cat: 'indicacion', code: 'S-2', name: 'Fin de autopista', draw: () => blueSquare((ctx) => {
      ctx.lineWidth = 13; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(103, 210); ctx.quadraticCurveTo(110, 150, 110, 96); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(153, 210); ctx.quadraticCurveTo(146, 150, 146, 96); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(58, 66, 140, 18, 6); ctx.fill();
      ctx.fillRect(70, 84, 10, 22); ctx.fillRect(176, 84, 10, 22);
      slash(ctx, '#c1121f', 18);
    }),
    desc: 'Fin de la autopista y de sus normas específicas.' },
  { cat: 'indicacion', code: 'S-13', name: 'Situación de paso de peatones', draw: () => blueSquare((ctx) => {
      ctx.beginPath(); ctx.moveTo(128, 52); ctx.lineTo(214, 200); ctx.lineTo(42, 200); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111';
      person(ctx, 124, 156, 0.95);
      for (let i = 0; i < 3; i++) ctx.fillRect(86 + i * 34, 186, 22, 10);
    }),
    desc: 'Indica el lugar EXACTO del paso de peatones (a diferencia de la P-20, que solo avisa de su proximidad).' },
  { cat: 'indicacion', code: 'S-17', name: 'Estacionamiento', draw: () => blueSquare((ctx) => {
      ctx.font = 'bold 150px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('P', 128, 136);
    }),
    desc: 'Zona habilitada para estacionar. Puede llevar paneles con limitaciones de tiempo o tipo de vehículo.' },
  { cat: 'indicacion', code: 'S-19', name: 'Parada de autobuses', draw: () => blueSquare((ctx) => {
      ctx.font = 'bold 72px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BUS', 128, 100);
      ctx.beginPath(); ctx.roundRect(70, 140, 116, 44, 8); ctx.fill();
      ctx.fillStyle = '#1d64c8';
      ctx.fillRect(80, 148, 22, 16); ctx.fillRect(110, 148, 22, 16); ctx.fillRect(140, 148, 22, 16);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(92, 188, 10, 0, Math.PI * 2); ctx.arc(164, 188, 10, 0, Math.PI * 2); ctx.fill();
    }),
    desc: 'Parada de transporte público: prohibido estacionar; no la ocupes ni un momento en el examen.' },
  { cat: 'indicacion', code: 'S-28', name: 'Calle residencial', draw: () => blueSquare((ctx) => {
      ctx.beginPath();
      ctx.moveTo(70, 108); ctx.lineTo(128, 62); ctx.lineTo(186, 108); ctx.lineTo(170, 108);
      ctx.lineTo(170, 150) ; ctx.lineTo(86, 150); ctx.lineTo(86, 108);
      ctx.closePath(); ctx.fill();
      person(ctx, 100, 190, 0.75);
      ctx.beginPath(); ctx.arc(150, 200, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(150, 168, 52, 20, 5); ctx.fill();
    }),
    desc: 'Zona de prioridad peatonal: velocidad máxima 20 km/h, los peatones pueden usar toda la calzada y los niños jugar en ella.' },
  { cat: 'indicacion', code: 'S-30', name: 'Zona a 30', draw: () => {
      const [c, ctx] = mk();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(8, 8, 240, 240, 14); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(12, 12, 232, 232, 10); ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center';
      ctx.fillText('ZONA', 128, 74);
      ctx.beginPath(); ctx.arc(128, 156, 66, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 14; ctx.strokeStyle = '#c1121f'; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = 'bold 62px Arial'; ctx.textBaseline = 'middle';
      ctx.fillText('30', 128, 160);
      return c;
    },
    desc: 'Zona urbana con límite de 30 km/h en todas sus calles hasta la señal de fin de zona.' },
  { cat: 'indicacion', code: 'S-500', name: 'Entrada a poblado', draw: () => drawTown('VILLAVÍA'),
    desc: 'Comienza el poblado: rige el límite urbano genérico (50 km/h salvo señal distinta).' },
  { cat: 'indicacion', code: 'S-510', name: 'Salida de poblado', draw: () => drawTown('VILLAVÍA', true),
    desc: 'Fin del poblado: vuelven a regir los límites de la vía interurbana.' },
];

export const CATEGORIES = [
  { id: 'peligro', label: '⚠️ Advertencia de peligro (P)', note: 'Triángulos con borde rojo: avisan de un peligro próximo. Se colocan entre 150 y 250 m antes en vías interurbanas.' },
  { id: 'prioridad', label: '🔻 Prioridad (R-1 a R-6)', note: 'Regulan quién pasa primero en intersecciones y estrechamientos.' },
  { id: 'prohibicion', label: '⛔ Prohibición y restricción (R-100 a R-308)', note: 'Círculos con borde rojo: prohíben entradas, maniobras o características del vehículo.' },
  { id: 'obligacion', label: '🔵 Obligación (R-400)', note: 'Círculos azules: imponen un comportamiento obligatorio.' },
  { id: 'fin', label: '⚪ Fin de prohibición (R-500)', note: 'Círculos blancos con franjas: levantan prohibiciones anteriores.' },
  { id: 'indicacion', label: 'ℹ️ Indicación (S)', note: 'Paneles azules o blancos: informan de regímenes especiales, servicios y situaciones.' },
];
