import { expect, test } from "@playwright/test";

import { deleteAllBookingsByEmail } from "./lib/teardown";
import {
  bookFirstEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
  todo,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("free user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/free");
  });

  test.afterEach(async () => {
    // delete test bookings
    await deleteAllBookingsByEmail("free@example.com");
  });

  test("only one visible event", async ({ page }) => {
    await expect(page.locator(`[href="/free/30min"]`)).toBeVisible();
    await expect(page.locator(`[href="/free/60min"]`)).not.toBeVisible();
  });

  test("cannot book same slot multiple times", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    // Navigate to book page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/book");
      },
    });

    // save booking url
    const bookingUrl: string = page.url();

    // book same time spot twice
    await bookTimeSlot(page);

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // return to same time spot booking page
    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot(page);

    // check for error message
    await expect(page.locator("[data-testid=booking-fail]")).toBeVisible();
  });

  // Why do we need this test. The previous test is testing /30min booking only ?
  todo("`/free/30min` is bookable");

  test("`/free/60min` is not bookable", async ({ page }) => {
    // Not available in listing
    await expect(page.locator('[href="/free/60min"]')).toHaveCount(0);

    await page.goto("/free/60min");
    // Not available on a direct visit to event type page
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
  });
});

test.describe("pro user", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await deleteAllBookingsByEmail("pro@example.com");
    await page.goto("/pro");
  });

  test.afterEach(async () => {
    await deleteAllBookingsByEmail("pro@example.com");
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    // await page.pause();
    const $eventTypes = page.locator("[data-testid=event-types] > *");
    expect(await $eventTypes.count()).toBeGreaterThanOrEqual(2);
  });

  test("book an event first day in next month", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });
  test("can reschedule a booking", async ({ page }) => {
    await bookFirstEvent(page);

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="reschedule"]').nth(0).click();
    await page.locator('[data-testid="edit"]').click();
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

  test("Can cancel the recently created booking and rebook the same timeslot", async ({ page }) => {
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
    await page.goto("/pro");
    await bookFirstEvent(page);
  });
});
