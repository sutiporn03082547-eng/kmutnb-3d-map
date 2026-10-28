# Audit 2026-10-28T17:59:07.501Z

Entries: 66 (buildings 50, flat items 16); matched to an OSM building: 45; OSM buildings in campus not on the map: 1.
Walking network: 1156 points, 1 pieces, largest 1156. Roads/paths: 43.

| severity code | count |
|---|---|
| S footprints-overlap | 1 |
| S height-per-floor | 1 |
| S levels-differ | 1 |
| S long-detour | 1 |
| S model-beyond-footprint | 3 |
| S model-sunk | 1 |
| S not-in-osm | 5 |
| S osm-area-differs | 1 |
| S osm-building-missing-from-map | 1 |
| S outside-campus | 1 |
| S road-crosses-building | 5 |
| S route-start-far | 4 |
| S unused-model-slots | 6 |
| S walk-network-inside-building | 5 |

## Issues

| sev | code | id | detail |
|---|---|---|---|
| S | model-sunk | 11 | lowest point -3.3 m |
| S | unused-model-slots | 11 | 72 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | unused-model-slots | 41 | 18 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | route-start-far | 42 | nearest walking-network point is 26.7 m from the building edge |
| S | unused-model-slots | 47 | 120 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | model-beyond-footprint | 52 | model reaches 6.3 m outside the footprint box (extensions, canopies or misplaced parts) |
| S | not-in-osm | 52 | no overlapping OpenStreetMap building (footprint source unknown or OSM missing it) |
| S | unused-model-slots | 69 | 5 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | route-start-far | 72 | nearest walking-network point is 51.9 m from the building edge |
| S | not-in-osm | 71 | no overlapping OpenStreetMap building (footprint source unknown or OSM missing it) |
| S | route-start-far | 71 | nearest walking-network point is 52 m from the building edge |
| S | levels-differ | 78B | map 10 floors, OSM building:levels=9 |
| S | model-beyond-footprint | 79 | model reaches 13 m outside the footprint box (extensions, canopies or misplaced parts) |
| S | model-beyond-footprint | 91 | model reaches 259.3 m outside the footprint box (extensions, canopies or misplaced parts) |
| S | unused-model-slots | 91 | 7 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | unused-model-slots | 98 | 20 empty instance slots, 0 empty meshes (draw nothing, cost a little) |
| S | not-in-osm | 98 | no overlapping OpenStreetMap building (footprint source unknown or OSM missing it) |
| S | outside-campus | bikeLib | centre 13.8198146,100.5138819 outside BOUNDARY |
| S | not-in-osm | seven | no overlapping OpenStreetMap building (footprint source unknown or OSM missing it) |
| S | not-in-osm | 97 | no overlapping OpenStreetMap building (footprint source unknown or OSM missing it) |
| S | osm-area-differs | ipc | area 1.43× OSM way 158475015 |
| S | route-start-far | u2 | nearest walking-network point is 29.2 m from the building edge |
| S | height-per-floor | 94 | 11 m / 1 floors = 11 m per floor |
| S | osm-building-missing-from-map | osm:986219917 | โรงอาหาร yes 76.7 m² at -192.4,-280.8 |
| S | footprints-overlap | 43×44 | 14.3 m² (7% of the smaller) |
| S | road-crosses-building | 81 | road #16 (s) segment 0 |
| S | road-crosses-building | 44 | road #39 (f) segment 1 |
| S | road-crosses-building | 47 | road #39 (f) segment 0 |
| S | road-crosses-building | 21 | road #41 (f) segment 2 |
| S | road-crosses-building | 22 | road #41 (f) segment 1 |
| S | walk-network-inside-building | 21 | 6 routing points inside the footprint |
| S | walk-network-inside-building | 22 | 8 routing points inside the footprint |
| S | walk-network-inside-building | 44 | 3 routing points inside the footprint |
| S | walk-network-inside-building | 47 | 8 routing points inside the footprint |
| S | walk-network-inside-building | 81 | 4 routing points inside the footprint |
| S | long-detour | 96→97 | walk 166.5 m vs straight 40.4 m |