import js from "@eslint/js";
import pluginNext from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import { config as baseConfig } from "./base.js";

/**
 * ESLint config for Next.js libraries and apps (flat config style).
 * Includes: React, React Hooks, TypeScript, Next, Prettier, and custom rules.
 */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },

  // Next.js rules
  {
    plugins: { "@next/next": pluginNext },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },

  // React Hooks + custom project rules
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-restricted-properties": [
        "warn",
        {
          object: "window",
          property: "localStorage",
          message: "Avoid using localStorage. Use a secure storage layer instead.",
        },
        {
          object: "window",
          property: "sessionStorage",
          message: "Avoid using sessionStorage. Use a secure storage layer instead.",
        },
      ],

      "no-restricted-globals": [
        "warn",
        { name: "localStorage", message: "Avoid using localStorage" },
        { name: "sessionStorage", message: "Avoid using sessionStorage" },
      ],
    },
  },
];
