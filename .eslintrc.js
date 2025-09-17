/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./packages/config/eslint-preset.js"],
  plugins: ["import"],
  rules: {
    "import/no-cycle": ["warn", { maxDepth: Infinity }],
  },
  overrides: [
    // WARN: features must not be imported by app-store, prisma, or lib
    {
      files: [
        "packages/app-store/**/*.{ts,tsx,js,jsx}",
        "packages/prisma/**/*.{ts,tsx,js,jsx}",
        "packages/lib/**/*.{ts,tsx,js,jsx}",
      ],
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
                message: "Avoid importing packages/features from app-store, prisma, or lib.",
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
                message: "packages/lib should not import app-store or features.",
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
                  "packages/app-store must not import trpc. Move UI to apps/web/components/apps or introduce an API boundary.",
              },
            ],
          },
        ],
      },
    },
  ],
};
