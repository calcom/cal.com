import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  rootDir: ".",
  moduleNameMapper: {
    "^@calcom/platform-libraries$": "<rootDir>/../../../packages/platform/libraries/index.ts",
    "^@calcom/platform-libraries/(.*)$": "<rootDir>/../../../packages/platform/libraries/$1.ts",
    "@/(.*)": "<rootDir>/src/$1",
    "test/(.*)": "<rootDir>/test/$1",
  },
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFiles: ["<rootDir>/test/setEnvVars.ts"],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  transformIgnorePatterns: ["/dist/", "/node_modules/"],
};

export default config;
