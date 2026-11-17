// opening.js — Chapter One's opening, shot as a film (the grindhouse grade).
//  1–2. the arrival (the screenplay's H1–H3, which replace the crawl and the empty glide; the crawl's full text
//       is kept below and plays from the Story door as "The story so far"):
//       H1 from his stern, the rain still falling, the narrow mouth ahead · H2 Polites and the order
//       ("Bring them all in") · H3 from the cliff top, the fleet comes through the gap one ship at a time
//  3. Odysseus walks in; the frame freezes on his name (his titles and deeds so far)
//  4. he looks up: lightning, and the Laestrygonians on the cliff edges
//  5. one of his ships, moored, quiet... a boulder out of the dark breaks it in half
//  6. the reverse: Antiphates among the ruined columns, arm still out; a slow push to a low angle. Freeze on his name.
//  7. the chain comes up out of the sea across the mouth
//  8. the AXE, buried in a stack of cargo; Odysseus looks at it. Black.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { CLIFF_GIANTS, THROW_RELEASE } from "./giant.js";
import { makeBoulder } from "./chainTower.js";
import { shot, cineLights, bolt, physics, splashAt, ease, ANTIPHATES_AT, reseed, rand, REDUCED, clearSpot } from "./cine.js";
import { buildTrireme } from "./trireme.js";
import { Crew, reachArm } from "../../story/crew.js";
import { sound } from "../../engine/sound.js";

// the crawl: about the place, not the man. He only sails into it.
const CRAWL = {
  kicker: "TELEPYLOS",
  title: "THE HARBOUR",
  paragraphs: [
    "There is a harbour on the coast of Telepylos where the cliffs close in on every side, and the way out is so narrow that only one ship can pass at a time.",
    "Ships that find it think they are safe.",
    "The people who live there are the Laestrygonians. They are not people. They stand as tall as the cliffs. Their king is called Antiphates, and they eat the sailors who knock on their door.",
    "When a fleet comes in, they wait for dark. They draw a chain across the mouth. They bury the one blade that can cut it in a stack of cargo, where only the top can ever be reached.",
    "Then they come down from the cliffs.",
    "Odysseus, King of Ithaca, had spent ten years at the war in Troy. He had twelve ships and a long way home. He had never heard of Telepylos.",
    "Tonight, his fleet sailed in."
  ]
};

// the crawl on its own, from the chapter's Story door ("The story so far"): the full text, as it used to open the film
export async function playCrawl({ comic }) {
  document.body.classList.add("cinematic");
  try { await comic.crawl({ ...CRAWL, seconds: 46 }); } finally { comic.clear(); document.body.classList.remove("cinematic"); }
}

