// world.js — the renderer, camera, post-processing (bloom + colour grade) and the frame loop.
// Every island creates one World and adds its own things to world.scene.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Final look of the image: a GRINDHOUSE film print.
// Faded, warm, slightly magenta colour; lifted brown blacks; creamy highlights; a red glow
// around bright lights (halation); heavy grain; a slight projector flicker and frame wobble;
// burned, darker edges; rare specks of dust. (No scratch lines.)
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1280, 720) },
    grain: { value: 0.075 }, flash: { value: 0 }, letterbox: { value: 1 }, strength: { value: 1 }, freeze: { value: 0 }, keepBlue: { value: 0 }, burn: { value: 1 }, mono: { value: 0 }, halo: { value: 1 }, print: { value: 1 }, sat: { value: 1 }, lift: { value: new THREE.Vector3(0, 0, 0) }, gain: { value: new THREE.Vector3(1, 1, 1) }, focusOn: { value: 0 }, focusAt: { value: new THREE.Vector2(0.5, 0.5) }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, grain, flash, letterbox, strength, freeze, keepBlue, burn, mono, halo, focusOn, print, sat; uniform vec2 focusAt; uniform vec3 lift, gain;
    varying vec2 vUv;
    float rand(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
    void main(){
      float frame = floor(time * 24.0);                                   // film runs at 24 fps
      vec2 uv = vUv + vec2(sin(frame * 1.7) * 0.0006, sin(frame * 0.83) * 0.0009) * strength;   // gate weave
      vec3 c = texture2D(tDiffuse, uv).rgb;
      vec3 src = c;
      // halation: bright lights bleed a warm red glow into the film around them
      vec3 h = vec3(0.0);
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; h += max(texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * 5.0 / res).rgb - 0.75, 0.0); }
      c += h / 8.0 * vec3(1.0, 0.32, 0.12) * 1.4 * halo;
      float l = luma(c);
      vec3 pre = c;
      // the print: blues die, reds and yellows stay, mids lean magenta, blacks lift to brown
      c.b = mix(c.b, l * 0.82, 0.35 * (1.0 - keepBlue));      // (a scene can keep its blues: the cave does)
      c.g = mix(c.g, l, 0.12);
      c = mix(vec3(l), c, 1.12);
      c += vec3(0.02, -0.004, 0.016) * smoothstep(0.1, 0.5, l) * smoothstep(0.9, 0.5, l);   // a hint of magenta in the mids
      c = smoothstep(vec3(0.02), vec3(0.95), c);                                            // print contrast
      c *= mix(vec3(1.0), vec3(1.08, 1.0, 0.8), smoothstep(0.3, 0.9, l));               // golden, sodium-lamp highlights
      c = c * vec3(0.94, 0.91, 0.87) + vec3(0.045, 0.03, 0.025);                           // lifted, faded blacks
      c = mix(c, vec3(1.0, 0.93, 0.8), smoothstep(0.75, 1.15, l) * 0.35);                  // creamy highlights
      // each chapter's profile (js/ui/grades.js): how much of the print tint, saturation, a shadow tint, a highlight tint
      c = mix(smoothstep(vec3(0.02), vec3(0.95), pre), c, print);
      c = mix(vec3(luma(c)), c, sat);
      c += lift * (1.0 - smoothstep(0.0, 0.6, luma(c)));
      c *= mix(vec3(1.0), gain, smoothstep(0.35, 0.95, luma(c)));
      c = mix(src, c, strength);
      // black and white, blood excepted (the Underworld: Kill Bill's House of Blue Leaves): only reds keep their colour
      float red = smoothstep(0.12, 0.35, c.r - max(c.g, c.b));
      c = mix(c, vec3(luma(c)) * vec3(0.96, 0.98, 1.02), mono * (1.0 - red));
      c *= 1.0 + (rand(vec2(frame, 7.0)) - 0.5) * 0.045 * strength;                          // projector flicker
      vec2 g = floor(vUv * res / 1.5);                                                      // chunky film grain
      c += (rand(g + frame * 1.37) - 0.5) * grain * (1.15 - l * 0.7) * strength;
      // rare dust specks (round dots, never lines)
      vec2 cell = floor(vUv * vec2(64.0, 36.0));
      float r = rand(cell + frame * 3.1);
      if (r > 0.9992) { vec2 p = fract(vUv * vec2(64.0, 36.0)) - 0.5; if (length(p * vec2(1.0, 0.56)) < 0.08) c = mix(c, r > 0.9996 ? vec3(0.95, 0.9, 0.8) : vec3(0.06, 0.04, 0.03), 0.8); }
      vec2 d = vUv - 0.5;
      float edge = smoothstep(0.38, 0.85, length(d * vec2(1.25, 1.0)));                    // burned edges
      c = mix(c, c * vec3(0.55, 0.32, 0.2), edge * 0.85 * strength * burn);
      // learning focus: everything away from the thing being taught sinks into shadow
      float fd = length((vUv - focusAt) * vec2(res.x / res.y, 1.0));
      c *= mix(1.0, 0.42, focusOn * smoothstep(0.22, 0.75, fd));
      c += vec3(0.85, 0.8, 0.95) * flash * 0.2;
      c = mix(c, vec3(luma(c)) * vec3(1.08, 0.96, 0.78), freeze * 0.75);                       // freeze-frame: colour drains to sepia
      if (letterbox > 0.5 && abs(vUv.y - 0.5) > 0.5 * min(1.0, (res.x / res.y) / 2.39)) c = vec3(0.012, 0.01, 0.01);   // 2.39:1 cinema bars
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`
};

// COMIC INK, for the cinematics (Kill Bill's anime chapter as a printed comic): black ink outlines
// found from colour edges, flat colour in a few bands, halftone dots in the shadows, punchy reds and
// yellows, a paper-white highlight. It runs before the film grade, so the grain lands on top like print.
const ComicShader = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1280, 720) }, amount: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float amount;
    varying vec2 vUv;
    float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
    vec3 px(vec2 o){ return texture2D(tDiffuse, vUv + o / res).rgb; }
    void main(){
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      // ink: Sobel on a slightly blurred image (so rain and grain don't turn into scribbles)
      float k = 1.6;
      float tl = luma(px(vec2(-k, k))), t = luma(px(vec2(0.0, k))), tr = luma(px(vec2(k, k)));
      float l = luma(px(vec2(-k, 0.0))), r = luma(px(vec2(k, 0.0)));
      float bl = luma(px(vec2(-k, -k))), b = luma(px(vec2(0.0, -k))), br = luma(px(vec2(k, -k)));
      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br, gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
      float edge = smoothstep(0.22, 0.5, sqrt(gx * gx + gy * gy));
      // flat colour: keep the hue, snap the brightness into bands
      float y = luma(src);
      float band = floor(y * 4.0 + 0.5) / 4.0;
      vec3 hue = src / max(y, 0.001);
      vec3 c = clamp(hue * max(band, 0.08), 0.0, 1.0);
      c = mix(vec3(luma(c)), c, 1.35);                                   // saturated, printed colour
      // Kill Bill anime: cold blue-black night, warm lit skin and fire, red as the accent
      vec3 cold = vec3(0.30, 0.42, 0.68) * max(band, 0.18) * 1.5;
      c = mix(cold, c, smoothstep(0.18, 0.5, y));
      c *= smoothstep(0.012, 0.07, y);                                    // only the deepest shadows go to solid ink black
      // halftone dots in the darker bands (a 45-degree screen)
      vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (vUv * res) / 5.0;
      float dot = length(fract(g) - 0.5);
      float dark = smoothstep(0.55, 0.1, y);
      c *= 1.0 - step(dot, dark * 0.48) * 0.55;
      c = mix(c, vec3(1.0, 0.97, 0.9), smoothstep(0.82, 0.97, y) * 0.8); // paper-white highlights
      c = mix(c, vec3(0.03, 0.02, 0.02), edge * 0.92);                    // the ink line
      gl_FragColor = vec4(mix(src, c, amount), 1.0);
    }`
};

