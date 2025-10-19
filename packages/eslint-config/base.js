import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import onlyWarn from "eslint-plugin-only-warn";
import playwright from "eslint-plugin-playwright";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
      import: importPlugin,
      onlyWarn,
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
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
  },
  // Disable no-explicit-any in test files: reason:
  // Often times we want to pass partial parameters rather than the full expected object.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__mocks__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.e2e.ts"],
    plugins: { playwright },
    rules: {
      ...playwright.configs["playwright-test"].rules,
    },
  },
  // config files should have access to Node globals (like process.)
  {
    files: ["**/next.config.{js,cjs,mjs}", "**/*.config.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2021,
      // CommonJS-style configs use require/module → treat as script
      sourceType: "script",
      globals: {
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      // allow require() in config files
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: ["dist/**", "**/node_modules/**", "**/.next/**"],
  },
];

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
