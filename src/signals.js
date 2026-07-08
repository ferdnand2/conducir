// Señales de tráfico españolas dibujadas con canvas → texturas Three.js
import * as THREE from 'three';

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function circleSign(draw) {
  const [c, ctx] = makeCanvas();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.lineWidth = 24; ctx.strokeStyle = '#c1121f'; ctx.stroke();
  draw(ctx);
  return c;
}

// R-301: limitación de velocidad
export function drawLimit(value) {
  return circleSign((ctx) => {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 108px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 128, 136);
  });
}

// R-501: fin de limitación
export function drawEndLimit(value) {
  const [c, ctx] = makeCanvas();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.lineWidth = 10; ctx.strokeStyle = '#555'; ctx.stroke();
  ctx.fillStyle = '#777';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(value), 128, 136);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 14;
  for (const off of [-28, 0, 28]) {
    ctx.beginPath();
    ctx.moveTo(128 + off - 62, 210); ctx.lineTo(128 + off + 62, 46);
    ctx.stroke();
  }
  return c;
}

// R-2: STOP
export function drawStop() {
  const [c, ctx] = makeCanvas();
  const r = 124, cx = 128, cy = 128;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#c1121f'; ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 74px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('STOP', cx, cy + 4);
  return c;
}

// R-1: ceda el paso (triángulo invertido)
export function drawYield() {
  const [c, ctx] = makeCanvas();
  ctx.beginPath();
  ctx.moveTo(12, 30); ctx.lineTo(244, 30); ctx.lineTo(128, 230);
  ctx.closePath();
  ctx.fillStyle = '#c1121f'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(52, 55); ctx.lineTo(204, 55); ctx.lineTo(128, 186);
  ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  return c;
}

function warnTriangle(draw) {
  const [c, ctx] = makeCanvas();
  ctx.beginPath();
  ctx.moveTo(128, 18); ctx.lineTo(246, 226); ctx.lineTo(10, 226);
  ctx.closePath();
  ctx.fillStyle = '#c1121f'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(128, 56); ctx.lineTo(216, 208); ctx.lineTo(40, 208);
  ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  draw(ctx);
  return c;
}

// P-13a: curva peligrosa hacia la derecha
export function drawCurveRight() {
  return warnTriangle((ctx) => {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(112, 196);
    ctx.lineTo(112, 150);
    ctx.quadraticCurveTo(112, 118, 146, 118);
    ctx.stroke();
    // punta de flecha
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(150, 100); ctx.lineTo(172, 118); ctx.lineTo(150, 136);
    ctx.closePath(); ctx.fill();
  });
}

// P-13b: curva peligrosa hacia la izquierda
export function drawCurveLeft() {
  return warnTriangle((ctx) => {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(144, 196);
    ctx.lineTo(144, 150);
    ctx.quadraticCurveTo(144, 118, 110, 118);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(106, 100); ctx.lineTo(84, 118); ctx.lineTo(106, 136);
    ctx.closePath(); ctx.fill();
  });
}

// P-16a: bajada con fuerte pendiente
export function drawSlope() {
  return warnTriangle((ctx) => {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(52, 204); ctx.lineTo(204, 204); ctx.lineTo(204, 150);
    ctx.closePath(); ctx.fill();
    ctx.font = 'bold 38px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('10%', 118, 140);
  });
}

// R-402: intersección de sentido giratorio (rotonda)
export function drawRoundabout() {
  const [c, ctx] = makeCanvas();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#1d64c8'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 17; ctx.lineCap = 'butt';
  for (let i = 0; i < 3; i++) {
    const a0 = (i * 2 * Math.PI) / 3 + 0.45;
    ctx.beginPath();
    ctx.arc(128, 128, 58, a0, a0 + 1.35);
    ctx.stroke();
    // punta de flecha en el extremo inicial (sentido antihorario)
    const hx = 128 + 58 * Math.cos(a0), hy = 128 + 58 * Math.sin(a0);
    const tx = Math.sin(a0), ty = -Math.cos(a0); // tangente antihoraria
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(hx + tx * 26, hy + ty * 26);
    ctx.lineTo(hx - ty * 15 - tx * 4, hy + tx * 15 - ty * 4);
    ctx.lineTo(hx + ty * 15 - tx * 4, hy - tx * 15 - ty * 4);
    ctx.closePath(); ctx.fill();
  }
  return c;
}

// P-14a: curvas peligrosas, la primera hacia la derecha
export function drawCurves() {
  return warnTriangle((ctx) => {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(112, 200);
    ctx.quadraticCurveTo(150, 178, 128, 152);
    ctx.quadraticCurveTo(104, 126, 142, 104);
    ctx.stroke();
  });
}

// P-1: intersección con prioridad
export function drawCrossing() {
  return warnTriangle((ctx) => {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 14; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(128, 100); ctx.lineTo(128, 200);
    ctx.moveTo(90, 138); ctx.lineTo(166, 138);
    ctx.stroke();
  });
}

