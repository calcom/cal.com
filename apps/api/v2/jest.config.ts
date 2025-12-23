import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  rootDir: ".",
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
    "test/(.*)": "<rootDir>/test/$1",
    "^@calcom/platform-constants$": "<rootDir>/../../../packages/platform/constants/dist/index.js",
    "^@calcom/platform-enums$": "<rootDir>/../../../packages/platform/enums/dist/index.js",
    "^@calcom/platform-types$": "<rootDir>/../../../packages/platform/types/dist/index.js",
    "^@calcom/platform-utils$": "<rootDir>/../../../packages/platform/utils/dist/index.js",
  },
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFiles: ["<rootDir>/test/setEnvVars.ts"],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  transformIgnorePatterns: ["/dist/", "/node_modules/(?!@calcom/platform-)"],
};

export default config;
