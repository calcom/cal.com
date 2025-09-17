// This configuration only applies to the package manager root.
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
        "import/no-restricted-paths": [
          "warn",
          {
            zones: [
              {
                target: "./packages/features",
                from: "./packages/app-store",
                message: "Do not import packages/features from packages/app-store.",
              },
              {
                target: "./packages/features",
                from: "./packages/prisma",
                message: "Do not import packages/features from packages/prisma.",
              },
              {
                target: "./packages/features",
                from: "./packages/lib",
                message: "Do not import packages/features from packages/lib.",
              },
            ],
          },
        ],
        // Also catch alias imports like @calcom/features
        "no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: ["@calcom/features", "@calcom/features/*"],
                message: "Avoid importing @calcom/features from app-store, prisma, or lib.",
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
        "import/no-restricted-paths": [
          "warn",
          {
            zones: [
              {
                target: "./packages/app-store",
                from: "./packages/lib",
                message: "packages/lib should not import packages/app-store.",
              },
              {
                target: "./packages/features",
                from: "./packages/lib",
                message: "packages/lib should not import packages/features.",
              },
            ],
          },
        ],
        // Also catch alias imports
        "no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: ["@calcom/app-store", "@calcom/app-store/*", "@calcom/features", "@calcom/features/*"],
                message: "packages/lib should not import @calcom/app-store or @calcom/features.",
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
        "import/no-restricted-paths": [
          "error",
          {
            zones: [
              {
                target: "./packages/trpc",
                from: "./packages/app-store",
                message:
                  "packages/app-store must not import packages/trpc. Move UI to apps/web/components/apps or introduce an API boundary.",
              },
            ],
          },
        ],
        // Also catch alias imports like @calcom/trpc
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@calcom/trpc", "@calcom/trpc/*", "@trpc", "@trpc/*"],
                message:
                  "packages/app-store must not import @calcom/trpc or @trpc. Move UI to apps/web/components/apps or introduce an API boundary.",
              },
            ],
          },
        ],
      },
    },
  ],
};
