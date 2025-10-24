import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import onlyWarn from "eslint-plugin-only-warn";
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
