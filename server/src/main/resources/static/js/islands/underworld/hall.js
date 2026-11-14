// hall.js — "NOW SERVING": Hades runs the afterlife like a government office. The dead take a number
// and wait. Black and white like the House of Blue Leaves fight in Kill Bill; the grade drains every
// colour but red, so the only colour left is the neon sign, the velvet ropes and the ticket displays.
//   • a marble waiting hall that goes on forever: columns stamped with numbers, fluorescent tubes that
//     flicker, a meander frieze, signs (TAKE A NUMBER · SERVED IN ORDER OF ARRIVAL · NO EXCEPTIONS),
//     queue posts with red velvet ropes, a ticket machine, the clerk's counter and the ferry turnstile;
//   • the queue's array in one of two fittings:
//       row  — a straight bench of numbered seats [0] [1] ... (the linear queue, and the priority queue)
//       ring — a baggage-claim carousel with numbered places round it (the circular queue, the deque):
//              after the last place comes place [0];
//   • the dead sit in their seats with their ticket number over them; FRONT and REAR hang over theirs.
//     Served: the soul walks to the counter, the red NOW SERVING sign turns to its number, and it goes
//     through the turnstile. A seat the queue has left keeps its old ticket: dequeue rubs nothing out.
// The hall draws FRAMES (queueBoard.js builds them): show(frame) jumps, act(step, frame) animates.
import { sound } from "../../engine/sound.js";
import * as THREE from "three";
import { liveCells, shade, FRONT_COLOR, REAR_COLOR } from "../../learn/queueBoard.js";

