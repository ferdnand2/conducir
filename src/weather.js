// Clima y hora del día: ajusta cielo, niebla (visibilidad), luces y lluvia.
// Los faros de noche se gestionan en main.js según el flag `night`.
import * as THREE from 'three';

const PRESETS = {
  dia:    { sky: 0x9ecbe8, fog: 0x9ecbe8, near: 350, far: 2800, hemiSky: 0xcfe4ff, hemiGnd: 0x5f7a45, hemiInt: 1.0,  sunCol: 0xfff2d9, sunInt: 2.0,  sunPos: [300, 420, 150],  rain: false, night: false },
  tarde:  { sky: 0xef9a54, fog: 0xf0b070, near: 220, far: 1700, hemiSky: 0xffd9b0, hemiGnd: 0x4a3b2f, hemiInt: 0.7,  sunCol: 0xff8a3d, sunInt: 1.5,  sunPos: [360, 70, -280], rain: false, night: false },
  noche:  { sky: 0x0b1220, fog: 0x0a0f1a, near: 55,  far: 520,  hemiSky: 0x2a3550, hemiGnd: 0x0c1018, hemiInt: 0.26, sunCol: 0x8faad6, sunInt: 0.35, sunPos: [-200, 400, -120], rain: false, night: true },
  lluvia: { sky: 0x6b7683, fog: 0x707a86, near: 110, far: 620,  hemiSky: 0x9aa4b0, hemiGnd: 0x40474e, hemiInt: 0.6,  sunCol: 0xbfc6cf, sunInt: 0.7,  sunPos: [120, 360, 80],  rain: true,  night: false },
  niebla: { sky: 0xc7cdd2, fog: 0xcfd4d8, near: 18,  far: 130,  hemiSky: 0xd6dbe0, hemiGnd: 0x9aa0a4, hemiInt: 0.85, sunCol: 0xdfe4e8, sunInt: 0.9,  sunPos: [200, 380, 120], rain: false, night: false },
};

export class Weather {
  constructor(scene, sun, hemi) {
    this.scene = scene;
    this.sun = sun;
    this.hemi = hemi;
    this.name = 'dia';
    this.night = false;
    this.raining = false;
    this._buildRain();
  }

  _buildRain() {
    const N = 1600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 170;
      pos[i * 3 + 1] = Math.random() * 65;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 170;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xb3c6de, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.rainN = N;
    this.scene.add(this.rain);
  }

  apply(name) {
    const p = PRESETS[name] || PRESETS.dia;
    this.name = name;
    this.night = p.night;
    this.raining = p.rain;

    this.scene.background = new THREE.Color(p.sky);
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(p.fog, p.near, p.far);
    this.scene.fog.color.setHex(p.fog);
    this.scene.fog.near = p.near;
    this.scene.fog.far = p.far;

    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGnd);
    this.hemi.intensity = p.hemiInt;

    this.sun.color.setHex(p.sunCol);
    this.sun.intensity = p.sunInt;
    this.sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);

    this.rain.visible = p.rain;
    return this.night;
  }

  update(dt, cam) {
    if (!this.raining) return;
    const attr = this.rain.geometry.attributes.position;
    const a = attr.array;
    for (let i = 0; i < this.rainN; i++) {
      a[i * 3 + 1] -= dt * 40;
      if (a[i * 3 + 1] < 0) {
        a[i * 3 + 1] += 65;
        a[i * 3] = (Math.random() - 0.5) * 170;
        a[i * 3 + 2] = (Math.random() - 0.5) * 170;
      }
    }
    attr.needsUpdate = true;
    this.rain.position.set(cam.x, cam.y, cam.z); // la nube de lluvia sigue a la cámara
  }
}
