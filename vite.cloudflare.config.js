import { defineConfig } from "vite";
import { createViteConfig } from "./vite.config.js";

/* ============================================================================
 * VIBE PASS — Cloudflare Workers build config
 * ----------------------------------------------------------------------------
 * Used by `npm run cf:build`. Cloudflare serves the app from the root of a
 * workers.dev subdomain or a custom domain, so `base` is "/" rather than the
 * "/Vibe-Pass/" that GitHub Pages needs.
 *
 * SITE_URL should be set to the real origin once one is attached:
 *
 *   SITE_URL=https://vibepass.ae/ npm run cf:build
 *
 * In CI it comes from the `SITE_URL` repository variable. Left unset, the
 * canonical and og:url tags in index.html fall back to "/", which resolves
 * against whatever origin serves the page — correct, but not useful to social
 * scrapers, which want an absolute URL.
 * ========================================================================== */

export default defineConfig(
  createViteConfig({ site: process.env.SITE_URL || "/" }),
);
