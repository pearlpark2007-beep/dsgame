// athenaExpr.js — Athena reads one line of C and works out, from the interpreter's own frames, what each
// part of it is worth. It never runs C itself (no eval): it only reads values the interpreter already
// recorded (pointers, variables, each node's data and next). Anything it can't read safely, it leaves
// alone, and Athena falls back to the plain explanation.
//
//   analyse("head = head->next;")  ->  { kind: "assign", lhs: {name:"head"}, rhs: <expr> }
//   evaluate(expr, frame)           ->  { value, steps: [ {text, value, from: {addr, field}} ... ] }
export const NULL = 0;
export const hex = a => (a === NULL || a == null ? "NULL" : "0x" + Number(a).toString(16).toUpperCase());
const strip = l => l.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "").trim();

// ---------- tokens
function tokens(src) {
  const out = []; const re = /\s*(->|==|!=|<=|>=|&&|\|\||[A-Za-z_]\w*|\d+|[-+*/<>=!(),;&*{}])/y;
  let m; re.lastIndex = 0;
  while (re.lastIndex < src.length && (m = re.exec(src))) out.push(m[1]);
  return out;
}

// ---------- a small expression parser: primary (->field)* with binary operators
function parseExpr(t) {
  let i = 0;
  const peek = () => t[i], next = () => t[i++];
  const PREC = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5 };
  function primary() {
    const x = next();
    if (x === "(") { const e = bin(0); next(); return e; }
    if (x === undefined) throw 0;
    let node;
    if (/^\d+$/.test(x)) node = { k: "num", v: +x, text: x };
    else if (x === "NULL") node = { k: "null", text: "NULL" };
    else if (/^[A-Za-z_]\w*$/.test(x)) {
      if (peek() === "(") {                                   // a call: name(args)
        next(); const args = [];
        while (peek() !== ")" && peek() !== undefined) { args.push(bin(0)); if (peek() === ",") next(); }
        next();
        node = { k: "call", name: x, args, text: `${x}(${args.map(a => a.text).join(", ")})` };
      } else node = { k: "id", name: x, text: x };
    } else throw 0;
    while (peek() === "->") { next(); const f = next(); if (f !== "next" && f !== "data") throw 0; node = { k: "field", of: node, field: f, text: `${node.text}->${f}` }; }
    return node;
  }
  function bin(min) {
    let l = primary();
    while (PREC[peek()] && PREC[peek()] > min) { const op = next(); const r = bin(PREC[op]); l = { k: "bin", op, l, r, text: `${l.text} ${op} ${r.text}` }; }
    return l;
  }
  const e = bin(0);
  return e;
}

// what a line does, by shape
export function analyse(line) {
  const s = strip(line).replace(/;$/, "").trim();
  if (!s) return { kind: "none" };
  try {
    let m;
    if ((m = s.match(/^(?:struct\s+Node\s*\*\s*|int\s+)([A-Za-z_]\w*)\s*=\s*\(struct Node\s*\*\)\s*malloc/))) return { kind: "malloc", lhs: { k: "id", name: m[1], text: m[1] } };
    if ((m = s.match(/^free\s*\((.+)\)$/))) return { kind: "free", arg: parseExpr(tokens(m[1])) };
    if ((m = s.match(/^return\s*(.*)$/))) return { kind: "return", expr: m[1] ? parseExpr(tokens(m[1])) : null };
    if ((m = s.match(/^(if|while)\s*\((.*)\)\s*(\{|.*)$/))) return { kind: "cond", word: m[1], expr: parseExpr(tokens(m[2])) };
    if ((m = s.match(/^for\s*\((.*);(.*);(.*)\)/))) return { kind: "for", expr: parseExpr(tokens(m[2])) };
    if ((m = s.match(/^(struct\s+Node\s*\*\s*|int\s+)?([A-Za-z_]\w*(?:\s*->\s*(?:next|data))*)\s*=\s*(.+)$/)) && !/[=!<>]=/.test(m[2])) {
      const lhs = parseExpr(tokens(m[2])), rhs = parseExpr(tokens(m[3]));
      return { kind: "assign", decl: !!m[1], lhs, rhs };
    }
    if ((m = s.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/))) return { kind: "callstmt", expr: parseExpr(tokens(s)) };
    if (/^(struct\s+Node\s*\*|int|void)\s*\w+\s*\(.*\)\s*\{$/.test(s)) return { kind: "signature" };
  } catch (e) { /* not a shape Athena reads: she only explains it in words */ }
  return { kind: "other" };
}

// the value of an expression in a frame, and the trail of sub-values that got there
export function evaluate(e, f) {
  const steps = [];
  function val(n) {
    if (!n) return undefined;
    switch (n.k) {
      case "num": return n.v;
      case "null": return NULL;
      case "id": {
        if (n.name in f.ptrs) { const v = f.ptrs[n.name]; steps.push({ text: n.text, value: v, ptr: true, name: n.name }); return v; }
        if (f.vars && n.name in f.vars) { const v = f.vars[n.name]; steps.push({ text: n.text, value: v, name: n.name }); return v; }
        return undefined;
      }
      case "field": {
        const a = val(n.of); if (a === undefined || a === NULL) return undefined;
        const node = f.nodes[a]; if (!node || node.freed) return undefined;
        const v = node[n.field];
        steps.push({ text: n.text, value: v, ptr: n.field === "next", from: { addr: a, field: n.field } });
        return v;
      }
      case "bin": {
        const a = val(n.l); if (a === undefined) return undefined;
        if (n.op === "&&" && !a) return false;                    // C stops here: the right side is never read
        if (n.op === "||" && a) return true;
        const b = val(n.r); if (b === undefined) return undefined;
        switch (n.op) { case "==": return a === b; case "!=": return a !== b; case "<": return a < b; case "<=": return a <= b; case ">": return a > b; case ">=": return a >= b; case "&&": return a && b; case "||": return a || b; case "+": return a + b; case "-": return a - b; }
        return undefined;
      }
      default: return undefined;
    }
  }
  const value = val(e);
  return { value, steps };
}
export function show(v, isPtr) { return v === true ? "true" : v === false ? "false" : isPtr ? hex(v) : String(v); }
