module.exports = {
  verbose: true,
  preset: "jest-playwright-preset",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testMatch: ["<rootDir>/playwright/**/?(*.)+(spec|test).[jt]s?(x)"],
  testEnvironmentOptions: {
    "jest-playwright": {
      browsers: ["chromium" /*, 'firefox', 'webkit'*/],
      exitOnPageError: false,
      launchOptions: {
        // launch headless on CI, in browser locally
        headless: !!process.env.CI,
        executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
      },
      contextOptions: {
        recordVideo: {
          dir: "playwright/videos/",
        },
      },
      collectCoverage: true,
    },
  },
};
