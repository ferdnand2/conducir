// Vida urbana: tráfico que circula por la cuadrícula (respetando semáforos y
// stops) y peatones que cruzan por los pasos de cebra.
import * as THREE from 'three';
import { makeCarMesh } from './traffic.js';
import { makePersonMesh } from './peatones.js';

// direcciones: 0=+X(este) 1=+Z(norte) 2=-X(oeste) 3=-Z(sur). +1 = giro a la izquierda (CCW)
const DIR = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 0, z: -1 }];
const CAR_COLORS = [0x2f6df6, 0xe8e8e8, 0x2b2b2b, 0xc0392b, 0x8395a7, 0xf1c40f, 0x27ae60];

export class CityTraffic {
  constructor(city, group, n = 9) {
    this.city = city;
    this.B = city.B; this.RH = city.roadHalf; this.LANE = city.lane;
    this.cars = [];
    for (let k = 0; k < n; k++) {
      const mesh = makeCarMesh(CAR_COLORS[k % CAR_COLORS.length]);
      group.add(mesh);
      this.cars.push({ mesh, dir: 0, line: 0, t: 0, speed: 0, wait: 0, heading: 0, spawn0: null });
    }
    this.reset();
  }

  axisOf(dir) { return dir % 2 === 0 ? 'h' : 'v'; }   // horizontal / vertical
  signOf(dir) { return (dir === 0 || dir === 1) ? 1 : -1; }

  // coordenada perpendicular (centro del carril derecho) para una calle/dirección
  perp(dir, line) {
    const B = this.B, L = this.LANE;
    if (dir === 0) return line * B + L;   // +X → carril +Z
    if (dir === 2) return line * B - L;   // -X → carril -Z
    if (dir === 1) return line * B - L;   // +Z → carril -X
    return line * B + L;                  // -Z → carril +X
  }

  worldPos(c) {
    const p = this.perp(c.dir, c.line);
    return this.axisOf(c.dir) === 'h' ? { x: c.t, z: p } : { x: p, z: c.t };
  }

  respawnCar(c) {
    const { NX, NZ } = this.city;
    c.dir = Math.floor(Math.random() * 4);
    if (this.axisOf(c.dir) === 'v') {
      c.line = 1 + Math.floor(Math.random() * (NX - 2));
      c.t = (0.3 + Math.random() * (NZ - 1.6)) * this.B;
    } else {
      c.line = 1 + Math.floor(Math.random() * (NZ - 2));
      c.t = (0.3 + Math.random() * (NX - 1.6)) * this.B;
    }
    c.speed = 6; c.wait = 0; c.stuck = 0;
    c.heading = Math.atan2(DIR[c.dir].x, DIR[c.dir].z);
    const w = this.worldPos(c);
    c.mesh.position.set(w.x, 0, w.z);
    c.mesh.rotation.y = c.heading;
  }

  reset() {
    for (const c of this.cars) this.respawnCar(c);
  }

  // índice de la última intersección en cada eje
  lastIndex(axis) { return (axis === 'v' ? this.city.NZ : this.city.NX) - 1; }

  // elige nueva dirección en el nodo (i,j), sin dar media vuelta ni salir de la malla
  chooseDir(c, i, j) {
    const cands = [];
    const restrict = this.city.nodeAt(i, j)?.restrict;
    for (const turn of [0, 1, 3]) { // recto; en este mundo +1 = derecha, +3 = izquierda
      if (restrict === 'noRight' && turn === 1) continue;
      if (restrict === 'noLeft' && turn === 3) continue;
      const nd = (c.dir + turn) % 4;
      // ¿a qué calle pasa y hasta dónde puede avanzar?
      const naxis = this.axisOf(nd);
      const nline = naxis === 'v' ? i : j;
      // el nodo de destino inmediato en esa dirección debe existir dentro de la malla
      const nodeIdx = naxis === 'v' ? j : i; // posición actual en el nuevo eje
      const next = nodeIdx + this.signOf(nd);
      if (next < 0 || next > this.lastIndex(naxis)) continue;
      if (nline < 1 && naxis === 'v') { /* permite líneas de borde */ }
      cands.push({ nd, weight: turn === 0 ? 3 : 1 });
    }
    if (cands.length === 0) return (c.dir + 2) % 4; // sin salida: media vuelta
    let total = cands.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const x of cands) { if ((r -= x.weight) <= 0) return x.nd; }
    return cands[0].nd;
  }

  update(dt, player) {
    const B = this.B, RH = this.RH, sgnCity = this.city;
    for (const c of this.cars) {
      const axis = this.axisOf(c.dir);
      const sign = this.signOf(c.dir);
      // nodo inmediatamente por delante
      const nAt = sign > 0 ? Math.ceil((c.t + 0.05) / B) : Math.floor((c.t - 0.05) / B);
      const nodeT = nAt * B;
      const dNode = (nodeT - c.t) * sign; // distancia (>0) al centro del cruce
      const i = axis === 'v' ? c.line : nAt;
      const j = axis === 'v' ? nAt : c.line;
      const inGrid = i >= 0 && i < sgnCity.NX && j >= 0 && j < sgnCity.NZ;
      const node = inGrid ? sgnCity.nodeAt(i, j) : null;

      // ¿debe detenerse en este cruce?
      let mustStop = false;
      if (node && dNode < RH + 4 && dNode > 0.4) {
        if (node.control === 'light') {
          const st = sgnCity.axisState(axis === 'v' ? 'ns' : 'ew');
          if (st !== 'green') mustStop = true;
        } else if (axis === 'h') { // las bocacalles E-W tienen STOP
          if (c.wait < 0.9) mustStop = true;
        }
      }

      // vehículo (u coche del jugador) justo delante en el mismo carril
      let gapAhead = Infinity;
      const wp = this.worldPos(c);
      const dv = DIR[c.dir];
      const checkAhead = (ox, oz) => {
        const rx = ox - wp.x, rz = oz - wp.z;
        const along = rx * dv.x + rz * dv.z;
        const lateral = Math.abs(rx * -dv.z + rz * dv.x);
        if (along > 0 && lateral < 1.6) gapAhead = Math.min(gapAhead, along);
      };
      for (const o of this.cars) {
        if (o === c || o.dir !== c.dir) continue; // solo el mismo sentido, evita bloqueos mutuos
        checkAhead(o.mesh.position.x, o.mesh.position.z);
      }
      if (player) checkAhead(player.x, player.z);

      // velocidad objetivo
      const limit = sgnCity.speedLimitAt(wp) / 3.6;
      let target = Math.min(limit * 0.8, 9);
      if (mustStop) target = Math.min(target, Math.max(0, (dNode - RH) * 0.5));
      if (gapAhead < 9) target = Math.min(target, Math.max(0, (gapAhead - 5) * 0.6));

      const dvv = target - c.speed;
      c.speed = Math.max(0, c.speed + Math.max(-9 * dt, Math.min(3 * dt, dvv)));
      c.t += sign * c.speed * dt;

      // gestión del cruce al alcanzar el centro
      if (node && dNode <= 0.4 + c.speed * dt) {
        if (c.speed < 0.3) c.wait += dt; else c.wait = 0;
        if (!mustStop) {
          const nd = this.chooseDir(c, i, j);
          c.t = nodeT;
          c.dir = nd;
          c.line = this.axisOf(nd) === 'v' ? i : j;
          c.t = this.axisOf(nd) === 'v' ? j * B : i * B;
          c.wait = 0;
        }
      }

      // aplica posición y giro suave del morro
      const w = this.worldPos(c);
      c.mesh.position.set(w.x, 0, w.z);
      const targetH = Math.atan2(DIR[c.dir].x, DIR[c.dir].z);
      let dh = targetH - c.heading;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      c.heading += dh * Math.min(1, dt * 9);
      c.mesh.rotation.y = c.heading;

      // red de seguridad anti-bloqueo: si lleva mucho parado, reubícalo
      c.stuck = c.speed < 0.4 ? (c.stuck || 0) + dt : 0;
      if (c.stuck > 14) this.respawnCar(c);
    }
  }
}

