// codex.js — Athena's Codex: the WHOLE C program behind a chapter, inside Athena's panel.
// The trials only show the few lines the player writes; the Codex shows the complete file a C
// compiler would build (struct, malloc, every function, main), cut into parts. Each part has:
//   • the real C code,
//   • WHY it is written that way, HOW it works step by step, and the classic mistake to watch for,
//   • "Run this part": the same steps in the game's C, run on the board and in 3D (the Lab).
//   new Codex(panelEl, CONTENT, part => runIt(part))
// Content lives in codexContent.js (one per chapter).

const css = `
#trial-panel .ptabs { display: flex; gap: 6px; flex-shrink: 0; }
#trial-panel .ptabs button { flex: 1; min-height: 34px; background: #1a130c; color: #c9b48a; border: 1px solid #5a4422; border-radius: 3px; font: 700 12.5px 'Courier Prime', monospace; letter-spacing: 1px; cursor: pointer; }
#trial-panel .ptabs button.on { background: #f2c230; color: #120c06; border-color: #f2c230; }
#trial-panel.codex-on > :not(.who):not(.ptabs):not(.codex) { display: none !important; }
#trial-panel .codex { display: none; flex-direction: column; gap: 10px; min-height: 0; flex: 1 1 auto; overflow-y: auto; padding-right: 4px; }
#trial-panel.codex-on .codex { display: flex; }
#trial-panel .codex .cx-intro { font-size: 13px; color: #c9b48a; line-height: 1.45; margin: 0; }
#trial-panel .codex .cx-parts { display: flex; flex-wrap: wrap; gap: 5px; }
#trial-panel .codex .cx-parts button { background: #241a10; color: #efe1c2; border: 1px solid #5a4422; border-radius: 3px; font: 12.5px 'Courier Prime', monospace; padding: 4px 9px; min-height: 30px; cursor: pointer; }
#trial-panel .codex .cx-parts button:hover { border-color: #f2c230; }
#trial-panel .codex .cx-parts button.on { border-color: #f2c230; color: #f2c230; background: #3a2c0c; }
#trial-panel .codex .cx-parts button.whole { border-style: dashed; }
#trial-panel .codex .cx-card { border: 1px solid #5a4422; border-radius: 4px; background: #140e08; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
#trial-panel .codex h3 { margin: 0; font-family: Anton, Impact, sans-serif; font-weight: 400; letter-spacing: 1px; color: #f2c230; font-size: 20px; }
#trial-panel .codex pre { margin: 0; background: #0b0806; border: 1px solid #3a2c1c; border-radius: 3px; padding: 8px 10px; overflow-x: auto; font: 13.5px/1.5 'Courier Prime', monospace; color: #efe1c2; white-space: pre; }
#trial-panel .codex pre .kw { color: #f2a65a; } #trial-panel .codex pre .ty { color: #5fd1e8; } #trial-panel .codex pre .cm { color: #8c7c66; font-style: italic; } #trial-panel .codex pre .nu { color: #8fe3a0; } #trial-panel .codex pre .fn { color: #f2c230; }
#trial-panel .codex pre .seg { display: block; border-left: 3px solid transparent; margin-left: -10px; padding-left: 7px; cursor: pointer; }
#trial-panel .codex pre .seg:hover { border-left-color: #6b5432; background: #1a130c; }
#trial-panel .codex pre .seg.on { border-left-color: #f2c230; background: #2a1f0c; }
#trial-panel .codex .cx-lbl { font-size: 11px; letter-spacing: 2px; color: #e0644a; margin-bottom: -4px; }
#trial-panel .codex p.cx-txt { margin: 0; font-size: 13.5px; line-height: 1.5; color: #efe1c2; }
#trial-panel .codex ol { margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.5; color: #efe1c2; }
#trial-panel .codex ol li { margin-bottom: 2px; }
#trial-panel .codex .cx-warn { border-left: 3px solid #e0442a; background: #24100c; padding: 6px 10px; font-size: 13px; line-height: 1.45; color: #ffcfb8; }
#trial-panel .codex .cx-note { font-size: 12.5px; color: #9c8a6c; line-height: 1.45; }
#trial-panel .codex .cx-run { min-height: 40px; background: #f2c230; color: #120c06; border: none; border-radius: 3px; font: 700 15px 'Courier Prime', monospace; letter-spacing: 1px; cursor: pointer; }
#trial-panel .codex .cx-run:disabled { opacity: 0.4; cursor: default; }
#trial-panel .codex code { color: #f2c230; }
#trial-panel .cx-say { display: none; flex-shrink: 0; border-left: 3px solid #f2c230; background: #1f1709; padding: 7px 10px; font-size: 13px; line-height: 1.45; color: #efe1c2; max-height: 132px; overflow-y: auto; }
#trial-panel .cx-say.on { display: block; }
#trial-panel .cx-say b.t { display: block; font-size: 11px; letter-spacing: 2px; color: #e0644a; margin-bottom: 2px; }
#trial-panel .cx-say code { color: #f2c230; }
#trial-panel .cx-say .w { display: block; margin-top: 4px; color: #ffcfb8; }
#trial-panel .cx-say .x { float: right; background: none; border: none; color: #9c8a6c; font: 14px 'Courier Prime', monospace; cursor: pointer; }
`;

