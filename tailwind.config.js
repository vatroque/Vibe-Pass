/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      /* Mirrors the palette used for inline `style={{ color: C.emerald }}`
         values so Tailwind utilities resolve to the same colours. The `C` /
         `PC` objects in src/main.jsx stay authoritative for inline styles;
         this block only makes the palette reachable from utility classes. */
      colors: {
        obsidian: "#0A0A0C",
        surface: { DEFAULT: "#111318", hi: "#171A21" },
        emerald: { electric: "#22C55E", deep: "#16A34A", ink: "#052E16" },
        amethyst: { neon: "#A855F7", deep: "#7C3AED", ink: "#1A0B2E" },
        gold: { DEFAULT: "#F5B942", signature: "#D9A85C", ink: "#1A1200" },
      },
      fontFamily: {
        display: ["Unbounded", "Segoe UI", "sans-serif"],
        body: ["Plus Jakarta Sans", "Segoe UI", "sans-serif"],
        mono: ["Space Mono", "Courier New", "monospace"],
      },
      maxWidth: { frame: "28rem" },
    },
  },
  plugins: [],
};
