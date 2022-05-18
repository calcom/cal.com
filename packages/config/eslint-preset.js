/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["plugin:playwright/playwright-test", "next", "plugin:prettier/recommended"],
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
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      extends: ["plugin:@typescript-eslint/recommended"],
      plugins: ["@typescript-eslint"],
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
