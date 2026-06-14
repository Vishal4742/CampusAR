# Agent Instructions

## Single Codex CLI
- Use one active Codex CLI/session for this repo.
- Assign work by module and phase, not by `CLI 1` or `CLI 2`.
- Read `CODEX_HANDOFF.md` before cross-module planning or implementation.
- Keep edits scoped to the active task; update shared docs when phase scope changes.

## Package Managers
- Backend: use **npm** in `backend/`.
- Android app: use **Gradle** in `android-app/`.
- Native engine: use **Cargo** in `native-engine/`.

## File-Scoped Commands
| Task | Command |
| --- | --- |
| Backend typecheck | `cd backend; npm run check` |
| Backend tests | `cd backend; npm test` |
| Backend build | `cd backend; npm run build` |
| Admin JS syntax | `node --check admin-dashboard/app.js` |
| Rust format check | `cargo fmt --manifest-path native-engine/Cargo.toml -- --check` |
| Rust tests | `cargo test --manifest-path native-engine/Cargo.toml` |
| Android debug build | `gradle -p android-app :app:assembleDebug --stacktrace` |

## Module Boundaries
- Backend/API/data/admin work lives in `backend/`, `database/`, and `admin-dashboard/`.
- Android/mobile/native work lives in `android-app/` and `native-engine/`.
- Shared contracts belong in `CODEX_HANDOFF.md`, `BACKEND_API_PLAN.md`, and phase plans before implementation crosses modules.
- Do not install dependencies, connect production services, or scaffold new implementation areas without explicit approval.

## Graphify
- When the user types `/graphify`, invoke the `graphify` skill before doing anything else.

## Commit Attribution
AI commits MUST include:
```text
Co-Authored-By: (the agent model's name and attribution byline)
```
