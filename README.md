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
│   ├── favicon.svg             Copied to the build output verbatim
│   └── _headers                Cloudflare response headers (inert on Pages)
├── vite.config.js              Build config — see "Deploying"
├── vite.cloudflare.config.js   Same build at base "/" for Cloudflare
├── wrangler.jsonc              Cloudflare assets-only Worker
├── tailwind.config.js          Palette and typeface tokens
└── .github/workflows/
    ├── deploy.yml              -> GitHub Pages
    └── deploy-cloudflare.yml   -> Cloudflare Workers
```

`src/main.jsx` is a single large module (~13,000 lines) carrying every
component, the state machine, and the mock datasets. Splitting it into a
proper module tree is the main outstanding piece of technical debt — see
`MIGRATION.md` for an earlier attempt at that split, which was never
delivered.

---

## Deploying

The app ships to two targets. They differ in exactly one thing — the URL the
site is served from — which determines both Vite's `base` and the absolute
canonical / `og:url` tags written into `index.html`. `vite.config.js` derives
both from a single value so they cannot drift apart.

| Target | Command | `base` | Workflow |
|---|---|---|---|
| GitHub Pages (default) | `npm run build` | `/Vibe-Pass/` | `.github/workflows/deploy.yml` |
| Cloudflare Workers | `npm run cf:build` | `/` | `.github/workflows/deploy-cloudflare.yml` |

Both workflows trigger on pushes to `main` and can be run manually from the
Actions tab. They deploy independently — neither cancels the other.

### GitHub Pages

**Base path.** `GITHUB_PAGES_URL` in `vite.config.js` is the project site URL;
its pathname becomes `base`. Getting it wrong produces a blank page with 404s
on every asset — the single most common deployment failure for this setup.

**Pages source.** `deploy.yml` runs `actions/configure-pages` with
`enablement: true`, which pins the Pages build type to *GitHub Actions*. This is
deliberate: under the legacy branch-based source, Pages would publish the
repository root verbatim, and the root `index.html` points at `/src/main.jsx` —
uncompiled JSX that no browser can execute. Only the compiled `dist/` output is
ever publishable.

### Cloudflare Workers

Served as an **assets-only Worker** — `wrangler.jsonc` declares no `main`, so
there is no server-side code and Cloudflare serves `dist/` straight from its
edge. `not_found_handling` is `single-page-application`, which returns
`index.html` with a 200 for any unmatched path, so a refresh or a shared deep
link loads the app instead of a 404.

```bash
npm run cf:dev       # build, then serve on workerd locally at :8787
npm run cf:deploy    # build, then deploy to production
npm run cf:preview   # build, then upload a preview version (no production traffic)
```

**One-time setup.** Two repository secrets are required for CI
(*Settings → Secrets and variables → Actions*):

| Secret | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right-hand sidebar |

Locally, `npx wrangler login` covers both instead.

**Set `SITE_URL` after the first deploy.** The first `cf:deploy` prints the
live URL (`https://vibe-pass.<your-subdomain>.workers.dev`). Add it — or the
custom domain, once one is attached in *Workers & Pages → Settings → Domains
& Routes* — as a repository **variable** named `SITE_URL`, including the
trailing slash. Until then the canonical and `og:url` tags fall back to `/`,
which resolves correctly in a browser but gives social scrapers no absolute URL
to work with. Asset loading does not depend on it.

**Response headers** live in `public/_headers`: `nosniff`,
`strict-origin-when-cross-origin`, and `X-Frame-Options: DENY` everywhere, plus
a one-year `immutable` cache for `/assets/*`, whose filenames carry a content
hash. Wrangler consumes the file at deploy time rather than publishing it.
GitHub Pages has no equivalent mechanism and never interprets it, so the Pages
deploy behaves exactly as it did before.

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
