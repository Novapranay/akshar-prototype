// Writing coach. Four stages per letter:
//   0 👀 watch the firefly write it
//   1 ✨ trace along a trail of stars from a pulsing start dot
//   2 ☝️ trace with only the start dot and a faint letter
//   3 ✏️ write it alone next to the model
// Feedback happens during the stroke: wrong start, wrong direction or leaving the path
// makes the ink fade and the dot pulse again from the last good point. No red crosses.
(() => {
  const cv = document.getElementById('writeCanvas');
  const strip = document.getElementById('letterStrip');
  const bar = document.getElementById('stageBar');
  const btnReplay = document.getElementById('wReplay');
  const btnClear = document.getElementById('wClear');
  const btnDone = document.getElementById('wDone');
  const btnNext = document.getElementById('wNext');
  const starBox = document.getElementById('starBurst');
  const ICONS = ['👀', '✨', '☝️', '✏️'];

  let idx = 0, L = null, model = null;
  let stage = 0, si = 0, prog = 0, stars = [];
  let devSum = 0, devN = 0, offs = 0, strokeOffs = 0, fails = 0;
  const geo = { s: 60, ox: 0, oy: 0, rx: 0 };
  let anim = null, reveal = null, shakeT = 0, evalT = 0, advanceT = 0, raf = 0;
  const progress = A.store.get('writing', {});

  const ink = new Ink(cv, { color: '#ffffff', width: 10, onDown, onMove, onUp, under, over, onResize: layout });

  const toPx = (u, ox = geo.ox) => [ox + u[0] * geo.s, geo.oy + u[1] * geo.s];
  const toU = (p, ox = geo.ox) => [(p[0] - ox) / geo.s, (p[1] - geo.oy) / geo.s];
  const isDot = st => A.pathLen(st) < 0.08;

  function layout(I = ink) {
    if (!L || !I.w) return;
    const zones = stage === 3 ? 2 : 1;
    const s = Math.min(I.h / 3.5, (I.w * 0.9) / (zones * (L.w + 0.5)));
    geo.s = s;
    geo.oy = (I.h - 3 * s) / 2;
    const zw = I.w / zones;
    geo.ox = (zw - L.w * s) / 2;
    geo.rx = zones === 2 ? zw + (zw - L.w * s) / 2 : geo.ox;
    I.o.width = Math.max(6, s * 0.11);
  }

  // ---------- drawing ----------
  function path(x, pts, ox, color, width) {
    if (!pts.length) return;
    x.strokeStyle = color; x.fillStyle = color; x.lineWidth = width; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    const p0 = toPx(pts[0], ox);
    if (pts.length === 1 || isDot(pts)) { x.arc(p0[0], p0[1], width / 2, 0, 7); x.fill(); return; }
    x.moveTo(p0[0], p0[1]);
    for (let i = 1; i < pts.length; i++) { const p = toPx(pts[i], ox); x.lineTo(p[0], p[1]); }
    x.stroke();
  }
  const drawModel = (x, ox, color, width) => model.forEach(st => path(x, st, ox, color, width));

  function under(x, I) {
    if (!L) return;
    const w = I.w;
    x.save();
    [[0, 'rgba(255,255,255,.16)', [6, 8]], [1, 'rgba(120,200,255,.45)', [10, 8]], [2, 'rgba(255,130,130,.65)', []], [3, 'rgba(255,255,255,.16)', [6, 8]]].forEach(([y, c, d]) => {
      x.strokeStyle = c; x.lineWidth = 2; x.setLineDash(d);
      x.beginPath(); x.moveTo(12, geo.oy + y * geo.s); x.lineTo(w - 12, geo.oy + y * geo.s); x.stroke();
    });
    x.setLineDash([]);
    const thick = Math.max(12, geo.s * 0.3);
    if (stage === 3) {
      drawModel(x, geo.ox, 'rgba(255,255,255,.9)', Math.max(6, geo.s * 0.11));
      x.strokeStyle = 'rgba(255,255,255,.15)'; x.setLineDash([4, 10]);
      x.beginPath(); x.moveTo(w / 2, 10); x.lineTo(w / 2, I.h - 10); x.stroke(); x.setLineDash([]);
    } else {
      drawModel(x, geo.ox, stage === 2 ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.15)', stage === 2 ? thick * 0.7 : thick);
      if (stage > 0) {
        for (let k = 0; k < Math.min(si, model.length); k++) path(x, model[k], geo.ox, 'rgba(255,209,102,.55)', thick * 0.55);
        if (si < model.length && prog > 0) path(x, model[si].slice(0, prog + 1), geo.ox, 'rgba(255,209,102,.55)', thick * 0.55);
      }
    }
    x.restore();
  }

  function star(x, cx, cy, r, color) {
    x.fillStyle = color; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    x.closePath(); x.fill();
  }

  function over(x) {
    if (!L) return;
    if (reveal && stage === 3) drawModel(x, geo.rx + reveal.dx, 'rgba(6,214,160,.85)', Math.max(5, geo.s * 0.08));
    if (anim) { drawFirefly(x); return; }
    if ((stage === 1 || stage === 2) && si < model.length) {
      const st = model[si], t = performance.now() / 1000;
      if (stage === 1) stars.forEach(k => { if (k > prog) { const p = toPx(st[k]); star(x, p[0], p[1], geo.s * 0.08 + 4, '#ffe066'); } });
      const sp = toPx(st[prog]);
      const sh = performance.now() - shakeT < 400 ? Math.sin(performance.now() / 25) * 7 : 0;
      const r = geo.s * 0.1 + 6 + Math.sin(t * 6) * 3;
      x.fillStyle = 'rgba(6,214,160,.3)'; x.beginPath(); x.arc(sp[0] + sh, sp[1], r * 1.7, 0, 7); x.fill();
      x.fillStyle = '#06d6a0'; x.beginPath(); x.arc(sp[0] + sh, sp[1], r * 0.7, 0, 7); x.fill();
      // little arrow showing which way to go
      if (!isDot(st)) {
        const a2 = toPx(st[Math.min(st.length - 1, prog + 4)]);
        if (A.dist(a2, sp) > 2) {
          const ang = Math.atan2(a2[1] - sp[1], a2[0] - sp[0]);
          x.save(); x.translate(sp[0] + sh, sp[1]); x.rotate(ang); x.fillStyle = '#ffffff';
          const R = r * 1.9; x.beginPath(); x.moveTo(R + 12, 0); x.lineTo(R, -8); x.lineTo(R, 8); x.closePath(); x.fill(); x.restore();
        }
      }
    }
  }

  // ---------- firefly demo ----------
  function playDemo(indices, done) {
    anim = { indices, lens: indices.map(i => Math.max(A.pathLen(model[i]), 0.05)), t0: performance.now(), done };
  }
  function drawFirefly(x) {
    const speed = 1.3; // units per second
    let t = (performance.now() - anim.t0) / 1000;
    x.save(); x.shadowColor = '#ffe066'; x.shadowBlur = 18;
    for (let j = 0; j < anim.indices.length; j++) {
      const st = model[anim.indices[j]], draw = anim.lens[j] / speed, dur = draw + 0.35;
      if (t >= dur) { path(x, st, geo.ox, 'rgba(255,224,102,.9)', geo.s * 0.13); t -= dur; continue; }
      const k = Math.max(1, Math.round(Math.min(1, t / draw) * (st.length - 1)));
      path(x, st.slice(0, k + 1), geo.ox, 'rgba(255,224,102,.9)', geo.s * 0.13);
      const hp = toPx(st[Math.min(k, st.length - 1)]);
      x.fillStyle = '#fff7c2'; x.beginPath(); x.arc(hp[0], hp[1], geo.s * 0.1 + 5, 0, 7); x.fill();
      x.restore();
      return;
    }
    x.restore();
    const d = anim.done; anim = null; if (d) d();
  }

  // ---------- tracing ----------
  function setupStars() {
    stars = [];
    if (si < model.length && !isDot(model[si])) for (let k = 3; k < model[si].length; k += 4) stars.push(k);
  }

  function onDown(p) {
    if (anim || stage === 0) return false;
    if (stage === 3) { if (reveal) return false; clearTimeout(evalT); return true; }
    if (si >= model.length) return false;
    const st = model[si];
    const sp = toPx(st[prog]);
    if (A.dist(p, sp) > Math.max(28, geo.s * 0.32)) { shakeT = performance.now(); A.sfx.oops(); return false; }
    if (isDot(st)) { completeStroke(); return false; }
    return true;
  }

  function onMove(p, s) {
    if (stage !== 1 && stage !== 2) return;
    const st = model[si];
    if (!st) return false;
    const tol = Math.max(24, geo.s * 0.28);
    const look = Math.round(0.45 / A.SPACING);
    let best = -1, bd = 1e9;
    for (let k = Math.max(0, prog - 2); k <= Math.min(st.length - 1, prog + look); k++) {
      const d = A.dist(p, toPx(st[k])); if (d < bd) { bd = d; best = k; }
    }
    devSum += bd / geo.s; devN++;
    if (bd > tol * 1.5) { // left the path: fade the ink, keep the progress made so far
      offs++; strokeOffs++;
      s.fade = true; A.sfx.oops();
      if (stage === 2 && strokeOffs >= 2) { strokeOffs = 0; playDemo([si], null); } // replay just this stroke
      return false;
    }
    if (bd <= tol && best > prog) {
      const old = prog; prog = best;
      if (stage === 1 && stars.some(k => k > old && k <= prog)) A.sfx.star();
    }
    if (prog >= st.length - 2) { completeStroke(); return false; }
  }

  function onUp() {
    if (stage === 3) {
      clearTimeout(evalT);
      if (ink.strokes.filter(s => !s.fade).length >= model.length) evalT = setTimeout(evaluate, 1500);
    }
  }

  function completeStroke() {
    si++; prog = 0; strokeOffs = 0; A.sfx.pop();
    if (si >= model.length) finishTrace(); else setupStars();
  }

  function finishTrace() {
    const avg = devN ? devSum / devN : 0;
    const n = avg < 0.12 && offs === 0 ? 3 : avg < 0.2 && offs <= 2 ? 2 : 1;
    A.sfx.good(); showStars(n); save(stage, n);
    const s = stage;
    advanceT = setTimeout(() => { if (stage === s) setStage(stage + 1); }, 1700);
  }

  // ---------- writing alone: compare shape with the model ----------
  function evaluate() {
    clearTimeout(evalT);
    if (stage !== 3 || reveal) return;
    const strokes = ink.strokes.filter(s => !s.fade);
    let pts = [];
    strokes.forEach(s => s.pts.forEach(p => pts.push(toU(p, geo.rx))));
    if (pts.length < 4) return;
    const all = [].concat(...model);
    const cx = a => { let mn = 1e9, mx = -1e9; for (const p of a) { mn = Math.min(mn, p[0]); mx = Math.max(mx, p[0]); } return (mn + mx) / 2; };
    const dx = cx(all) - cx(pts);
    pts = pts.map(p => [p[0] + dx, p[1]]).filter((_, i) => i % 2 === 0);
    const ch = (X, Y) => { let t = 0; for (const p of X) { let m = 1e9; for (const q of Y) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < m) m = d; } t += Math.sqrt(m); } return t / X.length; };
    const score = (ch(pts, all) + ch(all, pts)) / 2;
    const n = score < 0.12 ? 3 : score < 0.2 ? 2 : score < 0.32 ? 1 : 0;
    reveal = { dx: -dx * geo.s }; // show the model on top of the child's letter
    if (n > 0) {
      A.sfx.good(); showStars(n); A.celebrate(); save(3, n); fails = 0;
      advanceT = setTimeout(() => select(idx + 1), 2600);
    } else {
      A.sfx.oops(); fails++;
      advanceT = setTimeout(() => {
        if (fails >= 2) { fails = 0; setStage(2); } // more help again
        else { reveal = null; ink.clear(); }
      }, 2600);
    }
  }

  function showStars(n) {
    starBox.textContent = '⭐'.repeat(n);
    starBox.classList.remove('show'); void starBox.offsetWidth; starBox.classList.add('show');
  }

  function save(stageDone, n) {
    const p = progress[L.id] || { stage: 0, stars: 0 };
    p.stage = Math.max(p.stage, stageDone + 1);
    if (stageDone === 3) p.stars = Math.max(p.stars, n);
    progress[L.id] = p;
    A.store.set('writing', progress);
    const b = strip.querySelector(`[data-i="${idx}"] .stars`);
    if (b) b.textContent = '★'.repeat(p.stars);
  }

  // ---------- flow ----------
  function setStage(n) {
    clearTimeout(evalT); clearTimeout(advanceT);
    stage = n; si = 0; prog = 0; devSum = 0; devN = 0; offs = 0; strokeOffs = 0;
    reveal = null; anim = null;
    ink.clear(); layout(); setupStars(); renderBar();
    btnDone.hidden = stage !== 3;
    if (stage === 0) playDemo(model.map((_, i) => i), () => { advanceT = setTimeout(() => { if (stage === 0) setStage(1); }, 600); });
  }

  function select(i) {
    idx = (i + A.LETTERS.length) % A.LETTERS.length;
    L = A.LETTERS[idx]; model = A.letterModel(L); fails = 0;
    strip.querySelectorAll('.lt').forEach(b => b.classList.toggle('on', +b.dataset.i === idx));
    const on = strip.querySelector('.lt.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    setStage(0);
  }

  function renderBar() {
    bar.innerHTML = '';
    ICONS.forEach((ic, k) => {
      if (k) bar.appendChild(A.el('span', 'stage-line'));
      const b = A.el('button', 'stage-dot' + (k === stage ? ' on' : k < stage ? ' done' : ''), ic);
      b.onclick = () => setStage(k);
      bar.appendChild(b);
    });
  }

  function buildStrip() {
    let lastGroup = null;
    A.LETTERS.forEach((l, i) => {
      if (lastGroup && l.group !== lastGroup) strip.appendChild(A.el('span', 'strip-gap'));
      lastGroup = l.group;
      const b = A.el('button', 'lt');
      b.dataset.i = i;
      b.setAttribute('aria-label', 'Letter');
      const c = A.el('canvas'); b.appendChild(c);
      b.appendChild(A.el('span', 'stars', '★'.repeat((progress[l.id] || {}).stars || 0)));
      b.onclick = () => { A.sfx.pop(); select(i); };
      strip.appendChild(b);
      requestAnimationFrame(() => A.drawThumb(c, l));
    });
  }

  function fadeTick() {
    let changed = false;
    ink.strokes.forEach(s => { if (s.fade) { s.alpha = (s.alpha == null ? 1 : s.alpha) - 0.05; changed = true; } });
    if (changed) ink.strokes = ink.strokes.filter(s => !s.fade || s.alpha > 0);
  }
  function loop() { fadeTick(); ink.redraw(); raf = requestAnimationFrame(loop); }

  btnReplay.onclick = () => { if (stage === 3) return; playDemo(model.map((_, i) => i), null); };
  btnClear.onclick = () => setStage(stage);
  btnDone.onclick = () => evaluate();
  btnNext.onclick = () => select(idx + 1);

  A.writing = { letters: () => A.LETTERS, progress: () => progress };
  A.screens.write = {
    enter() {
      ink.resize();
      if (!strip.children.length) buildStrip();
      if (!L) select(0); else layout();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    },
    leave() { cancelAnimationFrame(raf); clearTimeout(evalT); clearTimeout(advanceT); anim = null; },
  };
})();
