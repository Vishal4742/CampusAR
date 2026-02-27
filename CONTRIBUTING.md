# Contributing to CampusAR

Thanks for contributing! CampusAR is a minor project but we keep it professional.

---

## Workflow

```
master  ← protected, never commit directly
  └── feature/your-feature  ← your branch
        └── Pull Request → CI checks → merge
```

### 1. Branch naming
```
feature/qr-scanner-worker
fix/arrow-angle-calculation
perf/route-cache-flat-map
docs/week-3-update
```

### 2. Make your branch
```bash
git checkout -b feature/your-feature-name
```

### 3. Work + commit daily
```powershell
# Use the helper script — it auto-updates TASKS.md log
.\commit.ps1 "what you did today"
```

Commit message format:
```
w2/2026-03-08: implement flat Map route cache (§19.5.2)
fix: arrow angle wrong for south-facing QR codes
perf: throttle sensor reads to 30Hz
docs: update TASKS.md week 3 checklist
```

### 4. Open a Pull Request
- Title: `[Week N] Feature description`
- Body: paste relevant checklist items from `TASKS.md`
- Keep PRs under **50 files changed** (CI enforces this)

### 5. CI must pass before merge

| Check | What it does |
|---|---|
| `App — TypeCheck + Lint + Build` | tsc + eslint + vite build |
| `Admin — TypeCheck + Lint + Build` | same for admin panel |
| `Shared — TypeCheck` | shared types compile clean |
| `PR Size Check` | ≤50 files changed |

A **preview deployment URL** will be posted as a comment on your PR automatically.

---

## Code standards

- **TypeScript strict mode** — no `any`, no `// @ts-ignore`
- **No layout-triggering CSS animations** — only `transform` + `opacity` (§19.1)
- **All sensor listeners must be `{ passive: true }`** (§19.9)
- **No new dependencies without discussion** — bundle size is a KPI (<200kB)
- Write unit tests in Vitest for any new engine function (`dijkstra`, `ekf`, `arCalc`, etc.)

---

## Secrets setup (for maintainers only)

Go to GitHub → Settings → Secrets → Actions and add:

| Secret | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel env ls` or Vercel dashboard |
| `VERCEL_PROJECT_ID_APP` | Vercel project settings (student app) |
| `VERCEL_PROJECT_ID_ADMIN` | Vercel project settings (admin panel) |
| `VERCEL_TEAM_ID` | Vercel team settings (use personal if no team) |

---

## Local dev (once code structure is set up)

```bash
# Student app
cd app && npm install && npm run dev

# Admin panel
cd admin && npm install && npm run dev

# Run tests
cd app && npm run test

# Type check everything
npx tsc --noEmit
```
