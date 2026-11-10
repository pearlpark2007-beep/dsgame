// comic.js — the comic-book layer for the cinematics, in the spirit of Kill Bill's anime chapter.
// Panels are real frames grabbed from the 3D scene, slammed onto a paper page with ink borders.
// Over the live scene it can letter sound effects (KRAAANG!), narration boxes and speed lines,
// and it can stop the action for one button press (the SWING! moment).
const css = `
#comic { position: fixed; inset: 0; z-index: 40; pointer-events: none; overflow: hidden; }
#comic .page { position: absolute; inset: 0; background: #efe4c8; opacity: 0; transition: opacity 0.12s; }
#comic .page.on { opacity: 1; }
#comic .panel { position: absolute; border: 6px solid #0b0806; background: #000 center / cover no-repeat; box-shadow: 8px 8px 0 rgba(0,0,0,0.85);
  transform: scale(1.25) rotate(var(--r, 0deg)); opacity: 0; transition: transform 0.18s cubic-bezier(.2,1.5,.4,1), opacity 0.08s; }
#comic .panel.on { transform: scale(1) rotate(var(--r, 0deg)); opacity: 1; }
#comic .cap { position: absolute; background: #f6d33c; color: #0b0806; border: 3px solid #0b0806; padding: 6px 12px; max-width: 46%;
  font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-weight: 700; font-size: clamp(13px, 1.5vw, 19px); line-height: 1.3; text-transform: uppercase; }
#comic .sfx { position: absolute; font-family: Anton, 'Inter Display Black', Impact, sans-serif; color: #ffd21f; letter-spacing: 2px; white-space: nowrap;
  -webkit-text-stroke: 3px #0b0806; paint-order: stroke fill; text-shadow: 6px 6px 0 #c8261a, 9px 9px 0 #0b0806;
  transform: translate(-50%, -50%) rotate(var(--r, -8deg)) scale(0.2); opacity: 0; transition: transform 0.16s cubic-bezier(.2,1.8,.4,1), opacity 0.08s; }
#comic .sfx.on { transform: translate(-50%, -50%) rotate(var(--r, -8deg)) scale(1); opacity: 1; }
#comic .sfx.out { opacity: 0; transition: opacity 0.4s; }
#comic .name { position: absolute; left: 6%; bottom: 10%; }
#comic .name b { display: block; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: clamp(44px, 8vw, 110px); line-height: 0.9; color: #ffd21f;
  -webkit-text-stroke: 3px #0b0806; paint-order: stroke fill; text-shadow: 7px 7px 0 #c8261a; }
#comic .name span { display: inline-block; margin-top: 10px; background: #0b0806; color: #efe4c8; padding: 6px 12px; font-family: 'Courier Prime', monospace; font-size: clamp(14px, 1.6vw, 20px); }
#comic .speed { position: absolute; inset: -20%; opacity: 0; transition: opacity 0.2s;
  background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg 3deg, rgba(255,255,255,0.5) 3deg 3.6deg, rgba(255,255,255,0) 3.6deg 7deg);
  -webkit-mask: radial-gradient(circle at 50% 50%, transparent 22%, #000 48%); mask: radial-gradient(circle at 50% 50%, transparent 22%, #000 48%); }
#comic .speed.on { opacity: 1; animation: spd 0.12s steps(2) infinite; }
@keyframes spd { 50% { transform: rotate(2deg); } }
#comic .flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
#comic .flash.go { animation: cflash 0.35s ease-out; }
@keyframes cflash { from { opacity: 1; } to { opacity: 0; } }
#comic .prompt { position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%); pointer-events: auto; cursor: pointer; text-align: center; display: none; }
#comic .prompt.on { display: block; animation: pr 0.5s ease-in-out infinite alternate; }
@keyframes pr { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -50%) scale(1.08); } }
#comic .prompt b { display: block; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: clamp(56px, 10vw, 140px); color: #ffd21f; line-height: 0.9;
  -webkit-text-stroke: 4px #0b0806; paint-order: stroke fill; text-shadow: 8px 8px 0 #c8261a; }
#comic .prompt span { display: inline-block; margin-top: 10px; background: #0b0806; color: #ffd21f; border: 3px solid #ffd21f; padding: 8px 18px; font-family: 'Courier Prime', monospace; font-size: 20px; letter-spacing: 3px; }
#comic .chapter { position: absolute; inset: 0; background: #050404; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.5s; }
#comic .chapter.on { opacity: 1; }
#comic .chapter small { font-family: 'Courier Prime', monospace; letter-spacing: 10px; color: #efe1c2; font-size: clamp(14px, 1.8vw, 22px); margin-bottom: 18px; }
#comic .chapter b { font-family: Anton, Impact, sans-serif; font-weight: 400; color: #ffd21f; font-size: clamp(40px, 7vw, 100px); letter-spacing: 3px; text-align: center; line-height: 1; padding: 0 5%; }
#comic .narr { position: absolute; max-width: 40%; background: #f6d33c; color: #0b0806; border: 3px solid #0b0806; box-shadow: 6px 6px 0 #0b0806; padding: 8px 14px;
  font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-weight: 700; font-size: clamp(14px, 1.6vw, 21px); line-height: 1.3; text-transform: uppercase;
  transform: translateY(-8px) rotate(-1deg); opacity: 0; transition: opacity 0.2s, transform 0.25s; }
#comic .narr.on { opacity: 1; transform: rotate(-1deg); }
@media (max-width: 700px) { #comic .narr { max-width: 80%; } }
#comic .sub { position: absolute; left: 50%; bottom: 14vh; transform: translateX(-50%); width: min(80%, 900px); text-align: center; opacity: 0; transition: opacity 0.25s;
  font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-size: clamp(16px, 2vw, 26px); line-height: 1.35; color: #f3e6c8;
  text-shadow: 0 0 2px #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000; }
#comic .sub.on { opacity: 1; }
#comic .sub b { color: #ffd21f; letter-spacing: 2px; margin-right: 10px; }
#comic .sub.villain b { color: #ff5a3c; }
#comic .mash { position: absolute; left: 50%; bottom: 16vh; transform: translateX(-50%); text-align: center; display: none; pointer-events: auto; cursor: pointer; }
#comic .mash.on { display: block; }
#comic .mash b { display: block; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: clamp(44px, 7vw, 96px); color: #ffd21f; line-height: 0.95;
  -webkit-text-stroke: 3px #0b0806; paint-order: stroke fill; text-shadow: 6px 6px 0 #c8261a; }
#comic .mash .bar { width: min(60vw, 520px); height: 16px; margin: 10px auto 6px; border: 3px solid #0b0806; background: #2a1d14; }
#comic .mash .fill { height: 100%; width: 0; background: #ffd21f; transition: width 0.1s; }
#comic .mash span { display: inline-block; background: #0b0806; color: #ffd21f; padding: 5px 12px; font-family: 'Courier Prime', monospace; font-size: 16px; letter-spacing: 3px; }
#comic .mash.hit b { transform: scale(1.08); }
#comic .prologue { position: absolute; inset: 0; background: #050404; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.8s; }
#comic .prologue.on { opacity: 1; }
#comic .prologue .txt { width: min(78%, 820px); font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; color: #efe1c2; font-size: clamp(15px, 1.8vw, 23px); line-height: 1.6; }
#comic .prologue p { margin: 0 0 1.1em; transition: color 1.2s; }
#comic .prologue p.old { color: #7d7262; }
#comic .crawl { position: absolute; inset: 0; background: #050404; opacity: 0; transition: opacity 0.8s; overflow: hidden; }
#comic .crawl.on { opacity: 1; }
#comic .crawl .view { position: absolute; inset: 0; perspective: 300px; perspective-origin: 50% 0%;
  -webkit-mask: linear-gradient(to bottom, transparent 6%, #000 40%); mask: linear-gradient(to bottom, transparent 6%, #000 40%); }
#comic .crawl .stage { position: absolute; left: 50%; bottom: -4vh; width: min(74vw, 900px); height: 220vh; transform: translateX(-50%) rotateX(30deg); transform-origin: 50% 100%; overflow: hidden; }
#comic .crawl .roll { position: absolute; left: 0; right: 0; top: 0; color: #ffd21f; font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-weight: 400;
  font-size: clamp(28px, 4.2vw, 60px); line-height: 1.25; letter-spacing: 0.02em; text-align: justify; text-transform: uppercase; }
#comic .crawl .roll small { display: block; text-align: center; letter-spacing: 0.5em; font-size: 0.55em; }
#comic .crawl .roll h2 { margin: 0.15em 0 1.2em; text-align: center; font-family: Anton, Impact, sans-serif; font-weight: 400; font-size: 2.3em; letter-spacing: 0.06em; line-height: 1; }
#comic .crawl .roll p { margin: 0 0 1.3em; }
#comic .crawl .roll p.last { text-align: center; margin-top: 2em; }
#comic .sfx.drift { animation: sfxdrift var(--life, 1.6s) ease-out forwards; }
@keyframes sfxdrift { from { translate: 0 0; rotate: 0deg; } 40% { rotate: var(--wob, 4deg); } to { translate: var(--dx, 2vw) var(--dy, -7vh); rotate: calc(var(--wob, 4deg) * -1); } }
#comic .black { position: absolute; inset: 0; background: #000; opacity: 0; transition: opacity var(--d, 0.8s); }
#comic .black.on { opacity: 1; }
#comic .bars { position: absolute; left: 0; right: 0; height: 0; background: #0b0806; transition: height 0.4s; }
#comic .bars.top { top: 0; } #comic .bars.bot { bottom: 0; }
#comic.letterbox .bars { height: 11vh; }
`;

