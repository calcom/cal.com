import type { Config } from "jest";

// Detect if sharding is being used by checking for --shard flag
const isSharding = process.argv.some((arg) => arg.includes("--shard"));

// For Jest e2e, we reduce parallelism when sharding in CI to improve test isolation
// since tests share database state and can interfere with each other
const getMaxWorkers = () => {
  if (process.env.CI && isSharding) {
    // In CI with sharding: reduce workers to improve test isolation
    // Sharding already provides parallelism across shards (4 parallel jobs)
    return 4;
  }
  // Local development or non-sharded: use more workers (similar to Playwright)
  return 8;
};

const maxWorkers = getMaxWorkers();

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
    "test/(.*)": "<rootDir>/test/$1",
  },
  testEnvironment: "node",
  testRegex: ".e2e-spec.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      process.env.CI
        ? {
            isolatedModules: true,
            diagnostics: false,
          }
        : {},
    ],
  },
  setupFiles: ["<rootDir>/test/setEnvVars.ts", "jest-date-mock"],
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup-e2e.ts"],
  reporters: [
    "default",
    "jest-summarizing-reporter",
    [
      "jest-junit",
      {
        outputDirectory: "./test-results",
        outputName: "junit.xml",
      },
    ],
  ],
  workerIdleMemoryLimit: "512MB",
  maxWorkers,
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
  transformIgnorePatterns: ["/dist/", "/node_modules/"],
};

export default config;
