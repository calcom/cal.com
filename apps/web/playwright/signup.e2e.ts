import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { todo } from "./lib/testUtils";

const MAILHOG_ENABLED = process.env.MAILHOG_ENABLED;
test.afterEach(async ({ users, mailhog }) => {
  users.deleteAll();
  await mailhog.deleteAll();
});

// Test the Signup flow
test.describe("Sign Up Flow", () => {
  // A test to verify email feature, get the page link from mailhog,
  // and go to the link.
  test("Receive a valid verification email link on sign up", async ({ page, users, mailhog }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(MAILHOG_ENABLED !== "1", "It should only run if Mailhog is enabled in the .env");

    await users.signup();
    const response = await mailhog.messages();
    // This assertion could conflict with other tests.
    // Tests run in parallel might end and alter messages before this assertion.
    expect(response?.total).toBe(1);
    const linkRegex = /(https?:\/\/[^\s]+)/;
    const match = response?.items[0].text.match(linkRegex);

    expect(match).toBeTruthy();
    const link = match?.[0];
    await page.goto(link ?? "");
    await page.waitForURL("/getting-started");
  });

  todo("Click Resend token multiple times");
  todo("Check for Invalid Token");
});
