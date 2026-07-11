// Minimapa de guía: vista cenital esquemática (norte arriba) con el trazado
// o la cuadrícula, la posición y orientación del conductor, y el tráfico.
export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.kind = null;
  }

  setWorld(kind, world) {
    this.kind = kind;
    this.world = world;
    const W = this.canvas.width, H = this.canvas.height, M = 10;

    let minx, minz, maxx, maxz;
    if (kind === 'city') {
      const c = world;
      minx = -c.roadHalf - 6; minz = -c.roadHalf - 6;
      maxx = c.maxX + c.roadHalf + 6; maxz = c.maxZ + c.roadHalf + 6;
    } else {
      const t = world;
      minx = minz = Infinity; maxx = maxz = -Infinity;
      for (let i = 0; i < t.samples.length; i += 4) {
        const p = t.samples[i];
        minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
        minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z);
      }
      const pad = 30; minx -= pad; maxx += pad; minz -= pad; maxz += pad;
    }
    this.min = { x: minx, z: minz };
    const spanX = maxx - minx, spanZ = maxz - minz;
    this.scale = Math.min((W - 2 * M) / spanX, (H - 2 * M) / spanZ);
    this.offX = M + (W - 2 * M - spanX * this.scale) / 2;
    this.offY = M + (H - 2 * M - spanZ * this.scale) / 2;
    this.spanX = spanX; this.spanZ = spanZ;

    // precomputa geometría estática
    if (kind === 'city') {
      const c = world;
      this.streets = [];
      for (let i = 0; i < c.NX; i++)
        this.streets.push([this.pc(i * c.B, -c.roadHalf), this.pc(i * c.B, c.maxZ + c.roadHalf)]);
      for (let j = 0; j < c.NZ; j++)
        this.streets.push([this.pc(-c.roadHalf, j * c.B), this.pc(c.maxX + c.roadHalf, j * c.B)]);
      this.streetW = Math.max(2.5, this.scale * c.roadHalf * 1.6);
    } else {
      const t = world;
      this.trackPath = [];
      for (let i = 0; i <= t.samples.length; i += 3) {
        const p = t.samples[i % t.samples.length];
        this.trackPath.push(this.pc(p.x, p.z));
      }
      this.trackW = Math.max(3, this.scale * t.roadHalf * 1.7);
    }
  }

  // world (x,z) → canvas [px,py]. Norte (+Z) arriba y, como la derecha del
  // conductor es -X, se invierte el eje X para que izquierda/derecha coincidan.
  pc(x, z) {
    return [this.offX + (this.spanX - (x - this.min.x)) * this.scale,
      this.offY + (this.spanZ - (z - this.min.z)) * this.scale];
  }

  render(car, opts = {}) {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141a26';
    ctx.fillRect(0, 0, W, H);

    if (this.kind === 'city') {
      const c = this.world;
      // zona 30
      const a = this.pc(c.zona30.x0, c.zona30.z1), b = this.pc(c.zona30.x1, c.zona30.z0);
      ctx.fillStyle = 'rgba(230,120,60,0.16)';
      ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
      // calles
      ctx.strokeStyle = '#3f4855'; ctx.lineWidth = this.streetW; ctx.lineCap = 'round';
      for (const [p, q] of this.streets) {
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      // cruces: verde = semáforo, naranja = stop; anillo magenta = giro restringido
      for (const n of c.nodes) {
        const p = this.pc(n.x, n.z);
        ctx.fillStyle = n.control === 'light' ? '#4dd06a' : '#e0763a';
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fill();
        if (n.restrict) {
          ctx.strokeStyle = '#e879f9'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p[0], p[1], 4.4, 0, Math.PI * 2); ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = '#3f4855'; ctx.lineWidth = this.trackW; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      this.trackPath.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }

    // tráfico
    if (opts.traffic) {
      ctx.fillStyle = '#ffd43b';
      for (const t of opts.traffic) {
        const p = this.pc(t.mesh.position.x, t.mesh.position.z);
        ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // peatones
    if (opts.peds) {
      ctx.fillStyle = '#7cd9ff';
      for (const p0 of opts.peds) {
        if (p0.active === false) continue;
        const px = p0.curX ?? p0.mesh?.position.x, pz = p0.curZ ?? p0.mesh?.position.z;
        if (px == null) continue;
        const p = this.pc(px, pz);
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // portal a otro mundo: rombo luminoso
    if (this.portal) {
      const q = this.pc(this.portal.x, this.portal.z);
      ctx.save();
      ctx.translate(q[0], q[1]); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#b98bff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.strokeStyle = '#efe3ff'; ctx.lineWidth = 1.4;
      ctx.strokeRect(-4, -4, 8, 8);
      ctx.restore();
    }

    // conductor: flecha orientada
    const p = this.pc(car.pos.x, car.pos.z);
    // eje X invertido en pc → la componente X de la dirección también se invierte
    const dx = -Math.sin(car.heading), dy = -Math.cos(car.heading);
    const px = -dy, py = dx; // perpendicular
    ctx.beginPath();
    ctx.moveTo(p[0] + dx * 8, p[1] + dy * 8);
    ctx.lineTo(p[0] - dx * 5 + px * 5, p[1] - dy * 5 + py * 5);
    ctx.lineTo(p[0] - dx * 5 - px * 5, p[1] - dy * 5 - py * 5);
    ctx.closePath();
    ctx.fillStyle = '#37d24a'; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#eafff0'; ctx.stroke();
  }
}
