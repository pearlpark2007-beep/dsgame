// harbourComic.js — the Harbour's climax as a motion comic. About fifty seconds, cut like a Tarantino reel:
// a chapter card, freeze-frame name cards, a standoff of extreme close-ups that cut faster and faster,
// then the action in big inked panels. One button press is yours: the swing that cuts the chain.
//
//  0. THE CHAIN (chapter card)             7. the boulder hits his crate tower: pop() pop() pop()
//  1. the harbour, the storm, the stack     8. the giant: WHA—?!
//  2. ANTIPHATES (name card)                9. the winch. SWING! (your key)
//  3. ODYSSEUS (name card)                 10. KRANNNGG!! the chain parts, link by link, into the sea
//  4. the standoff: eyes, eyes, axe, hand  11. RRAAAAGH!
//  5. the throw                            12. out through the mouth into the dawn, boulders falling short
//  6. he runs ACROSS the boulder           13. his card, one more line on it
import { MotionComic, W, H, C, figure, joints, mix, lerp, ease, easeOut, easeIn, rnd,
  speedLines, streaks, rain, bolt, boulder, crate, chainLinks, trireme } from "../../story/motionComic.js";
import { sound } from "../../engine/sound.js";

// ---------------------------------------------------------------- poses
const ODY = {
  stand:  { lean: 0, head: 0, aF: [18, 40], aB: [-12, -4], lF: [14, 2], lB: [-12, -3], face: 1 },
  ready:  { lean: 8, head: 4, aF: [30, 95], aB: [-25, -10], lF: [22, 0], lB: [-20, -6], face: 1 },
  run:    { lean: 28, head: -8, aF: [120, 70], aB: [-60, -110], lF: [95, 5], lB: [-35, -80], face: 1 },
  leap:   { lean: 30, head: -10, aF: [150, 120], aB: [-120, -150], lF: [75, 0], lB: [-45, -100], face: 1 },
  plant:  { lean: 34, head: -10, aF: [125, 160], aB: [-80, -120], lF: [70, -10], lB: [-25, -90], face: 1 },
  push:   { lean: 16, head: -14, aF: [165, 175], aB: [-150, -175], lF: [100, 40], lB: [-12, -4], face: 1 },
  crouch: { lean: 40, head: -18, aF: [70, 110], aB: [-40, -90], lF: [80, -12], lB: [-70, 10], face: 1 },
  raise:  { lean: -14, head: -16, aF: [192, 160], aB: [178, 150], lF: [24, 4], lB: [-22, -4], face: 1 },
  strike: { lean: 38, head: 8, aF: [105, 70], aB: [95, 60], lF: [40, 0], lB: [-32, -10], face: 1 },
  stern:  { lean: -4, head: -20, aF: [22, 10], aB: [-6, 0], lF: [10, 0], lB: [-10, 0], face: -1 },
};
const GIANT = {
  idle:   { lean: -6, head: 0, aF: [-18, -30], aB: [16, 6], lF: [-10, 0], lB: [10, 0], face: -1 },
  hold:   { lean: -4, head: 4, aF: [-30, -70], aB: [20, 10], lF: [-10, 0], lB: [10, 0], face: -1 },
  wind:   { lean: 22, head: 10, aF: [178, 200], aB: [160, 150], lF: [-14, 0], lB: [14, 0], face: -1 },
  throw:  { lean: -34, head: -10, aF: [-115, -100], aB: [-60, -40], lF: [-20, 0], lB: [18, 0], face: -1 },
};

// ---------------------------------------------------------------- scenery
const sky = (id, stops) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient></defs><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#${id})"/>`;
const storm = id => sky(id, [[0, "#04090b"], [0.55, C.storm], [1, C.storm2]]) + `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#halftoneL)" opacity="0.035"/>`;
const clouds = (y, c = "#0a171b") => { let s = ""; for (let i = 0; i < 9; i++) s += `<ellipse cx="${i * 210 - 60 + rnd() * 80}" cy="${y + rnd() * 50}" rx="${180 + rnd() * 120}" ry="${50 + rnd() * 30}" fill="${c}"/>`; return s; };
const waves = (y0, y1, c = "#2f6a77", n = 40) => { let s = ""; for (let i = 0; i < n; i++) { const y = y0 + rnd() * (y1 - y0), x = rnd() * W, l = 30 + (y - y0) * 0.4; s += `<path d="M${x},${y} q${l / 2},-${l * 0.15} ${l},0" stroke="${c}" stroke-width="${2 + (y - y0) / 60}" fill="none"/>`; } return s; };
const cliffL = (c = C.ink) => `<polygon points="-20,140 120,170 210,260 260,380 330,470 300,560 380,700 330,900 -20,900" fill="${c}"/>`;
const cliffR = (c = C.ink) => `<polygon points="1620,180 1500,200 1420,300 1390,420 1310,500 1350,620 1290,760 1330,900 1620,900" fill="${c}"/>`;
const strip = () => `<rect x="0" y="0" width="${W}" height="205" fill="#000"/><rect x="0" y="${H - 205}" width="${W}" height="205" fill="#000"/>`;   // scope letterbox

