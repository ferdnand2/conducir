// Control por gestos con MediaPipe Hands
//  - dos manos abiertas: girar el volante (ángulo entre las muñecas)
//  - acercar las manos a la cámara: acelerar (proporcional)
//  - dos puños: frenar (+ embrague en manual)
//  - puño izquierdo solo: embrague
//  - con embrague pisado, mano derecha arriba/abajo: subir/bajar marcha
//  - solo el índice extendido: intermitente de ese lado
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WRIST = 0, INDEX_MCP = 5;
const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]]; // [punta, articulación]

function extendedCount(lm) {
  const w = lm[WRIST];
  let n = 0;
  for (const [tip, pip] of FINGERS) {
    const dTip = Math.hypot(lm[tip].x - w.x, lm[tip].y - w.y);
    const dPip = Math.hypot(lm[pip].x - w.x, lm[pip].y - w.y);
    if (dTip > dPip * 1.15) n++;
  }
  return n;
}

function indexOnly(lm) {
  const w = lm[WRIST];
  const ext = FINGERS.map(([tip, pip]) => {
    const dTip = Math.hypot(lm[tip].x - w.x, lm[tip].y - w.y);
    const dPip = Math.hypot(lm[pip].x - w.x, lm[pip].y - w.y);
    return dTip > dPip * 1.15;
  });
  return ext[0] && !ext[1] && !ext[2] && !ext[3];
}

function handScale(lm) {
  return Math.hypot(lm[INDEX_MCP].x - lm[WRIST].x, lm[INDEX_MCP].y - lm[WRIST].y);
}

export class GestureController {
  constructor(video) {
    this.video = video;
    this.landmarker = null;
    this.state = 'loading'; // loading | camera | calibrating | ready
    this.calib = { scale: 0, y: 0.5, progress: 0, swap: false };
    this.smooth = { steer: 0, throttle: 0 };
    this.gearArmed = true;
    this.indCooldown = 0;
    this.lastHands = [];
    this.lastVideoTime = -1;
    this.onState = () => {};
  }

  get ready() { return this.state === 'ready'; }

