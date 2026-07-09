// Retrovisores: central + dos laterales.
// Cada uno renderiza la escena desde una cámara que mira hacia atrás a un
// render-target, y se dibuja en un recuadro superpuesto, invertido en
// horizontal (como un espejo real) mediante una escena ortográfica.
import * as THREE from 'three';

export class MirrorSystem {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.enabled = true;

    const mkRT = (w, h) => {
      const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      return rt;
    };

    // yaw = giro respecto a "mirar recto hacia atrás" (+ izquierda); lat = offset lateral de la cámara
    this.defs = [
      { key: 'center', rt: mkRT(640, 176), fov: 42, yaw: 0.0, lat: 0.0, pitch: -0.05,
        layout: (W, H) => { const w = Math.min(430, W * 0.32); return { w, h: w * 176 / 640, cx: W / 2, cyTop: 12 }; } },
      { key: 'left', rt: mkRT(300, 216), fov: 48, yaw: 0.44, lat: -0.85, pitch: -0.12,
        layout: (W, H) => { const w = Math.min(184, W * 0.145); return { w, h: w * 216 / 300, cx: w * 0.5 + 22, cyTop: H * 0.30 }; } },
      { key: 'right', rt: mkRT(300, 216), fov: 48, yaw: -0.44, lat: 0.85, pitch: -0.12,
        layout: (W, H) => { const w = Math.min(184, W * 0.145); return { w, h: w * 216 / 300, cx: W - (w * 0.5 + 22), cyTop: H * 0.30 }; } },
    ];

    // escena ortográfica de superposición (coordenadas en píxeles CSS, origen abajo-izquierda)
    this.overlay = new THREE.Scene();
    this.oc = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);

    // plano unidad con las UV invertidas en horizontal (efecto espejo)
    const glassGeo = new THREE.PlaneGeometry(1, 1);
    const uv = glassGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
    const frameGeo = new THREE.PlaneGeometry(1, 1);

    for (const d of this.defs) {
      d.cam = new THREE.PerspectiveCamera(d.fov, d.rt.width / d.rt.height, 0.1, 4000);
      d.frame = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial(
        { color: 0x0d1119, depthTest: false, depthWrite: false }));
      d.frame.renderOrder = 0;
      d.glass = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial(
        { map: d.rt.texture, depthTest: false, depthWrite: false }));
      d.glass.renderOrder = 1;
      this.overlay.add(d.frame, d.glass);
    }

    this.layout(window.innerWidth, window.innerHeight);
  }

  setEnabled(v) {
    this.enabled = v;
    for (const d of this.defs) { d.frame.visible = v; d.glass.visible = v; }
  }

  layout(W, H) {
    this.oc.left = 0; this.oc.right = W; this.oc.top = H; this.oc.bottom = 0;
    this.oc.updateProjectionMatrix();
    const border = 5;
    for (const d of this.defs) {
      const L = d.layout(W, H);
      const cy = H - (L.cyTop + L.h / 2); // convierte "desde arriba" a centro en Y hacia arriba
      d.glass.position.set(L.cx, cy, 0);
      d.glass.scale.set(L.w, L.h, 1);
      d.frame.position.set(L.cx, cy, -0.01);
      d.frame.scale.set(L.w + border * 2, L.h + border * 2, 1);
    }
  }

  // renderiza los render-targets y superpone los espejos sobre la vista principal ya dibujada
  render(car) {
    if (!this.enabled) return;
    const r = this.renderer;
    const h = car.heading;
    const rightV = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h)); // perpendicular derecha
    const eye = new THREE.Vector3(car.pos.x, car.pos.y + 1.35, car.pos.z);

    for (const d of this.defs) {
      const a = h + Math.PI + d.yaw; // dirección: hacia atrás + giro del espejo
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const camPos = eye.clone().addScaledVector(rightV, d.lat);
      d.cam.position.copy(camPos);
      d.cam.lookAt(
        camPos.x + dir.x * 30,
        camPos.y + d.pitch * 30,
        camPos.z + dir.z * 30
      );
      r.setRenderTarget(d.rt);
      r.render(this.scene, d.cam);
    }
    r.setRenderTarget(null);

    const prevAutoClear = r.autoClear;
    r.autoClear = false;
    r.clearDepth();
    r.render(this.overlay, this.oc);
    r.autoClear = prevAutoClear;
  }
}
