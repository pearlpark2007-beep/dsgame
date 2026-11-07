// harbourNav.js — where Odysseus can walk in the Harbour, and everything he must walk around.
// Positions match where harbourScene.js, techProps.js and trialSet.js place things.
import { Nav } from "../../engine/nav.js";

export function buildHarbourNav(trial) {
  const nav = new Nav({ minX: -40, maxX: 30, minZ: -24, maxZ: 12, cell: 0.2, clearance: 0.4 });
  nav.addWalkable(-40, -3.3, 30, 12);          // the quay (its sea edge is at z = -4)
  nav.addWalkable(12.4, -23, 14.6, -3.2);      // the wooden pier
  let n = 0;
  const circle = (x, z, r) => nav.addCircle("o" + n++, x, z, r);
  const box = (x, z, w, d, ry = 0) => nav.addBox("o" + n++, x, z, w, d, ry);
  // fire bowls and lantern posts
  [[-6.5, -2.6], [6.5, -2.6], [13.5, -21.5]].forEach(([x, z]) => circle(x, z, 0.45));
  [[11.9, -8], [15.1, -8], [11.9, -15], [15.1, -15], [-11, -3.2], [11, -3.2]].forEach(([x, z]) => circle(x, z, 0.15));
  // barrels, chests, amphora clusters, buckets, the rope coil
  [[-9, 2.5], [9.5, 4], [17, -1.5]].forEach(([x, z]) => circle(x, z, 2.2));
  [[-8.2, -0.5], [8.6, 1.2], [10.3, 1.0], [9.4, 1.05], [-36, 2]].forEach(([x, z]) => circle(x, z, 0.85));
  [[4.5, 3.2], [-4.8, 4.5], [18.5, 2]].forEach(([x, z]) => circle(x, z, 1.15));
  [[-5.5, 1.5], [6, -0.4], [12.5, 2.6]].forEach(([x, z]) => circle(x, z, 0.3));
  circle(3.2, 0.6, 0.5);
  // the ruined colonnade, its drums and the fallen column
  [[-12, 3.5], [-16.5, 3.5], [-21, 3.5], [-25.5, 3.5], [-30, 3.5], [-34.5, 3.5], [-12, 9.5], [-21, 9.5], [-30, 9.5], [-39, 9.5], [16, 7], [22, 7], [28, 7]]
    .forEach(([x, z]) => circle(x, z, 0.95));
  [[-15, 0.4], [-28.5, 0.8], [-34.5, 5.6], [-19, 6.8], [-20.4, 6.9], [24.5, 4.2]].forEach(([x, z]) => circle(x, z, 0.75));
  box(-19.5, 6.5, 8.2, 1.4, 0.4);
  // the King's law board and the harbour manifest
  box(-9.6, 4.6, 3.3, 0.35, 0.55);
  box(6.2, -0.4, 2.1, 0.7, -0.45);
  // the trial piles and their gauge posts
  for (const p of Object.values(trial.piles)) { box(p.x, p.z, 0.62, 0.48); circle(p.x - 0.78, p.z - 0.05, 0.22); }
  return nav;
}
