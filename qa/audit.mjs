// Data and geometry audit of the campus map. Rerunnable.
// usage: node qa/audit.mjs http://127.0.0.1:8090/index.html [qa/osm-campus.json] [outDir=qa/reports]
// Writes audit.json, buildings.csv, pairs.csv, issues.csv and audit.md. Issues are split into
//   E = definite error in the data or model, S = suspicious, needs a person to check against the site or imagery.
import { open, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [url, osmFile = join(here, 'osm-campus.json'), outDir = join(here, 'reports')] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const b = await open({ port: 9950 + Math.floor(Math.random() * 40), width: 900, height: 900, scale: 1 });
await b.goto(url); await sleep(9000);
await b.ev(`window.__OSM=${readFileSync(osmFile, 'utf8')};1`);
const A = JSON.parse(await b.ev(readFileSync(join(here, 'audit-page.js'), 'utf8')));
A.osmSource = { file: osmFile.split(/[\\/]/).pop(), api: 'https://api.openstreetmap.org/api/0.6/map.json (bbox around BOUNDARY + 30 m)', fetched: '2026-10-29', licence: 'ODbL, © OpenStreetMap contributors' };
await b.close();

// ---- rules
const issues = [], add = (sev, code, id, detail) => issues.push({ sev, code, id, detail });
const ids = new Map(); A.rows.forEach(r => ids.set(r.id, (ids.get(r.id) || 0) + 1));
for (const r of A.rows) {
  const isB = !r.flat;
  if (!r.id) add('E', 'no-id', '', r.name);
  if (ids.get(r.id) > 1) add('E', 'duplicate-id', r.id, `${ids.get(r.id)} entries`);
  if (r.area == null) add(isB ? 'E' : 'S', 'no-footprint', r.id, 'no polygon (p/outer)');
  else if (!(r.area > 0)) add('E', 'zero-area', r.id, String(r.area));
  if (r.modelMissing) add('E', 'no-model', r.id, 'nothing drawn for this entry');
  if (r.modelMinY != null && r.modelMinY > 1) add('S', 'model-floating', r.id, `lowest point ${r.modelMinY} m above ground`);
  if (r.modelMinY != null && r.modelMinY < -1.5) add('S', 'model-sunk', r.id, `lowest point ${r.modelMinY} m`);
  if (r.modelOverhang > 6) add('S', 'model-beyond-footprint', r.id, `model reaches ${r.modelOverhang} m outside the footprint box (extensions, canopies or misplaced parts)`);
  if (r.degenerateInstances || r.emptyMeshes) add('S', 'unused-model-slots', r.id, `${r.degenerateInstances || 0} empty instance slots, ${r.emptyMeshes || 0} empty meshes (draw nothing, cost a little)`);
  if (r.area != null && r.insideCampus === false) add('S', 'outside-campus', r.id, `centre ${r.lat},${r.lon} outside BOUNDARY`);
  if (isB && r.metresPerFloor && (r.metresPerFloor < 2.7 || r.metresPerFloor > 6)) add('S', 'height-per-floor', r.id, `${r.top} m / ${r.lv} floors = ${r.metresPerFloor} m per floor`);
  if (isB && r.area != null) {
    if (!r.osmWay) add('S', 'not-in-osm', r.id, 'no overlapping OpenStreetMap building (footprint source unknown or OSM missing it)');
    else {
      if (r.osmIoU < 0.5) add('S', 'osm-shape-differs', r.id, `overlap IoU ${r.osmIoU} with way ${r.osmWay}`);
      if (r.osmCentroidOffset > 5) add('S', 'osm-offset', r.id, `centre ${r.osmCentroidOffset} m from OSM way ${r.osmWay}`);
      if (r.osmAreaRatio < 0.7 || r.osmAreaRatio > 1.4) add('S', 'osm-area-differs', r.id, `area ${r.osmAreaRatio}× OSM way ${r.osmWay}`);
      if (r.osmLevels && +r.osmLevels !== r.lv) add('S', 'levels-differ', r.id, `map ${r.lv} floors, OSM building:levels=${r.osmLevels}`);
    }
    if (r.nearestRoad > 80 && (r.nearestFootpath == null || r.nearestFootpath > 40)) add('S', 'far-from-roads', r.id, `road ${r.nearestRoad} m, footpath ${r.nearestFootpath}`);
    if (r.walkSnap > 25) add('S', 'route-start-far', r.id, `nearest walking-network point is ${r.walkSnap} m from the building edge`);
  }
}
A.osmUnmatched.forEach(o => add('S', 'osm-building-missing-from-map', 'osm:' + o.osmWay, `${o.name || '(no name)'} ${o.building} ${o.area} m² at ${o.cx},${o.cz}`));
A.osmShared.forEach(o => add('S', 'one-osm-way-many-entries', 'osm:' + o.osmWay, `${o.name} ↔ ${o.mapIds.join(', ')}`));
A.overlaps.forEach(o => add(o.shareOfSmaller > 0.3 ? 'E' : 'S', 'footprints-overlap', `${o.a}×${o.b}`, `${o.overlapM2} m² (${Math.round(o.shareOfSmaller * 100)}% of the smaller)`));
A.close.forEach(o => add('S', 'centres-very-close', `${o.a}×${o.b}`, `${o.centroidDistance} m`));
A.roads.throughBuildings.forEach(o => add('S', 'road-crosses-building', o.building, `road #${o.road} (${o.type}) segment ${o.segment}`));
Object.entries(A.nav.insideBuildings).forEach(([id, n]) => add('S', 'walk-network-inside-building', id, `${n} routing points inside the footprint`));
if (A.nav.components > 1) add('S', 'walk-network-split', '', `${A.nav.components} pieces; routing uses the largest (${A.nav.largest} of ${A.nav.nodes} points)`);
A.pairs.forEach(p => { if (p.walkNetwork == null) add('S', 'no-walk-route', `${p.a}→${p.b}`, 'no route on the walking network');
  else if (p.edge > 20 && p.walkNetwork > 4 * p.centroid) add('S', 'long-detour', `${p.a}→${p.b}`, `walk ${p.walkNetwork} m vs straight ${p.centroid} m`); });

// ---- outputs
const csv = (rows, cols) => [cols.join(',')].concat(rows.map(r => cols.map(c => { const v = r[c] ?? ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','))).join('\n');
const bcols = ['id', 'no', 'name', 'en', 'cat', 'kind', 'flat', 'lv', 'top', 'metresPerFloor', 'area', 'vertices', 'bboxW', 'bboxD', 'orientDeg', 'cx', 'cz', 'lat', 'lon', 'insideCampus', 'modelMinY', 'modelMaxY', 'modelW', 'modelD', 'modelOverhang', 'degenerateInstances', 'emptyMeshes', 'osmWay', 'osmName', 'osmLevels', 'osmIoU', 'osmCentroidOffset', 'osmAreaRatio', 'osmOrientDiff', 'nearestRoad', 'nearestFootpath', 'walkSnap', 'sourceFlags', 'evidenceClass', 'hasDirectory'];
writeFileSync(join(outDir, 'buildings.csv'), '﻿' + csv(A.rows, bcols));
writeFileSync(join(outDir, 'pairs.csv'), csv(A.pairs, ['a', 'b', 'centroid', 'edge', 'walkNetwork']));
writeFileSync(join(outDir, 'issues.csv'), '﻿' + csv(issues, ['sev', 'code', 'id', 'detail']));
writeFileSync(join(outDir, 'polygons.json'), JSON.stringify(A.polygons));
const { polygons, ...rest } = A;
writeFileSync(join(outDir, 'audit.json'), JSON.stringify({ ...rest, issues }, null, 1));
const by = {}; issues.forEach(i => { const k = i.sev + ' ' + i.code; by[k] = (by[k] || 0) + 1; });
const bl = A.rows.filter(r => !r.flat);
const md = [`# Audit ${A.generated}`, '', `Entries: ${A.rows.length} (buildings ${bl.length}, flat items ${A.rows.length - bl.length}); matched to an OSM building: ${bl.filter(r => r.osmWay).length}; OSM buildings in campus not on the map: ${A.osmUnmatched.length}.`,
  `Walking network: ${A.nav.nodes} points, ${A.nav.components} pieces, largest ${A.nav.largest}. Roads/paths: ${A.roads.count}.`, '', '| severity code | count |', '|---|---|', ...Object.entries(by).sort().map(([k, v]) => `| ${k} | ${v} |`), '', '## Issues', '', '| sev | code | id | detail |', '|---|---|---|---|', ...issues.map(i => `| ${i.sev} | ${i.code} | ${i.id} | ${String(i.detail).replace(/\|/g, '/')} |`)].join('\n');
writeFileSync(join(outDir, 'audit.md'), md);
console.log(`audit: ${A.rows.length} entries, ${issues.filter(i => i.sev === 'E').length} E, ${issues.filter(i => i.sev === 'S').length} S`);
console.log(Object.entries(by).sort().map(([k, v]) => `${k}: ${v}`).join('\n'));
