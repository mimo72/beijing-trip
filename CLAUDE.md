# Beijing Trip PWA - Project Context

## Project Overview
- **Name**: 北京之旅 · 春节出行伴侣
- **Type**: Progressive Web App (vanilla JS/CSS/HTML, zero framework dependencies)
- **Deployment**: GitHub Pages at https://mimo72.github.io/beijing-trip/
- **Repo**: https://github.com/mimo72/beijing-trip (branch: main)
- **Local Path**: /Users/tingyoo/beijing-trip/v2/
- **Git Root**: /Users/tingyoo/beijing-trip/v2/ (not the parent directory)

## Tech Stack
- Vanilla JavaScript (ES6 modules), HTML5, CSS3
- Service Worker (offline-first PWA)
- No build tools, no npm dependencies (except devDeps for testing)
- Testing: Vitest + jsdom (`npm test`)

## Key Files
| File | Description |
|------|-------------|
| index.html | Entry point, shell HTML |
| app.js | Core app logic (routing, rendering, state, interactions) |
| data.js | Trip data (flights, hotel, itinerary, checklists, budget) |
| styles.css | Main stylesheet (~23KB) |
| features.css | Feature-specific styles (~6KB) |
| sw.js | Service Worker |
| manifest.json | PWA manifest |
| tests/ | Vitest test suite (316 tests) |

## Team Structure & Roles

| Role | Responsibilities |
|------|-----------------|
| **Product Director (产品总监)** | Requirements review, final QA on iPhone, experience walkthrough |
| **Technical Architect (技术架构师)** | Code quality review, conflict management, integration testing, run test suite |
| **UI Developer (UI开发)** | Frontend visual implementation: CSS, SVG, animations, interactions |
| **Content Developer (内容开发)** | Data layer: itinerary data, budget data, checklist data in data.js |

### Workflow
1. UI Developer + Content Developer work **in parallel** (when no file conflicts)
2. Technical Architect **reviews + runs tests** after implementation
3. Product Director **signs off** (user reviews on iPhone)

### Conflict Rules
- `data.js` changes must be **serialized** (one agent at a time)
- `styles.css` / `features.css` can be edited in parallel with `data.js` / `app.js`
- After all changes: run `npm test`, verify 316+ tests pass, then commit & push

## Deployment
- All changes push to `main` branch
- GitHub Pages auto-deploys from root of `main`
- Root index.html redirects to v2/ (the actual app)
- URL: https://mimo72.github.io/beijing-trip/
- After push, wait ~1 min for Pages to rebuild
- iPhone: clear Safari cache to see latest changes

## Trip Details
- **Travelers**: 2 people
- **Dates**: 2026-02-20 (Day1) to 2026-02-24 (Day5), Spring Festival
- **Home address**: 上海市浦东新区严杨路166弄6号
- **Transport to airport**: Self-drive to 虹桥T2, park at P4
- **Flights**: MU5105 (SHA→PEK 10:00-12:15) / MU5128 (PEK→SHA 21:00-23:10)
- **Hotel**: 亚朵酒店·十里河 (朝阳区, 10号线/14号线)

## Design Language
- Color scheme: Red (#C62828) + Gold (#D4A853) + Warm neutral (#F8F6F3)
- Glassmorphism (backdrop-filter blur)
- Spring animations (cubic-bezier(.34, 1.56, .64, 1))
- Dark mode support (system + manual toggle)
- Mobile-first, max-width 500px
- Accessibility: prefers-reduced-motion support
