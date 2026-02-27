# CampusAR — Weekly Task Tracker
> Update this file every time you sit down to work. Commit it with your daily commit.
> Format: `[x]` done · `[/]` in progress · `[ ]` not started

**Project start:** 2026-02-27  
**Demo date:** ~2026-04-23

---

## ⚡ Week 1 — Setup + QR Scanner
**Target:** Scan QR → "You are at: Main Entrance" in 150ms  
**Dates:** Feb 27 – Mar 5

- [ ] Init SolidJS PWA with Vite + TypeScript
- [ ] Set up folder structure (§4.2)
- [ ] Integrate Nimiq QR Scanner in WebWorker
- [ ] Transferable ImageBitmap (zero-copy, §19.4)
- [ ] Center-crop 320×320 in worker
- [ ] `getUserMedia` constraints — 30fps, continuous focus (§19.2)
- [ ] Build `qrParser.ts` — v2 payload validation
- [ ] Set up Supabase + create all tables (§8.3)
- [ ] `manifest.json` + skeleton `sw.ts`

**Week 1 done:** `[ ]`

---

## 🗺️ Week 2 — Navigation Graph + Route Cache
**Target:** `dijkstra("MAIN_ENTRANCE", "CSE_HOD")` prints correct path  
**Dates:** Mar 6 – Mar 12

- [ ] Define all interfaces in `shared/types.ts` (§8.1)
- [ ] Build `graph.ts` — adjacency list
- [ ] Build `dijkstra.ts` — multi-floor shortest path
- [ ] Build `precomputeAllRoutes()` — runs at install time
- [ ] Flat Map route cache `"FROM::TO"` → O(1) lookup (§19.5.2)
- [ ] Build `idb.ts` — single-transaction startup read (§19.5.1)
- [ ] Author OCT campus JSON — 30 nodes, 40 edges, 3 floors
- [ ] Store route cache in IndexedDB

**Week 2 done:** `[ ]`

---

## 🧭 Week 3 — EKF Dead Reckoning
**Target:** Walking updates estimated position on screen — offline  
**Dates:** Mar 13 – Mar 19

- [ ] Build `ekf.ts` — Extended Kalman Filter (§17.2)
- [ ] Weinberg adaptive step length (§17.2.3)
- [ ] `sensorStore.ts` — 30Hz orientation, 50Hz motion (§19.9)
- [ ] `{ passive: true }` on all sensor listeners
- [ ] Frame-budget rAF sensor loop (§19.3)
- [ ] Build `bearing.ts` + `distance.ts`
- [ ] iOS permission gate button
- [ ] Graceful fallback if gyroscope unavailable

**Week 3 done:** `[ ]`

---

## 🏹 Week 4 — AR Overlay
**Target:** CSS arrow floats on camera, points correct direction after QR scan  
**Dates:** Mar 20 – Mar 26

- [ ] Build `AROverlay.tsx` — camera feed + CSS 3D layer
- [ ] GPU compositing: `will-change`, `translateZ(0)` (§19.1)
- [ ] Only animate `transform` + `opacity` — never layout props
- [ ] Build `arCalc.ts` — bearing + heading → arrow angle
- [ ] Connect `sensorStore` → 60fps arrow rotation
- [ ] Destination label + distance text
- [ ] Floor-change indicator
- [ ] Corridor constraint filter (§17.3.2)
- [ ] Green pulse at destination (within 5m)
- [ ] Accuracy ring on 2D map (§17.4)

**Week 4 done:** `[ ]`

---

## 🔍 Week 5 — Navigation Flow + Search
**Target:** End-to-end: scan → search → follow arrows → arrive  
**Dates:** Mar 27 – Apr 2

