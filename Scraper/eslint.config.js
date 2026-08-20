import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Stub methods intentionally name unused params with a leading
      // underscore until their roadmap phase implements them.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Several client methods are async generators that currently just
      // throw "not implemented" — they'll gain real yields in Phases 4–5.
      "require-yield": "off",
    },
  },
);
