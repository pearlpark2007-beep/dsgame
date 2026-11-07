// lessonPlayer.js — Athena's Learn mode, the same for every island.
// A lesson is real C code plus a list of steps. Each step lights one line, says one thing,
// updates the variables panel, and makes the 3D world act out what that line does.
//   step = { line, say, vars?, out?, act?: async () => {}, quiz?: { q, options: [...], answer, why } }
// Next goes one step forward; Auto plays on its own; Skip ends the lesson.

const css = `
#athena-learn { position: fixed; top: 0; right: 0; bottom: 0; width: 460px; z-index: 25; box-sizing: border-box; display: flex; flex-direction: column;
  background: rgba(14, 10, 7, 0.94); border-left: 3px solid #2a1c12; color: #efe1c2; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace;
  transform: translateX(100%); transition: transform 0.5s cubic-bezier(.2,.8,.2,1); }
#athena-learn.on { transform: none; }
#athena-learn .head { padding: 18px 22px 10px; border-bottom: 1px solid #3a2a1c; }
#athena-learn .who { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: 28px; letter-spacing: 2px; color: #f2c230; text-shadow: 2px 2px 0 #7e1a0f; }
#athena-learn .what { font-size: 13px; letter-spacing: 3px; color: #b9a684; margin-top: 2px; }
#athena-learn .code { margin: 12px 14px 0; padding: 10px 0; background: #0a0705; border: 1px solid #2f2116; border-radius: 4px; font-size: 13.5px; line-height: 20px; overflow: auto; flex: 0 1 auto; max-height: 46vh; }
#athena-learn .ln { display: flex; white-space: pre; padding: 0 10px 0 0; border-left: 3px solid transparent; transition: background 0.2s; }
#athena-learn .ln .n { width: 34px; flex: none; text-align: right; padding-right: 10px; color: #5c4c3a; user-select: none; }
#athena-learn .ln.on { background: rgba(242, 194, 48, 0.16); border-left-color: #f2c230; }
#athena-learn .ln.on .n { color: #f2c230; }
#athena-learn .ln .k { color: #e8836a; } #athena-learn .ln .c { color: #8c7c66; font-style: italic; } #athena-learn .ln .d { color: #f2c230; }
#athena-learn .vars { margin: 12px 14px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; font-size: 13px; }
#athena-learn .var { background: #1c140e; border: 1px solid #3a2a1c; padding: 6px 10px; border-radius: 3px; transition: border-color .2s, background .2s; }
#athena-learn .var b { color: #f2c230; font-weight: 700; }
#athena-learn .var.changed { border-color: #f2c230; background: #2c210f; }
#athena-learn .arr { display: flex; gap: 4px; margin-top: 4px; }
#athena-learn .cell { width: 52px; text-align: center; border: 1px solid #4a3826; padding: 3px 0; font-size: 12px; }
#athena-learn .cell .v { font-size: 15px; color: #efe1c2; min-height: 18px; } #athena-learn .cell .i { color: #8c7c66; font-size: 11px; }
#athena-learn .cell.top { border-color: #e0644a; box-shadow: 0 0 0 1px #e0644a inset; }
#athena-learn .out { margin: 10px 14px 0; font-size: 13px; color: #e0644a; min-height: 18px; }
#athena-learn .say { margin: 12px 14px 0; padding: 12px 14px; background: #efe1c2; color: #1d140c; font-size: 15px; line-height: 1.45; border-radius: 2px; min-height: 64px; }
#athena-learn .quiz { margin: 10px 14px 0; display: none; flex-direction: column; gap: 6px; }
#athena-learn .quiz.on { display: flex; }
#athena-learn .quiz button { text-align: left; min-height: 40px; padding: 0 12px; background: #1c140e; color: #efe1c2; border: 1px solid #4a3826; font: inherit; font-size: 14px; cursor: pointer; }
#athena-learn .quiz button.right { border-color: #9fd08a; color: #9fd08a; } #athena-learn .quiz button.wrong { border-color: #e0644a; color: #e0644a; }
#athena-learn .ctrl { margin-top: auto; padding: 12px 14px 16px; display: flex; gap: 8px; border-top: 1px solid #3a2a1c; }
#athena-learn .ctrl button { flex: 1; min-height: 44px; background: transparent; color: #efe1c2; border: 1px solid #4a3a28; font: inherit; font-size: 14px; letter-spacing: 1px; cursor: pointer; }
#athena-learn .ctrl button.main { background: #f2c230; color: #1d140c; border-color: #f2c230; font-weight: 700; }
#athena-learn .ctrl button:disabled { opacity: 0.4; cursor: default; }
#athena-learn .prog { font-size: 12px; color: #8c7c66; padding: 0 14px; margin-top: 8px; }
@media (max-width: 900px) { #athena-learn { width: 100%; top: auto; height: 58%; border-left: none; border-top: 3px solid #2a1c12; } #athena-learn .code { max-height: 24vh; } }
`;

