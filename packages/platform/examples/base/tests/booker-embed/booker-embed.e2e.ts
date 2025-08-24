import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function selectOption(page: Page, optionNumber: number) {
  for (let i = 0; i < optionNumber; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

test("Schedule a meeting via the BookerEmbed atom", async ({ page }) => {
  await page.goto("/embed");

  await expect(page).toHaveURL("/embed");

  await expect(page.locator("body")).toBeVisible();

  // make sure the booker is rendered
  await expect(page.locator('[data-testid="booker-container"]')).toBeVisible();

  // click first available day and select first available time
  // cancel again and go back
  await page.locator('[data-testid="day"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="time"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="back"]').first().click();

  // toggle timezone from booker to check that works
  await page.locator('[data-testid="event-meta-current-timezone"]').first().click();
  await selectOption(page, 5);

  await page.locator('[data-testid="day"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="time"]:not([data-disabled="true"])').first().click();

  // add guests
  await page.locator('[data-testid="add-guests"]').click();
  await expect(page.locator('[data-testid="input-field"]')).toBeVisible();
  await page.locator('[data-testid="input-field"]').fill("free@example.com");

  // book meeting
  await page.locator('[data-testid="confirm-book-button"]').click();

  // make sure we successfully redirect to booking success page on booking success
  await expect(page.locator('[data-testid="booking-success-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="booking-success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="booking-success-message"]')).toContainText(
    "This meeting is scheduled"
  );
  await expect(page.locator('[data-testid="booking-redirect-or-cancel-links"]')).toBeVisible();

  test.setTimeout(5000); //
});
