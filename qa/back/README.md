# Back-of-campus expansion pipeline (2026-10-29)

Inputs (in `data/`):
- `osm-back.json`: OpenStreetMap, Overpass API, snapshot 2026-10-28T18:20Z, bbox 13.8145–13.8305 N, 100.5085–100.5245 E. ODbL © OpenStreetMap contributors.
- `ms-footprints-back.json`: Microsoft Global ML Building Footprints, release 2026-02-03, quadkey 132203310, filtered to the same bbox (3,658 footprints, no heights). ODbL.

Steps (run from a working folder that has `backD.json` = the `D` object of back.html, `backosm/` = these data files, `repo/` = this repository):
1. `match.py`: overlap (IoU) of every existing back.html box with Microsoft footprints, and coverage of OSM buildings → `match.json`.
2. `roads.py`: OSM highways outside campus with no existing road within 6 m along ≥40% of their length → missing roads.
3. `blds.py`: OSM, then Microsoft footprints outside campus and not covered (>30% of area) by an existing box / campus building → buildings to add.
   Roads that would run more than 3 m inside any building were moved to `roads-held-back.json` (not drawn; need checking).
4. `inject.py`: writes `EXTRA` into back.html. `context.py`: writes `back-context.json` for index.html.

Coordinates: local metres, x east, z south, origin 13.82156, 100.51408, equirectangular (same as index.html `GEO`).

## Fidelity pass (2026-10-29), run on the back.html of main fe8f9a8, in this order (repo root)
1. `photo_boxes.py`: boxes carrying photo-based shop models (kept as they are) → `data/photo-boxes.json`.
2. `fidelity_match.py`: every box vs OSM then Microsoft footprints → `data/fidelity-match.json` (match / split / weak / none).
3. `inject_fidelity.py` (+ `fidelity-ui.js`): writes `FID` into back.html: real outlines for non-rectangular matches,
   see-through placeholders where no footprint supports a box, removal of roof/wall equipment that had no evidence, cards and the
   evidence-colour view. Letters are explained at the top of the script.
4. `context_fidelity.py`: same outlines in back-context.json (placeholders left out).
`imagery_back.py OUT x,z` overlays old boxes / reference footprints / roads on Esri imagery for a person to judge (not saved here).
Checks and report: `../fidelity-page.mjs`, `../fidelity_check.py`, `../FIDELITY-REPORT.md`.
