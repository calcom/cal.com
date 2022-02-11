import { expect, test } from "@playwright/test";

import { todo } from "./lib/testUtils";

test.describe("free user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/free");
  });
  test("only one visible event", async ({ page }) => {
    await expect(page.locator(`[href="/free/30min"]`)).toBeVisible();
    await expect(page.locator(`[href="/free/60min"]`)).not.toBeVisible();
  });

  todo("`/free/30min` is bookable");

  todo("`/free/60min` is not bookable");
});

test.describe("pro user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pro");
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
