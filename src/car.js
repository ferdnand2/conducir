// Física del vehículo: modelo bicicleta + transmisión manual (embrague, calado) o automática
import * as THREE from 'three';

const WHEELBASE = 2.6;
const IDLE_RPM = 850;
const REDLINE = 6500;
const STALL_RPM = 650;

// rpm del motor por m/s de velocidad, según marcha (índice 1..5; R usa la de 1ª)
const RPM_PER_MS = [0, 340, 190, 125, 90, 68];
// aceleración máxima (m/s²) por marcha a gas a fondo
const GEAR_ACCEL = [0, 4.2, 3.2, 2.4, 1.7, 1.2];

export class Car {
  constructor(transmission) {
    this.transmission = transmission; // 'manual' | 'auto'
    this.pos = new THREE.Vector3();
    this.heading = 0;      // 0 = +Z; girar a la derecha reduce heading
    this.speed = 0;        // m/s, negativo = marcha atrás
    this.gear = transmission === 'auto' ? 1 : 0; // 0=N, -1=R, 1..5
    this.lever = 'D';      // solo automático: R | N | D
    this.engineOn = true;
    this.rpm = IDLE_RPM;
    this.clutchK = transmission === 'auto' ? 1 : 0; // 1 = embragado (transmite)
    this.stallTimer = 0;
    this.restartTimer = 0;
    this.steerAngle = 0;
    this.offroad = false;
    this.slope = 0; // seno de la pendiente en el sentido de la marcha (+ = subida)
    this.indicator = null; // 'left' | 'right' | null
    this.stallCount = 0;
    this.onEvent = () => {}; // 'stall' | 'restart' | 'msg:<texto>'

    this.controls = { steer: 0, throttle: 0, brake: 0, clutch: false };
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  placeAt(pos, heading) {
    this.pos.copy(pos);
    this.heading = heading;
    this.speed = 0;
  }

  setControls(c) {
    this.controls = c;
    if (c.indLeft) this.indicator = this.indicator === 'left' ? null : 'left';
    if (c.indRight) this.indicator = this.indicator === 'right' ? null : 'right';
    if (c.shiftUp) this.shift(1);
    if (c.shiftDown) this.shift(-1);
  }

  shift(dir) {
    if (this.transmission === 'auto') {
      // palanca R/N/D, solo casi parado
      if (Math.abs(this.speed) > 1.2) return;
      const order = ['R', 'N', 'D'];
      const i = order.indexOf(this.lever) + dir;
      if (i >= 0 && i < order.length) this.lever = order[i];
      return;
    }
    if (this.clutchK > 0.3) {
      this.onEvent('msg:Pisa el embrague para cambiar de marcha');
      return;
    }
    const target = this.gear + dir;
    if (target > 5) return;
    if (target < -1) return;
    if (target === -1 && Math.abs(this.speed) > 1) {
      this.onEvent('msg:Detén el coche para engranar la marcha atrás');
      return;
    }
    this.gear = target;
  }

  update(dt) {
    const c = this.controls;
    const v = this.speed;
    const absV = Math.abs(v);

    // ---- dirección (sensible a la velocidad) ----
    const maxSteer = 0.55 / (1 + absV * 0.09);
    const targetSteer = c.steer * maxSteer;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, dt * 8);
    if (absV > 0.05) {
      this.heading -= (v / WHEELBASE) * Math.tan(this.steerAngle) * dt;
    }

    // ---- embrague ----
    if (this.transmission === 'manual') {
      // pisar es casi instantáneo; soltar es progresivo (así se puede dosificar)
      if (c.clutch) this.clutchK = Math.max(0, this.clutchK - dt * 6);
      else this.clutchK = Math.min(1, this.clutchK + dt * 0.9);
    } else {
      this.clutchK = 1;
    }

    // marcha efectiva
    let gear = this.gear;
    if (this.transmission === 'auto') {
      if (this.lever === 'N') gear = 0;
      else if (this.lever === 'R') gear = -1;
      else {
        if (absV < 5.5) gear = 1;
        else if (absV < 11) gear = 2;
        else if (absV < 17) gear = 3;
        else if (absV < 25) gear = 4;
        else gear = 5;
        this.gear = gear;
      }
    }

    const gi = Math.abs(gear); // índice para tablas (R usa 1ª)
    const engaged = this.engineOn && gear !== 0 && this.clutchK > 0.05;

    // ---- rpm por rueda ----
    const wheelRpm = gi > 0 ? absV * RPM_PER_MS[gi] : 0;

    // patinaje asistido en 1ª/R para arrancar (como deslizar el embrague)
    const launching =
      this.transmission === 'manual' && gi === 1 && wheelRpm < IDLE_RPM * 1.25 && c.throttle > 0.15;

    // ---- fuerza motriz ----
    let accel = 0;
    if (engaged && c.throttle > 0.01) {
      const effRpm = launching ? Math.max(wheelRpm, IDLE_RPM + c.throttle * 2500) : wheelRpm;
      let tf = 1;
      if (effRpm < 1100) tf = 0.65;
      else if (effRpm > 6000) tf = Math.max(0, (6800 - effRpm) / 800);
      accel = c.throttle * GEAR_ACCEL[gi] * tf * this.clutchK;
      if (gear === -1) accel = -accel;
    }

    // freno motor
    if (engaged && c.throttle < 0.05 && absV > 0.3) {
      accel -= Math.sign(v) * 0.25 * (RPM_PER_MS[gi] / 68) * this.clutchK * 0.35;
    }

    // gravedad en pendiente: cuesta arriba frena, cuesta abajo empuja (y puede
    // hacer rodar el coche hacia atrás si está parado sin freno)
    accel -= 9.81 * this.slope;

    // ---- resistencias y freno ----
    let resist = 0.0007 * v * v * Math.sign(v) + 0.12 * Math.sign(v) * (absV > 0.1 ? 1 : 0);
    if (this.offroad) resist += Math.sign(v) * 2.8;
    const brake = c.brake * 7.5;

    let newV = v + (accel - resist) * dt;
    if (brake > 0 && absV > 0.01) {
      const dv = brake * dt;
      newV = absV <= dv ? 0 : v - Math.sign(v) * dv;
    }
    // las resistencias no invierten el sentido
    if (Math.sign(newV) !== Math.sign(v) && accel === 0) newV = 0;
    // en pendiente suave el coche se queda quieto (fricción estática)
    if (Math.abs(newV) < 0.06 && c.throttle < 0.02 && Math.abs(this.slope) < 0.045) newV = 0;
    // límites
    if (gear === -1) newV = Math.max(newV, -5);
    this.speed = newV;

    // ---- calado (solo manual) ----
    if (this.transmission === 'manual' && this.engineOn) {
      const stalling =
        gear !== 0 && this.clutchK > 0.65 && wheelRpm < STALL_RPM && !launching;
      if (stalling) {
        this.stallTimer += dt;
        if (this.stallTimer > 0.4) {
          this.engineOn = false;
          this.stallCount++;
          this.onEvent('stall');
        }
      } else {
        this.stallTimer = 0;
      }
    }

    // rearranque: pisar embrague con el motor calado
    if (!this.engineOn) {
      if (this.clutchK < 0.2 || this.transmission === 'auto') {
        this.restartTimer += dt;
        if (this.restartTimer > 0.8) {
          this.engineOn = true;
          this.restartTimer = 0;
          this.onEvent('restart');
        }
      } else {
        this.restartTimer = 0;
      }
    }

    // ---- rpm mostradas ----
    if (!this.engineOn) {
      this.rpm = Math.max(0, this.rpm - dt * 4000);
    } else if (gear === 0 || this.clutchK < 0.1) {
      this.rpm = IDLE_RPM + c.throttle * (REDLINE - IDLE_RPM) * 0.85;
    } else if (launching) {
      this.rpm = Math.max(wheelRpm, IDLE_RPM + c.throttle * 2500);
    } else {
      this.rpm = Math.max(this.clutchK < 0.9 ? IDLE_RPM : 0, wheelRpm);
      if (c.throttle > 0.05) this.rpm = Math.max(this.rpm, IDLE_RPM);
    }

    // ---- posición ----
    const f = this.forward;
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
  }

  get kmh() { return Math.abs(this.speed) * 3.6; }

  get gearLabel() {
    if (this.transmission === 'auto') {
      return this.lever === 'D' ? `D${this.gear}` : this.lever;
    }
    if (this.gear === 0) return 'N';
    if (this.gear === -1) return 'R';
    return String(this.gear);
  }
}
