import { defineConfig } from "vitest/config";
process.env.INTEGRATION_TEST_MODE = "true";

export default defineConfig({
  test: {
    setupFiles: ["./setupVitest.ts"],
    
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
  process.env.CALCOM_SERVICE_ACCOUNT_ENCRYPTION_KEY = "UNIT_TEST_ENCRYPTION_KEY";
  process.env.STRIPE_PRIVATE_KEY = process.env.STRIPE_PRIVATE_KEY || "sk_test_dummy_unit_test_key";
}
