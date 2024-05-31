/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "plugin:playwright/playwright-test",
    "next",
    "plugin:prettier/recommended",
    "turbo",
    "plugin:you-dont-need-lodash-underscore/compatible-warn",
  ],
  plugins: ["unused-imports"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
  },
  settings: {
    next: {
      rootDir: ["apps/*/", "packages/*/"],
    },
  },
  rules: {
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    "jsx-a11y/role-supports-aria-props": "off", // @see https://github.com/vercel/next.js/issues/27989#issuecomment-897638654
    "playwright/no-page-pause": "error",
    "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
    "react/self-closing-comp": ["error", { component: true, html: true }],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
    "unused-imports/no-unused-imports": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: ["lodash"],
      },
    ],
    "prefer-template": "error",
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: ["plugin:@typescript-eslint/recommended", "plugin:@calcom/eslint/recommended"],
      plugins: ["@typescript-eslint", "@calcom/eslint"],
      parser: "@typescript-eslint/parser",
      rules: {
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            // TODO: enable this once prettier supports it
            // fixStyle: "inline-type-imports",
            fixStyle: "separate-type-imports",
            disallowTypeAnnotations: false,
          },
        ],
      },
      overrides: [
        {
          files: ["**/playwright/**/*.{tsx,ts}"],
          rules: {
            "@typescript-eslint/no-unused-vars": "off",
            "no-undef": "off",
          },
        },
        {
          files: ["apps/website/**/*.{tsx,ts}"],
          rules: {
            /** TODO: Remove once website router is migrated  */
            "@calcom/eslint/deprecated-imports-next-router": "off",
          },
        },
      ],
    },
    {
      files: ["**/playwright/**/*.{js,jsx}"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "no-undef": "off",
      },
    },
  ],
};
