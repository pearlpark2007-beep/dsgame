// ui.js — the shared layer every chapter page installs: the design tokens, one loading screen, one
// result-stamp family, the VOYAGE button (the map), one sound control for the whole game, the chapter's
// colour grade, the "chapter done" epilogue, and an FPS meter for measuring on the real laptop.
//   installUI({ chapter: "cave", world })
import { sound } from "../engine/sound.js";
import { applyGrade } from "./grades.js";
import { chapter as chapterOf, nextOf, status } from "./progress.js";
import { voyageTo, arriving } from "./voyage.js";
import { DEEDS } from "../story/tags.js";

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage off */ } }
};
const typing = e => e.target && (e.target.closest("textarea, input, [contenteditable=true], select"));

export function installUI({ chapter, world = null, ambience = chapter } = {}) {
  const c = chapterOf(chapter);
  // tokens and the chapter's accent
  if (!document.getElementById("odx-tokens")) {
    const l = document.createElement("link"); l.id = "odx-tokens"; l.rel = "stylesheet"; l.href = new URL("./tokens.css", import.meta.url).href; document.head.appendChild(l);
  }
  document.body.classList.add("odx"); document.body.dataset.chapter = chapter;
  if (c) store.set("odyssey.last", c.id);

  // the loading screen: CHAPTER n over the title, a gold rule, the island's status line
  const ld = document.getElementById("loading");
  if (ld && c) {
    const h1 = ld.querySelector("h1");
    if (h1 && !ld.querySelector(".odx-k")) { const k = document.createElement("div"); k.className = "odx-k"; k.textContent = "Chapter " + c.word; h1.before(k); }
    if (!ld.querySelector(".bar, .odx-bar")) { const b = document.createElement("div"); b.className = "odx-bar"; b.innerHTML = "<i></i>"; (ld.querySelector("p") || ld).before(b); }
    arriving();                                             // a voyage brought us here: this black screen is the chapter card
  }

  // the colour grade (and again whenever a film hands the picture back)
  const regrade = () => world && applyGrade(world, chapter);
  regrade();

  // sound: one volume and one mute for the whole game; this island's ambience starts on the first click or key
  sound.setVolume(+store.get("odyssey.volume", "0.5"));
  sound.muted = store.get("odyssey.mute", "0") === "1";
  document.body.classList.toggle("odx-muted", sound.muted);
  const wake = () => { removeEventListener("pointerdown", wake); removeEventListener("keydown", wake); sound.ctx; if (!sound.muted) sound.ambience(ambience); else sound._ambKind = ambience; };
  addEventListener("pointerdown", wake); addEventListener("keydown", wake);

  // the voyage bar: ☰ VOYAGE and the sound control
  const bar = document.createElement("div"); bar.id = "odx-bar";
  bar.innerHTML = `<button class="map" aria-label="The voyage map">☰ VOYAGE</button>
    <div class="vol"><button class="mute" aria-label="Mute (M)"></button><input type="range" min="0" max="1" step="0.05" aria-label="Volume"></div>`;
  document.body.appendChild(bar);
  const muteBtn = bar.querySelector(".mute"), range = bar.querySelector("input");
  range.value = sound.volume;
  const paint = () => { muteBtn.textContent = sound.muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-pressed", String(sound.muted)); muteBtn.setAttribute("aria-label", sound.muted ? "Sound off (M)" : "Sound on (M)"); document.body.classList.toggle("odx-muted", sound.muted); };
  const toggle = () => { sound.setMuted(!sound.muted); if (!sound.muted && !sound._ambKind) sound.ambience(ambience); store.set("odyssey.mute", sound.muted ? "1" : "0"); paint(); };
  muteBtn.onclick = toggle;
  range.oninput = () => { sound.setVolume(+range.value); store.set("odyssey.volume", String(range.value)); if (sound.muted && +range.value > 0) toggle(); };
  bar.querySelector(".map").onclick = () => voyageTo("map");
  paint();
  addEventListener("keydown", e => {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "m" || e.key === "M") toggle();
    if (e.key === "F" && e.shiftKey) fpsMeter(world);
  });
  if (new URLSearchParams(location.search).get("fps")) fpsMeter(world);

  return { regrade, chapterDone: opts => chapterDone(chapter, opts) };
}

// the island is finished: its deed, and the way on (or stay)
export function chapterDone(id, { onStay = null } = {}) {
  const c = chapterOf(id), next = nextOf(id);
  let el = document.getElementById("odx-done");
  if (!el) { el = document.createElement("div"); el.id = "odx-done"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
  el.innerHTML = `<div class="box"><div class="k">CHAPTER ${c.word} · DONE</div><h2></h2><div class="deed"></div><div class="row"></div></div>`;
  el.querySelector("h2").textContent = c.title;
  el.querySelector(".deed").textContent = "ODYSSEUS: " + DEEDS[c.tag];
  const row = el.querySelector(".row");
  const btn = (t, cls, fn) => { const b = document.createElement("button"); b.className = "odx-btn " + cls; b.textContent = t; b.onclick = fn; row.appendChild(b); return b; };
  const first = next ? btn(`NEXT: ${next.title.toUpperCase()} ▸`, "primary", () => voyageTo(next, { from: id }))
                     : btn("THE VOYAGE MAP ▸", "primary", () => voyageTo("map"));
  btn("Stay on the island", "", () => { el.classList.remove("on"); if (onStay) onStay(); });
  el.classList.add("on");
  first.focus();
  if (status(c).finished === false) console.warn("chapterDone shown, but the finale isn't saved as done");
}

// frames per second (average and worst frame over each second), JS memory, quality and window size
function fpsMeter(world) {
  let el = document.getElementById("odx-fps");
  if (el) { el.remove(); cancelAnimationFrame(fpsMeter.raf); return; }
  el = document.createElement("div"); el.id = "odx-fps"; document.body.appendChild(el);
  let last = performance.now(), n = 0, worst = 0, t0 = last;
  const tick = now => {
    const dt = now - last; last = now; n++; worst = Math.max(worst, dt);
    if (now - t0 >= 1000) {
      const fps = n * 1000 / (now - t0), mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + " MB" : "n/a";
      el.textContent = `FPS ${fps.toFixed(0)}   worst frame ${worst.toFixed(0)} ms\nJS heap ${mem}   quality ${world ? world.quality : "-"}   ${innerWidth}×${innerHeight}`;
      n = 0; worst = 0; t0 = now;
    }
    fpsMeter.raf = requestAnimationFrame(tick);
  };
  fpsMeter.raf = requestAnimationFrame(tick);
}
