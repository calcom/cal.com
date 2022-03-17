import { expect, test } from "@playwright/test";

import { deleteAllBookingsByEmail } from "./lib/teardown";
import { selectFirstAvailableTimeSlotNextMonth, todo } from "./lib/testUtils";

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

    const bookTimeSlot = async () => {
      // --- fill form
      await page.fill('[name="name"]', "Test Testson");
      await page.fill('[name="email"]', "test@example.com");
      await page.press('[name="email"]', "Enter");
    };

    // book same time spot twice
    await bookTimeSlot();

    // Make sure we're navigated to the success page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });

    // return to same time spot booking page
    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot();

    // check for error message
    await expect(page.locator("[data-testid=booking-fail]")).toBeVisible();
  });

  todo("`/free/30min` is bookable");

  todo("`/free/60min` is not bookable");
});

test.describe("pro user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pro");
  });

  test.afterAll(async () => {
    // delete test bookings
    await deleteAllBookingsByEmail("pro@example.com");
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    // await page.pause();
    const $eventTypes = await page.locator("[data-testid=event-types] > *");
    expect(await $eventTypes.count()).toBeGreaterThanOrEqual(2);
  });

  test("book an event first day in next month", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.fill('[name="name"]', "Test Testson");
    await page.fill('[name="email"]', "test@example.com");
    await page.press('[name="email"]', "Enter");

    // Make sure we're navigated to the success page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/success");
      },
    });
  });

  todo("Can reschedule the recently created booking");

  todo("Can cancel the recently created booking");
});