const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif", MONO = "'Courier Prime', 'Courier New', monospace";
const RED = 0xd7261e;
const RING_R = 4.6, ROW_GAP = 2.3;
export const COUNTER = new THREE.Vector3(0, 0, -8.2);
const ENTRANCE = new THREE.Vector3(9.5, 0, 7.5);

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function sprite(tex, h, order = 10) {
  const img = tex.image, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  s.scale.set(h * img.width / img.height, h, 1); s.renderOrder = order;
  return s;
}
function sign(w, h, draw, width) {
  const t = canvasTexture(w, h, draw);
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width * h / w), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
}
const rnd = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// ---------- the hall
export function buildHall(world) {
  const scene = world.scene;
  scene.background = new THREE.Color(0x141416);
  scene.fog = new THREE.Fog(0x18181a, 30, 80);

  // terrazzo floor: big pale and dark slabs, worn paths where the dead shuffle
  const floorTex = canvasTexture(1024, 1024, (g, w, h) => {
    const n = 8, u = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = (i + j) % 2 ? 150 + rnd() * 18 : 92 + rnd() * 14; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(i * u, j * u, u, u);
      for (let k = 0; k < 90; k++) { const c = v + (rnd() - 0.5) * 60; g.fillStyle = `rgba(${c},${c},${c},0.5)`; g.fillRect(i * u + rnd() * u, j * u + rnd() * u, 2, 2); }
    }
    g.strokeStyle = "rgba(20,20,22,0.7)"; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * u, 0); g.lineTo(i * u, h); g.stroke(); g.beginPath(); g.moveTo(0, i * u); g.lineTo(w, i * u); g.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(9, 9);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // columns, two rows going back into the dark, each stamped with a number like everything here
  const marble = new THREE.MeshStandardMaterial({ color: 0xbdbcb8, roughness: 0.5 });
  const colNum = n => canvasTexture(128, 64, (g, w, h) => { g.fillStyle = "#1a1a1c"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e8e8"; g.font = `bold 40px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`C-${String(n).padStart(2, "0")}`, w / 2, h / 2); });
  let cn = 1;
  for (const x of [-13, 13]) for (let z = 10; z >= -34; z -= 7) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 13, 20), marble); c.position.set(x, 6.5, z); c.castShadow = true; c.receiveShadow = true; scene.add(c);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 2.1), marble); base.position.set(x, 0.25, z); scene.add(base);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: colNum(cn++) })); plate.position.set(x + (x < 0 ? 0.87 : -0.87), 2.6, z); plate.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(plate);
  }
  // the back wall with a meander frieze, the counter, the sign
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, roughness: 0.9 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 16, 1), wallMat); wall.position.set(0, 8, -12.5); wall.receiveShadow = true; scene.add(wall);
  const frieze = sign(1024, 64, (g, w, h) => { g.fillStyle = "#151517"; g.fillRect(0, 0, w, h); g.strokeStyle = "#cfcfd2"; g.lineWidth = 6; g.beginPath(); for (let x = 0; x < w; x += 64) { g.moveTo(x + 6, 52); g.lineTo(x + 6, 12); g.lineTo(x + 46, 12); g.lineTo(x + 46, 40); g.lineTo(x + 22, 40); g.lineTo(x + 22, 28); g.lineTo(x + 32, 28); } g.stroke(); }, 60);
  frieze.position.set(0, 12.2, -11.95); scene.add(frieze);

  // the counter: a long dark desk, a clerk behind glass, the ferry turnstile beside it
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 1.2), dark); desk.position.set(COUNTER.x, 0.6, COUNTER.z - 1.4); desk.castShadow = true; scene.add(desk);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.4), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.25, roughness: 0.05 })); glass.position.set(COUNTER.x, 1.9, COUNTER.z - 0.85); scene.add(glass);
  const clerk = new THREE.Group(); clerk.position.set(COUNTER.x, 0, COUNTER.z - 2.4); scene.add(clerk);
  const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 10), dark); cb.position.y = 1.5; clerk.add(cb);
  const ch = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), dark); ch.position.y = 2.35; clerk.add(ch);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), dark); visor.position.set(0, 2.5, 0.08); clerk.add(visor);
  const turn = new THREE.Group(); turn.position.set(COUNTER.x + 5.2, 0, COUNTER.z - 0.6); scene.add(turn);
  const steel = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 0.9, roughness: 0.3 });
  const tpost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 10), steel); tpost.position.y = 0.55; turn.add(tpost);
  const arms = new THREE.Group(); arms.position.y = 0.9; turn.add(arms);
  for (let k = 0; k < 3; k++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), steel); a.rotation.z = Math.PI / 2; a.position.x = 0.5; const p = new THREE.Group(); p.rotation.y = k * Math.PI * 2 / 3; p.add(a); arms.add(p); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ color: 0x000000 })); door.position.set(COUNTER.x + 5.2, 2, -11.9); scene.add(door);
  const ferry = sign(512, 128, (g, w, h) => { g.fillStyle = "#0a0a0b"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e8e8"; g.font = `bold 64px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("FERRY  ▶", w / 2, h / 2); }, 2.6);
  ferry.position.set(COUNTER.x + 5.2, 4.4, -11.9); scene.add(ferry);

  // NOW SERVING: red neon, the one sign that matters. setServing(n) changes the number.
  const nsCanvas = document.createElement("canvas"); nsCanvas.width = 1024; nsCanvas.height = 384;
  const nsTex = new THREE.CanvasTexture(nsCanvas); nsTex.colorSpace = THREE.SRGBColorSpace;
  function paintServing(n, flash = 0) {
    const g = nsCanvas.getContext("2d"), w = 1024, h = 384;
    g.fillStyle = "#050505"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ff2a1e"; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#ff2a1e"; g.shadowBlur = 24 + flash * 30;
    g.fillStyle = "#ff3b30"; g.font = `bold 78px ${MONO}`; g.fillText("NOW SERVING", w / 2, 96);
    g.font = `200px ${DISPLAY}`; g.fillText(n == null ? "--" : String(n).padStart(2, "0"), w / 2, 258);
    g.shadowBlur = 0; nsTex.needsUpdate = true;
  }
  paintServing(null);
  const ns = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), new THREE.MeshBasicMaterial({ map: nsTex, toneMapped: false })); ns.position.set(COUNTER.x, 7.4, -11.95); scene.add(ns);
  const nsSmall = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.0, 0.12), [dark, dark, dark, dark, new THREE.MeshBasicMaterial({ map: nsTex, toneMapped: false }), dark]);
  nsSmall.position.set(0, 2.9, 0); scene.add(nsSmall);
  const nsPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), steel); nsPost.position.set(0, 1.2, -0.05); scene.add(nsPost);
  const nsGlow = new THREE.PointLight(0xff2a1e, 6, 14, 1.6); nsGlow.position.set(COUNTER.x, 7.4, -10.6); scene.add(nsGlow);

  // the house rules, in the plain type of a government office
  const rule = (txt, x, y, z, ry, width) => { const m = sign(1024, 160, (g, w, h) => { g.fillStyle = "#e9e8e4"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = `bold 60px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2, w - 40); }, width); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); };
  rule("SERVED IN ORDER OF ARRIVAL", -9.5, 7.6, -11.9, 0, 5.4);
  rule("NO EXCEPTIONS · NO PUSHING IN", 11.5, 7.6, -11.9, 0, 5.4);
  rule("TAKE A NUMBER", 9.5, 3.6, 10.6, Math.PI, 3.4);
  // a clock with no hands: nobody here is in a hurry
  const clock = sign(256, 256, (g, w, h) => { g.fillStyle = "#e9e8e4"; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 10; g.stroke(); g.fillStyle = "#111"; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillRect(w / 2 + Math.cos(a) * 96 - 5, h / 2 + Math.sin(a) * 96 - 5, 10, 10); } }, 1.6);
  clock.position.set(-9.5, 10.2, -11.95); scene.add(clock);

  // the ticket machine at the entrance (a red display: the only other colour in the room)
  const machine = new THREE.Group(); machine.position.copy(ENTRANCE).add(new THREE.Vector3(0.6, 0, 1.4)); scene.add(machine);
  const mb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.7), dark); mb.position.y = 0.8; mb.castShadow = true; machine.add(mb);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), new THREE.MeshBasicMaterial({ color: RED, toneMapped: false })); disp.position.set(0, 1.3, -0.36); disp.rotation.y = Math.PI; machine.add(disp);
  const tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff })); tick.position.set(0, 1.0, -0.42); machine.add(tick);

  // queue posts with red velvet ropes, zig-zagging to nowhere along both sides
  const ropeMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.7 });
  const postAt = [];
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) postAt.push(new THREE.Vector3(side * (8.4 + (k % 2) * 1.6), 0, 6 - k * 3.2));
  for (let k = 0; k < postAt.length; k++) {
    const p = postAt[k];
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), steel); post.position.set(p.x, 0.5, p.z); post.castShadow = true; scene.add(post);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12), steel); foot.position.set(p.x, 0.03, p.z); scene.add(foot);
    const q = postAt[k + 1]; if (!q || k === 5) continue;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(p.x, 0.95, p.z), new THREE.Vector3((p.x + q.x) / 2, 0.6, (p.z + q.z) / 2), new THREE.Vector3(q.x, 0.95, q.z));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.04, 6, false), ropeMat));
  }
  // benches along the walls, a few of the long-dead asleep on them
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.8 });
  for (const x of [-11, 11]) for (const z of [4, -4, -11]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 4), benchMat); b.position.set(x, 0.45, z); b.castShadow = true; scene.add(b);
    if (rnd() < 0.6) { const s = makeShade(false, 0.45); s.position.set(x, 0.45, z + (rnd() - 0.5) * 2); s.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; s.scale.setScalar(0.95); scene.add(s); }
  }

  // light: fluorescent tubes in rows overhead (some flicker), a cold fill, and the neon
  scene.add(new THREE.HemisphereLight(0xe8ecf2, 0x4a4a4e, 1.25));
  const tubes = [], tubeMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (let z = 8; z >= -10; z -= 4.5) for (const x of [-5, 0, 5]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.22), tubeMat()); t.rotation.x = Math.PI / 2; t.position.set(x, 12, z); scene.add(t); tubes.push(t); }
  const top = new THREE.SpotLight(0xf2f4f8, 420, 50, 0.75, 0.5, 1.5); top.position.set(0, 16, 4); top.target.position.set(0, 0, -1); top.castShadow = true;
  top.shadow.mapSize.set(2048, 2048); top.shadow.bias = -0.0005; scene.add(top, top.target);
  const front = new THREE.DirectionalLight(0xe8eaf0, 0.9); front.position.set(3, 10, 20); scene.add(front);

  // the fittings: the bench row or the carousel (built by setFitting)
  const fitting = new THREE.Group(); scene.add(fitting);
  function setFitting(shape, n) {
    fitting.clear();
    nsSmall.position.set(0, shape === "ring" ? 2.9 : 3.1, shape === "ring" ? 0 : -1.9); nsPost.position.set(0, shape === "ring" ? 1.2 : 1.3, nsSmall.position.z - 0.05);
    if (shape === "ring") {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(RING_R + 1.1, RING_R + 1.25, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 0.6, roughness: 0.4 })); plat.position.y = 0.25; plat.receiveShadow = true; fitting.add(plat);
      const beltTex = canvasTexture(1024, 64, (g, w, h) => { g.fillStyle = "#18181a"; g.fillRect(0, 0, w, h); g.fillStyle = "#2c2c30"; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); g.fillStyle = "#bdbdc2"; for (let x = 16; x < w; x += 128) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 26, 32); g.lineTo(x, 46); g.fill(); } });
      beltTex.wrapS = THREE.RepeatWrapping; beltTex.repeat.set(4, 1);
      const belt = new THREE.Mesh(new THREE.RingGeometry(RING_R - 0.9, RING_R + 0.9, 96, 1), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 })); belt.rotation.x = -Math.PI / 2; belt.position.y = 0.51;
      // the arrows on the belt run clockwise seen from above: the way the places are numbered
      const uv = belt.geometry.attributes.uv, pos = belt.geometry.attributes.position;
      for (let k = 0; k < uv.count; k++) { const x = pos.getX(k), y = pos.getY(k), r = Math.hypot(x, y), a = Math.atan2(y, x); uv.setXY(k, 1 - ((a + Math.PI) / (Math.PI * 2)), (r - (RING_R - 0.9)) / 1.8); }
      fitting.add(belt);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.2, 32), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.7, roughness: 0.35 })); hub.position.y = 0.6; fitting.add(hub);
      const hs = sign(512, 192, (g, w, h) => { g.fillStyle = "#e9e8e4"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = `bold 58px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CAROUSEL 4", w / 2, 64); g.font = `bold 40px ${MONO}`; g.fillText(`${n} PLACES · ROUND`, w / 2, 140); }, 2.4);
      hs.position.set(0, 0.75, 1.62); hs.scale.setScalar(0.7); fitting.add(hs);
    } else {
      const len = (n - 1) * ROW_GAP + 2.2;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 1.2), benchMat); bench.position.set(0, 0.45, 0); bench.castShadow = true; bench.receiveShadow = true; fitting.add(bench);
      const back = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 0.15), benchMat); back.position.set(0, 1.0, -0.6); fitting.add(back);
      for (const x of [-len / 2 + 0.2, len / 2 - 0.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.45, 1.1), steel); leg.position.set(x, 0.22, 0); fitting.add(leg); }
      // a painted arrow on the floor: this bench only goes one way
      const arrow = sign(1024, 128, (g, w, h) => { g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, w, h); g.fillStyle = "#e9e8e4"; g.fillRect(40, 54, w - 160, 20); g.beginPath(); g.moveTo(w - 140, 24); g.lineTo(w - 40, 64); g.lineTo(w - 140, 104); g.fill(); }, len);
      arrow.material.transparent = true; arrow.rotation.x = -Math.PI / 2; arrow.position.set(0, 0.02, 2.4); fitting.add(arrow);
      const end = sign(512, 160, (g, w, h) => { g.fillStyle = "#e9e8e4"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = `bold 50px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("END OF BENCH", w / 2, 56); g.font = `bold 34px ${MONO}`; g.fillText("NO WAY ROUND", w / 2, 116); }, 1.8);
      end.position.set(len / 2 + 1.0, 1.4, 0); end.rotation.y = -Math.PI / 4; fitting.add(end);
    }
  }

  let flash = 0;
  world.add({ update: (dt, t) => {
    tubes.forEach((tb, i) => { const off = (i === 4 || i === 11) && Math.sin(t * 13 + i) > 0.6 && Math.sin(t * 3.1 + i) > 0.2; tb.material.color.setScalar(off ? 0.25 : 1); });
    arms.rotation.y += dt * 0.15;
    if (flash > 0) { flash = Math.max(0, flash - dt * 1.5); nsGlow.intensity = 6 + flash * 10; }
  } });
  return {
    setFitting, COUNTER,
    setServing: n => { paintServing(n, 1); flash = 1; },
    clearServing: () => paintServing(null),
    turnstile: turn.position.clone()
  };
}

// ---------- a soul: a pale robed figure, half see-through, lit from inside
function makeShade(tiresias = false, opacity = 0.85) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe4e6ec, emissive: 0x5a5e68, emissiveIntensity: 0.7, roughness: 0.6, transparent: true, opacity, depthWrite: true });
  const pts = [[0.0, 0.0], [0.4, 0.0], [0.34, 0.5], [0.25, 1.1], [0.21, 1.35], [0.26, 1.5], [0.12, 1.62], [0.0, 1.62]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 14), mat));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat); head.position.y = 1.8; g.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat); hood.position.set(0, 1.83, -0.03); g.add(hood);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 3, 6), mat); arm.position.set(sx * 0.28, 1.15, 0.12); arm.rotation.x = -0.5; g.add(arm); }
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); ticket.position.set(0, 1.0, 0.42); ticket.rotation.x = -0.4; g.add(ticket);
  if (tiresias) { const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), mat); staff.position.set(0.45, 1.1, 0.1); g.add(staff); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.mat = mat;
  return g;
}
export { makeShade };

// the label over a soul: its ticket number big, its name under it
function soulTexture(v) {
  return canvasTexture(300, 140, (g, w, h) => {
    g.fillStyle = "#f2f2f0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#0a0a0b"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#0a0a0b"; g.font = `80px ${DISPLAY}`; g.fillText(String(v), w / 2, 60, w - 20);
    g.font = `bold 26px ${MONO}`; g.fillText(shade(v).toUpperCase(), w / 2, 112, w - 20);
  });
}
// the plaque at a seat: [i], and the ticket written there (in the queue, or left behind)
function seatTexture(i, v, state, rim = null, label = "served") {
  return canvasTexture(240, 200, (g, w, h) => {
    const live = state === "live";
    g.fillStyle = live ? "#f2f2f4" : "#1a1a1c"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#0a0a0b"; g.fillRect(0, 0, w, 62);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#ffffff"; g.font = `bold 46px ${MONO}`; g.fillText(`[${i}]`, w / 2, 33);
    if (v == null) { g.fillStyle = "#55555a"; g.font = `bold 38px ${MONO}`; g.fillText("empty", w / 2, 134); }
    else {
      g.fillStyle = live ? "#0a0a0b" : "#6a6a70"; g.font = `92px ${DISPLAY}`; g.fillText(String(v), w / 2, 132, w - 20);
      if (!live) { g.strokeStyle = "#8a8a90"; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 132); g.lineTo(w - 40, 132); g.stroke(); g.fillStyle = "#8a8a90"; g.font = `bold 22px ${MONO}`; g.fillText(label, w / 2, 184); }
    }
    g.strokeStyle = rim || "#0a0a0b"; g.lineWidth = rim ? 18 : 6; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  });
}
function markerTexture(names) {
  return canvasTexture(150 * names.length + 20, 92, (g) => {
    names.forEach(([n, c], k) => {
      const x = 10 + k * 150;
      g.fillStyle = c; g.fillRect(x, 6, 140, 56);
      g.fillStyle = "#0a0a0b"; g.font = `bold ${n.length > 5 ? 28 : 36}px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n.toUpperCase(), x + 70, 36);
      g.beginPath(); g.moveTo(x + 52, 62); g.lineTo(x + 88, 62); g.lineTo(x + 70, 88); g.closePath(); g.fill();
    });
  });
}

