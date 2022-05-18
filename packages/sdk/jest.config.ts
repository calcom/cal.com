import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  verbose: true,
  roots: ["<rootDir>"],
  testMatch: ["**/tests/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
  testPathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/playwright/"],
  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coverageDirectory: "./coverage/",
  collectCoverage: false
};

export default config;
