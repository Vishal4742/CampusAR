# CampusAR Database

Owner: CLI 2, WSL Codex.

This folder contains PostgreSQL/PostGIS planning and migration scaffolding for the backend-owned database.

## Current State

- `migrations/001_phase1_foundation.sql` defines the Phase 1 conceptual foundation schema.
- No database has been created or migrated from this workspace.
- No migration tool has been selected yet.

## Phase 1 Database Responsibilities

- User identity, roles, verification, and contribution cooldown.
- OTP challenge tracking.
- Campus geofence, buildings, floors, zones, location nodes, path edges, and QR anchors.
- Map lock and confirmation threshold settings.
- Sync change log and server cursors.
- Relay packet hash deduplication.
- Admin audit events.

## Decisions Still Needed

- Migration tool.
- ORM or query builder.
- Local development database name and user.
- Hosting target for production PostgreSQL/PostGIS.
- Seed data format for campus geometry.
