import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Event Types Advanced Tab", () => {
  test("disableReschedulingCancelledBookings toggle should be checked by default", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/event-types");

    await page.click('[data-testid="event-types"] a');

    await page.click('[href*="advanced"]');

    const toggle = page.locator(
      '[data-testid="disable-rescheduling-cancelled-bookings-toggle"] [data-state="checked"]'
    );
    await expect(toggle).toBeVisible();
  });

  test("disableReschedulingCancelledBookings toggle can be toggled off", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/event-types");

    await page.click('[data-testid="event-types"] a');

    await page.click('[href*="advanced"]');

    await page.click('[data-testid="disable-rescheduling-cancelled-bookings-toggle"]');

    await page.click('[type="submit"]');

    await page.waitForSelector('[data-testid="toast-success"]');

    await page.reload();

    await page.click('[href*="advanced"]');

    const toggle = page.locator(
      '[data-testid="disable-rescheduling-cancelled-bookings-toggle"] [data-state="unchecked"]'
    );
    await expect(toggle).toBeVisible();
  });
});