export class Hall {
  constructor(world, hall) {
    this.world = world; this.hall = hall;
    this.group = new THREE.Group(); world.scene.add(this.group);
    this.seats = [];          // { plaque, key }
    this.souls = {};          // seat i -> { fig, label, v }
    this.markers = [];
    this.tweens = [];
    this.n = 0; this.shape = "";
    this.pending = new Set();   // seats a pointer just moved onto: their real ticket is written next
    world.add(this);
  }

  // where seat i is, and where its soul stands
  seat(i) {
    if (this.shape === "ring") { const a = Math.PI + (i / this.n) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * RING_R, 0.5, -Math.sin(a) * RING_R); }
    return new THREE.Vector3((i - (this.n - 1) / 2) * ROW_GAP, 0.65, 0.15);
  }
  plaqueAt(i) {
    if (this.shape === "ring") { const p = this.seat(i); return new THREE.Vector3(p.x, 0.9, p.z + 1.45); }
    return new THREE.Vector3((i - (this.n - 1) / 2) * ROW_GAP, 0.55, 1.55);
  }
  points() {
    const pts = [];
    for (let i = 0; i < this.n; i++) { const p = this.plaqueAt(i), s = this.seat(i); pts.push(p.clone().setY(0), s.clone().setY(3.7), s.clone().setX(s.x - 1.1).setY(3.0), s.clone().setX(s.x + 1.1).setY(3.0)); }
    pts.push(new THREE.Vector3(0, 3.5, this.shape === "ring" ? 0 : -1.9));        // the NOW SERVING display
    return pts;
  }

  _fit(shape, n) {
    if (shape === this.shape && n === this.n) return;
    for (const s of this.seats) { this.group.remove(s.plaque); s.plaque.material.map?.dispose(); }
    for (const k of Object.keys(this.souls)) this._drop(k);
    this.seats = []; this.shape = shape; this.n = n;
    this.hall.setFitting(shape === "ring" ? "ring" : "row", n);
    for (let i = 0; i < n; i++) {
      const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false, fog: false }));
      plaque.scale.set(1.1 * 240 / 200, 1.1, 1); plaque.renderOrder = 8; plaque.position.copy(this.plaqueAt(i)); this.group.add(plaque);
      this.seats.push({ plaque, key: "" });
    }
  }
  _plaque(i, rim = null) {
    const f = this.frame, s = this.seats[i]; if (!s) return;
    const v = f.cells[i], state = v == null ? "empty" : liveCells(f).has(i) ? "live" : "stale";
    const label = "not in queue";
    const key = `${v}|${state}|${rim}|${label}`; if (key === s.key) return;
    s.key = key; s.plaque.material.map?.dispose(); s.plaque.material.map = seatTexture(i, v, state, rim, label); s.plaque.material.needsUpdate = true;
  }
  _soul(i, v) {
    let s = this.souls[i];
    if (s && s.v === v) return s;
    if (s) this._drop(i);
    const fig = makeShade(v === 99), label = sprite(soulTexture(v), 0.9, 9);
    this._place(fig, label, this.seat(i));
    this.group.add(fig, label);
    return (this.souls[i] = { fig, label, v });
  }
  _place(fig, label, p) {
    fig.position.copy(p);
    if (this.shape === "ring") fig.lookAt(0, p.y, 0); else fig.rotation.set(0, 0, 0);
    label.position.set(p.x, p.y + 2.15, p.z);
  }
  _drop(i) { const s = this.souls[i]; if (!s) return; this.group.remove(s.fig, s.label); s.label.material.map?.dispose(); delete this.souls[i]; }
  _markers() {
    for (const m of this.markers) { this.group.remove(m); m.material.map?.dispose(); }
    this.markers = [];
    const f = this.frame, live = liveCells(f);
    if (!live.size) return;
    const tags = new Map(), put = (i, n, c) => { if (i < 0 || i >= f.cap) return; if (!tags.has(i)) tags.set(i, []); tags.get(i).push([n, c]); };
    if (f.shape === "pq") put(0, "pq[0]", FRONT_COLOR);
    else { put(f.front, "front", FRONT_COLOR); put(f.rear, "rear", REAR_COLOR); }
    for (const [i, names] of tags) { const s = sprite(markerTexture(names), 0.6, 11); const p = this.seat(i); s.position.set(p.x, p.y + 3.3, p.z); this.group.add(s); this.markers.push(s); }
  }

  // ---------- jump straight to a frame
  show(f, { keepPending = false } = {}) {
    if (!keepPending) this.pending.clear();
    if (!keepPending && this.outside) { for (const o of Object.values(this.outside)) this.group.remove(o.fig, o.label); this.outside = {}; }
    this.frame = f; this._fit(f.shape, f.cap);
    const live = liveCells(f);
    for (let i = 0; i < f.cap; i++) {
      if (live.has(i) && f.cells[i] != null && !this.pending.has(i)) { const s = this._soul(i, f.cells[i]); s.fig.userData.mat.opacity = 0.85; s.label.material.opacity = 1; s.fig.scale.set(1, 1, 1); this._place(s.fig, s.label, this.seat(i)); }
      else this._drop(i);
      this._plaque(i);
    }
    this._markers();
  }

  // ---------- animate one step: whatever changed between the two frames walks, leaves or arrives
  async act(step, after, speed = 1, next = null) {
    const before = this.frame, dur = 0.9 / speed;
    sound.op({ ENQUEUE: "ticket", DEQUEUE: "bell", FULL: "buzz", EMPTY: "buzz" }[step.action] || null);   // the office's own sounds
    if (!before || after.cap !== this.n || after.shape !== this.shape) { this.show(after); await this.wait(0.2 / speed); return; }
    this.frame = after;
    const L0 = liveCells(before), L1 = liveCells(after), hl = after.hl;
    const ptrMove = step.action === "VAR";
    if (!ptrMove) this.pending.clear();
    if (hl && hl.i >= 0) this._plaque(hl.i, hl.kind === "out" ? "#d7261e" : hl.kind === "read" ? "#f4f2ee" : hl.kind === "in" ? "#b9e3c4" : null);
    const jobs = [];
    let anything = false;
    for (let i = 0; i < after.cap; i++) {
      const v0 = L0.has(i) ? before.cells[i] : null, v1 = L1.has(i) ? after.cells[i] : null;
      if (v0 === v1) continue;
      anything = true;
      const s = v0 != null ? this.souls[i] : null;
      if (s) {
        delete this.souls[i];
        const elsewhere = [...L1].some(j => j !== i && after.cells[j] === v0);
        if (elsewhere) jobs.push(this._vanish(s, dur * 0.5));                          // only a copy: he sits on another seat now
        else if (next && next.action === "ENQUEUE" && next.value === v0) jobs.push(this._stepOut(s, v0, dur));   // round to the back of the queue
        else if (after.cells[i] === v0 && (after.shape === "pq" || this._leftFrom(i, before, after))) jobs.push(this._serve(s, v0, dur));   // left from an end: served
        else if (after.cells[i] === v0) jobs.push(this._vanish(s, dur));               // front/rear jumped past him: he is just not in the queue any more
        else if (after.shape === "pq") jobs.push(this._serve(s, v0, dur));             // deleteMin: his seat is closed up behind him
        else jobs.push(this._overwrite(s, dur));                                       // written over while waiting
      }
      if (v1 != null && ptrMove && after.cells[i] === before.cells[i]) { this.pending.add(i); continue; }   // front/rear moved first: the value comes next
      if (v1 != null) {
        const from = [...L0].find(j => j !== i && before.cells[j] === v1), out = this.outside && this.outside[v1];
        if (out) { delete this.outside[v1]; this.group.remove(out.fig, out.label); jobs.push(this._arrive(i, v1, out.fig.position.clone(), dur * 1.4, true)); }
        else jobs.push(this._arrive(i, v1, from != null ? this.seat(from) : ENTRANCE, dur, from != null));
      }
    }
    if (/^(FULL|OVERFLOW|EMPTY|UNDERFLOW|OUT_OF_BOUNDS)$/.test(step.action)) { anything = true; jobs.push(this._alarm(dur)); }
    if (step.action === "PEEK" || (step.action === "READ" && hl)) { const s = this.souls[step.index]; if (s) { anything = true; jobs.push(this._tween(dur, k => { s.fig.position.y = this.seat(step.index).y + Math.sin(Math.PI * k) * 0.35; })); } }
    await Promise.all(jobs);
    if (!anything) await this.wait(/^(VAR|DROP|CALL|RETURN)$/.test(step.action) ? 0.18 / speed : dur * 0.45);
    this.show(after, { keepPending: true });
  }
  async _serve(s, v, dur) {
    const from = s.fig.position.clone(), to = COUNTER.clone().setY(0);
    await this._tween(dur * 1.6, k => { s.fig.position.lerpVectors(from, to, k); s.fig.lookAt(to.x, s.fig.position.y, to.z - 1); s.label.position.set(s.fig.position.x, s.fig.position.y + 2.15, s.fig.position.z); });
    this.hall.setServing(v);
    const ts = this.hall.turnstile, at = s.fig.position.clone();
    await this._tween(dur * 1.2, k => { s.fig.position.lerpVectors(at, ts, k); s.fig.userData.mat.opacity = 0.85 * (1 - k); s.label.material.opacity = 1 - k; s.label.position.set(s.fig.position.x, s.fig.position.y + 2.15, s.fig.position.z); });
    this.group.remove(s.fig, s.label);
  }
  async _overwrite(s, dur) {
    s.fig.userData.mat.color.setHex(0xd7261e); s.fig.userData.mat.emissive.setHex(0x8a0a06);
    await this._tween(dur * 1.2, k => { s.fig.scale.setScalar(1 + k * 0.4); s.fig.userData.mat.opacity = 0.85 * (1 - k); s.label.material.opacity = 1 - k; });
    this.group.remove(s.fig, s.label);
  }
  // served from the front (front moved on) or from the rear (rear stepped back: a deque's deleteRear)
  _leftFrom(i, b, a) {
    if (i === b.front && a.front !== b.front) return true;
    return i === b.rear && (a.rear === -1 || a.rear === (b.rear - 1 + b.cap) % b.cap);
  }
  // he steps off the carousel to the outside and waits there for his enqueue
  async _stepOut(s, v, dur) {
    (this.outside ||= {})[v] = s;
    const from = s.fig.position.clone(), to = from.clone().setY(0).multiplyScalar(this.shape === "ring" ? 1.45 : 1).add(this.shape === "ring" ? new THREE.Vector3() : new THREE.Vector3(0, 0, 2.2));
    await this._tween(dur, k => { s.fig.position.lerpVectors(from, to, k); s.label.position.set(s.fig.position.x, s.fig.position.y + 2.15, s.fig.position.z); });
  }
  async _vanish(s, dur) {
    await this._tween(dur, k => { s.fig.userData.mat.opacity = 0.85 * (1 - k); s.label.material.opacity = 1 - k; });
    this.group.remove(s.fig, s.label);
  }
  async _arrive(i, v, from, dur, slide) {
    const s = this._soul(i, v), end = this.seat(i), start = from.clone();
    s.fig.position.copy(start); s.fig.userData.mat.opacity = slide ? 0.85 : 0;
    await this._tween(dur * (slide ? 0.9 : 1.6), k => { s.fig.position.lerpVectors(start, end, k); if (!slide) s.fig.userData.mat.opacity = 0.85 * Math.min(1, k * 1.5); s.label.position.set(s.fig.position.x, s.fig.position.y + 2.15, s.fig.position.z); });
    this._place(s.fig, s.label, end);
  }
  async _alarm(dur) {
    for (let k = 0; k < this.n; k++) this._plaque(k, "#d7261e");
    await this.wait(dur * 1.2);
    for (let k = 0; k < this.n; k++) this._plaque(k);
  }

  // the finale: the hall empties, the sign goes dark, and Tiresias walks out of the ferry door
  async prophecy() {
    const t = makeShade(true); t.scale.setScalar(1.5); const from = new THREE.Vector3(this.hall.turnstile.x, 0, -11.5), to = new THREE.Vector3(0, 0, -3.6);
    t.position.copy(from); t.userData.mat.opacity = 0; this.group.add(t); this.prophet = t;
    await this._tween(3.0, k => { t.position.lerpVectors(from, to, k); t.lookAt(0, 0, 10); t.userData.mat.opacity = 0.9 * Math.min(1, k * 2); });
    return t;
  }
  clearProphecy() { if (this.prophet) { this.group.remove(this.prophet); this.prophet = null; } }

  _tween(seconds, fn) { return new Promise(res => this.tweens.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res })); }
  update(dt, t) {
    for (const [i, s] of Object.entries(this.souls)) s.fig.rotation.z = Math.sin(t * 1.3 + +i) * 0.025;   // the dead sway
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
  }
  wait(s) { return this._tween(s, () => {}); }
}
