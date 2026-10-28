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
