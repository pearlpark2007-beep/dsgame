// sea.js — a reflective, moving sea (three.js Water) with a wave texture we generate ourselves.
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";

// Builds a seamless "bumpy water" normal map on a canvas, so no image file is needed.
function waveNormalTexture(size = 256) {
  const h = new Float32Array(size * size);
  const waves = [];
  for (let i = 0; i < 26; i++) {
    // whole-number frequencies make the pattern tile without seams
    waves.push({ fx: Math.round((Math.random() - 0.5) * 18), fy: Math.round((Math.random() - 0.5) * 18), a: Math.random() / (1 + i * 0.25), p: Math.random() * 6.283 });
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const w of waves) v += w.a * Math.sin(6.283 * (w.fx * x + w.fy * y) / size + w.p);
    h[y * size + x] = v;
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 0.6, dy = (at(x, y + 1) - at(x, y - 1)) * 0.6;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize();
    const i = (y * size + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class Sea {
  constructor(world, { color = 0x0b1a20, sunDir = new THREE.Vector3(0, 0.3, -1), sunColor = 0x8a7a68, size = 6000, distortion = 2.6 } = {}) {
    this.world = world;
    this.opts = { color, sunDir, sunColor, size, distortion };
    this.build(world.quality);
  }
  build(quality) {
    if (this.water) { this.world.scene.remove(this.water); this.water.geometry.dispose(); this.water.material.dispose(); }
    const res = quality === "high" ? 1024 : 384;
    this.normals = this.normals || waveNormalTexture();
    this.water = new Water(new THREE.PlaneGeometry(this.opts.size, this.opts.size), {
      textureWidth: res, textureHeight: res, waterNormals: this.normals,
      sunDirection: this.opts.sunDir.clone().normalize(), sunColor: this.opts.sunColor,
      waterColor: this.opts.color, distortionScale: this.opts.distortion, fog: true
    });
    this.water.rotation.x = -Math.PI / 2;
    this.water.material.uniforms.size.value = 2.2;
    this.water.receiveShadow = false;
    this.world.scene.add(this.water);
  }
  onQuality(q) { this.build(q); }
  update(dt) { this.water.material.uniforms.time.value += dt * 0.6; }
}
