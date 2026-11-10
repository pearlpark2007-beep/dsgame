// godrays.js — light rays streaming from a bright opening ("crepuscular rays"), done on the finished
// picture: every pixel looks back along the line toward the light and gathers the bright pixels it
// crosses, fading with distance. Dust and smoke in the air are what make this visible in a real cave;
// here the effect stands in for them. Off (strength 0) unless a shot turns it on.
//   const rays = new GodRays(world);  rays.aim(worldPoint);  rays.strength = 1;
import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const RayShader = {
  uniforms: { tDiffuse: { value: null }, light: { value: new THREE.Vector2(0.5, 0.5) }, strength: { value: 0 },
    threshold: { value: 2.0 }, tint: { value: new THREE.Color(1.0, 0.82, 0.55) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 light; uniform float strength, threshold; uniform vec3 tint;
    varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      if (strength <= 0.0) { gl_FragColor = base; return; }
      const int N = 48;
      vec2 step = (vUv - light) / float(N) * 0.92;
      // a random start along the first step for every pixel: no visible "ladder" of copies
      float jit = fract(sin(dot(vUv * 1000.0, vec2(12.9898, 78.233))) * 43758.5453);
      vec2 uv = vUv - step * jit; float fall = 1.0; vec3 sum = vec3(0.0);
      for (int i = 0; i < N; i++) {
        uv -= step;
        vec3 c = texture2D(tDiffuse, uv).rgb;
        sum += max(c - threshold, 0.0) * fall;   // only what is brighter than white (the open sky) makes rays
        fall *= 0.955;
      }
      gl_FragColor = vec4(base.rgb + sum / float(N) * 3.2 * strength * tint, base.a);
    }`
};

export class GodRays {
  constructor(world) {
    this.world = world;
    this.pass = new ShaderPass(RayShader);
    // after the bloom, before tone mapping: the bright opening is still brighter than white here
    const passes = world.composer.passes;
    const at = passes.indexOf(world.bloom) + 1;
    world.composer.insertPass(this.pass, at);
    this.pass.enabled = false;
    this.target = new THREE.Vector3();
    world.add(this);
  }
  set strength(k) { this.pass.uniforms.strength.value = k; this.pass.enabled = k > 0; }
  get strength() { return this.pass.uniforms.strength.value; }
  aim(p) { this.target.copy(p); }
  update() {
    if (this.strength <= 0) return;
    const v = this.target.clone().project(this.world.camera);
    // behind the camera there is nothing to stream from
    this.pass.enabled = v.z < 1;
    this.pass.uniforms.light.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
  }
}
