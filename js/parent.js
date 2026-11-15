// Parent view: the only screen with words. Reached by holding the lock for 1.5 s.
(() => {
  const wrap = document.getElementById('parentWrap');
  const OPNAME = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication' };

  function render() {
    const prog = A.store.get('writing', {});
    const m = A.maths.state(), pref = A.maths.pref();
    const done = A.LETTERS.filter(l => (prog[l.id] || {}).stars > 0).length;

    let h = `<h2>Writing</h2><div class="pcard"><p>${done} of ${A.LETTERS.length} shapes written alone with at least one star.</p><div class="pletters">`;
    A.LETTERS.forEach((l, i) => { h += `<div class="lt" data-i="${i}"><canvas></canvas><span class="stars">${'★'.repeat((prog[l.id] || {}).stars || 0)}</span></div>`; });
    h += '</div></div><h2>Maths</h2><div class="pcard">';
    Object.keys(OPNAME).forEach(op => {
      const s = m.stats[op];
      h += `<div class="prow"><span>${OPNAME[op]}</span><span>Level ${m.lvl[op] + 1} of 5 · ${s.ok} right · ${s.bad} not yet</span></div>`;
    });
    h += '</div><h2>Which help works for your child</h2><div class="pcard">';
    const rate = t => { const n = pref[t].ok + pref[t].bad; return n ? Math.round((100 * pref[t].ok) / n) + '% right after (' + n + ' times)' : 'not used yet'; };
    h += `<div class="prow"><span>🐸 A similar, smaller example</span><span>${rate('example')}</span></div>`;
    h += `<div class="prow"><span>✋ Their own problem solved step by step</span><span>${rate('solve')}</span></div>`;
    const L = A.maths.ladder();
    h += `<p>${L.length === 2 ? 'Your child does better after seeing their own problem solved, so the board now skips the example and shows that first.' : 'The board tries an example first, then solves their own problem. It switches order if solving works clearly better.'}</p></div>`;
    h += `<h2>Settings</h2><div class="pcard"><div class="prow"><span>Counting voice</span><select id="pLang">
      <option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="gu-IN">ગુજરાતી</option></select></div>
      <div class="prow"><span>Progress is stored only on this device.</span><button class="pbtn warn" id="pReset">Reset progress</button></div></div>`;
    wrap.innerHTML = h;

    wrap.querySelectorAll('.pletters .lt').forEach(el => A.drawThumb(el.querySelector('canvas'), A.LETTERS[+el.dataset.i]));
    const sel = wrap.querySelector('#pLang'); sel.value = A.voiceLang;
    sel.onchange = () => { A.voiceLang = sel.value; A.store.set('lang', sel.value); A.say(sel.value === 'en-IN' ? 'one, two, three' : '1, 2, 3'); };
    const reset = wrap.querySelector('#pReset');
    reset.onclick = () => {
      if (reset.dataset.armed) {
        ['writing', 'maths', 'hintPref'].forEach(k => { try { localStorage.removeItem('akshar:' + k); } catch (e) {} });
        location.reload();
      } else { reset.dataset.armed = '1'; reset.textContent = 'Tap again to erase everything'; }
    };
  }

  A.screens.parent = { enter: render };
})();
