// blocks.js — the block-building kit. The whole world is made of boxes (like memory cells).
// You "paint" boxes into a Blocks object, then build() turns them into ONE InstancedMesh
// (thousands of boxes, one draw call), each box with its own colour.
import * as THREE from "three";

const unitBox = new THREE.BoxGeometry(1, 1, 1);

export class Blocks {
  constructor({ jitter = 0.06, roughness = 0.85, metalness = 0, emissive = false } = {}) {
    this.items = [];
    this.jitter = jitter;
    this.matOpts = { roughness, metalness, flatShading: true };
    this.emissive = emissive;
  }
  // one box: centre (x,y,z), size (w,h,d), colour, optional rotation about y
  add(x, y, z, w, h, d, color, ry = 0) { this.items.push({ x, y, z, w, h, d, color: new THREE.Color(color), ry }); return this; }
  // a box resting on y (bottom face at y)
  put(x, y, z, w, h, d, color, ry = 0) { return this.add(x, y + h / 2, z, w, h, d, color, ry); }
  build(scene, { castShadow = true, receiveShadow = true } = {}) {
    // glowing blocks (fire, lamps) ignore light; normal blocks are lit and cast shadows
    const mat = this.emissive ? new THREE.MeshBasicMaterial({ toneMapped: false }) : new THREE.MeshStandardMaterial(this.matOpts);
    const im = new THREE.InstancedMesh(unitBox, mat, this.items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    this.items.forEach((b, i) => {
      q.setFromEuler(e.set(0, b.ry, 0));
      m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
      im.setMatrixAt(i, m);
      const j = 1 + (Math.random() - 0.5) * this.jitter * 2;
      im.setColorAt(i, c.copy(b.color).multiplyScalar(j));
    });
    im.castShadow = castShadow; im.receiveShadow = receiveShadow;
    scene.add(im);
    return im;
  }
}

// A tiny 3x5 pixel font for numbers and a few letters, drawn onto canvases with crisp pixels.
const GLYPHS = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
  "5": "111100111001111", "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101111011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", x: "000101010101000", "[": "110100100100110", "]": "011001001001011", "-": "000000111000000",
  " ": "000000000000000", "!": "010010010000010", "?": "111001011000010", ".": "000000000000010", ":": "000010000010000",
  "/": "001001010100100", "=": "000111000111000", ">": "100010001010100", "<": "001010100010001", "_": "000000000000111"
};
export function pixelText(text, { scale = 8, fg = "#f3e2b8", bg = null, pad = 1 } = {}) {
  const w = text.length * 4 - 1 + pad * 2, h = 5 + pad * 2;
  const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = fg;
  [...text].forEach((ch, k) => {
    const bits = GLYPHS[ch] || GLYPHS[" "];
    for (let i = 0; i < 15; i++) if (bits[i] === "1") g.fillRect((pad + k * 4 + (i % 3)) * scale, (pad + Math.floor(i / 3)) * scale, scale, scale);
  });
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  t.userData = { aspect: c.width / c.height };
  return t;
}
export function pixelLabel(text, height, opts) {
  const tex = pixelText(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * tex.userData.aspect, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  return m;
}
