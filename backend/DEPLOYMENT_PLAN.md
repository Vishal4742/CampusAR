# CampusAR Backend Deployment Plan

Owner: CLI 2, WSL Codex.

Status: Phase 1 planning. No server or database has been provisioned.

## SRS Targets

- Backend stack: Node.js with PostgreSQL/PostGIS.
- Availability target: 99% monthly uptime.
- API security: HTTPS with JWT authentication.
- Offline-first app behavior: navigation must remain usable even when backend is unavailable.

## Recommended Phase 1 Environments

| Environment | Purpose | Notes |
| --- | --- | --- |
| Local WSL | Development | Node.js backend and local PostgreSQL/PostGIS later |
| Staging VPS | Integration testing | Mirrors production services and test seed data |
| Production VPS | OCT deployment | HTTPS, backups, monitoring, and admin access controls |

## Runtime Plan

- Run backend as a Node.js service behind a reverse proxy.
- Terminate HTTPS at the reverse proxy or managed platform.
- Use PostgreSQL with PostGIS extension enabled.
- Keep secrets in environment variables or provider secret manager.
- Keep database migrations separate under `database/migrations/`.
- Add health check endpoint `/health` for uptime checks.

## Required Configuration

| Variable | Purpose | Current status |
| --- | --- | --- |
| `PORT` | Backend port | Defaults to `8080` |
| `HOST` | Bind host | Defaults to `0.0.0.0` |
| `CAMPUSAR_JWT_SECRET` | Token signing secret | Required before production |
| `CAMPUSAR_COLLEGE_EMAIL_DOMAIN` | OTP email domain restriction | Open |
| `CAMPUSAR_SEED_ADMIN_EMAIL` | Development seed admin | Open |
| `DATABASE_URL` | PostgreSQL connection string | Open |
| `EMAIL_PROVIDER_*` | OTP delivery | Open |
| `PUSH_PROVIDER_*` | Future SOS/push path | Open |

## Operational Requirements

- Daily database backups once real data exists.
- Audit logging for admin role, map lock, threshold, approval, and dispute actions.
- HTTPS-only production traffic.
- Database migration review before applying to staging or production.
- Monitoring for `/health`, process restarts, disk usage, and database availability.
- Log retention policy that does not expose sensitive location history.

## Open Provider Decisions

- VPS or managed hosting provider.
- PostgreSQL/PostGIS hosting model.
- Domain and TLS certificate source.
- Email/OTP provider.
- Push notification provider.
- SMS provider for mobile SOS path.
- Backup storage target.