// ---- 1–2. the arrival: his own ship coming in from the sea, then the whole fleet through the mouth.
// Twelve ships, built once from one model and cloned (they share every geometry and material), made only for
// this film and removed at the end. Bow +x in the model, so a yaw of -PI/2 points it into the harbour (+z).
const MOUTH_Z = -540, LANE = -12, GAP = 46, FLEET = 12;       // the lane keeps clear of the cargo tower inside the mouth (x 8, z -420)
async function arrival({ world, hero, director, comic, harbour }) {
  const proto = buildTrireme();
  const fleet = Array.from({ length: FLEET }, () => { const s = proto.clone(); s.rotation.y = -Math.PI / 2; world.scene.add(s); return s; });
  const his = fleet[0];
  const crew = await Crew.ready(world, hero);
  const polites = crew.add({ name: "Polites", tint: 0xd6cdbd });
  const torch = new THREE.Group();
  torch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 6).translate(0, -0.25, 0), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 })));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 7).translate(0, 0.38, 0), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false }));
  const glow = new THREE.PointLight(0xff8a3c, 0, 14, 1.6); glow.position.y = 0.45;
  torch.add(flame, glow); torch.visible = false; world.scene.add(torch);
  // the line of ships: his ahead, the others behind him at even gaps, all rowing in at the same pace
  let lead = MOUTH_Z - 150;
  const SPEED = 5.2;
  const place = () => fleet.forEach((s, i) => { s.position.set(LANE, -1.0 + Math.sin(world.time * 0.8 + i) * 0.08, lead - i * GAP); s.rotation.z = Math.sin(world.time * 0.6 + i * 1.7) * 0.012; });
  // on his deck: the deck is 2.45 m above the hull's origin; the helm is near the stern (12–15 m behind the middle)
  const onDeck = (x, back, y = 0) => new THREE.Vector3(his.position.x + x, his.position.y + 2.45 + y, his.position.z - back);
  let helmHand = 1, wave = 0, raise = 0, look = 0;
  const rig = { update: dt => {
    lead += dt * SPEED; place();
    const h = onDeck(-0.9, 13.2); hero.group.position.copy(h); hero.group.rotation.set(0, 0, 0);
    const pl = onDeck(1.0, 11.2); polites.group.position.copy(pl);
    // his right hand on the steering oar's loom at the rail; then the wave back over his head without turning round
    hero.group.updateMatrixWorld();
    if (wave > 0) reachArm(hero.bones, "r", new THREE.Vector3(-0.2, 2.3, -0.35).applyMatrix4(hero.group.matrixWorld), wave);
    else if (helmHand > 0) reachArm(hero.bones, "r", onDeck(-1.55, 13.45, 0.8), helmHand);
    // Polites: his head up at the silent cliffs; then the signal torch lifted high
    if (look > 0 && polites.bones.head) polites.bones.head.rotateX(-0.45 * look);
    polites.group.updateMatrixWorld();
    if (raise > 0) {
      reachArm(polites.bones, "r", new THREE.Vector3(-0.15, 1.6 + 0.75 * raise, 0.25).applyMatrix4(polites.group.matrixWorld), 1);
      polites.bones.rHand.updateWorldMatrix(true, false); torch.position.setFromMatrixPosition(polites.bones.rHand.matrixWorld);
      torch.visible = true; glow.intensity = 6 * raise * (0.85 + Math.random() * 0.3);
    }
  } };
  world.add(rig);
  hero.teleport(LANE, lead - 13, 0, 1.45); hero.play("idle", 0.01, { timeScale: 0.7 });
  polites.place(LANE + 1, 1.45, lead - 11, 0); polites.face(LANE, MOUTH_Z); polites.play("idle", 0.01);
  try {
    // ---- H1 · 0:00–0:07 · the mouth. From his stern, low, past him at the helm to the gap between the cliffs.
    // The rain from the last shot at Troy is still falling.
    await comic.black(false, 1.2);
    let s = shot(world, director, (t, o) => { const st = onDeck(0.7, 17.3, 1.15); o.pos.copy(st); o.look.set(LANE, 22 + t * 0.6, MOUTH_Z + 40); o.fov = 50; });
    sound.sea(true, { level: 0.05 });
    await hero.wait(2.0);
    comic.caption("Ships that find it think they are safe.", { x: 6, y: 16, seconds: 3.6 });
    if (!director.skipping) sound.creak({ level: 0.1, seconds: 1.6, from: 500, to: 260 });
    await hero.wait(5.0);
    s.stop();

    // ---- H2 · 0:07–0:16 · the order. Two-shot at the stern; Polites looks up at the cliffs.
    s = shot(world, director, (t, o) => { const m = onDeck(0.1, 12.2); o.pos.copy(m).add(new THREE.Vector3(-3.4 + t * 0.06, 1.05, 3.3)); o.look.copy(m).add(new THREE.Vector3(0, 1.4, 0)); o.fov = 42; });   // in front of them, square to the line they stand on, so neither hides the other
    await hero.over(0.8, k => look = ease(k));
    await comic.subtitle("No fishing boats. No smoke from the town.", { speaker: "POLITES", seconds: 2.8 });
    await comic.subtitle("Then no one to argue with. Bring them all in.", { speaker: "ODYSSEUS", seconds: 2.4 });
    // the wave back over his head, without turning round; Polites hesitates, then lifts the signal torch
    await hero.over(0.45, k => { helmHand = 1 - k; wave = ease(k); });
    await hero.wait(0.5);
    await hero.over(0.5, k => wave = 1 - ease(k));
    helmHand = 1;
    await hero.over(0.6, k => look = 1 - ease(k));
    await hero.wait(0.3);
    await hero.over(0.8, k => raise = ease(k));
    await hero.wait(1.0);
    s.stop();

    // ---- H3 · 0:16–0:24 · one at a time. High on the cliff top, looking down at the mouth: the other ships
    // come through the gap one behind another, because only one can pass at a time. A slow drift toward the quay.
    lead = MOUTH_Z + 30;                                          // the cut lets time pass: he is through; the line follows
    s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 8)); o.pos.set(LANE - 24 + 4 * k, 60 - 16 * k, MOUTH_Z + 70 + 18 * k); o.look.set(LANE + 2, 0, MOUTH_Z - 60 + 20 * k); o.fov = 48; });
    await hero.wait(1.6);
    comic.caption("Tonight, his fleet sailed in.", { x: 6, y: 16, seconds: 3.4 });
    bolt(harbour, -70, MOUTH_Z - 200);
    await hero.wait(6.4);
    sound.sea(false);
    s.stop();
  } finally {
    world.updaters.splice(world.updaters.indexOf(rig), 1);
    fleet.forEach(f => world.scene.remove(f)); world.scene.remove(torch);
    proto.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); if (m.normalMap) m.normalMap.dispose(); m.dispose(); }); });
    torch.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    crew.dispose();
  }
}

