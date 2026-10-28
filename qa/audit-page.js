// Runs inside index.html (injected by qa/audit.mjs). Reads the map's own data and 3D models, compares footprints with an
// OpenStreetMap extract (window.__OSM), and returns plain JSON. Every number here is computed from geometry, none is typed in.
(() => {
  const PC = window.polygonClipping;
  const area = p => Math.abs(p.reduce((a, v, i) => { const n = p[(i + 1) % p.length]; return a + v[0] * n[1] - n[0] * v[1]; }, 0) / 2);
  const centroid = p => { let a = 0, x = 0, z = 0; for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length], c = x0 * z1 - x1 * z0; a += c; x += (x0 + x1) * c; z += (z0 + z1) * c; } a /= 2; return Math.abs(a) < 1e-9 ? [p.reduce((s, v) => s + v[0], 0) / p.length, p.reduce((s, v) => s + v[1], 0) / p.length] : [x / (6 * a), z / (6 * a)]; };
  const bbox = p => [Math.min(...p.map(v => v[0])), Math.min(...p.map(v => v[1])), Math.max(...p.map(v => v[0])), Math.max(...p.map(v => v[1]))];
  const ring = p => { const r = p.map(v => [v[0], v[1]]); const a = r[0], b = r[r.length - 1]; if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]); return r; };
  const inter = (a, b) => { try { return PC.intersection([ring(a)], [ring(b)]).reduce((s, poly) => s + area(poly[0].slice(0, -1)) - poly.slice(1).reduce((h, q) => h + area(q.slice(0, -1)), 0), 0); } catch (e) { return NaN; } };
  const segDistPt = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t)); };
  const segX = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d); return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)); };
  const inPolyP = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; };
  const edges = p => p.map((v, i) => [v, p[(i + 1) % p.length]]);
  const polyDist = (A, B) => { if (inter(A, B) > 0.01) return 0; let d = Infinity; for (const [a, b] of edges(A)) for (const v of B) d = Math.min(d, segDistPt(v[0], v[1], a, b)); for (const [a, b] of edges(B)) for (const v of A) d = Math.min(d, segDistPt(v[0], v[1], a, b)); return d; };
  const polyLineDist = (P, L) => { let d = Infinity; for (let i = 0; i < L.length - 1; i++) { if (inPolyP(L[i][0], L[i][1], P)) return 0; for (const v of P) d = Math.min(d, segDistPt(v[0], v[1], L[i], L[i + 1])); for (const [a, b] of edges(P)) { d = Math.min(d, segDistPt(L[i][0], L[i][1], a, b)); if (segX(a, b, L[i], L[i + 1])) return 0; } } return d; };
  const longestEdgeDeg = p => { let best = 0, ang = 0; for (const [a, b] of edges(p)) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI; } } return ((ang % 180) + 180) % 180; };
  const toLL = (x, z) => [+(GEO.lat0 - z / GEO.kz).toFixed(7), +(GEO.lon0 + x / GEO.kx).toFixed(7)];
  const toXZ = (lat, lon) => [(lon - GEO.lon0) * GEO.kx, -(lat - GEO.lat0) * GEO.kz];
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  // ---- map entries
  const rows = ALL.map(b => {
    const raw = b.p || b.outer || null, P = raw ? raw.map(([x, z]) => [x + (b.dx || 0), z + (b.dz || 0)]) : null;
    const r = { id: b.id, no: b.no, name: b.name, en: b.en, cat: b.cat, kind: b.kind || '', flat: !!b.flat, lv: b.lv, lv0: b.lv0, top: r2(b.top || 0),
      sourceFlags: [b.osm ? 'osm' : '', b.est ? 'est(แผนผัง)' : '', b.coordinateEvidence ? 'coordinateEvidence' : '', b.photoReference ? 'photo' : '', b.imageRoof ? 'imageryRoof' : ''].filter(Boolean).join('+'),
      evidenceClass: b.directory?.evidenceClass || '', hasDirectory: !!b.directory, aliases: (b.directory?.searchTerms || '').length };
    if (P) {
      const c = centroid(P), bb = bbox(P);
      Object.assign(r, { vertices: P.length, area: r1(area(P)), cx: r1(c[0]), cz: r1(c[1]), lat: toLL(c[0], c[1])[0], lon: toLL(c[0], c[1])[1], bboxW: r1(bb[2] - bb[0]), bboxD: r1(bb[3] - bb[1]), orientDeg: r1(longestEdgeDeg(P)), insideCampus: inPolyP(c[0], c[1], BOUNDARY) });
      r._P = P;
    }
    if (b.group) {
      b.group.updateMatrixWorld(true);
      const bx = new THREE.Box3(); b.group.traverse(o => { if (o.isMesh && o.geometry && !o.userData.batched) { o.geometry.computeBoundingBox && !o.geometry.boundingBox && o.geometry.computeBoundingBox(); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        // instance-aware bounds (Box3.setFromObject in r128 uses one instance at the mesh origin)
        if (o.isInstancedMesh) { const m = new THREE.Matrix4(), w = new THREE.Matrix4(); for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, m); if (Math.abs(m.determinant()) < 1e-12) { r.degenerateInstances = (r.degenerateInstances || 0) + 1; continue; } w.multiplyMatrices(o.matrixWorld, m); const ib = o.geometry.boundingBox.clone().applyMatrix4(w); if (isFinite(ib.min.x)) bx.union(ib); } }
        else if (o.geometry.boundingBox.isEmpty()) { r.emptyMeshes = (r.emptyMeshes || 0) + 1; } else { const ob = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); if (isFinite(ob.min.x)) bx.union(ob); } } });
      if (isFinite(bx.min.x)) Object.assign(r, { modelMinY: r2(bx.min.y), modelMaxY: r2(bx.max.y), modelW: r1(bx.max.x - bx.min.x), modelD: r1(bx.max.z - bx.min.z),
        modelOverhang: r._P ? r1(Math.max(0, bbox(r._P)[0] - bx.min.x, bx.max.x - bbox(r._P)[2], bbox(r._P)[1] - bx.min.z, bx.max.z - bbox(r._P)[3])) : null });
      else r.modelMissing = true;
    } else r.modelMissing = true;
    if (!r.flat && r.lv) r.metresPerFloor = r2((r.top || 0) / r.lv);
    return r;
  });
  const bldg = rows.filter(r => r._P && !r.flat);

  // ---- OpenStreetMap comparison
  const osm = window.__OSM, nodes = new Map(osm.elements.filter(e => e.type === 'node').map(n => [n.id, n]));
  const osmB = osm.elements.filter(e => e.type === 'way' && e.tags && e.tags.building).map(w => {
    const P = w.nodes.slice(0, -1).map(id => nodes.get(id)).filter(Boolean).map(n => toXZ(n.lat, n.lon));
    const c = P.length > 2 ? centroid(P) : [0, 0];
    return { id: w.id, name: w.tags['name:th'] || w.tags.name || '', ref: w.tags.ref || w.tags['addr:housenumber'] || '', levels: w.tags['building:levels'] || '', height: w.tags.height || '', building: w.tags.building, source: w.tags.source || '', P, area: area(P), c, inCampus: inPolyP(c[0], c[1], BOUNDARY) };
  }).filter(o => o.P.length > 2);
  for (const r of bldg) {
    let best = null;
    for (const o of osmB) { const bb = bbox(o.P), rb = bbox(r._P); if (bb[0] > rb[2] || bb[2] < rb[0] || bb[1] > rb[3] || bb[3] < rb[1]) continue;
      const i = inter(r._P, o.P), iou = i / (r.area + o.area - i); if (!best || iou > best.iou) best = { o, iou, i }; }
    if (best && best.iou > 0.05) {
      const o = best.o; Object.assign(r, { osmWay: o.id, osmName: o.name, osmLevels: o.levels, osmIoU: r2(best.iou), osmCentroidOffset: r1(Math.hypot(o.c[0] - r.cx, o.c[1] - r.cz)), osmAreaRatio: r2(r.area / o.area),
        osmOrientDiff: r1(Math.min(...[0, 180].map(k => Math.abs(((longestEdgeDeg(o.P) - r.orientDeg + k + 360) % 180))).map(v => Math.min(v, 180 - v)))) });
      o.matched = (o.matched || []).concat(r.id);
    }
  }
  const osmUnmatched = osmB.filter(o => o.inCampus && !o.matched).map(o => ({ osmWay: o.id, name: o.name, building: o.building, levels: o.levels, area: r1(o.area), cx: r1(o.c[0]), cz: r1(o.c[1]) }));
  const osmShared = osmB.filter(o => (o.matched || []).length > 1).map(o => ({ osmWay: o.id, name: o.name, mapIds: o.matched }));

  // ---- overlaps and near duplicates between map buildings
  const overlaps = [], close = [];
  for (let i = 0; i < bldg.length; i++) for (let j = i + 1; j < bldg.length; j++) {
    const a = bldg[i], b = bldg[j], ov = inter(a._P, b._P);
    if (ov > 1) overlaps.push({ a: a.id, b: b.id, overlapM2: r1(ov), shareOfSmaller: r2(ov / Math.min(a.area, b.area)) });
    if (Math.hypot(a.cx - b.cx, a.cz - b.cz) < 5) close.push({ a: a.id, b: b.id, centroidDistance: r1(Math.hypot(a.cx - b.cx, a.cz - b.cz)) });
  }

  // ---- roads and walking network
  const roads = ROADS.filter(r => Array.isArray(r[1])).map(([t, pts]) => ({ t, pts }));
  for (const r of bldg) { let dR = Infinity, dW = Infinity; for (const rd of roads) { const d = polyLineDist(r._P, rd.pts); if (rd.t === 'f') dW = Math.min(dW, d); else dR = Math.min(dR, d); } r.nearestRoad = r1(dR); r.nearestFootpath = isFinite(dW) ? r1(dW) : null; }
  const roadsThroughBuildings = [];
  roads.forEach((rd, k) => { for (const r of bldg) { if (r.kind === 'bridge') continue; for (let i = 0; i < rd.pts.length - 1; i++) { const a = rd.pts[i], b = rd.pts[i + 1], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (inPolyP(mid[0], mid[1], r._P) || edges(r._P).some(([p, q]) => segX(a, b, p, q))) { roadsThroughBuildings.push({ road: k, type: rd.t, building: r.id, segment: i }); break; } } } });
  const G = NAVG, comp = new Array(G.P.length).fill(-1); let nc = 0; const sizes = [];
  for (let i = 0; i < G.P.length; i++) { if (comp[i] >= 0) continue; let n = 0; const st = [i]; comp[i] = nc; while (st.length) { const u = st.pop(); n++; G.E[u].forEach(([v]) => { if (comp[v] < 0) { comp[v] = nc; st.push(v); } }); } sizes.push(n); nc++; }
  const navInside = []; G.P.forEach((p, i) => { if (!G.ok(i)) return; for (const r of bldg) { if (r.kind === 'bridge') continue; if (inPolyP(p[0], p[1], r._P)) { navInside.push({ node: i, building: r.id }); break; } } });
  const navInsideBy = {}; navInside.forEach(n => navInsideBy[n.building] = (navInsideBy[n.building] || 0) + 1);

  // ---- distances for every pair of buildings: centroid, footprint edge, and along the walking network
  const snap = {}; for (const r of bldg) { const b = ALL.find(x => x.id === r.id); const n = nearestNode(placeOf(b)); snap[r.id] = n; const p = G.P[n]; r.walkSnap = n >= 0 ? r1(Math.min(...edges(r._P).map(([a, c]) => segDistPt(p[0], p[1], a, c)))) : null; }
  const pairs = [];
  for (let i = 0; i < bldg.length; i++) for (let j = i + 1; j < bldg.length; j++) {
    const a = bldg[i], b = bldg[j]; let walk = null;
    if (snap[a.id] >= 0 && snap[b.id] >= 0) { const path = shortest(snap[a.id], snap[b.id]); if (path) { let L = 0; for (let k = 1; k < path.length; k++) L += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); walk = r1(L); } }
    pairs.push({ a: a.id, b: b.id, centroid: r1(Math.hypot(a.cx - b.cx, a.cz - b.cz)), edge: r1(polyDist(a._P, b._P)), walkNetwork: walk });
  }
  const polygons = {}; rows.forEach(r => { if (r._P) polygons[r.id] = r._P.map(v => [r2(v[0]), r2(v[1])]); delete r._P; });
  return JSON.stringify({ generated: new Date().toISOString(), geo: { lat0: GEO.lat0, lon0: GEO.lon0, kx: GEO.kx, kz: GEO.kz, note: 'x = east metres, z = south metres; equirectangular around (lat0, lon0)' },
    rows, polygons, osmUnmatched, osmShared, overlaps, close, roads: { count: roads.length, byType: roads.reduce((m, r) => (m[r.t] = (m[r.t] || 0) + 1, m), {}), throughBuildings: roadsThroughBuildings },
    nav: { nodes: G.P.length, components: nc, largest: Math.max(...sizes), usable: G.P.filter((_, i) => G.ok(i)).length, insideBuildings: navInsideBy }, pairs,
    boundaryArea: r1(area(BOUNDARY)) });
})()
