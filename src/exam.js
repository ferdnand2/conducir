// Examinador virtual: detección de infracciones y calificación estilo DGT
// NO APTO con: 1 eliminatoria, 2 deficientes o 10 leves.

export class Examiner {
  constructor(track, mode, notify) {
    this.track = track;
    this.mode = mode; // 'examen' | 'practica'
    this.notify = notify; // (tipo, texto) => void
    this.faults = [];
    this.cooldowns = {};
    this.timers = { overspeed: 0, overspeedE: 0, wrongside: 0 };
    this.stopWindow = { active: false, minV: Infinity, done: false };
    this.cedaWindow = { active: false, minV: Infinity, done: false };
    this.rotWindow = { active: false, minV: Infinity, done: false };
    this.time = 0;
    this.distance = 0;
    this.finished = false;
  }

  fault(kind, key, text, cd = 10) {
    if (this.cooldowns[key] > 0) return;
    this.cooldowns[key] = cd;
    this.faults.push({ kind, text, time: this.time });
    this.notify(kind, text);
  }

  count(kind) { return this.faults.filter((f) => f.kind === kind).length; }

  get verdict() {
    if (this.count('eliminatoria') >= 1) return false;
    if (this.count('deficiente') >= 2) return false;
    if (this.count('leve') >= 10) return false;
    return true;
  }

  onStall() {
    if (this.faults.filter((f) => f.calado).length >= 2) {
      this.faults.push({ kind: 'eliminatoria', text: 'Calar el motor de forma reiterada', time: this.time, calado: true });
      this.notify('eliminatoria', 'Calar el motor de forma reiterada');
    } else {
      this.faults.push({ kind: 'leve', text: 'Calar el motor', time: this.time, calado: true });
      this.notify('leve', 'Calar el motor');
    }
  }

  reportCollision() {
    this.fault('eliminatoria', 'colision', 'Colisión con otro vehículo', 12);
  }

  reportPedestrianYield() {
    this.fault('eliminatoria', 'peaton', 'No ceder el paso a un peatón en el paso de peatones', 18);
  }

  reportRunOver() {
    this.fault('eliminatoria', 'atropello', 'Atropellar a un peatón', 18);
  }

  reportTailgate() {
    this.fault('leve', 'distancia', 'No guardar la distancia de seguridad', 15);
  }

  update(car, proj, dt) {
    if (this.finished) return;
    this.time += dt;
    this.distance += Math.abs(car.speed) * dt;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

    const { s, lat } = proj;
    const zone = this.track.zoneAt(s);
    const kmh = car.kmh;
    const half = this.track.roadHalf;

    // ---- velocidad ----
    const over = kmh - zone.limit;
    if (over > zone.limit * 0.5) {
      // margen de reacción al cambiar de zona antes de la eliminatoria
      this.timers.overspeedE += dt;
      if (this.timers.overspeedE > 1.5)
        this.fault('eliminatoria', 'vel-e', `Velocidad muy superior a la permitida (${Math.round(kmh)} km/h en zona de ${zone.limit})`, 20);
    } else if (over > zone.limit * 0.2) {
      this.timers.overspeedE = 0;
      this.timers.overspeed += dt;
      if (this.timers.overspeed > 2.5)
        this.fault('deficiente', 'vel-d', `Exceso de velocidad (${Math.round(kmh)} km/h en zona de ${zone.limit})`, 14);
    } else if (over > 4) {
      this.timers.overspeed += dt;
      if (this.timers.overspeed > 4)
        this.fault('leve', 'vel-l', `Superar ligeramente el límite de ${zone.limit} km/h`, 12);
    } else {
      this.timers.overspeed = 0;
      this.timers.overspeedE = 0;
    }

    // ---- posición en la calzada ----
    const absLat = Math.abs(lat);
    if (absLat > half + 2.5) {
      this.fault('eliminatoria', 'road-e', 'Abandonar la calzada', 18);
    } else if (absLat > half + 0.6) {
      this.fault('deficiente', 'road-d', 'Salirse de la vía / invadir el arcén', 10);
    }
    if (lat < -0.6 && car.speed > 2) {
      this.timers.wrongside += dt;
      if (this.timers.wrongside > 2.5)
        this.fault('deficiente', 'side-d', 'Circular por el carril del sentido contrario', 12);
    } else {
      this.timers.wrongside = 0;
    }

    // ---- STOP ----
    const stopS = this.track.stopLineS ?? this.track.stopS;
    this.checkWindow(this.stopWindow, s, stopS, 15, car, () => {
      const minKmh = this.stopWindow.minV * 3.6;
      if (minKmh > 8) {
        this.fault('eliminatoria', 'stop-e', 'No respetar la señal de STOP', 20);
      } else if (minKmh > 1.5) {
        this.fault('deficiente', 'stop-d', 'No detenerse por completo en el STOP', 20);
      }
    });

    // ---- Ceda el paso ----
    this.checkWindow(this.cedaWindow, s, this.track.cedaS, 16, car, () => {
      if (this.cedaWindow.minV * 3.6 > 25) {
        this.fault('deficiente', 'ceda-d', 'No moderar la velocidad en el ceda el paso', 20);
      }
    });

    // ---- Ceda al entrar en la rotonda ----
    if (this.track.rotEntryS != null) {
      this.checkWindow(this.rotWindow, s, this.track.rotEntryS, 14, car, () => {
        if (this.rotWindow.minV * 3.6 > 25) {
          this.fault('deficiente', 'rot-d', 'No ceder el paso al entrar en la rotonda', 20);
        }
      });
    }

    // ---- fin de recorrido (una vuelta) ----
    if (this.mode === 'examen' && this.distance > this.track.length * 0.97 && s < 30) {
      this.finished = true;
    }
  }

  checkWindow(w, s, targetS, span, car, onCross) {
    const L = this.track.length;
    const rel = ((s - targetS) % L + L + L / 2) % L - L / 2; // distancia con signo al objetivo
    if (rel > -span && rel < 0) {
      w.active = true;
      w.minV = Math.min(w.minV, Math.abs(car.speed));
    } else if (w.active && rel >= 0 && rel < 12) {
      if (!w.done) { w.done = true; onCross(); }
      w.active = false;
    } else if (rel > 20 || rel < -span - 10) {
      w.active = false; w.done = false; w.minV = Infinity;
    }
  }
}
