// Circuito cerrado (~4,5 km): rectas, subidas y bajadas, travesía urbana con STOP,
// rotonda con ceda el paso, curvas peligrosas y ceda final. Señales y paisaje.
import * as THREE from 'three';
import { createSign } from './signals.js';

const ROAD_HALF = 6.0; // media calzada (2 carriles de 3 m por sentido)
const LANE_OUT = 4.5;  // centro del carril exterior (circulación normal)
const LANE_IN = 1.5;   // centro del carril interior (adelantar sin invadir el contrario)

// Trazado en forma de 8: dos lóbulos (oeste y este) unidos por una rotonda central
// que se atraviesa DOS veces por vuelta (arco sur y arco norte, isleta en medio).
// [x, z, y] — y = altura (subidas y bajadas)
// Rotonda central real (anillo circular de radio RING_R) usada como intersección de
// un 8: el trazado la recorre en dos semicírculos (norte y sur) que juntos cierran el
// círculo, con un lóbulo a cada lado. Dentro de la rotonda se circula libremente.
const RING_R = 30;   // radio de la línea central del anillo
const CONTROL_POINTS = [
  // --- lóbulo ESTE (arranca en su recta) ---
  [860, 90, 6],
  [1080, 170, 12],
  [1150, 300, 14],   // alto del lóbulo este
  [1010, 420, 8],
  [780, 430, 3],
  [600, 360, 0],
  [529.9, 252.6, 0],  // anillo 5° — entra a la rotonda (semicírculo NORTE)
  [521.2, 271.2, 0], [500, 280, 0], [478.8, 271.2, 0],
  [470.1, 252.6, 0],  // anillo 175° — sale hacia el lóbulo oeste
  // --- lóbulo OESTE ---
  [400, 360, 0],
  [180, 440, 5],
  [-40, 380, 15],
  [-120, 250, 20],    // cima del lóbulo oeste
  [-40, 120, 15],
  [180, 60, 5],
  [400, 140, 0],
  [470.1, 247.4, 0],  // anillo 185° — entra a la rotonda (semicírculo SUR)
  [478.8, 228.8, 0], [500, 220, 0], [521.2, 228.8, 0],
  [529.9, 247.4, 0],  // anillo 355° — sale hacia el lóbulo este
  [640, 160, 0],      // cierra hacia la recta del lóbulo este
];

const ROUNDABOUT_CENTER = new THREE.Vector3(500, 0, 250);

