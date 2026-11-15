// Maths without lectures or words.
// The child acts on objects (apples into a basket, feeding a monster, lighting plates);
// numerals sit beside the objects and update as they act. The answer is written by hand.
//
// Hint ladder (picture-only, side panel), always about THIS child's problem first:
//   👀 look  : the child's own objects wiggle and are counted aloud
//   🐸 example: a frog hops a smaller problem of the same kind on a number line
//   ✋ solve : a ghost hand solves the child's own problem step by step,
//              then the next problem is a near twin to try alone
// Some children learn from an example, others only from seeing their own problem solved.
// The panel tracks which help is followed by a right answer and reorders itself.
(() => {
  const $ = s => document.querySelector(s);
  const sceneEl = $('#scene'), opBar = $('#opBar'), readout = $('#readout'), keypad = $('#keypad');
  const hintStage = $('#hintStage'), bulb = $('#hintBulb'), stepsEl = $('#hintSteps'), slateBox = $('.answer-slate');

  const OPS = { add: { sym: '+', icon: '➕', item: '🍎' }, sub: { sym: '−', icon: '➖', item: '🍎' }, mul: { sym: '×', icon: '✖️', item: '🍪' } };
  // Each level: bigger numbers and fewer props (objects -> dots -> numerals only).
  const LV = {
    add: [[5, 'obj'], [10, 'obj'], [10, 'dots'], [18, 'obj'], [18, 'num']],
    sub: [[5, 'obj'], [10, 'obj'], [10, 'dots'], [18, 'obj'], [18, 'num']],
    mul: [[[2, 3], [2, 3], 'obj'], [[2, 4], [2, 4], 'obj'], [[2, 4], [2, 5], 'dots'], [[2, 5], [2, 5], 'obj'], [[2, 5], [2, 5], 'num']],
  };
  const saved = A.store.get('maths', {});
  const S = {
    op: saved.op || 'add',
    lvl: Object.assign({ add: 0, sub: 0, mul: 0 }, saved.lvl),
    stats: Object.assign({ add: { ok: 0, bad: 0 }, sub: { ok: 0, bad: 0 }, mul: { ok: 0, bad: 0 } }, saved.stats),
  };
  const pref = Object.assign({ example: { ok: 0, bad: 0 }, solve: { ok: 0, bad: 0 } }, A.store.get('hintPref', {}));
  const save = () => { A.store.set('maths', S); A.store.set('hintPref', pref); };

  let P = null, streak = 0, wrongRun = 0, busy = false, typed = '', lastAct = Date.now(), dropLevel = false, readT = 0;

  // ---------- answer slate ----------
  const ansInk = new Ink($('#answerCanvas'), {
    color: '#ffffff', width: 7,
    onDown: () => { if (busy || (P && P.done)) return false; lastAct = Date.now(); typed = ''; clearTimeout(readT); },
    onUp: () => { clearTimeout(readT); readT = setTimeout(read, 450); },
    under: (x, I) => {
      if (!P || !P.guide) return;
      x.save();
      x.font = `700 ${I.h * 0.8}px "Segoe UI", sans-serif`; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(76,201,240,.16)'; x.fillText(P.guide, 24, I.h / 2);
      x.setLineDash([5, 7]); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.strokeText(P.guide, 24, I.h / 2);
      x.restore();
    },
  });
  function read() { readout.textContent = A.readNumber(ansInk.strokes.map(s => s.pts)); }
  function clearAnswer() { ansInk.clear(); readout.textContent = ''; typed = ''; }

  // ---------- problems ----------
  function valid(op, a, b) {
    const L = LV[op][S.lvl[op]];
    if (op === 'add') return a >= 1 && b >= 1 && a + b <= L[0];
    if (op === 'sub') return a >= 2 && a <= L[0] && b >= 1 && b < a;
    return a >= L[0][0] && a <= L[0][1] && b >= L[1][0] && b <= L[1][1];
  }
  function make(op, twin) {
    const L = LV[op][S.lvl[op]];
    let a, b, tries = 0;
    do {
      if (twin && tries < 40) { a = twin.a + A.rand(-1, 1); b = twin.b + A.rand(-1, 1); }
      else if (op === 'mul') { a = A.rand(L[0][0], L[0][1]); b = A.rand(L[1][0], L[1][1]); }
      else if (op === 'add') { a = A.rand(1, L[0] - 1); b = A.rand(1, L[0] - a); }
      else { a = A.rand(2, L[0]); b = A.rand(1, a - 1); }
      tries++;
    } while ((!valid(op, a, b) || (twin && a === twin.a && b === twin.b) || (!twin && P && P.a === a && P.b === b)) && tries < 80);
    const ans = op === 'add' ? a + b : op === 'sub' ? a - b : a * b;
    return { op, a, b, ans, props: twin ? 'obj' : (op === 'mul' ? L[2] : L[1]), hint: 0, wrongs: 0, usedSolve: false, lastHint: null, inBasket: 0, eaten: 0, lit: 0, guide: null, done: false };
  }
  function newProblem(twin) {
    if (dropLevel) { S.lvl[S.op] = Math.max(0, S.lvl[S.op] - 1); dropLevel = false; save(); }
    P = make(S.op, twin);
    clearAnswer(); keypad.hidden = true; hintStage.innerHTML = ''; bulb.classList.remove('pulse');
    render(); renderSteps(); renderOpBar(); lastAct = Date.now();
  }

  // ---------- scene ----------
  const itemHTML = g => P.props === 'dots' ? `<span class="item dot" data-g="${g}"></span>` : `<span class="item" data-g="${g}">${OPS[P.op].item}</span>`;
  const grp = (g, n) => `<div class="grp" data-g="${g}"><div class="items">${Array.from({ length: n }, () => itemHTML(g)).join('')}</div><div class="n">${n}</div></div>`;
  function basket() {
    const frames = LV.add[S.lvl.add][0] > 10 || P.a + P.b > 10 ? 2 : 1;
    let s = '<div class="basket"><div class="frames">';
    for (let f = 0; f < frames; f++) s += '<div class="frame">' + '<span class="slot"></span>'.repeat(10) + '</div>';
    return s + '</div><div class="n count">0</div></div>';
  }
  const monster = () => `<div class="monster"><div class="face">👾</div><div class="sign">${'<i></i>'.repeat(P.b)}</div><div class="n">${P.b}</div></div>`;

  function render() {
    const o = OPS[P.op], num = P.props === 'num';
    let h = `<div class="eq">${P.a} ${o.sym} ${P.b} = <span class="q">?</span></div>`;
    if (!num) {
      h += '<div class="stage-objs">';
      if (P.op === 'add') h += grp('a', P.a) + '<div class="sym">+</div>' + grp('b', P.b) + '<div class="sym">=</div>' + basket();
      else if (P.op === 'sub') h += grp('a', P.a) + '<div class="sym">➜</div>' + monster();
      else h += '<div class="plates">' + Array.from({ length: P.a }, (_, i) => `<div class="plate" data-i="${i}"><div class="items">${Array.from({ length: P.b }, () => itemHTML('m')).join('')}</div><div class="skip"></div></div>`).join('') + '</div>';
      h += '</div>';
    }
    sceneEl.innerHTML = h;
    sceneEl.classList.toggle('numonly', num);
    P.inBasket = 0; P.eaten = 0; P.lit = 0;
    wire();
  }

  function wire() {
    if (P.props === 'num') return;
    if (P.op === 'add') { const t = sceneEl.querySelector('.basket'); sceneEl.querySelectorAll('.grp .item').forEach(it => drag(it, t, () => toBasket(it))); }
    else if (P.op === 'sub') { const t = sceneEl.querySelector('.monster'); sceneEl.querySelectorAll('.grp .item').forEach(it => drag(it, t, () => feed(it))); }
    else sceneEl.querySelectorAll('.plate').forEach(pl => pl.addEventListener('pointerdown', () => { if (!busy) { lastAct = Date.now(); light(pl); } }));
  }

  const inside = (e, r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  // Drag an object onto its target, or just tap it to send it there.
  function drag(item, target, land) {
    item.addEventListener('pointerdown', e => {
      if (busy || item.classList.contains('used')) return;
      e.preventDefault(); lastAct = Date.now();
      const r = item.getBoundingClientRect();
      const ghost = item.cloneNode(true); ghost.classList.add('ghost');
      ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
      document.body.appendChild(ghost);
      const off = [e.clientX - r.left, e.clientY - r.top], sx = e.clientX, sy = e.clientY;
      let moved = false;
      const place = (x, y) => { ghost.style.left = x - off[0] + 'px'; ghost.style.top = y - off[1] + 'px'; };
      place(sx, sy); item.style.opacity = '.3';
      const mv = ev => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true; place(ev.clientX, ev.clientY); target.classList.toggle('over', inside(ev, target.getBoundingClientRect())); };
      const up = ev => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        ghost.remove(); item.style.opacity = ''; target.classList.remove('over');
        if (!moved || inside(ev, target.getBoundingClientRect())) land();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  function fly(a, b, ms = 340) {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const g = a.cloneNode(true); g.classList.add('flyer'); g.classList.remove('used', 'wiggle');
    Object.assign(g.style, { left: ra.left + 'px', top: ra.top + 'px', width: ra.width + 'px', height: ra.height + 'px', opacity: '1' });
    document.body.appendChild(g);
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
    const an = g.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.6}px,${dy * 0.6 - 50}px) scale(1.15)` }, { transform: `translate(${dx}px,${dy}px) scale(.85)` }], { duration: ms, easing: 'ease-in-out' });
    return an.finished.then(() => g.remove(), () => g.remove());
  }

  async function toBasket(it) {
    if (it.classList.contains('used')) return;
    const slot = sceneEl.querySelector('.basket .slot:not(.full)');
    if (!slot) return;
    it.classList.add('used'); slot.classList.add('full');
    await fly(it, slot);
    slot.innerHTML = P.props === 'dots' ? '<span class="dot-s"></span>' : OPS[P.op].item;
    P.inBasket++;
    sceneEl.querySelector('.basket .count').textContent = P.inBasket;
    A.sfx.pop(); A.say(P.inBasket);
  }

  async function feed(it) {
    const m = sceneEl.querySelector('.monster');
    if (it.classList.contains('used')) return;
    if (P.eaten >= P.b) { // full: the monster shakes its head
      m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); A.sfx.oops(); return;
    }
    it.classList.add('used');
    await fly(it, m.querySelector('.face'));
    P.eaten++;
    const dots = m.querySelectorAll('.sign i'); if (dots[P.eaten - 1]) dots[P.eaten - 1].classList.add('x');
    m.classList.remove('chomp'); void m.offsetWidth; m.classList.add('chomp'); A.sfx.chomp();
    if (P.eaten === P.b) m.querySelector('.face').textContent = '😋';
  }

  function light(pl) {
    if (pl.classList.contains('lit')) return;
    pl.classList.add('lit'); P.lit++;
    pl.querySelector('.skip').textContent = P.lit * P.b;
    A.sfx.pop(); A.say(P.lit * P.b);
  }

  // ---------- checking ----------
  async function check() {
    if (busy || !P || P.done) return;
    const v = (typed || readout.textContent || '').trim();
    if (!v) { slateBox.classList.remove('shake'); void slateBox.offsetWidth; slateBox.classList.add('shake'); return; }
    const n = parseInt(v, 10);
    lastAct = Date.now();
    if (n === P.ans) {
      P.done = true;
      const q = sceneEl.querySelector('.q'); q.textContent = P.ans; q.className = 'q right';
      A.sfx.good(); A.say(P.ans); A.celebrate();
      S.stats[P.op].ok++;
      if (pref[P.lastHint]) pref[P.lastHint].ok++;
      if (P.usedSolve) streak = 0;
      else if (P.wrongs === 0) {
        streak++; wrongRun = 0;
        if (streak >= 3 && S.lvl[P.op] < LV[P.op].length - 1) { S.lvl[P.op]++; streak = 0; setTimeout(() => A.celebrate(['🚀', '🌟']), 600); }
      }
      save();
      const twin = P.usedSolve ? { a: P.a, b: P.b } : null; // after being shown, try a near twin alone
      setTimeout(() => newProblem(twin), 2200);
    } else {
      P.wrongs++; wrongRun++; streak = 0;
      S.stats[P.op].bad++;
      if (pref[P.lastHint]) pref[P.lastHint].bad++;
      P.lastHint = null;
      if (wrongRun >= 2) { dropLevel = true; wrongRun = 0; }
      save(); A.sfx.oops();
      if (P.wrongs >= 2) keypad.hidden = false; // maybe the reader got it wrong: offer tiles
      busy = true;
      try { await showCompare(n); } finally { busy = false; }
      clearAnswer();
      nextHint();
    }
  }

  // A wrong answer explains itself: their number as boxes, the real amount dropped in.
  async function showCompare(n) {
    const cap = 30, box = A.el('div', 'compare'), row = A.el('div', 'cmp-row');
    box.appendChild(row); sceneEl.appendChild(box);
    for (let i = 0; i < Math.min(n, cap); i++) row.appendChild(A.el('span', 'cbox'));
    const item = OPS[P.op].item;
    for (let i = 0; i < Math.min(P.ans, cap); i++) {
      await A.sleep(230);
      const cell = row.children[i];
      if (cell && !cell.classList.contains('extra')) { cell.textContent = item; cell.classList.add('filled'); }
      else row.appendChild(A.el('span', 'cbox extra', item));
      A.tone(500 + i * 25, 0.06, 'triangle', 0.08);
    }
    await A.sleep(250);
    row.querySelectorAll('.cbox:not(.filled):not(.extra)').forEach(c => c.classList.add('wobble'));
    row.querySelectorAll('.extra').forEach(c => c.classList.add('bounce'));
    await A.sleep(2400);
    box.remove();
  }

  // ---------- hints ----------
  const ICON = { look: '👀', example: '🐸', solve: '✋' };
  function ladder() {
    const rate = t => (pref[t].ok + 1) / (pref[t].ok + pref[t].bad + 2);
    const tried = pref.solve.ok + pref.solve.bad;
    // If seeing their own problem solved works clearly better for this child, skip the example.
    return tried >= 2 && rate('solve') > rate('example') + 0.15 ? ['look', 'solve'] : ['look', 'example', 'solve'];
  }
  function renderSteps() {
    const L = ladder();
    stepsEl.innerHTML = '';
    L.forEach((t, i) => {
      const b = A.el('button', 'hstep' + (i < P.hint ? ' used' : '') + (i === P.hint ? ' next' : ''), ICON[t]);
      b.onclick = () => runHint(t);
      stepsEl.appendChild(b);
    });
  }
  function nextHint() { const L = ladder(); return runHint(L[Math.min(P.hint, L.length - 1)]); }
  async function runHint(t) {
    if (busy || !P || P.done) return;
    busy = true; lastAct = Date.now(); bulb.classList.remove('pulse');
    const i = ladder().indexOf(t);
    if (i >= P.hint) P.hint = i + 1;
    P.lastHint = t;
    renderSteps();
    try { if (t === 'look') await look(); else if (t === 'example') await example(); else await solve(); }
    finally { busy = false; lastAct = Date.now(); }
  }

  const wig = el => { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); };
  function showObjects() { if (P.props !== 'obj') { P.props = 'obj'; render(); return A.sleep(300); } }

  // 👀 Their own objects wiggle and get counted.
  async function look() {
    hintStage.innerHTML = '<div class="mini-objs" style="font-size:3rem">👀</div>';
    await showObjects();
    if (P.op === 'mul') {
      const plates = [...sceneEl.querySelectorAll('.plate')];
      for (const pl of plates) { wig(pl); A.tone(700, 0.06); await A.sleep(380); }
      const its = [...plates[0].querySelectorAll('.item')];
      for (let i = 0; i < its.length; i++) { wig(its[i]); A.say(i + 1); await A.sleep(560); }
      return;
    }
    for (const g of P.op === 'add' ? ['a', 'b'] : ['a']) {
      const its = [...sceneEl.querySelectorAll(`.grp[data-g="${g}"] .item:not(.used)`)];
      for (let i = 0; i < its.length; i++) { wig(its[i]); A.say(i + 1); await A.sleep(560); }
      await A.sleep(350);
    }
    if (P.op === 'sub') {
      const m = sceneEl.querySelector('.monster'); wig(m);
      const dots = [...m.querySelectorAll('.sign i')];
      for (let i = 0; i < dots.length; i++) { wig(dots[i]); A.say(i + 1); await A.sleep(560); }
    }
  }

  // 🐸 A smaller problem of the same kind, hopped out on a number line.
  async function example() {
    const op = P.op;
    const [a, b] = op === 'add' ? (P.a === 2 && P.b === 1 ? [1, 2] : [2, 1]) : op === 'sub' ? (P.a === 3 && P.b === 1 ? [4, 2] : [3, 1]) : (P.a === 2 && P.b === 2 ? [2, 3] : [2, 2]);
    const res = op === 'add' ? a + b : op === 'sub' ? a - b : a * b;
    const max = Math.max(a, res) + 1, W = max * 40 + 40, X = i => 20 + i * 40;
    const it = OPS[op].item;
    const objs = op === 'mul' ? Array.from({ length: a }, () => `<span>(${it.repeat(b)})</span>`).join('') : it.repeat(a) + ` ${OPS[op].sym} ` + it.repeat(b);
    hintStage.innerHTML = `<div class="mini-eq">${a} ${OPS[op].sym} ${b} = <span class="q">?</span></div><div class="mini-objs">${objs}</div><div class="nl"><svg viewBox="0 0 ${W} 50"></svg><div class="frog">🐸</div></div>`;
    const svg = hintStage.querySelector('svg'), frog = hintStage.querySelector('.frog');
    let s = `<line x1="10" y1="20" x2="${W - 10}" y2="20" stroke="#7a4b22" stroke-width="3" stroke-linecap="round"/>`;
    for (let i = 0; i <= max; i++) s += `<line x1="${X(i)}" y1="13" x2="${X(i)}" y2="27" stroke="#7a4b22" stroke-width="3"/><text x="${X(i)}" y="46" text-anchor="middle" font-size="16" font-weight="700" fill="#2b2a33" id="t${i}">${i}</text>`;
    svg.innerHTML = s;
    const at = i => { frog.style.left = (X(i) / W) * 100 + '%'; };
    const start = op === 'mul' ? 0 : a, step = op === 'add' ? 1 : op === 'sub' ? -1 : b, hops = op === 'mul' ? a : b;
    frog.style.transition = 'none'; at(start); void frog.offsetWidth; frog.style.transition = '';
    if (start) A.say(start);
    await A.sleep(800);
    for (let h = 1; h <= hops; h++) {
      const from = start + (h - 1) * step, to = start + h * step, mid = (X(from) + X(to)) / 2;
      svg.insertAdjacentHTML('beforeend', `<path d="M${X(from)} 18 Q${mid} ${-8} ${X(to)} 18" fill="none" stroke="#06d6a0" stroke-width="3" stroke-dasharray="5 4"/>`);
      frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop'); at(to);
      A.say(to); await A.sleep(800);
    }
    const t = svg.querySelector('#t' + res); if (t) { t.setAttribute('fill', '#06d6a0'); t.setAttribute('font-size', '22'); }
    const q = hintStage.querySelector('.q'); q.textContent = res; q.className = 'q right';
    A.sfx.star();
    await A.sleep(500);
  }

  // ✋ Solve THEIR problem, step by step, with a ghost hand. Then they write it.
  async function solve() {
    P.usedSolve = true;
    hintStage.innerHTML = '<div class="mini-objs" style="font-size:3rem">✋</div>';
    P.props = 'obj'; render(); await A.sleep(350);
    const hand = A.el('div', 'hand', '👆'); document.body.appendChild(hand);
    const sr = sceneEl.getBoundingClientRect();
    hand.style.left = sr.left + sr.width / 2 + 'px'; hand.style.top = sr.bottom - 40 + 'px';
    const to = async el => { const r = el.getBoundingClientRect(); hand.style.left = r.left + r.width / 2 + 'px'; hand.style.top = r.top + r.height * 0.55 + 'px'; await A.sleep(380); };
    try {
      if (P.op === 'add') {
        for (const it of [...sceneEl.querySelectorAll('.grp .item')]) { await to(it); await toBasket(it); await A.sleep(220); }
      } else if (P.op === 'sub') {
        const its = [...sceneEl.querySelectorAll('.grp .item')];
        for (let i = 0; i < P.b; i++) { const it = its[its.length - 1 - i]; await to(it); await feed(it); await A.sleep(220); }
        const left = its.slice(0, P.a - P.b);
        await A.sleep(300);
        for (let i = 0; i < left.length; i++) { await to(left[i]); wig(left[i]); left[i].classList.add('counted'); A.say(i + 1); await A.sleep(380); }
      } else {
        for (const pl of [...sceneEl.querySelectorAll('.plate')]) { await to(pl); light(pl); await A.sleep(650); }
      }
    } finally { hand.remove(); }
    await A.sleep(300);
    const q = sceneEl.querySelector('.q'); q.textContent = P.ans; q.className = 'q reveal';
    A.say(P.ans);
    P.guide = String(P.ans); // dotted answer on the slate for the child to write over
    clearAnswer();
    await A.sleep(400);
  }

  // ---------- controls ----------
  function renderOpBar() {
    opBar.innerHTML = '';
    Object.keys(OPS).forEach(op => {
      const b = A.el('button', 'opb' + (op === S.op ? ' on' : ''), OPS[op].icon);
      b.setAttribute('aria-label', op);
      b.onclick = () => { if (busy || op === S.op) return; S.op = op; streak = 0; wrongRun = 0; save(); A.sfx.pop(); newProblem(); };
      opBar.appendChild(b);
    });
    const lv = A.el('div', 'lvl');
    LV[S.op].forEach((_, i) => lv.appendChild(A.el('i', i <= S.lvl[S.op] ? 'on' : '')));
    opBar.appendChild(lv);
  }

  function buildKeypad() {
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '⌫'].forEach(k => {
      const b = A.el('button', 'key', k);
      b.onclick = () => {
        if (busy) return;
        lastAct = Date.now(); ansInk.clear();
        typed = k === '⌫' ? typed.slice(0, -1) : (typed + k).slice(0, 3);
        readout.textContent = typed;
      };
      keypad.appendChild(b);
    });
  }

  $('#aCheck').onclick = check;
  $('#aClear').onclick = () => { clearAnswer(); A.sfx.pop(); };
  $('#aKeys').onclick = () => { keypad.hidden = !keypad.hidden; };
  bulb.onclick = () => nextHint();
  document.getElementById('maths').addEventListener('pointerdown', () => { lastAct = Date.now(); bulb.classList.remove('pulse'); });

  // Idle: first the bulb glows, later help starts by itself.
  setInterval(() => {
    if (A.current !== 'maths' || !P || P.done || busy) return;
    const idle = Date.now() - lastAct;
    if (idle > 45000) { lastAct = Date.now(); nextHint(); }
    else if (idle > 22000) bulb.classList.add('pulse');
  }, 1000);

  A.maths = { state: () => S, pref: () => pref, ladder };
  A.screens.maths = {
    enter() {
      ansInk.resize();
      if (!keypad.children.length) buildKeypad();
      if (!P) newProblem();
      lastAct = Date.now();
    },
  };
})();
