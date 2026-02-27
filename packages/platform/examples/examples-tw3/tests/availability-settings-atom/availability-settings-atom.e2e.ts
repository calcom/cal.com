import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function selectOption(page: Page, optionNumber: number) {
  for (let i = 0; i < optionNumber; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

// eslint-disable-next-line playwright/no-skipped-test
test.skip("availability page loads with all components", async ({ page }) => {
  await page.goto("/availability");
  await expect(page).toHaveURL("/availability");

  await expect(page.locator('[data-testid="list-schedules-atom"]')).toBeVisible();
  await expect(page.locator('[data-testid="schedules"]')).toBeVisible();

  await expect(page.locator('[data-testid="schedules"] li').first()).toBeVisible();
  await expect(
    page.locator('[data-testid="schedules"] li').first().locator('[data-testid="schedule-more"]')
  ).toBeVisible();
  await page.locator('[data-testid="schedules"] li').first().locator('[data-testid="schedule-more"]').click();

  await expect(page.locator('h1:has-text("Availability Settings")')).toBeVisible();

  await expect(page.locator('button:has-text("Validate Form")')).toBeVisible();

  await expect(page.locator('button:has-text("Submit Form")')).toBeVisible();

  await expect(page.locator('[data-testid="Monday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Tuesday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Wednesday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Thursday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Friday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Saturday"]')).toBeVisible();
  await expect(page.locator('[data-testid="Sunday"]')).toBeVisible();

  await page.locator('[data-testid="Sunday-switch"]').click();
  await page.locator('[data-testid="Monday-switch"]').click();
  await page.locator('[data-testid="Thursday-switch"]').click();

  await page.locator('[data-testid="Wednesday"] [data-testid="select-control"] div').first().click();

  await selectOption(page, 5);

  await page.locator('[data-testid="Wednesday"] [data-testid="select-control"] div').last().click();
  await selectOption(page, 7);

  await page.locator('[data-testid="Friday"] [data-testid="select-control"] div').first().click();
  await selectOption(page, 3);

  await page.locator('[data-testid="Friday"] [data-testid="select-control"] div').last().click();
  await selectOption(page, 10);

  await page.locator('[data-testid="Friday"] [data-testid="add-time-availability"]').click();

  await page.locator('[data-testid="timezone-select"] div').first().click();

  await selectOption(page, 10);

  await page.locator('[data-testid="add-override"]').click();
  await page.locator('[data-testid="day"]:not([data-disabled="true"])').first().click();
  await page.locator('[data-testid="add-override-submit-btn"]').click();

  await page.locator('[data-testid="dialog-rejection"]').click();

  await page.locator('button[form="availability-form"]').click();
});
