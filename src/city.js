// Mundo urbano: cuadrícula de calles con cruces a 90°, semáforos, señales,
// aceras, edificios y pasos de cebra. Circulación libre (sin recorrido fijo).
import * as THREE from 'three';
import { createSign } from './signals.js';

const B = 110;        // separación entre calles (tamaño de manzana)
const NX = 5, NZ = 5; // nº de calles verticales / horizontales (intersecciones NX×NZ)
const RH = 6.0;       // media anchura de calzada (2 carriles por sentido, 3 m cada uno)
const LANE_OUT = 4.5; // centro del carril exterior (circulación normal)
const LANE_IN = 1.5;  // centro del carril interior (para adelantar sin invadir el contrario)

// intersecciones con restricción de giro (clave "i-j" → señal)
const TURN_RESTRICT = { '1-2': 'noLeft', '3-2': 'noRight', '2-1': 'noRight', '2-3': 'noLeft' };

// ciclo de semáforos (s): verde N-S, ámbar, todo-rojo, verde E-W, ámbar, todo-rojo
const CYCLE = 18;

export class City {
  constructor() {
    this.B = B; this.NX = NX; this.NZ = NZ; this.roadHalf = RH;
    this.lane = LANE_OUT; this.laneIn = LANE_IN;
    this.maxX = (NX - 1) * B; this.maxZ = (NZ - 1) * B;
    this.lightTimer = 0;
    this.lightLamps = []; // { axis, red, amber, green }

    // zona 30: bloque superior-izquierdo del mapa
    this.zona30 = { x0: -RH, x1: B + RH, z0: 2 * B - RH, z1: 4 * B + RH };

    // tipo de control por intersección
    this.nodes = [];
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NZ; j++) {
        const inner = i > 0 && i < NX - 1 && j > 0 && j < NZ - 1;
        const light = inner && (i + j) % 2 === 0;   // damero de semáforos en el interior
        this.nodes.push({
          i, j, x: i * B, z: j * B,
          // 'light' = semáforo; si no, la calle E-W (viaje en X) tiene STOP y la N-S prioridad
          control: light ? 'light' : 'stop',
          restrict: TURN_RESTRICT[`${i}-${j}`] ?? null, // 'noLeft' | 'noRight' | null
        });
      }
    }

    // arranca en el carril exterior de una calle vertical, mirando al norte (+Z)
    this.startPos = new THREE.Vector3(B - LANE_OUT, 0, 18);
    this.startHeading = 0;
  }

  nodeAt(i, j) { return this.nodes[i * NZ + j]; }
  inBounds(x, z) { return x >= -RH && x <= this.maxX + RH && z >= -RH && z <= this.maxZ + RH; }

  speedLimitAt(pos) {
    const z = this.zona30;
    if (pos.x > z.x0 && pos.x < z.x1 && pos.z > z.z0 && pos.z < z.z1) return 30;
    return 50;
  }

  // estado del semáforo para un eje ('ns' | 'ew')
  axisState(axis) {
    const t = this.lightTimer % CYCLE;
    if (axis === 'ns') {
      if (t < 7) return 'green';
      if (t < 8) return 'amber';
      return 'red';
    } else {
      if (t < 9) return 'red';
      if (t < 16) return 'green';
      if (t < 17) return 'amber';
      return 'red';
    }
  }

  // muestrea la calzada bajo el coche: on-road, carril, límite y cruce próximo
  sampleRoad(pos, heading) {
    const xi = Math.max(0, Math.min(NX - 1, Math.round(pos.x / B)));
    const zj = Math.max(0, Math.min(NZ - 1, Math.round(pos.z / B)));
    const dVert = pos.x - xi * B; // dist. perpendicular a la calle vertical más próxima
    const dHor = pos.z - zj * B;  // dist. perpendicular a la horizontal más próxima
    const onVert = Math.abs(dVert) <= RH && pos.z >= -RH && pos.z <= this.maxZ + RH;
    const onHor = Math.abs(dHor) <= RH && pos.x >= -RH && pos.x <= this.maxX + RH;
    const onRoad = onVert || onHor;

    const fwd = { x: Math.sin(heading), z: Math.cos(heading) };
    const travellingNS = Math.abs(fwd.z) >= Math.abs(fwd.x);
    // car-right = (-fwd.z, fwd.x); lat con signo (+ = carril correcto/derecho)
    let lat;
    if (travellingNS) lat = dVert * (-fwd.z);
    else lat = dHor * (fwd.x);

    // intersección que se aproxima según el eje de viaje
    let node = null, distToNode = Infinity;
    if (travellingNS) {
      const dir = Math.sign(fwd.z) || 1;
      const jAhead = dir > 0 ? Math.ceil(pos.z / B - 1e-6) : Math.floor(pos.z / B + 1e-6);
      if (jAhead >= 0 && jAhead < NZ) { node = this.nodeAt(xi, jAhead); distToNode = Math.abs(node.z - pos.z); }
    } else {
      const dir = Math.sign(fwd.x) || 1;
      const iAhead = dir > 0 ? Math.ceil(pos.x / B - 1e-6) : Math.floor(pos.x / B + 1e-6);
      if (iAhead >= 0 && iAhead < NX) { node = this.nodeAt(iAhead, zj); distToNode = Math.abs(node.x - pos.x); }
    }

    return {
      onRoad, offroad: !onRoad, lat, travellingNS,
      limit: this.speedLimitAt(pos),
      node, distToNode,
      axis: travellingNS ? 'ns' : 'ew',
    };
  }

  update(dt) {
    this.lightTimer += dt;
    const ns = this.axisState('ns'), ew = this.axisState('ew');
    for (const L of this.lightLamps) {
      const st = L.axis === 'ns' ? ns : ew;
      L.red.material.color.setHex(st === 'red' ? 0xff2b2b : 0x3a1414);
      L.amber.material.color.setHex(st === 'amber' ? 0xffb020 : 0x3a2e14);
      L.green.material.color.setHex(st === 'green' ? 0x37d24a : 0x143a1c);
    }
  }

  // -------- construcción de la escena --------
  streetTexture() {
    // 64 px de ancho = 2*RH (12 m). 2 carriles por sentido: doble línea central
    // continua + separadores de carril discontinuos + bordes.
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3d4148'; ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = '#e8e6df';
    ctx.fillRect(2, 0, 3, 256); ctx.fillRect(59, 0, 3, 256); // bordes
    ctx.fillRect(29, 0, 2, 256); ctx.fillRect(33, 0, 2, 256); // doble línea central continua
    for (let y = 10; y < 256; y += 40) { // separadores de carril discontinuos (±3 m)
      ctx.fillRect(15, y, 2, 22); ctx.fillRect(47, y, 2, 22);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  makeTrafficLight(axis) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x2b2f36 }));
    pole.position.y = 1.6; g.add(pole);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 1.15, 0.28),
      new THREE.MeshLambertMaterial({ color: 0x15181d }));
    box.position.y = 3.5; g.add(box);
    const lamp = (y, color) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10),
        new THREE.MeshBasicMaterial({ color }));
      m.position.set(0, y, 0.16); g.add(m); return m;
    };
    const red = lamp(3.86, 0x3a1414);
    const amber = lamp(3.5, 0x3a2e14);
    const green = lamp(3.14, 0x143a1c);
    this.lightLamps.push({ axis, red, amber, green });
    return g;
  }

  buildScene(scene) {
    const group = new THREE.Group();

    // suelo urbano
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      new THREE.MeshLambertMaterial({ color: 0x8a8f83 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.maxX / 2, -0.05, this.maxZ / 2);
    group.add(ground);

    const asphalt = new THREE.MeshLambertMaterial({ color: 0x3d4148 });
    const tex = this.streetTexture();

    // calles verticales (a lo largo de Z) y horizontales (a lo largo de X)
    const len = this.maxZ + 2 * RH;
    for (let i = 0; i < NX; i++) {
      const t = tex.clone(); t.repeat.set(1, len / 12);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * RH, len),
        new THREE.MeshLambertMaterial({ map: t }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(i * B, 0.01, this.maxZ / 2);
      group.add(m);
    }
    for (let j = 0; j < NZ; j++) {
      const t = tex.clone(); t.repeat.set(1, len / 12);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * RH, len),
        new THREE.MeshLambertMaterial({ map: t }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2;
      m.position.set(this.maxX / 2, 0.01, j * B);
      group.add(m);
    }

    // tapa lisa + pasos de cebra en cada intersección
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe8e6df });
    const stripes = [];
    for (const n of this.nodes) {
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(2 * RH, 2 * RH), asphalt);
      cover.rotation.x = -Math.PI / 2; cover.position.set(n.x, 0.015, n.z);
      group.add(cover);
      // pasos de cebra en las 4 bocacalles
      for (const [ox, oz, along] of [
        [0, -RH + 0.6, 'x'], [0, RH - 0.6, 'x'], [-RH + 0.6, 0, 'z'], [RH - 0.6, 0, 'z'],
      ]) {
        for (let k = -2; k <= 2; k++) {
          const s = new THREE.Mesh(new THREE.PlaneGeometry(
            along === 'x' ? 0.7 : 1.4, along === 'x' ? 1.4 : 0.7), stripeMat);
          s.rotation.x = -Math.PI / 2;
          s.position.set(n.x + ox + (along === 'x' ? k * 1.6 : 0),
            0.03, n.z + oz + (along === 'z' ? k * 1.6 : 0));
          group.add(s);
        }
      }
    }

    // aceras y edificios por manzana
    const palette = [0xb8b0a0, 0xc9a887, 0xa6b0bd, 0xd6d2c4, 0xb98d6f, 0x9aa7b3, 0xcabfa6];
    for (let i = 0; i < NX - 1; i++) {
      for (let j = 0; j < NZ - 1; j++) {
        const x0 = i * B + RH, x1 = (i + 1) * B - RH;
        const z0 = j * B + RH, z1 = (j + 1) * B - RH;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const w = x1 - x0, d = z1 - z0;
        // acera
        const side = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d),
          new THREE.MeshLambertMaterial({ color: 0xa9adb2 }));
        side.position.set(cx, 0.08, cz); group.add(side);
        // 1–4 edificios sobre la manzana, dejando margen de acera
        const inZona = cx > this.zona30.x0 && cx < this.zona30.x1 && cz > this.zona30.z0 && cz < this.zona30.z1;
        const nB = inZona ? 1 : (1 + Math.floor(Math.random() * 3));
        for (let b = 0; b < nB; b++) {
          const bw = (w - 12) * (0.45 + Math.random() * 0.4);
          const bd = (d - 12) * (0.45 + Math.random() * 0.4);
          const bh = inZona ? 5 + Math.random() * 4 : 8 + Math.random() * 18;
          const bx = cx + (Math.random() - 0.5) * (w - bw - 8);
          const bz = cz + (Math.random() - 0.5) * (d - bd - 8);
          const build = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd),
            new THREE.MeshLambertMaterial({ color: palette[(i * 3 + j + b) % palette.length] }));
          build.position.set(bx, 0.16 + bh / 2, bz);
          group.add(build);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.6, 0.5, bd + 0.6),
            new THREE.MeshLambertMaterial({ color: 0x4a4f57 }));
          roof.position.set(bx, 0.16 + bh + 0.25, bz); group.add(roof);
        }
      }
    }

    this.buildSignsAndLights(group);
    scene.add(group);
    this.group = group;
    return group;
  }

  placeSign(group, type, x, z, faceDir) {
    const sign = createSign(type);
    sign.position.set(x, 0, z);
    sign.rotation.y = Math.atan2(-faceDir.x, -faceDir.z);
    group.add(sign);
  }

  buildSignsAndLights(group) {
    // señales de límite en las 4 entradas de la ciudad (calles verticales, extremos)
    for (let i = 0; i < NX; i++) {
      // entrada sur (viajando +Z) y norte (-Z)
      this.placeSign(group, 'limit50', i * B - RH - 1.4, -RH + 1, { x: 0, z: 1 });
      this.placeSign(group, 'limit50', i * B + RH + 1.4, this.maxZ + RH - 1, { x: 0, z: -1 });
    }

    // zona 30: paneles en el borde inferior de la zona
    this.placeSign(group, 'limit30', -RH - 1.4, 2 * B, { x: 0, z: -1 });
    this.placeSign(group, 'limit30', B + RH + 1.4, 2 * B, { x: 0, z: 1 });

    for (const n of this.nodes) {
      if (n.control === 'light') {
        // un semáforo por bocacalle, en la esquina derecha de cada aproximación
        const approaches = [
          { dir: { x: 0, z: 1 }, axis: 'ns' },  // viene del sur
          { dir: { x: 0, z: -1 }, axis: 'ns' }, // del norte
          { dir: { x: 1, z: 0 }, axis: 'ew' },  // del oeste
          { dir: { x: -1, z: 0 }, axis: 'ew' }, // del este
        ];
        for (const a of approaches) {
          const g = this.makeTrafficLight(a.axis);
          // esquina derecha del conductor: pos = -dir*RH + right*RH ; right=(-dir.z,dir.x)
          const rx = -a.dir.z, rz = a.dir.x;
          g.position.set(n.x - a.dir.x * (RH + 0.6) + rx * (RH + 0.6),
            0, n.z - a.dir.z * (RH + 0.6) + rz * (RH + 0.6));
          g.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
          group.add(g);
        }
      } else {
        // STOP para las bocacalles E-W (viaje en X); la calle N-S tiene prioridad
        this.placeSign(group, 'stop', n.x - (RH + 1.4), n.z - RH - 1.2, { x: 1, z: 0 });
        this.placeSign(group, 'stop', n.x + (RH + 1.4), n.z + RH + 1.2, { x: -1, z: 0 });
      }

      // señal de giro prohibido en cada aproximación de la intersección
      if (n.restrict) {
        for (const d of [{ x: 0, z: 1 }, { x: 0, z: -1 }, { x: 1, z: 0 }, { x: -1, z: 0 }]) {
          const rx = -d.z, rz = d.x; // esquina derecha del que se aproxima
          this.placeSign(group, n.restrict,
            n.x - d.x * (RH + 2.2) + rx * (RH + 2.2),
            n.z - d.z * (RH + 2.2) + rz * (RH + 2.2), d);
        }
      }
    }
  }
}