export class Track {
  constructor() {
    this.curve = new THREE.CatmullRomCurve3(
      CONTROL_POINTS.map(([x, z, y]) => new THREE.Vector3(x, y, z)),
      true, 'catmullrom', 0.5
    );
    this.length = this.curve.getLength();
    this.roadHalf = ROAD_HALF;
    this.laneOut = LANE_OUT;
    this.laneIn = LANE_IN;

    this.N = 2400;
    this.samples = this.curve.getSpacedPoints(this.N);
    this.step = this.length / this.N;
    this.buildSpeedCaps();

    // rotonda central (círculo real por el que se circula)
    this.ringR = RING_R;
    this.islandR = 22;
    this.roundZoneR = RING_R + 12;   // radio de la "zona rotonda" (circulación libre)

    // puntos clave sobre el trazado en 8 (dos entradas a la rotonda)
    this.rotEntryS = (this.findS(529.9, 252.6) - 14 + this.length) % this.length; // entrada norte
    this.rotExitS = this.findS(470.1, 252.6);
    this.rotEntryS2 = (this.findS(470.1, 247.4) - 14 + this.length) % this.length; // entrada sur
    this.rotExitS2 = this.findS(529.9, 247.4);

    // travesía urbana en el lóbulo oeste
    const sTownStart = this.findS(150, 62);
    const sTownEnd = this.findS(400, 140);
    const sStop = (sTownStart + sTownEnd) / 2;
    this.stopS = sStop;
    this.stopLineS = sStop - 4.5;
    this.crosswalkS = sTownStart + (sTownEnd - sTownStart) * 0.3;

    // ceda: incorporación por un ramal en la parte alta del lóbulo oeste
    this.cedaS = (this.findS(180, 440) - 6 + this.length) % this.length;

    const sSummit = this.findS(-120, 250);   // cima del lóbulo oeste
    const sEastHill = this.findS(1150, 300);  // alto del lóbulo este

    this.zones = [
      { s0: 0, s1: sTownStart, limit: 90, urban: false },
      { s0: sTownStart, s1: sStop, limit: 50, urban: true },
      { s0: sStop, s1: sTownEnd, limit: 30, urban: true },
      { s0: sTownEnd, s1: this.length, limit: 90, urban: false },
    ];
    this.urbanRange = [sTownStart - 30, sTownEnd + 20];

    this.signDefs = [
      { s: 30, type: 'limit90' },
      { s: this.cedaS - 55, type: 'curveLeft' },
      { s: this.cedaS - 14, type: 'yield' },
      { s: sSummit - 45, type: 'slope' },
      { s: sTownStart - 55, type: 'town' },
      { s: sTownStart, type: 'limit50' },
      { s: this.crosswalkS - 22, type: 'crosswalk' },
      { s: sStop - 22, type: 'crossing' },
      { s: sStop, type: 'limit30' },
      { s: this.stopLineS, type: 'stop' },
      { s: sTownEnd, type: 'townEnd' },
      { s: sTownEnd + 22, type: 'limit90' },
      { s: this.rotEntryS - 60, type: 'roundabout' },
      { s: this.rotEntryS - 14, type: 'yield' },
      { s: this.rotEntryS2 - 60, type: 'roundabout' },
      { s: this.rotEntryS2 - 14, type: 'yield' },
      { s: sEastHill - 130, type: 'curves' },
      { s: sEastHill - 100, type: 'noOvertake' },
      { s: sEastHill + 60, type: 'endProhib' },
      { s: sEastHill + 130, type: 'animals' },
    ];
  }

