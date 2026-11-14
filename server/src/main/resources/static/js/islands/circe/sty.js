// sty.js — the sty on Circe's island (the island itself is helios.js): the crew turned into pigs. Each pig IS a node of a linked list, seen from above:
//   • its back is the node's box: the tag (data) painted big, its address small under it,
//   • the little crate on its rump is the node's next field: the rope to the NEXT pig leaves from
//     there and ends in an arrow at that pig's nose; a loose rope end is NULL,
//   • in front of every pig stands its plaque, [ address | data | next ], so every field of every node
//     is readable at all times (next shows the address it holds, or NULL),
//   • the pigs stand in the order of the rope, left to right, like the board under the picture:
//     row 0 is the rope from the gate (head); row 1, nearer the camera, is anything off that rope.
//     Arrows on row 0 only ever point right, so they never cross. When the rope changes, the pigs
//     walk to their new places.
// The sty gate is the head pointer: a gold rope from the gate to the first pig. Every other pointer
// (p, prev, cur, found...) is a coloured banner over the pig it points at, or over the NULL stone.
//
// The scene draws FRAMES (the same ones the list board draws, see listBoard.js): show(frame) jumps to
// one, act(step, frame) animates the change to it. So stepping back is free.
import * as THREE from "three";
import { NULL, hex, walkFrom, lostNodes, layoutFrame, HEAD_COLOR } from "../../learn/listBoard.js";

// the grid the pigs stand on
const X0 = -8.5, SP = 3.7, ROW0 = -1.0, ROW1 = 3.6;     // SP: room between slabs for the rope to be seen
export const GATE = new THREE.Vector3(X0 - 2.7, 0, ROW0);
export const PIT = new THREE.Vector3(X0 + 9 * SP, 0, ROW0);      // where the NULL stone rests when the rope is long
const cell = (c, r) => new THREE.Vector3(X0 + c * SP, 0, r ? ROW1 : ROW0);

