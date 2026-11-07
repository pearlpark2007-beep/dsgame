// director.js — the camera, directed like a film: tracking shots, low "trunk" angles,
// crash zooms and freeze-frames with a name card (the Tarantino grammar of the game).
import * as THREE from "three";

export class Director {
  constructor(world, { cardRoot = document.body } = {}) {
    this.world = world;
    this.cam = world.camera;
    this.look = new THREE.Vector3(0, 2, 0);
    this.mode = null;          // null = held still, or a follow setup
    this.moves = [];
    this.card = document.createElement("div");
    this.card.className = "name-card";
    this.card.innerHTML = "<div class='nc-name'></div><div class='nc-sub'></div>";
    cardRoot.appendChild(this.card);
    world.add(this);
  }

  // jump straight to a framing
  cut(pos, look, fov = this.cam.fov) {
    this.mode = null; this.moves = [];
    this.cam.position.set(...pos); this.look.set(...look);
    this.setFov(fov);
  }
  setFov(f) { this.cam.fov = f; this.cam.updateProjectionMatrix(); }

  // glide to a framing over `seconds` (eases in and out)
  glide(pos, look, fov = this.cam.fov, seconds = 1.5) {
    this.mode = null;
    const p0 = this.cam.position.clone(), l0 = this.look.clone(), f0 = this.cam.fov;
    const p1 = new THREE.Vector3(...pos), l1 = new THREE.Vector3(...look);
    return this._move(seconds, k => { const e = k * k * (3 - 2 * k); this.cam.position.lerpVectors(p0, p1, e); this.look.lerpVectors(l0, l1, e); this.setFov(f0 + (fov - f0) * e); });
  }

  // follow a moving thing: camera keeps an offset in the target's own frame (side, up, behind)
  follow(target, { side = 2.2, up = 1.1, back = 4.2, lookUp = 1.3, lag = 3.5, fov } = {}) {
    this.mode = { target, side, up, back, lookUp, lag };
    if (fov) this.setFov(fov);
  }

  // a sudden push-in of the lens (the 70s crash zoom)
  crashZoom(toFov, seconds = 0.22) {
    const f0 = this.cam.fov;
    return this._move(seconds, k => this.setFov(f0 + (toFov - f0) * (1 - Math.pow(1 - k, 3))), true);
  }

  // stop time, drain the colour, slam a name card on screen
  async freeze(name, sub, seconds = 2.6) {
    if (this.skipping) return;
    const w = this.world;
    const before = w.timeScale;
    w.timeScale = 0;
    w.grade.uniforms.freeze.value = 1;
    this.card.querySelector(".nc-name").textContent = name;
    this.card.querySelector(".nc-sub").innerHTML = sub;
    this.card.classList.add("on");
    await this._wait(seconds);
    this.card.classList.remove("on");
    w.grade.uniforms.freeze.value = 0;
    w.timeScale = before;
  }

  _wait(seconds) { return this._move(seconds, () => {}, true); }
  _move(seconds, fn, realTime = false) { return new Promise(res => this.moves.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res, realTime })); }

  update(dt, time, raw) {
    for (let i = this.moves.length - 1; i >= 0; i--) {
      const m = this.moves[i];
      m.t += m.realTime && !this.skipping ? raw : dt;
      const k = Math.min(1, m.t / m.d);
      m.fn(k);
      if (k >= 1) { this.moves.splice(i, 1); m.res(); }
    }
    if (this.mode) {
      const { target, side, up, back, lookUp, lag } = this.mode;
      const yaw = target.rotation.y;
      const want = new THREE.Vector3(side, up, -back).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(target.position);
      const k = 1 - Math.exp(-lag * raw);
      this.cam.position.lerp(want, k);
      this.look.lerp(new THREE.Vector3(target.position.x, target.position.y + lookUp, target.position.z), k);
    }
    this.cam.lookAt(this.look);
  }
}

// styles for the name card and chapter card (injected once)
const css = document.createElement("style");
css.textContent = `
.name-card { position: fixed; left: 7%; bottom: 18%; z-index: 30; pointer-events: none; opacity: 0; transform: translateX(-24px); transition: opacity 0.12s, transform 0.25s; }
.name-card.on { opacity: 1; transform: none; }
.nc-name { font-family: Anton, 'Inter Display Black', Impact, sans-serif; font-size: clamp(48px, 8vw, 96px); line-height: 0.9; color: #f2c230; text-transform: uppercase;
           text-shadow: 4px 4px 0 #7e1a0f, 0 0 30px rgba(0,0,0,0.6); }
.nc-sub { margin-top: 10px; font-family: 'Courier Prime', 'Courier 10 Pitch', monospace; font-size: clamp(14px, 1.6vw, 20px); color: #f3e6c8; text-shadow: 2px 2px 0 #000; max-width: 560px; }
`;
document.head.appendChild(css);
