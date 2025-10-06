import { test, expect } from "@playwright/test";

test("view  event type using CreateEventTypeAtom", async ({ page }) => {
  await page.goto("/");

  await page.goto("/calendar-view");

  await expect(page).toHaveURL("/calendar-view");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator('[data-testid="calendar-view-atom"]')).toBeVisible();
  await expect(page.locator('[data-testid="calendar-empty-cell"]')).toBeVisible();

  // this test is to make sure we have available slots in the calendar
  // if there are no empty cells that means there are no empty slots in the calendar
  // this means either the slots are not being fetched correctly or they are not being fetched at all
  const emptyCells = page.locator('[data-testid="calendar-empty-cell"]');
  expect(await emptyCells.count()).toBeGreaterThanOrEqual(1);

  await expect(page.locator("body")).toBeVisible();
});
