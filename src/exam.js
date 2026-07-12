// Examinador virtual: detección de infracciones y calificación estilo DGT
// NO APTO con: 1 eliminatoria, 2 deficientes o 10 leves.

// Examinador de ciudad (circulación libre): solo avisos, sin veredicto final.
export class CityExam {
  constructor(notify) {
    this.notify = notify;
    this.faults = [];
    this.cooldowns = {};
    this.timers = { over: 0, overE: 0, wrong: 0 };
    this.approach = null; // { key, minV, committed, control, axis }
    this.inNode = null;   // { node, enterDir } para detectar giros prohibidos
    this.time = 0;
    this.distance = 0;
    this.mode = 'practica';
    this.finished = false;
  }

  fault(kind, key, text, cd = 10) {
    if (this.cooldowns[key] > 0) return;
    this.cooldowns[key] = cd;
    this.faults.push({ kind, text, time: this.time });
    this.notify(kind, text);
  }

  count(kind) { return this.faults.filter((f) => f.kind === kind).length; }

  reportCollision() { this.fault('eliminatoria', 'colision', 'Colisión con otro vehículo', 8); }
  reportRunOver() { this.fault('eliminatoria', 'atropello', 'Atropellar a un peatón', 12); }
  reportPedestrianYield() { this.fault('eliminatoria', 'peaton', 'No ceder el paso a un peatón en el paso de peatones', 12); }

  // dirección cardinal de avance: 0=+X 1=+Z 2=-X 3=-Z (misma convención que el tráfico)
  dirOf(h) {
    const s = Math.sin(h), c = Math.cos(h);
    if (Math.abs(c) >= Math.abs(s)) return c > 0 ? 1 : 3;
    return s > 0 ? 0 : 2;
  }

  // detecta el giro realizado al cruzar una intersección: restricción de giro y
  // uso del intermitente. En este mundo, girar a la izquierda hace crecer heading,
  // por lo que el giro a la izquierda vale 3 (dir-1) y el de la derecha vale 1 (dir+1).
  checkTurn(car, city) {
    const B = city.B;
    const ni = Math.max(0, Math.min(city.NX - 1, Math.round(car.pos.x / B)));
    const nj = Math.max(0, Math.min(city.NZ - 1, Math.round(car.pos.z / B)));
    const nn = city.nodeAt(ni, nj);
    const inBox = Math.abs(car.pos.x - nn.x) < city.roadHalf + 1.2 &&
                  Math.abs(car.pos.z - nn.z) < city.roadHalf + 1.2;
    if (inBox) {
      if (!this.inNode) this.inNode = { node: nn, enterDir: this.dirOf(car.heading), sigL: false, sigR: false };
      if (car.indicator === 'left') this.inNode.sigL = true;
      if (car.indicator === 'right') this.inNode.sigR = true;
    } else if (this.inNode) {
      const turn = (this.dirOf(car.heading) - this.inNode.enterDir + 4) % 4;
      const r = this.inNode.node.restrict;
      if (turn === 3) { // giro a la izquierda
        if (r === 'noLeft') this.fault('deficiente', 'giro', 'Giro prohibido a la izquierda', 12);
        else if (!this.inNode.sigL) this.fault('leve', 'sig', 'No señalizar el giro con el intermitente', 10);
      } else if (turn === 1) { // giro a la derecha
        if (r === 'noRight') this.fault('deficiente', 'giro', 'Giro prohibido a la derecha', 12);
        else if (!this.inNode.sigR) this.fault('leve', 'sig', 'No señalizar el giro con el intermitente', 10);
      }
      this.inNode = null;
    }
  }

  update(car, s, city, dt) {
    this.time += dt;
    this.distance += Math.abs(car.speed) * dt;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

    const kmh = car.kmh, limit = s.limit, over = kmh - limit;

    // velocidad
    if (over > limit * 0.5) {
      this.timers.overE += dt;
      if (this.timers.overE > 1.5) this.fault('eliminatoria', 'vel-e',
        `Velocidad muy superior (${Math.round(kmh)} en zona de ${limit})`, 16);
    } else {
      this.timers.overE = 0;
      if (over > limit * 0.2) { this.timers.over += dt; if (this.timers.over > 2.5)
        this.fault('deficiente', 'vel-d', `Exceso de velocidad (${Math.round(kmh)} en zona de ${limit})`, 12); }
      else if (over > 4) { this.timers.over += dt; if (this.timers.over > 4)
        this.fault('leve', 'vel-l', `Superar el límite de ${limit} km/h`, 12); }
      else this.timers.over = 0;
    }

    // salirse de la calzada / subir a la acera
    if (s.offroad) this.fault('deficiente', 'road', 'Salir de la calzada o subir a la acera', 6);

    // giro prohibido en intersección restringida
    this.checkTurn(car, city);

    // circular por el carril contrario
    if (s.onRoad && s.lat < -0.8 && car.speed > 2) {
      this.timers.wrong += dt;
      if (this.timers.wrong > 2.5) this.fault('deficiente', 'side', 'Circular por el carril contrario', 10);
    } else this.timers.wrong = 0;

    // cruces: semáforo en rojo / STOP
    if (s.node && s.distToNode < 26) {
      const key = `${s.node.i}-${s.node.j}`;
      if (!this.approach || this.approach.key !== key) {
        this.approach = { key, minV: Infinity, committed: false, control: s.node.control, axis: s.axis };
      }
      this.approach.minV = Math.min(this.approach.minV, Math.abs(car.speed));
      if (!this.approach.committed && s.distToNode < city.roadHalf + 1) {
        this.approach.committed = true;
        const minKmh = this.approach.minV * 3.6;
        if (s.node.control === 'light') {
          const st = city.axisState(s.axis);
          if (st === 'red') this.fault('eliminatoria', 'rojo', 'Saltarse un semáforo en rojo', 14);
          else if (st === 'amber' && minKmh > 22)
            this.fault('leve', 'ambar', 'Pasar el semáforo en ámbar sin necesidad', 12);
        } else if (s.axis === 'ew') { // esta bocacalle tiene STOP
          if (minKmh > 8) this.fault('eliminatoria', 'stop', 'No respetar la señal de STOP', 16);
          else if (minKmh > 1.5) this.fault('deficiente', 'stop', 'No detenerse por completo en el STOP', 16);
        }
      }
    }
  }
}

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
    this.rotWindow2 = { active: false, minV: Infinity, done: false };
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

    // ---- Ceda al entrar en la rotonda (dos pasadas) ----
    if (this.track.rotEntryS != null) {
      this.checkWindow(this.rotWindow, s, this.track.rotEntryS, 14, car, () => {
        if (this.rotWindow.minV * 3.6 > 25) {
          this.fault('deficiente', 'rot-d', 'No ceder el paso al entrar en la rotonda', 20);
        }
      });
    }
    if (this.track.rotEntryS2 != null) {
      this.checkWindow(this.rotWindow2, s, this.track.rotEntryS2, 14, car, () => {
        if (this.rotWindow2.minV * 3.6 > 25) {
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
