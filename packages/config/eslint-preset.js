/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["plugin:playwright/playwright-test", "next", "plugin:prettier/recommended", "turbo"],
  plugins: ["unused-imports"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
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
    "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
    "react/self-closing-comp": ["error", { component: true, html: true }],
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: ["plugin:@typescript-eslint/recommended", "plugin:@calcom/eslint/recommended"],
      plugins: ["@typescript-eslint", "@calcom/eslint"],
      parser: "@typescript-eslint/parser",
      overrides: [
        {
          files: ["playwright/**/*.{tsx,ts}"],
          rules: {
            "no-undef": "off",
          },
        },
      ],
    },
    {
      files: ["playwright/**/*.{js,jsx}"],
      rules: {
        "no-undef": "off",
      },
    },
  ],
};
