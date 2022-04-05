import { Page, test } from "@playwright/test";

import { deleteAllBookingsByEmail } from "./lib/teardown";
import {
  bookFirstEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe("dynamic booking", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/pro+free");
  });

  test.afterAll(async () => {
    // delete test bookings
    await deleteAllBookingsByEmail("pro@example.com");
    await deleteAllBookingsByEmail("free@example.com");
  });

  test("book an event first day in next month", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    // Make sure we're navigated to the success page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });
  });

  test("can reschedule a booking", async ({ page }) => {
    await bookFirstEvent(page);

    // Logged in
    await page.goto("/bookings/upcoming");
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
