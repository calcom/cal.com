/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installAppleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

const APPLE_CALENDAR_EMAIL = process.env.E2E_TEST_APPLE_CALENDAR_EMAIL!;
const APPLE_CALENDAR_PASSWORD = process.env.E2E_TEST_APPLE_CALENDAR_PASSWORD!;

const SHOULD_SKIP_TESTS = !APPLE_CALENDAR_EMAIL || !APPLE_CALENDAR_PASSWORD;

test.describe("Apple Calendar", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(SHOULD_SKIP_TESTS, "Skipping due to missing the testing credentials");

  test("Should be able to install and login on Apple Calendar", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await installAppleCalendar(page);

    await expect(page.locator('[data-testid="apple-calendar-form"]')).toBeVisible();

    await page.fill('[data-testid="apple-calendar-email"]', APPLE_CALENDAR_EMAIL);
    await page.fill('[data-testid="apple-calendar-password"]', APPLE_CALENDAR_PASSWORD);
    await page.click('[data-testid="apple-calendar-login-button"]');

    await expect(page.getByText("Apple Calendar")).toBeVisible();
    await expect(page.getByText(APPLE_CALENDAR_EMAIL)).toBeVisible();
  });
});
