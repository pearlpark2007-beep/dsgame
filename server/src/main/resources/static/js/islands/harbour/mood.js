// mood.js — the harbour's weather as one dial: 0 = the storm the game is played in,
// 1 = the dawn after the escape (rain stops, lightning stops, the clouds catch first light).
import * as THREE from "three";

const DAWN = {
  zenith: 0x46607e, horizon: 0xe9a46a, cloudDark: 0x4a3f4a, cloudLit: 0xffd2a0, glow: 0xffa040,
  fog: 0x8a7a70, fogDensity: 0.0016, key: 0xffd6a8, keyI: 2.4, rim: 0xffb070, rimI: 2.4
};

export class Mood {
  constructor(world, harbour) {
    this.world = world; this.h = harbour;
    const u = harbour.sky.uniforms, f = world.scene.fog;
    // remember the storm exactly, so it can be put back
    this.storm = {
      zenith: u.zenith.value.clone(), horizon: u.horizon.value.clone(), cloudDark: u.cloudDark.value.clone(), cloudLit: u.cloudLit.value.clone(), glow: u.glow.value.clone(),
      fog: f.color.clone(), fogDensity: f.density, key: harbour.key.color.clone(), keyI: harbour.key.intensity,
      rim: harbour.rim.color.clone(), rimI: harbour.rim.intensity, rain: harbour.rain.mat.opacity, every: [...harbour.lightning.every]
    };
    this.k = 0;
  }
  // set the dial: 0 storm .. 1 dawn
  set(k) {
    this.k = k;
    const S = this.storm, u = this.h.sky.uniforms, f = this.world.scene.fog, c = new THREE.Color();
    for (const n of ["zenith", "horizon", "cloudDark", "cloudLit", "glow"]) u[n].value.copy(S[n]).lerp(c.set(DAWN[n]), k);
    f.color.copy(S.fog).lerp(c.set(DAWN.fog), k); f.density = THREE.MathUtils.lerp(S.fogDensity, DAWN.fogDensity, k);
    this.h.key.color.copy(S.key).lerp(c.set(DAWN.key), k); this.h.key.intensity = THREE.MathUtils.lerp(S.keyI, DAWN.keyI, k);
    this.h.rim.color.copy(S.rim).lerp(c.set(DAWN.rim), k); this.h.rim.intensity = THREE.MathUtils.lerp(S.rimI, DAWN.rimI, k);
    this.h.rain.mat.opacity = S.rain * (1 - k);
    this.h.rain.lines.visible = k < 0.98;
    // no more lightning once the storm starts to break
    this.h.lightning.every = k > 0.2 ? [1e6, 1e6] : S.every;
    if (k > 0.2) this.h.lightning.next = Math.max(this.h.lightning.next, 1e5); else if (this.h.lightning.next > 1e4) this.h.lightning.next = 3;
  }
  // ease the dial over `seconds` (game time); returns a promise
  to(k, seconds) {
    const from = this.k;
    return new Promise(res => {
      let t = 0;
      const u = { update: dt => { t += dt; const e = Math.min(1, t / seconds); this.set(from + (k - from) * e * e * (3 - 2 * e)); if (e >= 1) { this.world.updaters.splice(this.world.updaters.indexOf(u), 1); res(); } } };
      this.world.add(u);
    });
  }
}
