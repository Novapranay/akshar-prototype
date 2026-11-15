// Ink: a canvas you draw on with mouse, finger or stylus.
// The engine only sees a stream of points, so a hardware board can feed it later.
class Ink {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({ color: '#fff', width: 8, erase: false }, opts);
    this.strokes = [];
    this.cur = null;
    this.w = 0; this.h = 0;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', e => this.down(e));
    canvas.addEventListener('pointermove', e => this.move(e));
    canvas.addEventListener('pointerup', e => this.up(e));
    canvas.addEventListener('pointercancel', e => this.up(e));
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = window.devicePixelRatio || 1;
    if (this.w === r.width && this.h === r.height && this.c.width === Math.round(r.width * dpr)) return;
    // Keep strokes in place relative to the canvas when it is resized.
    this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width; this.h = r.height;
    if (this.o.onResize) this.o.onResize(this);
    this.redraw();
  }
  pos(e) { const r = this.c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  down(e) {
    e.preventDefault();
    const p = this.pos(e);
    if (this.o.onDown && this.o.onDown(p, this) === false) return;
    try { this.c.setPointerCapture(e.pointerId); } catch (_) {}
    this.cur = { pts: [p], color: this.o.color, width: this.o.width, erase: this.o.erase };
    this.strokes.push(this.cur);
    this.redraw();
  }
  move(e) {
    if (!this.cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const p = this.pos(ev);
      const last = this.cur.pts[this.cur.pts.length - 1];
      if (A.dist(p, last) < 1.5) continue;
      this.cur.pts.push(p);
      if (this.o.onMove && this.o.onMove(p, this.cur, this) === false) { this.end(); return; }
    }
    this.redraw();
  }
  up() { if (this.cur) this.end(); }
  end() { const s = this.cur; this.cur = null; if (this.o.onUp) this.o.onUp(s, this); this.redraw(); }
  undo() { this.strokes.pop(); this.redraw(); }
  clear() { this.strokes = []; this.cur = null; this.redraw(); }
  redraw() {
    const x = this.ctx;
    x.clearRect(0, 0, this.w, this.h);
    if (this.o.under) this.o.under(x, this);
    for (const s of this.strokes) Ink.drawStroke(x, s);
    if (this.o.over) this.o.over(x, this);
  }
  static drawStroke(x, s) {
    const p = s.pts;
    x.save();
    x.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    x.globalAlpha = s.alpha == null ? 1 : Math.max(0, s.alpha);
    x.strokeStyle = s.color; x.fillStyle = s.color;
    x.lineWidth = s.width; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    if (p.length === 1) { x.arc(p[0][0], p[0][1], s.width / 2, 0, 7); x.fill(); }
    else {
      x.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length - 1; i++) {
        x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      }
      const l = p[p.length - 1]; x.lineTo(l[0], l[1]); x.stroke();
    }
    x.restore();
  }
}
window.Ink = Ink;
