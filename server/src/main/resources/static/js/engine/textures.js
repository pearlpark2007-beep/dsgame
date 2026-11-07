// textures.js — surface textures drawn in code (stone, weathered marble, painted planks).
// Each returns { map, normalMap, roughnessMap } ready for MeshStandardMaterial.
import * as THREE from "three";

function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const p = Array.from({ length: 256 }, (_, i) => i).sort(() => rnd() - 0.5);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  // tileable gradient noise with period `per`
  const noise = (x, y, per) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X0 = (((xi % per) + per) % per) & 255, Y0 = (((yi % per) + per) % per) & 255;
    const X1 = ((X0 + 1) % per) & 255, Y1 = ((Y0 + 1) % per) & 255;
    const u = fade(xf), v = fade(yf);
    const a = grad(perm[perm[X0] + Y0], xf, yf), b = grad(perm[perm[X1] + Y0], xf - 1, yf);
    const c = grad(perm[perm[X0] + Y1], xf, yf - 1), d = grad(perm[perm[X1] + Y1], xf - 1, yf - 1);
    return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  };
  return (x, y, octaves = 5, per = 8) => {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < octaves; o++) { v += amp * noise(x * f, y * f, per * f); amp *= 0.5; f *= 2; }
    return v;
  };
}

function toTextures(size, heightFn, colorFn, roughFn, strength = 2.5, repeat = 1) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = heightFn(x / size, y / size);
  const make = () => { const c = document.createElement("canvas"); c.width = c.height = size; return c; };
  const cc = make(), cn = make(), cr = make();
  const ic = cc.getContext("2d").createImageData(size, size), inn = cn.getContext("2d").createImageData(size, size), ir = cr.getContext("2d").createImageData(size, size);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, h = at(x, y);
    const [r, g, b] = colorFn(h, x / size, y / size);
    ic.data[i] = r; ic.data[i + 1] = g; ic.data[i + 2] = b; ic.data[i + 3] = 255;
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength * size / 256, dy = (at(x, y + 1) - at(x, y - 1)) * strength * size / 256;
    const n = new THREE.Vector3(-dx, dy, 1).normalize();
    inn.data[i] = (n.x * 0.5 + 0.5) * 255; inn.data[i + 1] = (n.y * 0.5 + 0.5) * 255; inn.data[i + 2] = (n.z * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
    const ro = roughFn(h) * 255; ir.data[i] = ir.data[i + 1] = ir.data[i + 2] = ro; ir.data[i + 3] = 255;
  }
  cc.getContext("2d").putImageData(ic, 0, 0); cn.getContext("2d").putImageData(inn, 0, 0); cr.getContext("2d").putImageData(ir, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: tex(cc, true), normalMap: tex(cn, false), roughnessMap: tex(cr, false) };
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Dark, wet harbour stone with pits and cracks.
export function stoneTexture({ size = 512, seed = 3, base = [92, 92, 88], dark = [38, 41, 42], moss = [52, 62, 44], repeat = 1 } = {}) {
  const n = makeNoise(seed);
  const height = (u, v) => {
    const big = n(u * 4, v * 4, 6, 4);
    const pits = Math.max(0, -n(u * 24 + 7, v * 24, 3, 24)) * 0.8;
    const crack = Math.pow(1 - Math.abs(n(u * 6 + 3, v * 6 + 9, 4, 6)), 18) * 0.6;
    return big * 0.8 - pits - crack;
  };
  return toTextures(size, height,
    (h, u, v) => {
      const t = clamp(h * 1.4 + 0.55);
      const m = clamp(n(u * 3 + 11, v * 3, 3, 3) * 2.2 - 0.25) * 0.7;
      return [0, 1, 2].map(i => mix(mix(dark[i], base[i], t), moss[i], m * (1 - t)));
    },
    h => clamp(0.72 + h * 0.5, 0.45, 0.97), 1.6, repeat);
}

// Weathered marble: pale stone with faint veins and grime in the low parts.
export function marbleTexture({ size = 512, seed = 7, base = [184, 177, 164], grime = [70, 70, 66], repeat = 1 } = {}) {
  const n = makeNoise(seed);
  const height = (u, v) => n(u * 5, v * 5, 5, 5) * 0.5 + n(u * 30, v * 30, 2, 30) * 0.1;
  return toTextures(size, height,
    (h, u, v) => {
      const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + n(u * 3, v * 3, 4, 3) * 2.5) * Math.PI)), 26) * 0.35;
      const g = clamp(-h * 1.8 + 0.15) * 0.75;
      return [0, 1, 2].map(i => mix(base[i], grime[i], g) - vein * 90);
    },
    h => clamp(0.45 - h * 0.4, 0.25, 0.85), 1.4, repeat);
}

// Ship planks: long boards with tar lines, painted dark with worn edges.
export function plankTexture({ size = 512, seed = 5, base = [58, 40, 28], light = [104, 76, 52], boards = 10, repeat = 1 } = {}) {
  const n = makeNoise(seed);
  const height = (u, v) => {
    const row = v * boards, seam = Math.min(row % 1, 1 - (row % 1));
    return -Math.pow(clamp(1 - seam * 14), 3) * 0.8 + n(u * 2, v * 40, 4, 2) * 0.12;
  };
  return toTextures(size, height,
    (h, u, v) => {
      const grain = n(u * 3, v * 60, 4, 3) * 0.5 + 0.5;
      const t = clamp(grain * 0.9 + h * 0.6);
      return [0, 1, 2].map(i => mix(base[i], light[i], t));
    },
    h => clamp(0.7 - h * 0.3, 0.45, 0.95), 2.0, repeat);
}
