import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/* ESLint flat config (ESLint 9).
 *
 * `npm run lint` previously pointed at `eslint "js/**\/*.js"` with no ESLint
 * installed, no config file, and a `js/` directory that does not exist in this
 * repository — it could not run at all. This replaces it with something that
 * actually executes against the real source tree.
 *
 * The rule set is deliberately close to recommended. The one significant
 * relaxation is react/prop-types: this codebase has no PropTypes and no
 * TypeScript by convention (see README, "Code conventions"), so leaving it on
 * would emit hundreds of findings describing a decision that was made
 * intentionally.
 */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "public/**"],
  },

  js.configs.recommended,

  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "18.3" },
    },
    plugins: {
      react: react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      /* No PropTypes and no TypeScript, by convention. */
      "react/prop-types": "off",

      /* The JSX transform makes the React import unnecessary at use sites. */
      "react/react-in-jsx-scope": "off",

      /* Apostrophes and quotes appear throughout the UI copy; escaping them
         would make the strings harder to read, not safer. */
      "react/no-unescaped-entities": "off",

      /* Downgraded from error, not silenced. Seven effects reset local state
         when a prop changes — a pattern React now discourages in favour of a
         `key` or derived state. Each one is a real cleanup, but they are
         behavioural changes in a codebase with no test suite, so they are
         tracked as warnings rather than rewritten under deadline. Raise this
         back to "error" once tests exist. */
      "react-hooks/set-state-in-effect": "warn",

      /* Flags genuinely unused bindings, but tolerates the conventional
         underscore prefix for deliberately ignored arguments. */
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /* Build and tooling config files run in Node, not the browser. */
  {
    files: ["*.config.js", ".*.config.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
