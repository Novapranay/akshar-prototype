(() => {
  document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { A.sfx.pop(); A.show(b.dataset.go); }; });
  document.getElementById('btnHome').onclick = () => A.show('home');

  const mute = document.getElementById('btnMute');
  const paint = () => { mute.textContent = A.muted ? '🔇' : '🔊'; };
  mute.onclick = () => { A.muted = !A.muted; A.store.set('muted', A.muted); if (A.muted && window.speechSynthesis) speechSynthesis.cancel(); paint(); };
  paint();

  // Parent gate: press and hold, so children don't wander in.
  const gate = document.getElementById('parentGate');
  let t = 0;
  const stop = () => { clearTimeout(t); gate.classList.remove('holding'); };
  gate.addEventListener('pointerdown', () => { gate.classList.add('holding'); t = setTimeout(() => { stop(); A.show('parent'); }, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => gate.addEventListener(e, stop));

  A.show('home');
})();
