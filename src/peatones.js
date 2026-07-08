// Peatones: cruzan por el paso de cebra (frecuente), por sitios indebidos (raro)
// y pasean por las aceras del pueblo para dar vida a la travesía.
import * as THREE from 'three';

const SHIRT_COLORS = [0xd9534f, 0x3f7fbf, 0x53a058, 0xc9a227, 0x9067b5, 0xd074a4];

export function makePersonMesh() {
  const g = new THREE.Group();
  const shirt = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const legGeo = new THREE.BoxGeometry(0.15, 0.75, 0.15);
  legGeo.translate(0, -0.375, 0); // pivote en la cadera para poder balancearlas
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.09, 0.75, 0);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.09, 0.75, 0);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.55, 0.2),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  torso.position.y = 1.03;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9b38c })
  );
  head.position.y = 1.46;
  g.add(legL, legR, torso, head);
  g.userData = { legL, legR };
  return g;
}

export class PedestrianManager {
  constructor(track, scene) {
    this.track = track;
    this.peds = [];
    for (let i = 0; i < 9; i++) {
      const mesh = makePersonMesh();
      mesh.visible = false;
      scene.add(mesh);
      this.peds.push({ mesh, mode: 'idle', phase: Math.random() * 6, t: 0 });
    }
    this.timers = { cross: 3, jay: 25 };
    this.initStrollers();
  }

  initStrollers() {
    const [u0, u1] = this.track.urbanRange;
    for (let i = 0; i < 4; i++) {
      const p = this.peds[i];
      p.mode = 'stroll';
      p.s = u0 + 60 + Math.random() * (u1 - u0 - 120);
      p.lat = (i % 2 === 0 ? 1 : -1) * (5.6 + Math.random() * 1.2);
      p.dir = Math.random() < 0.5 ? 1 : -1;
      p.mesh.visible = true;
    }
  }

  reset() {
    for (const p of this.peds) { p.mode = 'idle'; p.mesh.visible = false; }
    this.timers = { cross: 3, jay: 25 };
    this.initStrollers();
  }

  freePed() { return this.peds.find((p) => p.mode === 'idle'); }

  spawnCrossing(s, kind) {
    const p = this.freePed();
    if (!p) return;
    const side = Math.random() < 0.5 ? 1 : -1;
    p.mode = kind; // 'cross' | 'jay'
    p.s = s;
    p.latFrom = side * 6.5;
    p.latTo = -side * 6.5;
    p.t = 0;
    p.speed = kind === 'jay' ? 1.6 : 1.15; // el infractor cruza con prisa
    p.mesh.visible = true;
  }

  update(dt) {
    // aparición de peatones
    this.timers.cross -= dt;
    if (this.timers.cross <= 0) {
      this.spawnCrossing(this.track.crosswalkS, 'cross');
      this.timers.cross = 7 + Math.random() * 9;
    }
    this.timers.jay -= dt;
    if (this.timers.jay <= 0) {
      if (!this.peds.some((p) => p.mode === 'jay')) {
        const [u0, u1] = this.track.urbanRange;
        let s = 0, guard = 0;
        do {
          s = u0 + 50 + Math.random() * (u1 - u0 - 100);
        } while (guard++ < 20 &&
          (Math.abs(s - this.track.crosswalkS) < 50 || Math.abs(s - this.track.stopS) < 50));
        this.spawnCrossing(s, 'jay');
      }
      this.timers.jay = 22 + Math.random() * 26;
    }

    for (const p of this.peds) {
      if (p.mode === 'idle') continue;
      p.phase += dt * 6.5;
      const swing = Math.sin(p.phase) * 0.55;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;

      if (p.mode === 'stroll') {
        p.s += p.dir * 0.75 * dt;
        const [u0, u1] = this.track.urbanRange;
        if (p.s < u0 + 40 || p.s > u1 - 40) p.dir *= -1;
        const { pos, tan, right } = this.track.poseAt(p.s);
        p.mesh.position.set(pos.x + right.x * p.lat, pos.y, pos.z + right.z * p.lat);
        p.mesh.rotation.y = Math.atan2(tan.x * p.dir, tan.z * p.dir);
        p.lastLat = p.lat;
      } else {
        // cruce perpendicular a la vía
        const { pos, right } = this.track.poseAt(p.s);
        const span = Math.abs(p.latTo - p.latFrom);
        p.t += (dt * p.speed) / span;
        const lat = p.latFrom + (p.latTo - p.latFrom) * Math.min(1, p.t);
        p.lastLat = lat;
        p.mesh.position.set(pos.x + right.x * lat, pos.y, pos.z + right.z * lat);
        const dirSign = Math.sign(p.latTo - p.latFrom);
        p.mesh.rotation.y = Math.atan2(right.x * dirSign, right.z * dirSign);
        if (p.t >= 1) { p.mode = 'idle'; p.mesh.visible = false; }
      }
    }
  }

  // ¿hay alguien sobre la calzada en el paso de cebra?
  crosswalkBusy() {
    return this.peds.some(
      (p) => p.mode === 'cross' && Math.abs(p.lastLat ?? 99) < 4.4
    );
  }

  // peatones actualmente sobre la calzada (para colisiones)
  onRoad() {
    return this.peds.filter(
      (p) => (p.mode === 'cross' || p.mode === 'jay') && Math.abs(p.lastLat ?? 99) < 4.6
    );
  }
}