// the stack of six (the finale's answer: the AXE crate, 77, on top)
const STACK = [12, 31, 45, 50, 63, 77];
function stack(x, base, size, opts = {}) {
  let s = ""; STACK.forEach((v, i) => { s += crate(x + (i % 2 ? 2 : -2), base - i * size, size, v, v === 77, v === 77 ? "AXE" : ""); });
  return s;
}

// ---------------------------------------------------------------- close-ups for the standoff
function giantEyes(wide = false, red = false) {
  const bg = red ? C.blood : "#20140f";
  let scars = ""; for (let i = 0; i < 5; i++) { const x = 200 + rnd() * 1200, y = 260 + rnd() * 380; scars += `<path d="M${x},${y} l${40 + rnd() * 60},${(rnd() - 0.5) * 60}" stroke="${C.ink}" stroke-width="5" opacity="0.7"/>`; }
  const eye = (cx, flip) => {
    const ry = wide ? 70 : 30;
    return `<ellipse cx="${cx}" cy="455" rx="190" ry="${ry + 34}" fill="${C.ink}"/>`
      + `<ellipse cx="${cx}" cy="455" rx="160" ry="${ry}" fill="${C.red}" filter="url(#glow)"/>`
      + `<ellipse cx="${cx}" cy="455" rx="${wide ? 26 : 14}" ry="${ry * 0.95}" fill="${C.gold}"/>`
      + `<ellipse cx="${cx}" cy="455" rx="${wide ? 10 : 5}" ry="${ry * 0.9}" fill="${C.ink}"/>`
      + `<path d="M${cx - 230},${wide ? 330 : 395} L${cx + 230 * flip},${wide ? 300 : 410} L${cx + 220},${wide ? 360 : 430} L${cx - 220},${wide ? 380 : 440} Z" fill="${C.ink}"/>`;
  };
  return `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#halftone)" opacity="0.45"/>`
    + `<path d="M0,250 Q800,${wide ? 230 : 330} 1600,250 L1600,0 L0,0 Z" fill="${C.ink}"/>` + scars
    + eye(500, 1) + eye(1100, -1)
    + `<path d="M760,520 L800,700 L840,520" fill="none" stroke="${C.ink}" stroke-width="10"/>`;
}
function odyEyes(narrow = 0) {
  let rainS = ""; for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * H; rainS += `<line x1="${x}" y1="${y}" x2="${x - 14}" y2="${y + 70}" stroke="#d5edf2" stroke-width="3" opacity="0.5"/>`; }
  const eye = cx => `<path d="M${cx - 150},470 Q${cx},${400 + narrow * 40} ${cx + 150},462 Q${cx},${520 - narrow * 25} ${cx - 150},470 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="10"/>`
    + `<circle cx="${cx + 62}" cy="468" r="${34 - narrow * 6}" fill="#3a2414"/><circle cx="${cx + 66}" cy="468" r="15" fill="${C.ink}"/><circle cx="${cx + 54}" cy="458" r="6" fill="#fff"/>`;
  return `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.skin}"/><rect width="${W}" height="${H}" fill="url(#halftone)" opacity="0.28"/>`
    + `<path d="M0,0 L1600,0 L1600,250 Q1200,215 800,300 Q400,215 0,260 Z" fill="${C.ink}"/>`                                // hair
    + `<path d="M260,${370 + narrow * 20} L760,${400 + narrow * 15} L740,355 L270,325 Z" fill="${C.ink}"/><path d="M1340,${370 + narrow * 20} L840,${400 + narrow * 15} L860,355 L1330,325 Z" fill="${C.ink}"/>`
    + eye(520) + eye(1080)
    + `<path d="M800,420 L770,660 L830,670" fill="none" stroke="#7a4626" stroke-width="10"/>`
    + `<path d="M0,900 L0,740 Q400,690 800,760 Q1200,690 1600,740 L1600,900 Z" fill="#1d120b"/>`                            // beard
    + `<path d="M1180,560 q12,30 0,46 q-12,-16 0,-46" fill="#e6f6fa" opacity="0.85"/>` + rainS;
}
function axeGrip(glint = 0) {
  return `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="#0c1a1f"/>` + streaks(100, 30, "#9fc4cc", 0.25, [80, 200])
    + `<rect x="740" y="-50" width="90" height="1100" fill="${C.wood}" stroke="${C.ink}" stroke-width="10" transform="rotate(18,785,450)"/>`
    + `<path d="M1010,-120 L1500,-60 Q1580,180 1420,330 L960,170 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="12"/>`
    + `<path d="M1500,-60 Q1580,180 1420,330" stroke="#fff6c4" stroke-width="10" fill="none" opacity="0.8"/>`
    + `<g fill="${C.ink}"><rect x="560" y="380" width="460" height="200" rx="80"/><rect x="590" y="330" width="120" height="120" rx="50"/><rect x="700" y="320" width="120" height="120" rx="50"/><rect x="810" y="330" width="120" height="120" rx="50"/><rect x="900" y="360" width="110" height="110" rx="50"/><rect x="380" y="450" width="260" height="190" rx="40"/></g>`
    + `<g stroke="${C.gold}" stroke-width="5" fill="none" opacity="0.85"><path d="M600,340 q50,-20 100,0"/><path d="M710,330 q50,-20 100,0"/><path d="M820,340 q50,-20 100,0"/></g>`
    + (glint ? `<g transform="translate(1440,120) scale(${glint})"><polygon points="0,-90 14,-14 90,0 14,14 0,90 -14,14 -90,0 -14,-14" fill="#fff" filter="url(#glow)"/></g>` : "");
}
function giantGrip() {
  let f = ""; for (let i = 0; i < 4; i++) { const x = 380 + i * 230; f += `<path d="M${x},-40 L${x},300 Q${x + 10},420 ${x + 110},430 Q${x + 200},420 ${x + 190},300 L${x + 190},-40 Z" fill="${C.ink}"/><path d="M${x + 30},330 q60,40 130,0" stroke="${C.gold}" stroke-width="5" fill="none"/>`; }
  return `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="#0c1a1f"/>` + boulder(800, 980, 760, 8)
    + f + `<path d="M380,180 L1300,180" stroke="${C.gold}" stroke-width="4" opacity="0.4"/>`;
}
function giantRoar() {
  let teeth = ""; for (let i = 0; i < 9; i++) { const x = 460 + i * 85; teeth += `<polygon points="${x},380 ${x + 70},380 ${x + 35},${470 + (i % 2) * 40}" fill="${C.paper}" stroke="${C.ink}" stroke-width="5"/><polygon points="${x + 10},800 ${x + 75},800 ${x + 42},${700 - (i % 3) * 30}" fill="${C.paper}" stroke="${C.ink}" stroke-width="5"/>`; }
  return `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${C.red}"/>` + speedLines(800, 560, 70, 380, 1400, C.ink, [3, 12])
    + `<path d="M120,900 L170,330 Q300,120 800,100 Q1300,120 1430,330 L1480,900 Z" fill="${C.ink}"/>`
    + `<g fill="${C.red}" filter="url(#glow)"><ellipse cx="560" cy="250" rx="90" ry="22"/><ellipse cx="1040" cy="250" rx="90" ry="22"/></g>`
    + `<path d="M420,360 Q800,330 1180,360 L1220,820 Q800,880 380,820 Z" fill="#2b0606"/>` + teeth
    + `<path d="M330,170 L700,215 M1270,170 L900,215" stroke="${C.ink}" stroke-width="40"/>`;
}

