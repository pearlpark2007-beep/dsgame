// nav.js — finds a walking path around obstacles (A* search on a grid).
// The island registers what is solid (boards, braziers, barrels, piles) and where it is walkable
// (the quay, the pier). walkTo() then asks for a path, so Odysseus never walks through anything.
// (A* is itself a graph search: each grid cell is a node, each step to a neighbour is an edge.)
export class Nav {
  constructor({ minX, maxX, minZ, maxZ, cell = 0.2, clearance = 0.42 }) {
    Object.assign(this, { minX, maxX, minZ, maxZ, cell, clearance });
    this.cols = Math.ceil((maxX - minX) / cell); this.rows = Math.ceil((maxZ - minZ) / cell);
    this.walkable = [];      // rectangles you may stand in
    this.obstacles = new Map();
    this.dirty = true;
  }
  addWalkable(x0, z0, x1, z1) { this.walkable.push([x0, z0, x1, z1]); this.dirty = true; }
  addCircle(id, x, z, r) { this.obstacles.set(id, { kind: "c", x, z, r }); this.dirty = true; }
  // a box of width w (along its own x) and depth d, turned by angle ry
  addBox(id, x, z, w, d, ry = 0) { this.obstacles.set(id, { kind: "b", x, z, w, d, ry }); this.dirty = true; }
  remove(id) { this.obstacles.delete(id); this.dirty = true; }

  _blockedAt(x, z) {
    if (!this.walkable.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) return true;
    const c = this.clearance;
    for (const o of this.obstacles.values()) {
      if (o.kind === "c") { if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + c) ** 2) return true; }
      else {
        const dx = x - o.x, dz = z - o.z, cs = Math.cos(o.ry), sn = Math.sin(o.ry);
        const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;           // into the box's own frame
        if (Math.abs(lx) < o.w / 2 + c && Math.abs(lz) < o.d / 2 + c) return true;
      }
    }
    return false;
  }
  _build() {
    this.grid = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) for (let q = 0; q < this.cols; q++)
      this.grid[r * this.cols + q] = this._blockedAt(this.minX + (q + 0.5) * this.cell, this.minZ + (r + 0.5) * this.cell) ? 1 : 0;
    this.dirty = false;
  }
  _cellOf(x, z) { return [Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.minX) / this.cell))), Math.min(this.rows - 1, Math.max(0, Math.floor((z - this.minZ) / this.cell)))]; }
  _centre(q, r) { return { x: this.minX + (q + 0.5) * this.cell, z: this.minZ + (r + 0.5) * this.cell }; }
  _free(q, r) { return q >= 0 && r >= 0 && q < this.cols && r < this.rows && !this.grid[r * this.cols + q]; }
  // nearest free cell to a blocked one (so targets right next to a pile still work)
  _nearestFree(q, r) {
    if (this._free(q, r)) return [q, r];
    for (let rad = 1; rad < 20; rad++) for (let dq = -rad; dq <= rad; dq++) for (const dr of [-rad, rad]) {
      if (this._free(q + dq, r + dr)) return [q + dq, r + dr];
      if (this._free(q + dr, r + dq)) return [q + dr, r + dq];
    }
    return [q, r];
  }
  // a clear straight line? (used to shorten the zig-zag grid path)
  _lineFree(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (this.cell * 0.5));
    for (let i = 1; i < n; i++) { const t = i / n, [q, r] = this._cellOf(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); if (!this._free(q, r)) return false; }
    return true;
  }

  path(fromX, fromZ, toX, toZ) {
    if (this.dirty) this._build();
    const start = this._nearestFree(...this._cellOf(fromX, fromZ)), goal = this._nearestFree(...this._cellOf(toX, toZ));
    const C = this.cols, key = (q, r) => r * C + q;
    const g = new Float32Array(C * this.rows).fill(Infinity), came = new Int32Array(C * this.rows).fill(-1), closed = new Uint8Array(C * this.rows);
    const h = (q, r) => Math.hypot(q - goal[0], r - goal[1]);
    const open = new Heap();
    open.push([h(...start), start[0], start[1]]);
    g[key(...start)] = 0;
    const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (open.size) {
      const [, q, r] = open.pop(), k = key(q, r);          // the most promising cell so far
      if (closed[k]) continue;
      closed[k] = 1;
      if (q === goal[0] && r === goal[1]) { found = true; break; }
      for (const [dq, dr, cost] of steps) {
        const nq = q + dq, nr = r + dr;
        if (!this._free(nq, nr) || (dq && dr && (!this._free(q + dq, r) || !this._free(q, r + dr)))) continue;
        const nk = key(nq, nr), ng = g[k] + cost;
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; open.push([ng + h(nq, nr), nq, nr]); }
      }
    }
    if (!found) return [{ x: toX, z: toZ }];
    const cells = [];
    for (let k = key(...goal); k !== -1; k = came[k]) cells.push(this._centre(k % C, Math.floor(k / C)));
    cells.reverse();
    // shorten: keep only the corners needed to see from one to the next
    const pts = [{ x: fromX, z: fromZ }, ...cells.slice(1, -1), { x: toX, z: toZ }];
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this._lineFree(pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    return out.slice(1);
  }
}

// a binary min-heap: always hands back the entry with the smallest first number, in O(log n)
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}
