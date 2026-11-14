// grades.js — the four chapters' colour grades: one cinematographer, four treatments.
// They only set the existing grade shader's settings (world.js); there is no extra pass.
//   print: how much of the magenta/brown film-print tint · sat: saturation
//   lift: a tint added to the shadows (RGB) · gain: a tint on the highlights (RGB)
// Circe's values are the reference the others were calibrated against.
export const GRADES = {
  // STORM / STEEL / BRASS: cold blue-grey shadows, slate mids, silver lightning, warm lamps kept small
  harbour: { strength: 0.7, print: 0.15, sat: 0.82, lift: [0, 0.006, 0.018], gain: [0.98, 1.0, 1.04], keepBlue: 0.75, halo: 0.35, grain: 0.045, burn: 0.45, mono: 0 },
  // EMBER / OBSIDIAN / MOONLIGHT: charcoal shadows, warm firelight, the blue shafts and teal worms survive
  cave: { strength: 0.75, print: 0.25, sat: 0.96, lift: [0, 0.003, 0.012], gain: [1.03, 1.0, 0.95], keepBlue: 0.85, halo: 0.5, grain: 0.045, burn: 0.6, mono: 0 },
  // HELIOS NOON: the reference (clean, bright, cobalt kept, no glow)
  circe: { strength: 0.45, print: 1, sat: 1, lift: [0, 0, 0], gain: [1, 1, 1], keepBlue: 0.85, halo: 0, grain: 0.025, burn: 0.12, mono: 0 },
  // MONOCHROME / BLOOD: everything but red drains away, hard cold fluorescent highlights
  underworld: { strength: 0.6, print: 0, sat: 1, lift: [0, 0, 0], gain: [0.98, 1.0, 1.03], keepBlue: 0, halo: 0.3, grain: 0.035, burn: 0.4, mono: 1 },
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
