// opening.js — Chapter One's opening, shot as a film (the grindhouse grade, no dialogue).
//  1. black screen, Tarantino-style text: where he is, what this place is, what he is up against
//  2. the harbour, silent, in the rain
//  3. Odysseus walks in; the frame freezes on his name (his titles and deeds so far)
//  4. he looks up: lightning, and the Laestrygonians on the cliff edges
//  5. one of his ships, moored, quiet... a boulder out of the dark breaks it in half
//  6. the reverse: Antiphates among the ruined columns, arm still out. Freeze on his name.
//  7. the chain comes up out of the sea across the mouth
//  8. the AXE, buried in a stack of cargo; Odysseus looks at it. Black.
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { CLIFF_GIANTS, THROW_RELEASE } from "./giant.js";
import { makeBoulder } from "./chainTower.js";
import { shot, cineLights, bolt, physics, splashAt, ease, ANTIPHATES_AT } from "./cine.js";

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

export async function playOpening(c) {
  const { world, hero, director, comic, giant, chain, trial, harbour, card, piles, crowd } = c;
  const L = cineLights(world);
  const ship = harbour.ship, victim = harbour.farShip;
  const fling = physics(world);
  document.body.classList.add("cinematic");
  comic.letterbox(true);
  chain.lower();                                   // the chain lies on the seabed; the harbour looks open
  giant.hide(); crowd.forEach(g => g.hide());

  try {
    // ---- 1. the crawl: yellow type rolling away into the dark
    await comic.crawl({ ...CRAWL, seconds: 46 });

    // ---- 2. the harbour: high over the mouth, gliding down to the fleet at the quay
    let s = shot(world, director, (t, o) => { const e = ease(Math.min(1, t / 8)); o.pos.set(34 - 15 * e, 22 - 18 * e, -70 + 62 * e); o.look.set(12, 2, -14 - 14 * (1 - e)); o.fov = 52 - 12 * e; });
    await hero.wait(3.2);
    bolt(harbour, -60, -260);
    await hero.wait(3.6);
    s.stop();

    // ---- 3. Odysseus walks down the pier at a low camera... and the frame freezes on his name
    hero.teleport(13.5, -10.5, 0, QUAY_TOP);
    s = shot(world, director, (t, o) => { o.pos.set(13.0, 1.75, -1.9); o.look.set(hero.group.position.x, 3.0, hero.group.position.z - 1); o.fov = 34; });
    await hero.walkTo(13.5, -5.4);
    await hero.wait(0.25);
    bolt(harbour, -20, -120);
    await director.freeze(card.name, card.sub, 3.0);
    s.stop();

    // ---- 4. he looks up. Lightning. On the cliff edges, shapes that should not be that big.
    crowd.forEach((g, i) => { const [x, z, , y] = CLIFF_GIANTS[i]; g.place(x, y, z, ship.position.x, ship.position.z - 20); g.play("idle", 0); });
    // a slow pan along the cliff tops, from the ones on the left to the ones on the right
    s = shot(world, director, (t, o) => { const k = ease(Math.min(1, t / 6.5)); o.pos.set(13.5, 2.2, -8); o.look.set(-52 + 104 * k, 64 + 4 * k, -78 - 14 * k); o.fov = 42; });
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
    // it breaks the ship's back: she folds, rolls and goes down
    s.o.shake = 1.4;
    splashAt(world, to, 3);
    for (let k = 0; k < 8; k++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 1.8 + Math.random()), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.9 })); pl.position.copy(to); world.scene.add(pl); fling(pl, new THREE.Vector3((Math.random() - 0.5) * 14, 6 + Math.random() * 8, (Math.random() - 0.5) * 14), new THREE.Vector3(6, 0, 5)); }
    fling(boulder, new THREE.Vector3(0, -2, 0), new THREE.Vector3(0.5, 0, 0.5));
    const v0 = victim.position.clone();
    await hero.over(3.0, k => { victim.position.y = v0.y - 7 * k * k; victim.rotation.z = 0.7 * ease(k); victim.rotation.x = 0.25 * k; });
    s.stop();

    // ---- 6. who threw it. From out on the water, clear of the columns: all of him, arm still out.
    //      Then the camera lunges at him, shaking, into his face, and he roars. Freeze on his name.
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
    // the crash zoom: 0.45 s from the whole of him to his face, the camera jolting as it goes
    giant.play("roar", 0.15);
    s = shot(world, director, (t, o) => {
      giant.headPos(head);
      const k = ease(Math.min(1, t / 0.45));
      o.pos.copy(camAt).lerp(head, 0.2 * k);
      o.look.copy(G).add(new THREE.Vector3(0, 19, 0)).lerp(head, k);
      o.fov = 56 - 44 * k;
      // handheld: a hard jolt on the zoom, then a nervous tremble on the close-up
      const j = t < 0.6 ? 0.9 : 0.12;
      o.look.x += (Math.random() - 0.5) * j; o.look.y += (Math.random() - 0.5) * j;
    });
    await hero.wait(0.45);
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
    await hero.wait(5.0);
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
    comic.clear();
    document.body.classList.remove("cinematic");
    piles.restore();
  }
}
