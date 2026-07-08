// Tráfico: vehículos que circulan por el circuito en ambos sentidos.
// Respetan límites, frenan en el STOP, ceden en la rotonda y reaccionan al jugador.
import * as THREE from 'three';

const COLORS = [0x2f6df6, 0xe8e8e8, 0x2b2b2b, 0xc0392b, 0x8395a7, 0xf1c40f];

export function makeCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.55, 4.1),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 0.58;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.5, 1.9),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 })
  );
  cabin.position.set(0, 1.08, -0.25);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x161616 });
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.32, wz);
    g.add(w);
  }
  return g;
}

export class TrafficManager {
  constructor(track, scene) {
    this.track = track;
    this.cars = [];
    const defs = [
      { s: 160, dir: 1 }, { s: 700, dir: 1 }, { s: 1600, dir: 1 },
      { s: 900, dir: -1 }, { s: 2200, dir: -1 }, { s: 3500, dir: -1 },
    ];
    defs.forEach((d, i) => {
      const mesh = makeCarMesh(COLORS[i % COLORS.length]);
      scene.add(mesh);
      this.cars.push({ s: d.s, s0: d.s, dir: d.dir, speed: 0, mesh });
    });
  }

  reset() {
    for (const c of this.cars) { c.s = c.s0; c.speed = 0; }
  }

  update(dt, player, crosswalkBusy = false) {
    const T = this.track, L = T.length;
    for (const c of this.cars) {
      const zone = T.zoneAt(c.s);
      let target = Math.min((zone.limit / 3.6) * 0.8, T.speedCapAt(c.s) * 0.85);

      if (c.dir === 1) {
        // frena ante el STOP
        const dStop = ((T.stopLineS - c.s) % L + L) % L;
        if (dStop < 45) target = Math.min(target, Math.max(1.2, (dStop - 4) * 0.3));
        // cede ante peatones en el paso de cebra
        if (crosswalkBusy) {
          const dCw = ((T.crosswalkS - c.s) % L + L) % L;
          if (dCw < 28) target = Math.min(target, Math.max(0, (dCw - 6) * 0.35));
        }
        // modera al entrar en la rotonda
        const dRot = ((T.rotEntryS - c.s) % L + L) % L;
        if (dRot < 30) target = Math.min(target, 5.5);
        // no embiste al jugador si lo tiene delante en su carril
        if (player) {
          const gap = ((player.s - c.s) % L + L) % L;
          if (gap < 45 && Math.abs(player.lat - 1.85) < 1.8) {
            if (gap < 12) target = 0;
            else target = Math.min(target, Math.max(0, player.speed - (30 - gap) * 0.08));
          }
        }
      } else {
        // el sentido contrario no puede recorrer la rotonda al revés: la salta
        if (c.s < T.rotExitS + 10 && c.s > T.rotEntryS - 30) c.s = T.rotEntryS - 30;
      }

      const dv = target - c.speed;
      c.speed = Math.max(0, c.speed + Math.max(-5.5 * dt, Math.min(2.2 * dt, dv)));
      c.s = ((c.s + c.dir * c.speed * dt) % L + L) % L;

      const pose = T.poseAt(c.s);
      const lane = 1.85 * c.dir; // su carril derecho
      c.mesh.position.set(
        pose.pos.x + pose.right.x * lane,
        pose.pos.y,
        pose.pos.z + pose.right.z * lane
      );
      c.mesh.rotation.y = Math.atan2(pose.tan.x, pose.tan.z) + (c.dir === -1 ? Math.PI : 0);
    }
  }
}
