import * as THREE from 'three';
import { Track } from './track.js';
import { Car } from './car.js';
import { Examiner } from './exam.js';
import { KeyboardController } from './keyboard.js';
import { GestureController } from './gestures.js';
import { HUD, toast } from './hud.js';
import { TrafficManager } from './traffic.js';
import { PedestrianManager } from './peatones.js';
import { MirrorSystem } from './mirrors.js';
import { Minimap } from './minimap.js';
import { City } from './city.js';
import { CityTraffic, CityPedestrians } from './citylife.js';
import { CityExam } from './exam.js';
import { initStudy } from './estudio.js';
import { Weather } from './weather.js';

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
  mirrors.layout(window.innerWidth, window.innerHeight);
});

const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5f7a45, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d9, 2.0);
sun.position.set(300, 420, 150);
scene.add(sun);

// faros del coche (se encienden de noche/niebla)
const headlight = new THREE.SpotLight(0xfff2cc, 0, 60, Math.PI * 0.24, 0.5, 1.1);
scene.add(headlight);
scene.add(headlight.target);
let nightMode = false;

// mapa rural (circuito) dentro de un grupo para poder ocultarlo
const ruralGroup = new THREE.Group();
scene.add(ruralGroup);
const track = new Track();
track.buildScene(ruralGroup);
const traffic = new TrafficManager(track, ruralGroup);
const peds = new PedestrianManager(track, ruralGroup);

// mapa ciudad (cuadrícula) en su propio grupo, oculto al principio
const cityGroup = new THREE.Group();
cityGroup.visible = false;
scene.add(cityGroup);
const city = new City();
city.buildScene(cityGroup);
const cityTraffic = new CityTraffic(city, cityGroup);
const cityPeds = new CityPedestrians(city, cityGroup);

// ---------- portales entre mundos ----------
function makePortal(width, height, color) {
  const g = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x272b34 });
  const postGeo = new THREE.BoxGeometry(0.9, height, 0.9);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(sx * width / 2, height / 2, 0); g.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 1.8, 1.1, 0.9), postMat);
  beam.position.set(0, height + 0.1, 0); g.add(beam);
  // superficie luminosa translúcida
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  glow.position.set(0, height / 2 + 0.5, 0); g.add(glow);
  // marco luminoso
  const frameMat = new THREE.MeshBasicMaterial({ color });
  const vGeo = new THREE.BoxGeometry(0.34, height, 0.34);
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(vGeo, frameMat);
    b.position.set(sx * width / 2, height / 2 + 0.5, 0.32); g.add(b);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.34), frameMat);
  top.position.set(0, height + 0.5, 0.32); g.add(top);
  return g;
}

// portal de la ciudad: nodo superior central (avenida central, extremo norte)
const CITY_PORTAL_X = 2 * city.B;
const CITY_PORTAL_Z = city.maxZ;
const cityPortal = makePortal(2 * city.roadHalf, 6.5, 0x8b5cff);
cityPortal.position.set(CITY_PORTAL_X, 0, CITY_PORTAL_Z + 2.5);
cityGroup.add(cityPortal);

// portal del circuito rural: al final de un ramal lateral que sale del trazado
const SPUR_S = 40;      // punto del trazado del que arranca el ramal
const SPUR_LEN = 32;    // longitud del ramal
const SPUR_HALF = 4.5;  // media anchura del ramal
const spurPose = track.poseAt(SPUR_S);
// lado que apunta hacia afuera del circuito (según el centroide del trazado)
let _cx = 0, _cz = 0, _n = 0;
for (let i = 0; i < track.samples.length; i += 5) { _cx += track.samples[i].x; _cz += track.samples[i].z; _n++; }
_cx /= _n || 1; _cz /= _n || 1;
const outSign = (spurPose.pos.x - _cx) * spurPose.right.x + (spurPose.pos.z - _cz) * spurPose.right.z >= 0 ? 1 : -1;
const SPUR_DIR = new THREE.Vector3(spurPose.right.x * outSign, 0, spurPose.right.z * outSign).normalize();
const SPUR_START = new THREE.Vector3(spurPose.pos.x, spurPose.pos.y, spurPose.pos.z);
const RURAL_PORTAL_POS = SPUR_START.clone().addScaledVector(SPUR_DIR, SPUR_LEN);
{
  const g = new THREE.Group();
  g.position.set(SPUR_START.x, SPUR_START.y + 0.02, SPUR_START.z);
  g.rotation.y = Math.atan2(SPUR_DIR.x, SPUR_DIR.z);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * SPUR_HALF, SPUR_LEN + 6),
    new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, SPUR_LEN / 2 - 2);
  g.add(road);
  ruralGroup.add(g);
  const p = makePortal(2 * SPUR_HALF + 1, 6.5, 0x39d98a);
  p.position.set(RURAL_PORTAL_POS.x, RURAL_PORTAL_POS.y, RURAL_PORTAL_POS.z);
  p.rotation.y = Math.atan2(-SPUR_DIR.x, -SPUR_DIR.z); // de cara al que llega por el ramal
  ruralGroup.add(p);
}

