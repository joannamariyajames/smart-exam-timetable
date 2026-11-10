/**
 * SET THEORY MODULE
 * Each subject's enrolled students form a set. Everything in the
 * timetable pipeline is built on these three operations.
 */
(function (root) {
  "use strict";

  /** A ∪ B : students enrolled in A or B (or both) */
  function union(a, b) {
    const r = new Set(a);
    for (const x of b) r.add(x);
    return r;
  }

  /** A ∩ B : students enrolled in BOTH A and B -> the clash set */
  function intersection(a, b) {
    const r = new Set();
    for (const x of a) if (b.has(x)) r.add(x);
    return r;
  }

  /** A − B : students enrolled in A but not in B */
  function difference(a, b) {
    const r = new Set();
    for (const x of a) if (!b.has(x)) r.add(x);
    return r;
  }

  /** Two subjects conflict  <=>  A ∩ B ≠ ∅ */
  function conflicts(a, b) {
    return intersection(a, b).size > 0;
  }

  const api = { union, intersection, difference, conflicts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SetOps = api;
})(typeof window !== "undefined" ? window : globalThis);