// P-20: peligro, paso de peatones
export function drawCrosswalkWarn() {
  return warnTriangle((ctx) => {
    ctx.fillStyle = '#111';
    // franjas de la cebra
    for (let i = 0; i < 4; i++) ctx.fillRect(74 + i * 30, 188, 18, 14);
    // peatón
    ctx.beginPath(); ctx.arc(134, 98, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(132, 110); ctx.lineTo(124, 152);   // tronco
    ctx.moveTo(124, 152); ctx.lineTo(104, 186);   // pierna atrás
    ctx.moveTo(124, 152); ctx.lineTo(142, 184);   // pierna delante
    ctx.moveTo(130, 120); ctx.lineTo(152, 142);   // brazo
    ctx.stroke();
  });
}

// P-24: paso de animales en libertad
export function drawAnimals() {
  return warnTriangle((ctx) => {
    ctx.fillStyle = '#111';
    ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
    // cuerpo
    ctx.beginPath(); ctx.ellipse(126, 152, 30, 13, -0.08, 0, Math.PI * 2); ctx.fill();
    // patas
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(104, 158); ctx.lineTo(96, 198);
    ctx.moveTo(116, 160); ctx.lineTo(114, 200);
    ctx.moveTo(140, 160); ctx.lineTo(146, 200);
    ctx.moveTo(150, 156); ctx.lineTo(160, 194);
    ctx.stroke();
    // cuello y cabeza
    ctx.beginPath(); ctx.moveTo(150, 146); ctx.lineTo(166, 116); ctx.lineWidth = 11; ctx.stroke();
    ctx.beginPath(); ctx.arc(170, 112, 8, 0, Math.PI * 2); ctx.fill();
    // cornamenta
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(168, 104); ctx.lineTo(158, 86); ctx.moveTo(162, 94) ; ctx.lineTo(152, 92);
    ctx.moveTo(172, 104); ctx.lineTo(182, 86); ctx.moveTo(178, 94); ctx.lineTo(188, 92);
    ctx.stroke();
  });
}

// R-305: adelantamiento prohibido
export function drawNoOvertake() {
  return circleSign((ctx) => {
    const carShape = (x, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x - 22, 100, 44, 62, 10);
      ctx.fill();
    };
    carShape(88, '#c1121f');
    carShape(166, '#111');
  });
}

// R-500: fin de prohibiciones
export function drawEndProhib() {
  const [c, ctx] = makeCanvas();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.lineWidth = 10; ctx.strokeStyle = '#555'; ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 12;
  for (const off of [-34, 0, 34]) {
    ctx.beginPath();
    ctx.moveTo(128 + off - 58, 206); ctx.lineTo(128 + off + 58, 50);
    ctx.stroke();
  }
  return c;
}

// R-308: estacionamiento prohibido
export function drawNoParking() {
  const [c, ctx] = makeCanvas();
  ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fillStyle = '#1d64c8'; ctx.fill();
  ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.lineWidth = 24; ctx.strokeStyle = '#c1121f'; ctx.stroke();
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(48, 208); ctx.lineTo(208, 48);
  ctx.stroke();
  return c;
}

// S-500 / S-510: entrada y salida de poblado
export function drawTown(name, end = false) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 14; ctx.strokeStyle = '#111';
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 92px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 134);
  if (end) {
    ctx.strokeStyle = '#c1121f'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(36, 226); ctx.lineTo(476, 30); ctx.stroke();
  }
  return c;
}

const DRAWERS = {
  limit90: () => drawLimit(90),
  limit50: () => drawLimit(50),
  limit30: () => drawLimit(30),
  end30: () => drawEndLimit(30),
  stop: drawStop,
  yield: drawYield,
  curveRight: drawCurveRight,
  curveLeft: drawCurveLeft,
  curves: drawCurves,
  slope: drawSlope,
  roundabout: drawRoundabout,
  crosswalk: drawCrosswalkWarn,
  animals: drawAnimals,
  noOvertake: drawNoOvertake,
  endProhib: drawEndProhib,
  noParking: drawNoParking,
  crossing: drawCrossing,
  town: () => drawTown('VILLAVÍA'),
  townEnd: () => drawTown('VILLAVÍA', true),
};

const texCache = {};

// Crea el poste + panel de una señal, lista para colocar en la escena
export function createSign(type) {
  if (!texCache[type]) {
    const canvas = DRAWERS[type]();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    texCache[type] = tex;
  }
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a929c })
  );
  pole.position.y = 1.2;
  group.add(pole);

  const wide = type === 'town' || type === 'townEnd';
  const w = wide ? 1.7 : 0.95;
  const h = wide ? 0.85 : 0.95;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texCache[type], transparent: true })
  );
  panel.position.y = wide ? 2.35 : 2.4;
  group.add(panel);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({ color: 0x9aa2ac })
  );
  back.position.y = panel.position.y;
  back.rotation.y = Math.PI;
  group.add(back);

  return group;
}
