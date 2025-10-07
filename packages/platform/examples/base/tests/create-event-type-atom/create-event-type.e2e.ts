import { test, expect } from "@playwright/test";

test("create event type using CreateEventTypeAtom", async ({ page }) => {
  await page.goto("/");

  await page.goto("/event-types");

  await expect(page).toHaveURL("/event-types");

  await expect(page.locator("body")).toBeVisible();

  await page.fill('[data-testid="event-type-quick-chat"]', "Individual e2e event");

  await page.fill('textarea[placeholder="A quick video meeting."]', "This is an e2e test event description");

  await page.waitForSelector('button[type="submit"]:has-text("Continue")', { state: "visible" });
  await page.click('button[type="submit"]:has-text("Continue")');

  await expect(page.locator('h1:has-text("Individual e2e event")')).toBeVisible();
  await expect(page.locator('p:has-text("/individual-e2e-event")')).toBeVisible();

  await page.locator('[data-testid="event-type-card"] h1:has-text("Individual e2e event")').click();

  await expect(page.locator("body")).toBeVisible();
});
