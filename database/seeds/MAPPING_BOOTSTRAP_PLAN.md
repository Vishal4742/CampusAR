# Mapping Bootstrap Plan Without Existing Campus Data

Owner: CLI 2, WSL Codex.

Status: user confirmed there is no existing campus dataset beyond two Google Maps links.

## Constraint

The project does not currently have:

- Campus geofence polygon.
- Building footprints.
- Floor plans.
- Room list.
- Path graph.
- Staircase or lift locations.
- Accessibility metadata.
- QR anchor locations.

The two Google Maps pins are useful only as draft outdoor anchors. They are not enough for navigation.

## Bootstrap Strategy

CampusAR should bootstrap its map through the SRS crowdsourced mapping flow:

1. Start with the two Google Maps pins as draft campus reference points.
2. Seed the first admin account: `vg8904937@gmail.com`.
3. Create verified mapper accounts for trusted AIML Club / The Origin Guild contributors.
4. Enable mapping mode while the admin map lock is open.
5. Walk the campus and add outdoor landmarks first: gates, main roads, walking paths, building entrances, admin office, and common destinations.
6. Add building interiors one building at a time: floor labels, corridors, labs, classrooms, faculty rooms, stairs, and lifts.
7. Create graph edges by walking between nodes.
8. Add QR anchors at stable locations after physical QR placement is approved.
9. Let verified students/staff confirm locations within the configured radius.
10. Admin approves verified locations and locks new location creation when the initial campus map is stable.

## Minimum Useful First Map

The first usable map should target:

- campus entry point
- one main building entrance
- admin office or reception
- one department/lab destination
- one canteen or common area
- outdoor paths connecting those nodes

This lets the Phase 1 navigation slice work without pretending the full campus graph exists.

## Data Quality Rules

- Do not invent coordinates.
- Do not derive indoor rooms from Google Maps.
- Do not mark draft pins as verified locations.
- Every contributed location needs mapper identity, timestamp, confidence, and admin review state.
- Indoor locations should become trusted only after confirmation and admin approval.
- Accessibility tags should remain unknown until verified on site.

## Backend Implications

- Backend must support draft and pending map records from the start.
- Admin dashboard must make review state clear.
- Sync must tolerate sparse maps and later graph corrections.
- API responses should distinguish `draft`, `pending_confirmation`, `pending_admin_review`, and `verified`.
- Mobile app should handle empty or partial graph data gracefully.

## Open Questions

- Who are the first verified mappers?
- Which building should be mapped first?
- What confirmation threshold should be used for the first mapping phase?
- Will the college allow QR stickers or printed anchors?
- Is there a campus security or admin office that must approve data collection walks?
