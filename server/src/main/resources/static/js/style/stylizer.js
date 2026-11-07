// stylizer.js — gives the game its own look. The scene is drawn small (chunky pixels),
// then one full-screen shader grades it like film. Three looks to choose from:
//   0 "PULP"        warm 35mm: saturated yellows and reds, crushed blacks, grain, gate weave, letterbox
//   1 "GRINDHOUSE"  worn 70s print: posterised colour, faded magenta, scratches, dust, flicker
//   2 "TERMINAL"    retro computer: dithered to a small palette, ink outlines, scanlines
import * as THREE from "three";

export const LOOKS = [
  { name: "PULP", pixel: 3 },
  { name: "GRINDHOUSE", pixel: 2 },
  { name: "TERMINAL", pixel: 4 }
];

export class Stylizer {
  constructor(renderer, scene, camera, { look = 0 } = {}) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.look = look;
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.target.depthTexture = new THREE.DepthTexture(4, 4);
    this.uniforms = {
      tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
      res: { value: new THREE.Vector2() }, time: { value: 0 }, mode: { value: look }, exposure: { value: 0.95 },
      near: { value: camera.near }, far: { value: camera.far }, flash: { value: 0 }, letterbox: { value: 1 }
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: FRAG
    }));
    this.postScene = new THREE.Scene(); this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;   // tone mapping happens in our shader
  }
  setLook(i) { this.look = i; this.uniforms.mode.value = i; this.resize(this.w, this.h); }
  resize(w, h) {
    this.w = w; this.h = h;
    const px = LOOKS[this.look].pixel;
    const tw = Math.max(1, Math.floor(w / px)), th = Math.max(1, Math.floor(h / px));
    this.target.setSize(tw, th);
    this.uniforms.res.value.set(tw, th);
  }
  render(time) {
    this.uniforms.time.value = time;
    this.uniforms.near.value = this.camera.near; this.uniforms.far.value = this.camera.far;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
  }
}

const FRAG = /* glsl */`
#include <packing>
uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float time, exposure, near, far, flash, letterbox; uniform int mode;
varying vec2 vUv;
float rand(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 sat(vec3 c, float s){ return mix(vec3(luma(c)), c, s); }
vec3 grab(vec2 uv){ return toSRGB(aces(texture2D(tColor, uv).rgb * exposure)); }
float depthAt(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
float bayer(vec2 p){
  int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0)), i = x + y * 4;
  float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}
void main(){
  vec2 uv = vUv;
  float frame = floor(time * 24.0);                       // film runs at 24 frames per second
  if (mode == 0) uv += vec2(sin(frame * 1.7) * 0.0007, sin(frame * 0.9) * 0.0011);   // gate weave
  if (mode == 1) uv.y += (rand(vec2(frame, 1.0)) > 0.96 ? 0.004 : 0.0);             // a skipped frame
  vec3 c = grab(uv);
  float l = luma(c);

  if (mode == 0) {                                          // ---------- PULP
    vec3 h = vec3(0.0);                                     // halation: a red bloom around bright things
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785; h += max(grab(uv + vec2(cos(a), sin(a)) * 3.0 / res) - 0.72, 0.0); }
    c += h / 8.0 * vec3(1.2, 0.35, 0.12) * 1.6;
    c = sat(c, 1.15);
    c.b = mix(c.b, l * 0.85, 0.12);                          // blues pulled toward warm grey
    c += vec3(0.09, 0.035, 0.0) * pow(1.0 - l, 2.0);        // brown in the shadows
    c *= mix(vec3(1.0), vec3(1.07, 1.0, 0.84), smoothstep(0.4, 1.0, l));   // golden highlights
    c = smoothstep(0.035, 0.97, c);                         // crushed blacks, rich contrast
    c += (rand(uv * res + frame) - 0.5) * 0.085 * (1.0 - l * 0.6);         // film grain
    if (rand(vec2(frame, floor(uv.x * 160.0) + floor(uv.y * 90.0) * 160.0)) > 0.9994) c *= 0.15;   // dust
  } else if (mode == 1) {                                   // ---------- GRINDHOUSE
    c = sat(c, 1.1);
    c = floor(c * 7.0 + rand(uv * res) * 0.6) / 7.0;        // posterised colour
    c = mix(c, vec3(0.98, 0.84, 0.74) * l + vec3(0.1, 0.0, 0.06), 0.22);   // faded print, magenta cast
    c *= 0.93 + 0.07 * rand(vec2(frame, 7.0));              // projector flicker
    float sx = rand(vec2(frame, 3.0)), sx2 = rand(vec2(frame * 0.37, 9.0));
    if (abs(uv.x - sx) < 0.0012 && rand(vec2(frame, 5.0)) > 0.4) c *= 0.4;    // scratches
    if (abs(uv.x - sx2) < 0.0008) c += 0.25;
    if (rand(vec2(frame, floor(uv.x * 90.0) + floor(uv.y * 50.0) * 90.0)) > 0.9985) c = vec3(0.05);
    c += (rand(uv * res + frame) - 0.5) * 0.12;
    vec2 d = uv - 0.5; c = mix(c, vec3(0.45, 0.12, 0.02), smoothstep(0.32, 0.75, length(d * vec2(1.3, 1.0))) * 0.7);  // burned edges
  } else {                                                  // ---------- TERMINAL
    float dc = depthAt(uv), e = 0.0;                        // ink outline where depth jumps
    for (int i = 0; i < 4; i++) { vec2 o = vec2(i == 0 ? 1. : i == 1 ? -1. : 0., i == 2 ? 1. : i == 3 ? -1. : 0.) / res; e = max(e, abs(depthAt(uv + o) - dc) / dc); }
    c = sat(c, 1.2);
    vec3 pal[8];
    pal[0] = vec3(0.06,0.04,0.04); pal[1] = vec3(0.36,0.07,0.06); pal[2] = vec3(0.72,0.16,0.08); pal[3] = vec3(0.93,0.55,0.12);
    pal[4] = vec3(0.98,0.86,0.45); pal[5] = vec3(0.93,0.91,0.84); pal[6] = vec3(0.16,0.2,0.22); pal[7] = vec3(0.42,0.36,0.3);
    vec3 cd = c + (bayer(floor(uv * res)) - 0.5) * 0.18;
    float best = 1e9; vec3 pick = pal[0];
    for (int k = 0; k < 8; k++) { float dd = distance(cd, pal[k]); if (dd < best) { best = dd; pick = pal[k]; } }
    c = pick;
    if (e > 0.06) c = pal[0];
    c *= 0.9 + 0.1 * step(0.5, fract(uv.y * res.y * 0.5));  // scanlines
  }

  vec2 d = uv - 0.5;
  c *= 1.0 - dot(d, d) * (mode == 2 ? 0.4 : 0.9);          // vignette
  c += vec3(0.9, 0.85, 1.0) * flash * 0.15;
  if (letterbox > 0.5 && mode != 2 && abs(vUv.y - 0.5) > 0.5 * min(1.0, (res.x / res.y) / 2.39)) c = vec3(0.0);   // 2.39:1 cinema bars
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
