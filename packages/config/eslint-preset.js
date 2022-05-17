/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["plugin:playwright/playwright-test", "next", "plugin:prettier/recommended"],
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