  findS(x, z) {
    let best = Infinity, bestI = 0;
    for (let i = 0; i < this.N; i++) {
      const dx = this.samples[i].x - x, dz = this.samples[i].z - z;
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; bestI = i; }
    }
    return bestI * this.step;
  }

  // velocidad máxima razonable por curvatura (para el tráfico)
  buildSpeedCaps() {
    const caps = new Array(this.N);
    const k = 5; // ±10 m
    const heading = (i) => {
      const a = this.samples[(i - 1 + this.N) % this.N];
      const b = this.samples[(i + 1) % this.N];
      return Math.atan2(b.x - a.x, b.z - a.z);
    };
    for (let i = 0; i < this.N; i++) {
      let dA = heading((i + k) % this.N) - heading((i - k + this.N) % this.N);
      while (dA > Math.PI) dA -= 2 * Math.PI;
      while (dA < -Math.PI) dA += 2 * Math.PI;
      const kappa = Math.abs(dA) / (2 * k * this.step);
      caps[i] = Math.min(40, Math.max(4, Math.sqrt(2.3 / Math.max(kappa, 1e-4))));
    }
    // suavizado hacia atrás: frena antes de llegar a la curva (decel ~2 m/s²)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = this.N - 1; i >= 0; i--) {
        const next = caps[(i + 1) % this.N];
        caps[i] = Math.min(caps[i], Math.sqrt(next * next + 2 * 2 * this.step));
      }
    }
    this.caps = caps;
  }

  speedCapAt(s) {
    const i = ((Math.round(s / this.step) % this.N) + this.N) % this.N;
    return this.caps[i];
  }

  // ¿está el coche dentro de la rotonda? (para circular libremente por el anillo)
  roundaboutZone(pos) {
    const dx = pos.x - ROUNDABOUT_CENTER.x, dz = pos.z - ROUNDABOUT_CENTER.z;
    const dist = Math.hypot(dx, dz);
    return { inZone: dist < this.roundZoneR, dist };
  }

  poseAt(s) {
    const u = (((s % this.length) + this.length) % this.length) / this.length;
    const p = this.curve.getPointAt(u);
    const t = this.curve.getTangentAt(u);
    return { pos: p, tan: t, right: new THREE.Vector3(-t.z, 0, t.x) };
  }

  project(pos, lastS = 0) {
    const center = Math.round(lastS / this.step);
    let best = Infinity, bestI = center;
    for (let d = -60; d <= 60; d++) {
      const i = ((center + d) % this.N + this.N) % this.N;
      const dx = this.samples[i].x - pos.x, dz = this.samples[i].z - pos.z;
      const dist = dx * dx + dz * dz;
      if (dist < best) { best = dist; bestI = i; }
    }
    const s = bestI * this.step;
    const { pos: cp, right } = this.poseAt(s);
    const lat = (pos.x - cp.x) * right.x + (pos.z - cp.z) * right.z;
    return { s, lat };
  }

  zoneAt(s) {
    for (const z of this.zones) if (s >= z.s0 && s < z.s1) return z;
    return this.zones[0];
  }

  // altura del terreno: sigue la rasante de la carretera y decae a nivel 0
  heightAt(x, z) {
    // fase 1: localizar la zona con las muestras gruesas
    let best = Infinity, bi = 0;
    for (let i = 0; i < this.hSamples.length; i++) {
      const p = this.hSamples[i];
      const dx = p.x - x, dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i; }
    }
    // fase 2: refinar con las muestras finas (~2 m) para no crear escalones en las cuestas
    const center = bi * 8;
    best = Infinity;
    let y = 0;
    for (let j = center - 12; j <= center + 12; j++) {
      const p = this.samples[((j % this.N) + this.N) % this.N];
      const dx = p.x - x, dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; y = p.y; }
    }
    const d = Math.sqrt(best);
    const fall = d < 12 ? 1 : Math.max(0, 1 - (d - 12) / 45);
    const sm = fall * fall * (3 - 2 * fall);
    return (y - 0.35) * sm;
  }

  buildScene(scene) {
    // llanura lejana
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshLambertMaterial({ color: 0x6da34d })
    );
    ground.rotation.x = -Math.PI / 2;
    // muy por debajo de cualquier vaguada de la rasante (mínimo -0,37 m):
    // si el plano queda por encima de la carretera, la "tapa" de verde
    ground.position.set(500, -0.9, 250);
    scene.add(ground);

    // terreno con relieve bajo la carretera
    this.hSamples = [];
    for (let i = 0; i < this.N; i += 8) this.hSamples.push(this.samples[i]);
    const terrGeo = new THREE.PlaneGeometry(1600, 800, 160, 80);
    terrGeo.rotateX(-Math.PI / 2);
    terrGeo.translate(500, 0, 250);
    const posAttr = terrGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, this.heightAt(posAttr.getX(i), posAttr.getZ(i)));
    }
    terrGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(terrGeo, new THREE.MeshLambertMaterial({ color: 0x6da34d })));

    scene.add(this.buildRoadMesh());
    this.buildCrossroads(scene);
    this.buildCrosswalk(scene);
    this.buildRoundabout(scene);
    this.buildSigns(scene);
    this.buildScenery(scene);
  }

  roadTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3d4148'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${120 + Math.random() * 60},${120 + Math.random() * 60},${125 + Math.random() * 60},0.06)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    ctx.fillStyle = '#e8e6df';
    ctx.fillRect(10, 0, 5, 256); ctx.fillRect(241, 0, 5, 256);   // bordes continuos
    ctx.fillRect(122, 0, 4, 256); ctx.fillRect(130, 0, 4, 256);  // doble línea central continua
    for (let y = 8; y < 256; y += 40) {                          // separadores de carril discontinuos
      ctx.fillRect(62, y, 4, 22); ctx.fillRect(190, y, 4, 22);
    }
    return new THREE.CanvasTexture(c);
  }

  buildRoadMesh() {
    const n = 2000;
    const pts = this.curve.getSpacedPoints(n);
    const verts = [], uvs = [], idx = [];
    const segLen = this.length / n;
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n];
      const q = pts[(i + 1) % n];
      const tx = q.x - p.x, tz = q.z - p.z;
      const tl = Math.hypot(tx, tz) || 1;
      const rx = -tz / tl, rz = tx / tl;
      verts.push(p.x - rx * ROAD_HALF, p.y + 0.02, p.z - rz * ROAD_HALF);
      verts.push(p.x + rx * ROAD_HALF, p.y + 0.02, p.z + rz * ROAD_HALF);
      uvs.push(0, (i * segLen) / 8);
      uvs.push(1, (i * segLen) / 8);
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = this.roadTexture();
    tex.wrapT = THREE.RepeatWrapping;
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  }

  // paso de cebra en la travesía
  buildCrosswalk(scene) {
    const { pos, tan, right } = this.poseAt(this.crosswalkS);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8e6df });
    for (let k = -5; k <= 5; k++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 4), mat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = -Math.atan2(tan.x, tan.z);
      stripe.position.set(
        pos.x + right.x * (k * 1.05), pos.y + 0.035, pos.z + right.z * (k * 1.05)
      );
      scene.add(stripe);
    }
  }

  buildCrossroads(scene) {
    const plainRoad = (w, len) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, len),
        new THREE.MeshLambertMaterial({ color: 0x3d4148 })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.01;
      return m;
    };

    // cruce perpendicular en el STOP
    const stop = this.poseAt(this.stopS);
    const cross = plainRoad(7, 170);
    cross.position.x = stop.pos.x; cross.position.z = stop.pos.z;
    cross.rotation.z = -Math.atan2(stop.right.x, stop.right.z);
    scene.add(cross);

    // línea de detención (carril derecho)
    const lp = this.poseAt(this.stopLineS);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xe8e6df })
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -Math.atan2(lp.tan.x, lp.tan.z);
    line.position.set(lp.pos.x + lp.right.x * 3, lp.pos.y + 0.03, lp.pos.z + lp.right.z * 3);
    scene.add(line);

    // ramal que se incorpora en el ceda final: llega por la derecha, hacia atrás
    const j = this.poseAt(this.cedaS + 15);
    const db = {
      x: (j.right.x - j.tan.x) / Math.SQRT2,
      z: (j.right.z - j.tan.z) / Math.SQRT2,
    };
    const merge = plainRoad(7, 120);
    merge.position.x = j.pos.x + db.x * 62;
    merge.position.z = j.pos.z + db.z * 62;
    merge.rotation.z = Math.atan2(-db.x, -db.z);
    scene.add(merge);
  }

  buildRoundabout(scene) {
    const C = ROUNDABOUT_CENTER;
    const R = this.ringR, IR = this.islandR, H = this.roadHalf;

    // calzada anular completa (el anillo circular por el que se circula)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R - H, R + H, 64),
      new THREE.MeshLambertMaterial({ color: 0x3d4148, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(C.x, 0.012, C.z);
    scene.add(ring);

    // línea central discontinua del anillo (separador de los dos carriles)
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xe8e6df });
    const dashes = 40;
    for (let i = 0; i < dashes; i++) {
      const a = (i / dashes) * Math.PI * 2;
      if (i % 2) continue;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), laneMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -a;
      seg.position.set(C.x + Math.cos(a) * R, 0.02, C.z + Math.sin(a) * R);
      scene.add(seg);
    }

    // bordillo e isleta central
    const curb = new THREE.Mesh(
      new THREE.CylinderGeometry(IR + 0.8, IR + 0.8, 0.28, 56),
      new THREE.MeshLambertMaterial({ color: 0xb7bcc4 })
    );
    curb.position.set(C.x, 0.14, C.z);
    scene.add(curb);
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(IR, IR, 0.34, 56),
      new THREE.MeshLambertMaterial({ color: 0x5c8f43 })
    );
    island.position.set(C.x, 0.28, C.z);
    scene.add(island);

    // vegetación decorativa en la isleta
    for (const [ox, oz] of [[0, 0], [-11, 8], [10, -9], [8, 11], [-9, -10], [13, 6]]) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2b })
      );
      trunk.position.set(C.x + ox, 1.4, C.z + oz);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 4.6, 7),
        new THREE.MeshLambertMaterial({ color: 0x2e6b34 })
      );
      crown.position.set(C.x + ox, 4.4, C.z + oz);
      scene.add(trunk, crown);
    }
  }

  buildSigns(scene) {
    for (const def of this.signDefs) {
      const s = ((def.s % this.length) + this.length) % this.length;
      const { pos, tan, right } = this.poseAt(s);
      const sign = createSign(def.type);
      sign.position.set(
        pos.x + right.x * (ROAD_HALF + 1.6), pos.y - 0.3,
        pos.z + right.z * (ROAD_HALF + 1.6)
      );
      sign.rotation.y = Math.atan2(-tan.x, -tan.z);
      scene.add(sign);
    }
  }

  buildScenery(scene) {
    // árboles instanciados fuera del casco urbano y de los taludes en pendiente
    const NT = 380;
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.6, 6);
    const crownGeo = new THREE.ConeGeometry(2.1, 5.5, 7);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), NT);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0x2e6b34 }), NT);
    const M = new THREE.Matrix4();
    let placed = 0, guard = 0;
    while (placed < NT && guard++ < 6000) {
      const s = Math.random() * this.length;
      if (s > this.urbanRange[0] && s < this.urbanRange[1]) continue;
      const { pos, right } = this.poseAt(s);
      const side = Math.random() < 0.5 ? -1 : 1;
      const minD = pos.y > 0.5 ? 32 : 12; // en terraplén, lejos del talud
      const d = minD + Math.random() * 45;
      const x = pos.x + right.x * side * d + (Math.random() - 0.5) * 8;
      const z = pos.z + right.z * side * d + (Math.random() - 0.5) * 8;
      // evita la rotonda
      if (Math.hypot(x - ROUNDABOUT_CENTER.x, z - ROUNDABOUT_CENTER.z) < 58) continue;
      const sc = 0.7 + Math.random() * 0.9;
      const gy = this.heightAt(x, z);
      M.makeScale(sc, sc, sc).setPosition(x, gy + 1.3 * sc, z);
      trunks.setMatrixAt(placed, M);
      M.makeScale(sc, sc, sc).setPosition(x, gy + (2.6 + 2.7) * sc, z);
      crowns.setMatrixAt(placed, M);
      placed++;
    }
    trunks.count = crowns.count = placed;
    scene.add(trunks, crowns);

    // edificios del pueblo (tramo llano)
    const palette = [0xd9c8a9, 0xc9a887, 0xbfb4a4, 0xd6d2c4, 0xb98d6f, 0xe0d5bb];
    const [u0, u1] = this.urbanRange;
    for (let i = 0; i < 52; i++) {
      const s = u0 + 40 + ((u1 - u0 - 80) * i) / 52;
      const { pos, tan, right } = this.poseAt(s);
      const side = i % 2 === 0 ? 1 : -1;
      const d = 12 + Math.random() * 7;
      const h = 5 + Math.random() * 9;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(7 + Math.random() * 6, h, 6 + Math.random() * 5),
        new THREE.MeshLambertMaterial({ color: palette[i % palette.length] })
      );
      const bx = pos.x + right.x * side * d, bz = pos.z + right.z * side * d;
      const by = this.heightAt(bx, bz);
      b.position.set(bx, by + h / 2, bz);
      b.rotation.y = Math.atan2(tan.x, tan.z);
      scene.add(b);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(6.4, 2.6, 4),
        new THREE.MeshLambertMaterial({ color: 0x8d4f3a })
      );
      roof.position.copy(b.position); roof.position.y = by + h + 1.3;
      roof.rotation.y = b.rotation.y + Math.PI / 4;
      scene.add(roof);
    }

    // montañas lejanas
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 2000 + Math.random() * 600;
      const h = 200 + Math.random() * 260;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(450 + Math.random() * 300, h, 5),
        new THREE.MeshLambertMaterial({ color: 0x7c8894 })
      );
      m.position.set(500 + Math.cos(a) * r, h / 2 - 8, 250 + Math.sin(a) * r);
      scene.add(m);
    }
  }
}
