/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./packages/config/eslint-preset.js"],
  plugins: ["import"],
  rules: {
    "import/no-cycle": ["warn", { maxDepth: Infinity }],
  },
  overrides: [
    // WARN: features must not be imported by app-store or lib
    {
      files: ["packages/app-store/**/*.{ts,tsx,js,jsx}", "packages/lib/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: [
                  // Catch all relative paths into features
                  "**/features",
                  "**/features/*",
                  // Catch all alias imports
                  "@calcom/features",
                  "@calcom/features/*",
                ],
                message: "Avoid importing @calcom/features from @calcom/app-store or @calcom/lib.",
              },
            ],
          },
        ],
      },
    },
    // WARN: lib must not import app-store or features
    {
      files: ["packages/lib/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: [
                  // Catch all relative paths into app-store
                  "**/app-store",
                  "**/app-store/*",
                  // Catch all relative paths into features
                  "**/features",
                  "**/features/*",
                  // Catch alias imports
                  "@calcom/app-store",
                  "@calcom/app-store/*",
                  "@calcom/features",
                  "@calcom/features/*",
                ],
                message: "@calcom/lib should not import @calcom/app-store or @calcom/features.",
              },
            ],
          },
        ],
      },
    },
    // ERROR: app-store must not import trpc
    {
      files: ["packages/app-store/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  // Catch all relative paths into trpc
                  "**/trpc",
                  "**/trpc/*",
                  // Catch alias imports
                  "@calcom/trpc",
                  "@calcom/trpc/*",
                  "@trpc",
                  "@trpc/*",
                ],
                message:
                  "@calcom/app-store must not import trpc. Move UI to apps/web/components/apps or introduce an API boundary.",
              },
            ],
          },
        ],
      },
    },

    // ERROR: prisma must not import `features` package
    {
      files: ["packages/prisma/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@calcom/trpc/*", "@trpc/*"],
                message:
                  "tRPC imports are blocked in packages/app-store. Move UI to apps/web/components/apps or introduce an API boundary.",
                allowTypeImports: false,
                group: [
                  // Catch all relative paths into features
                  "**/features",
                  "**/features/*",
                  // Catch all alias imports
                  "@calcom/features",
                  "@calcom/features/*",
                ],
                message: "Avoid importing @calcom/features from @calcom/prisma.",
              },
            ],
          },
        ],
      },
    },
  ],
};