// ---------- small canvas helpers
const ROPE_TEX = (() => {
  const c = document.createElement("canvas"); c.width = 64; c.height = 32; const g = c.getContext("2d");
  g.fillStyle = "#c9a066"; g.fillRect(0, 0, 64, 32);
  g.strokeStyle = "#8a6232"; g.lineWidth = 7;
  for (let x = -32; x < 96; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 32); g.stroke(); }
  g.strokeStyle = "#e6c48a"; g.lineWidth = 2;
  for (let x = -28; x < 96; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 32); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function labelSprite(draw, w, h, scale) {
  const tex = canvasTexture(w, h, draw);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  s.scale.set(scale * w / h, scale, 1); s.renderOrder = 10;
  return s;
}
// the node's box, painted on the pig's back: the data big, the address small; a coloured rim when it is read or written
function backTexture(value, address, rim = null) {
  return canvasTexture(256, 192, (g, w, h) => {
    g.fillStyle = "#f3e6cf"; g.fillRect(0, 0, w, h);
    g.strokeStyle = rim || "#5a3a22"; g.lineWidth = rim ? 22 : 10; g.strokeRect(0, 0, w, h);
    g.fillStyle = "#2a160c"; g.font = "bold 104px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(value), w / 2, h * 0.44);
    g.fillStyle = "#7a5a3a"; g.font = "bold 30px 'Courier Prime', monospace"; g.fillText(hex(address), w / 2, h * 0.84);
  });
}
// the node's plaque, standing in front of the pig so nothing about the node is ever hidden:
//   [ address | data | next ]  — next shows the address it holds, or NULL.
// rim: a colour while the node is read/written; hot: "next" lit while that rope is being re-tied;
// dangling: next holds an address that is no longer a node; lost: nothing can reach this pig.
function plaqueTexture({ address, data, next, rim = null, hot = false, dangling = false, lost = false }) {
  return canvasTexture(600, 200, (g, w, h) => {
    const A = 176, D = 360;
    g.fillStyle = lost ? "#d9d4cc" : "#fbf5e6"; g.fillRect(0, 0, w, h);
    // address cell: black, brass text
    g.fillStyle = "#141008"; g.fillRect(0, 0, A, h);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#e0b83a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("address", A / 2, 34);
    g.fillStyle = "#ffd21a"; g.strokeStyle = "#ffd21a"; g.lineWidth = 3; g.font = "bold 62px 'Courier Prime', 'Courier New', monospace"; g.fillText(hex(address), A / 2, 126, A - 12); g.strokeText(hex(address), A / 2, 126, A - 12);
    // data cell
    g.fillStyle = "#4a3c2a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("data", (A + D) / 2, 34);
    g.fillStyle = "#141008"; g.font = "bold 124px Anton, Impact, 'Arial Black', sans-serif"; g.fillText(String(data), (A + D) / 2, 130, D - A - 14);
    // next cell
    if (hot) { g.fillStyle = "#ffb070"; g.fillRect(D, 0, w - D, h); }
    g.fillStyle = "#4a3c2a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("next", (D + w) / 2, 34);
    const isNull = next === NULL;
    g.fillStyle = g.strokeStyle = isNull || dangling ? "#b0140c" : "#0a1a8c"; g.lineWidth = 4; g.font = "bold 76px 'Courier Prime', 'Courier New', monospace";
    const nt = isNull ? "NULL" : hex(next) + (dangling ? "✗" : "");
    g.fillText(nt, (D + w) / 2, 126, w - D - 14); g.strokeText(nt, (D + w) / 2, 126, w - D - 14);
    // cell walls and the rim
    g.fillStyle = "#141008"; g.fillRect(D - 3, 0, 6, h);
    g.strokeStyle = rim || "#141008"; g.lineWidth = rim ? 20 : 8; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    if (lost) {
      // the labels row becomes a red band: every value stays readable underneath
      g.fillStyle = "#c8261e"; g.fillRect(0, 0, w, 66);
      g.fillStyle = "#fff4cf"; g.font = "bold 40px 'Courier Prime', 'Courier New', monospace"; g.fillText("UNREACHABLE · LOST", w / 2, 36);
      g.strokeStyle = "#c8261e"; g.lineWidth = 12; g.setLineDash([26, 14]); g.strokeRect(6, 6, w - 12, h - 12); g.setLineDash([]);
    }
  });
}
const PLAQUE_H = 1.08, PLAQUE_AT = new THREE.Vector3(0, 0.66, 1.35);
// THE NODE: a stone slab drawn like the textbook box. Seen from above (the camera's view):
//   [        data         |   next    ]   the pig stands at the back of the data cell,
//   [   the number, big   |  0x1B0 •  ]   the rope leaves from the dot in the next cell
//   [ address  0x1A0                  ]   and lands on the edge of the node it points at.
const SW = 3.1, SD = 1.3, LEG = 0.42, R = 0.56, SH = 1.12;   // a pig from snout tip to tail: SW long; ropes run at about SH - 0.1
const NEXT_Z = 0;                 // the dot's row in the next cell, from the slab's centre
function slabTexture({ address, data, next, rim = null, hot = false, dangling = false, lost = false }) {
  return canvasTexture(520, 340, (g, w, h) => {
    const D = 300, B = 262;                           // data | next split, address strip from B down
    g.fillStyle = lost ? "#d8d2c8" : "#fbf6e8"; g.fillRect(0, 0, w, h);
    if (hot) { g.fillStyle = "#ffcf9a"; g.fillRect(D, 0, w - D, B); }
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#6a5a40"; g.font = "bold 26px 'Courier Prime', 'Courier New', monospace";
    g.fillText("data", 40, 22); g.fillText("next", D + (w - D) / 2, 22);
    g.fillStyle = "#141008"; g.font = "bold 132px Anton, Impact, 'Arial Black', sans-serif"; g.fillText(String(data), D / 2, 168, D - 30);
    const isNull = next === NULL;
    g.fillStyle = g.strokeStyle = isNull || dangling ? "#b0140c" : "#1d3fd1"; g.lineWidth = 3;
    g.font = "bold 62px 'Courier Prime', 'Courier New', monospace";
    const nt = isNull ? "NULL" : hex(next) + (dangling ? "✗" : "");
    g.fillText(nt, D + (w - D) / 2, 182, w - D - 20); g.strokeText(nt, D + (w - D) / 2, 182, w - D - 20);
    if (!isNull) { g.beginPath(); g.arc(D + (w - D) / 2, 96, 20, 0, Math.PI * 2); g.fill(); g.fillRect(D + (w - D) / 2, 90, w - D - (w - D) / 2, 12); }   // dot, and its line out to the edge where the rope starts
    // the address strip
    g.fillStyle = "#141008"; g.fillRect(0, B, w, h - B);
    g.fillStyle = "#e0b83a"; g.font = "bold 30px 'Courier Prime', 'Courier New', monospace"; g.textAlign = "left"; g.fillText("address", 22, B + (h - B) / 2);
    g.fillStyle = "#ffd21a"; g.font = "bold 58px 'Courier Prime', 'Courier New', monospace"; g.textAlign = "center"; g.fillText(hex(address), w * 0.62, B + (h - B) / 2 + 2);
    // walls between the cells, and the rim (coloured while read / written)
    g.fillStyle = "#141008"; g.fillRect(D - 4, 0, 8, B);
    g.strokeStyle = rim || "#141008"; g.lineWidth = rim ? 22 : 10; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    if (lost) {
      g.fillStyle = "rgba(200,38,30,0.92)"; g.fillRect(0, 0, w, 58);
      g.fillStyle = "#fff4cf"; g.font = "bold 36px 'Courier Prime', 'Courier New', monospace"; g.textAlign = "center"; g.fillText("UNREACHABLE · LOST", w / 2, 30);
      g.strokeStyle = "#c8261e"; g.lineWidth = 12; g.setLineDash([26, 14]); g.strokeRect(6, 6, w - 12, h - 12); g.setLineDash([]);
    }
  });
}
// THE NODE IS THE PIG, painted. A round pig, snout to the left:
//   • its number (data) is painted big on its back, like a brand,
//   • its address is on the yellow tag in its ear,
//   • its next is on the tag at its tail, and the rope to the next pig leaves from the tail
//     and ends in an arrow at that pig's snout.
function brandTexture({ data, rim = null, lost = false }) {
  // painted on the top of the body: the canvas runs round the back (x) and along it (y), so the
  // text is drawn turned a quarter, to read upright from the camera
  return canvasTexture(256, 512, (g, w, h) => {
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 2);
    g.textAlign = "center"; g.textBaseline = "middle";
    if (rim) { g.fillStyle = rim; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(0, 0, 230, 118, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    const t = String(data), size = t.length > 2 ? 190 : 250;
    g.font = `bold ${size}px Anton, Impact, 'Arial Black', sans-serif`;
    g.lineWidth = 16; g.strokeStyle = "#fff3e0"; g.strokeText(t, 0, 8);
    g.fillStyle = lost ? "#7a7470" : "#24100a"; g.fillText(t, 0, 8);
    g.restore();
  });
}
// the crew: a man is known by the tag Circe hung on him (the number on the pig), as in the trials' story:
// Eurylochus wears 19, Elpenor came late as 22. 66 and 77 are Circe's spies at the banquet.
export const CREW = { 7: "Polites", 12: "Perimedes", 3: "Antiphus", 19: "Eurylochus", 5: "Lycus", 22: "Elpenor", 42: "Eurybates" };
const SPIES = new Set([66, 77]);
export const crewName = d => CREW[+d] || (SPIES.has(+d) ? "Circe's spy" : "");
// the name, small and quiet, under the pig's two tags (the data stays the loudest thing on the pig)
function nameTexture(name, lost, spy) {
  return canvasTexture(512, 96, (g, w, h) => {
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 62px 'Courier Prime', monospace";
    g.lineWidth = 12; g.strokeStyle = "rgba(10,14,40,.9)"; g.strokeText(name.toUpperCase(), w / 2, h / 2 + 3, w - 16);
    g.fillStyle = lost ? "#8a827c" : spy ? "#8fa6ff" : "#f4ead2"; g.fillText(name.toUpperCase(), w / 2, h / 2 + 3, w - 16);
  });
}
function tagSprite(draw, w, h, height) {
  const s = labelSprite(draw, w, h, height); s.renderOrder = 12; return s;
}
function earTagTexture(address) {
  return canvasTexture(300, 150, (g, w, h) => {
    g.fillStyle = "#ffd21a"; g.strokeStyle = "#2a1a08"; g.lineWidth = 8;
    g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 26); g.fill(); g.stroke();
    g.fillStyle = "#2a1a08"; g.beginPath(); g.arc(32, h / 2, 10, 0, Math.PI * 2); g.fill();
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 84px 'Courier Prime', monospace"; g.fillText(hex(address), w / 2 + 14, h / 2 + 4, w - 70);
  });
}
function tailTagTexture({ next, hot = false, dangling = false }) {
  const isNull = next === NULL;
  return canvasTexture(320, 150, (g, w, h) => {
    g.fillStyle = hot ? "#ffb070" : isNull || dangling ? "#ffe3dc" : "#fff8ea"; g.strokeStyle = isNull || dangling ? "#b0140c" : "#2a1a08"; g.lineWidth = 8;
    g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 22); g.fill(); g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = isNull || dangling ? "#b0140c" : "#123a9c"; g.font = "bold 84px 'Courier Prime', monospace";
    g.fillText((isNull ? "NULL" : hex(next) + (dangling ? "✗" : "")), w / 2 + 12, h / 2 + 4, w - 60);
    g.beginPath(); g.moveTo(22, h / 2 - 16); g.lineTo(44, h / 2); g.lineTo(22, h / 2 + 16); g.fill();   // a small arrow: it points onward
  });
}
function makeNode(value, address) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PINK.clone(), roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a1a16, roughness: 0.9 });
  const Y = LEG + R, L = 1.35;                                        // body centre height, body (cylinder part) length
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(R, L, 8, 20), mat); body.rotation.z = Math.PI / 2; body.position.set(0.1, Y, 0); body.scale.set(1, 1, 0.92); body.castShadow = true; g.add(body);
  // the number, painted on the back: a strip of the body's own curve, a hair above it
  const brandMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false, depthWrite: false });
  const brand = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.015, R * 1.015, L + 0.5, 28, 1, true, Math.PI / 2 - 1.4, 1.9), brandMat);
  brand.rotation.z = Math.PI / 2; brand.position.set(0.1, Y, 0); brand.scale.set(1, 1, 0.92); brand.renderOrder = 2; g.add(brand);
  // head, snout, ears, eyes (looking left, along the rope)
  const headG = new THREE.Group(); headG.position.set(-1.0, Y + 0.12, 0); g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), mat); head.castShadow = true; headG.add(head);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 16), mat); snout.rotation.z = Math.PI / 2; snout.position.set(-0.48, -0.06, 0); headG.add(snout);
  for (const z of [-0.07, 0.07]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), dark); n.position.set(-0.585, -0.06, z); headG.add(n); }
  for (const z of [-0.22, 0.22]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), mat); ear.position.set(0.02, 0.44, z); ear.rotation.set(z > 0 ? 0.35 : -0.35, 0, -0.25); headG.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), dark); eye.position.set(-0.36, 0.14, z * 0.8); headG.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[0.75, 0.3], [0.75, -0.3], [-0.55, 0.3], [-0.55, -0.3]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, LEG + 0.1, 10), mat); leg.position.set(x, (LEG + 0.1) / 2, z); leg.castShadow = true; g.add(leg); legs.push(leg);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14, Math.PI * 1.7), mat); tail.position.set(1.38, Y + 0.2, 0); tail.rotation.y = Math.PI / 2; g.add(tail);
  // the tags: address in the ear (yellow, like a farm tag), next at the tail
  const ear = new THREE.SpriteMaterial({ map: earTagTexture(address), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
  const earTag = new THREE.Sprite(ear); earTag.scale.set(1.7, 0.85, 1); earTag.position.set(-0.85, 0.3, SD / 2 + 0.8); earTag.renderOrder = 12; g.add(earTag);
  const tl = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
  const tailTag = new THREE.Sprite(tl); tailTag.scale.set(1.8, 0.85, 1); tailTag.position.set(0.95, 0.3, SD / 2 + 0.8); tailTag.renderOrder = 12; g.add(tailTag);
  // the man's name, under his tags: painted (and repainted) with the plaque, so it follows the number on the pig
  const nameMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
  const nameSpr = new THREE.Sprite(nameMat); nameSpr.scale.set(3.2, 0.6, 1); nameSpr.position.set(0.05, 0.3, SD / 2 + 1.8); nameSpr.renderOrder = 12; nameSpr.visible = false; g.add(nameSpr);
  g.userData = { mat, legs, pigMesh: headG, top: brandMat, tail: tl, nameMat, nameSpr };
  return g;
}

// the next field's crate lid: a dot (it points somewhere) or NULL
const lidTex = {};
function lidTexture(isNull) {
  return (lidTex[isNull] ||= canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = "#3a2614"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c9a227"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = isNull ? "#cfc6cc" : "#f2c230"; g.textAlign = "center"; g.textBaseline = "middle";
    if (isNull) { g.font = "bold 34px 'Courier Prime', monospace"; g.fillText("NULL", w / 2, h / 2 + 2); }
    else { g.beginPath(); g.arc(w / 2, h / 2, 18, 0, Math.PI * 2); g.fill(); }
  }));
}
function bannerSprite(names, colors) {
  const w = 128 + names.join("").length * 30;
  return labelSprite((g, W, H) => {
    let x = 8; g.font = "bold 58px 'Courier Prime', monospace"; g.textBaseline = "middle";
    names.forEach((n, i) => {
      const tw = g.measureText(n).width + 30;
      g.fillStyle = colors[i]; g.beginPath(); g.roundRect(x, 8, tw, H - 40, 12); g.fill();
      g.fillStyle = "#120c06"; g.fillText(n, x + 15, 8 + (H - 40) / 2 + 2);
      x += tw + 10;
    });
    g.fillStyle = colors[0]; g.beginPath(); g.moveTo(W / 2 - 18, H - 32); g.lineTo(W / 2 + 18, H - 32); g.lineTo(W / 2, H - 4); g.fill();
  }, w, 120, 0.95);
}

