import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  verbose: true,
  roots: ["<rootDir>"],
  testMatch: ["**/test/lib/**/*.(spec|test).(ts|tsx|js)"],
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/test/globals.ts"],
};

export default config;
