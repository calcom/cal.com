import { expect, test } from "@playwright/test";

import prisma from "@lib/prisma";

import { todo } from "./lib/testUtils";

const deleteBookingsByEmail = async (email: string) =>
  prisma.booking.deleteMany({
    where: {
      user: {
        email,
      },
    },
  });

test.describe("free user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/free");
  });

  test.afterEach(async () => {
    // delete test bookings
    await deleteBookingsByEmail("free@example.com");
  });

  test("only one visible event", async ({ page }) => {
    await expect(page.locator(`[href="/free/30min"]`)).toBeVisible();
    await expect(page.locator(`[href="/free/60min"]`)).not.toBeVisible();
  });

  test("cannot book same slot multiple times", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    // Click [data-testid="incrementMonth"]
    await page.click('[data-testid="incrementMonth"]');
    // Click [data-testid="day"]
    await page.click('[data-testid="day"][data-disabled="false"]');
    // Click [data-testid="time"]
    await page.click('[data-testid="time"]');

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

  test.afterEach(async () => {
    // delete test bookings
    await deleteBookingsByEmail("pro@example.com");
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    const $eventTypes = await page.$$("[data-testid=event-types] > *");
    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
  });

  test("book an event first day in next month", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');
    // Click [data-testid="incrementMonth"]
    await page.click('[data-testid="incrementMonth"]');

    // @TODO: Find a better way to make test wait for full month change render to end
    // so it can click up on the right day, also when resolve remove other todos
    // Waiting for full month increment
    await page.waitForTimeout(400);
    // Click [data-testid="day"]
    await page.click('[data-testid="day"][data-disabled="false"]');
    // Click [data-testid="time"]
    await page.click('[data-testid="time"]');
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
