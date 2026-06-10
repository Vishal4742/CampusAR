# CampusAR Backend

Owner: CLI 2, WSL Codex.

This is the Phase 1 backend scaffold for CampusAR. It now uses the approved TypeScript/Fastify stack while keeping persistence in-memory until PostgreSQL/PostGIS is provisioned.

## Scope

- Node.js + TypeScript backend boundary.
- Auth and role API skeleton.
- Map bootstrap and sync API skeleton.
- Admin API skeleton for future dashboard use.
- No Android or Rust files are owned by this area.

## Current State

The server exposes a Fastify Phase 1 API with TypeBox/Ajv request validation. Persistence is in-memory until PostgreSQL tooling is connected through Drizzle.

Implemented now:

- `GET /health`
- `GET /api/v1`
- `GET /api/v1/routes`
- Visitor registration, verified-user OTP flow, login, token refresh, current profile, account deletion.
- Map manifest and seed map reads.
- Delta sync and relay packet deduplication.
- Admin user, role, map lock, threshold, pending-location, and audit route shapes.

## Commands

```bash
npm install
npm run check
npm test
npm run build
npm start
```

Default port: `8080`.

## Decisions Still Needed

- PostgreSQL/PostGIS hosting and connection target.
- Production OTP/email provider account and DNS setup.
- OTP rate limits, retry limits, and delivery audit retention.
- PostgreSQL connection and configuration convention.
- Real OCT campus seed data.

See `API_CONTRACT.md`, `DEPLOYMENT_PLAN.md`, `EMAIL_PROVIDER_OPTIONS.md`, and `STACK_DECISION.md` for Phase 1 closeout details.
