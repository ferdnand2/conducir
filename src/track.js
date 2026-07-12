// Circuito cerrado (~4,5 km): rectas, subidas y bajadas, travesía urbana con STOP,
// rotonda con ceda el paso, curvas peligrosas y ceda final. Señales y paisaje.
import * as THREE from 'three';
import { createSign } from './signals.js';

const ROAD_HALF = 6.0; // media calzada (2 carriles de 3 m por sentido)
const LANE_OUT = 4.5;  // centro del carril exterior (circulación normal)
const LANE_IN = 1.5;   // centro del carril interior (adelantar sin invadir el contrario)

// [x, z, y] — y = altura (subidas y bajadas)
const CONTROL_POINTS = [
  [0, -150, 0], [0, 100, 0], [0, 350, 4], [0, 560, 14],       // recta inicial, empieza a subir
  [60, 760, 24], [180, 920, 30], [340, 1010, 30],              // curva izquierda en subida, cima
  [520, 1070, 16], [700, 1080, 4],                             // bajada
  [880, 1080, 0], [1050, 1080, 0], [1220, 1060, 0],            // travesía urbana (llano)
  [1350, 990, 0], [1430, 860, 0],                              // salida del pueblo
  [1430, 800, 0], [1432, 740, 0], [1436, 714, 0],              // aproximación: deflexión a la derecha
  [1438.6, 702.3, 0], [1443.0, 697.5, 0], [1445.0, 690.0, 0],  // arco del anillo (R=15,
  [1443.0, 682.5, 0], [1438.6, 677.7, 0],                      //  isleta a la izquierda)
  [1436, 666, 0], [1432, 640, 0], [1430, 600, 0], [1430, 560, 0], // salida hacia el sur
  [1400, 430, 5], [1300, 330, 12], [1140, 300, 8],             // curvas con ondulaciones
  [980, 340, 14], [820, 290, 8], [660, 330, 3],
  [500, 250, 7], [340, 290, 3], [170, 190, 0],
  // regreso por el sur: baja en paralelo por el este, rodea un arco amplio
  // (radio ~50 m) y se incorpora ALINEADO con la recta inicial
  [110, 40, 0], [110, -100, 0], [95, -185, 0],
  [50, -235, 0], [10, -195, 0],
];

const ROUNDABOUT_CENTER = new THREE.Vector3(1430, 0, 690);

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

    // puntos clave localizados sobre la curva real
    const sTownStart = this.findS(880, 1080);
    const sStop = this.findS(1050, 1080);
    const s30 = this.findS(1220, 1060);
    const sTownEnd = this.findS(1350, 990);
    this.rotEntryS = this.findS(1443, 697.5) - 8;
    this.rotExitS = this.findS(1438.6, 677.7);
    // incorporación a la recta inicial, justo tras la horquilla sur
    this.cedaS = (this.findS(0, -150) - 25 + this.length) % this.length;
    this.horseshoeS = this.findS(50, -235);
    const sCurve1 = this.findS(0, 560);
    const sSummit = this.findS(340, 1010);

    this.stopS = sStop;
    this.stopLineS = sStop - 4.5;

    this.zones = [
      { s0: 0, s1: sTownStart, limit: 90, urban: false },
      { s0: sTownStart, s1: s30, limit: 50, urban: true },
      { s0: s30, s1: sTownEnd + 40, limit: 30, urban: true },
      { s0: sTownEnd + 40, s1: this.length, limit: 90, urban: false },
    ];
    this.urbanRange = [sTownStart - 60, sTownEnd + 40];

    this.crosswalkS = sTownStart + 110;
    this.signDefs = [
      { s: 40, type: 'limit90' },
      { s: 600, type: 'animals' },
      { s: sCurve1 - 70, type: 'curveLeft' },
      { s: sSummit + 15, type: 'slope' },
      { s: sTownStart - 90, type: 'town' },
      { s: sTownStart, type: 'limit50' },
      { s: sTownStart + 75, type: 'crosswalk' },
      { s: sStop - 100, type: 'crossing' },
      { s: this.stopLineS, type: 'stop' },
      { s: sStop + 60, type: 'limit50' },
      { s: s30, type: 'limit30' },
      { s: s30 + 45, type: 'noParking' },
      { s: sTownEnd + 40, type: 'townEnd' },
      { s: sTownEnd + 65, type: 'limit90' },
      { s: this.rotEntryS - 85, type: 'roundabout' },
      { s: this.rotEntryS - 14, type: 'yield' },
      { s: this.rotExitS + 120, type: 'curves' },
      { s: this.rotExitS + 150, type: 'noOvertake' },
      { s: this.rotExitS + 1000, type: 'endProhib' },
      { s: this.rotExitS + 1030, type: 'limit90' },
      { s: this.horseshoeS - 80, type: 'curveRight' },
      { s: this.cedaS - 14, type: 'yield' },
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
    ground.position.set(720, -0.9, 465);
    scene.add(ground);

    // terreno con relieve bajo la carretera
    this.hSamples = [];
    for (let i = 0; i < this.N; i += 8) this.hSamples.push(this.samples[i]);
    const terrGeo = new THREE.PlaneGeometry(1750, 1550, 175, 155);
    terrGeo.rotateX(-Math.PI / 2);
    terrGeo.translate(730, 0, 465);
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
    // calzada anular
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(8.8, 24, 48),
      new THREE.MeshLambertMaterial({ color: 0x3d4148 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(C.x, 0.008, C.z);
    scene.add(ring);

    // bordillo e isleta central
    const curb = new THREE.Mesh(
      new THREE.CylinderGeometry(9.6, 9.6, 0.24, 40),
      new THREE.MeshLambertMaterial({ color: 0xb7bcc4 })
    );
    curb.position.set(C.x, 0.12, C.z);
    scene.add(curb);
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(9.0, 9.0, 0.3, 40),
      new THREE.MeshLambertMaterial({ color: 0x5c8f43 })
    );
    island.position.set(C.x, 0.24, C.z);
    scene.add(island);

    // arbolitos decorativos en la isleta
    for (const [ox, oz] of [[0, 0], [-4, 3], [3.5, -3]]) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2b })
      );
      trunk.position.set(C.x + ox, 1.0, C.z + oz);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 2.8, 7),
        new THREE.MeshLambertMaterial({ color: 0x2e6b34 })
      );
      crown.position.set(C.x + ox, 3.0, C.z + oz);
      scene.add(trunk, crown);
    }

    // salidas decorativas este y oeste
    for (const side of [-1, 1]) {
      const stub = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 7),
        new THREE.MeshLambertMaterial({ color: 0x3d4148 })
      );
      stub.rotation.x = -Math.PI / 2;
      stub.position.set(C.x + side * 48, 0.005, C.z);
      scene.add(stub);
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
      if (Math.hypot(x - ROUNDABOUT_CENTER.x, z - ROUNDABOUT_CENTER.z) < 30) continue;
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
      m.position.set(720 + Math.cos(a) * r, h / 2 - 8, 465 + Math.sin(a) * r);
      scene.add(m);
    }
  }
}
