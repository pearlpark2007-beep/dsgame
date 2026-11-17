// fullView.js — every dialog box can be closed for a full view of the scene (the teacher's request, after Circe).
// Each panel gets an × . A closed panel is hidden (visibility only, so nothing re-lays out under it) and a small
// "SHOW PANELS" tab appears at the bottom left; it, or the H key, brings every closed panel back. H also closes
// them all at once. Panels are found by id as they appear, so a page only has to import this module.
const PANELS = [
  // [id, where the × sits: "edge" = on the panel's left edge (panels docked to the right), "corner" = top right]
  ["trial-panel", "edge"], ["athena-learn", "edge"], ["parsons", "edge"],
  ["stack-board", "corner"], ["array-board", "corner"], ["list-board", "corner"], ["queue-board", "corner"],
  ["athena-scroll", "corner"], ["athena-line", "corner"]
];
const CSS = `
.fv-x { position: absolute; z-index: 5; width: 26px; height: 26px; border-radius: 50%; border: 1px solid #8a7a5a; background: #14100b; color: #f4ead2;
  font: 700 15px/24px 'Courier Prime', monospace; text-align: center; cursor: pointer; padding: 0; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
.fv-x:hover, .fv-x:focus-visible { border-color: #f2c230; color: #f2c230; outline: none; }
.fv-x.corner { top: -11px; right: -11px; }
.fv-x.edge { top: 10px; left: -13px; }
.fv-off { visibility: hidden !important; pointer-events: none !important; }
.fv-off .fv-x { visibility: hidden !important; }
#fv-show { position: fixed; left: 16px; bottom: 16px; z-index: 60; display: none; padding: 8px 14px; border-radius: 4px; border: 1px solid #8a7a5a;
  background: rgba(10, 8, 6, .85); color: #f4ead2; font: 700 12px 'Courier Prime', monospace; letter-spacing: 2px; cursor: pointer; }
#fv-show.on { display: block; }
#fv-show:hover, #fv-show:focus-visible { border-color: #f2c230; color: #f2c230; outline: none; }
@media (max-width: 900px) { .fv-x.edge { left: auto; right: 10px; } }
`;
const closed = new Set();
let showBtn = null;

function paint() { if (showBtn) showBtn.classList.toggle("on", closed.size > 0); }
function close(el) { el.classList.add("fv-off"); closed.add(el); paint(); }
function openAll() { for (const el of closed) el.classList.remove("fv-off"); closed.clear(); paint(); }
function closeAll() { for (const [id] of PANELS) { const el = document.getElementById(id); if (el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && !el.classList.contains("fv-off")) close(el); } }   // (getClientRects: fixed panels have no offsetParent)

function attach() {
  for (const [id, where] of PANELS) {
    const el = document.getElementById(id);
    if (!el || el.querySelector(":scope > .fv-x")) continue;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    const x = document.createElement("button");
    x.className = "fv-x " + where; x.type = "button"; x.textContent = "×";
    x.title = "Close for a full view (H brings it back)"; x.setAttribute("aria-label", "Close this panel for a full view");
    x.addEventListener("click", e => { e.stopPropagation(); close(el); });
    el.appendChild(x);
  }
}

export function installFullView() {
  if (document.getElementById("fv-css")) return;
  const s = document.createElement("style"); s.id = "fv-css"; s.textContent = CSS; document.head.appendChild(s);
  showBtn = document.createElement("button"); showBtn.id = "fv-show"; showBtn.type = "button"; showBtn.textContent = "▸ SHOW PANELS (H)";
  showBtn.addEventListener("click", openAll); document.body.appendChild(showBtn);
  attach();
  new MutationObserver(attach).observe(document.body, { childList: true });
  addEventListener("keydown", e => {
    if (e.key !== "h" && e.key !== "H") return;
    const t = e.target; if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (closed.size) openAll(); else closeAll();
  });
}
installFullView();
