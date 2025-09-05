/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@calcom/eslint-plugin-eslint/recommended"],
  plugins: ["@calcom/eslint-plugin-eslint"],
  rules: {
    "@calcom/eslint-plugin-eslint/deprecated-imports": "error",
    "@calcom/eslint-plugin-eslint/avoid-web-storage": "error",
    "@calcom/eslint-plugin-eslint/avoid-prisma-client-import-for-enums": "error",
    "@calcom/eslint-plugin-eslint/no-prisma-include-true": "error",
    "@calcom/eslint-plugin-eslint/deprecated-imports-next-router": "error",
    "@calcom/eslint-plugin-eslint/no-scroll-into-view-embed": "error",
    "@calcom/eslint-plugin-eslint/no-this-in-static-method": "error",
  },
  overrides: [
    {
      files: ["packages/lib/**/*.{ts,tsx,js,jsx}", "packages/prisma/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "@calcom/eslint-plugin-eslint/deprecated-imports": "warn",
      },
    },
  ],
};
