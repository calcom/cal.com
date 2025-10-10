import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function clickFirstEventTypeCard(page: Page) {
  await expect(page.locator('[data-testid="individual-event-types"]')).toBeVisible();

  const firstEventTypeCard = page
    .locator('[data-testid="individual-event-types"]')
    .locator('[data-testid="event-type-card"]')
    .first();

  await expect(firstEventTypeCard).toBeVisible();
  await firstEventTypeCard.click();
}

test.describe("Individual event type settings", () => {
  test("Basics tab", async ({ page }) => {
    await page.goto("/");
    await page.goto("/event-types");

    await expect(page).toHaveURL("/event-types");
    await expect(page.locator("body")).toBeVisible();

    await page.waitForTimeout(2000);

    await clickFirstEventTypeCard(page);

    await page.waitForTimeout(5000);
  });
});
