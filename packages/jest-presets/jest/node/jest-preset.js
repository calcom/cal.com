/** @type {import("@jest/types").Config.InitialOptions} */
const config = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePathIgnorePatterns: [
    //
    "<rootDir>/test/__fixtures__",
    "<rootDir>/node_modules",
    "<rootDir>/dist",
  ],
  preset: "ts-jest",
  clearMocks: true,
  setupFilesAfterEnv: ["../../tests/config/singleton.ts"],
  verbose: true,
  roots: ["<rootDir>"],
  setupFiles: ["<rootDir>/test/jest-setup.js"],
  testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)"],
  testPathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/playwright/"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
  testEnvironment: "jsdom",
  resolver: `<rootDir>/test/jest-resolver.js`,
  moduleNameMapper: {
    "^@components(.*)$": "<rootDir>/components$1",
    "^@lib(.*)$": "<rootDir>/lib$1",
    "^@server(.*)$": "<rootDir>/server$1",
  },
  watchPlugins: [
    "jest-watch-typeahead/filename",
    "jest-watch-typeahead/testname",
    "jest-watch-select-projects",
  ],
};

module.exports = config;
