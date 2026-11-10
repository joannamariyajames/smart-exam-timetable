/**
 * GRAPH THEORY MODULE
 * Conflict graph G = (V, E):
 *   V = subjects
 *   E = { {u,v} : students(u) ∩ students(v) ≠ ∅ }
 * Stored both as an adjacency matrix and an adjacency list.
 */
(function (root) {
  "use strict";
  const S = typeof require !== "undefined" ? require("./sets.js") : root.SetOps;

  /**
   * @param {string[]} subjects  vertex labels
   * @param {Object<string,Set<string>>} enrol  subject -> set of students
   */
  function buildGraph(subjects, enrol) {
    const n = subjects.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    const list = subjects.map(() => []);
    const edges = [];
    const common = {}; // "i-j" -> Set of shared students (A ∩ B)

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const shared = S.intersection(enrol[subjects[i]], enrol[subjects[j]]);
        if (shared.size > 0) {
          matrix[i][j] = matrix[j][i] = 1;
          list[i].push(j);
          list[j].push(i);
          edges.push([i, j]);
          common[i + "-" + j] = shared;
        }
      }
    }
    const degree = list.map((l) => l.length);
    return { subjects, n, matrix, list, edges, degree, common };
  }

  const api = { buildGraph };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GraphLib = api;
})(typeof window !== "undefined" ? window : globalThis);
