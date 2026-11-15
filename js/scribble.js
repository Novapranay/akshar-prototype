// Free scribble slate.
(() => {
  const cv = document.getElementById('scribbleCanvas');
  const tb = document.getElementById('scribbleTools');
  const ink = new Ink(cv, { color: '#ffffff', width: 10 });
  const colors = ['#ffffff', '#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#c77dff'];
  const sizes = [5, 10, 22];
  let size = 10, erasing = false;

  const mark = (sel, el) => { tb.querySelectorAll(sel).forEach(b => b.classList.toggle('on', b === el)); };

  colors.forEach((c, i) => {
    const b = A.el('button', 'swatch' + (i === 0 ? ' on' : ''));
    b.style.background = c;
    b.setAttribute('aria-label', 'Colour');
    b.onclick = () => { ink.o.color = c; erasing = false; ink.o.erase = false; ink.o.width = size; mark('.swatch', b); eraser.classList.remove('on'); };
    tb.appendChild(b);
  });
  tb.appendChild(A.el('span', 'tool-gap'));
  sizes.forEach(s => {
    const b = A.el('button', 'size' + (s === size ? ' on' : ''), `<i style="width:${s + 4}px;height:${s + 4}px"></i>`);
    b.setAttribute('aria-label', 'Brush size');
    b.onclick = () => { size = s; ink.o.width = erasing ? s * 3 : s; mark('.size', b); };
    tb.appendChild(b);
  });
  tb.appendChild(A.el('span', 'tool-gap'));
  const eraser = A.el('button', 'icon-btn', '🩹');
  eraser.setAttribute('aria-label', 'Eraser');
  eraser.onclick = () => { erasing = !erasing; ink.o.erase = erasing; ink.o.width = erasing ? size * 3 : size; eraser.classList.toggle('on', erasing); };
  const undo = A.el('button', 'icon-btn', '↩️'); undo.setAttribute('aria-label', 'Undo'); undo.onclick = () => ink.undo();
  const clear = A.el('button', 'icon-btn', '🧽'); clear.setAttribute('aria-label', 'Clear'); clear.onclick = () => { ink.clear(); A.sfx.pop(); };
  [eraser, undo, clear].forEach(b => tb.appendChild(b));

  A.screens.scribble = { enter() { ink.resize(); } };
})();
