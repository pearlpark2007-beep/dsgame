// stackLesson.js — Athena teaches the stack, in real C, at the Harbour.
// The code is the textbook array stack. Every line the lesson lights does something in the
// world: `top = top + 1` slides the TOP pointer, `items[top] = x` sets a crate in that slot,
// the `if` checks light the gauge (red when it fails: overflow, underflow).
import * as THREE from "three";
import { LessonPlayer } from "../../learn/lessonPlayer.js";
import { QUAY_TOP } from "./harbourScene.js";

export const STACK_C = `#define CAP 3
int items[CAP];            // the pile: 3 slots, side by side in memory
int top = -1;              // index of the top crate; -1 means empty

void push(int x) {
    if (top == CAP - 1) {  // already full?
        printf("Overflow");
        return;
    }
    top = top + 1;         // move TOP up one slot
    items[top] = x;        // set the crate in that slot
}

int pop() {
    if (top == -1) {       // nothing to take?
        printf("Underflow");
        return -1;
    }
    int x = items[top];    // take the top crate
    top = top - 1;         // move TOP down one slot
    return x;
}

int main() {
    push(4);
    push(7);
    push(99);
    push(5);               // one too many
    int a = pop();
    int b = pop();
    int c = pop();
    int d = pop();         // one too many
}`;

