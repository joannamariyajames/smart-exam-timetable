// Run with: node tests/run.js
const assert = require("assert");
const S = require("../js/sets.js");
const { buildGraph } = require("../js/graph.js");
const C = require("../js/coloring.js");

const A = new Set([1, 2, 3]), B = new Set([3, 4]);
assert.deepStrictEqual([...S.union(A, B)].sort(), [1, 2, 3, 4]);
assert.deepStrictEqual([...S.intersection(A, B)], [3]);
assert.deepStrictEqual([...S.difference(A, B)].sort(), [1, 2]);
assert.deepStrictEqual([...S.difference(B, A)], [4]);
assert.ok(S.conflicts(A, B));
assert.ok(!S.conflicts(A, new Set([9])));

// triangle + pendant: chi = 3
const enrol = {
  M: new Set(["a", "b"]), P: new Set(["b", "c"]), C: new Set(["c", "a"]), E: new Set(["z", "a"]),
};
const subjects = Object.keys(enrol);
const g = buildGraph(subjects, enrol);
assert.strictEqual(g.edges.length, 5); // M-P, M-C, P-C, M-E, C-E
for (const key of Object.keys(C.ALGORITHMS)) {
  const r = C.ALGORITHMS[key].fn(g);
  assert.deepStrictEqual(C.verify(g, r.color), [], key + " produced a clash");
  assert.ok(r.slots >= 3, key + " used fewer than clique size");
}
assert.strictEqual(C.cliqueLowerBound(g), 3);

// symmetric matrix, zero diagonal
for (let i = 0; i < g.n; i++) {
  assert.strictEqual(g.matrix[i][i], 0);
  for (let j = 0; j < g.n; j++) assert.strictEqual(g.matrix[i][j], g.matrix[j][i]);
}

// random stress: colourings always proper
function rng(s) { return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const r = rng(42);
for (let t = 0; t < 200; t++) {
  const n = 2 + Math.floor(r() * 14), e = {};
  const names = [...Array(n).keys()].map((i) => "S" + i);
  names.forEach((s) => { e[s] = new Set(); for (let k = 0; k < 20; k++) if (r() < 0.2) e[s].add("st" + k); });
  const gg = buildGraph(names, e);
  for (const key of Object.keys(C.ALGORITHMS)) {
    const res = C.ALGORITHMS[key].fn(gg);
    assert.deepStrictEqual(C.verify(gg, res.color), []);
    assert.ok(res.slots >= C.cliqueLowerBound(gg));
  }
}
console.log("All tests passed");
