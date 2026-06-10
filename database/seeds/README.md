# Seed Data

The user confirmed there is no existing campus dataset right now.

Only Google Maps source links are available. Oriental College of Technology is the initial campus entity for seed planning.

Current source links are stored in `source-links.json`:

- `https://maps.app.goo.gl/xUen8Rr4UNMqDgfR6`
- `https://maps.app.goo.gl/PoESLVac4tegAM489`

Resolved draft pins:

- Oriental Institute of Science and Technology oriental campus bhopal: `23.2487036, 77.5029367`
- Oriental College of Technology: `23.2462927, 77.5019383`

OCT seed contract:

- stable key: `oct-bhopal`
- center coordinate: `23.2462927, 77.5019383`
- coordinate status: `provisional`
- geofence status: `unknown`
- initial map version: `1`, status `draft`

These are seed pins only. They are not a campus geofence, indoor graph, floor plan, building footprint, gate coordinate, staircase/lift map, route graph, or verified navigation dataset.

Bootstrap approach:

- Use `MAPPING_BOOTSTRAP_PLAN.md`.
- Use `OCT_SEED_CONTRACT.md`.
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
