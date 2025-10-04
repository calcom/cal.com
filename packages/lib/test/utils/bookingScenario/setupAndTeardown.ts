import { enableEmailFeature, mockNoTranslations } from "./bookingScenario";

import { beforeEach, afterEach } from "vitest";

export const setupAndTeardown = () => {
  beforeEach(async () => {
    globalThis.testEmails = [];
    delete process.env.MOCK_PAYMENT_APP_ENABLED;

    // Ensure that Rate Limiting isn't enforced for tests
    delete process.env.UNKEY_ROOT_KEY;
    mockNoTranslations();
    // mockEnableEmailFeature();
    enableEmailFeature();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  afterEach(() => {
    delete process.env.MOCK_PAYMENT_APP_ENABLED;
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });
};

declare global {
  // eslint-disable-next-line no-var
  var testEmails: {
    icalEvent?: { filename: string; content: string } | undefined;
    to: string;
    from: string | { email: string; name: string };
    subject: string;
    html: string;
  }[];
}
