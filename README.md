# Akshar Board — software prototype

A browser prototype of the Akshar learning board for children aged 3–10. It stands in for the physical board: a slate you write on, with an AI coach that gives feedback **while** the child practises.

No install, no accounts, no server, no network. Everything runs and is stored on the device.

## Run it

Open `index.html` in Chrome or Edge. Or serve the folder:

```bash
npx http-server -p 5180 -c-1
```

Then open http://localhost:5180.

## What's inside

| Door | What the child does |
|---|---|
| 🖍️ Scribble | Free drawing slate: colours, brush sizes, eraser, undo, clear. |
| ➰ Writing | Pattern strokes, English cursive by shape family, and a few Hindi and Gujarati letters. Four stages per letter: 👀 watch a firefly write it → ✨ trace a trail of stars → ☝️ trace with only a start dot → ✏️ write it alone. |
| 🍎 Maths | Addition (apples into a basket), subtraction (feed a monster), multiplication (light up plates of cookies). The answer is **handwritten** on a small slate and read on the device; number tiles are the fallback. |
| 🔒 Parents | Hold the lock for 1.5 s. Shows progress, which help works for this child, the counting-voice language, and a reset button. |

### Writing coach
- Strokes are checked live against the model: start point, direction, and staying near the path.
- Leaving the path makes the ink fade and the start dot pulse again from the last good point. There are no red crosses.
- If a child leaves the path twice in the ☝️ stage, the firefly replays just that stroke.
- In ✏️, the child's letter is compared with the model's shape and scored 1–3 stars, with the model overlaid in green. Two misses send the child back to more help.

### Maths: help without words
- Every problem is objects, with numerals alongside that update as the child acts.
- **A wrong answer explains itself.** The child's number appears as boxes, the real amount drops in, and any empty boxes or extra items wobble.
- **Picture hint ladder** (💡 or the side buttons):
  1. 👀 **Look**: the child's own objects wiggle and are counted aloud.
  2. 🐸 **Example**: a frog hops a *smaller* problem of the same kind on a number line.
  3. ✋ **Solve it together**: a ghost hand solves **the child's own problem** step by step. The answer is left dotted on the slate to write over, and the next problem is a near twin to try alone.
- Some children learn from an example, while others only get it when their own problem is solved in front of them. The board tracks which hint is followed by a right answer. If solving works clearly better, it drops the example and goes straight to ✋.
- **Difficulty:** three right in a row raises the level (bigger numbers, then dots instead of objects, then numerals only). Two misses in a row lower it.

## Code map

```
index.html        screens
css/style.css     slate look, layout, animations
js/core.js        storage, sound, speech, geometry (spline, resample)
js/ink.js         pointer-to-stroke engine (mouse, touch, stylus; hardware can feed it later)
js/letters.js     stroke data: ruled-line units, order and direction of each stroke
js/writing.js     writing coach
js/digits.js      on-device handwritten digit reader ($P point-cloud matcher)
js/maths.js       maths scenes, checking, hint ladder, difficulty
js/parent.js      parent view
js/app.js         home and navigation
```

## Known limits (prototype)
- The Hindi and Gujarati letter shapes are approximations. Have a native writer check stroke order and shape before showing them to children.
- The digit reader passes synthetic tests. Real children's handwriting will be messier; tune the templates with real samples.
- Counting speech uses the browser's built-in voices. Hindi and Gujarati voices may not be installed on every device.