// ---------------------------------------------------------------- the reel
export async function playHarbourComic({ director, card }) {
  const mc = new MotionComic(director), cut = () => sound.boom({ freq: 90, to: 40, seconds: 0.25, level: 0.5 });
  try {
    sound.drone && sound.drone({ level: 0.1 });
    // 0. chapter card
    sound.boom({ freq: 55, to: 30, seconds: 1.4, level: 1 });
    await mc.chapterCard("CHAPTER ONE  ·  THE HARBOUR", "THE CHAIN");

    // 1. the harbour: storm, the chain across the mouth, a man on six crates, a giant in the water
    mc.shot(storm("s1") + clouds(80) + clouds(160, "#0d1f24")
      + `<g id="far"><rect x="560" y="430" width="34" height="80" fill="${C.ink}"/><rect x="1010" y="430" width="34" height="80" fill="${C.ink}"/>${chainLinks(594, 450, 1010, 450, 9, C.iron, 26)}</g>`
      + `<rect x="0" y="505" width="${W}" height="400" fill="${C.sea}"/>` + waves(510, 900)
      + cliffL() + cliffR()
      + `<polygon points="-20,760 760,760 790,800 760,900 -20,900" fill="#141210"/><line x1="-20" y1="760" x2="760" y2="760" stroke="${C.gold}" stroke-width="3" opacity="0.5"/>`
      + stack(430, 760, 40)
      + figure({ ...ODY.ready, x: 430, y: 760 - 6 * 40 - 88 * 0.62 }, { scale: 0.62, cape: -110, axe: 140 })
      + figure({ ...GIANT.hold, x: 1185, y: 720 }, { brute: true, scale: 4.4 })
      + boulder(...(() => { const h = joints({ ...GIANT.hold, x: 1185, y: 720 }, { brute: true, scale: 4.4 }).handF; return [h[0] - 10, h[1] + 40]; })(), 70, 20)
      + `<g id="bolt" opacity="0">${bolt(860, -20, 470, 9)}</g>` + rain("rain1"));
    const r1 = mc.$("rain1"), b1 = mc.$("bolt");
    const cap1 = mc.caption("LAMOS. THE HARBOUR OF THE GIANTS. ONE WAY OUT.", { x: 60, y: 60, seconds: 2.2 });
    await mc.run(4.6, k => {
      mc.zoom(1 + ease(k) * 0.14, 520, 560);
      r1.setAttribute("transform", `translate(${-k * 160},${(k * 2600) % 900})`);
      if (k > 0.5 && k < 0.6) { b1.setAttribute("opacity", 1); } else b1.setAttribute("opacity", 0);
      if (k > 0.5 && !mc._b1) { mc._b1 = 1; mc.flash(0.85, 0.4); sound.crash({ seconds: 1.4, level: 0.6 }); mc.shake(0.4); }
    });
    await cap1;

    // 2. ANTIPHATES — low angle, the storm behind him
    mc.shot(sky("s2", [[0, "#f4ecd8"], [1, "#a9b9b6"]]) + `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#halftone)" opacity="0.12"/>` + `<g>${bolt(300, -30, 600, 10)}</g>`
      + `<g>${figure({ ...GIANT.idle, x: 1080, y: 1300 }, { brute: true, scale: 9.5 })}</g>` + rain("rain2", 90));
    mc.zoom(1.05, 1080, 400); cut();
    await mc.card("ANTIPHATES", "King of the Laestrygonians. Forty feet. Eats sailors.", { x: 80, y: 560, mono: false });

    // 3. ODYSSEUS — on his stack, the AXE in his fist
    mc.shot(sky("s3", [[0, "#f4ecd8"], [1, "#a9b9b6"]]) + `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#halftone)" opacity="0.12"/>`
      + stack(1060, 1500, 120)
      + figure({ ...ODY.ready, x: 1060, y: 1500 - 6 * 120 - 88 * 3.4 }, { scale: 3.4, cape: -55, capeLen: 85, axe: 150 }) + rain("rain3", 90, "#5b6f72", 0.5));
    mc.zoom(1, 800, 450); cut();
    await mc.card("ODYSSEUS", "King of Ithaca. Six crates. One axe. No plan B.", { x: 80, y: 560, mono: false });

    // 4. the standoff: cuts that get shorter, a heartbeat under them, then nothing
    const beats = [[() => giantEyes(), 1.1], [() => odyEyes(0), 0.95], [() => axeGrip(0), 0.75], [() => giantGrip(), 0.6],
                   [() => giantEyes(), 0.45], [() => odyEyes(1), 0.38], [() => axeGrip(1), 0.32]];
    for (const [art, d] of beats) {
      mc.shot(art() + strip()); sound.heart && sound.heart({ level: 0.9 });
      const z0 = 1 + rnd() * 0.04;
      await mc.run(d, k => mc.zoom(z0 + k * 0.06));
    }
    mc.shot(`<rect width="${W}" height="${H}" fill="#000"/>`); await mc.wait(0.5);

    // 5. the throw: he winds up with the boulder over his head, and lets go — at us
    {
      const gp = k => mix(GIANT.wind, GIANT.throw, k);
      mc.shot(storm("s5") + `<g id="sl5" opacity="0">${speedLines(560, 420, 70, 300, 1500, C.paper, [2, 8])}</g><g id="g5"></g><g id="b5"></g>` + rain("rain5", 70));
      const g5 = mc.$("g5"), b5 = mc.$("b5"), sl = mc.$("sl5");
      mc.sfx("HHRRNNGH!", { x: 420, y: 230, r: -7, size: 150, seconds: 1.4 }); sound.roar && sound.roar({ seconds: 1.6, level: 0.45 });
      await mc.run(1.6, k => {
        const p = { ...gp(easeIn(Math.max(0, k - 0.55) / 0.45)), x: 980, y: 1120 }, o = { brute: true, scale: 6.6 };
        g5.innerHTML = figure(p, o);
        const h = joints(p, o), hand = [(h.handF[0] + h.handB[0]) / 2, (h.handF[1] + h.handB[1]) / 2];
        b5.innerHTML = boulder(hand[0], hand[1] - 120, 200, k * 30);
        sl.setAttribute("opacity", k > 0.6 ? 1 : 0);
        mc.zoom(1 + k * 0.08, 900, 400);
      });
      sound.whoosh && sound.whoosh({ seconds: 0.9, level: 0.5 });
      mc.shot(sky("s5b", [[0, "#04090b"], [1, C.storm]]) + speedLines(800, 450, 90, 120, 1400, C.paper, [2, 10]) + `<g id="b5b"></g>`);
      const bb = mc.$("b5b");
      await mc.run(0.75, k => { bb.innerHTML = boulder(800, 450, lerp(40, 900, easeIn(k)), k * 90); });
    }

    // 6. he doesn't run from it. He runs across it. (fast, then the world nearly stops, then fast)
    {
      mc.shot(sky("s6", [[0, "#06131a"], [1, C.storm2]]) + clouds(700, "#0d2228") + `<g id="st6">${streaks(-90, 40, C.paper, 0.35)}</g><g id="b6"></g><g id="o6"></g><g id="dust6"></g>`);
      const b6 = mc.$("b6"), o6 = mc.$("o6"), st = mc.$("st6");
      sound.whoosh && sound.whoosh({ seconds: 2.5, level: 0.35 });
      let tak = false;
      await mc.run(3.6, k => {
        // time ramp: 0–0.22 real speed, 0.22–0.78 almost frozen, then real speed again
        const T = k < 0.22 ? k / 0.22 * 0.4 : k < 0.78 ? 0.4 + (k - 0.22) / 0.56 * 0.2 : 0.6 + (k - 0.78) / 0.22 * 0.4;
        const bx = lerp(1700, -200, T), by = 740 + Math.sin(T * Math.PI) * -60;
        b6.innerHTML = boulder(bx, by, 190, -T * 300);
        st.setAttribute("transform", `translate(${(T * 3000) % 400},0)`);
        // him: in from the left on a leap, plants on top of the rock, pushes off up and out to the right
        let pose, x, y;
        if (T < 0.4) { const u = T / 0.4; pose = mix(ODY.leap, ODY.plant, u); x = lerp(-150, bx - 30, u); y = lerp(330, by - 330, easeOut(u)); }
        else if (T < 0.6) { const u = (T - 0.4) / 0.2; pose = mix(ODY.plant, ODY.push, ease(u)); x = bx - 30 + u * 60; y = by - 330 - u * 40; }
        else { const u = (T - 0.6) / 0.4; pose = mix(ODY.push, ODY.leap, u); x = bx + 30 + u * 1500; y = by - 370 - u * 400; }
        o6.innerHTML = figure({ ...pose, x, y }, { scale: 1.9, cape: -100 - pose.lean, axe: 150 + pose.lean });
        if (T > 0.405 && !tak) { tak = true; mc.sfx("TAK!", { x: bx - 30, y: by - 250, r: 8, size: 90, fill: C.paper, seconds: 1.8 }); sound.boom({ freq: 160, to: 80, seconds: 0.15, level: 0.6 }); }
        mc.zoom(T > 0.4 && T < 0.6 ? 1.1 : 1, 800, 700);
      });
    }

    // 7. the boulder meets the stack he was standing on
    {
      mc.shot(storm("s7") + `<rect x="0" y="760" width="${W}" height="200" fill="#141210"/><g id="b7"></g><g id="d7"></g><g id="tw7"></g>` + rain("rain7", 60));
      const tw = mc.$("tw7"), b7 = mc.$("b7"), d7 = mc.$("d7"), size = 110, flying = STACK.map((v, i) => ({ v, x: 800, y: 790 - i * size, vx: (rnd() - 0.5) * 500 + (i - 2.5) * 420, vy: -200 - rnd() * 450, r: 0, vr: (rnd() - 0.5) * 720 }));
      const puffs = Array.from({ length: 18 }, () => ({ dx: (rnd() - 0.5) * 700, dy: -rnd() * 260, r: 40 + rnd() * 70 }));
      let hit = false;
      await mc.run(3.0, k => {
        const t = k * 3.0;
        if (t < 0.7) { const u = easeIn(t / 0.7); b7.innerHTML = boulder(lerp(-300, 760, u), lerp(-200, 420, u), 230, u * 120); tw.innerHTML = flying.map(f => crate(f.x, f.y + size, size, f.v, f.v === 77, f.v === 77 ? "AXE" : "")).join(""); return; }
        if (!hit) { hit = true; mc.flash(0.9, 0.3); mc.shake(1.4); sound.crash({ seconds: 1.6, level: 0.9 }); mc.sfx("KRAKA-THOOM!", { x: 800, y: 300, r: -9, size: 190, seconds: 1.8 }); }
        const u = (t - 0.7) * 0.42;                                         // slow motion after the hit
        tw.innerHTML = flying.map(f => `<g transform="translate(${f.x + f.vx * u},${f.y + f.vy * u + 1100 * u * u}) rotate(${f.vr * u})">${crate(0, size / 2, size, f.v, f.v === 77, "pop()")}</g>`).join("");
        b7.innerHTML = boulder(760 + u * 120, 560 + u * 140, 230, 120 + u * 60);
        let d = ""; for (const q of puffs) d += `<circle cx="${800 + q.dx * (0.3 + u * 2.2)}" cy="${740 + q.dy * (0.3 + u * 1.2)}" r="${q.r * (0.6 + u * 1.4)}" fill="#8f8573" opacity="${Math.max(0, 0.75 - u * 0.9)}"/>`;
        d7.innerHTML = d;
      });
    }

    // 8. the giant can't believe it
    mc.shot(giantEyes(true) + strip()); cut();
    mc.sfx("WHA—?!", { x: 800, y: 280, r: 6, size: 160, fill: C.paper, seconds: 1.4 });
    await mc.run(1.3, k => mc.zoom(1 + k * 0.1));

    // 9. he lands at the winch. The chain runs from the drum out across the mouth. Your swing.
    {
      const drum = `<g transform="translate(330,560)"><rect x="-150" y="80" width="300" height="200" fill="#141210"/><circle r="150" fill="${C.wood}" stroke="${C.ink}" stroke-width="14"/><circle r="150" fill="url(#halftone)" opacity="0.4"/><rect x="-150" y="-20" width="300" height="40" fill="${C.gold}" stroke="${C.ink}" stroke-width="8" opacity="0.9"/><circle r="40" fill="${C.ink}"/></g>`;
      mc.shot(storm("s9") + clouds(120) + `<rect x="0" y="640" width="${W}" height="300" fill="#141210"/><line x1="0" y1="640" x2="${W}" y2="640" stroke="${C.gold}" stroke-width="4" opacity="0.5"/>`
        + `<g>${chainLinks(400, 560, 1750, 470, 30, C.iron, 30)}</g>` + drum + `<g id="o9"></g>` + rain("rain9", 70));
      const o9 = mc.$("o9");
      await mc.run(0.5, k => { o9.innerHTML = figure({ ...mix(ODY.leap, ODY.crouch, easeOut(k)), x: lerp(1500, 860, easeOut(k)), y: lerp(100, 560, easeOut(k)) }, { scale: 1.9, cape: -120, axe: 120 }); });
      mc.shake(0.6); sound.boom({ freq: 120, to: 50, seconds: 0.3, level: 0.7 }); mc.sfx("THUNK!", { x: 860, y: 760, r: -4, size: 90, fill: C.paper, seconds: 1 });
      await mc.run(0.8, k => { o9.innerHTML = figure({ ...mix(ODY.crouch, ODY.raise, ease(k)), x: 860, y: 560 + (1 - ease(k)) * 20 }, { scale: 1.9, cape: -120, axe: lerp(120, 205, ease(k)), axeSide: -1 }); mc.zoom(1 + k * 0.1, 800, 520); });
      sound.heart && sound.heart({ level: 1 });
      await mc.prompt("SWING!", "PRESS SPACE");
    }

    // 10. KRANNNGG. Freeze, in negative. Then the chain comes apart, link by link, into the sea.
    {
      mc.shot(`<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="#0c1a1f"/>` + speedLines(800, 450, 80, 150, 1400, C.paper, [3, 10])
        + `<g>${chainLinks(-100, 470, 1700, 430, 70, C.iron, 0)}</g>`
        + `<path d="M520,-200 L1020,-140 Q1110,180 900,420 L380,250 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="16"/><rect x="250" y="-400" width="80" height="700" fill="${C.wood}" stroke="${C.ink}" stroke-width="12" transform="rotate(-30,290,0)"/>`
        + `<g transform="translate(800,450)"><polygon points="0,-260 50,-50 260,0 50,50 0,260 -50,50 -260,0 -50,-50" fill="#fff" filter="url(#glow)"/></g>`);
      sound.clang && sound.clang({ level: 0.9 }); sound.boom({ freq: 70, to: 30, seconds: 1, level: 1 });
      mc.flash(1, 0.25); mc.shake(1.6);
      mc.sfx("KRANNNGG!!", { x: 800, y: 760, r: -6, size: 170, fill: C.red, stroke: "#fff", seconds: 1.4 });
      await mc.wait(1.0);
      // the parting
      mc.shot(storm("s10") + clouds(100) + `<rect x="0" y="560" width="${W}" height="400" fill="${C.sea}"/>` + waves(570, 900) + `<g id="cl"></g><g id="cr"></g><g id="spl"></g>` + rain("rain10", 70));
      const cl = mc.$("cl"), cr = mc.$("cr"), sp = mc.$("spl");
      sound.rattle && sound.rattle({ seconds: 2, level: 0.5 });
      const clanks = [[0.15, "clank", 420, 330, 60], [0.35, "clank", 1180, 380, 64], [0.55, "CLANK", 640, 500, 90]];
      let ci = 0, splashed = false;
      await mc.run(2.6, k => {
        const s = easeIn(Math.min(1, k * 1.2));
        cl.innerHTML = `<g transform="rotate(${s * 28},0,300)">${chainLinks(-100, 300, 760, 330 + s * 30, 40, "#9aa1a5", s * 200)}</g>`;
        cr.innerHTML = `<g transform="rotate(${-s * 24},1700,280)">${chainLinks(840, 330 + s * 30, 1700, 280, 40, "#9aa1a5", s * 240)}</g>`;
        while (ci < clanks.length && k > clanks[ci][0]) { const [, t, x, y, z] = clanks[ci++]; mc.sfx(t, { x, y, r: (rnd() - 0.5) * 20, size: z, fill: C.paper, seconds: 0.9 }); sound.clang && sound.clang({ level: 0.25 }); }
        if (k > 0.72 && !splashed) { splashed = true; sound.splash && sound.splash({ level: 0.8 }); mc.sfx("SPLOOSH!", { x: 800, y: 700, r: 4, size: 150, seconds: 1.2 }); }
        if (splashed) { const u = (k - 0.72) / 0.28; let d = ""; for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 15), rr = 40 + u * 330; d += `<ellipse cx="${800 + Math.cos(a) * rr * 1.4}" cy="${640 + Math.sin(a) * rr - (-u * u * 300)}" rx="${18 - u * 8}" ry="${30 - u * 12}" fill="#e8f6f8" opacity="${1 - u}"/>`; } sp.innerHTML = d; }
      });
    }

    // 11. robbed
    mc.shot(giantRoar()); sound.roar && sound.roar({ seconds: 2.2, level: 0.6 });
    mc.sfx("RRAAAAGH!", { x: 800, y: 560, r: -8, size: 230, fill: C.gold, seconds: 1.8 });
    await mc.run(1.8, k => { mc.zoom(1 + k * 0.12, 800, 560); if (k < 0.7) mc.shake(0.5); });

    // 12. out through the mouth into the dawn; boulders fall short behind the stern
    {
      mc.shot(sky("s12", [[0, "#0b1d22"], [0.45, "#4f3f3a"], [0.7, C.dawn], [0.78, "#ffd56a"], [1, "#2a5560"]])
        + `<circle cx="800" cy="560" r="170" fill="#ffe08a" filter="url(#glow)"/><rect x="0" y="560" width="${W}" height="400" fill="#123640"/>` + waves(570, 900, "#f7b04a", 60)
        + `<path d="M800,560 L620,900 L980,900 Z" fill="#ffd56a" opacity="0.25"/>`
        + `<polygon points="-20,120 160,180 300,320 380,470 470,560 520,900 -20,900" fill="${C.ink}"/><polygon points="1620,140 1440,200 1300,330 1220,470 1130,560 1080,900 1620,900" fill="${C.ink}"/>`
        + `<rect x="430" y="440" width="44" height="122" fill="${C.ink}"/><rect x="1126" y="440" width="44" height="122" fill="${C.ink}"/>${chainLinks(452, 470, 452, 600, 12, C.ink)}${chainLinks(1148, 470, 1148, 620, 12, C.ink)}`
        + `<g transform="translate(1330,330)">${figure({ ...GIANT.throw, x: 0, y: 0 }, { brute: true, scale: 0.9, rimColor: C.dawn })}</g>`
        + `<g id="ship"></g><g id="spl12"></g>`);
      const ship = mc.$("ship"), sp = mc.$("spl12");
      const drops = [[0.25, 600, 760], [0.5, 1000, 700], [0.72, 760, 640]];
      let di = 0, live = [];
      await mc.run(4.4, k => {
        const s = lerp(1.35, 0.42, easeOut(k)), y = lerp(860, 600, easeOut(k));
        ship.innerHTML = trireme(800, y, s, k * 40);
        while (di < drops.length && k > drops[di][0]) { const [, x, yy] = drops[di++]; live.push({ x, y: yy, t0: k }); sound.splash && sound.splash({ level: 0.6 }); mc.sfx(di === 3 ? "KA-BLOOSH!" : "SPLASH!", { x, y: yy - 160, r: (rnd() - 0.5) * 18, size: di === 3 ? 140 : 90, seconds: 1.0 }); mc.shake(0.3); }
        sp.innerHTML = live.map(l => { const u = Math.min(1, (k - l.t0) * 4); return `<path d="M${l.x - 70},${l.y} Q${l.x - 50},${l.y - 260 * (1 - u * 0.4)} ${l.x},${l.y - 300 * (1 - u * 0.3)} Q${l.x + 50},${l.y - 260 * (1 - u * 0.4)} ${l.x + 70},${l.y} Z" fill="#eaf7f9" opacity="${1 - u * 0.8}"/>`; }).join("");
      });
    }

    // 13. his card: at the stern, the sun behind him. One more line on it.
    {
      mc.shot(sky("s13", [[0, "#3b2b2a"], [0.6, C.dawn], [1, "#ffd56a"]]) + `<circle cx="1050" cy="520" r="330" fill="#ffe7a6" filter="url(#glow)"/>`
        + `<rect x="0" y="700" width="${W}" height="300" fill="#123640"/>` + waves(705, 900, "#f7b04a", 50)
        + `<path d="M-50,760 L1600,690 L1600,900 L-50,900 Z" fill="${C.ink}"/><path d="M700,720 Q1150,690 1450,520 L1480,540 Q1300,700 1050,760 Z" fill="${C.ink}"/>`
        + figure({ ...ODY.stern, x: 1060, y: 590 }, { scale: 2.6, cape: 110, capeLen: 120, rimColor: "#fff3c9", axe: 180 }));
      const lines = (card.sub || "").split(/<br\s*\/?>/i).map(t => t.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = `<text x="80" y="300" font-family="Anton, Impact, sans-serif" font-size="150" fill="${C.ink}" letter-spacing="4">${card.name}</text>`
        + lines.map((t, i) => `<text x="88" y="${370 + i * 46}" font-family="'Courier Prime', monospace" font-weight="700" font-size="${i === lines.length - 1 ? 36 : 30}" fill="${i === lines.length - 1 ? C.blood : C.ink}" opacity="0">${t}</text>`).join("");
      mc.letter.appendChild(g);
      sound.boom({ freq: 55, to: 30, seconds: 1.6, level: 0.9 });
      const subs = [...g.querySelectorAll("text")].slice(1);
      await mc.run(1.2 + subs.length * 0.3, k => { mc.zoom(1 + k * 0.05, 1060, 520); subs.forEach((s, i) => s.setAttribute("opacity", Math.max(0, Math.min(1, k * (subs.length + 2) - i - 1)))); });
      await mc.wait(2.6);
      const end = document.createElementNS("http://www.w3.org/2000/svg", "g");
      end.innerHTML = `<rect width="${W}" height="${H}" fill="#000" opacity="0"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="'Courier Prime', monospace" font-size="30" letter-spacing="12" fill="${C.paper}" opacity="0">END OF CHAPTER ONE</text>`;
      mc.letter.appendChild(end);
      await mc.run(1.0, k => { end.firstChild.setAttribute("opacity", k); end.lastChild.setAttribute("opacity", Math.max(0, k * 2 - 1)); });
      await mc.wait(1.4);
    }
  } finally {
    sound.silence && sound.silence(0.6);
    setTimeout(() => sound.restore && sound.restore(0.2), 800);
    await mc.close();
  }
}
