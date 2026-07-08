// Control por teclado: misma interfaz que GestureController
export class KeyboardController {
  constructor() {
    this.keys = {};
    this.steer = 0;
    this.pending = { shiftUp: false, shiftDown: false, indLeft: false, indRight: false };
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.pending.shiftUp = true;
      if (e.code === 'KeyQ') this.pending.shiftDown = true;
      if (e.code === 'KeyZ') this.pending.indLeft = true;
      if (e.code === 'KeyX') this.pending.indRight = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  get ready() { return true; }

  poll(dt) {
    const k = this.keys;
    const target = (k['ArrowLeft'] || k['KeyA'] ? -1 : 0) + (k['ArrowRight'] || k['KeyD'] ? 1 : 0);
    const rate = target === 0 ? 3.5 : 2.2;
    this.steer += (target - this.steer) * Math.min(1, dt * rate);
    if (Math.abs(this.steer) < 0.02 && target === 0) this.steer = 0;

    const out = {
      steer: this.steer,
      throttle: k['ArrowUp'] || k['KeyW'] ? 1 : 0,
      brake: k['ArrowDown'] || k['KeyS'] ? 1 : 0,
      clutch: !!k['KeyC'],
      shiftUp: this.pending.shiftUp,
      shiftDown: this.pending.shiftDown,
      indLeft: this.pending.indLeft,
      indRight: this.pending.indRight,
      tracking: true,
    };
    this.pending = { shiftUp: false, shiftDown: false, indLeft: false, indRight: false };
    return out;
  }
}
