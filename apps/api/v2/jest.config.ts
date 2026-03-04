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
    "^@calcom/platform-libraries/organizations$":
      "<rootDir>/test/mocks/calcom-platform-libraries-organizations.ts",
    "^@calcom/platform-libraries/private-links$":
      "<rootDir>/test/mocks/calcom-platform-libraries-private-links.ts",
    "^@calcom/platform-libraries/repositories$":
      "<rootDir>/test/mocks/calcom-platform-libraries-repositories.ts",
    "^@calcom/platform-libraries/slots$": "<rootDir>/test/mocks/calcom-platform-libraries-slots.ts",
    "^@calcom/platform-libraries/bookings$": "<rootDir>/test/mocks/calcom-platform-libraries-bookings.ts",
    "^@calcom/platform-libraries/schedules$": "<rootDir>/test/mocks/calcom-platform-libraries-schedules.ts",
    "^@calcom/platform-libraries/calendars$": "<rootDir>/test/mocks/calcom-platform-libraries-calendars.ts",
    "^@calcom/platform-libraries/conferencing$":
      "<rootDir>/test/mocks/calcom-platform-libraries-conferencing.ts",
    "^@calcom/platform-libraries/errors$": "<rootDir>/test/mocks/calcom-platform-libraries-errors.ts",
    "^@calcom/platform-libraries/tasker$": "<rootDir>/test/mocks/calcom-platform-libraries-tasker.ts",
    "^@calcom/platform-libraries/app-store$": "<rootDir>/test/mocks/calcom-platform-libraries-app-store.ts",
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
