import { defineConfig } from "vitest/config";
// import tsconfigPaths from 'vite-tsconfig-paths';
// import path from 'path';
process.env.INTEGRATION_TEST_MODE = "true";

export default defineConfig({
  // plugins: [tsconfigPaths({
  //   projects: [path.resolve(__dirname, "apps/web/tsconfig.json")]
  // }) as any],
  test: {
    coverage: {
      provider: "v8",
    },
    passWithNoTests: true,
    testTimeout: 500000,
  },
});

setEnvVariablesThatAreUsedBeforeSetup();

function setEnvVariablesThatAreUsedBeforeSetup() {
  // We can't set it during tests because it is used as soon as _metadata.ts is imported which happens before tests start running
  process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
  // With same env variable, we can test both non org and org booking scenarios
  process.env.NEXT_PUBLIC_WEBAPP_URL = "http://app.cal.local:3000";
}
