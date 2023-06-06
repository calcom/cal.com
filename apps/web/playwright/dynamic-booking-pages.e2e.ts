import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

// Due to some reason for Dynamic booking cancellation, daily video api_key is not set which causes cancellation to fail.
// This test is skipped until the issue is resolved in GH actions.
// eslint-disable-next-line playwright/no-skipped-test
test.skip("dynamic booking", async ({ page, users }) => {
  const pro = await users.create();
  await pro.login();

  const free = await users.create({ username: "free" });
  await page.goto(`/${pro.username}+${free.username}`);

  await test.step("book an event first day in next month", async () => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("can reschedule a booking", async () => {
    // Logged in
    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectSecondAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.locator('[data-testid="confirm-reschedule-button"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  await test.step("Can cancel the recently created booking", async () => {
    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').first().click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
    await page.locator('[data-testid="cancel"]').click();

    const cancelledHeadline = await page.locator('[data-testid="cancelled-headline"]').innerText();

    expect(cancelledHeadline).toBe("This event is cancelled");
  });
});
