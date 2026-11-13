// circeSilhouette.js — Circe as one flat cut-out, drawn with curves (Kill Bill "pure theatre": a figure
// in a single flat colour against a bright disc). Drawn on a 600 x 1200 canvas, feet at the bottom edge.
//   • a crown of sun rays behind her head (daughter of Helios), hair in a high knot and down her back;
//   • a long gown that flares into a train; one arm raised with the cup (a kylix), wine dripping;
//   • the other hand on a tall staff with a sun on top.
// The cup and the sun are gold with a dark line so they read against the pale sun window.
export const SIL_W = 600, SIL_H = 1200;

export function drawCirce(g, { body = "#1d3fd1", gold = "#ffd21a", line = "#0d0b09", wine = "#d7261e" } = {}) {
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";

  // ---- the staff (behind her left hand), from the floor to the sun on top
  g.fillStyle = body;
  g.beginPath(); g.moveTo(150, 1192); g.lineTo(158, 118); g.lineTo(170, 118); g.lineTo(166, 1192); g.closePath(); g.fill();

  // ---- the crown of rays behind the head: twelve spikes on a fan
  const hx = 312, hy = 168;
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.08 + i * 0.07);            // a fan from lower-left over the top to lower-right
    const long = i % 2 === 0, r0 = 52, r1 = long ? 182 : 132;
    const a0 = a - 0.1, a1 = a + 0.1;
    g.moveTo(hx + Math.cos(a0) * r0, hy + Math.sin(a0) * r0);
    g.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
    g.lineTo(hx + Math.cos(a1) * r0, hy + Math.sin(a1) * r0);
  }
  g.fill();

  // ---- hair: a high knot, and a long fall down her back (to the viewer's left)
  g.beginPath(); g.ellipse(298, 98, 34, 30, -0.3, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(276, 140);
  g.bezierCurveTo(222, 200, 214, 330, 232, 430);
  g.bezierCurveTo(240, 480, 214, 540, 190, 572);
  g.bezierCurveTo(250, 548, 278, 470, 282, 400);
  g.lineTo(300, 220); g.closePath(); g.fill();

  // ---- head in profile, facing right: forehead, nose, lips, chin
  g.beginPath();
  g.moveTo(272, 150);
  g.bezierCurveTo(272, 104, 340, 96, 352, 140);     // crown to brow
  g.lineTo(356, 168);                                // forehead down to the bridge
  g.lineTo(372, 196);                                // the nose
  g.lineTo(356, 202);
  g.lineTo(360, 214); g.lineTo(354, 220); g.lineTo(358, 230);   // lips
  g.bezierCurveTo(352, 246, 334, 252, 320, 250);    // chin and jaw
  g.lineTo(316, 280);                                // the front of the neck
  g.lineTo(292, 286);
  g.bezierCurveTo(282, 240, 270, 200, 272, 150);
  g.closePath(); g.fill();

  // ---- shoulders, a high stiff collar, the bodice down to a narrow waist
  g.beginPath();
  g.moveTo(292, 268);
  g.bezierCurveTo(250, 276, 214, 286, 204, 312);    // left shoulder
  g.bezierCurveTo(214, 390, 250, 430, 268, 480);    // left side of the bodice
  g.lineTo(334, 480);
  g.bezierCurveTo(350, 430, 388, 380, 392, 312);    // right side
  g.bezierCurveTo(380, 284, 346, 272, 318, 268);
  g.closePath(); g.fill();
  // the collar: two stiff points standing up behind the jaw
  g.beginPath(); g.moveTo(262, 290); g.lineTo(244, 214); g.lineTo(298, 278); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(330, 280); g.lineTo(384, 236); g.lineTo(356, 300); g.closePath(); g.fill();

  // ---- the gown: from the waist it flares to the floor; the train sweeps out behind (left)
  g.beginPath();
  g.moveTo(268, 476);
  g.bezierCurveTo(238, 640, 190, 860, 110, 1060);   // the back of the skirt
  g.bezierCurveTo(80, 1130, 30, 1170, 8, 1196);     // the train
  g.lineTo(470, 1196);
  g.bezierCurveTo(452, 1120, 430, 1040, 412, 960);  // the hem at the front, a step forward
  g.bezierCurveTo(392, 840, 360, 640, 334, 476);
  g.closePath(); g.fill();
  // a slit and the front foot
  g.beginPath(); g.moveTo(406, 1196); g.lineTo(478, 1172); g.lineTo(500, 1196); g.closePath(); g.fill();

  // ---- the left arm down to the staff
  g.beginPath();
  g.moveTo(216, 316);
  g.bezierCurveTo(196, 380, 182, 450, 170, 520);
  g.lineTo(154, 560); g.lineTo(180, 572);           // the hand on the staff
  g.bezierCurveTo(196, 520, 222, 440, 240, 352);
  g.closePath(); g.fill();

  // ---- the right arm raised: shoulder, elbow out, forearm up, the hand under the cup
  g.beginPath();
  g.moveTo(372, 300);
  g.bezierCurveTo(410, 318, 446, 330, 470, 330);    // upper arm to the elbow
  g.bezierCurveTo(480, 300, 486, 250, 488, 214);    // forearm up
  g.lineTo(474, 204); g.lineTo(500, 200);           // the hand
  g.lineTo(506, 214);
  g.bezierCurveTo(504, 270, 500, 330, 486, 352);    // back of the forearm
  g.bezierCurveTo(450, 362, 400, 348, 372, 336);
  g.closePath(); g.fill();

  // ---- gold: a belt at the waist and a cuff on the raised wrist
  g.fillStyle = gold; g.strokeStyle = line; g.lineWidth = 4;
  g.beginPath(); g.moveTo(266, 470); g.lineTo(336, 470); g.lineTo(338, 490); g.lineTo(264, 490); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(266, 490); g.lineTo(296, 490); g.lineTo(290, 560); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(476, 250); g.lineTo(504, 250); g.lineTo(503, 268); g.lineTo(474, 268); g.closePath(); g.fill(); g.stroke();

  // ---- gold: the sun on the staff
  const sx = 164, sy = 92;
  g.fillStyle = gold; g.strokeStyle = line; g.lineWidth = 5;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, r = i % 2 ? 40 : 58;
    const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = body; g.beginPath(); g.arc(sx, sy, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = gold; g.beginPath(); g.arc(sx, sy, 13, 0, Math.PI * 2); g.fill();

  // ---- gold: the cup (a kylix: a wide shallow bowl, two handles, a short stem)
  const cx = 492, cy = 172;
  g.fillStyle = gold;
  g.beginPath();
  g.moveTo(cx - 70, cy - 22); g.lineTo(cx + 70, cy - 22);
  g.bezierCurveTo(cx + 60, cy + 10, cx + 22, cy + 22, cx, cy + 22);
  g.bezierCurveTo(cx - 22, cy + 22, cx - 60, cy + 10, cx - 70, cy - 22);
  g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(cx - 70, cy - 18); g.bezierCurveTo(cx - 94, cy - 26, cx - 96, cy - 2, cx - 66, cy - 4); g.stroke();
  g.beginPath(); g.moveTo(cx + 70, cy - 18); g.bezierCurveTo(cx + 94, cy - 26, cx + 96, cy - 2, cx + 66, cy - 4); g.stroke();
  g.beginPath(); g.rect(cx - 6, cy + 20, 12, 18); g.fill(); g.stroke();
  // the wine: a dark line at the rim, and drops running over the edge
  g.fillStyle = wine;
  g.beginPath(); g.ellipse(cx, cy - 22, 66, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx + 62, cy - 20); g.bezierCurveTo(cx + 70, cy - 6, cx + 64, cy + 12, cx + 68, cy + 30); g.lineTo(cx + 72, cy + 30); g.bezierCurveTo(cx + 74, cy + 8, cx + 76, cy - 8, cx + 66, cy - 20); g.fill();
  for (const [x, y, r] of [[cx + 70, cy + 52, 7], [cx + 70, cy + 84, 5], [cx + 70, cy + 120, 4]]) { g.beginPath(); g.ellipse(x, y, r * 0.8, r * 1.2, 0, 0, Math.PI * 2); g.fill(); }

  g.restore();
}