  async init() {
    // BASE_URL = '/' en local y '/conducir/' en GitHub Pages
    const base = import.meta.env.BASE_URL;
    const vision = await FilesetResolver.forVisionTasks(base + 'mediapipe/wasm');
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: base + 'models/hand_landmarker.task', delegate: 'GPU' },
      numHands: 2,
      runningMode: 'VIDEO',
    });
    this.setState('camera');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });
    this.video.srcObject = stream;
    await new Promise((res) => { this.video.onloadedmetadata = res; });
    await this.video.play();
    this.setState('calibrating');
  }

  setState(s) { this.state = s; this.onState(s); }

  detect() {
    if (!this.landmarker || this.video.readyState < 2) return;
    if (this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;
    const res = this.landmarker.detectForVideo(this.video, performance.now());
    this.lastHands = [];
    if (!res.landmarks) return;
    const handedness = res.handedness ?? res.handednesses ?? [];
    for (let i = 0; i < res.landmarks.length; i++) {
      const lm = res.landmarks[i];
      let label = handedness?.[i]?.[0]?.categoryName ?? 'Right';
      if (this.calib.swap) label = label === 'Right' ? 'Left' : 'Right';
      this.lastHands.push({
        lm,
        label,
        wrist: { mx: 1 - lm[WRIST].x, y: lm[WRIST].y }, // mx = coordenada espejada
        ext: extendedCount(lm),
        pointing: indexOnly(lm),
        scale: handScale(lm),
      });
    }
    // si el modelo etiqueta las dos manos igual, desambigua por posición
    if (this.lastHands.length === 2 && this.lastHands[0].label === this.lastHands[1].label) {
      const [a, b] = this.lastHands;
      const [l, r] = a.wrist.mx <= b.wrist.mx ? [a, b] : [b, a];
      l.label = 'Left'; r.label = 'Right';
    }
  }

  // calibración: dos manos abiertas quietas durante 1,5 s
  pollCalibration(dt) {
    this.detect();
    const open = this.lastHands.filter((h) => h.ext >= 3);
    if (open.length === 2) {
      this.calib.progress = Math.min(1, this.calib.progress + dt / 1.5);
      if (this.calib.progress >= 1) {
        // mano con menor mx (más a la izquierda en el espejo) = mano izquierda
        const sorted = [...open].sort((a, b) => a.wrist.mx - b.wrist.mx);
        const reportedLeft = sorted[0].label;
        this.calib.swap = reportedLeft !== 'Left' ? !this.calib.swap : this.calib.swap;
        if (reportedLeft !== 'Left') {
          // re-etiqueta con el intercambio ya aplicado
          for (const h of this.lastHands) h.label = h.label === 'Right' ? 'Left' : 'Right';
        }
        this.calib.scale = (open[0].scale + open[1].scale) / 2;
        this.calib.y = sorted[1].wrist.y; // altura neutra de la mano derecha
        this.setState('ready');
      }
    } else {
      this.calib.progress = Math.max(0, this.calib.progress - dt / 0.6);
    }
    return this.calib.progress;
  }

  poll(dt) {
    this.detect();
    this.indCooldown = Math.max(0, this.indCooldown - dt);

    const left = this.lastHands.find((h) => h.label === 'Left');
    const right = this.lastHands.find((h) => h.label === 'Right');
    const out = {
      steer: this.smooth.steer, throttle: 0, brake: 0, clutch: false,
      shiftUp: false, shiftDown: false, indLeft: false, indRight: false,
      tracking: !!(left && right),
    };

    if (!left || !right) {
      // sin las dos manos: soltar gas y enderezar poco a poco
      this.smooth.steer *= Math.max(0, 1 - dt * 2.5);
      this.smooth.throttle = 0;
      out.steer = this.smooth.steer;
      return out;
    }

    const leftFist = left.ext === 0;
    const rightFist = right.ext === 0;

    // ---- volante: ángulo de la línea entre muñecas ----
    const dy = right.wrist.y - left.wrist.y;
    const dx = Math.max(0.05, right.wrist.mx - left.wrist.mx);
    const roll = Math.atan2(dy, dx);
    let steer = Math.max(-1, Math.min(1, roll / 0.75));
    if (Math.abs(steer) < 0.07) steer = 0;
    this.smooth.steer += (steer - this.smooth.steer) * Math.min(1, dt * 10);
    out.steer = this.smooth.steer;

    // ---- embrague y freno ----
    out.clutch = leftFist;                       // puño izquierdo = embrague
    if (leftFist && rightFist) out.brake = 1;    // dos puños = frenar

    // ---- acelerador: manos más cerca de la cámara que en la calibración ----
    if (!rightFist && !out.clutch) {
      const ratio = ((left.scale + right.scale) / 2) / this.calib.scale;
      const t = Math.max(0, Math.min(1, (ratio - 1.13) / 0.42));
      this.smooth.throttle += (t - this.smooth.throttle) * Math.min(1, dt * 6);
    } else {
      this.smooth.throttle = Math.max(0, this.smooth.throttle - dt * 4);
    }
    out.throttle = this.smooth.throttle;

    // ---- cambio de marcha: embrague pisado + mano derecha arriba/abajo ----
    if (out.clutch && !rightFist) {
      const dyGear = right.wrist.y - this.calib.y;
      if (this.gearArmed && dyGear < -0.13) { out.shiftUp = true; this.gearArmed = false; }
      else if (this.gearArmed && dyGear > 0.13) { out.shiftDown = true; this.gearArmed = false; }
      else if (Math.abs(dyGear) < 0.07) this.gearArmed = true;
    } else {
      this.gearArmed = true;
    }

    // ---- intermitentes: solo índice extendido ----
    if (this.indCooldown === 0) {
      if (left.pointing && !right.pointing) { out.indLeft = true; this.indCooldown = 1.2; }
      else if (right.pointing && !left.pointing) { out.indRight = true; this.indCooldown = 1.2; }
    }

    return out;
  }

  // dibuja la vista espejada de la cámara con los puntos de las manos
  drawPreview(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w, 0); ctx.scale(-1, 1);
    if (this.video.readyState >= 2) ctx.drawImage(this.video, 0, 0, w, h);
    ctx.restore();
    for (const hand of this.lastHands) {
      ctx.fillStyle = hand.label === 'Left' ? '#4dabf7' : '#ffd43b';
      for (const p of hand.lm) {
        ctx.beginPath();
        ctx.arc((1 - p.x) * w, p.y * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  dispose() {
    const stream = this.video.srcObject;
    if (stream) for (const t of stream.getTracks()) t.stop();
    this.video.srcObject = null;
  }
}
