import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ============================================================================
 * VIBE PASS — vite.config.js
 * ----------------------------------------------------------------------------
 * BASE PATH — set this before your first deploy.
 *   GitHub Pages project site  https://<user>.github.io/<repo>/  ->  "/<repo>/"
 *   Custom domain or user site https://vibepass.ae/              ->  "/"
 * Getting this wrong produces a blank page with 404s on every asset.
 * ========================================================================== */
const BASE = "/Vibe-Pass/";

export default defineConfig({
  base: BASE,
  plugins: [react()],

  build: {
    outDir: "dist",
    /* Keep source maps on. They are what makes a production stack trace point
       at real source lines instead of bundled output. */
    sourcemap: true,
    rollupOptions: {
      output: {
        /* d3 is used by exactly one component (the discovery map). Splitting it
           out keeps ~90 KB off the landing page's critical path. */
        manualChunks: {
          d3: ["d3"],
          react: ["react", "react-dom"],
        },
      },
    },
  },

  server: { port: 5173, open: true },
});
