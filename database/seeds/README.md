# Seed Data

The user confirmed there is no existing campus dataset right now.

Only Google Maps source links are available.

Current source links are stored in `source-links.json`:

- `https://maps.app.goo.gl/xUen8Rr4UNMqDgfR6`
- `https://maps.app.goo.gl/PoESLVac4tegAM489`

Resolved draft pins:

- Oriental Institute of Science and Technology oriental campus bhopal: `23.2487036, 77.5029367`
- Oriental College of Technology: `23.2462927, 77.5019383`

These are seed pins only. They are not a campus geofence, indoor graph, floor plan, building footprint, staircase/lift map, route graph, or verified navigation dataset.

Bootstrap approach:

- Use `MAPPING_BOOTSTRAP_PLAN.md`.
- Treat all map data as mapper/admin-created until real institutional data appears.
- Start with a sparse outdoor graph and expand through verified mapping walks.

Expected future inputs:

- OCT Bhopal campus geofence.
- Building names, codes, footprints, and centroids.
- Floor labels and floor indices.
- Zones for occupancy aggregation.
- Verified starting locations and path edges.
- Staircase, lift, and accessibility metadata.
- QR anchor locations.

Do not invent campus geometry. Use only approved institutional data or verified mapper/admin inputs.
