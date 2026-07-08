import * as THREE from 'three';
import { Track } from './track.js';
import { Car } from './car.js';
import { Examiner } from './exam.js';
import { KeyboardController } from './keyboard.js';
import { GestureController } from './gestures.js';
import { HUD, toast } from './hud.js';
import { TrafficManager } from './traffic.js';
import { PedestrianManager } from './peatones.js';
import { initStudy } from './estudio.js';

// ---------- escena ----------
const container = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ecbe8);
scene.fog = new THREE.Fog(0x9ecbe8, 350, 2800);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 4000);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x5f7a45, 1.0));
const sun = new THREE.DirectionalLight(0xfff2d9, 2.0);
sun.position.set(300, 420, 150);
scene.add(sun);

const track = new Track();
track.buildScene(scene);

const traffic = new TrafficManager(track, scene);
const peds = new PedestrianManager(track, scene);
initStudy();

// capó del coche (referencia visual en primera persona)
const hood = new THREE.Mesh(
  new THREE.BoxGeometry(1.7, 0.12, 1.1),
  new THREE.MeshLambertMaterial({ color: 0x9b1c2e })
);
hood.rotation.order = 'YXZ';
scene.add(hood);

// ---------- estado ----------
const hud = new HUD(document.getElementById('hudCanvas'));
const $ = (id) => document.getElementById(id);
const config = { mode: 'practica', car: 'manual', ctrl: 'gestos' };
let controller = null;
let car = null;
let examiner = null;
let lastS = 0;
let running = false;
let gestures = null;
let collCd = 0;

// selectores del menú
for (const [segId, key] of [['segMode', 'mode'], ['segCar', 'car'], ['segCtrl', 'ctrl']]) {
  $(segId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    config[key] = btn.dataset.v;
    for (const b of $(segId).querySelectorAll('button')) b.classList.toggle('sel', b === btn);
  });
}

$('startBtn').addEventListener('click', startFlow);
$('retryBtn').addEventListener('click', () => { $('results').classList.add('hidden'); beginDrive(); });
$('menuBtn').addEventListener('click', () => { $('results').classList.add('hidden'); showMenu(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && running) showMenu();
});

function showMenu() {
  running = false;
  $('menu').classList.remove('hidden');
  $('examPanel').classList.add('hidden');
  $('previewCanvas').classList.add('hidden');
  $('trackStatus').classList.add('hidden');
  if (gestures) { gestures.dispose(); gestures = null; }
}

async function startFlow() {
  $('menu').classList.add('hidden');
  if (config.ctrl === 'gestos') {
    $('calib').classList.remove('hidden');
    gestures = new GestureController(document.getElementById('cam'));
    controller = gestures;
    try {
      $('calibMsg').textContent = 'Cargando modelo de detección de manos…';
      await gestures.init();
    } catch (err) {
      console.error(err);
      $('calib').classList.add('hidden');
      toast('info', 'No se pudo acceder a la cámara — usando teclado');
      controller = new KeyboardController();
      beginDrive();
      return;
    }
    runCalibration();
  } else {
    controller = new KeyboardController();
    beginDrive();
  }
}

