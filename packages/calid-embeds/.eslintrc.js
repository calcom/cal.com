/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["../../.eslintrc.js"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: ["@calid/*", "!@calid/embed-*"],
      },
    ],
  },
  overrides: [
    {
      files: ["embed-runtime/playwright/**/*"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
