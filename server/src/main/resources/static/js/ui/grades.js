// grades.js — the four chapters' colour grades: one cinematographer, four treatments.
// They only set the existing grade shader's settings (world.js); there is no extra pass.
//   print: how much of the magenta/brown film-print tint · sat: saturation
//   lift: a tint added to the shadows (RGB) · gain: a tint on the highlights (RGB)
// Circe's values are the reference the others were calibrated against.
export const GRADES = {
  // STORM / STEEL / BRASS: cold blue-grey shadows, slate mids, silver lightning, warm lamps kept small.
  // Tuned for legibility (as the Cave was): less halo and vignette, finer grain, so values, labels and code stay sharp
  harbour: { strength: 0.55, print: 0.15, sat: 0.86, lift: [0.008, 0.014, 0.03], gain: [0.98, 1.0, 1.04], keepBlue: 0.8, halo: 0.12, grain: 0.03, burn: 0.3, mono: 0 },
  // EMBER / OBSIDIAN / MOONLIGHT (light, per the redesign): charcoal shadows with a blue-grey bias, warm but
  // restrained fire, the moonlight kept cold; almost no halo, so fire never blooms over labels or code
  cave: { strength: 0.45, print: 0.18, sat: 0.92, lift: [0.004, 0.008, 0.018], gain: [1.02, 1.0, 0.97], keepBlue: 0.85, halo: 0.06, grain: 0.022, burn: 0.24, mono: 0 },
  // HELIOS NOON: the reference (clean, bright, cobalt kept, no glow)
  circe: { strength: 0.45, print: 1, sat: 1, lift: [0, 0, 0], gain: [1, 1, 1], keepBlue: 0.85, halo: 0, grain: 0.025, burn: 0.12, mono: 0 },
  // MONOCHROME / BLOOD: everything but red drains away, hard cold fluorescent highlights
  // THE ATLAS OF LAST VOYAGES: no grade at all in play (no weave, flicker, halo, grain or burned edges): every value must stay crisp
  underworld: { strength: 0, print: 0, sat: 1, lift: [0, 0, 0], gain: [1, 1, 1], keepBlue: 1, halo: 0, grain: 0, burn: 0, mono: 0 },
  // the title screen: dusk at sea, warm and quiet
  title: { strength: 0.55, print: 0.4, sat: 0.95, lift: [0.004, 0.004, 0.012], gain: [1.05, 1.0, 0.92], keepBlue: 0.7, halo: 0.4, grain: 0.03, burn: 0.35, mono: 0 }
};

export function applyGrade(world, name) {
  const g = GRADES[name], u = world && world.grade && world.grade.uniforms;
  if (!g || !u) return;
  for (const k of ["strength", "print", "sat", "keepBlue", "halo", "grain", "burn", "mono"]) if (u[k]) u[k].value = g[k];
  if (u.lift) u.lift.value.set(...g.lift);
  if (u.gain) u.gain.value.set(...g.gain);
  world.gradeName = name;
  world.gradeGrain = g.grain;            // world.js eases grain down during comic panels: it starts from this
}
