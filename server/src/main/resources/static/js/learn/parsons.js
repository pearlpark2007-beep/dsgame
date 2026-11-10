// parsons.js — "arrange the lines": the warm-up before writing an operation for the first time.
// The correct lines come shuffled, with one decoy that looks right but isn't (i <= n, a missing temp…).
// Drag lines into order (or use the ↑ ↓ buttons; they work from the keyboard too), set the decoy aside,
// and check. Every line in the right place turns green; once it's all right, the panel is done.
// (Research: Parsons problems teach as much as writing code, in less time; Ericson 2018.)
//   new Parsons({ title, goal, lines: ["...", ...], decoys: ["..."], why }).open() -> Promise
const css = `
#parsons { position: fixed; top: 0; right: 0; bottom: 0; width: 460px; z-index: 26; box-sizing: border-box; display: flex; flex-direction: column;
  background: rgba(14, 10, 7, 0.96); border-left: 3px solid #2a1c12; color: #efe1c2; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace;
  transform: translateX(100%); transition: transform 0.5s cubic-bezier(.2,.8,.2,1); }
#parsons.on { transform: none; }
#parsons .head { padding: 18px 22px 10px; border-bottom: 1px solid #3a2a1c; }
#parsons .who { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: 28px; letter-spacing: 2px; color: #f2c230; text-shadow: 2px 2px 0 #7e1a0f; }
#parsons .what { font-size: 13px; letter-spacing: 3px; color: #b9a684; margin-top: 2px; }
#parsons .goal { margin: 12px 14px 0; padding: 12px 14px; background: #efe1c2; color: #1d140c; font-size: 15px; line-height: 1.45; border-radius: 2px; }
#parsons .lbl { margin: 14px 16px 4px; font-size: 11px; letter-spacing: 2px; color: #8c7c66; }
#parsons .list { margin: 0 14px; min-height: 44px; padding: 4px; background: #0a0705; border: 1px dashed #3a2a1c; border-radius: 4px; display: flex; flex-direction: column; gap: 4px; }
#parsons .row { display: flex; align-items: center; gap: 6px; background: #1c140e; border: 1px solid #4a3826; border-left-width: 4px; padding: 4px 6px; cursor: grab; }
#parsons .row.drag { opacity: 0.4; }
#parsons .row.ok { border-color: #9fd08a; } #parsons .row.bad { border-color: #e0644a; }
#parsons .row code { flex: 1; white-space: pre; font-family: inherit; font-size: 13.5px; color: #efe1c2; }
#parsons .row button { min-width: 30px; min-height: 30px; background: transparent; color: #b9a684; border: 1px solid #3a2a1c; font: inherit; cursor: pointer; }
#parsons .row button:hover, #parsons .row button:focus-visible { color: #f2c230; border-color: #f2c230; outline: none; }
#parsons .say { margin: 12px 14px 0; min-height: 40px; font-size: 14px; line-height: 1.45; color: #efe1c2; }
#parsons .say b { color: #f2c230; }
#parsons .ctrl { margin-top: auto; padding: 12px 14px 16px; display: flex; gap: 8px; border-top: 1px solid #3a2a1c; }
#parsons .ctrl button { flex: 1; min-height: 44px; background: transparent; color: #efe1c2; border: 1px solid #4a3a28; font: inherit; font-size: 14px; letter-spacing: 1px; cursor: pointer; }
#parsons .ctrl button.main { background: #f2c230; color: #1d140c; border-color: #f2c230; font-weight: 700; }
@media (max-width: 900px) { #parsons { width: 100%; top: auto; height: 62%; border-left: none; border-top: 3px solid #2a1c12; } }
`;

