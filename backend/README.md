# CampusAR Backend

Owner: CLI 2, WSL Codex.

This is the Phase 1 backend scaffold for CampusAR. It is intentionally dependency-free until the backend framework, package manager, ORM/query builder, and migration tooling are approved.

## Scope

- Node.js backend boundary.
- Auth and role API skeleton.
- Map bootstrap and sync API skeleton.
- Admin API skeleton for future dashboard use.
- No Android or Rust files are owned by this area.

## Current State

The server exposes a dependency-free Phase 1 API using Node.js built-in `http` only. Persistence is in-memory until PostgreSQL tooling is approved.

Implemented now:

- `GET /health`
- `GET /api/v1`
- `GET /api/v1/routes`
- Visitor registration, verified-user OTP flow, login, token refresh, current profile, account deletion.
- Map manifest and seed map reads.
- Delta sync and relay packet deduplication.
- Admin user, role, map lock, threshold, pending-location, and audit route shapes.

## Commands

No dependencies are installed or required for the current scaffold.

```bash
npm run check
npm test
npm start
```

Default port: `8080`.

## Decisions Still Needed

- Backend framework: Fastify, Express, NestJS, or other.
- TypeScript migration path.
- ORM/query builder and migration tooling.
- JWT library and password/OTP hash strategy.
- PostgreSQL connection and configuration convention.
- Email/OTP provider.

See `API_CONTRACT.md` and `DEPLOYMENT_PLAN.md` for Phase 1 closeout details.