- [ ] Build `searchIndex.ts` — prefix trie (§19.6)
- [ ] Build `Search.tsx` — trie search, results in ~0.3ms
- [ ] Wire full nav flow: QR → navStore → search → AR route
- [ ] Build `RouteCard.tsx` — step-by-step text fallback
- [ ] Build `FloorMap.tsx` — 2D SVG with route + accuracy ring
- [ ] Build `FloorBadge.tsx`
- [ ] Code splitting — lazy-load all screens except Scan (§19.7)
- [ ] Test multi-floor route: entrance → 3rd floor via stairs

**Week 5 done:** `[ ]`

---

## 🖥️ Week 6 — Admin Panel + QR Generation
**Target:** Admin places nodes, draws paths, exports QR PDF  
**Dates:** Apr 3 – Apr 9

> 🔑 **REMINDER: Add GitHub Secrets this week** (needed for Vercel deploy to work)
> Go to: `github.com/Vishal4742/CampusAR` → Settings → Secrets → Actions
> Add: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VERCEL_TOKEN`,
> `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_APP`, `VERCEL_PROJECT_ID_ADMIN`, `VERCEL_TEAM_ID`

- [ ] **Add all 7 GitHub Secrets** (see CONTRIBUTING.md for where to get each)
- [ ] Build `MapEditor.tsx` — upload SVG, click to place nodes
- [ ] Build `NodeEditor.tsx` — label, type, `facingDeg`, `corridorAxis`
- [ ] Edge drawing between nodes
- [ ] Build `QRManager.tsx` — client-side QR SVG (§18.7)
- [ ] `exportQRPDF()` — jsPDF, offline
- [ ] SVG tiering: full / simplified / skeleton (§18.4)
- [ ] Deploy admin to `admin-campusar.vercel.app`
- [ ] Admin preview mode — simulate navigation before publishing

**Week 6 done:** `[ ]`

---

## 📶 Week 7 — Offline + PWA + Bandwidth
**Target:** Installs on home screen, 300ms load, works in airplane mode  
**Dates:** Apr 10 – Apr 16

- [ ] `sw.ts` with Workbox — cache-first app shell
- [ ] Inline critical CSS in `index.html` — skeleton in frame 1 (§19.8)
- [ ] Async non-critical CSS — no render-blocking
- [ ] Delta sync `GET /api/map/delta?since=N` (§18.2)
- [ ] `networkAdapter.ts` — adaptive by connection type (§18.3)
- [ ] `vercel.json` — Brotli + immutable cache headers (§18.5)
- [ ] Test: first install ≤5s on 2G, ≤15s on slow-2G
- [ ] Lighthouse score ≥90 mobile
- [ ] Haptic feedback on scan (`navigator.vibrate`)
- [ ] Skeleton screens on all loading states

**Week 7 done:** `[ ]`

---

## 🎯 Week 8 — Demo + Docs
**Target:** 3-minute demo that wins the room  
**Dates:** Apr 17 – Apr 23

- [ ] Print + laminate 15 QR codes (v2 payload with `facingDeg`)
- [ ] Place QR codes on campus
- [ ] Practice demo script under 90 seconds
- [ ] Record demo video (screen + POV)
- [ ] Write project report (15–20 pages)
- [ ] 10-slide presentation deck
- [ ] Clean GitHub repo + README
- [ ] Final Vercel deployment check

**Week 8 done:** `[ ]`

---

## 📊 Performance Targets (verify before demo)

- [ ] JS per frame ≤ 4ms — Chrome DevTools Performance tab
- [ ] First paint ≤ 16ms — Lighthouse FCP
- [ ] App interactive ≤ 800ms on 3G — Lighthouse TTI
- [ ] Route lookup ≤ 0.001ms — `console.time('route')` test
- [ ] Search latency ≤ 0.5ms — `console.time('search')` test
- [ ] 60fps AR overlay on Redmi 9 — `chrome://tracing`
- [ ] First install ≤ 74kB compressed total

---

## 📅 Daily Log
> Add one line per day you work. Commit this file every session.

| Date | What I did |
|---|---|
| 2026-02-27 | Repo init, SRS finalized (§17 EKF, §18 bandwidth, §19 lightning perf) |
