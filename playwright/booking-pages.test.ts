import { test, expect } from "@playwright/test";

test.describe("free user", () => {
  test("only one visible event", async ({ page }) => {
    await page.goto("/free");
    await expect(page.locator(`[href="/free/30min"]`)).toBeVisible();
    await expect(page.locator(`[href="/free/60min"]`)).not.toBeVisible();
  });

  // TODO: make sure `/free/30min` is bookable and that `/free/60min` is not
});

test.describe("pro user", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/free");
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    const eventTypes = page.locator("[data-testid=event-types] > *");
    expect(eventTypes.count()).toBeGreaterThanOrEqual(2);
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
});
