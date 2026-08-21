# Vibe Pass™

UAE-native super-app for live events ticketing and verified talent management, operating in Abu Dhabi and Dubai.

**Epicenter Technologies LTD**

---

## What this is

A React 18 single-page application with three role-gated hubs behind a public marketing landing page:

| Surface | Purpose |
|---|---|
| **Landing Page** | Open discovery of events, venues and talent; Auth/KYC gate |
| **Explorer Pass** (Consumer Hub) | Event feed, D3 discovery map, booking flow, ticket wallet |
| **Talent Pass Hub** | UAE Pass / Emirates ID / MoHRE verification wizard, five-tab performer dashboard |
| **Promoter Hub** | Venue and event management console, community tools, Post Event flow |

Fiat / AED only. No crypto or wallet-connect logic anywhere in the codebase, per DCT Abu Dhabi and UAE Pass compliance requirements.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build locally
```

Requires Node 20 or later.

---

## Before your first deploy

**Set the base path.** Open `vite.config.js` and edit one line:

```js
const BASE = "/vibe-pass/";   // <- change this
```

| Deploy target | Value |
|---|---|
| GitHub Pages project site — `https://<user>.github.io/<repo>/` | `"/<repo>/"` |
| Custom domain or user site — `https://vibepass.ae/` | `"/"` |

Getting this wrong produces a blank page with 404s on every asset. It is the single most common deployment failure for this setup.

**Then enable Pages.** In the repository: *Settings → Pages → Build and deployment → Source: **GitHub Actions***. Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes `dist/`.

---

## Project structure

```
vibe-pass/
├── index.html                  Entry document — one <script type="module">
├── css/
│   └── styles.css              All styling: tokens, layout, 20 keyframes, a11y
├── js/
│   ├── main.js                 createRoot mount
│   ├── App.js                  useReducer owner + entry gate + Demo Control Bar
│   ├── router.js               View routing, state machine, mock personas
│   ├── theme.js                C / PC design tokens, focus rings, font stacks
│   ├── lib/                    Pure helpers — format, geo, qr, schedule, ranking
│   ├── data/                   Datasets — events, previews, talent, promoter
│   └── components/
│       ├── LandingPage.js      Public marketing surface
│       ├── VibePassApp.js      Three-hub app shell
│       ├── ErrorBoundary.js    Per-shell crash containment
│       ├── ui.js               Shared primitives
│       ├── consumer/  talent/  promoter/  landing/
│       └── …                   One file per major component
├── legacy/
│   └── index.original.html     Frozen 13,384-line monolith — rollback reference
└── .github/workflows/deploy.yml
```

### Dependency layering

Imports flow strictly downward. There are **zero cycles**, verified by static analysis.

```
main.js → App.js → LandingPage / VibePassApp
                 → views, sections, sheets, modals
                 → components/ui.js
                 → theme.js · lib/ · data/ · router.js   (leaf level)
```

`js/router.js` imports nothing at all — no React, no lucide, no d3. That is deliberate: the routing rules are unit-testable in plain Node.

---

## Architecture notes

### One reducer, three slices

State lives in `js/router.js` as a pure reducer over a flat object with root, app-shell and landing slices. `App.js` owns the single `useReducer`; both shells receive `state` and `dispatch`. No callback threading between components.

Three side effects stay in the view layer on purpose, because they touch the DOM rather than state:

- `scrollToId` on marketing nav click (target exported as `SCROLL_TARGET_ID`)
- the 900 ms tutorial timer (dispatches `START_TUTORIAL`)
- typeface loading (now handled by `index.html` + `css/styles.css` §1)

### Three role mappers that must not be merged

`js/router.js` §3 defines `hubToAuthRole`, `authRoleToHub` and `entryRoleToHub`. They look interchangeable and are not — they differ on fallback behaviour. Collapsing them into one helper silently breaks the Referred Guest quick-login path. The file documents each with its original source line.

### Hubs stay mounted

All three hubs render simultaneously; `contents` / `hidden` toggles which one participates in layout. This preserves each hub's internal tab, wizard and scroll position across switches. Conditional rendering would reset every one of them.

### First-visit confirmation gate

Switching to a hub you have not visited this session raises a confirmation, then re-runs the pre-filled sign-up flow for that role. The hub you entered through counts as already visited. `visitedHubs` is **reset** on entry, not merged — see `mountAppShell()` in `router.js` for why.

---

## Known items

| Item | Status |
|---|---|
| **Tailwind arbitrary classes** | The old Play CDN silently dropped classes like `h-[340px]`. The real PostCSS build compiles them, so some may now take effect for the first time. Diff against `legacy/index.original.html` in a browser before shipping. |
| **`vpDropIn` keyframe** | Defined in `css/styles.css` §7, referenced zero times. Retained and flagged rather than deleted. |
| **Two golds** | `C.gold` is `#F5B942`; the landing ticker and `GoldChip` hardcode `#D9A85C`. Both tokenised separately in `styles.css` §2. Reconciling is a design decision. |
| **Three scope widenings** | `::selection`, `-webkit-tap-highlight-color` and font loading were component-scoped in the monolith and are now global. All are widenings; each has a documented one-line revert. |
| **Tiered ticket crash** | Reported when selecting non-default ticket tiers. Not reproducible by static analysis. `ErrorBoundary` now prints the component stack instead of blanking the screen — reproduce with `sourcemap: true` enabled and send the trace. |
| **`.js` extension on JSX** | `vite.config.js` carries the esbuild loader override. Renaming components to `.jsx` lets both blocks be deleted. |

---

## Code conventions

Carried forward from the original codebase and applied throughout:

- `function` declarations for components, arrow functions inside `useCallback`
- No optional chaining (`?.`)
- Template literals for interpolation
- Hex-plus-alpha colour suffixes (`${C.amethyst}55`)
- No TypeScript, no PropTypes
- No `<form>` tags — event handlers only
- Colour tokens via the `C` object (`PC` in the Promoter Hub)

---

## Compliance

Regulatory touchpoints are load-bearing and must not be substituted with placeholders:

- **DCT Abu Dhabi** event permits (`PROMOTER_MOCK_PROFILE.permitNumber`)
- **MoHRE / Free Zone** work authorisation in the Talent verification wizard
- **UAE Pass** and **Emirates ID** linking
- **ADGM**-anchored escrow references in wallet flows
- **AED-only** pricing throughout

---

© Epicenter Technologies LTD. All rights reserved.