const mirrors = new MirrorSystem(renderer, scene);
const minimap = new Minimap(document.getElementById('miniCanvas'));
const weather = new Weather(scene, sun, hemi);
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
const config = { mode: 'practica', car: 'manual', ctrl: 'gestos', map: 'rural', weather: 'dia' };
let controller = null;
let car = null;
let examiner = null;
let lastS = 0;
let running = false;
let gestures = null;
let collCd = 0;
let transitionCd = 0; // margen tras cruzar un portal para no re-disparar
let seatbelt = false;

function fastenBelt() {
  if (!running || seatbelt) return;
  seatbelt = true;
  toast('info', 'Cinturón abrochado ✔');
}

// selectores del menú
for (const [segId, key] of [['segMap', 'map'], ['segMode', 'mode'], ['segCar', 'car'], ['segCtrl', 'ctrl'], ['segWeather', 'weather']]) {
  $(segId).addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    config[key] = btn.dataset.v;
    for (const b of $(segId).querySelectorAll('button')) b.classList.toggle('sel', b === btn);
  });
}

// sensibilidad de los gestos (deslizadores 1..10 → 0..1)
config.sensSteer = 0.4;
config.sensThrottle = 0.4;
const sensLabel = (v) => (v <= 3 ? 'Baja' : v <= 5 ? 'Media' : v <= 7 ? 'Alta' : 'Muy alta');
for (const [id, key, valId] of [
  ['sensSteer', 'sensSteer', 'sensSteerVal'],
  ['sensThrottle', 'sensThrottle', 'sensThrottleVal'],
]) {
  const el = $(id);
  const apply = () => {
    const v = Number(el.value);
    config[key] = (v - 1) / 9;
    $(valId).textContent = sensLabel(v);
    if (gestures) gestures.setSensitivity({ steer: config.sensSteer, throttle: config.sensThrottle });
  };
  el.addEventListener('input', apply);
  apply();
}

$('startBtn').addEventListener('click', startFlow);
$('retryBtn').addEventListener('click', () => { $('results').classList.add('hidden'); beginDrive(); });
$('menuBtn').addEventListener('click', () => { $('results').classList.add('hidden'); showMenu(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && running) showMenu();
  if (e.code === 'KeyB' && running) fastenBelt();
});

function showMenu() {
  running = false;
  $('menu').classList.remove('hidden');
  $('examPanel').classList.add('hidden');
  $('previewCanvas').classList.add('hidden');
  $('miniCanvas').classList.add('hidden');
  $('trackStatus').classList.add('hidden');
  if (gestures) { gestures.dispose(); gestures = null; }
}

