import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookFirstEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("dynamic booking", () => {
  test.skip(true, "TODO: Re-enable after v1.7 launch");
  test.beforeEach(async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();
    const free = await users.create({ plan: "FREE" });
    await page.goto(`/${pro.username}+${free.username}`);
  });

  test.afterEach(async ({ page, users }) => {
    await users.deleteAll();
  });

  test("book an event first day in next month", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("can reschedule a booking", async ({ page }) => {
    await bookFirstEvent(page);

    // Logged in
    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForNavigation({
      url: (url) => {
        const bookingId = url.searchParams.get("rescheduleUid");
        return !!bookingId;
      },
    });
    await selectSecondAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.locator('[data-testid="confirm-reschedule-button"]').click();
    await page.waitForNavigation({
      url(url) {
        return url.pathname === "/success" && url.searchParams.get("reschedule") === "true";
      },
    });
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });

  test("Can cancel the recently created booking", async ({ page }) => {
    await bookFirstEvent(page);

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').first().click();
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.startsWith("/cancel");
      },
    });
    // --- fill form
    await page.locator('[data-testid="cancel"]').click();
    await page.waitForNavigation({
      url(url) {
        return url.pathname === "/cancel/success";
      },
    });
  });
});
