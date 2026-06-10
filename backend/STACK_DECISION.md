# Backend Stack Decision

Owner: CLI 2, WSL Codex.

Status: selected for the next production implementation pass. Dependencies are not installed yet.

## Decision

Use:

- Node.js with TypeScript.
- Fastify for the HTTP framework.
- TypeBox with Fastify/Ajv compiled schemas for request and response validation.
- PostgreSQL with PostGIS.
- Drizzle ORM with `pg` for SQL-first, type-safe database access.
- Drizzle migrations through `drizzle-kit`.
- `jose` or a reviewed Fastify JWT plugin for production JWT handling.
- React admin dashboard later through Vite + TypeScript when dashboard implementation starts.

## Reasoning

- Fastify has lower overhead than heavier Node frameworks and supports schema-driven validation and serialization.
- TypeBox/Ajv gives compiled JSON schema validation, which fits a performance-focused API better than object-heavy runtime validators.
- Drizzle keeps SQL visible, which matters for PostGIS queries, spatial indexes, sync cursors, and migration review.
- `pg` is mature and works cleanly with PostgreSQL/PostGIS.
- TypeScript gives contracts across backend, admin dashboard, and generated API types.

## Deferred Until Dependency Approval

- Installing packages.
- Replacing the dependency-free scaffold with TypeScript/Fastify.
- Adding Drizzle config and generated migrations.
- Connecting to PostgreSQL.
- Replacing scaffold token logic with reviewed production auth libraries.