// ---------- a pig that is a node: nose to the left (where the rope comes in), next-crate on its rump
const PINK = new THREE.Color(0xe7a39b), GREY = new THREE.Color(0x6d6460);
function makePig(value, address) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PINK.clone(), roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5a2f2a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.86), mat); body.position.y = 0.62; body.castShadow = true; g.add(body);
  // the node's box on its back
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.76), new THREE.MeshStandardMaterial({ map: backTexture(value, address), roughness: 0.9 }));
  back.rotation.x = -Math.PI / 2; back.position.set(0, 0.935, 0); g.add(back);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.52), mat); head.position.set(-0.8, 0.74, 0); head.castShadow = true; g.add(head);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.12, 12), mat); snout.rotation.z = Math.PI / 2; snout.position.set(-1.08, 0.68, 0); g.add(snout);
  for (const z of [-0.05, 0.05]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dark); n.position.set(-1.14, 0.68, z); g.add(n); }
  for (const z of [-0.16, 0.16]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), mat); ear.position.set(-0.74, 1.03, z); ear.rotation.z = 0.4; g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark); eye.position.set(-1.04, 0.84, z * 0.9); g.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[0.42, 0.26], [0.42, -0.26], [-0.42, 0.26], [-0.42, -0.26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.36, 0.17), mat); leg.position.set(x, 0.18, z); leg.castShadow = true; g.add(leg); legs.push(leg);
  }
  // the next field: a little crate on the rump, its lid a dot or NULL
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.48), new THREE.MeshStandardMaterial({ map: lidTexture(false), roughness: 0.9 }));
  lid.rotation.x = -Math.PI / 2; lid.rotation.z = Math.PI / 2; lid.position.set(0.86, 0.895, 0); g.add(lid);
  g.userData = { mat, legs, back, lid };
  g.scale.setScalar(1.18);              // a touch bigger, so the numbers read from above
  return g;
}
// a man again (the finale): a plain figure in a tunic
// a crewman, freed: rounded limbs, a flared tunic with a belt, hair and a beard. Each one a little different.
const MEN = [0, 0];
function makeMan() {
  const n = MEN[0]++;
  const g = new THREE.Group();
  const tunicC = [0x9a3a22, 0x2f4f7a, 0x6a5a2a, 0x7a2a4a, 0x3a6a4a][n % 5], hairC = [0x2a1a10, 0x4a2a14, 0x1a1410, 0x6a4a2a][n % 4];
  const skin = new THREE.MeshStandardMaterial({ color: [0xc89a78, 0xb07a58, 0xd8ad88, 0x9a6a4a][n % 4], roughness: 0.75 });
  const tunic = new THREE.MeshStandardMaterial({ color: tunicC, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: hairC, roughness: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  // legs and sandals
  for (const x of [-0.11, 0.11]) { add(new THREE.CapsuleGeometry(0.075, 0.5, 4, 8), skin, x, 0.36, 0); add(new THREE.BoxGeometry(0.13, 0.05, 0.24), leather, x, 0.025, 0.04); }
  // the tunic: wider at the hem, a belt at the waist
  const pts = [[0.0, 0.62], [0.30, 0.62], [0.25, 0.9], [0.22, 1.05], [0.27, 1.3], [0.29, 1.42], [0.12, 1.5], [0.0, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(pts, 14), tunic, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.235, 0.235, 0.07, 14), leather, 0, 1.0, 0);
  // arms, a little away from the body, hands
  for (const sx of [-1, 1]) { add(new THREE.CapsuleGeometry(0.065, 0.48, 4, 8), skin, sx * 0.34, 1.12, 0, 0, sx * 0.12); add(new THREE.SphereGeometry(0.075, 8, 6), skin, sx * 0.38, 0.8, 0); }
  // neck, head, hair, beard
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin, 0, 1.56, 0);
  add(new THREE.SphereGeometry(0.16, 14, 12), skin, 0, 1.74, 0).scale.set(0.95, 1.1, 1);
  add(new THREE.SphereGeometry(0.168, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.76, -0.015);
  add(new THREE.ConeGeometry(0.11, 0.2, 10), hair, 0, 1.6, 0.07, Math.PI, 0).scale.set(1, 1, 0.7);
  add(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0x120c08 }), -0.055, 1.77, 0.145);
  add(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0x120c08 }), 0.055, 1.77, 0.145);
  g.scale.setScalar(1.15);
  return g;
}

