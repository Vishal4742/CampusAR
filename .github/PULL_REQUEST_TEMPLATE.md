## What does this PR do?
<!-- One sentence summary -->


## Related week / checklist items
<!-- Which TASKS.md items does this close? -->
- Week: 
- [ ] `TASKS.md` item: 


## Type of change
- [ ] ✨ New feature
- [ ] 🐛 Bug fix
- [ ] ⚡ Performance improvement
- [ ] 📝 Docs / TASKS.md update
- [ ] 🔧 Config / tooling


## Performance checklist
<!-- Every PR touching app/ or engine/ must answer these -->
- [ ] I only animate `transform` or `opacity` — no layout-triggering CSS (§19.1)
- [ ] Any new sensor listeners use `{ passive: true }` (§19.9)
- [ ] Camera frames sent to WebWorker use `ImageBitmap`, not `ImageData` (§19.4)
- [ ] Route lookups use `ROUTE_MAP.get('from::to')`, not nested object (§19.5)
- [ ] No new `any` types in TypeScript
- [ ] N/A — this PR doesn't touch app performance code


## Tested on
- [ ] Chrome Android (emulator or real device)
- [ ] iOS Safari
- [ ] N/A — no UI changes


## Screenshots / recordings
<!-- If UI changed, paste a screenshot or screen recording here -->


## Notes for reviewer
<!-- Anything tricky, design decisions, or things to watch out for -->
