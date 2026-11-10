# Smart Exam Timetable Generator (Graph Colouring)

A static website that builds a clash-free exam timetable using Discrete Mathematical Structures.

| DMS concept | Where it is used | File |
|---|---|---|
| **Set theory** (∪, ∩, −) | Subjects are sets of students; `A ∩ B ≠ ∅` means a clash | `js/sets.js` |
| **Graph theory** | Vertices = subjects, edges = clashing pairs | `js/graph.js` |
| **Adjacency matrix / list** | Graph is stored and displayed in both forms | `js/graph.js`, section 4 of the page |
| **Graph colouring** | Colour = time slot (DSATUR, Welsh–Powell, Greedy); verified proper; clique lower bound ω(G) ≤ χ(G) | `js/coloring.js` |

## Run
Open `index.html` in a browser (no build, no dependencies).

## Test
```bash
node tests/run.js
```

## Input format
```
Mathematics: S01, S02, S03
Physics: S01, S07
```
