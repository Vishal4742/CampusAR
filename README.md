# CampusAR
> QR-based AR indoor navigation PWA for Indian college campuses

**Built by:** Vishal Kumar | Oriental College of Technology, Bhopal  
**Stack:** SolidJS · TypeScript · Vite · Supabase · Vercel · Workbox  
**Type:** Minor Project 2025-26

---

## What it does
Students scan a QR code on the corridor wall → app instantly knows their location → AR arrows float on camera feed guiding them step-by-step to any room — **fully offline after first install.**

## Key specs
- < 300ms QR scan to AR arrow
- 60fps CSS 3D overlay (no WebGL)
- ≤ 74kB first install (works on 2G)
- EKF dead reckoning — ≤ 0.8m accuracy between QR scans
- Zero app store — deploy as PWA

## Docs
- [`CampusAR_SRS_MVP.md`](./CampusAR_SRS_MVP.md) — Full Software Requirements Specification v1.2
- [`TASKS.md`](./TASKS.md) — Weekly build progress tracker

## Project structure
```
campusar/
├── app/          # SolidJS student PWA
├── admin/        # Admin panel (map editor, QR generator)
├── api/          # Vercel serverless functions
└── shared/       # Shared TypeScript types + constants
```

## Setup (coming Week 1)
```bash
cd app && npm install && npm run dev
```

## License
MIT
