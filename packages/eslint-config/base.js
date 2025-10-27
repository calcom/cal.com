import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import onlyWarn from "eslint-plugin-only-warn";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

import noCascadeWithoutIndex from "./rules/no-cascade-without-index.rule.js";

/** @type {import("eslint").Linter.FlatConfig[]} */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,

  {
    plugins: {
      turbo: turboPlugin,
      import: importPlugin,
      onlyWarn,
      calcom: {
        rules: {
          "no-cascade-without-index": noCascadeWithoutIndex,
        },
      },
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    settings: {
      "import/resolver": { typescript: true, node: true },
    },
  },
  {
    files: ["**/*.prisma"],
    rules: {
      "calcom/no-cascade-without-index": "error",
    },
  },
  {
    ignores: ["dist/**", "**/node_modules/**", "**/.next/**"],
  },
];

/** Helper to forbid imports */
export function forbid({ from, target, message }) {
  return {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              from: [from],
              target: [target],
              message: message ?? `Import denied from ${target} to ${from}`,
            },
          ],
        },
      ],
    },
  };
}
