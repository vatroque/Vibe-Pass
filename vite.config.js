import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ============================================================================
 * VIBE PASS — vite.config.js
 * ----------------------------------------------------------------------------
 * One build, two publish targets. Each target differs only in the URL the site
 * is served from, and that single value determines two things:
 *
 *   1. `base` — the path every asset URL is prefixed with. Getting it wrong
 *      produces a blank page with 404s on every asset.
 *   2. The absolute URLs baked into index.html (canonical, og:url), which must
 *      name the origin actually serving the page.
 *
 * Deriving both from one constant keeps them from drifting apart.
 *
 *   GitHub Pages (default)  vite build           -> base "/Vibe-Pass/"
 *   Cloudflare Workers      npm run cf:build     -> base "/"
 *                                                  (see vite.cloudflare.config.js)
 * ========================================================================== */

/* The GitHub Pages project site. Also the literal URL written into index.html,
   which is what the rewrite below searches for. */
export const GITHUB_PAGES_URL = "https://vatroque.github.io/Vibe-Pass/";

/**
 * Rewrites the absolute GitHub Pages URLs in index.html to the origin this
 * build is actually published to. Without it a Cloudflare deploy would keep
 * telling search engines and social scrapers that the Pages copy is the
 * canonical one.
 */
function siteUrlRewrite(site) {
  return {
    name: "vibe-pass:site-url",
    transformIndexHtml(html) {
      return site === GITHUB_PAGES_URL
        ? html
        : html.replaceAll(GITHUB_PAGES_URL, site);
    },
  };
}

/**
 * @param {{ site?: string }} options
 *   `site` is the URL the build will be served from — either absolute
 *   ("https://vibepass.ae/") or a bare path ("/"). Its pathname becomes `base`.
 */
export function createViteConfig({ site = GITHUB_PAGES_URL } = {}) {
  /* The second argument only supplies an origin for bare-path values like "/";
     it is discarded, since only the pathname is read. */
  const base = new URL(site, "https://base.invalid").pathname;

  return {
    base,
    plugins: [react(), siteUrlRewrite(site)],

    build: {
      outDir: "dist",
      /* Keep source maps on. They are what makes a production stack trace point
         at real source lines instead of bundled output. */
      sourcemap: true,
      rollupOptions: {
        output: {
          /* Leaflet is used by exactly one view (the discovery map). Splitting
             it out keeps it off the landing page's critical path. */
          manualChunks: {
            leaflet: ["leaflet"],
            react: ["react", "react-dom"],
          },
        },
      },
    },

    server: { port: 5173, open: true },
  };
}

export default defineConfig(createViteConfig());