export class CityPedestrians {
  constructor(city, group, n = 7) {
    this.city = city;
    this.peds = [];
    for (let k = 0; k < n; k++) {
      const mesh = makePersonMesh();
      mesh.visible = false;
      group.add(mesh);
      this.peds.push({ mesh, active: false, phase: Math.random() * 6 });
    }
    this.timer = 2;
  }

  reset() {
    for (const p of this.peds) { p.active = false; p.mesh.visible = false; }
    this.timer = 2;
  }

  spawn() {
    const p = this.peds.find((x) => !x.active);
    if (!p) return;
    const { NX, NZ, B } = this.city;
    const node = this.city.nodeAt(Math.floor(Math.random() * NX), Math.floor(Math.random() * NZ));
    const RH = this.city.roadHalf;
    const horiz = Math.random() < 0.5; // cruza la calle vertical (movimiento en X) o la horizontal
    const along = (RH + 2.5); // desde una acera a la otra
    const side = Math.random() < 0.5 ? 1 : -1;
    // desplazado un poco antes del centro para caer sobre el paso de cebra
    const off = (RH - 0.6) * (Math.random() < 0.5 ? 1 : -1);
    p.active = true;
    p.mesh.visible = true;
    p.speed = 1.1 + Math.random() * 0.5;
    if (horiz) {
      p.fromX = node.x - side * along; p.toX = node.x + side * along;
      p.z = node.z + off; p.moveAxis = 'x';
    } else {
      p.fromZ = node.z - side * along; p.toZ = node.z + side * along;
      p.x = node.x + off; p.moveAxis = 'z';
    }
    p.node = node; p.u = 0;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) { this.spawn(); this.timer = 3 + Math.random() * 5; }
    for (const p of this.peds) {
      if (!p.active) continue;
      p.phase += dt * 6.5;
      const swing = Math.sin(p.phase) * 0.5;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      if (p.moveAxis === 'x') {
        const span = Math.abs(p.toX - p.fromX);
        p.u += (dt * p.speed) / span;
        const x = p.fromX + (p.toX - p.fromX) * Math.min(1, p.u);
        p.mesh.position.set(x, 0, p.z);
        p.mesh.rotation.y = Math.atan2(Math.sign(p.toX - p.fromX), 0);
        p.curX = x; p.curZ = p.z;
      } else {
        const span = Math.abs(p.toZ - p.fromZ);
        p.u += (dt * p.speed) / span;
        const z = p.fromZ + (p.toZ - p.fromZ) * Math.min(1, p.u);
        p.mesh.position.set(p.x, 0, z);
        p.mesh.rotation.y = Math.atan2(0, Math.sign(p.toZ - p.fromZ));
        p.curX = p.x; p.curZ = z;
      }
      if (p.u >= 1) { p.active = false; p.mesh.visible = false; }
    }
  }

  // peatones actualmente sobre la calzada (a menos de RH del centro de su cruce)
  onRoad() {
    const RH = this.city.roadHalf;
    return this.peds.filter((p) => p.active &&
      Math.abs(p.curX - p.node.x) < RH + 0.5 && Math.abs(p.curZ - p.node.z) < RH + 0.5);
  }
}