// very small C highlighter: keywords, comments, #define
function highlight(line) {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const ci = line.indexOf("//");
  const code = ci >= 0 ? line.slice(0, ci) : line, comment = ci >= 0 ? line.slice(ci) : "";
  let h = esc(code)
    .replace(/^(#define)/, "<span class='d'>$1</span>")
    .replace(/\b(int|void|if|return|else|while|for)\b/g, "<span class='k'>$1</span>");
  if (comment) h += "<span class='c'>" + esc(comment) + "</span>";
  return h || " ";
}

export class LessonPlayer {
  constructor({ title, subtitle, code, steps }) {
    if (!document.getElementById("athena-learn-css")) { const s = document.createElement("style"); s.id = "athena-learn-css"; s.textContent = css; document.head.appendChild(s); }
    this.steps = steps; this.i = -1; this.auto = false; this.busy = false;
    const el = this.el = document.createElement("aside");
    el.id = "athena-learn"; el.setAttribute("aria-label", "Athena teaches");
    el.innerHTML = `<div class="head"><div class="who">ATHENA</div><div class="what"></div></div>
      <div class="code" role="list"></div><div class="vars" aria-live="polite"></div><div class="out" aria-live="polite"></div>
      <div class="say" aria-live="polite"></div><div class="quiz"></div><div class="prog"></div>
      <div class="ctrl"><button class="skip">Skip lesson</button><button class="autob">Auto ▸</button><button class="main next">Next ▸</button></div>`;
    el.querySelector(".what").textContent = (title + " · " + subtitle).toUpperCase();
    const codeEl = el.querySelector(".code");
    code.split("\n").forEach((l, k) => {
      const d = document.createElement("div"); d.className = "ln"; d.setAttribute("role", "listitem");
      d.innerHTML = `<span class="n">${k + 1}</span><span>${highlight(l)}</span>`;
      codeEl.appendChild(d);
    });
    document.body.appendChild(el);
    this.lines = [...codeEl.children];
    this.nextBtn = el.querySelector(".next"); this.autoBtn = el.querySelector(".autob");
    this.nextBtn.onclick = () => this.next();
    this.autoBtn.onclick = () => { this.auto = !this.auto; this.autoBtn.textContent = this.auto ? "Pause ❚❚" : "Auto ▸"; if (this.auto && !this.busy) this.next(); };
    el.querySelector(".skip").onclick = () => this.finish(true);
    this.done = new Promise(res => this._resolve = res);
    this.onKey = e => { if (e.key === "ArrowRight" || e.key === "Enter") this.next(); };
  }

  open() { requestAnimationFrame(() => this.el.classList.add("on")); addEventListener("keydown", this.onKey); return this.done; }

  setVars(v) {
    if (!v) return;
    const box = this.el.querySelector(".vars"), before = this.prev || {};
    box.innerHTML = "";
    for (const [k, val] of Object.entries(v)) {
      const d = document.createElement("div"); d.className = "var" + (JSON.stringify(before[k]) !== JSON.stringify(val) ? " changed" : "");
      if (Array.isArray(val?.items)) {
        d.innerHTML = `<div>${k}[ ]</div><div class="arr">${val.items.map((x, i) => `<div class="cell${i === val.top ? " top" : ""}"><div class="v">${x ?? ""}</div><div class="i">[${i}] ${val.addr ? val.addr[i] : ""}</div></div>`).join("")}</div>`;
      } else d.innerHTML = `${k} = <b>${val}</b>`;
      box.appendChild(d);
    }
    this.prev = JSON.parse(JSON.stringify(v));
  }

  async next() {
    if (this.busy || this.finished) return;
    if (this.i + 1 >= this.steps.length) return this.finish(false);
    this.busy = true; this.nextBtn.disabled = true;
    const st = this.steps[++this.i];
    this.lines.forEach((l, k) => l.classList.toggle("on", k + 1 === st.line));
    if (st.line) this.lines[st.line - 1].scrollIntoView({ block: "nearest", behavior: "smooth" });
    this.el.querySelector(".say").innerHTML = st.say || "";
    this.el.querySelector(".out").textContent = st.out ? "> " + st.out : "";
    this.el.querySelector(".prog").textContent = `step ${this.i + 1} of ${this.steps.length}`;
    this.setVars(st.vars);
    if (st.act) await st.act();
    if (st.quiz) await this.ask(st.quiz);
    this.busy = false; this.nextBtn.disabled = false;
    if (this.auto && !this.finished) setTimeout(() => this.auto && this.next(), st.quiz ? 400 : 1300);
  }

  // a quick check: the lesson waits for the right answer
  ask({ q, options, answer, why }) {
    const box = this.el.querySelector(".quiz");
    box.innerHTML = `<div style="font-size:14px;color:#f2c230">${q}</div>`;
    box.classList.add("on");
    return new Promise(res => {
      options.forEach((o, k) => {
        const b = document.createElement("button"); b.textContent = o;
        b.onclick = () => {
          if (k === answer) { b.classList.add("right"); this.el.querySelector(".say").innerHTML = why; setTimeout(() => { box.classList.remove("on"); res(); }, 900); }
          else { b.classList.add("wrong"); b.disabled = true; }
        };
        box.appendChild(b);
      });
    });
  }

  finish(skipped) {
    if (this.finished) return;
    this.finished = true; this.auto = false;
    removeEventListener("keydown", this.onKey);
    this.el.classList.remove("on");
    setTimeout(() => this.el.remove(), 600);
    this._resolve({ skipped, stepsSeen: this.i + 1 });
  }
}
