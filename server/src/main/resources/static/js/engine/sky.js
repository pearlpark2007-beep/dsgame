// sky.js — a moving storm sky (a giant inside-out sphere with a cloud shader) and lightning.
import * as THREE from "three";

export class StormSky {
  constructor(world, {
    zenith = 0x0c1219, horizon = 0x3d4952, cloudDark = 0x161d24, cloudLit = 0x77838d,
    glow = 0xb5643a, glowDir = new THREE.Vector3(0, 0.08, -1)
  } = {}) {
    this.world = world;
    this.uniforms = {
      time: { value: 0 }, flash: { value: 0 }, flashDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
      zenith: { value: new THREE.Color(zenith) }, horizon: { value: new THREE.Color(horizon) },
      cloudDark: { value: new THREE.Color(cloudDark) }, cloudLit: { value: new THREE.Color(cloudLit) },
      glow: { value: new THREE.Color(glow) }, glowDir: { value: glowDir.clone().normalize() }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform float time, flash; uniform vec3 flashDir, zenith, horizon, cloudDark, cloudLit, glow, glowDir;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
        void main(){
          vec3 d = normalize(vDir);
          float h = max(d.y, 0.0);
          vec3 col = mix(horizon, zenith, pow(h, 0.55));
          // clouds: project the view direction onto a flat cloud layer
          vec2 uv = d.xz / (d.y + 0.12) * 1.4;
          float c = fbm(uv + vec2(time * 0.012, time * 0.004));
          float c2 = fbm(uv * 2.7 - vec2(time * 0.02, 0.0));
          float cloud = smoothstep(0.28, 0.72, c * 0.8 + c2 * 0.3);
          float edge = smoothstep(0.55, 0.95, c2) * (1.0 - cloud);           // thin bright rims
          vec3 cc = mix(cloudDark, cloudLit, edge * 0.8 + c2 * 0.25);
          col = mix(col, cc, cloud * smoothstep(-0.02, 0.18, d.y));
          // the dim, burning dusk behind the storm
          float g = pow(max(dot(d, normalize(glowDir)), 0.0), 5.0) * (1.0 - smoothstep(0.02, 0.35, d.y));
          col += glow * g * (0.25 + 0.95 * (1.0 - cloud));                     // the glow shows through gaps
          col += glow * 0.35 * edge * g;
          // lightning lights the clouds from inside
          float fl = pow(max(dot(d, flashDir), 0.0), 3.0);
          col += vec3(0.55, 0.62, 0.8) * flash * (0.06 + fl * 0.9) * (0.3 + cloud);
          col = mix(col, horizon * 0.9, smoothstep(0.02, -0.08, d.y));       // below horizon: haze
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    world.scene.add(this.mesh);
  }
  update(dt, time) {
    this.uniforms.time.value = time;
    this.mesh.position.copy(this.world.camera.position);
  }
}

// Lightning: random strikes far away. Flashes the sky, the scene and draws a bolt.
export class Lightning {
  constructor(world, sky, { area = [[-300, 300], [-700, -150]], every = [5, 12], ground = 0 } = {}) {
    this.world = world; this.sky = sky; this.area = area; this.every = every; this.ground = ground;
    this.light = new THREE.DirectionalLight(0xc8d6ff, 0);
    this.light.position.set(0, 200, -300);
    world.scene.add(this.light, this.light.target);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, toneMapped: false, transparent: true, fog: false });
    this.bolts = new THREE.Group();
    world.scene.add(this.bolts);
    this.next = 2.5;
    this.pulses = [];
    this.flash = 0;
  }

  boltGeometry(from, to, spread, steps) {
    const pts = [from.clone()];
    for (let i = 1; i < steps; i++) {
      const p = from.clone().lerp(to, i / steps);
      p.x += (Math.random() - 0.5) * spread; p.z += (Math.random() - 0.5) * spread * 0.6;
      pts.push(p);
    }
    pts.push(to.clone());
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    return { geo: new THREE.TubeGeometry(path, steps * 3, spread * 0.022, 4, false), pts };
  }

  strike(at) {
    const [ax, az] = this.area;
    const x = at ? at.x : THREE.MathUtils.lerp(ax[0], ax[1], Math.random());
    const z = at ? at.z : THREE.MathUtils.lerp(az[0], az[1], Math.random());
    const top = new THREE.Vector3(x + (Math.random() - 0.5) * 80, 420, z);
    const bottom = new THREE.Vector3(x, this.ground, z);
    this.bolts.clear();
    const main = this.boltGeometry(top, bottom, 46, 22);
    this.bolts.add(new THREE.Mesh(main.geo, this.boltMat));
    for (let b = 0; b < 3; b++) {             // a few branches
      const start = main.pts[3 + Math.floor(Math.random() * 10)];
      const end = start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 140, -60 - Math.random() * 90, (Math.random() - 0.5) * 40));
      this.bolts.add(new THREE.Mesh(this.boltGeometry(start, end, 20, 8).geo, this.boltMat));
    }
    this.light.position.set(x, 300, z);
    this.sky.uniforms.flashDir.value.set(x, 260, z).sub(this.world.camera.position).normalize();
    // a flash is 2–3 quick flickers
    const n = 2 + Math.floor(Math.random() * 2);
    let t = 0;
    for (let i = 0; i < n; i++) { this.pulses.push({ at: t, len: 0.07 + Math.random() * 0.08, power: 1 - i * 0.25 }); t += 0.09 + Math.random() * 0.12; }
    this.pulseClock = 0;
  }

  update(dt, time, raw) {
    this.next -= raw;
    if (this.next <= 0) { this.strike(); this.next = THREE.MathUtils.lerp(this.every[0], this.every[1], Math.random()); }
    let f = 0;
    if (this.pulses.length) {
      this.pulseClock += raw;
      for (const p of this.pulses) if (this.pulseClock >= p.at && this.pulseClock < p.at + p.len) f = Math.max(f, p.power);
      if (this.pulseClock > this.pulses[this.pulses.length - 1].at + 0.3) { this.pulses = []; this.bolts.clear(); }
    }
    this.flash += (f - this.flash) * Math.min(1, raw * 40);
    this.light.intensity = this.flash * 1.6;
    this.sky.uniforms.flash.value = this.flash;
    this.world.grade.uniforms.flash.value = this.flash * 0.18;
    this.boltMat.opacity = Math.min(1, f * 1.5);
    this.bolts.visible = f > 0.05;
  }
}