export class World {
  constructor({ container = document.body, quality = "auto" } = {}) {
    this.updaters = [];
    this.quality = quality === "auto" ? "high" : quality;
    this.autoQuality = quality === "auto";

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 6000);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.6, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());          // tone mapping + sRGB first...
    this.comicPass = new ShaderPass(ComicShader);     // comic ink (only switched on for the cinematics)
    this.comicPass.enabled = false;
    this.composer.addPass(this.comicPass);
    this.grade = new ShaderPass(GradeShader);         // ...then the film print look on the final colours
    this.composer.addPass(this.grade);

    this.clock = new THREE.Clock();
    this.time = 0;
    this.timeScale = 1;
    this._fps = { frames: 0, t: 0, checked: false };

    this.size = () => [container.clientWidth || innerWidth, container.clientHeight || innerHeight];
    addEventListener("resize", () => this.resize());
    this.applyQuality();
  }

  // "high": sharp, soft shadows, bloom. "low": for weak laptops.
  applyQuality() {
    const high = this.quality === "high";
    this.renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.75) : 1);
    this.bloom.enabled = high && !this.noBloom;          // a page can turn the glow off for good (Circe: clarity first)
    this.resize();
    this.updaters.forEach(u => u.onQuality && u.onQuality(this.quality));
  }

  resize() {
    const [w, h] = this.size();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.grade.uniforms.res.value.set(w, h);
    this.comicPass.uniforms.res.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // comic ink on (1) or off (0); the film grain eases off while it is on so the ink stays crisp
  setComic(k) {
    this.comicPass.uniforms.amount.value = k;
    this.comicPass.enabled = k > 0;
    this.grade.uniforms.grain.value = (this.gradeGrain ?? 0.075) * (1 - k * 0.6);   // from the chapter grade (js/ui/grades.js), if one is set
  }

  // Anything with update(dt, time) gets called every frame.
  add(updater) { this.updaters.push(updater); return updater; }

  start(onFrame) {
    this.onFrame = onFrame;
    this.renderer.setAnimationLoop(() => {
      const raw = Math.min(this.clock.getDelta(), 0.1);
      this.step(raw);
      this._watchFps(raw);
    });
  }

  // One frame: move everything forward by `raw` seconds, then draw.
  step(raw, draw = true) {
    const dt = raw * this.timeScale * (this.pace || 1);      // pace: the player's chosen speed
    this.time += dt;
    for (const u of [...this.updaters]) u.update && u.update(dt, this.time, raw);   // a copy: updaters may remove themselves
    if (this.onFrame) this.onFrame(dt, this.time, raw);
    this.grade.uniforms.time.value = this.time;
    if (draw) this.composer.render();
  }

  // After 4 seconds, drop to "low" if the laptop can't keep 28 frames per second.
  _watchFps(raw) {
    const f = this._fps;
    if (!this.autoQuality || f.checked) return;
    f.frames++; f.t += raw;
    if (f.t > 4) {
      f.checked = true;
      if (f.frames / f.t < 28 && this.quality === "high") { this.quality = "low"; this.applyQuality(); }
    }
  }
}
