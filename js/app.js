(function () {
  "use strict";
  const { union, intersection, difference } = SetOps;
  const { buildGraph } = GraphLib;
  const { ALGORITHMS, verify, cliqueLowerBound } = Coloring;

  const PALETTE = ["#4e79a7", "#f28e2b", "#59a14f", "#e15759", "#b07aa1", "#76b7b2",
    "#edc948", "#9c755f", "#ff9da7", "#7f7f7f", "#2a9d8f", "#c44e9b", "#8c6bb1", "#1f77b4"];
  const colorOf = (c) => PALETTE[c % PALETTE.length];
  const inkOn = (hex) => {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111" : "#fff";
  };
  const SESSION_NAMES = ["Morning", "Afternoon", "Evening"];

  const SAMPLE = `Mathematics: S01, S02, S03, S04, S05, S06
Physics: S01, S02, S07, S08, S09
Chemistry: S03, S07, S10, S11, S12
Computer Science: S04, S08, S10, S13, S14, S15
English: S05, S09, S11, S13, S16, S17
Data Structures: S14, S15, S18, S19, S20
Discrete Maths: S01, S04, S18, S21, S22
Electronics: S06, S12, S16, S19, S23, S24
Statistics: S20, S21, S23, S25, S26
Economics: S22, S24, S25, S27, S28
Biology: S26, S27, S29, S30`;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NS = "http://www.w3.org/2000/svg";

  let state = null; // { g, enrol, result, pos, algoKey }

  /* ---------- parsing ---------- */
  function parse(text) {
    const subjects = [], enrol = {};
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const [i, line] of lines.entries()) {
      const k = line.indexOf(":");
      if (k < 1) throw new Error(`Line ${i + 1}: expected "Subject: student, student, …"`);
      const name = line.slice(0, k).trim();
      if (enrol[name]) throw new Error(`Line ${i + 1}: subject "${name}" appears twice`);
      const studs = line.slice(k + 1).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (!studs.length) throw new Error(`Line ${i + 1}: "${name}" has no students`);
      subjects.push(name);
      enrol[name] = new Set(studs);
    }
    if (subjects.length < 2) throw new Error("Enter at least two subjects.");
    return { subjects, enrol };
  }

  /* ---------- force layout (deterministic) ---------- */
  function layout(g, W, H) {
    const n = g.n, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
    const p = Array.from({ length: n }, (_, i) => ({
      x: cx + R * Math.cos((2 * Math.PI * i) / n), y: cy + R * Math.sin((2 * Math.PI * i) / n), vx: 0, vy: 0 }));
    const k = Math.sqrt((W * H) / Math.max(n, 1)) * 0.75;
    for (let it = 0; it < 300; it++) {
      for (const a of p) { a.vx = 0; a.vy = 0; }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.hypot(dx, dy) || 0.01;
        const f = (k * k) / d; dx /= d; dy /= d;
        p[i].vx += dx * f; p[i].vy += dy * f; p[j].vx -= dx * f; p[j].vy -= dy * f;
      }
      for (const [i, j] of g.edges) {
        let dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.hypot(dx, dy) || 0.01;
        const f = (d * d) / k; dx /= d; dy /= d;
        p[i].vx -= dx * f; p[i].vy -= dy * f; p[j].vx += dx * f; p[j].vy += dy * f;
      }
      const t = 12 * (1 - it / 300) + 0.5;
      for (const a of p) {
        a.vx += (cx - a.x) * 0.05; a.vy += (cy - a.y) * 0.05;
        const d = Math.hypot(a.vx, a.vy) || 1;
        a.x += (a.vx / d) * Math.min(d, t); a.y += (a.vy / d) * Math.min(d, t);
        a.x = Math.max(60, Math.min(W - 60, a.x)); a.y = Math.max(40, Math.min(H - 40, a.y));
      }
    }
    return p;
  }

  /* ---------- rendering ---------- */
  function chips(set) {
    if (!set.size) return '<span class="empty">∅ (empty set)</span>';
    return '<div class="chips">' + [...set].sort().map((s) => `<span class="chip">${esc(s)}</span>`).join("") + "</div>";
  }

  function renderStats() {
    const { g, result, lb } = state;
    const items = [
      [g.n, "subjects (vertices)"], [g.edges.length, "clashing pairs (edges)"],
      [Math.max(...g.degree), "max degree Δ"], [lb, "clique lower bound ω"],
      [result.slots, "time slots used"],
    ];
    $("stats").innerHTML = items.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  }

  function renderSets() {
    const { g, enrol } = state;
    const a = g.subjects[$("selA").value], b = g.subjects[$("selB").value];
    const A = enrol[a], B = enrol[b];
    const I = intersection(A, B);
    const box = (title, set) => `<div class="setbox"><h3>${title} <span class="n">(${set.size})</span></h3>${chips(set)}</div>`;
    let html = "";
    if (a === b) html += `<div class="verdict free" style="background:var(--bg);color:var(--muted)">Choose two different subjects.</div>`;
    else html += I.size
      ? `<div class="verdict clash">A ∩ B ≠ ∅ → ${I.size} shared student${I.size > 1 ? "s" : ""}: the subjects CLASH, so an edge joins them and they need different slots.</div>`
      : `<div class="verdict free">A ∩ B = ∅ → no shared students: no edge, they may share a slot.</div>`;
    html += box(`A = ${esc(a)}`, A) + box(`B = ${esc(b)}`, B) +
      box("A ∪ B", union(A, B)) + box("A ∩ B", I) +
      box("A − B", difference(A, B)) + box("B − A", difference(B, A));
    $("setout").innerHTML = html;
  }

  function renderGraph() {
    const { g, result, pos } = state;
    const stepN = +$("step").value;
    const color = new Array(g.n).fill(-1);
    for (let i = 0; i < stepN; i++) color[result.steps[i].v] = result.steps[i].c;
    const last = stepN ? result.steps[stepN - 1] : null;
    $("steplbl").textContent = last
      ? `${stepN}/${g.n}: ${g.subjects[last.v]} → slot ${last.c + 1}` : `0/${g.n}: nothing coloured yet`;

    const svg = $("svg");
    svg.innerHTML = "";
    const mk = (tag, attrs, parent) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(el); return el;
    };
    const tip = $("tip");
    for (const [i, j] of g.edges) {
      const shared = [...g.common[i + "-" + j]].sort();
      const line = mk("line", { class: "edge", x1: pos[i].x, y1: pos[i].y, x2: pos[j].x, y2: pos[j].y });
      const hit = mk("line", { class: "edgehit", x1: pos[i].x, y1: pos[i].y, x2: pos[j].x, y2: pos[j].y });
      const show = (e) => {
        line.classList.add("hl");
        tip.hidden = false;
        tip.innerHTML = `<b>${esc(g.subjects[i])} ∩ ${esc(g.subjects[j])}</b><br>${shared.map(esc).join(", ")}`;
        const r = $("svg").getBoundingClientRect(), box = $("svg").parentNode.getBoundingClientRect();
        tip.style.left = Math.min(e.clientX - box.left + 12, box.width - 250) + "px";
        tip.style.top = e.clientY - box.top + 12 + "px";
        void r;
      };
      hit.addEventListener("mousemove", show);
      hit.addEventListener("mouseenter", show);
      hit.addEventListener("mouseleave", () => { line.classList.remove("hl"); tip.hidden = true; });
    }
    g.subjects.forEach((s, i) => {
      const c = color[i];
      const grp = mk("g", { class: "node" + (c === -1 ? " uncol" : ""), transform: `translate(${pos[i].x},${pos[i].y})` });
      const fill = c === -1 ? "" : colorOf(c);
      const circ = mk("circle", { r: 17 }, grp);
      if (fill) circ.setAttribute("fill", fill);
      if (last && last.v === i) { circ.setAttribute("stroke", "#000"); circ.setAttribute("stroke-width", 4); }
      if (c !== -1) { const t = mk("text", { y: 4, fill: inkOn(fill) }, grp); t.textContent = c + 1; }
      const l = mk("text", { class: "lbl", y: 34 }, grp); l.textContent = s.length > 16 ? s.slice(0, 15) + "…" : s;
      mk("title", {}, grp).textContent = `${s} (degree ${g.degree[i]})`;
    });
    $("legend").innerHTML = Array.from({ length: result.slots }, (_, c) =>
      `<span><i style="background:${colorOf(c)}"></i>Slot ${c + 1}</span>`).join("");
  }

  function renderRepr() {
    const { g } = state;
    const short = (i) => "v" + (i + 1);
    let h = "<tr><th></th>" + g.subjects.map((_, j) => `<th title="${esc(g.subjects[j])}">${short(j)}</th>`).join("") + "</tr>";
    g.matrix.forEach((row, i) => {
      h += `<tr><th title="${esc(g.subjects[i])}">${short(i)}</th>` +
        row.map((x, j) => `<td class="${i === j ? "diag" : x ? "one" : ""}">${x}</td>`).join("") + "</tr>";
    });
    $("matrix").innerHTML = h;
    $("alist").innerHTML = g.subjects.map((s, i) =>
      `<li><b>${short(i)}</b> → [${g.list[i].map(short).join(", ")}] <span class="deg">deg ${g.degree[i]} · ${esc(s)}</span></li>`).join("");
  }

  function slotDates() {
    const per = +$("per").value, skip = $("wk").checked;
    const d = $("start").value ? new Date($("start").value + "T00:00:00") : new Date();
    const norm = () => { while (skip && (d.getDay() === 0 || d.getDay() === 6)) d.setDate(d.getDate() + 1); };
    norm();
    const out = [];
    return (slot) => {
      while (out.length <= slot) {
        const idx = out.length;
        if (idx > 0 && idx % per === 0) { d.setDate(d.getDate() + 1); norm(); }
        out.push({ date: new Date(d), session: SESSION_NAMES[idx % per] });
      }
      return out[slot];
    };
  }

  function renderTimetable() {
    const { g, result, enrol } = state;
    const when = slotDates();
    state.rows = [];
    let h = "<tr><th>Slot</th><th>Date</th><th>Session</th><th>Subjects</th><th>Students</th></tr>";
    for (let c = 0; c < result.slots; c++) {
      const members = g.subjects.map((s, i) => [s, i]).filter(([, i]) => result.color[i] === c);
      let all = new Set();
      members.forEach(([s]) => { all = union(all, enrol[s]); });
      const w = when(c);
      const date = w.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      state.rows.push([c + 1, date, w.session, members.map(([s]) => s).join(" | "), all.size]);
      h += `<tr><td><span class="slot"><i style="background:${colorOf(c)}"></i>${c + 1}</span></td><td>${esc(date)}</td><td>${w.session}</td>` +
        `<td>${members.map(([s]) => `<span class="tag">${esc(s)}</span>`).join("")}</td><td>${all.size}</td></tr>`;
    }
    $("ttable").innerHTML = h;
    const bad = verify(g, result.color);
    const v = $("verify");
    v.className = "verify " + (bad.length ? "bad" : "ok");
    v.textContent = bad.length
      ? `✗ ${bad.length} clash(es) found`
      : `✓ Verified: all ${g.edges.length} edges join different slots, so no student has two exams at the same time. ` +
        `Used ${result.slots} slot(s); at least ${state.lb} are unavoidable.` +
        (result.slots === state.lb ? " This is optimal (χ(G) = ω(G))." : "");
  }

  /* ---------- main flow ---------- */
  function fillSelects() {
    const opts = state.g.subjects.map((s, i) => `<option value="${i}">${esc(s)}</option>`).join("");
    $("selA").innerHTML = opts; $("selB").innerHTML = opts;
    // default to the first clashing pair so the demo is interesting
    const e = state.g.edges[0] || [0, Math.min(1, state.g.n - 1)];
    $("selA").value = e[0]; $("selB").value = e[1];
  }

  function generate() {
    $("err").textContent = "";
    let parsed;
    try { parsed = parse($("data").value); } catch (e) { $("err").textContent = e.message; return; }
    const g = buildGraph(parsed.subjects, parsed.enrol);
    const algoKey = $("algo").value;
    const result = ALGORITHMS[algoKey].fn(g);
    state = { g, enrol: parsed.enrol, result, algoKey, pos: layout(g, 700, 520), lb: cliqueLowerBound(g) };
    $("step").max = g.n; $("step").value = g.n;
    fillSelects();
    renderStats(); renderSets(); renderGraph(); renderRepr(); renderTimetable();
  }

  function randomData() {
    const subs = ["Algebra", "Calculus", "Mechanics", "Optics", "Organic Chem", "Genetics", "Networks", "Databases",
      "Compilers", "History", "Philosophy", "Accounting", "Marketing", "Law"];
    let seed = Date.now() % 100000;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const n = 8 + Math.floor(rnd() * 5);
    return subs.slice(0, n).map((s) => {
      const k = 6 + Math.floor(rnd() * 6), set = new Set();
      while (set.size < k) set.add("S" + String(1 + Math.floor(rnd() * 40)).padStart(2, "0"));
      return `${s}: ${[...set].sort().join(", ")}`;
    }).join("\n");
  }

  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function init() {
    $("algo").innerHTML = Object.entries(ALGORITHMS).map(([k, a]) => `<option value="${k}">${a.name}</option>`).join("");
    $("data").value = SAMPLE;
    const d = new Date(); d.setDate(d.getDate() + 14);
    $("start").value = d.toISOString().slice(0, 10);
    $("gen").onclick = generate;
    $("algo").onchange = $("per").onchange = $("wk").onchange = $("start").onchange = generate;
    $("sample").onclick = () => { $("data").value = SAMPLE; generate(); };
    $("random").onclick = () => { $("data").value = randomData(); generate(); };
    $("selA").onchange = $("selB").onchange = () => renderSets();
    $("step").oninput = () => renderGraph();
    $("print").onclick = () => window.print();
    $("csv").onclick = () => {
      const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
      const rows = [["Slot", "Date", "Session", "Subjects", "Students"], ...state.rows];
      download("exam-timetable.csv", rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
    };
    generate();
  }
  init();
})();
