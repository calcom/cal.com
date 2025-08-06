import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js", "json"],
  rootDir: ".",
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
    "test/(.*)": "<rootDir>/test/$1",
    "@calcom/dayjs": "<rootDir>/../../../packages/dayjs/__mocks__/index.ts",
    "@calcom/prisma/client": "<rootDir>/../../../packages/prisma/__mocks__/client.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@calcom/lib/CalendarManager$": "<rootDir>/../../../packages/lib/__mocks__/CalendarManager.ts",
    "^@calcom/lib/delegationCredential/server$": "<rootDir>/../../../packages/lib/__mocks__/delegationCredential.ts",
  },
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFiles: ["<rootDir>/test/setEnvVars.ts"],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  transformIgnorePatterns: [
    "/dist/", 
    "/node_modules/(?!(@calcom/prisma|@prisma/client)/)"
  ],
};

export default config;