export class Comic {
  constructor(world, director) {
    this.world = world; this.director = director;
    if (!document.getElementById("comic-css")) { const s = document.createElement("style"); s.id = "comic-css"; s.textContent = css; document.head.appendChild(s); }
    const el = this.el = document.createElement("div"); el.id = "comic";
    el.innerHTML = `<div class="speed"></div><div class="bars top"></div><div class="bars bot"></div><div class="page"></div><div class="flash"></div>
      <div class="prompt" role="button" aria-label="Swing"><b></b><span></span></div>`;
    document.body.appendChild(el);
    this.$ = q => el.querySelector(q);
  }
  // wait in real seconds (unaffected by slow motion), but in step with the game clock
  hold(s) { return this.director._wait(s); }
  get skipping() { return !!this.director.skipping; }

  // grab what the camera sees right now, as an image for a panel
  capture() { this.world.composer.render(); return this.world.renderer.domElement.toDataURL("image/jpeg", 0.85); }

  // a comic page: panels slam in one after another. panels: [{ img, box: [left, top, width, height] in %, r, cap, capAt, sfx, sfxAt }]
  async page(panels, { seconds = 3, name = null } = {}) {
    if (this.skipping) return;
    const page = this.$(".page"); page.innerHTML = ""; page.classList.add("on");
    for (const p of panels) {
      const d = document.createElement("div"); d.className = "panel";
      const [l, t, w, h] = p.box; Object.assign(d.style, { left: l + "%", top: t + "%", width: w + "%", height: h + "%", backgroundImage: `url(${p.img})` });
      d.style.setProperty("--r", (p.r || 0) + "deg");
      if (p.cap) { const c = document.createElement("div"); c.className = "cap"; c.textContent = p.cap; Object.assign(c.style, p.capAt || { left: "10px", top: "10px" }); d.appendChild(c); }
      page.appendChild(d);
      requestAnimationFrame(() => d.classList.add("on"));
      if (p.sfx) this.sfx(p.sfx, { ...(p.sfxAt || { x: l + w * 0.6, y: t + h * 0.55 }), seconds: seconds });
      await this.hold(0.35);
    }
    if (name) {
      const n = document.createElement("div"); n.className = "name"; n.innerHTML = `<b></b><span></span>`;
      n.querySelector("b").textContent = name.title; n.querySelector("span").innerHTML = name.sub; page.appendChild(n);
    }
    await this.hold(seconds);
    page.classList.remove("on");
    await this.hold(0.12);
    page.innerHTML = "";
  }

