import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  verbose: true,
  projects: [
    {
      displayName: "@calcom/web",
      roots: ["<rootDir>/apps/web"],
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
      modulePathIgnorePatterns: [
        //
        "<rootDir>/apps/web/test/__fixtures__",
        "<rootDir>/apps/web/node_modules",
        "<rootDir>/apps/web/dist",
      ],
      clearMocks: true,
      setupFilesAfterEnv: ["<rootDir>/tests/config/singleton.ts"],
      setupFiles: ["<rootDir>/apps/web/test/jest-setup.js"],
      testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)", "**/__tests__/**/*.(spec|test).(ts|tsx|js)"],
      testPathIgnorePatterns: ["<rootDir>/apps/web/.next", "<rootDir>/apps/web/playwright/"],
      transform: {
        "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
      },
      transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
      testEnvironment: "jsdom",
      resolver: `<rootDir>/apps/web/test/jest-resolver.js`,
      moduleNameMapper: {
        "^@components(.*)$": "<rootDir>/apps/web/components$1",
        "^@lib(.*)$": "<rootDir>/apps/web/lib$1",
        "^@server(.*)$": "<rootDir>/apps/web/server$1",
      },
    },
    {
      displayName: "@calcom/lib",
      roots: ["<rootDir>/packages/lib"],
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": "ts-jest",
      },
    },
    {
      displayName: "@calcom/closecom",
      roots: ["<rootDir>/packages/app-store/closecom"],
      testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)"],
      transform: {
        "^.+\\.ts?$": "ts-jest",
      },
      transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
      testEnvironment: "jsdom",
      setupFiles: ["<rootDir>/packages/app-store/closecom/test/globals.ts"],
    },
    {
      displayName: "@calcom/routing-forms",
      roots: ["<rootDir>/packages/app-store/ee/routing-forms"],
      testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)"],
      transform: {
        "^.+\\.ts?$": "ts-jest",
      },
      transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
      testEnvironment: "jsdom",
    },
    // FIXME: Prevent this breaking Jest when API module is missing
    // {
    //   displayName: "@calcom/api",
    //   roots: ["<rootDir>/apps/api"],
    //   testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)"],
    //   setupFilesAfterEnv: ["<rootDir>/tests/config/singleton.ts"],
    //   transform: {
    //     "^.+\\.ts?$": "ts-jest",
    //   },
    //   globals: {
    //     "ts-jest": {
    //       tsconfig: "<rootDir>/apps/api/tsconfig.json",
    //     },
    //   },
    //   transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
    //   testEnvironment: "node",
    //   clearMocks: true,
    //   moduleNameMapper: {
    //     "^@lib/(.*)$": "<rootDir>/apps/api/lib/$1",
    //     "^@api/(.*)$": "<rootDir>/apps/api/pages/api/$1",
    //   },
    //   // setupFilesAfterEnv: ["<rootDir>/apps/api/jest.setup.ts"], // Uncomment when API becomes public
    // },
  ],
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
    "jest-watch-select-projects",
  ],
};

export default config;