function runCalibration() {
  const ctx = $('calibCanvas').getContext('2d');
  let last = performance.now();
  const step = (t) => {
    if (gestures.state === 'ready') {
      $('calib').classList.add('hidden');
      beginDrive();
      return;
    }
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const p = gestures.pollCalibration(dt);
    gestures.drawPreview(ctx, 640, 480);
    $('calibMsg').textContent =
      gestures.lastHands.length < 2
        ? 'Muestra las DOS manos abiertas a la cámara, como agarrando el volante'
        : p < 1 ? 'Perfecto, mantén las manos quietas…' : '';
    $('calibBarFill').style.width = `${Math.round(p * 100)}%`;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function beginDrive() {
  car = new Car(config.car);
  const start = track.poseAt(8);
  const heading = Math.atan2(start.tan.x, start.tan.z);
  car.placeAt(
    new THREE.Vector3(
      start.pos.x + start.right.x * 1.85, 0,
      start.pos.z + start.right.z * 1.85
    ),
    heading
  );
  lastS = 8;
  traffic.reset();
  peds.reset();
  collCd = 0;

  examiner = new Examiner(track, config.mode, (kind, text) => toast(kind, text));
  car.onEvent = (ev) => {
    if (ev === 'stall') {
      toast('info', 'Motor calado — pisa el embrague para arrancar');
      examiner.onStall();
    } else if (ev === 'restart') {
      toast('info', 'Motor en marcha');
    } else if (ev.startsWith('msg:')) {
      toast('info', ev.slice(4), 2500);
    }
  };

  $('examPanel').classList.remove('hidden');
  $('examTitle').textContent = config.mode === 'examen' ? 'EXAMEN PRÁCTICO' : 'PRÁCTICA LIBRE';
  if (config.ctrl === 'gestos') $('previewCanvas').classList.remove('hidden');

  toast('info', config.mode === 'examen'
    ? 'Comienza el examen: una vuelta completa al circuito. ¡Suerte!'
    : 'Práctica libre: conduce y respeta las señales', 5000);
  if (config.car === 'manual') {
    toast('info', 'Coche manual: embrague + 1ª marcha y acelera suavemente para salir', 6500);
  }
  running = true;
}

function finishExam() {
  running = false;
  const ok = examiner.verdict;
  $('verdictText').textContent = ok ? 'APTO' : 'NO APTO';
  $('verdictText').className = `verdict ${ok ? 'apto' : 'noapto'}`;
  const l = examiner.count('leve'), d = examiner.count('deficiente'), e = examiner.count('eliminatoria');
  $('verdictSub').textContent =
    `${l} leves · ${d} deficientes · ${e} eliminatorias — ` +
    `tiempo ${fmtTime(examiner.time)}`;
  const list = $('faultList');
  list.innerHTML = '';
  if (examiner.faults.length === 0) {
    list.innerHTML = '<div class="fitem">Sin faltas. Conducción impecable 👏</div>';
  }
  const colors = { leve: '#ffd43b', deficiente: '#ff922b', eliminatoria: '#ff6b9d' };
  for (const f of examiner.faults) {
    const el = document.createElement('div');
    el.className = 'fitem';
    el.innerHTML = `<span class="tag" style="color:${colors[f.kind]}">${f.kind}</span>` +
      `<span>${f.text} <span style="color:#66789c">(${fmtTime(f.time)})</span></span>`;
    list.appendChild(el);
  }
  $('results').classList.remove('hidden');
  $('examPanel').classList.add('hidden');
}

const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// estado interno para depuración
window.__state = () => ({
  car: car ? { x: car.pos.x, y: car.pos.y, z: car.pos.z, heading: car.heading } : null,
  lastS,
  cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
});

// gancho de depuración: coloca el coche en un punto s del circuito
window.__teleport = (s) => {
  if (!car) return;
  const p = track.poseAt(s);
  car.placeAt(
    new THREE.Vector3(p.pos.x + p.right.x * 1.85, p.pos.y, p.pos.z + p.right.z * 1.85),
    Math.atan2(p.tan.x, p.tan.z)
  );
  lastS = s;
};

// ---------- bucle principal ----------
const previewCtx = $('previewCanvas').getContext('2d');
let lastT = performance.now();

function frame(t) {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  if (running && car) {
    const c = controller.poll(dt);
    car.setControls(c);

    const proj = track.project(car.pos, lastS);
    lastS = proj.s;
    car.offroad = Math.abs(proj.lat) > track.roadHalf + 0.4;

    // pendiente y altura de la carretera en este punto
    const tpose = track.poseAt(proj.s);
    const fwd = car.forward;
    const dirSign = fwd.x * tpose.tan.x + fwd.z * tpose.tan.z >= 0 ? 1 : -1;
    car.slope = tpose.tan.y * dirSign;
    car.pos.y = tpose.pos.y; // altura exacta de la rasante: nunca por debajo del asfalto

    car.update(dt);
    examiner.update(car, proj, dt);

    // peatones y tráfico
    peds.update(dt);
    const cwBusy = peds.crosswalkBusy();
    traffic.update(dt, { s: proj.s, lat: proj.lat, speed: car.speed }, cwBusy);
    collCd = Math.max(0, collCd - dt);

    // ceder el paso en el paso de cebra
    const dCw = ((track.crosswalkS - proj.s) % track.length + track.length) % track.length;
    if (cwBusy && dCw < 16 && car.speed > 2.2) {
      examiner.reportPedestrianYield();
    }
    // atropello (paso de cebra o cruce indebido)
    for (const p of peds.onRoad()) {
      const pdx = p.mesh.position.x - car.pos.x;
      const pdz = p.mesh.position.z - car.pos.z;
      if (pdx * pdx + pdz * pdz < 1.4 * 1.4) {
        examiner.reportRunOver();
        car.speed *= 0.3;
      }
    }
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    for (const tc of traffic.cars) {
      const dx = tc.mesh.position.x - car.pos.x;
      const dz = tc.mesh.position.z - car.pos.z;
      const df = dx * fwd.x + dz * fwd.z;
      const dr = dx * right.x + dz * right.z;
      if (Math.abs(df) < 3.9 && Math.abs(dr) < 1.75 && collCd === 0) {
        collCd = 6;
        examiner.reportCollision();
        car.speed *= -0.2;
      }
      if (tc.dir === 1 && car.speed > 9) {
        const gap = ((tc.s - proj.s) % track.length + track.length) % track.length;
        if (gap > 4 && gap < car.speed * 0.7 && Math.abs(proj.lat - 1.85) < 1.5) {
          examiner.reportTailgate();
        }
      }
    }

    // cámara cenital de depuración
    if (window.__camTop) {
      camera.position.set(car.pos.x, car.pos.y + window.__camTop, car.pos.z);
      camera.lookAt(car.pos.x + fwd.x, 0, car.pos.z + fwd.z);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
      return;
    }
    // cámara en primera persona (conductor a la izquierda)
    camera.position.set(
      car.pos.x + right.x * -0.35 - fwd.x * 0.3,
      car.pos.y + 1.25,
      car.pos.z + right.z * -0.35 - fwd.z * 0.3
    );
    const aheadY = track.poseAt((proj.s + dirSign * 30 + track.length) % track.length).pos.y;
    camera.lookAt(
      car.pos.x + fwd.x * 30,
      aheadY + 0.9,
      car.pos.z + fwd.z * 30
    );
    hood.position.set(car.pos.x + fwd.x * 1.5, car.pos.y + 0.82, car.pos.z + fwd.z * 1.5);
    hood.rotation.y = car.heading;
    hood.rotation.x = -Math.asin(Math.max(-0.5, Math.min(0.5, car.slope)));

    // HUD
    const zone = track.zoneAt(proj.s);
    hud.draw(car, zone.limit, dt);
    if (config.ctrl === 'gestos') {
      gestures.drawPreview(previewCtx, 320, 240);
      $('trackStatus').classList.toggle('hidden', c.tracking);
    }

    // panel del examen
    $('examTime').textContent = fmtTime(examiner.time);
    $('examProg').textContent = `${Math.min(100, Math.round((examiner.distance / track.length) * 100))}%`;
    $('cntLeve').textContent = examiner.count('leve');
    $('cntDef').textContent = examiner.count('deficiente');
    $('cntElim').textContent = examiner.count('eliminatoria');

    if (examiner.finished) finishExam();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