  // lettered sound effect over the live scene (x, y in % of the screen)
  sfx(text, { x = 50, y = 40, r = -8, size = 9, color, seconds = 1.4, drift = true } = {}) {
    if (this.skipping) return;
    const s = document.createElement("div"); s.className = "sfx" + (drift ? " drift" : ""); s.textContent = text;
    s.style.setProperty("--life", (seconds + 0.5) + "s");
    s.style.setProperty("--dx", ((Math.random() - 0.5) * 8).toFixed(1) + "vw");
    s.style.setProperty("--dy", (-4 - Math.random() * 6).toFixed(1) + "vh");
    s.style.setProperty("--wob", ((Math.random() - 0.5) * 12).toFixed(1) + "deg");
    Object.assign(s.style, { left: x + "%", top: y + "%", fontSize: `clamp(40px, ${size}vw, ${size * 16}px)` });
    if (color) s.style.color = color;
    s.style.setProperty("--r", r + "deg");
    this.el.appendChild(s);
    requestAnimationFrame(() => s.classList.add("on"));
    this.hold(seconds).then(() => { s.classList.add("out"); setTimeout(() => s.remove(), 450); });
  }
  // Tarantino's chapter card: black screen, small heading, big yellow title
  async chapter(kicker, title, seconds = 3) {
    if (this.skipping) return;
    const c = document.createElement("div"); c.className = "chapter"; c.innerHTML = "<small></small><b></b>";
    c.querySelector("small").textContent = kicker; c.querySelector("b").textContent = title;
    this.el.appendChild(c);
    requestAnimationFrame(() => c.classList.add("on"));
    await this.hold(seconds);
    c.classList.remove("on");
    await this.hold(0.5);
    c.remove();
  }
  // a narration box over the live scene (x, y in % from the top-left)
  caption(text, { x = 5, y = 14, seconds = 3 } = {}) {
    if (this.skipping) return Promise.resolve();
    const n = document.createElement("div"); n.className = "narr"; n.textContent = text;
    Object.assign(n.style, { left: x + "%", top: y + "%" });
    this.el.appendChild(n);
    requestAnimationFrame(() => n.classList.add("on"));
    return this.hold(seconds).then(() => { n.classList.remove("on"); setTimeout(() => n.remove(), 300); });
  }
  // film subtitles at the bottom (a speaker, if given, in yellow; a villain's name in red)
  subtitle(text, { speaker = "", villain = false, seconds = 3 } = {}) {
    if (this.skipping) return Promise.resolve();
    const n = document.createElement("div"); n.className = "sub" + (villain ? " villain" : "");
    if (speaker) { const b = document.createElement("b"); b.textContent = speaker + ":"; n.appendChild(b); }
    n.appendChild(document.createTextNode(text));
    this.el.querySelectorAll(".sub").forEach(o => o.remove());
    this.el.appendChild(n);
    requestAnimationFrame(() => n.classList.add("on"));
    return this.hold(seconds).then(() => { n.classList.remove("on"); setTimeout(() => n.remove(), 300); });
  }
  // a mashing prompt: every Space (or click/tap) counts; rate() is presses per second over the last second.
  // In test mode (window.__autoPress) it mashes itself at a steady 6 a second.
  mash(word = "ROW!", label = "MASH SPACE") {
    const m = this.$(".mash:not(.holdp)") || (() => { const d = document.createElement("div"); d.className = "mash"; d.innerHTML = "<b></b><div class='bar'><div class='fill'></div></div><span></span>"; this.el.appendChild(d); return d; })();
    m.querySelector("b").textContent = word; m.querySelector("span").textContent = label;
    const times = [], auto = !!window.__autoPress || this.skipping;
    const press = () => { times.push(performance.now()); m.classList.add("hit"); setTimeout(() => m.classList.remove("hit"), 60); };
    const onKey = e => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); if (!e.repeat) press(); } };
    addEventListener("keydown", onKey); m.onclick = press;
    m.classList.add("on");
    const ctl = {
      rate() {
        if (auto) return 6;
        const now = performance.now(); while (times.length && now - times[0] > 1000) times.shift();
        return times.length;
      },
      progress(k) { m.querySelector(".fill").style.width = Math.round(Math.min(1, k) * 100) + "%"; },
      stop() { removeEventListener("keydown", onKey); m.onclick = null; m.classList.remove("on"); }
    };
    return ctl;
  }
  // a HOLD prompt: holding Space (or the mouse / a finger) down counts; down() says whether it is held right now.
  // Test mode: window.__autoHold = true holds the whole time; window.__holdFail = true never holds.
  holdPrompt(word = "HOLD!", label = "HOLD SPACE") {
    const m = this.$(".mash.holdp") || (() => { const d = document.createElement("div"); d.className = "mash holdp"; d.innerHTML = "<b></b><div class='bar'><div class='fill'></div></div><span></span>"; this.el.appendChild(d); return d; })();
    m.querySelector("b").textContent = word; m.querySelector("span").textContent = label;
    let held = false;
    const kd = e => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); held = true; m.classList.add("hit"); } };
    const ku = e => { if (e.code === "Space" || e.key === " ") { held = false; m.classList.remove("hit"); } };
    const pd = () => { held = true; m.classList.add("hit"); }, pu = () => { held = false; m.classList.remove("hit"); };
    addEventListener("keydown", kd); addEventListener("keyup", ku); m.addEventListener("pointerdown", pd); addEventListener("pointerup", pu);
    m.classList.add("on");
    return {
      down: () => (window.__holdFail || window.__holdFailWord === word) ? false : (window.__autoHold || this.skipping) ? true : held,
      progress(k) { m.querySelector(".fill").style.width = Math.round(Math.max(0, Math.min(1, k)) * 100) + "%"; },
      label(w) { m.querySelector("b").textContent = w; },
      stop() { removeEventListener("keydown", kd); removeEventListener("keyup", ku); m.removeEventListener("pointerdown", pd); removeEventListener("pointerup", pu); m.classList.remove("on", "hit"); }
    };
  }
  // Tarantino's opening text: white type on black, one paragraph at a time, typed out, the earlier ones dimming
  async prologue(paragraphs, { cps = 34, holdEach = 1.6, holdEnd = 2.2 } = {}) {
    if (this.skipping) return;
    const box = document.createElement("div"); box.className = "prologue"; box.innerHTML = "<div class='txt'></div>";
    this.el.appendChild(box); requestAnimationFrame(() => box.classList.add("on"));
    await this.hold(1.0);
    const txt = box.querySelector(".txt");
    for (const para of paragraphs) {
      if (this.skipping) break;
      txt.querySelectorAll("p").forEach(p => p.classList.add("old"));
      const p = document.createElement("p"); txt.appendChild(p);
      for (let i = 1; i <= para.length; i++) { p.textContent = para.slice(0, i); if (i % 2 === 0) await this.hold(2 / cps); if (this.skipping) { p.textContent = para; break; } }
      await this.hold(holdEach);
    }
    await this.hold(holdEnd);
    box.classList.remove("on");
    await this.hold(0.9);
    box.remove();
  }
  // the opening crawl: yellow type rolling up from the bottom of the screen and away into the dark,
  // big where it starts and small as it goes (a heading, a title, then the paragraphs)
  async crawl({ kicker = "", title = "", paragraphs = [], seconds = 40 } = {}) {
    if (this.skipping) return;
    const box = document.createElement("div"); box.className = "crawl";
    box.innerHTML = "<div class='view'><div class='stage'><div class='roll'></div></div></div>";
    const roll = box.querySelector(".roll"), stage = box.querySelector(".stage");
    const esc = t => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    roll.innerHTML = (kicker ? `<small>${esc(kicker)}</small>` : "") + (title ? `<h2>${esc(title)}</h2>` : "") +
      paragraphs.map((p, i) => `<p${i === paragraphs.length - 1 ? " class='last'" : ""}>${esc(p)}</p>`).join("");
    this.el.appendChild(box);
    const from = stage.offsetHeight, to = -roll.offsetHeight;
    roll.style.transform = `translateY(${from}px)`;
    requestAnimationFrame(() => box.classList.add("on"));
    await this.hold(0.6);
    const last = roll.lastElementChild;
    let seen = false;
    for (let t = 0; t < seconds && !this.skipping; t += 1 / 30) {
      roll.style.transform = `translateY(${(from + (to - from) * (t / seconds)).toFixed(1)}px)`;
      await this.hold(1 / 30);
      // done once the last line has come up onto the screen and risen on into the fade at the top
      const r = last.getBoundingClientRect();
      if (!seen && r.top > innerHeight * 0.5 && r.bottom < innerHeight) seen = true;
      if (seen && r.bottom < innerHeight * 0.3) break;
    }
    box.classList.remove("on");
    await this.hold(0.9);
    box.remove();
  }
  // fade to (on) or from (off) black
  async black(on, seconds = 0.8) {
    let b = this.$(".black"); if (!b) { b = document.createElement("div"); b.className = "black"; this.el.appendChild(b); }
    b.style.setProperty("--d", seconds + "s");
    b.classList.toggle("on", on);
    if (!this.skipping) await this.hold(seconds);
  }
  speed(on) { this.$(".speed").classList.toggle("on", on); }
  letterbox(on) { this.el.classList.toggle("letterbox", on); }
  flash() { const f = this.$(".flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); }

  // the player's moment: a big prompt; resolves on the key (Space by default) or a click/tap.
  // In test mode (window.__autoPress) it presses itself after a beat.
  prompt(word = "SWING!", key = " ", label = "PRESS SPACE") {
    if (this.skipping) return Promise.resolve();
    const p = this.$(".prompt"); p.querySelector("b").textContent = word; p.querySelector("span").textContent = label;
    p.classList.add("on");
    return new Promise(res => {
      const done = () => { removeEventListener("keydown", onKey); p.onclick = null; p.classList.remove("on"); res(); };
      const onKey = e => { if (e.key === key || e.code === "Space") { e.preventDefault(); done(); } };
      addEventListener("keydown", onKey); p.onclick = done;
      if (window.__autoPress) this.hold(window.__autoPress).then(done);
    });
  }
  clear() { this.el.querySelectorAll(".sfx, .narr, .chapter, .sub, .prologue, .crawl").forEach(s => s.remove()); const bl = this.$(".black"); if (bl) bl.classList.remove("on"); this.el.querySelectorAll(".mash").forEach(m => m.classList.remove("on")); this.$(".page").innerHTML = ""; this.$(".page").classList.remove("on"); this.speed(false); this.letterbox(false); this.$(".prompt").classList.remove("on"); }
}