// a tiny C highlighter (keywords, types, numbers, comments, function names)
const KW = /\b(if|else|while|for|return|break|continue|sizeof|typedef|struct|include|define)\b/g;
const TY = /\b(int|void|char|Node|Stack|NULL)\b/g;
function hl(code) {
  const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.split("\n").map(line => {
    const i = line.indexOf("//");
    const body = i >= 0 ? line.slice(0, i) : line, cm = i >= 0 ? line.slice(i) : "";
    const b = body.replace(/("[^"]*")/g, "\u0001$1\u0002")
      .replace(/\b(\d+)\b/g, "<span class='nu'>$1</span>")
      .replace(KW, "<span class='kw'>$1</span>").replace(TY, "<span class='ty'>$1</span>")
      .replace(/\b([a-zA-Z_]\w*)(?=\()/g, (m, n) => (/^(if|while|for|sizeof|return)$/.test(n) ? m : `<span class='fn'>${n}</span>`))
      .replace(/\u0001|\u0002/g, "");
    return b + (cm ? `<span class='cm'>${cm}</span>` : "");
  }).join("\n");
}

export class Codex {
  // content: { title, intro, parts: [{ id, name, code, why, how: [..], warn, note, run: { code, setup } }] }
  constructor(panel, content, onRun, { trialsLabel = "TRIALS" } = {}) {
    this.panel = panel; this.content = content; this.onRun = onRun;
    if (!document.getElementById("codex-css")) { const s = document.createElement("style"); s.id = "codex-css"; s.textContent = css; document.head.appendChild(s); }
    const tabs = this.tabs = document.createElement("div"); tabs.className = "ptabs";
    tabs.innerHTML = `<button class="t-trials on">${trialsLabel}</button><button class="t-codex">ATHENA'S CODEX · THE WHOLE C PROGRAM</button>`;
    panel.querySelector(".who").after(tabs);
    const box = this.box = document.createElement("div"); box.className = "codex";
    box.innerHTML = `<p class="cx-intro">${content.intro}</p><div class="cx-parts"></div><div class="cx-card"></div>`;
    panel.appendChild(box);
    tabs.querySelector(".t-trials").onclick = () => this.show(false);
    tabs.querySelector(".t-codex").onclick = () => this.show(true);
    const parts = box.querySelector(".cx-parts");
    const whole = document.createElement("button"); whole.className = "whole"; whole.textContent = "📜 whole program";
    whole.onclick = () => this.whole(); parts.appendChild(whole);
    for (const p of content.parts) {
      const b = document.createElement("button"); b.textContent = p.name; b.dataset.id = p.id;
      b.onclick = () => this.part(p.id); parts.appendChild(b);
    }
    this.part(content.parts[0].id);
  }
  // while a part runs on the board, its WHY (and the mistake to watch for) stays in view above the code
  say(part) {
    if (!this.sayEl) {
      this.sayEl = document.createElement("div"); this.sayEl.className = "cx-say";
      const ed = this.panel.querySelector(".editor"); ed.parentNode.insertBefore(this.sayEl, ed);
    }
    if (!part) { this.sayEl.classList.remove("on"); return; }
    this.sayEl.innerHTML = `<button class="x" aria-label="Hide this note" title="Hide">✕</button><b class="t">ATHENA · ${part.name.toUpperCase()}</b>${part.why}` + (part.warn ? `<span class="w"><b>Watch out: </b>${part.warn}</span>` : "");
    this.sayEl.querySelector(".x").onclick = () => this.sayEl.classList.remove("on");
    this.sayEl.classList.add("on"); this.sayEl.scrollTop = 0;
  }
  show(on) {
    this.panel.classList.toggle("codex-on", on);
    this.tabs.querySelector(".t-trials").classList.toggle("on", !on);
    this.tabs.querySelector(".t-codex").classList.toggle("on", on);
  }
  get open() { return this.panel.classList.contains("codex-on"); }
  setBusy(b) { const r = this.box.querySelector(".cx-run"); if (r) r.disabled = b; }

  _mark(id) { this.box.querySelectorAll(".cx-parts button").forEach(b => b.classList.toggle("on", b.dataset.id === id || (id === "*" && b.classList.contains("whole")))); }

  // the complete file, every part clickable
  whole() {
    this._mark("*");
    const card = this.box.querySelector(".cx-card");
    const segs = this.content.parts.map(p => `<span class="seg" data-id="${p.id}" title="${p.name}: tap to explain">${hl(p.code)}\n</span>`).join("\n");
    card.innerHTML = `<h3>${this.content.title}</h3><div class="cx-note">The complete program, as a C compiler would build it. Tap any part to see why it's written that way, and run it.</div><pre>${segs}</pre>`;
    card.querySelectorAll(".seg").forEach(s => (s.onclick = () => this.part(s.dataset.id)));
    card.scrollTop = 0; this.box.scrollTop = 0;
  }

  // one part: code, why, how, the classic mistake, and run it
  part(id) {
    const p = this.content.parts.find(x => x.id === id); if (!p) return;
    this._mark(id);
    const card = this.box.querySelector(".cx-card");
    card.innerHTML = `<h3>${p.name}</h3><pre>${hl(p.code)}</pre>
      <div class="cx-lbl">WHY</div><p class="cx-txt">${p.why}</p>
      <div class="cx-lbl">HOW</div><ol>${p.how.map(h => `<li>${h}</li>`).join("")}</ol>
      ${p.warn ? `<div class="cx-warn"><b>WATCH OUT · </b>${p.warn}</div>` : ""}
      ${p.run ? `<button class="cx-run">▶ RUN THIS PART ON THE BOARD</button>` : ""}
      ${p.note ? `<div class="cx-note">${p.note}</div>` : ""}`;
    const run = card.querySelector(".cx-run");
    if (run) run.onclick = () => { this.show(false); this.onRun(p); };
    this.box.scrollTop = 0;
  }
}
