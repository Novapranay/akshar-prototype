// On-device handwritten digit reader ($P point-cloud recogniser).
// Templates are drawn from stroke recipes, so no training data or network is needed.
// It is deliberately simple: good enough for a prototype; number tiles are the fallback.
(() => {
  const N = 32;

  // digit -> variants; variant -> strokes; stroke -> segments; segment -> control points (0..1 box, y down)
  const R = {
    0: [[[[[0.5, 0], [0.15, 0.25], [0.15, 0.75], [0.5, 1], [0.85, 0.75], [0.85, 0.25], [0.5, 0]]]]],
    1: [[[[[0.5, 0], [0.5, 1]]]], [[[[0.22, 0.25], [0.55, 0]], [[0.55, 0], [0.55, 1]]]], [[[[0.22, 0.25], [0.55, 0]], [[0.55, 0], [0.55, 1]]], [[[0.2, 1], [0.85, 1]]]]],
    2: [[[[[0.12, 0.25], [0.45, 0], [0.82, 0.18], [0.75, 0.48], [0.12, 1]], [[0.12, 1], [0.9, 1]]]]],
    3: [[[[[0.15, 0.12], [0.55, 0], [0.82, 0.2], [0.5, 0.48]], [[0.5, 0.48], [0.85, 0.72], [0.55, 1], [0.12, 0.88]]]],
        [[[[0.15, 0.12], [0.55, 0], [0.82, 0.2], [0.5, 0.48], [0.85, 0.72], [0.55, 1], [0.12, 0.88]]]]],
    4: [[[[[0.65, 0], [0.1, 0.68]], [[0.1, 0.68], [0.92, 0.68]]], [[[0.68, 0.3], [0.68, 1]]]],
        [[[[0.2, 0], [0.15, 0.6]], [[0.15, 0.6], [0.9, 0.6]]], [[[0.7, 0], [0.7, 1]]]]],
    5: [[[[[0.25, 0], [0.2, 0.45]], [[0.2, 0.45], [0.6, 0.38], [0.85, 0.68], [0.55, 1], [0.12, 0.88]]], [[[0.25, 0], [0.85, 0]]]],
        [[[[0.85, 0], [0.25, 0]], [[0.25, 0], [0.2, 0.45]], [[0.2, 0.45], [0.6, 0.38], [0.85, 0.68], [0.55, 1], [0.12, 0.88]]]]],
    6: [[[[[0.75, 0], [0.35, 0.2], [0.15, 0.62], [0.4, 1], [0.82, 0.8], [0.72, 0.5], [0.3, 0.52], [0.17, 0.7]]]]],
    7: [[[[[0.1, 0], [0.9, 0]], [[0.9, 0], [0.4, 1]]]], [[[[0.1, 0], [0.9, 0]], [[0.9, 0], [0.4, 1]]], [[[0.35, 0.5], [0.85, 0.5]]]]],
    8: [[[[[0.6, 0.05], [0.5, 0], [0.2, 0.2], [0.5, 0.48], [0.8, 0.75], [0.5, 1], [0.2, 0.75], [0.5, 0.48], [0.8, 0.2], [0.55, 0]]]]],
    9: [[[[[0.8, 0.2], [0.5, 0], [0.2, 0.2], [0.3, 0.45], [0.65, 0.42], [0.8, 0.2]], [[0.8, 0.2], [0.78, 1]]]],
        [[[[0.8, 0.2], [0.5, 0], [0.2, 0.2], [0.3, 0.45], [0.65, 0.42], [0.8, 0.2]], [[0.8, 0.2], [0.75, 0.7], [0.5, 1]]]]],
  };

  function cloud(strokes) {
    const lens = strokes.map(A.pathLen);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let out = [];
    strokes.forEach((s, i) => {
      const k = Math.max(2, Math.round((N * lens[i]) / total));
      A.resample(s.length > 1 ? s : [s[0], s[0]], k).forEach(p => out.push(p));
    });
    out = Array.from({ length: N }, (_, j) => out[Math.floor((j * out.length) / N)]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, cx = 0, cy = 0;
    out.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const sc = Math.max(x1 - x0, y1 - y0) || 1;
    out = out.map(p => [(p[0] - x0) / sc, (p[1] - y0) / sc]);
    out.forEach(p => { cx += p[0]; cy += p[1]; });
    cx /= N; cy /= N;
    return out.map(p => [p[0] - cx, p[1] - cy]);
  }

  function cloudDist(a, b, start) {
    const matched = new Array(N).fill(false);
    let sum = 0, i = start;
    do {
      let idx = -1, min = Infinity;
      for (let j = 0; j < N; j++) if (!matched[j]) { const d = Math.hypot(a[i][0] - b[j][0], a[i][1] - b[j][1]); if (d < min) { min = d; idx = j; } }
      matched[idx] = true;
      sum += (1 - ((i - start + N) % N) / N) * min;
      i = (i + 1) % N;
    } while (i !== start);
    return sum;
  }
  const match = (a, b) => { let m = Infinity; const step = Math.floor(Math.sqrt(N)); for (let i = 0; i < N; i += step) m = Math.min(m, cloudDist(a, b, i), cloudDist(b, a, i)); return m; };

  // Build templates with small slants and widths, like real children's digits.
  const TEMPLATES = [];
  const tf = [p => p, p => [p[0] + (p[1] - 0.5) * -0.18, p[1]], p => [p[0] + (p[1] - 0.5) * 0.18, p[1]], p => [0.5 + (p[0] - 0.5) * 0.7, p[1]]];
  Object.keys(R).forEach(d => R[d].forEach(variant => tf.forEach(f => {
    const strokes = variant.map(stroke => { let pts = []; stroke.forEach((seg, k) => { const sp = A.spline(seg.map(f), 10); if (k) sp.shift(); pts = pts.concat(sp); }); return pts; });
    TEMPLATES.push({ d, pts: cloud(strokes) });
  })));

  function readDigit(strokes) {
    const c = cloud(strokes);
    let best = null, bs = Infinity;
    for (const t of TEMPLATES) { const s = match(c, t.pts); if (s < bs) { bs = s; best = t.d; } }
    return best;
  }

  // Split the slate's strokes into digits by horizontal position, then read each.
  A.readNumber = strokesPts => {
    const strokes = strokesPts.filter(s => s.length > 1 && A.pathLen(s) > 4);
    if (!strokes.length) return '';
    const boxes = strokes.map(s => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; s.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); return { s, x0, x1, h: y1 - y0 }; });
    const H = Math.max(...boxes.map(b => b.h));
    boxes.sort((a, b) => a.x0 - b.x0);
    const groups = [];
    boxes.forEach(b => {
      const g = groups[groups.length - 1];
      const overlap = g ? Math.min(g.x1, b.x1) - Math.max(g.x0, b.x0) : -1e9;
      if (g && overlap > -0.08 * H) { g.strokes.push(b.s); g.x0 = Math.min(g.x0, b.x0); g.x1 = Math.max(g.x1, b.x1); }
      else groups.push({ strokes: [b.s], x0: b.x0, x1: b.x1 });
    });
    return groups.map(g => readDigit(g.strokes)).join('');
  };
})();
