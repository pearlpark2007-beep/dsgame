// bake.js — turn a group of many small meshes into one mesh per material (few draw calls on a weak laptop).
// Instanced meshes inside the group are expanded into plain triangles first.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// geometry → only position, normal, uv (so pieces from different builders can be merged)
function clean(g) {
  const out = (g.index ? g.toNonIndexed() : g.clone());
  for (const k of Object.keys(out.attributes)) if (!["position", "normal", "uv"].includes(k)) out.deleteAttribute(k);
  if (!out.attributes.uv) out.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
}

// returns a new Group holding one Mesh per material; `keep` meshes (e.g. a hatch that must move) are left as they are
export function bakeByMaterial(group, { keep = [], castShadow = true, receiveShadow = true } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const m = new THREE.Matrix4(), im = new THREE.Matrix4();
  group.traverse(o => {
    if (!o.isMesh || keep.includes(o)) return;
    let skip = false; for (let p = o.parent; p; p = p.parent) if (keep.includes(p)) skip = true;
    if (skip) return;
    const base = clean(o.geometry);
    const list = byMat.get(o.material) || []; byMat.set(o.material, list);
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, im);
        m.multiplyMatrices(inv, o.matrixWorld).multiply(im);
        list.push(base.clone().applyMatrix4(m));
      }
    } else list.push(base.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  const out = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
    out.add(mesh);
    geos.forEach(g => g.dispose());
  }
  for (const k of keep) { k.updateMatrixWorld(true); const w = k.matrixWorld.clone(); out.add(k); k.matrix.multiplyMatrices(inv, w); k.matrix.decompose(k.position, k.quaternion, k.scale); }
  return out;
}

// counts what the GPU will draw for an object: meshes (≈ draw calls) and triangles
export function stats(obj) {
  let meshes = 0, tris = 0;
  obj.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
  });
  return { meshes, tris: Math.round(tris) };
}
