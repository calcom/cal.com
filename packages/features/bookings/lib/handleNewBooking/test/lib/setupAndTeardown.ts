import { beforeEach, afterEach } from "vitest";

import {
  enableEmailFeature,
  mockNoTranslations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

export function setupAndTeardown() {
  beforeEach(() => {
    // Required to able to generate token in email in some cases
    process.env.CALENDSO_ENCRYPTION_KEY = "abcdefghjnmkljhjklmnhjklkmnbhjui";
    process.env.STRIPE_WEBHOOK_SECRET = "MOCK_STRIPE_WEBHOOK_SECRET";
    // We are setting it in vitest.config.ts because otherwise it's too late to set it.
    // process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
    mockNoTranslations();
    // mockEnableEmailFeature();
    enableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });
  afterEach(() => {
    delete process.env.CALENDSO_ENCRYPTION_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.DAILY_API_KEY;
    globalThis.testEmails = [];
    fetchMock.resetMocks();
    // process.env.DAILY_API_KEY = "MOCK_DAILY_API_KEY";
  });
}
