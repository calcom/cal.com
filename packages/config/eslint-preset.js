/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "plugin:playwright/playwright-test",
    "next",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
    project: ["./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  settings: {
    next: {
      rootDir: ["apps/*/", "packages/*/"],
    },
  },
  rules: {
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    "jsx-a11y/role-supports-aria-props": "off", // @see https://github.com/vercel/next.js/issues/27989#issuecomment-897638654
  },
  overrides: [
    {
      files: ["playwright/**/*.{js,jsx,tsx,ts}"],
      rules: {
        "no-undef": "off",
      },
    },
  ],
};