async function startFlow() {
  $('menu').classList.add('hidden');
  if (config.ctrl === 'gestos') {
    $('calib').classList.remove('hidden');
    gestures = new GestureController(document.getElementById('cam'));
    gestures.setSensitivity({ steer: config.sensSteer, throttle: config.sensThrottle });
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

// Configura el mundo (rural/ciudad) reposicionando el coche. `entry` opcional:
//   ciudad → { pos, heading } ; rural → { s?, pos?, heading? }
function configureMap(map, entry) {
  const isCity = map === 'city';
  config.map = map;
  ruralGroup.visible = !isCity;
  cityGroup.visible = isCity;

  if (isCity) {
    car.placeAt(entry ? entry.pos : city.startPos.clone(), entry ? entry.heading : city.startHeading);
    car.slope = 0; car.pos.y = 0;
    cityTraffic.reset();
    cityPeds.reset();
    examiner = new CityExam((kind, text) => toast(kind, text));
    lastS = 0;
    minimap.portal = { x: CITY_PORTAL_X, z: CITY_PORTAL_Z };
    minimap.spur = null;
  } else {
    const s = entry && entry.s != null ? entry.s : 8;
    const start = track.poseAt(s);
    const heading = entry ? entry.heading : Math.atan2(start.tan.x, start.tan.z);
    const pos = entry && entry.pos ? entry.pos
      : new THREE.Vector3(start.pos.x + start.right.x * track.laneOut, start.pos.y, start.pos.z + start.right.z * track.laneOut);
    car.placeAt(pos, heading);
    lastS = s;
    traffic.reset();
    peds.reset();
    examiner = new Examiner(track, config.mode, (kind, text) => toast(kind, text));
    minimap.portal = { x: RURAL_PORTAL_POS.x, z: RURAL_PORTAL_POS.z };
    minimap.spur = [{ x: SPUR_START.x, z: SPUR_START.z }, { x: RURAL_PORTAL_POS.x, z: RURAL_PORTAL_POS.z }];
  }

  $('examTitle').textContent = isCity
    ? 'PRÁCTICA · CIUDAD'
    : config.mode === 'examen' ? 'EXAMEN PRÁCTICO' : 'PRÁCTICA LIBRE';
  $('progRow').classList.toggle('hidden', isCity);
  minimap.setWorld(isCity ? 'city' : 'rural', isCity ? city : track);
}

function beginDrive() {
  car = new Car(config.car);
  car.onEvent = (ev) => {
    if (ev === 'stall') {
      toast('info', 'Motor calado — pisa el embrague para arrancar');
      if (examiner.onStall) examiner.onStall();
    } else if (ev === 'restart') {
      toast('info', 'Motor en marcha');
    } else if (ev.startsWith('msg:')) {
      toast('info', ev.slice(4), 2500);
    }
  };
  collCd = 0;
  transitionCd = 0;
  seatbelt = false;
  nightMode = weather.apply(config.weather);
  configureMap(config.map, null);

  $('examPanel').classList.remove('hidden');
  $('miniCanvas').classList.remove('hidden');
  if (config.ctrl === 'gestos') $('previewCanvas').classList.remove('hidden');

  if (config.map === 'city') {
    toast('info', 'Ciudad libre: circula por donde quieras, respeta semáforos, stops y señales', 5500);
    toast('info', '🌀 Sube por la avenida central hasta el portal del norte para pasar al circuito rural', 6800);
  } else {
    toast('info', config.mode === 'examen'
      ? 'Comienza el examen: una vuelta completa al circuito. ¡Suerte!'
      : 'Práctica libre: conduce y respeta las señales', 5000);
    if (config.mode !== 'examen')
      toast('info', '🌀 Cruza el portal verde del circuito para volver a la ciudad', 6800);
  }
  if (config.car === 'manual') {
    toast('info', 'Coche manual: embrague + 1ª marcha y acelera suavemente para salir', 6500);
  }
  running = true;
}

// cambia de mundo al cruzar un portal, conservando el mismo coche
function portalTo(map, entry) {
  transitionCd = 3;
  config.mode = 'practica'; // viajar por portal es siempre práctica libre
  configureMap(map, entry);
  collCd = 0;
  toast('info', map === 'city'
    ? '🌀 Portal cruzado: bienvenido a la ciudad'
    : '🌀 Portal cruzado: circuito rural', 4200);
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
  car: car ? { x: car.pos.x, y: car.pos.y, z: car.pos.z, heading: car.heading, speed: car.speed } : null,
  lastS,
  map: config.map,
  cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
});

// gancho de depuración: coloca el coche en coordenadas del mundo (para la ciudad)
window.__tp = (x, z, h = 0) => { if (car) { car.placeAt(new THREE.Vector3(x, 0, z), h); lastS = 0; } };

// ganchos de depuración
window.__trackLen = () => track.length;
window.__spur = () => ({ sx: SPUR_START.x, sz: SPUR_START.z, dx: SPUR_DIR.x, dz: SPUR_DIR.z, len: SPUR_LEN, px: RURAL_PORTAL_POS.x, pz: RURAL_PORTAL_POS.z });
window.__lat = () => (car && config.map === 'rural' ? track.project(car.pos, lastS).lat : null);
// navegación de prueba: rumbo hacia un punto de mira en el carril exterior
window.__nav = () => {
  if (!car || config.map !== 'rural') return null;
  const proj = track.project(car.pos, lastS);
  const look = track.poseAt(proj.s + 16);
  const tx = look.pos.x + look.right.x * track.laneOut;
  const tz = look.pos.z + look.right.z * track.laneOut;
  return { desired: Math.atan2(tx - car.pos.x, tz - car.pos.z), lat: proj.lat, s: proj.s, speed: car.speed, heading: car.heading };
};

// gancho de depuración: coloca el coche en un punto s del circuito
window.__teleport = (s) => {
  if (!car) return;
  const p = track.poseAt(s);
  car.placeAt(
    new THREE.Vector3(p.pos.x + p.right.x * track.laneOut, p.pos.y, p.pos.z + p.right.z * track.laneOut),
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
    transitionCd = Math.max(0, transitionCd - dt);

    let worldLimit = 50, aheadY = 0;
    if (config.map === 'city') {
      const sample = city.sampleRoad(car.pos, car.heading);
      car.offroad = sample.offroad;
      car.slope = 0;
      car.pos.y = 0;
      car.update(dt);
      city.update(dt);
      examiner.update(car, sample, city, dt);
      worldLimit = sample.limit;

      let jumped = false;
      if (transitionCd === 0 && car.pos.z > CITY_PORTAL_Z + 2 && car.forward.z > 0.2 &&
          Math.abs(car.pos.x - CITY_PORTAL_X) < city.roadHalf + 2) {
        portalTo('rural', null);
        jumped = true;
      }

      // tráfico y peatones urbanos
      if (!jumped) {
      cityTraffic.update(dt, { x: car.pos.x, z: car.pos.z });
      cityPeds.update(dt);
      collCd = Math.max(0, collCd - dt);
      const fC = car.forward;
      const rC = new THREE.Vector3(-fC.z, 0, fC.x);
      for (const tc of cityTraffic.cars) {
        const dx = tc.mesh.position.x - car.pos.x, dz = tc.mesh.position.z - car.pos.z;
        const df = dx * fC.x + dz * fC.z, dr = dx * rC.x + dz * rC.z;
        if (Math.abs(df) < 3.9 && Math.abs(dr) < 1.8 && collCd === 0) {
          collCd = 6; examiner.reportCollision(); car.speed *= -0.15;
        }
      }
      for (const p of cityPeds.onRoad()) {
        const pdx = p.curX - car.pos.x, pdz = p.curZ - car.pos.z;
        const along = pdx * fC.x + pdz * fC.z;
        const lateral = Math.abs(pdx * rC.x + pdz * rC.z);
        if (pdx * pdx + pdz * pdz < 1.6 * 1.6) { examiner.reportRunOver(); car.speed *= 0.3; }
        else if (along > 0 && along < 14 && lateral < 3 && car.speed > 2.2) {
          examiner.reportPedestrianYield();
        }
      }
      } // fin if (!jumped)
    } else {
      const proj = track.project(car.pos, lastS);
      lastS = proj.s;

      // ¿circula por el ramal lateral que lleva al portal?
      const rx = car.pos.x - SPUR_START.x, rz = car.pos.z - SPUR_START.z;
      const along = rx * SPUR_DIR.x + rz * SPUR_DIR.z;
      const side = Math.abs(-rx * SPUR_DIR.z + rz * SPUR_DIR.x);
      const onSpur = along > 2 && along < SPUR_LEN + 6 && side < SPUR_HALF + 1.5;

      // cruzar el portal del final del ramal → ciudad
      let jumped = false;
      if (transitionCd === 0 && config.mode !== 'examen') {
        const ddx = car.pos.x - RURAL_PORTAL_POS.x, ddz = car.pos.z - RURAL_PORTAL_POS.z;
        if (ddx * ddx + ddz * ddz < 5.5 * 5.5) {
          portalTo('city', {
            pos: new THREE.Vector3(CITY_PORTAL_X + city.lane, 0, CITY_PORTAL_Z - 6),
            heading: Math.PI,
          });
          jumped = true;
        }
      }

      if (!jumped && onSpur) {
        // ramal: calzada plana, sin examinador ni tráfico
        car.offroad = false;
        car.slope = 0;
        car.pos.y = SPUR_START.y;
        car.update(dt);
        worldLimit = 50;
        aheadY = SPUR_START.y;
      } else if (!jumped) {
        car.offroad = Math.abs(proj.lat) > track.roadHalf + 0.4;

        // pendiente y altura de la carretera en este punto
        const tpose = track.poseAt(proj.s);
        const f0 = car.forward;
        const dirSign = f0.x * tpose.tan.x + f0.z * tpose.tan.z >= 0 ? 1 : -1;
        car.slope = tpose.tan.y * dirSign;
        car.pos.y = tpose.pos.y; // altura exacta de la rasante: nunca por debajo del asfalto

        car.update(dt);
        examiner.update(car, proj, dt);

        // peatones y tráfico
        peds.update(dt);
        const cwBusy = peds.crosswalkBusy();
        traffic.update(dt, { s: proj.s, lat: proj.lat, speed: car.speed }, cwBusy);
        collCd = Math.max(0, collCd - dt);

        const dCw = ((track.crosswalkS - proj.s) % track.length + track.length) % track.length;
        if (cwBusy && dCw < 16 && car.speed > 2.2) examiner.reportPedestrianYield();

        const fR = car.forward;
        const rR = new THREE.Vector3(-fR.z, 0, fR.x);
        for (const p of peds.onRoad()) {
          const pdx = p.mesh.position.x - car.pos.x, pdz = p.mesh.position.z - car.pos.z;
          if (pdx * pdx + pdz * pdz < 1.4 * 1.4) { examiner.reportRunOver(); car.speed *= 0.3; }
        }
        for (const tc of traffic.cars) {
          const dx = tc.mesh.position.x - car.pos.x, dz = tc.mesh.position.z - car.pos.z;
          const df = dx * fR.x + dz * fR.z, dr = dx * rR.x + dz * rR.z;
          if (Math.abs(df) < 3.9 && Math.abs(dr) < 1.75 && collCd === 0) {
            collCd = 6; examiner.reportCollision(); car.speed *= -0.2;
          }
          if (tc.dir === 1 && car.speed > 9) {
            const gap = ((tc.s - proj.s) % track.length + track.length) % track.length;
            if (gap > 4 && gap < car.speed * 0.7 && Math.abs(proj.lat - track.laneOut) < 1.8) examiner.reportTailgate();
          }
        }
        worldLimit = track.zoneAt(proj.s).limit;
        aheadY = track.poseAt((proj.s + dirSign * 30 + track.length) % track.length).pos.y;
      }
    }

    // ---- cámara, capó y HUD (común a ambos mapas) ----
    const fwd = car.forward;
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);

    if (window.__camTop) {
      camera.position.set(car.pos.x, car.pos.y + window.__camTop, car.pos.z);
      camera.lookAt(car.pos.x + fwd.x, 0, car.pos.z + fwd.z);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
      return;
    }
    camera.position.set(
      car.pos.x + right.x * -0.35 - fwd.x * 0.3,
      car.pos.y + 1.25,
      car.pos.z + right.z * -0.35 - fwd.z * 0.3
    );
    camera.lookAt(car.pos.x + fwd.x * 30, aheadY + 0.9, car.pos.z + fwd.z * 30);
    hood.position.set(car.pos.x + fwd.x * 1.5, car.pos.y + 0.82, car.pos.z + fwd.z * 1.5);
    hood.rotation.y = car.heading;
    hood.rotation.x = -Math.asin(Math.max(-0.5, Math.min(0.5, car.slope)));

    // faros y lluvia
    weather.update(dt, camera.position);
    if (nightMode) {
      headlight.intensity = 6;
      headlight.position.set(car.pos.x + fwd.x * 1.2, car.pos.y + 1.0, car.pos.z + fwd.z * 1.2);
      headlight.target.position.set(car.pos.x + fwd.x * 26, car.pos.y - 1, car.pos.z + fwd.z * 26);
    } else {
      headlight.intensity = 0;
    }

    if (!seatbelt && Math.abs(car.speed) > 2) {
      examiner.fault('deficiente', 'cinturon', 'Circular sin el cinturón abrochado', 999);
    }

    hud.draw(car, worldLimit, dt);
    if (config.map === 'city') minimap.render(car, { traffic: cityTraffic.cars, peds: cityPeds.peds });
    else minimap.render(car, { traffic: traffic.cars });
    if (config.ctrl === 'gestos') {
      gestures.drawPreview(previewCtx, 320, 240);
      $('trackStatus').classList.toggle('hidden', c.tracking);
    }

    // panel del examen / práctica
    $('examTime').textContent = fmtTime(examiner.time);
    if (config.map !== 'city') {
      $('examProg').textContent = `${Math.min(100, Math.round((examiner.distance / track.length) * 100))}%`;
    }
    $('cntLeve').textContent = examiner.count('leve');
    $('cntDef').textContent = examiner.count('deficiente');
    $('cntElim').textContent = examiner.count('eliminatoria');

    if (examiner.finished) finishExam();
  }

  renderer.render(scene, camera);
  if (running && car) mirrors.render(car);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
