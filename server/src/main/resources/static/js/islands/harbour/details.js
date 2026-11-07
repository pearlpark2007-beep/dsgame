// details.js — the small living things that make the harbour feel real:
// surf against the sea wall, flags in the wind, birds around the towers,
// the giants' fires on the cliff tops, and the giantess glimpsed in the lightning.
import * as THREE from "three";
import { Fire } from "../../engine/weather.js";
import { copyOf, centreOnGround } from "../../engine/assets.js";

// White surf that breaks and slides along the foot of the quay wall.
export function surf(world, { x0 = -46, x1 = 46, z = -4.05, width = 3 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float time; varying vec2 vUv; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      void main(){
        float wave = 0.5 + 0.5 * sin(time * 1.3 + vW.x * 0.35);            // surges arrive along the wall
        float reach = 0.35 + 0.5 * wave;                                    // how far the foam reaches from the wall
        float n = noise(vec2(vW.x * 1.6 + time * 0.4, vUv.y * 9.0 - time * 1.2)) * 0.6 + noise(vec2(vW.x * 4.0, vUv.y * 22.0 + time)) * 0.4;
        float edge = smoothstep(reach, reach - 0.35, vUv.y);                // 0 at the open sea side
        float a = smoothstep(0.45, 0.8, n + edge * 0.55) * edge;
        gl_FragColor = vec4(vec3(0.66, 0.71, 0.74), a * 0.45 * (0.55 + 0.45 * noise(vec2(vW.x * 0.15 - time * 0.2, 3.0))));
      }`
  });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, width, 200, 1), mat);
  strip.rotation.x = -Math.PI / 2;
  // uv.y = 1 at the wall, 0 out at sea
  strip.position.set((x0 + x1) / 2, 0.06, z - width / 2);
  strip.renderOrder = 2;
  world.scene.add(strip);
  world.add({ update: (dt, t) => mat.uniforms.time.value = t });
  return strip;
}

// A cloth flag that ripples in the wind (the waving happens on the graphics card).
let flagTex = null;
function flagTexture() {
  if (flagTex) return flagTex;
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#6e1d16"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#c9a24a"; g.lineWidth = 6;
  // a Greek key (meander) border
  for (const y of [14, 114]) {
    g.beginPath();
    for (let x = 0; x < 256; x += 24) { g.moveTo(x, y + 6); g.lineTo(x, y - 6); g.lineTo(x + 16, y - 6); g.lineTo(x + 16, y + 2); g.lineTo(x + 8, y + 2); }
    g.stroke();
  }
  g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(128, 64, 22, 0, Math.PI * 2); g.fill();
  flagTex = new THREE.CanvasTexture(c); flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}
export function flag(world, position, { w = 1.6, h = 0.9, rotationY = 0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.9 });
  const uniforms = { time: { value: Math.random() * 10 } };
  mat.onBeforeCompile = shader => {
    shader.uniforms.time = uniforms.time;
    shader.vertexShader = "uniform float time;\n" + shader.vertexShader.replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position);
      float k = uv.x;                                            // 0 at the pole, 1 at the free end
      transformed.z += k * (sin(time * 6.0 - uv.x * 7.0) * 0.18 + sin(time * 9.7 - uv.x * 13.0 + uv.y * 3.0) * 0.06);
      transformed.y -= k * k * 0.12;`);
  };
  const geo = new THREE.PlaneGeometry(w, h, 24, 8).translate(w / 2, 0, 0);
  const f = new THREE.Mesh(geo, mat);
  f.position.copy(position);
  f.rotation.y = rotationY;
  f.castShadow = true;
  world.scene.add(f);
  world.add({ update: dt => uniforms.time.value += dt });
  return f;
}

// Dark birds circling high around the towers.
export function birds(world, centres) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.4, -1, 0, -0.2, 0, 0, -0.1, 0, 0, 0.4, 1, 0, -0.2, 0, 0, -0.1], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x0b0d0f, side: THREE.DoubleSide });
  const flock = [];
  for (const c of centres) for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(geo, mat);
    b.scale.setScalar(1.4 + Math.random());
    b.userData = { c, r: 16 + Math.random() * 30, h: c.y + (Math.random() - 0.5) * 30, a: Math.random() * 6.28, s: 0.12 + Math.random() * 0.12, f: Math.random() * 6 };
    world.scene.add(b);
    flock.push(b);
  }
  world.add({ update: (dt, t) => {
    for (const b of flock) {
      const u = b.userData;
      u.a += u.s * dt;
      b.position.set(u.c.x + Math.cos(u.a) * u.r, u.h + Math.sin(t * 0.5 + u.f) * 3, u.c.z + Math.sin(u.a) * u.r);
      b.rotation.set(0, -u.a, 0.35);
      b.scale.y = Math.sin(t * 7 + u.f) * 2.2;            // wing beat
    }
  } });
}

// The giants' fires burning on the cliff tops, far away.
export function cliffFires(world, spots) {
  for (const [x, y, z] of spots) world.add(new Fire(world, new THREE.Vector3(x, y, z), { size: 5, count: 50, light: false, embers: false }));
}

// The Laestrygonian queen: a colossal dark figure beyond the cliffs, seen only when lightning strikes.
export function giantess(world, statueModel, lightning, { position = new THREE.Vector3(-150, -20, -470), height = 190 } = {}) {
  const g = centreOnGround(copyOf(statueModel, { castShadow: false }));
  const mat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 1, fog: true });
  g.traverse(o => { if (o.isMesh) o.material = mat; });
  const box = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(height / (box.max.y - box.min.y));
  g.position.copy(position);
  g.rotation.y = 0.9;
  world.scene.add(g);
  // she is nearly invisible in the fog; the flash lifts her out of it
  world.add({ update: () => { mat.emissive.setRGB(0.08, 0.09, 0.11).multiplyScalar(lightning.flash * 4); } });
  return g;
}
