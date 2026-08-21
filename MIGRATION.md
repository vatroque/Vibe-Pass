# Migration Report — monolith → modular workspace

Source: `legacy/index.original.html` (13,384 lines / 569,883 bytes, one inline
`<script type="text/babel">` block).

## Coverage

| Metric | Value |
|---|---|
| Top-level symbols in source | 219 |
| Symbols placed in modules | 215 |
| Symbols intentionally dropped | 4 — `VibePassApp`, `VibePassLandingPage`, `VibePassRoot`, `isInviteEntry` (logic now in `js/router.js` + the two shells) |
| Duplicate symbol names | 0 |
| Modules produced | 56 |
| Orphan modules (unreachable from `js/main.js`) | 0 |

## Verification performed

| Check | Result |
|---|---|
| JSX parse, every module | 56 / 56 pass |
| Import resolution — file exists AND named export exists | all resolve |
| Import cycles | 0 |
| Reachability from `js/main.js` | 56 / 56 |
| Full bundle link (esbuild, stubbed react/lucide/d3) | links clean, 576 KB |
| Symbol body parity vs source, whitespace-normalised | 209 / 215 verbatim |
| Remaining 6 | `CURRENT_USER`, `TALENT`, `KIND_MAP`, and the 3 mock profiles — relocated to `js/router.js`, every literal value verified present |
| Keyframe parity (`css/styles.css`) | 20 / 20 byte-equivalent |
| Reducer behavioural parity | 63 / 63 assertions pass |

## Not verified here

`npm install` and a real browser render could not run in the extraction
environment. **Visual QA against `legacy/index.original.html` is still
required** before this replaces the live deployment. The most likely source of
drift is Tailwind: arbitrary-bracket classes that the Play CDN silently dropped
now compile.

## Structural changes

1. **State centralised.** Fifteen `useState` calls across three sibling
   components became one pure reducer in `js/router.js`.
2. **Styles consolidated.** Four scattered `<style>` blocks became
   `css/styles.css`. Three rules widened scope — all documented inline with
   one-line reverts.
3. **`d3` isolated.** Used by exactly one component; now a separate build
   chunk, off the landing page's critical path.
4. **Icons unbundled.** One 84-icon import became per-module imports,
   tree-shakeable.
5. **`ErrorBoundary` added.** Net-new. No equivalent existed.

## Rollback

`legacy/index.original.html` is byte-identical to the uploaded source and opens
directly in a browser with no build step.