// ---------- the sty: draws frames
export class Sty {
  constructor(world, island, { headVar = "head", colorOf = () => "#5fd1e8" } = {}) {
    this.world = world; this.island = island; this.headVar = headVar; this.colorOf = colorOf;
    this.group = new THREE.Group(); world.scene.add(this.group);
    this.pigs = {};            // address -> { pig, value }
    this.ropes = {};           // address -> rope mesh (to its next)
    this.banners = {};         // "key:names" -> banner sprite
    this.tweens = [];
    this.headRope = null;
    this.layout = { at: {}, chain: { seen: [] } };
    world.add(this);
    // the rope floor: deep blue under both rows, a gold line round it. Nothing bright behind a node.
    const x0 = GATE.x + 0.9, x1 = X0 + 10 * SP, z0 = ROW0 - SD / 2 - 1.3, z1 = ROW1 + SD / 2 + 2.3;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color: 0x15245c, toneMapped: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); this.group.add(floor);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.3, z1 - z0 + 0.3), new THREE.MeshBasicMaterial({ color: 0xe0a800, toneMapped: false }));
    edge.rotation.x = -Math.PI / 2; edge.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); this.group.add(edge);
    // the pen: a low pale-stone curb all round; a gold rail on posts at the back and the far side.
    // The front and the gate side stay open, so nothing ever stands between the camera and a tag.
    const stone = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.6, roughness: 0.35 });
    const W = x1 - x0 + 0.9, D = z1 - z0 + 0.9, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (const [w, d, x, z] of [[W, 0.3, cx, z0 - 0.3], [W, 0.3, cx, z1 + 0.3], [0.3, D, x1 + 0.3, cz]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), stone); c.position.set(x, 0.1, z); c.receiveShadow = c.castShadow = true; this.group.add(c);
    }
    const RAIL_Y = 0.9;
    for (let x = x0 + 1.5; x <= x1 + 0.31; x += (x1 - x0 - 1.2) / 8) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, RAIL_Y, 8), stone); post.position.set(x, RAIL_Y / 2 + 0.1, z0 - 0.3); post.castShadow = true; this.group.add(post);
    }
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, x1 - x0 - 1.2, 8), gold); back.rotation.z = Math.PI / 2; back.position.set((x0 + 1.5 + x1 + 0.3) / 2, RAIL_Y + 0.1, z0 - 0.3); this.group.add(back);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, D - 0.6, 8), gold); side.rotation.x = Math.PI / 2; side.position.set(x1 + 0.3, RAIL_Y + 0.1, cz - 0.3); this.group.add(side);
    for (let z = z0 - 0.3; z < z1; z += (z1 - z0) / 3) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, RAIL_Y, 8), stone); post.position.set(x1 + 0.3, RAIL_Y / 2 + 0.1, z); this.group.add(post); }
    this._right = 0;
  }

  // where a node stands in the current frame
  spot(a) { const p = this.layout.at[a]; return p ? cell(p.c, p.r) : new THREE.Vector3(X0, 0, ROW1 + 2); }
  // where NULL is: right after the last pig of the rope from head
  nullSpot() { return cell(Math.max(0, this.layout.chain.seen.length) - 0.15, 0).add(new THREE.Vector3(0.6, 0, 0)); }
  // where a part of a pig is in the world (for Athena's flying values): its back (data), its next tag,
  // its address tag, the banner over it, its snout (where head's rope lands)
  anchor(a, part = "back") {
    const p = this.pigs[String(a)], base = p ? p.pig.position.clone().setY(0) : this.spot(String(a));
    const near = this.layout.at[String(a)] && this.layout.at[String(a)].r;
    const off = { back: [0.1, 1.55, 0], next: [0.95, 0.3, SD / 2 + 0.8], addr: [-0.85, 0.3, SD / 2 + 0.8], banner: near ? [SW / 2 + 1.3, 1.6, 0] : [0, 3.7, -SD / 2 - 0.6], snout: [-1.6, 1.05, 0] }[part] || [0, 1, 0];
    return base.add(new THREE.Vector3(...off));
  }
  nullAnchor() { return this.nullSpot().add(new THREE.Vector3(0, 1.2, 0)); }
  // every point the camera should keep in view
  points() {
    // A steady box, not the pigs themselves: the gate on the left, both rows, and on the right the
    // last slot in use (at least five) plus the NULL stone. The box only grows while a lesson runs,
    // so the camera holds still while pigs walk, ropes move and pointers jump.
    const cols = Object.values(this.layout.at).map(p => p.c), chain = this.layout.chain.seen.length;
    const right = Math.max(cell(Math.max(4, ...cols), 0).x + SW / 2 + 0.4, cell(Math.max(4, chain), 0).x + 1.0);   // the last pig, or the NULL stone after the rope
    const shrink = right < this._right - 2 * SP;                     // a new lesson with a shorter rope: start the box again
    if (right > this._right || shrink) this._right = right;
    const row1 = Object.values(this.layout.at).some(p => p.r);
    void row1;                                                         // both rows are always in the box: the camera never moves when a pig steps off the rope
    const zNear = ROW1 + SD / 2 + 2.3;                                // room for the tags and the names in front of the pigs
    return [new THREE.Vector3(GATE.x - 0.7, 0, ROW0 - SD / 2 - 1.0), new THREE.Vector3(GATE.x - 0.7, 0, zNear),
            new THREE.Vector3(this._right, 0, ROW0 - SD / 2 - 1.0), new THREE.Vector3(this._right, 0, zNear)];
  }

  // ---------- jump straight to a frame (stepping back, or setting a trial up)
  show(f) {
    for (const m of this.men || []) this.group.remove(m);      // a new picture: the men of an earlier finale go
    this.men = [];
    for (const p of Object.values(this.pigs)) p.pig.visible = true;
    this.frame = f; this.layout = layoutFrame(f, this.headVar);
    const live = new Set(f.order.filter(a => !f.nodes[a].freed).map(String));
    for (const a of Object.keys(this.pigs)) if (!live.has(a)) this._dropPig(a);
    for (const a of live) { const p = this._pig(a, f.nodes[a].data); p.pig.position.copy(this.spot(a)); p.pig.rotation.set(0, 0, 0); p.pig.userData.pigMesh.rotation.x = 0; }
    this._ropesAll();
    for (const p of Object.values(this.pigs)) p.pig.userData.pigMesh.rotation.y = (p.turn || 0) * 0.22;   // no turning animation on a jump
    this._banners();
    this._lostTint();
    this._placeNull(true);
    this.island.pitGlow.intensity = 0;
  }

  // ---------- animate one step into frame `after`
  async act(step, after, speed = 1) {
    const before = this.layout;
    this.frame = after; this.layout = layoutFrame(after, this.headVar);
    const a = String(step.index), dur = 0.85 / speed;
    switch (step.action) {
      case "NEW": {
        const p = this._pig(a, step.value); const s = this.spot(a);
        p.pig.position.set(s.x, 5, s.z);
        await this._tween(dur * 1.2, k => { p.pig.position.y = 5 * (1 - k) * (1 - k); });
        p.pig.position.y = 0; this._puff(s);
        break;
      }
      case "READ": {
        const p = this.pigs[a]; if (!p) break;
        this._rim(p, a, "#f2c230");
        await this._tween(dur, k => { p.pig.position.y = Math.sin(Math.PI * k) * 0.35; });
        break;
      }
      case "WRITE": {
        const p = this.pigs[a]; if (!p) break;
        p.value = step.value; this._rim(p, a, "#3fae5a");
        await this._tween(dur, k => { p.pig.userData.pigMesh.rotation.x = Math.sin(Math.PI * 2 * k) * 0.12; });
        p.pig.userData.pigMesh.rotation.x = 0; break;
      }
      case "LINK": {
        // the re-tied rope grows from the crate, then everyone walks to their new places
        if (this.pigs[a]) this.pigs[a].hot = true;
        this._ropesAll(a);
        const r = this.ropes[a];
        if (r) await this._tween(dur * 1.2, k => r.geometry.setDrawRange(0, Math.floor(r.userData.count * k)));
        if (r) r.geometry.setDrawRange(0, Infinity);
        if (this.pigs[a]) { this.pigs[a].hot = false; }
        this._lostTint();
        break;
      }
      case "FREE": {
        const p = this.pigs[a]; if (!p) break;
        const mats = [p.plaque.material]; p.pig.traverse(o => o.material && mats.push(o.material));
        mats.forEach(m => (m.transparent = true));
        await this._tween(dur * 1.4, k => { p.pig.position.y = k * 2; mats.forEach(m => (m.opacity = 1 - k)); });
        this._dropPig(a); break;
      }
      case "NULL_DEREF": this.island.pitGlow.intensity = 30; break;
    }
    await this._walk(before, dur);
    this._ropesAll(); this._lostTint();
    this._banners(step.action === "PTR" ? step.target : null, dur);
    this._placeNull(false, dur);
    if (step.action === "PTR") await this._tween(dur * 0.8, () => {});
    else if (step.action === "VAR" || step.action === "DROP") await this._tween(0.05, () => {});
    else if (step.action === "CALL" || step.action === "RETURN") await this._tween(dur * 0.9, () => {});
    else if (step.action === "PRINT") await this._tween(dur * 0.6, () => {});
  }

  // pigs whose place in the layout changed walk there (legs going), ropes hidden while they move
  async _walk(before, dur) {
    const moves = [];
    for (const [a, p] of Object.entries(this.pigs)) {
      const to = this.spot(a), from = p.pig.position.clone().setY(0);
      if (from.distanceTo(to) > 0.05) moves.push({ p, from, to });
    }
    if (!moves.length) return;
    for (const r of Object.values(this.ropes)) r.visible = false;
    if (this.headRope) this.headRope.visible = false;
    for (const b of Object.values(this.banners)) b.visible = false;
    await this._tween(dur * 1.3, k => {
      const e = k * k * (3 - 2 * k);
      for (const m of moves) {
        m.p.pig.position.lerpVectors(m.from, m.to, e);
        m.p.pig.userData.legs.forEach((l, j) => (l.rotation.z = Math.sin(k * 28 + j * 1.6) * 0.45 * (1 - k)));
      }
    });
    for (const m of moves) { m.p.pig.position.copy(m.to); m.p.pig.userData.legs.forEach(l => (l.rotation.z = 0)); }
  }

  // ---------- pieces
  _pig(a, value) {
    let p = this.pigs[a];
    if (!p) {
      const pig = makeNode(value, +a);
      this.group.add(pig);
      p = this.pigs[a] = { pig, value, plaque: { material: pig.userData.top }, rim: null, hot: false, key: "" };
      this._plaque(a);                                   // its card is painted the moment it exists (no blank back while it drops in)
    }
    if (p.value !== value) { p.value = value; this._rim(p, a, null); }
    return p;
  }
  _dropPig(a) { const p = this.pigs[a]; if (!p) return; this.group.remove(p.pig); p.plaque.material.map?.dispose(); delete this.pigs[a]; }
  // repaint the node box on its back and its plaque, with a coloured rim for a moment
  _rim(p, a, color) {
    p.rim = color; this._plaque(a);
    if (color) { const v = p.value; setTimeout(() => { if (this.pigs[a] === p && p.value === v) { p.rim = null; this._plaque(a); } }, 900); }
  }
  // redraw a plaque from the frame (only when something on it changed)
  _plaque(a) {
    const p = this.pigs[a], f = this.frame; if (!p || !f || !f.nodes[a]) return;
    const n = f.nodes[a], t = f.nodes[n.next];
    const st = { address: +a, data: p.value, next: n.next, rim: p.rim, hot: p.hot, dangling: n.next !== NULL && (!t || t.freed), lost: !!p.lost };
    const key = JSON.stringify(st);
    if (key === p.key) return;
    p.key = key;
    p.plaque.material.map?.dispose(); p.plaque.material.map = brandTexture(st); p.plaque.material.needsUpdate = true;
    const tm = p.pig.userData.tail; tm.map?.dispose(); tm.map = tailTagTexture(st); tm.needsUpdate = true;
    const nm = p.pig.userData.nameMat;
    const nmKey = crewName(st.data) + "|" + st.lost;
    if (nm && p.nameKey !== nmKey) {
      p.nameKey = nmKey; const name = crewName(st.data);
      nm.map?.dispose(); nm.map = name ? nameTexture(name, st.lost, SPIES.has(+st.data)) : null; nm.needsUpdate = true;
      p.pig.userData.nameSpr.visible = !!name;
    }
  }
  _plaques() { for (const a of Object.keys(this.pigs)) this._plaque(a); }

  // a rope across the ground, from one point to another, with an arrowhead at the far end.
  // bend > 0 swings it out sideways (towards the house), so ropes that go back never cross the row
  _rope(from, to, color = 0xffffff, radius = 0.1, bend = 0) {
    const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + 0.35 + Math.min(0.6, from.distanceTo(to) * 0.05); mid.z -= bend;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(curve, 36, radius, 8, false);
    // real rope: tan, with the twist painted on (unlit, so it reads the same in sun or shade);
    // a colour tints it: orange while it is being tied, red when it points at nothing
    const tex = ROPE_TEX.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, curve.getLength() * 2.2), 1);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color, toneMapped: false }));
    m.userData.count = geo.index.count;
    const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.4, radius * 6.5, 12), new THREE.MeshBasicMaterial({ color: color === 0xffffff ? 0x4a2a10 : color, toneMapped: false }));
    head.position.copy(curve.getPoint(0.96)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(0.96)); m.add(head);
    return m;
  }
  // which way a pig faces: its next-crate towards the pig it points at (it turns round when the rope is turned)
  _flipped(a) {
    const f = this.frame, n = f.nodes[a], me = this.layout.at[a], t = n && this.layout.at[n.next];
    return !!(me && t && n.next !== NULL && t.c < me.c);
  }
  _ropesAll(growing = null) {
    for (const r of Object.values(this.ropes)) this.group.remove(r);
    this.ropes = {};
    const f = this.frame; if (!f) return;
    for (const a of f.order) {
      const n = f.nodes[a], p = this.pigs[a]; if (n.freed || !p) continue;
      const flip = this._flipped(a), dir = flip ? -1 : 1;
      p.turn = flip ? Math.PI : 0;                             // update() turns it there smoothly
      const s = this.spot(a), start = new THREE.Vector3(s.x + SW / 2 + 0.02, (SH - 0.1), s.z + NEXT_Z);   // out of the slab's right edge, on the dot's line (never over the text)
      const isNull = n.next === NULL;
      if (isNull) continue;                                  // NULL: the next cell says so; no rope
      let to, bend = 0, color = 0x1a1208;
      if (f.nodes[n.next] && !f.nodes[n.next].freed && this.layout.at[n.next]) {
        const t = this.spot(n.next), same = Math.abs(t.z - s.z) < 0.1, side = t.x >= s.x ? 1 : -1;
        if (String(n.next) === String(a)) {                                       // it points at itself: a loop round its own back
          to = new THREE.Vector3(s.x - SW / 2 - 0.05, (SH - 0.1), s.z); bend = 2.2;
        } else if (same) {
          to = new THREE.Vector3(t.x - side * (SW / 2 + 0.05), (SH - 0.1), t.z);   // the near edge of the node it points at
          if (side < 0 || Math.abs(t.x - s.x) > SP * 1.5) bend = (s.z > 0 ? -1 : 1) * (1.6 + Math.abs(t.x - s.x) * 0.12);   // backwards or past others: swing round behind
        } else {
          to = new THREE.Vector3(t.x + (t.x > s.x + 0.1 ? -0.6 : t.x < s.x - 0.1 ? 0.6 : 0), (SH - 0.1), t.z + (s.z > t.z ? SD / 2 + 0.05 : -SD / 2 - 0.05));   // its near long edge
        }
      } else { to = start.clone().add(new THREE.Vector3(1.0, -0.2, 0.6)); color = 0xe0442a; }
      const r = this._rope(start, to, String(a) === String(growing) ? 0xffa040 : color === 0xe0442a ? 0xff5a4a : 0xffffff, 0.1, bend);
      this.group.add(r); this.ropes[a] = r;
      if (String(a) === String(growing)) r.geometry.setDrawRange(0, 0);
    }
    // the gate rope: head
    if (this.headRope) this.group.remove(this.headRope);
    const h = f.ptrs[this.headVar];
    const from = GATE.clone().add(new THREE.Vector3(0.3, 1.0, 0));
    let to;
    if (h === NULL || h == null || !f.nodes[h] || f.nodes[h].freed) to = this.nullSpot().add(new THREE.Vector3(-0.5, 0.4, 0));
    else { const t = this.spot(h); to = new THREE.Vector3(t.x - SW / 2 - 0.05, (SH - 0.1), t.z); }
    this.island.setHead?.(h === NULL || h == null ? "NULL" : hex(h));
    this.headRope = this._rope(from, to, 0xffffff, 0.12, Math.abs(to.z - from.z) < 0.1 && to.x > from.x + SP * 1.5 ? 0.9 : 0);
    this.group.add(this.headRope);
    this._plaques();
  }

  // the NULL stone sits right after the last pig of the rope
  _placeNull(snap, dur = 0.4) {
    const pit = this.island.pit, to = this.nullSpot();
    if (snap) { pit.position.copy(to); return; }
    const from = pit.position.clone();
    if (from.distanceTo(to) > 0.05) this._tween(dur, k => pit.position.lerpVectors(from, to, k));
  }

  // banners: one per pig (or the NULL stone) carrying every pointer that points there (head is the gate rope)
  _banners(moved = null, dur = 0.4) {
    const f = this.frame; if (!f) return;
    const at = new Map();
    for (const [nm, a] of Object.entries(f.ptrs)) {
      if (nm === this.headVar) continue;
      const key = a === NULL || !f.nodes[a] || f.nodes[a].freed ? "NULL" : String(a);
      if (!at.has(key)) at.set(key, []);
      at.get(key).push(nm);
    }
    const keep = new Set();
    for (const [key, names] of at) {
      const sig = key + ":" + names.join(",");
      keep.add(sig);
      const near = key !== "NULL" && this.layout.at[key] && this.layout.at[key].r;     // a pig on the near row: its banner sits to its right, clear of the row behind
      const target = key === "NULL" ? this.nullSpot().add(new THREE.Vector3(0, 2.2, -1.0)) : near ? this.spot(key).add(new THREE.Vector3(SW / 2 + 1.3, 1.6, 0)) : this.spot(key).add(new THREE.Vector3(0, 3.7, -SD / 2 - 0.6));   // above the pig's head, clear of its card
      if (this.banners[sig]) { this.banners[sig].visible = true; this.banners[sig].position.copy(target); continue; }
      const b = bannerSprite(names, names.map(n => this.colorOf(n)));
      const prev = Object.entries(this.banners).find(([s]) => moved && s.split(":")[1].split(",").includes(moved));
      b.position.copy(prev ? prev[1].position : target);
      this.group.add(b); this.banners[sig] = b;
      if (prev) { const p0 = b.position.clone(); this._tween(dur, k => b.position.lerpVectors(p0, target, k * k * (3 - 2 * k))); }
    }
    for (const [sig, b] of Object.entries(this.banners)) if (!keep.has(sig)) { this.group.remove(b); delete this.banners[sig]; }
  }

  // pigs nothing can reach turn grey: lost in the woods
  _lostTint() {
    const f = this.frame; if (!f) return;
    const lost = new Set(lostNodes(f).map(String));
    for (const [a, p] of Object.entries(this.pigs)) { p.lost = lost.has(a); p.pig.userData.mat.color.copy(p.lost ? GREY : PINK); }
    this._plaques();
  }

  _puff(at) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd9c8ff, transparent: true, opacity: 0.6 }));
    m.position.copy(at).setY(0.5); this.group.add(m);
    this._tween(0.6, k => { m.scale.setScalar(1 + k * 1.6); m.material.opacity = 0.6 * (1 - k); }).then(() => this.group.remove(m));
  }

  // the lost pigs wander off into the woods (a failed trial)
  async wanderOff(addresses) {
    const keys = addresses.map(String), ps = keys.filter(a => this.pigs[a]).map(a => this.pigs[a]);
    if (!ps.length) return;
    const from = ps.map(p => p.pig.position.clone());
    for (const [a, r] of Object.entries(this.ropes)) if (keys.includes(a)) r.visible = false;
    await this._tween(2.4, k => ps.forEach((p, i) => {
      p.turn = Math.PI * 0.5; p.pig.rotation.y = p.turn;   // nose to the woods behind the sty
      p.pig.position.copy(from[i]).add(new THREE.Vector3((i - ps.length / 2) * 0.6 * k, 0, -k * 10));
      p.pig.userData.legs.forEach((l, j) => (l.rotation.z = Math.sin(k * 40 + j * 1.6) * 0.5));
    }));
  }

  // the finale: every pig on the rope becomes a man again, in rope order. No puffs, no particles:
  // the pig settles and fades down while the man rises out of the same spot, in warm light
  async turnBack(comic, { onMan } = {}) {
    const f = this.frame, order = walkFrom(f, f.ptrs[this.headVar]).seen;
    if (this.headRope) this.group.remove(this.headRope);
    for (const b of Object.values(this.banners)) this.group.remove(b);
    this.banners = {};
    for (const [i, a] of order.entries()) {
      const p = this.pigs[a]; if (!p) continue;
      const s = this.spot(a);
      const man = makeMan(); man.position.set(s.x, -0.9, s.z); man.rotation.y = 0.25; man.scale.setScalar(1.15); this.group.add(man); (this.men ||= []).push(man);
      if (this.ropes[a]) this.group.remove(this.ropes[a]);
      if (onMan) onMan(i, order.length);
      const pig = p.pig, y0 = pig.position.y;
      await this._tween(0.7, k => {
        const e = k * k * (3 - 2 * k);
        pig.scale.setScalar(1 - 0.75 * e); pig.position.y = y0 - 0.5 * e;
        man.position.y = -0.9 + 0.9 * e;
      });
      pig.visible = false; pig.scale.setScalar(1); pig.position.y = y0;
    }
  }
  // the rest of the crew walks out of the palace: down the steps, round the ends of the banquet table,
  // and into rows on the marble in front of it. area = { x0, x1, z0, dz, tableX0, tableX1, foot }
  async walkOut(n, from, area) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z), SPEED = 3.4, GAP = 0.22;
    const men = [];
    for (let i = 0; i < n; i++) {
      const m = makeMan(); m.visible = false; this.group.add(m); (this.men ||= []).push(m);
      const col = i % 6, row = Math.floor(i / 6);
      const to = V(area.x0 + col * (area.x1 - area.x0) / 5 + (row % 2) * 0.5, 0, area.z0 + row * area.dz);
      const left = to.x < (area.tableX0 + area.tableX1) / 2, side = left ? area.tableX0 - 0.9 - (i % 3) * 0.4 : area.tableX1 + 0.9 + (i % 3) * 0.4;
      const pts = [V(from.x + (i % 3 - 1) * 0.5, from.y, from.z), V(from.x + (i % 3 - 1) * 0.5, 0, area.foot), V(side, 0, area.foot), V(side, 0, area.z0 - 0.4), to];
      const segs = []; let L = 0;
      for (let k = 1; k < pts.length; k++) { const d = pts[k].distanceTo(pts[k - 1]); segs.push({ a: pts[k - 1], b: pts[k], L0: L, d }); L += d; }
      men.push({ m, segs, L, delay: i * GAP });
    }
    const T = Math.max(...men.map(o => o.delay + o.L / SPEED));
    const tmp = new THREE.Vector3();
    await this._tween(T, k => {
      const t = k * T;
      for (const o of men) {
        const run = (t - o.delay) * SPEED; if (run <= 0) continue;
        o.m.visible = true;
        const d = Math.min(run, o.L), sg = o.segs.find(q => d <= q.L0 + q.d + 1e-6) || o.segs[o.segs.length - 1];
        const u = sg.d ? (d - sg.L0) / sg.d : 1;
        tmp.copy(sg.a).lerp(sg.b, u); o.m.position.copy(tmp);
        if (run < o.L) { o.m.position.y += Math.abs(Math.sin(run * 4.2)) * 0.06; o.m.rotation.y = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z); }
        else o.m.rotation.y += (0 - o.m.rotation.y) * 0.15;           // arrived: turn to face the camera
      }
    });
    for (const o of men) o.m.rotation.y = 0;
  }

  _tween(seconds, fn) { return new Promise(res => this.tweens.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res })); }
  update(dt) {
    // pigs turn towards the way their rope now runs; the number on the back stays upright
    for (const p of Object.values(this.pigs)) {
      const m = p.pig.userData.pigMesh, y = m.rotation.y, to = (p.turn || 0) * 0.22;
      if (Math.abs(to - y) > 0.001) m.rotation.y = Math.abs(to - y) < 0.02 ? to : y + (to - y) * Math.min(1, dt * 7);
    }
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
  }
  wait(s) { return this._tween(s, () => {}); }
  // hide (or show again) every label on the pigs: tags, names, banners (for a close-up in a film)
  labels(on) { this.group.traverse(o => { if (o.isSprite) { if (!on) { o.userData.wasVisible = o.visible; o.visible = false; } else if (o.userData.wasVisible !== undefined) { o.visible = o.userData.wasVisible; delete o.userData.wasVisible; } } }); }
}
