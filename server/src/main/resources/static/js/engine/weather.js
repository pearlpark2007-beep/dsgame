// weather.js — rain, fire, embers and drifting sea mist.
import * as THREE from "three";

// A soft round dot drawn on a canvas, used by fire and embers.
let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

// Rain: slanted streaks in a box that follows the camera.
export class Rain {
  constructor(world, { count = 7000, box = [70, 40, 70], wind = new THREE.Vector3(-2.5, 0, 1.2), speed = 26 } = {}) {
    this.world = world; this.box = box; this.wind = wind; this.speed = speed; this.maxCount = count;
    const pos = new Float32Array(count * 6);
    this.drops = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.drops[i * 3] = (Math.random() - 0.5) * box[0];
      this.drops[i * 3 + 1] = Math.random() * box[1];
      this.drops[i * 3 + 2] = (Math.random() - 0.5) * box[2];
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0x9fb2c0, transparent: true, opacity: 0.2, depthWrite: false });
    this.lines = new THREE.LineSegments(this.geo, this.mat);
    this.lines.frustumCulled = false;
    world.scene.add(this.lines);
    this.onQuality(world.quality);
  }
  onQuality(q) { this.count = q === "high" ? this.maxCount : Math.floor(this.maxCount * 0.35); this.geo.setDrawRange(0, this.count * 2); }
  update(dt) {
    const cam = this.world.camera.position, [bx, by, bz] = this.box;
    const p = this.geo.attributes.position.array;
    const fall = this.speed * dt, len = 0.55;
    const sx = this.wind.x / this.speed, sz = this.wind.z / this.speed;
    for (let i = 0; i < this.count; i++) {
      const d = this.drops;
      d[i * 3] += this.wind.x * dt; d[i * 3 + 1] -= fall; d[i * 3 + 2] += this.wind.z * dt;
      if (d[i * 3 + 1] < 0) d[i * 3 + 1] += by;
      // wrap the drop inside the box around the camera
      const x = cam.x + ((((d[i * 3] - cam.x) % bx) + bx * 1.5) % bx) - bx / 2;
      const z = cam.z + ((((d[i * 3 + 2] - cam.z) % bz) + bz * 1.5) % bz) - bz / 2;
      const y = cam.y - by * 0.35 + d[i * 3 + 1];
      p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
      p[i * 6 + 3] = x - sx * len; p[i * 6 + 4] = y + len; p[i * 6 + 5] = z - sz * len;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// Fire: glowing particles that rise, shrink and cool from yellow to red. Also flickers a light.
export class Fire {
  constructor(world, position, { size = 1, count = 90, light = true, embers = true } = {}) {
    this.world = world; this.origin = position.clone(); this.size = size; this.count = count;
    this.p = []; for (let i = 0; i < count; i++) this.p.push(this.spawn({}, true));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.75 * size, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, fog: true
    }));
    this.points.frustumCulled = false;
    world.scene.add(this.points);
    if (light) {
      this.light = new THREE.PointLight(0xff8a3c, 30 * size, 20 * size, 1.7);
      this.light.position.copy(position).add(new THREE.Vector3(0, 0.6 * size, 0));
      world.scene.add(this.light);
    }
    if (embers) this.embers = new Embers(world, position, { size });
    this.seed = Math.random() * 100;
  }
  spawn(o, initial) {
    const r = 0.22 * this.size * Math.sqrt(Math.random()), a = Math.random() * 6.283;
    o.x = Math.cos(a) * r; o.z = Math.sin(a) * r; o.y = 0;
    o.vy = (1.1 + Math.random() * 1.1) * this.size;
    o.life = 0; o.max = 0.5 + Math.random() * 0.6;
    if (initial) o.life = Math.random() * o.max;
    return o;
  }
  update(dt, time) {
    const pos = this.points.geometry.attributes.position.array, col = this.points.geometry.attributes.color.array;
    for (let i = 0; i < this.count; i++) {
      const o = this.p[i];
      o.life += dt;
      if (o.life > o.max) this.spawn(o);
      const k = o.life / o.max;
      o.y += o.vy * dt;
      const pull = 1 - dt * 2.2;                     // flames pull to the middle as they rise
      o.x *= pull; o.z *= pull;
      pos[i * 3] = this.origin.x + o.x + Math.sin(time * 7 + i) * 0.03 * this.size;
      pos[i * 3 + 1] = this.origin.y + o.y;
      pos[i * 3 + 2] = this.origin.z + o.z;
      const heat = 1 - k, fade = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.9;
      col[i * 3] = fade * 1.0; col[i * 3 + 1] = fade * (0.25 + 0.6 * heat * heat); col[i * 3 + 2] = fade * 0.12 * heat;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    if (this.light) {
      const t = time + this.seed;
      this.light.intensity = 30 * this.size * (0.82 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29.7) + 0.05 * Math.sin(t * 5.3));
    }
    if (this.embers) this.embers.update(dt, time);
  }
}

