// athenaLine.js — Athena's code box for the Harbour, the Cave and the Underworld: the same dark-blue box as
// Circe's Scroll, above the scene, following the run as it plays. It shows the line before, the line running now
// (big) and the line after, and under them what that line just did, in the interpreter's own words
// ("Read pen 0: 34", "total = 34"). It never invents a value: every word under the code is a step's message.
// (Circe's Scroll goes further — the values fly into the pigs' tags — and stays Circe's own.)
// Key A switches it on and off; the choice is kept in the same place as Circe's ("athena.code").
const KEY = "athena.code";
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KW = /\b(struct|int|void|return|if|while|for|else|sizeof|bool|true|false)\b/g;
const hi = s => esc(s).replace(KW, '<span class="al-kw">$1</span>');

const CSS = `
#athena-line { position: fixed; z-index: 24; left: 16px; top: 58px; width: min(640px, calc(100vw - var(--pw, 0px) - 48px)); box-sizing: border-box;
  background: rgba(14, 22, 48, 0.94); border: 1px solid #f2c230; border-radius: 8px; box-shadow: 0 8px 26px rgba(0,0,0,.45);
  color: #e8edf8; font: 14px/1.45 'Courier Prime', monospace; display: none; }
#athena-line.on { display: block; }
#athena-line .al-top { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid rgba(242,194,48,.25); font-size: 12px; }
#athena-line .al-who { padding: 1px 8px; border-radius: 10px; border: 1px solid #4a5a88; color: #c8d2ee; }
#athena-line .al-at { padding: 1px 8px; border-radius: 10px; background: #f2c230; color: #14100b; font-weight: 700; }
#athena-line .al-n { margin-left: auto; color: #8f9cc0; }
#athena-line .al-lines { padding: 6px 12px 4px; }
#athena-line .al-l { display: flex; gap: 12px; white-space: pre; overflow: hidden; text-overflow: ellipsis; color: #7b88aa; font-size: 13px; }
#athena-line .al-l .ln { width: 2.2em; text-align: right; flex: none; color: #55618a; }
#athena-line .al-l.now { color: #ffffff; font-size: 17px; font-weight: 700; padding: 3px 0; }
#athena-line .al-l.now .ln { color: #f2c230; }
#athena-line .al-kw { color: #8fb0ff; }
#athena-line .al-l.now .al-kw { color: #a9c2ff; }
#athena-line .al-say { padding: 6px 12px 8px; border-top: 1px solid rgba(242,194,48,.25); min-height: 1.45em; }
#athena-line .al-say b { color: #7dffb0; font-weight: 700; margin-right: 8px; }
#athena-line .al-say span { color: #f2c230; }
@media (max-width: 900px) { #athena-line { top: 8px; width: calc(100vw - 24px); left: 12px; } }
@media (prefers-reduced-motion: no-preference) { #athena-line.on { animation: al-in .18s ease-out; } @keyframes al-in { from { opacity: 0; transform: translateY(-6px); } } }
`;

export class AthenaLine {
  constructor({ who = "Athena" } = {}) {
    if (!document.getElementById("athena-line-css")) { const s = document.createElement("style"); s.id = "athena-line-css"; s.textContent = CSS; document.head.appendChild(s); }
    let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) {}
    this.enabled = saved !== "off";
    const el = this.el = document.createElement("section"); el.id = "athena-line"; el.setAttribute("aria-label", "Athena explains the running line");
    el.innerHTML = `<div class="al-top"><span class="al-who">${esc(who)}</span><span class="al-at"></span><span class="al-n"></span></div>
      <div class="al-lines"></div><div class="al-say" aria-live="polite"></div>`;
    document.body.appendChild(el);
    this.line = 0; this.said = [];
    addEventListener("keydown", e => {
      if (e.key !== "a" && e.key !== "A") return;
      const t = e.target; if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.set(!this.enabled);
    });
  }
  set(on) { this.enabled = !!on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (!on) this.el.classList.remove("on"); else if (this.line) this.el.classList.add("on"); }
  // one interpreter step: the code being run, the step (line, message), and where it sits in the run
  step(code, st, k, n) {
    if (!st || !st.line) return;
    const src = String(code || "").split("\n");
    if (st.line !== this.line) { this.line = st.line; this.said = []; }
    if (st.message) { this.said.push(st.message); if (this.said.length > 3) this.said.shift(); }
    const row = i => (i < 1 || i > src.length) ? "" : `<div class="al-l${i === st.line ? " now" : ""}"><span class="ln">${i}</span><span>${hi(src[i - 1])}</span></div>`;
    this.el.querySelector(".al-lines").innerHTML = row(st.line - 1) + row(st.line) + row(st.line + 1);
    this.el.querySelector(".al-at").textContent = `line ${st.line}`;
    this.el.querySelector(".al-n").textContent = "A: hide";             // (the board below keeps the step count)
    const last = this.said[this.said.length - 1] || "", before = this.said.slice(0, -1);
    this.el.querySelector(".al-say").innerHTML = (last ? `<b>✦</b><span>${esc(last)}</span>` : "") + (before.length ? `<i style="color:#8f9cc0">  ·  ${before.map(esc).join("  ·  ")}</i>` : "");
    if (this.enabled) this.el.classList.add("on");
  }
  clear() { this.line = 0; this.said = []; this.el.classList.remove("on"); }
}
