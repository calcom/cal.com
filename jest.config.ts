/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */

const config = {
  clearMocks: true,
  coverageDirectory: "./coverage",
  collectCoverage: true,
  collectCoverageFrom: ["pages/api/**/*.ts"],

  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: "babel",

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ["json", "text", "lcov", "clover"],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      lines: 50,
      functions: 40,
      branches: 50,
      statements: 50,
    },
  },
  // A path to a custom dependency extractor
  // dependencyExtractor: undefined,

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,

  // The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
  maxWorkers: "50%",

  moduleNameMapper: {
    "^@lib/(.*)$": "<rootDir>/lib/$1",
    "^@api/(.*)$": "<rootDir>/pages/api/$1",
  },

  // The paths to modules that run some code to configure or set up the testing environment before each test
  // setupFiles: [],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // The number of seconds after which a test is considered as slow and reported as such in the results.
  slowTestThreshold: 0.1,

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  // snapshotSerializers: [],

  // The test environment that will be used for testing
  testEnvironment: "node",
};
export default config;
