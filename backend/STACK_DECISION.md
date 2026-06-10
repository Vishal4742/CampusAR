# Backend Stack Decision

Owner: CLI 2, WSL Codex.

Status: implemented for the Phase 1 backend scaffold. PostgreSQL/PostGIS is modeled but not connected yet.

## Decision

Use:

- Node.js with TypeScript.
- Fastify for the HTTP framework.
- TypeBox with Fastify/Ajv compiled schemas for request and response validation.
- PostgreSQL with PostGIS.
- Drizzle ORM with `pg` for SQL-first, type-safe database access.
- Drizzle migrations through `drizzle-kit`.
- `jose` for JWT signing and verification.
- React admin dashboard later through Vite + TypeScript when dashboard implementation starts.

## Reasoning

- Fastify has lower overhead than heavier Node frameworks and supports schema-driven validation and serialization.
- TypeBox/Ajv gives compiled JSON schema validation, which fits a performance-focused API better than object-heavy runtime validators.
- Drizzle keeps SQL visible, which matters for PostGIS queries, spatial indexes, sync cursors, and migration review.
- `pg` is mature and works cleanly with PostgreSQL/PostGIS.
- TypeScript gives contracts across backend, admin dashboard, and generated API types.
- `jose` avoids keeping scaffold-only token signing in production-facing code.

## Deferred

- Connecting Fastify services to PostgreSQL/PostGIS.
- Generating reviewed Drizzle migrations from the TypeScript schema.
- Replacing development OTP responses with a real provider adapter.