// Embers: tiny sparks drifting up and away from a fire.
export class Embers {
  constructor(world, position, { size = 1, count = 26 } = {}) {
    this.origin = position.clone(); this.size = size; this.count = count;
    this.p = []; for (let i = 0; i < count; i++) this.p.push(this.spawn({}, true));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.05 * size, map: softDot(), color: 0xffa040, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false
    }));
    this.points.frustumCulled = false;
    world.scene.add(this.points);
  }
  spawn(o, initial) {
    o.x = (Math.random() - 0.5) * 0.3 * this.size; o.y = 0.4 * this.size; o.z = (Math.random() - 0.5) * 0.3 * this.size;
    o.vx = (Math.random() - 0.5) * 0.6; o.vy = 1.2 + Math.random() * 2; o.vz = (Math.random() - 0.5) * 0.6;
    o.life = initial ? Math.random() * 3 : 0; o.max = 2 + Math.random() * 2;
    return o;
  }
  update(dt, time) {
    const pos = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const o = this.p[i];
      o.life += dt;
      if (o.life > o.max) this.spawn(o);
      o.vx += (Math.sin(time * 1.7 + i * 3.1) * 0.8 - 0.6) * dt;   // the storm wind pushes them
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      pos[i * 3] = this.origin.x + o.x; pos[i * 3 + 1] = this.origin.y + o.y; pos[i * 3 + 2] = this.origin.z + o.z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Mist: big soft sheets of fog just above the water that slowly drift.
export class Mist {
  constructor(world, { count = 14, area = [[-120, 120], [-500, 10]], height = [1, 12], color = 0x56636c } = {}) {
    this.sheets = [];
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
      vertexShader: `varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform float time; uniform vec3 color; varying vec2 vUv; varying float vDepth;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
        void main(){
          vec2 p = vUv * 3.0 + vec2(time * 0.02, 0.0);
          float n = noise(p) * 0.6 + noise(p * 2.3 + 4.0) * 0.4;
          float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          float near = smoothstep(4.0, 25.0, vDepth);            // fade when the camera is inside it
          gl_FragColor = vec4(color, n * edge * near * 0.32);
        }`
    });
    this.mat = mat;
    for (let i = 0; i < count; i++) {
      const w = 60 + Math.random() * 90;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.18), mat);
      m.position.set(THREE.MathUtils.lerp(area[0][0], area[0][1], Math.random()), THREE.MathUtils.lerp(height[0], height[1], Math.random()), THREE.MathUtils.lerp(area[1][0], area[1][1], Math.random()));
      m.userData.drift = 0.6 + Math.random();
      m.renderOrder = 5;
      world.scene.add(m);
      this.sheets.push(m);
    }
    this.world = world;
  }
  update(dt, time) {
    this.mat.uniforms.time.value = time;
    for (const m of this.sheets) {
      m.quaternion.copy(this.world.camera.quaternion);           // always face the camera
      m.position.x += m.userData.drift * dt;
      if (m.position.x > 160) m.position.x = -160;
    }
  }
}