export async function playOpening(c) {
  const { world, hero, director, comic, giant, chain, trial, harbour, card, piles, crowd } = c;
  const L = cineLights(world);
  const ship = harbour.ship, victim = harbour.farShip;
  reseed(101);
  const fling = physics(world);
  document.body.classList.add("cinematic");
  comic.letterbox(true);
  world.grade.uniforms.letterbox.value = 1;        // cinema bars only while the film runs
  chain.lower();                                   // the chain lies on the seabed; the harbour looks open
  giant.hide(); crowd.forEach(g => g.hide());

  try {
    // ---- 1–2. the arrival (H1–H3). The crawl no longer plays here: it is the Story door's "The story so far"
    await arrival(c);
    let s;

    // ---- 3. Odysseus walks down the pier at a low camera... and the frame freezes on his name
    hero.teleport(13.5, -10.5, 0, QUAY_TOP);
    s = shot(world, director, (t, o) => { o.pos.set(12.2, 1.6, -1.0); o.look.set(hero.group.position.x, 3.0, hero.group.position.z - 1); o.fov = 34; });
    await hero.walkTo(13.5, -5.4);
    await hero.wait(0.25);
    bolt(harbour, -20, -120);
    await director.freeze(card.name, card.sub, 3.0);
    s.stop();

    // ---- 4. he looks up. Lightning. On the cliff edges, shapes that should not be that big.
    crowd.forEach((g, i) => { const [x, z, , y] = CLIFF_GIANTS[i]; g.place(x, y, z, ship.position.x, ship.position.z - 20); g.play("idle", 0); });
    // a slow pan along the cliff tops, from the ones on the left to the ones on the right (from the pier's end, clear of the ship's rigging)
    s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 6.5)); o.pos.set(10.5, 1.4, -14); o.look.set(-52 + 96 * k, 64 + 3 * k, -78 - 14 * k); o.fov = 42; });
    await hero.wait(1.6);
    bolt(harbour, -50, -140);
    await hero.over(1.4, k => L.flicker(k, 9));
    await hero.wait(1.2);
    bolt(harbour, 60, -160);
    await hero.over(1.4, k => L.flicker(k, 7));
    await hero.wait(0.6);
    s.stop();

    // ---- 5. one of his ships, moored out in the harbour. Quiet. Then, out of the dark, a boulder.
    victim.position.set(-9, -1.0, -22); victim.rotation.set(0, 1.35, 0);
    giant.place(ANTIPHATES_AT.x, ANTIPHATES_AT.y, ANTIPHATES_AT.z, victim.position.x, victim.position.z);
    L.aim(ANTIPHATES_AT);
    s = shot(world, director, (t, o) => { o.pos.set(9, 3.0, -7); o.look.set(victim.position.x, 2.2, victim.position.z); o.fov = 42; });
    await hero.wait(1.4);
    const boulder = makeBoulder(2.6); world.scene.add(boulder);
    const hand = new THREE.Vector3();
    const thr = giant.play("throw", 0.1);
    const ride = { update: () => boulder.position.copy(giant.handPos(hand)) }; world.add(ride);
    while (thr.time < THROW_RELEASE) await hero.wait(0.02);
    world.updaters.splice(world.updaters.indexOf(ride), 1);
    const from = boulder.position.clone(), to = victim.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    // the last of its flight in slow motion
    await hero.over(1.4, k => {
      boulder.position.lerpVectors(from, to, k); boulder.position.y += Math.sin(Math.PI * k) * 10; boulder.rotation.x += 0.06;
      if (!director.skipping) world.timeScale = k > 0.6 ? 0.3 : 1;
    });
    world.timeScale = 1;
    // it breaks the ship's back: she folds, rolls and goes down. The camera only settles with the impact
    s.o.shake = 0.5;
    splashAt(world, to, 3);
    for (let k = 0; k < 8; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 1.8 + rand()), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.9 })); pl.position.copy(to); world.scene.add(pl); fling(pl, new THREE.Vector3((rand() - 0.5) * 14, 6 + rand() * 8, (rand() - 0.5) * 14), new THREE.Vector3(6, 0, 5)); }
    fling(boulder, new THREE.Vector3(0, -2, 0), new THREE.Vector3(0.5, 0, 0.5));
    const v0 = victim.position.clone();
    await hero.over(3.0, k => { victim.position.y = v0.y - 7 * k * k; victim.rotation.z = 0.7 * ease(k); victim.rotation.x = 0.25 * k; });
    s.stop();

    // ---- 6. who threw it. From out on the water, clear of the columns: all of him, arm still out.
    //      Then a slow push in and down to a low angle on his face as he roars. Freeze on his name.
    const G = giant.group.position;
    const gf = new THREE.Vector3(Math.sin(giant.group.rotation.y), 0, Math.cos(giant.group.rotation.y)), gs = new THREE.Vector3(-gf.z, 0, gf.x);
    const camAt = G.clone().addScaledVector(gf, 34).addScaledVector(gs, 9).setY(9);
    const head = new THREE.Vector3();
    s = shot(world, director, (t, o) => { o.pos.copy(camAt); o.look.copy(G).add(new THREE.Vector3(0, 19, 0)); o.fov = 56; });
    await hero.wait(0.5);
    bolt(harbour, -40, -60);
    await hero.over(1.0, k => L.flicker(k, 10));
    await hero.wait(0.3);
    s.stop();
    // the reveal: a slow, controlled push in and down, from all of him to a low angle on his face as he roars
    // end low and close, but with nothing between us and his face: above the column tops, looking up at him
    giant.headPos(head);
    const cands = [];
    for (const dist of [22, 25, 28]) for (const sd of [5, -3, 10, -8, 0]) for (const y of [11, 13, 15]) cands.push(G.clone().addScaledVector(gf, dist).addScaledVector(gs, sd).setY(G.y + y));
    const lowAt = clearSpot(world, cands, [head.clone(), G.clone().add(new THREE.Vector3(0, 22, 0)), G.clone().add(new THREE.Vector3(0, 15, 0))], [giant.group]);
    const look0 = G.clone().add(new THREE.Vector3(0, 19, 0));
    s = shot(world, director, (t, o) => {
      giant.headPos(head);
      const k = ease(Math.min(1, t / (REDUCED() ? 1.2 : 2.6)));
      o.pos.copy(camAt).lerp(lowAt, k);
      o.look.copy(look0).lerp(head, k);
      o.fov = 56 - 18 * k;
    });
    // the roar comes late in the push: its first second is the open-mouthed face (after that he hunches forward),
    // so the lightning and the freeze land 0.8 s into it, his face full in the frame
    await hero.wait(REDUCED() ? 0.4 : 1.4);
    giant.play("roar", 0.15);
    await hero.wait(0.4);
    bolt(harbour, -30, -40);
    await hero.over(0.4, k => L.flicker(k, 7));
    // freeze on the roar, while his face is still full in the frame
    await director.freeze("ANTIPHATES", "King of the Laestrygonians.", 3.0);
    s.stop();

    // ---- 7. the chain: he turns to his Chain Tower, and it comes up out of the sea across the mouth
    giant.group.rotation.y = Math.atan2(chain.group.position.x - ANTIPHATES_AT.x, chain.group.position.z - ANTIPHATES_AT.z);
    giant.play("idle", 0.4);
    s = shot(world, director, (t, o) => { o.pos.set(ship.position.x - 1, 5.5, ship.position.z - 10); o.look.set(12, 4, -52); o.fov = 58 - Math.min(t, 4) * 2; });
    await hero.wait(0.6);
    chain.raise(3.2);
    await hero.wait(4.0);
    s.stop();

    // ---- 8. the AXE, buried in a stack of cargo on the quay. Odysseus looks at it. Black.
    piles.set([{ name: "tower", capacity: 6, initial: [12, 77, 31, 45, 50, 63] }, { name: "spare", capacity: 4, initial: [] }]);
    const tw = trial.piles.tower;
    s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 6)); o.pos.set(tw.x - 2.8 + k, QUAY_TOP + 0.6 + k * 0.4, tw.z + 4.0 - k * 1.2); o.look.set(tw.x, QUAY_TOP + 1.6 - k * 0.8, tw.z); o.fov = 44 - k * 12; });
    await hero.wait(1.0);
    // the one fact from the crawl the trials need, word for word
    comic.caption("They bury the one blade that can cut it in a stack of cargo, where only the top can ever be reached.", { x: 6, y: 14, seconds: 4.4 });
    await hero.wait(4.0);
    s.stop();
    hero.teleport(tw.x + 2.4, tw.z + 3.4, 0, QUAY_TOP);
    hero.group.rotation.y = Math.atan2(tw.x - hero.group.position.x, tw.z - hero.group.position.z);
    s = shot(world, director, (t, o) => { const P = hero.group.position; o.pos.set(P.x + 1.6, P.y + 1.5, P.z + 2.4); o.look.set(P.x - 0.6, P.y + 1.4, P.z - 1.5); o.fov = 38; });
    await hero.wait(2.4);
    s.stop();
    await comic.black(true, 1.2);
  } finally {
    // whatever happened (even a skip), leave the harbour as the game needs it
    if (chain.lift) chain.lift = null;
    chain.sag = 13.5; chain.layChain();
    giant.hide(); crowd.forEach(g => g.hide());
    victim.visible = false;                        // she is at the bottom of the harbour now
    world.timeScale = 1;
    L.restore();
    fling.stop();
    comic.clear();
    world.grade.uniforms.letterbox.value = 0;
    world.grade.uniforms.freeze.value = 0;
    document.body.classList.remove("cinematic");
    piles.restore();
  }
}
