/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["../../.eslintrc.js"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        // Ensure that embed packages(They are published) can't access unpublished packages which is basically all @calcom/* packages except embed packages
        patterns: ["@calcom/*", "!@calcom/embed-*"],
      },
    ],
  },
  overrides: [
    {
      files: ["embed-core/playwright/**/*"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
