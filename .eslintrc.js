// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./packages/config/eslint-preset.js"],
  plugins: ["import"],
  rules: {
    "import/no-cycle": ["warn", { maxDepth: Infinity }],
  },
  overrides: [
    {
      files: ["packages/lib/**/*.{ts,tsx,js,jsx}", "packages/prisma/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "warn",
          {
            paths: ["@calcom/app-store"],
            patterns: ["@calcom/app-store/*"],
          },
        ],
      },
    },
    {
      files: ["packages/app-store/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@calcom/trpc/*", "@trpc/*"],
                message: "tRPC imports are blocked in packages/app-store. Move UI to apps/web/components/apps or introduce an API boundary.",
                allowTypeImports: false,
              },
            ],
          },
        ],
      },
    },
  ],
};
