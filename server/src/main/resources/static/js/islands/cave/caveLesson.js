// caveLesson.js — Athena teaches the array, in four short parts, on the pens of the Cyclops' cave.
// Every part runs the same loop (from the research: PRIMM): she shows real C, you PREDICT what it will do,
// it RUNS on the pens with every read and write shown, then you are asked what a CHANGE would do, and see it.
// The steps of each algorithm are named the same way every time (subgoal labels):
//   insert: check not full · shift right from the end · drop it in · n++
//   delete: shift left from the gap · n--
//   swap:   hold one in t · copy · put t back
import { LessonPlayer } from "../../learn/lessonPlayer.js";
import { PEN_W } from "./penRow.js";

const F8 = [34, 52, 18, 77, 45, 60, 23, 81];
const F5 = [34, 52, 18, 77, 45];

// ctx: { pens, director }
export function caveLesson(part, ctx) {
  const { pens, director } = ctx;
  // the side panel covers the right of the screen, so every shot looks a little right of what it frames
  const shift = innerWidth > 900 ? 2.6 : 0;
  // the whole row: far enough back that all ten pens (and the dark past them) fit left of the panel
  const wideShift = innerWidth > 900 ? 4.6 : 0;
  const wide = (s = 1.0) => director.glide([PEN_W * 5 + wideShift, 6.2, 18], [PEN_W * 5 + wideShift, 0.4, 0], 44, s);
  // the first six pens (parts 3 and 4 work with a short line), framed left of the panel
  const front = (s = 1.0) => director.glide([PEN_W * 2.6 + wideShift * 0.62, 4.6, 12.5], [PEN_W * 2.6 + wideShift * 0.62, 0.4, 0], 44, s);
  const close = (i, s = 0.8) => director.glide([pens.px(i) + 0.4 + shift * 0.5, 2.3, 6.4], [pens.px(i) + shift * 0.5, 0.6, 0], 40, s);
  // what the variables panel shows: the pens in use, with the current one marked
  const cells = (at = -1) => ({ items: pens.values.slice(0, pens.cap).map((v, i) => (i < pens.n ? v : "?")), top: at, addr: [...Array(pens.cap)].map((_, i) => pens.address(i)) });
  const V = (extra = {}, at = -1) => ({ n: pens.n, flock: cells(at), ...extra });

  const parts = {
    // ------------------------------------------------------------------ 1. pens, not a pile
    1: {
      title: "The Cave of Polyphemus", subtitle: "1 · pens, not a pile",
      code: `int flock[10];        // ten pens carved in a row
int n = 8;            // pens 0 to 7 have sheep

int w = flock[3];     // read pen 3
flock[3] = 80;        // write pen 3

int x = flock[9];     // pen 9: past n
int y = flock[10];    // pen 10?`,
      steps: () => [
        { line: 1, act: async () => { pens.set([]); await wide(1.2); },
          say: "One <b>int</b> holds one number. A flock needs many, so C gives you a row of them under one name: <b>flock</b>, ten pens carved side by side. In memory they sit 4 bytes apart: <b>0x2A0, 0x2A4, 0x2A8…</b>, cut into the floor in front of each pen." },
        { line: 2, act: async () => { pens.set(F8); await pens.wait(0.6); }, get vars() { return V(); },
          say: "Eight sheep come in. The rope runs along the pens in use and the sign says <b>n = 8</b>. Two different numbers: <b>10</b> pens exist, <b>8</b> are in use.",
          quiz: { q: "How many sheep can this cave ever hold?", options: ["8, the n", "10, the pens carved", "11"], answer: 1,
                  why: "<b>10.</b> That's the <b>capacity</b>, fixed when the pens were carved. <b>n</b> is how many are in use right now: the <b>length</b>." } },
        { line: 4, get vars() { return V(); }, act: () => close(3),
          say: "<b>flock[3]</b> means: go to pen <b>3</b> and look at the sheep there.",
          quiz: { q: "Predict: what is flock[3]?", options: ["3", "77", "18, the third sheep"], answer: 1,
                  why: "<b>77.</b> Pens are numbered from <b>0</b>, so pen 3 is the fourth one along, and it holds a sheep weighing 77." } },
        { line: 4, get vars() { return V({ w: 77 }, 3); }, act: async () => { await pens.marker("3", 3); await pens.read(3); },
          say: "The number in the brackets is the <b>pen</b> (the <b>index</b>). What comes back is the <b>weight</b> (the <b>value</b>). <b>w = 77</b>. Never mix the two up." },
        { line: 4, get vars() { return V({ w: 77 }, 3); },
          say: "How did C find pen 3 without walking past pens 0, 1 and 2?",
          quiz: { q: "Pen 0 is at 0x2A0 and each pen takes 4 bytes. Where is pen 3?", options: ["0x2A3", "0x2AC", "0x2B0"], answer: 1,
                  why: "<b>0x2A0 + 3 × 4 = 0x2AC.</b> One multiplication and C is there. Reaching any pen takes the same tiny time, whether it's pen 1 or pen 9: <b>O(1)</b>." } },
        { line: 5, get vars() { return V({ w: 77 }, 3); }, act: () => pens.write(3, 80),
          say: "<b>flock[3] = 80</b> writes pen 3. The old 77 is gone; there's no undo. Each pen behaves like its own variable." },
        { line: 7, get vars() { return V({ w: 77 }); }, act: async () => { pens.hideMarker("3"); await close(9); },
          say: "Pen <b>9</b> was carved, but n is 8, so nobody put a sheep there.",
          quiz: { q: "Predict: what does flock[9] give?", options: ["0", "an error", "whatever was left in that pen"], answer: 2,
                  why: "C doesn't stop you. Pen 9 is real memory, and it holds whatever was there before: <b>junk</b>." } },
        { line: 7, get vars() { return V({ w: 77, x: pens.values[9] }, 9); }, act: async () => { await pens.marker("9", 9); await pens.read(9); },
          say: () => `<b>x = ${pens.values[9]}</b>: an old bone with a number scratched on it. Nothing wrong was reported, and that's the danger. This is why every loop must stop at <b>n</b>.` },
        { line: 8, get vars() { return V({ w: 77, x: pens.values[9] }); }, act: async () => { pens.hideMarker("9"); await close(10); },
          say: "And pen <b>10</b>? Count the pens: 0 to 9 is ten pens. There isn't an eleventh.",
          quiz: { q: "Predict: flock[10]?", options: ["junk again", "there is no pen 10: you reach into the dark", "0"], answer: 1,
                  why: "Pen 10 is outside the array. In real C you'd read someone else's memory, or the program crashes. In the cave, you reach into the dark where Polyphemus sleeps…" } },
        { line: 8, get vars() { return V({ w: 77, x: pens.values[9] }); }, act: async () => {
            await pens.wake();
            await director.siren({ title: "INDEX OUT OF BOUNDS", sub: "flock[10]: the pens are numbered 0 to 9.", lineNo: 8, lineText: "int y = flock[10];",
                                   focus: { x: pens.px(10), z: 0, y: 0.4 } });
            await pens.sleep();
          },
          say: "<b>Out of bounds.</b> The valid pens are <b>0 to CAP − 1</b>: here 0 to 9. In a trial, this ends the run." },
        { line: 8, act: () => wide(),
          say: "That's an array: <b>pen number in, weight out</b>. Pens 0 to 9 exist; pens 0 to n − 1 are in use. Next: walking the pens with a loop." }
      ]
    },

    // ------------------------------------------------------------------ 2. walking the pens
    2: {
      title: "The Cave of Polyphemus", subtitle: "2 · walking the pens",
      code: `int total = 0;
for (int i = 0; i < n; i++) {
    total = total + flock[i];
}

int big = 0;
for (int i = 1; i < n; i++) {
    if (flock[i] > flock[big]) big = i;
}`,
      steps: () => {
        let total = 0, big = 0;
        const add = async i => { await pens.marker("i", i); await pens.read(i); total += pens.values[i]; };
        return [
          { line: 1, act: async () => { pens.set(F8); pens.clearMarkers(); await wide(); }, get vars() { return V(); },
            say: "To weigh the whole flock, visit every pen in use, one after another. That's <b>traversing</b> the array.",
            quiz: { q: "Predict: how many times will line 3 run?", options: ["7", "8", "9"], answer: 1,
                    why: "<b>8</b>, once per sheep: i = 0, 1, … 7. When i reaches 8, <b>8 &lt; 8</b> is false and the loop ends." } },
          { line: 1, get vars() { return V({ total: 0 }); }, say: "Start the total at <b>0</b>. Forget this and you're adding to junk." },
          { line: 2, get vars() { return V({ total: 0, i: 0 }, 0); }, act: () => pens.marker("i", 0),
            say: "<b>i = 0</b>: the marker stands at pen 0. Is 0 &lt; 8? Yes, so in we go." },
          { line: 3, get vars() { return V({ total: 34, i: 0 }, 0); }, act: () => add(0), say: "Read pen 0: <b>total = 0 + 34 = 34</b>." },
          { line: 3, get vars() { return V({ total: 86, i: 1 }, 1); }, act: () => add(1), say: "i++ moves the marker to pen 1: <b>total = 34 + 52 = 86</b>." },
          { line: 3, get vars() { return V({ total: 104, i: 2 }, 2); }, act: () => add(2), say: "Pen 2: <b>total = 104</b>. The marker is the only thing moving; the sheep stay put." },
          { line: 3, get vars() { return V({ total: 390, i: 7 }, 7); }, act: async () => { for (let i = 3; i < 8; i++) await add(i); },
            say: "…pens 3 to 7 the same way. <b>total = 390.</b>" },
          { line: 2, get vars() { return V({ total: 390, i: 8 }, 8); }, act: () => pens.marker("i", 8),
            say: "i becomes <b>8</b>. Is 8 &lt; 8? <b>No.</b> The loop ends, and pen 8, with its junk, is never touched." },
          { line: 2, get vars() { return V({ total: 390, i: 8 }, 8); },
            say: "The most common array bug in the world is one character long.",
            quiz: { q: "What if line 2 said  i <= n  instead?", options: ["Same total", "Pen 8 is read too, and its junk gets added", "The eye opens"], answer: 1,
                    why: "With <b>&lt;=</b>, i = 8 also runs. Pen 8 exists (it's carved), so nothing stops it; the junk goes into the total. This is the <b>off-by-one</b> error." } },
          { line: 3, get vars() { return V({ total: 390 + pens.values[8] }, 8); }, act: () => pens.read(8),
            say: () => `See it: pen 8 adds <b>${pens.values[8]}</b>, so total becomes <b>${390 + pens.values[8]}</b>. Wrong, and silent. <b>i &lt; n</b>, always.` },
          { line: 6, get vars() { return V({ big: 0 }, 0); }, act: async () => { pens.hideMarker("i"); await pens.marker("big", 0, 0xe0644a); },
            say: "Now find the <b>biggest</b> sheep. Assume pen 0 is the biggest so far: <b>big = 0</b>. It's a pen number, not a weight." },
          { line: 8, get vars() { return V({ big: 7 }, 7); }, act: async () => {
              big = 0;
              for (let i = 1; i < 8; i++) {
                await pens.marker("i", i); await pens.read(i);
                if (pens.values[i] > pens.values[big]) { big = i; await pens.marker("big", i, 0xe0644a); }
              }
              pens.hideMarker("i");
            },
            say: "Walk from pen 1. Each time a sheep is heavier than the one at <b>big</b>, big jumps to it: pen 1 (52), pen 3 (77), pen 7 (81). <b>big = 7.</b>",
            quiz: { q: "big is 7. What is flock[big]?", options: ["7", "81"], answer: 1,
                    why: "<b>81.</b> big holds the <b>pen</b>; flock[big] is the <b>weight</b> in it. Keep the pen and you can always look the weight up; keep only the weight and you've lost where the sheep is." } },
          { line: 9, act: () => wide(),
            say: "Searching is the same walk: compare each sheep, and when it's the one you want, remember <b>i</b> (and <b>break</b> to stop early). The trials are next: count, search, find the biggest." }
        ];
      }
    },

    // ------------------------------------------------------------------ 3. making room, closing gaps
    3: {
      title: "The Cave of Polyphemus", subtitle: "3 · making room, closing gaps",
      code: `// make room at pen 0 for a lamb (15)
for (int i = n; i > 0; i--) {
    flock[i] = flock[i - 1];
}
flock[0] = 15;
n++;

// the sheep in pen 2 is taken: close the gap
for (int i = 2; i < n - 1; i++) {
    flock[i] = flock[i + 1];
}
n--;`,
      steps: () => [
        { line: 1, act: async () => { pens.set(F5); pens.clearMarkers(); await front(); }, get vars() { return V(); },
          say: "A lamb must be <b>first</b> in line, in pen 0. But pen 0 is taken, and nobody may lose their place. Every sheep has to move one pen to the right.",
          quiz: { q: "Predict: why does the loop start at the END (i = n) and walk left?", options: ["It's faster", "So no sheep is copied over before it has moved", "C loops must count down"], answer: 1,
                  why: "Moving right means writing into the next pen. Start at the end, where pen n is empty, and every sheep moves into a pen that's already been emptied." } },
        { line: 2, get vars() { return V({ i: 5 }, 5); }, act: () => pens.marker("i", 5), say: "<b>i = n = 5</b>: the first empty pen." },
        { line: 3, get vars() { return V({ i: 5 }, 5); }, act: () => pens.copy(4, 5),
          say: "<b>flock[5] = flock[4]</b>: a copy of 45 goes into pen 5. It's a copy: <b>pen 4 still has its 45</b>." },
        { line: 3, get vars() { return V({ i: 4 }, 4); }, act: async () => { await pens.marker("i", 4); await pens.copy(3, 4); },
          say: "i = 4: <b>flock[4] = flock[3]</b>. The old 45 in pen 4 is overwritten, but that's fine: it's safe in pen 5 already." },
        { line: 3, get vars() { return V({ i: 1 }, 1); }, act: async () => { for (let i = 3; i > 0; i--) { await pens.marker("i", i); await pens.copy(i - 1, i); } },
          say: "…and the same for i = 3, 2, 1. Now <b>pen 0 and pen 1 both hold 34</b>. Pen 0 is about to be overwritten." },
        { line: 5, get vars() { return V(); }, act: async () => { pens.hideMarker("i"); await pens.write(0, 15); },
          say: "<b>flock[0] = 15</b>: the lamb goes in. This step is <i>drop it in</i>." },
        { line: 6, get vars() { return V(); }, act: async () => { pens.setN(6); await pens.wait(0.5); },
          say: "<b>n++</b>: six sheep now, and the rope grows. Forget this and the last sheep stands outside the rope, uncounted." },
        { line: 3, get vars() { return V(); },
          say: "The one mistake this code invites:",
          quiz: { q: "What if the loop ran from the FRONT: for (i = 1; i <= n; i++) flock[i] = flock[i-1]?", options: ["The same result", "Every pen ends up holding 34", "The eye opens"], answer: 1,
                  why: "From the front, pen 1 gets a copy of 34, then pen 2 gets a copy of <i>that</i>, and so on. Watch:" } },
        { line: 3, act: async () => {
            const keep = pens.values.slice(0, 6);
            pens.set(F5);
            for (let i = 1; i <= 5; i++) await pens.copy(i - 1, i);
            await pens.wait(1.2);
            pens.set(keep);
          },
          say: "<b>A line of identical 34s.</b> The other sheep were overwritten before they could move. Back to the right answer." },
        { line: 8, get vars() { return V(); }, act: async () => { const s = await pens.lift(2); await pens.dropOff(s); },
          say: "Now the other way. Polyphemus takes the sheep in <b>pen 2</b> for his supper, which leaves a <b>gap</b>. Nobody may be skipped when he counts." },
        { line: 10, get vars() { return V({ i: 4 }, 4); }, act: async () => { for (let i = 2; i < 5; i++) { await pens.marker("i", i); await pens.copy(i + 1, i); } },
          say: "From the gap, each sheep steps one pen <b>left</b>: <b>flock[i] = flock[i + 1]</b> for i = 2, 3, 4. Going left you start at the gap and walk right, the opposite of making room." },
        { line: 12, get vars() { return V(); }, act: async () => { pens.hideMarker("i"); pens.setN(5); await pens.wait(0.6); },
          say: "<b>n--</b>. Look at pen 5: the old 45 is still standing there, but it's outside the rope now. To the array it's junk. Forget n-- and he'd count that sheep twice." },
        { line: 12, act: () => front(0.8),
          say: "What do these cost?",
          quiz: { q: "Inserting at pen 0 of a flock of n sheep takes…", options: ["one step, O(1)", "a step per sheep, O(n)"], answer: 1,
                  why: "<b>O(n)</b>: every sheep moves. Adding at the <b>end</b> is O(1): write pen n, then n++. Arrays are quick to read anywhere, slow to insert or delete near the front." } },
        { line: 12,
          say: "The named steps. <b>Insert:</b> check it isn't full · shift right from the end · drop it in · n++. <b>Delete:</b> shift left from the gap · n--. You'll write both in the trials." }
      ]
    },

    // ------------------------------------------------------------------ 4. turning the line around
    4: {
      title: "The Cave of Polyphemus", subtitle: "4 · turning the line around",
      code: `int l = 0, r = n - 1;
while (l < r) {
    int t = flock[l];
    flock[l] = flock[r];
    flock[r] = t;
    l++;
    r--;
}`,
      steps: () => {
        let held = null;
        return [
          { line: 1, act: async () => { pens.set(F5); pens.clearMarkers(); await front(); }, get vars() { return V(); },
            say: "To <b>reverse</b> the line, swap the first and last, then the second and second-last, and so on, working inward.",
            quiz: { q: "Predict: why is there a t on line 3?", options: ["For speed", "flock[l] = flock[r] wipes out the old flock[l]; t keeps it safe", "C requires it"], answer: 1,
                    why: "A pen holds one sheep. The moment you write into flock[l], what was there is gone, unless you set it aside first. That's what <b>t</b> is for." } },
          { line: 1, get vars() { return V({ l: 0, r: 4 }); }, act: async () => { await pens.marker("l", 0, 0x9fd08a); await pens.marker("r", 4, 0x8fb4ff); },
            say: "Two markers: <b>l</b> at the front (pen 0), <b>r</b> at the back (pen n − 1 = 4)." },
          { line: 3, get vars() { return V({ l: 0, r: 4, t: 34 }); }, act: async () => { held = await pens.lift(0, { to: 1.6 }); },
            say: "<b>int t = flock[l]</b>: the 34 steps out of line and waits. That's <i>hold one in t</i>." },
          { line: 4, get vars() { return V({ l: 0, r: 4, t: 34 }); }, act: () => pens.copy(4, 0),
            say: "<b>flock[l] = flock[r]</b>: a copy of 45 goes into pen 0. Pen 4 still holds 45 for now." },
          { line: 5, get vars() { return V({ l: 0, r: 4, t: 34 }); }, act: async () => { await pens.dropOff(held); await pens.write(4, 34); },
          say: "<b>flock[r] = t</b>: the 34 from t goes into pen 4. <i>Put t back.</i> One swap done." },
          { line: 6, get vars() { return V({ l: 1, r: 3 }); }, act: async () => { await pens.marker("l", 1, 0x9fd08a); await pens.marker("r", 3, 0x8fb4ff); },
            say: "<b>l++</b>, <b>r--</b>: the markers step inward, to pens 1 and 3." },
          { line: 5, get vars() { return V({ l: 2, r: 2 }); }, act: async () => {
              held = await pens.lift(1, { to: 1.6 }); await pens.copy(3, 1); await pens.dropOff(held); await pens.write(3, 52);
              await pens.marker("l", 2, 0x9fd08a); await pens.marker("r", 2, 0x8fb4ff);
            },
            say: "The same three lines for pens 1 and 3: 52 and 77 change places. Now l and r are both <b>2</b>." },
          { line: 2, get vars() { return V({ l: 2, r: 2 }); },
            say: "Is 2 &lt; 2? <b>No.</b> They've met at the middle sheep, the 18, which doesn't need to move. Reversed: <b>45 77 18 52 34</b>.",
            quiz: { q: "What if the loop kept going all the way, while (l < n)?", options: ["Every pair is swapped twice: back to the start", "The same result", "The eye opens"], answer: 0,
                    why: "Past the middle, each pair gets swapped <b>back</b>. Stopping when the markers meet is the whole trick." } },
          { line: 2, act: async () => { pens.clearMarkers(); await wide(); },
            say: "One last idea for the bonus trial.",
            quiz: { q: "Eight sheep stand lightest to heaviest. You may touch only 4. How do you find the one weighing 60?", options: ["Start at pen 0 and walk", "Touch the middle one; throw away the half it can't be in; repeat"], answer: 1,
                    why: "<b>Binary search.</b> Each touch halves what's left: 8 → 4 → 2 → 1. It needs a <b>sorted</b> line, and it takes <b>O(log n)</b> looks instead of O(n)." } },
          { line: 8,
            say: "<b>Swap:</b> hold one in t · copy · put t back. <b>Reverse:</b> two markers · swap · step inward · stop when they meet. That's the whole array: read, write, walk, search, insert, delete, swap. Dawn is coming." }
        ];
      }
    }
  };

  const p = parts[part];
  const steps = p.steps();
  // a say written as a function is filled in when its step runs (it may show a junk value)
  for (const st of steps) if (typeof st.say === "function") { const f = st.say; Object.defineProperty(st, "say", { get: f }); }
  return new LessonPlayer({ title: p.title, subtitle: p.subtitle, code: p.code, steps, varsAfter: true });
}
