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
    grain: { value: 0.075 }, flash: { value: 0 }, letterbox: { value: 1 }, strength: { value: 1 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, grain, flash, letterbox, strength;
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
      c += h / 8.0 * vec3(1.0, 0.32, 0.12) * 1.4;
      float l = luma(c);
      // the print: blues die, reds and yellows stay, mids lean magenta, blacks lift to brown
      c.b = mix(c.b, l * 0.82, 0.35);
      c.g = mix(c.g, l, 0.12);
      c = mix(vec3(l), c, 1.12);
      c += vec3(0.02, -0.004, 0.016) * smoothstep(0.1, 0.5, l) * smoothstep(0.9, 0.5, l);   // a hint of magenta in the mids
      c = smoothstep(vec3(0.02), vec3(0.95), c);                                            // print contrast
      c *= mix(vec3(1.0), vec3(1.08, 1.0, 0.8), smoothstep(0.3, 0.9, l));               // golden, sodium-lamp highlights
      c = c * vec3(0.94, 0.91, 0.87) + vec3(0.045, 0.03, 0.025);                           // lifted, faded blacks
      c = mix(c, vec3(1.0, 0.93, 0.8), smoothstep(0.75, 1.15, l) * 0.35);                  // creamy highlights
      c = mix(src, c, strength);
      c *= 1.0 + (rand(vec2(frame, 7.0)) - 0.5) * 0.045 * strength;                          // projector flicker
      vec2 g = floor(vUv * res / 1.5);                                                      // chunky film grain
      c += (rand(g + frame * 1.37) - 0.5) * grain * (1.15 - l * 0.7) * strength;
      // rare dust specks (round dots, never lines)
      vec2 cell = floor(vUv * vec2(64.0, 36.0));
      float r = rand(cell + frame * 3.1);
      if (r > 0.9992) { vec2 p = fract(vUv * vec2(64.0, 36.0)) - 0.5; if (length(p * vec2(1.0, 0.56)) < 0.08) c = mix(c, r > 0.9996 ? vec3(0.95, 0.9, 0.8) : vec3(0.06, 0.04, 0.03), 0.8); }
      vec2 d = vUv - 0.5;
      float edge = smoothstep(0.38, 0.85, length(d * vec2(1.25, 1.0)));                    // burned edges
      c = mix(c, c * vec3(0.55, 0.32, 0.2), edge * 0.85 * strength);
      c += vec3(0.85, 0.8, 0.95) * flash * 0.2;
      if (letterbox > 0.5 && abs(vUv.y - 0.5) > 0.5 * min(1.0, (res.x / res.y) / 2.39)) c = vec3(0.012, 0.01, 0.01);   // 2.39:1 cinema bars
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
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
    this.bloom.enabled = high;
    this.resize();
    this.updaters.forEach(u => u.onQuality && u.onQuality(this.quality));
  }

  resize() {
    const [w, h] = this.size();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.grade.uniforms.res.value.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    const dt = raw * this.timeScale;
    this.time += dt;
    for (const u of this.updaters) u.update && u.update(dt, this.time, raw);
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
