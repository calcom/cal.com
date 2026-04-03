import { enableEmailFeature, mockNoTranslations } from "./bookingScenario";
import process from "node:process";
import { afterEach, beforeEach } from "vitest";

export function setupAndTeardown() {
  beforeEach(() => {
    // Required to able to generate token in email in some cases
    //@ts-expect-error - It is a readonly variable
    process.env.CALENDSO_ENCRYPTION_KEY = "abcdefghjnmkljhjklmnhjklkmnbhjui";
    //@ts-expect-error - It is a readonly variable
    process.env.STRIPE_WEBHOOK_SECRET = "MOCK_STRIPE_WEBHOOK_SECRET";
    // SMTP keyring for testing custom SMTP encryption
    process.env.CALCOM_KEYRING_SMTP_CURRENT = "K1";
    process.env.CALCOM_KEYRING_SMTP_K1 = "RNvJaRNaRGhIZGRHQY_l-i6TjEauPNWQ2qL6Xehe_XI";
    // We are setting it in vitest.config.ts because otherwise it's too late to set it.
    // process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";

    // Ensure that Rate Limiting isn't enforced for tests
    delete process.env.UNKEY_ROOT_KEY;
    mockNoTranslations();
    // mockEnableEmailFeature();
    enableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });
  afterEach(() => {
    //@ts-expect-error - It is a readonly variable
    delete process.env.CALENDSO_ENCRYPTION_KEY;
    //@ts-expect-error - It is a readonly variable
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.DAILY_API_KEY;
    delete process.env.CALCOM_KEYRING_SMTP_CURRENT;
    delete process.env.CALCOM_KEYRING_SMTP_K1;
    globalThis.testEmails = [];
    fetchMock.resetMocks();
    // process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
  });
}