// ctx: { hero, trial, director, HEAP, DROP, newCrate(value) }
export function stackLesson(ctx) {
  const { hero, trial, director, HEAP, DROP } = ctx;
  const s = trial.piles.s;
  const CAP = s.capacity;
  const S = { top: -1, items: Array(CAP).fill(null), ret: {} };
  const addr = Array.from({ length: CAP }, (_, i) => trial.address(s, i));
  const vars = (extra = {}) => ({ CAP, top: S.top, items: { items: [...S.items], top: S.top, addr }, ...S.ret, ...extra });
  // he works from beside the pile (its right side), so the camera in front sees gauge, pile and him side by side
const stand = new THREE.Vector3(s.x + 0.66, QUAY_TOP, s.z + 0.02);   // beside the pile, on its right
  const heapFront = new THREE.Vector3(HEAP.x, QUAY_TOP, HEAP.z + 0.78);
  const dropFront = new THREE.Vector3(DROP.x, QUAY_TOP, DROP.z + 0.78);

  // ---------- small acted pieces, reused by many steps
  async function fetch(value) {
    const c = ctx.newCrate(value);
    c.position.copy(HEAP);
    await hero.walkTo(heapFront.x, heapFront.z);
    await hero.lift(c);
    await hero.walkTo(stand.x, stand.z);
    await hero.face(s.x, s.z);
    return c;
  }
  async function setInSlot(c) {
    const i = S.top;
    await hero.place(trial.slot(s, i), 0);
    s.crates[i] = c; S.items[i] = c.userData.value;
    trial.write();
  }
  async function takeTop() {
    const c = s.crates[S.top];
    await hero.lift(c);
    return c;
  }
  async function setAside(c) {
    await hero.walkTo(dropFront.x, dropFront.z);
    await hero.place(DROP.clone());
    await fadeAway(c);           // a dock hand carries it off, so the trestle is free again
  }
  const moveTop = t => { S.top = t; s.gauge.setTop(t); };
  // fade one crate away (its materials are shared with other crates, so it gets its own copies first)
  async function fadeAway(c) {
    c.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; } });
    await hero.over(0.6, k => c.traverse(o => { if (o.isMesh) o.material.opacity = 1 - k; }));
    c.parent.remove(c);
  }
  async function quickPush(value) {
    const c = await fetch(value);
    s.gauge.flash("check", Math.max(0, S.top));
    await hero.wait(0.35);
    moveTop(S.top + 1);
    await hero.wait(0.35);
    await setInSlot(c);
  }
  async function quickPop(name) {
    await hero.walkTo(stand.x, stand.z); await hero.face(s.x, s.z);
    s.gauge.flash("check", S.top);
    await hero.wait(0.3);
    const c = await takeTop();
    S.ret[name] = c.userData.value; S.items[S.top] = null; s.crates.length = S.top;
    moveTop(S.top - 1); trial.write();
    await setAside(c);
  }

  // three-quarter view from the front right: the pile, its gauge, and Odysseus beside it
  const view = () => director.glide([s.x + 1.7, 2.25, 4.6], [s.x + 0.2, 1.2, -1.5], 44, 1.2);

  const steps = [
    { line: 1, vars: vars(), act: view,
      say: "<b>CAP</b> is how many crates this pile can ever hold: <b>3</b>. Count the brass notches on the gauge post — three." },
    { line: 2, vars: vars(), act: async () => { [0, 1, 2].forEach((i, k) => setTimeout(() => s.gauge.flash("check", i), k * 350)); await hero.wait(1.2); },
      say: "<b>items</b> is an array of 3 ints. In memory they sit side by side, 4 bytes apart: <b>0x2A0, 0x2A4, 0x2A8</b> — painted beside each notch." },
    { line: 3, vars: vars(), act: async () => { moveTop(-1); await hero.wait(0.6); },
      say: "<b>top</b> is the index of the top crate. The pile is empty, so it starts at <b>-1</b>: the red TOP tag hangs below slot [0]." },
    { line: 25, vars: vars(), act: () => fetch(4).then(c => (ctx.held = c)),
      say: "The program starts. <b>push(4)</b>: Odysseus brings crate 4 to the pile." },
    { line: 6, vars: vars(), act: async () => { s.gauge.flash("check", 0); await hero.wait(0.8); },
      say: "First the check: is <b>top == CAP - 1</b>? top is -1, CAP - 1 is 2. <b>No</b> — there is room." },
    { line: 10, act: async () => { moveTop(0); await hero.wait(0.7); }, get vars() { return vars({ top: 0, items: { items: [...S.items], top: 0, addr } }); },
      say: "<b>top = top + 1</b>: the TOP pointer slides up to slot <b>0</b>." },
    { line: 11, act: () => setInSlot(ctx.held), get vars() { return vars({ items: { items: [4, null, null], top: 0, addr } }); },
      say: "<b>items[top] = x</b>: crate 4 goes into slot <b>[0]</b>, at address 0x2A0." },
    { line: 26, act: () => quickPush(7), get vars() { return vars({ top: 1, items: { items: [4, 7, null], top: 1, addr } }); },
      say: "<b>push(7)</b>. The same three lines: check, top + 1, set the crate. Now top is <b>1</b>." },
    { line: 27, act: () => quickPush(99), get vars() { return vars({ top: 2, items: { items: [4, 7, 99], top: 2, addr } }); },
      say: "<b>push(99)</b> — the golden amphora. top is <b>2</b>, the last slot.",
      quiz: { q: "The pile is [4, 7, 99]. Which crate will pop() take first?", options: ["4 — it came first", "7 — the middle one", "99 — the last one in"], answer: 2,
              why: "Right. <b>Last in, first out</b>: only the top crate can be reached." } },
    { line: 28, act: () => fetch(5).then(c => (ctx.held = c)), get vars() { return vars(); },
      say: "<b>push(5)</b>: one crate too many. Watch the check." },
    { line: 6, get vars() { return vars(); }, act: async () => {
        s.gauge.flash("full");
        // he lifts it toward a fourth slot that does not exist, and stops
        const c = ctx.held, from = c.position.clone(), up = trial.slot(s, CAP).add(new THREE.Vector3(0, 0.05, 0));
        hero.carrying = null;
        await hero.over(0.7, k => { const e = k * k * (3 - 2 * k); c.position.lerpVectors(from, up, e * 0.75); });
        await hero.wait(0.4);
        await hero.over(0.6, k => { const e = k * k * (3 - 2 * k); c.position.lerpVectors(up.clone().lerp(from, 0.25), from, e); });
        hero.carrying = c;
      },
      say: "<b>top == CAP - 1</b>? top is 2, CAP - 1 is 2. <b>Yes — the pile is full.</b> There is no slot [3]." },
    { line: 7, out: "Overflow", get vars() { return vars(); }, act: async () => {
        await hero.walkTo(heapFront.x, heapFront.z); await hero.place(HEAP.clone());
        await fadeAway(ctx.held);
      },
      say: "<b>Overflow.</b> The push stops here and nothing changes: top stays 2. He puts crate 5 back." },
    { line: 29, get vars() { return vars(); }, act: async () => { await hero.walkTo(stand.x, stand.z); await hero.face(s.x, s.z); },
      say: "Now take crates off. <b>int a = pop();</b>" },
    { line: 15, get vars() { return vars(); }, act: async () => { s.gauge.flash("check", S.top); await hero.wait(0.8); },
      say: "Check: is <b>top == -1</b>? top is 2. <b>No</b> — there is something to take." },
    { line: 19, get vars() { return vars({ x: 99 }); }, act: async () => { ctx.held = await takeTop(); },
      say: "<b>int x = items[top]</b>: he lifts the crate in slot [2] — the 99." },
    { line: 20, get vars() { return vars({ top: 1, items: { items: [4, 7, null], top: 1, addr }, x: 99 }); },
      act: async () => { S.items[2] = null; s.crates.length = 2; moveTop(1); trial.write(); await hero.wait(0.7); },
      say: "<b>top = top - 1</b>: TOP slides down to <b>1</b>. Crate 7 is the top now." },
    { line: 21, get vars() { return vars({ a: 99 }); }, act: async () => { S.ret.a = 99; await setAside(ctx.held); },
      say: "<b>return x</b>: so <b>a = 99</b>. He sets it aside.",
      quiz: { q: "After that pop, what is top?", options: ["-1", "1", "2"], answer: 1, why: "Yes: <b>top = 2 - 1 = 1</b>. Crate 7 sits in slot [1], on top." } },
    { line: 30, get vars() { return vars({ b: 7 }); }, act: () => quickPop("b"),
      say: "<b>b = pop()</b>: check, take items[1] — the 7 — and top drops to 0." },
    { line: 31, get vars() { return vars({ c: 4 }); }, act: () => quickPop("c"),
      say: "<b>c = pop()</b>: the 4. top is <b>-1</b> again: empty." },
    { line: 32, get vars() { return vars(); }, act: async () => {
        await hero.walkTo(stand.x, stand.z); await hero.face(s.x, s.z);
        s.gauge.flash("empty", 0);
        await hero.reachFor(trial.slot(s, 0));
      },
      say: "<b>d = pop()</b>: one too many. Check: is <b>top == -1</b>? <b>Yes.</b> He reaches for a crate that is not there." },
    { line: 16, out: "Underflow", get vars() { return vars({ d: -1 }); }, act: async () => { await hero.wait(0.6); },
      say: "<b>Underflow.</b> There was nothing to take, so pop() returns <b>-1</b> as a warning." },
    { line: 33, get vars() { return vars({ d: -1 }); }, act: async () => { await hero.wait(0.3); },
      say: "That is the whole stack: <b>an array, one index called top, and two checks</b> — before you push, and before you pop. Now the harbour will test you." }
  ];
  return new LessonPlayer({ title: "The Laestrygonian Harbour", subtitle: "how a stack works", code: STACK_C, steps });
}
