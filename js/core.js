// Shared helpers: storage, sound, speech, geometry, screens.
// Everything runs locally in the browser. Nothing is sent anywhere.
const A = (window.A = {});

A.store = {
  get(k, d) { try { const v = localStorage.getItem('akshar:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('akshar:' + k, JSON.stringify(v)); } catch (e) {} },
};

A.muted = A.store.get('muted', false);
A.voiceLang = A.store.get('lang', 'en-IN');

// ---------- sound ----------
let actx;
A.tone = (freq, dur = 0.15, type = 'sine', vol = 0.15, when = 0) => {
  if (A.muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
};
A.sfx = {
  star() { A.tone(880, 0.12, 'triangle'); A.tone(1320, 0.15, 'triangle', 0.12, 0.07); },
  good() { [523, 659, 784, 1047].forEach((f, i) => A.tone(f, 0.22, 'triangle', 0.15, i * 0.09)); },
  oops() { A.tone(240, 0.16, 'sine', 0.1); A.tone(200, 0.2, 'sine', 0.08, 0.1); },
  pop() { A.tone(620, 0.07, 'triangle', 0.1); },
  chomp() { A.tone(170, 0.08, 'sawtooth', 0.07); A.tone(130, 0.08, 'sawtooth', 0.07, 0.09); },
};

// Spoken counting so children who cannot read yet still get the numbers.
A.say = (text, queue = false) => {
  if (A.muted || !window.speechSynthesis) return;
  try {
    if (!queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = A.voiceLang;
    const want = A.voiceLang.slice(0, 2).toLowerCase();
    const v = speechSynthesis.getVoices().find(v => (v.lang || '').toLowerCase().startsWith(want));
    if (v) u.voice = v;
    u.rate = 0.95; u.pitch = 1.2;
    speechSynthesis.speak(u);
  } catch (e) {}
};

// ---------- small utils ----------
A.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
A.sleep = ms => new Promise(r => setTimeout(r, ms));
A.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

A.celebrate = (emojis = ['⭐', '🌟', '✨', '🎉']) => {
  const box = document.getElementById('celebrate');
  for (let i = 0; i < 26; i++) {
    const s = A.el('span', null, emojis[i % emojis.length]);
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 0.4 + 's';
    s.style.fontSize = 22 + Math.random() * 30 + 'px';
    box.appendChild(s);
    setTimeout(() => s.remove(), 2600);
  }
};

// ---------- geometry ----------
A.dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
A.pathLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += A.dist(pts[i - 1], pts[i]); return L; };

// Resample a polyline to n evenly spaced points.
A.resample = (pts, n) => {
  if (pts.length < 2 || A.pathLen(pts) === 0) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const I = A.pathLen(pts) / (n - 1);
  const src = pts.map(p => [p[0], p[1]]);
  const out = [src[0].slice()];
  let D = 0;
  for (let i = 1; i < src.length; i++) {
    const d = A.dist(src[i - 1], src[i]);
    if (d > 0 && D + d >= I) {
      const t = (I - D) / d;
      const q = [src[i - 1][0] + t * (src[i][0] - src[i - 1][0]), src[i - 1][1] + t * (src[i][1] - src[i - 1][1])];
      out.push(q); src.splice(i, 0, q); D = 0;
    } else D += d;
  }
  while (out.length < n) out.push(src[src.length - 1].slice());
  return out.slice(0, n);
};

// Smooth Catmull-Rom curve through control points.
A.spline = (ctrl, seg = 14) => {
  if (ctrl.length === 2) {
    const out = [];
    for (let i = 0; i <= seg; i++) { const t = i / seg; out.push([ctrl[0][0] + t * (ctrl[1][0] - ctrl[0][0]), ctrl[0][1] + t * (ctrl[1][1] - ctrl[0][1])]); }
    return out;
  }
  if (ctrl.length < 2) return ctrl.map(p => p.slice());
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
};

// A letter is strokes -> segments -> control points. Segments join with sharp corners.
// Returns strokes as evenly spaced point lists (units: 1 = gap between ruled lines).
const modelCache = {};
A.SPACING = 0.035;
A.letterModel = letter => {
  if (modelCache[letter.id]) return modelCache[letter.id];
  const m = letter.strokes.map(stroke => {
    let pts = [];
    stroke.forEach((seg, k) => { const sp = A.spline(seg); if (k > 0) sp.shift(); pts = pts.concat(sp); });
    const n = Math.max(2, Math.round(A.pathLen(pts) / A.SPACING) + 1);
    return A.resample(pts, n);
  });
  return (modelCache[letter.id] = m);
};

A.drawThumb = (cv, letter, color = '#ffffff') => {
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth || 64, H = cv.clientHeight || 50;
  cv.width = W * dpr; cv.height = H * dpr;
  const x = cv.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = A.letterModel(letter);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  m.forEach(st => st.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }));
  const s = Math.min((W - 12) / (x1 - x0 || 1), (H - 12) / (y1 - y0 || 1));
  const ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s;
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
  m.forEach(st => {
    x.beginPath();
    if (A.pathLen(st) < 0.08) { x.arc(ox + st[0][0] * s, oy + st[0][1] * s, 2.5, 0, 7); x.fill(); return; }
    x.moveTo(ox + st[0][0] * s, oy + st[0][1] * s);
    st.forEach(p => x.lineTo(ox + p[0] * s, oy + p[1] * s));
    x.stroke();
  });
};

// ---------- screens ----------
A.screens = {};
A.current = 'home';
A.show = id => {
  const prev = A.screens[A.current];
  if (prev && prev.leave) prev.leave();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  A.current = id;
  document.body.dataset.screen = id;
  const nx = A.screens[id];
  if (nx && nx.enter) requestAnimationFrame(() => nx.enter());
};
