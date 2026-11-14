// caveOutside.js — the world outside the cave: a cliff face with the cave mouth in it, a slope of turf down
// to a beach, the sea, Odysseus's ship, and a low sun. The opening arrives through it at dusk; the climax
// escapes into it at dawn. Built once per film and removed after.
import * as THREE from "three";
import { DOOR_AT } from "./caveScene.js";
import { crag } from "./caveRock.js";
import { stoneTexture } from "../../engine/textures.js";
import { Sea } from "../../engine/sea.js";
import { buildTrireme } from "../harbour/trireme.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = k => k * k * (3 - 2 * k);

export // the outside: a cliff face with the cave mouth in it, a slope down to a beach, the sea, the ship, a dawn sky
function buildOutside(world, { dusk = false } = {}) {
  const g = new THREE.Group(); g.visible = false; world.scene.add(g);
  const st = stoneTexture({ seed: 44, base: [140, 124, 104], dark: [62, 54, 46], moss: [90, 96, 60], repeat: 6 });
  const rock = new THREE.MeshStandardMaterial({ ...st, roughness: 1 });
  const face = new THREE.Shape();
  face.moveTo(-40, -20); face.lineTo(40, -20); face.lineTo(40, 34); face.lineTo(-40, 34); face.lineTo(-40, -20);
  const hole = new THREE.Path();
  hole.moveTo(-4.0, 0); hole.lineTo(-3.9, 6); hole.quadraticCurveTo(0, 12.8, 3.9, 6); hole.lineTo(4.0, 0); hole.lineTo(-4.0, 0);
  face.holes.push(hole);
  const fg = new THREE.ExtrudeGeometry(face, { depth: 2.5, bevelEnabled: false, curveSegments: 16 });
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), y = fp.getY(i), z = fp.getZ(i);
    const far = Math.min(1, Math.max(0, (Math.hypot(x / 5, (y - 5) / 8) - 1) / 1.5));
    if (z < 0.1) fp.setZ(i, z - far * (Math.sin(x * 0.5) * Math.cos(y * 0.4) * 1.6 + Math.sin(x * 1.3 + y) * 0.6 + 1.5));
  }
  fg.computeVertexNormals();
  const wall = new THREE.Mesh(fg, rock);
  wall.rotation.y = -Math.PI / 2; wall.position.set(DOOR_AT.x - 3.6, 0, DOOR_AT.z);
  wall.castShadow = wall.receiveShadow = true; g.add(wall);
  for (const [x, y, z, s] of [[-28, 25, -6, 10], [-29, 14, 18, 10], [-29, 13, -30, 11], [-28, 33, 12, 12], [-28, 32, -24, 12]]) {
    const c = crag(x + z, { sx: s * 0.7, sy: s, sz: s * 1.2, strata: 1.4 }); c.translate(x, y, z);
    const m = new THREE.Mesh(c, new THREE.MeshStandardMaterial({ ...st, vertexColors: true, roughness: 1 })); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  const groundY = x => x > -30 ? 0 : x > -58 ? -12 * ease((-30 - x) / 28) : -12 - (-58 - x) * 0.45;
  const gg = new THREE.PlaneGeometry(90, 90, 90, 60);
  const gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i) - 52, z = gp.getY(i); gp.setXYZ(i, x, groundY(x) + Math.sin(x * 0.7 + z * 0.5) * 0.25 + Math.sin(z * 0.23) * 0.6, -z); }
  gg.computeVertexNormals();
  const turf = stoneTexture({ seed: 12, base: [118, 112, 80], dark: [60, 58, 40], moss: [86, 104, 56], repeat: 14 });
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ ...turf, roughness: 1, side: THREE.DoubleSide }));
  ground.position.z = DOOR_AT.z; ground.receiveShadow = true; g.add(ground);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; void main(){
      float h = clamp(vP.y, -0.2, 1.0);
      ${dusk ? 'vec3 low = vec3(0.95, 0.46, 0.22), mid = vec3(0.50, 0.30, 0.36), high = vec3(0.10, 0.14, 0.27);' : 'vec3 low = vec3(1.0, 0.62, 0.32), mid = vec3(0.86, 0.55, 0.45), high = vec3(0.30, 0.42, 0.62);'}
      vec3 c = mix(low, mid, smoothstep(0.0, 0.18, h)); c = mix(c, high, smoothstep(0.18, 0.7, h));
      float sun = pow(max(dot(vP, normalize(vec3(-1.0, 0.08, 0.15))), 0.0), 220.0) * 3.0 + pow(max(dot(vP, normalize(vec3(-1.0, 0.08, 0.15))), 0.0), 8.0) * 0.35;
      gl_FragColor = vec4(c + vec3(1.0, 0.8, 0.5) * sun, 1.0); }`
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat));
  const sun = new THREE.DirectionalLight(0xffc890, 0); sun.position.set(-120, 30, 20); sun.target.position.set(-30, 0, -6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 300 });
  g.add(sun, sun.target);
  const skyFill = new THREE.HemisphereLight(0x9ab0d0, 0x5a4a30, 0); g.add(skyFill);
  const ship = buildTrireme({ length: 30 });
  ship.rotation.y = 0.15; ship.position.set(-78, -13.9, -4); g.add(ship);
  let sea = null;
  return {
    group: g, ship, sun, skyFill, groundY, get sea() { return sea; },
    // the real height of the ground at a point (the slope plus the same bumps the mesh was built with)
    heightAt(x, z) { const zp = DOOR_AT.z - z; return groundY(x) + Math.sin(x * 0.7 + zp * 0.5) * 0.25 + Math.sin(zp * 0.23) * 0.6; },
    show(on) {
      g.visible = on; sun.intensity = on ? (dusk ? 1.5 : 2.4) : 0; skyFill.intensity = on ? (dusk ? 0.6 : 1.1) : 0;
      if (on && !sea) { sea = world.add(new Sea(world, { color: 0x1a3440, sunDir: V(-1, 0.2, 0.15), sunColor: 0xffb070 })); sea.water.position.y = -13; }
      if (sea) sea.water.visible = on;
    },
    // take everything out again (the sea too: it is not part of the group), so films never pile up copies
    dispose() {
      this.show(false); world.scene.remove(g);
      if (sea) { world.scene.remove(sea.water); const i = world.updaters.indexOf(sea); if (i >= 0) world.updaters.splice(i, 1); sea = null; }
    }
  };
}