const shuffle = (a, seed) => { a = [...a]; let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class Parsons {
  constructor({ title = "Arrange the lines", goal, lines, decoys = [], why = "" }) {
    if (!document.getElementById("parsons-css")) { const s = document.createElement("style"); s.id = "parsons-css"; s.textContent = css; document.head.appendChild(s); }
    this.answer = lines; this.why = why;
    // shuffle until nothing is already in its right place at the start
    let order = shuffle([...lines, ...decoys], 7), seed = 7;
    while (order.slice(0, lines.length).some((l, k) => l === lines[k]) && seed < 400) order = shuffle([...lines, ...decoys], seed += 13);
    const el = this.el = document.createElement("aside");
    el.id = "parsons"; el.setAttribute("aria-label", "Arrange the lines");
    el.innerHTML = `<div class="head"><div class="who">ATHENA</div><div class="what"></div></div>
      <div class="goal"></div>
      <div class="lbl">YOUR CODE: top to bottom</div><div class="list use"></div>
      <div class="lbl">SET ASIDE: lines that don't belong</div><div class="list aside"></div>
      <div class="say" aria-live="polite"></div>
      <div class="ctrl"><button class="skip">Skip</button><button class="main check">Check ▸</button></div>`;
    el.querySelector(".what").textContent = title.toUpperCase();
    el.querySelector(".goal").innerHTML = goal;
    this.use = el.querySelector(".use"); this.aside = el.querySelector(".aside");
    order.forEach(text => this.use.appendChild(this._row(text)));
    // drag and drop between and within both lists
    for (const list of [this.use, this.aside]) {
      list.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = el.querySelector(".row.drag"); if (!dragging) return;
        const after = [...list.querySelectorAll(".row:not(.drag)")].find(r => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
        list.insertBefore(dragging, after || null);
      });
    }
    el.querySelector(".check").onclick = () => this.check();
    el.querySelector(".skip").onclick = () => this.finish(true);
    document.body.appendChild(el);
    this.done = new Promise(res => this._resolve = res);
  }

  _row(text) {
    const r = document.createElement("div"); r.className = "row"; r.draggable = true;
    r.innerHTML = `<button class="up" aria-label="move up">↑</button><button class="dn" aria-label="move down">↓</button><code></code><button class="aw" aria-label="set aside or bring back">✕</button>`;
    r.querySelector("code").textContent = text;
    r.dataset.text = text;
    r.addEventListener("dragstart", () => r.classList.add("drag"));
    r.addEventListener("dragend", () => r.classList.remove("drag"));
    r.querySelector(".up").onclick = () => { const p = r.previousElementSibling; if (p) r.parentNode.insertBefore(r, p); r.querySelector(".up").focus(); this._clear(); };
    r.querySelector(".dn").onclick = () => { const nx = r.nextElementSibling; if (nx) r.parentNode.insertBefore(nx, r); r.querySelector(".dn").focus(); this._clear(); };
    r.querySelector(".aw").onclick = () => { (r.parentNode === this.use ? this.aside : this.use).appendChild(r); this._clear(); };
    return r;
  }
  _clear() { this.el.querySelectorAll(".row").forEach(r => r.classList.remove("ok", "bad")); }

  check() {
    const rows = [...this.use.querySelectorAll(".row")];
    let right = 0;
    rows.forEach((r, k) => { const ok = r.dataset.text === this.answer[k]; r.classList.toggle("ok", ok); r.classList.toggle("bad", !ok); if (ok) right++; });
    this.aside.querySelectorAll(".row").forEach(r => { const ok = !this.answer.includes(r.dataset.text); r.classList.toggle("ok", ok); r.classList.toggle("bad", !ok); });
    const say = this.el.querySelector(".say");
    if (right === this.answer.length && rows.length === this.answer.length) {
      say.innerHTML = "<b>Right.</b> " + this.why;
      this.el.querySelector(".check").textContent = "Continue ▸";
      this.el.querySelector(".check").onclick = () => this.finish(false);
    } else {
      const decoyIn = rows.some(r => !this.answer.includes(r.dataset.text));
      say.innerHTML = `<b>${right} of ${this.answer.length}</b> lines are in the right place.` + (decoyIn ? " One line in your code doesn't belong." : "");
    }
  }

  open() { requestAnimationFrame(() => this.el.classList.add("on")); return this.done; }
  finish(skipped) {
    if (this.finished) return;
    this.finished = true;
    this.el.classList.remove("on");
    setTimeout(() => this.el.remove(), 600);
    this._resolve({ skipped });
  }
}

// the four warm-ups of the cave, one before each operation is first written
export const CAVE_PARSONS = {
  traverse: { goal: "Add up the weight of every sheep into <b>total</b>.",
    lines: ["int total = 0;", "for (int i = 0; i < n; i++) {", "    total = total + flock[i];", "}"],
    decoys: ["for (int i = 0; i <= n; i++) {"],
    why: "Start at 0, stop <b>before</b> n. The &lt;= line would read the junk in pen n." },
  insert: { goal: "Put a lamb weighing <b>15</b> in pen 0. Everyone else moves one pen right, in order.",
    lines: ["for (int i = n; i > 0; i--) {", "    flock[i] = flock[i - 1];", "}", "flock[0] = 15;", "n++;"],
    decoys: ["for (int i = 1; i <= n; i++) {"],
    why: "Shift right <b>from the end</b>, drop it in, n++. From the front, every pen would end up a copy of pen 0." },
  delete: { goal: "Remove the sheep in pen <b>2</b> and close the gap.",
    lines: ["for (int i = 2; i < n - 1; i++) {", "    flock[i] = flock[i + 1];", "}", "n--;"],
    decoys: ["    flock[i + 1] = flock[i];"],
    why: "Shift left <b>from the gap</b>, then n--. The decoy copies the wrong way and smears pen 2 down the line." },
  reverse: { goal: "Reverse the line with two markers, l and r.",
    lines: ["int l = 0, r = n - 1;", "while (l < r) {", "    int t = flock[l];", "    flock[l] = flock[r];", "    flock[r] = t;", "    l++;", "    r--;", "}"],
    decoys: ["    flock[r] = flock[l];"],
    why: "Hold one in <b>t</b>, copy, put t back, step inward, stop when they meet. Without t, one sheep is lost on every swap." }
};
