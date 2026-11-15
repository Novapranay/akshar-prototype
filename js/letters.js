// Stroke data for the writing coach.
// Ruled lines: y=0 top line, y=1 middle line, y=2 base line, y=3 descender line.
// A letter = strokes (pen lifts) -> segments (sharp corners between) -> control points [x, y].
// Points follow the order and direction a child should write.
(() => {
  const gen = (fn, n = 220) => { const o = []; for (let i = 0; i <= n; i++) o.push(fn(i / n)); return o; };

  const cups = []; for (let k = 0; k < 3; k++) { const x = k; cups.push([[x, 1.05], [x + 0.12, 1.7], [x + 0.5, 2.0], [x + 0.88, 1.7], [x + 1.0, 1.05]]); }
  const hills = []; for (let k = 0; k < 4; k++) { const x = k * 0.7; hills.push([[x, 2], [x + 0.35, 1.05]]); hills.push([[x + 0.35, 1.05], [x + 0.7, 2]]); }
  const oval = [[0.78, 1.15], [0.5, 1.0], [0.2, 1.22], [0.14, 1.65], [0.38, 1.98], [0.68, 1.85], [0.8, 1.4], [0.8, 1.0]];

  A.LETTERS = [
    // Pattern strokes: build pen control before letters.
    { id: 'p-wave', group: 'pattern', w: 3.4, strokes: [[gen(t => [t * 3.4, 1.5 - 0.42 * Math.sin(t * Math.PI * 4)])]] },
    { id: 'p-cups', group: 'pattern', w: 3.0, strokes: [cups] },
    { id: 'p-hills', group: 'pattern', w: 2.8, strokes: [hills] },
    { id: 'p-loops', group: 'pattern', w: 3.1, strokes: [[gen(t => { const th = t * 6 * Math.PI; return [0.16 * th + 0.32 * Math.sin(th), 2 - 0.5 * (1 - Math.cos(th))]; })]] },

    // English cursive, grouped by shape family.
    { id: 'c', group: 'en', w: 0.9, strokes: [[[[0.75, 1.15], [0.5, 1.0], [0.22, 1.2], [0.15, 1.6], [0.35, 1.95], [0.6, 2.0], [0.9, 1.8]]]] },
    { id: 'o', group: 'en', w: 1.05, strokes: [[[[0.72, 1.08], [0.42, 1.0], [0.15, 1.3], [0.18, 1.8], [0.45, 2.0], [0.74, 1.75], [0.76, 1.3], [0.62, 1.03], [0.72, 1.08], [1.0, 1.05]]]] },
    { id: 'a', group: 'en', w: 1.2, strokes: [[oval, [[0.8, 1.0], [0.8, 1.75], [0.92, 2.0], [1.15, 1.82]]]] },
    { id: 'd', group: 'en', w: 1.2, strokes: [[[...oval.slice(0, -1), [0.82, 0.1]], [[0.82, 0.1], [0.82, 1.75], [0.94, 2.0], [1.17, 1.82]]]] },
    { id: 'g', group: 'en', w: 1.15, strokes: [[oval, [[0.8, 1.0], [0.8, 2.4], [0.66, 2.9], [0.38, 2.92], [0.36, 2.6], [0.75, 2.1], [1.12, 1.85]]]] },

    { id: 'i', group: 'en', w: 0.8, strokes: [[[[0, 2], [0.25, 1.6], [0.42, 1.05]], [[0.42, 1.05], [0.38, 1.75], [0.52, 2.0], [0.78, 1.8]]], [[[0.43, 0.62], [0.44, 0.63]]]] },
    { id: 'u', group: 'en', w: 1.1, strokes: [[[[0, 2], [0.2, 1.55], [0.32, 1.05]], [[0.32, 1.05], [0.28, 1.75], [0.45, 2.0], [0.7, 1.75], [0.78, 1.05]], [[0.78, 1.05], [0.76, 1.75], [0.88, 2.0], [1.1, 1.8]]]] },
    { id: 't', group: 'en', w: 0.85, strokes: [[[[0, 2], [0.25, 1.4], [0.42, 0.35]], [[0.42, 0.35], [0.4, 1.75], [0.53, 2.0], [0.78, 1.8]]], [[[0.18, 1.0], [0.68, 1.0]]]] },
    { id: 'w', group: 'en', w: 1.3, strokes: [[[[0, 2], [0.18, 1.55], [0.28, 1.05]], [[0.28, 1.05], [0.25, 1.75], [0.4, 2.0], [0.6, 1.75], [0.64, 1.2]], [[0.64, 1.2], [0.66, 1.75], [0.8, 2.0], [0.98, 1.75], [1.02, 1.05]], [[1.02, 1.05], [0.98, 1.2], [1.1, 1.18], [1.3, 1.08]]]] },

    { id: 'l', group: 'en', w: 0.9, strokes: [[[[0, 2], [0.3, 1.55], [0.58, 0.65], [0.58, 0.2], [0.45, 0.08], [0.33, 0.3], [0.35, 1.2], [0.4, 1.85], [0.58, 2.0], [0.85, 1.8]]]] },
    { id: 'e', group: 'en', w: 0.9, strokes: [[[[0, 2], [0.32, 1.75], [0.62, 1.42], [0.6, 1.1], [0.42, 1.03], [0.25, 1.3], [0.25, 1.75], [0.45, 2.0], [0.82, 1.8]]]] },
    { id: 'h', group: 'en', w: 1.1, strokes: [[[[0, 2], [0.3, 1.55], [0.55, 0.65], [0.55, 0.2], [0.42, 0.08], [0.3, 0.3], [0.3, 2.0]], [[0.3, 2.0], [0.36, 1.4], [0.55, 1.05], [0.76, 1.2], [0.76, 1.78], [0.88, 2.0], [1.1, 1.82]]]] },

    // Hindi (Devanagari): body first, then the top line (shirorekha).
    // Shapes are approximations — have a native writer check them before showing children.
    { id: 'hi-tha', group: 'hi', w: 1.0, strokes: [[[[0.5, 1.0], [0.5, 1.18], [0.25, 1.35], [0.2, 1.75], [0.5, 2.0], [0.8, 1.75], [0.78, 1.35], [0.55, 1.22]]], [[[0.0, 1.0], [1.0, 1.0]]]] },
    { id: 'hi-ta', group: 'hi', w: 1.0, strokes: [[[[0.3, 1.0], [0.3, 1.2], [0.62, 1.35], [0.8, 1.65], [0.62, 1.95], [0.28, 1.92]]], [[[0.0, 1.0], [1.0, 1.0]]]] },

    // Gujarati: the same sounds, no top line. Also approximations to verify.
    { id: 'gu-tha', group: 'gu', w: 1.0, strokes: [[[[0.55, 1.15], [0.35, 1.05], [0.18, 1.3], [0.2, 1.78], [0.5, 2.0], [0.8, 1.75], [0.8, 1.3], [0.55, 1.05], [0.4, 1.15]]]] },
    { id: 'gu-ta', group: 'gu', w: 1.0, strokes: [[[[0.18, 1.15], [0.4, 1.0], [0.68, 1.15], [0.8, 1.55], [0.62, 1.95], [0.25, 1.9]]]] },
  ];
})();
