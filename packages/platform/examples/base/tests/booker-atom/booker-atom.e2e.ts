import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function selectOption(page: Page, optionNumber: number) {
  for (let i = 0; i < optionNumber; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

test("tweak availability  using AvailabilitySettings Atom", async ({ page }) => {
  await page.goto("/booking");

  await expect(page).toHaveURL("/booking");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator('[data-testid="event-type-card"]').first()).toBeVisible();
  await page.locator('[data-testid="event-type-card"]').first().click();

  await expect(page.locator('[data-testid="booker-container"]')).toBeVisible();

  await page.locator('[data-testid="day"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="time"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="back"]').first().click();

  await page.locator('[data-testid="event-meta-current-timezone"]').first().click();
  await selectOption(page, 7);

  await page.locator('[data-testid="day"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="time"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="add-guests"]').click();
  await expect(page.locator('[data-testid="input-field"]')).toBeVisible();
  await page.locator('[data-testid="input-field"]').fill("free@example.com");
  await page.locator('[data-testid="confirm-book-button"]').click();

  await expect(page.locator('[data-testid="booking-success-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="booking-success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="booking-success-message"]')).toContainText(
    "This meeting is scheduled"
  );
  await expect(page.locator('[data-testid="booking-redirect-or-cancel-links"]')).toBeVisible();
});
