/**
 * GRAPH COLOURING MODULE
 * A proper colouring gives adjacent vertices different colours.
 * Colour = exam time slot. Fewer colours = shorter exam period.
 */
(function (root) {
  "use strict";

  /** Smallest colour not used by any already-coloured neighbour. */
  function smallestFree(g, v, color) {
    const used = new Set();
    for (const u of g.list[v]) if (color[u] !== -1) used.add(color[u]);
    let c = 0;
    while (used.has(c)) c++;
    return c;
  }

  function finish(g, color, steps) {
    const slots = color.length ? Math.max(...color) + 1 : 0;
    return { color, slots, steps };
  }

  /** Greedy in the given vertex order (input order). */
  function greedy(g) {
    const color = new Array(g.n).fill(-1);
    const steps = [];
    for (let v = 0; v < g.n; v++) {
      color[v] = smallestFree(g, v, color);
      steps.push({ v, c: color[v] });
    }
    return finish(g, color, steps);
  }

  /** Welsh–Powell: greedy, highest degree first. */
  function welshPowell(g) {
    const order = [...Array(g.n).keys()].sort(
      (a, b) => g.degree[b] - g.degree[a] || a - b
    );
    const color = new Array(g.n).fill(-1);
    const steps = [];
    for (const v of order) {
      color[v] = smallestFree(g, v, color);
      steps.push({ v, c: color[v] });
    }
    return finish(g, color, steps);
  }

  /** DSATUR: always colour the vertex with most distinctly-coloured neighbours. */
  function dsatur(g) {
    const color = new Array(g.n).fill(-1);
    const steps = [];
    const sat = (v) => new Set(g.list[v].map((u) => color[u]).filter((c) => c !== -1)).size;
    for (let k = 0; k < g.n; k++) {
      let best = -1, bs = -1, bd = -1;
      for (let v = 0; v < g.n; v++) {
        if (color[v] !== -1) continue;
        const s = sat(v);
        if (s > bs || (s === bs && g.degree[v] > bd)) { best = v; bs = s; bd = g.degree[v]; }
      }
      color[best] = smallestFree(g, best, color);
      steps.push({ v: best, c: color[best] });
    }
    return finish(g, color, steps);
  }

  const ALGORITHMS = {
    dsatur: { name: "DSATUR", fn: dsatur },
    welsh: { name: "Welsh–Powell", fn: welshPowell },
    greedy: { name: "Greedy (input order)", fn: greedy },
  };

  /** Check no edge joins two same-coloured vertices. Returns list of violations. */
  function verify(g, color) {
    return g.edges.filter(([u, v]) => color[u] === color[v]);
  }

  /** Lower bound on χ(G): size of a greedily found clique (ω ≤ χ). */
  function cliqueLowerBound(g) {
    let best = g.n ? 1 : 0;
    for (let s = 0; s < g.n; s++) {
      const clique = [s];
      const cand = [...g.list[s]].sort((a, b) => g.degree[b] - g.degree[a]);
      for (const v of cand) {
        if (clique.every((u) => g.matrix[u][v])) clique.push(v);
      }
      if (clique.length > best) best = clique.length;
    }
    return best;
  }

  const api = { greedy, welshPowell, dsatur, ALGORITHMS, verify, cliqueLowerBound };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Coloring = api;
})(typeof window !== "undefined" ? window : globalThis);
