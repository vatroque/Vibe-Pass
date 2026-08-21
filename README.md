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

## Project structure

```
Vibe-Pass/
├── index.html                  Entry document — one <script type="module">
├── src/
│   ├── main.jsx                The entire application: components, state,
│   │                           data and the createRoot mount
│   └── index.css               Tailwind directives + base document styling
├── public/
│   └── favicon.svg             Copied to the build output verbatim
├── vite.config.js              Build config — see "Before your first deploy"
├── tailwind.config.js          Palette and typeface tokens
└── .github/workflows/deploy.yml
```

`src/main.jsx` is a single large module (~13,000 lines) carrying every
component, the state machine, and the mock datasets. Splitting it into a
proper module tree is the main outstanding piece of technical debt — see
`MIGRATION.md` for an earlier attempt at that split, which was never
delivered.

---

## Before your first deploy

**Set the base path.** Open `vite.config.js` and edit one line:

```js
const BASE = "/Vibe-Pass/";   // <- change this
```

| Deploy target | Value |
|---|---|
| GitHub Pages project site — `https://<user>.github.io/<repo>/` | `"/<repo>/"` |
| Custom domain or user site — `https://vibepass.ae/` | `"/"` |

Getting this wrong produces a blank page with 404s on every asset. It is the single most common deployment failure for this setup.

**Pages source.** `.github/workflows/deploy.yml` runs `actions/configure-pages`
with `enablement: true`, which pins the Pages build type to *GitHub Actions*.
This is deliberate: under the legacy branch-based source, Pages would publish
the repository root verbatim, and the root `index.html` points at
`/src/main.jsx` — uncompiled JSX that no browser can execute. Only the
compiled `dist/` output is ever publishable.

Pushing to `main` builds and deploys automatically. The workflow can also be
run manually from the Actions tab (`workflow_dispatch`).

---

## Architecture notes

### Runtime dependencies are bundled, not fetched

React, `lucide-react` and `d3` resolve from `node_modules` and are compiled
into hashed chunks at build time. There is no CDN, no import map, and no
in-browser Babel transpilation. An earlier revision of this project loaded all
three from CDNs and transpiled ~570 KB of JSX in the browser on every page
load; that cost several seconds of blank screen on a slow connection and is
why the build step exists.

`d3` is used by exactly one component and is split into its own chunk to keep
it off the landing page's critical path.

### Typefaces

`index.html` requests the Google Fonts stylesheet during HTML parse. The
application also injects the identical URL at runtime (`FONT_HREF` in
`src/main.jsx`); the browser serves the second request from cache. Removing
either one leaves the other working.

### Hubs stay mounted

All three hubs render simultaneously; `contents` / `hidden` toggles which one
participates in layout. This preserves each hub's internal tab, wizard and
scroll position across switches. Conditional rendering would reset every one
of them.

### Three role mappers that must not be merged

`hubToAuthRole`, `authRoleToHub` and `entryRoleToHub` look interchangeable and
are not — they differ on fallback behaviour. Collapsing them into one helper
silently breaks the Referred Guest quick-login path.

---

## Known items

| Item | Status |
|---|---|
| **Single-file source** | `src/main.jsx` holds the whole application. It builds and ships correctly, but it is not a structure that scales with more than one contributor. |
| **No `og:image`** | No share image asset exists in the repository, so the `og:image` tag is intentionally absent. Social shares render without a preview card until a 1200×630 image is added. |
| **Remote imagery** | Event and venue imagery is loaded from `images.pexels.com` at runtime. The layout renders without it, but the cards appear empty if that host is unreachable. |
| **Tiered ticket crash** | Reported when selecting non-default ticket tiers. Not reproducible by static analysis. Source maps are enabled in the production build, so a browser stack trace will point at real source lines — reproduce and send the trace. |
| **`MIGRATION.md`** | Describes a 56-module split that was never committed to this repository. Retained for historical context only; it does not describe the current tree. |

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
