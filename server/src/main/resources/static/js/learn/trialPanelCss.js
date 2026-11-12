import "./panelWidth.js";
// trialPanelCss.js — the look of Athena's trial panel (the code editor, GUIDE HIM, the tabs).
// Shared by the Harbour (stack) and the Cave (array) trials.
export const TRIAL_CSS = `
#trial-panel { position: fixed; top: 0; right: 0; bottom: 0; width: var(--pw, 520px); z-index: 25; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px; background: rgba(14, 10, 7, 0.95); border-left: 3px solid #2a1c12; color: #efe1c2; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace;
  transform: translateX(100%); transition: transform 0.5s cubic-bezier(.2,.8,.2,1); overflow-y: auto; }
#trial-panel.on { transform: none; }
#trial-panel .who { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: 26px; letter-spacing: 2px; color: #f2c230; text-shadow: 2px 2px 0 #7e1a0f; }
#trial-panel .tabs { display: flex; gap: 6px; }
#trial-panel .tab { flex: 1; min-height: 42px; background: transparent; color: #b9a684; border: 1px solid #4a3a28; font: inherit; font-size: 13px; letter-spacing: 1px; cursor: pointer; }
#trial-panel .tab.on { border-color: #f2c230; color: #f2c230; background: rgba(242,194,48,0.08); }
#trial-panel h2 { margin: 2px 0 0; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: 24px; letter-spacing: 1px; }
#trial-panel .story { margin: 0; color: #b9a684; font-size: 14px; font-style: italic; }
#trial-panel .goal { margin: 0; font-size: 14px; line-height: 1.45; }
#trial-panel .goal b { color: #f2c230; letter-spacing: 2px; font-size: 12px; display: block; }
#trial-panel .meta { display: flex; justify-content: space-between; font-size: 13px; color: #b9a684; }
#trial-panel .meta .moves b { color: #f2c230; }
#trial-panel .hint { font-size: 13px; color: #d8c49a; border: 1px dashed #5a4630; padding: 6px 8px; }
#trial-panel .linkb { background: none; border: none; color: #f2c230; font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; padding: 0; text-align: left; }
#trial-panel .editor { position: relative; display: flex; height: 220px; border: 1px solid #2f2116; background: #0a0705; border-radius: 3px; overflow: hidden; flex: none; }
#trial-panel .gutter { width: 34px; padding: 10px 6px 10px 0; box-sizing: border-box; text-align: right; color: #5c4c3a; font-size: 13px; line-height: 20px; white-space: pre; overflow: hidden; user-select: none; }
#trial-panel .wrap { position: relative; flex: 1; overflow: hidden; }
#trial-panel .hl { position: absolute; left: 0; right: 0; height: 20px; background: rgba(242,194,48,0.16); border-left: 3px solid #f2c230; display: none; pointer-events: none; }
#trial-panel .hl.err { background: rgba(224,68,42,0.22); border-left-color: #e0442a; }
#trial-panel textarea { position: absolute; inset: 0; width: 100%; height: 100%; box-sizing: border-box; resize: none; border: none; outline: none; background: transparent;
  color: #efe1c2; font-family: inherit; font-size: 13px; line-height: 20px; padding: 10px; white-space: pre; overflow: auto; tab-size: 4; }
#trial-panel .run { min-height: 48px; background: #f2c230; color: #1d140c; border: none; font-family: Anton, Impact, sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; }
#trial-panel .run:disabled { opacity: 0.5; cursor: wait; }
#trial-panel .row { display: flex; gap: 8px; }
#trial-panel .row button { flex: 1; min-height: 40px; background: transparent; color: #efe1c2; border: 1px solid #4a3a28; font: inherit; font-size: 13px; cursor: pointer; }
#trial-panel .status { min-height: 40px; font-size: 14px; line-height: 1.45; }
#trial-panel .status.bad { color: #f0a08c; } #trial-panel .status.good { color: #f2c230; }
#trial-panel .words { font-size: 12px; color: #8c7c66; line-height: 1.6; border-top: 1px solid #3a2a1c; padding-top: 8px; }
#trial-panel .words code { color: #efe1c2; }
/* the editor gets as much height as the screen allows (never under 200px); on short screens the
   story and goal shrink so the code and the GUIDE HIM button stay in view */
#trial-panel > * { flex-shrink: 0; }
#trial-panel .editor { height: clamp(200px, 40vh, 440px); flex: 0 1 auto; min-height: 170px; }
@media (max-height: 820px) {
  #trial-panel { gap: 7px; padding: 10px 14px; } #trial-panel .who { font-size: 21px; } #trial-panel h2 { font-size: 19px; }
  #trial-panel .tab { min-height: 34px; font-size: 12px; }
  #trial-panel .story { font-size: 12.5px; max-height: 3.2em; overflow: auto; } #trial-panel .goal { font-size: 13px; line-height: 1.35; }
  #trial-panel .run { min-height: 42px; font-size: 18px; } #trial-panel .row button { min-height: 34px; }
  #trial-panel .words { font-size: 11px; }
}
@media (max-width: 900px) { #trial-panel { width: 100%; top: auto; height: 60%; border-left: none; border-top: 3px solid #2a1c12; } }
`;
