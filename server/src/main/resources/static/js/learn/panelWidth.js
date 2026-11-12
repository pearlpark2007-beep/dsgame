// panelWidth.js — how wide Athena's panel is, in one place for every page.
// Wider screens get a wider panel (more room for the code and the Codex): 42% of the window,
// never under 480px or over 680px. CSS reads it as var(--pw); the cameras read panelW().
export function panelW() {
  return Math.round(Math.min(680, Math.max(480, innerWidth * 0.42)));
}
function apply() { document.documentElement.style.setProperty("--pw", panelW() + "px"); }
apply();
addEventListener("resize", apply);
