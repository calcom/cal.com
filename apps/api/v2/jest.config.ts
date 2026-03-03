import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  rootDir: ".",
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
    "test/(.*)": "<rootDir>/test/$1",
    "^@calcom/platform-libraries/emails$": "<rootDir>/test/mocks/calcom-platform-libraries-emails.ts",
    "^@calcom/platform-libraries/pbac$": "<rootDir>/test/mocks/calcom-platform-libraries-pbac.ts",
    "^@calcom/platform-libraries/workflows$": "<rootDir>/test/mocks/calcom-platform-libraries-workflows.ts",
    "^@calcom/platform-libraries/event-types$": "<rootDir>/test/mocks/calcom-platform-libraries-event-types.ts",
    "^@calcom/platform-libraries$": "<rootDir>/test/mocks/calcom-platform-libraries.ts",
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
