import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function verifyCalendarHasAvailableSlots(page: Page) {
  // wait for calendar to load and populate with slots
  await page.waitForSelector('[data-testid="calendar-empty-cell"]', { timeout: 10000 });

  // this test is to make sure we have available slots in the calendar
  // if there are no empty cells that means there are no empty slots in the calendar
  // this means either the slots are not being fetched correctly or they are not being fetched at all
  const emptyCells = page.locator('[data-testid="calendar-empty-cell"]');
  const cellCount = await emptyCells.count();
  expect(cellCount).toBeGreaterThanOrEqual(1);

  await expect(emptyCells.first()).toBeVisible();
}

test("view  event type using CreateEventTypeAtom", async ({ page }) => {
  await page.goto("/");

  await page.goto("/calendar-view");

  await expect(page).toHaveURL("/calendar-view");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator('[data-testid="calendar-view-atom"]')).toBeVisible();
  await verifyCalendarHasAvailableSlots(page);

  await expect(page.locator('button[aria-label="Next Day"]')).toBeVisible();
  await page.locator('button[aria-label="Next Day"]').click();
  await verifyCalendarHasAvailableSlots(page);

  await expect(page.locator('button[aria-label="Next Day"]')).toBeVisible();
  await page.locator('button[aria-label="Next Day"]').click();
  await verifyCalendarHasAvailableSlots(page);

  await expect(page.locator('button[aria-label="Previous Day"]')).toBeVisible();
  await page.locator('button[aria-label="Previous Day"]').click();
  await verifyCalendarHasAvailableSlots(page);

  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  await page.getByRole("button", { name: "Today" }).click();

  await verifyCalendarHasAvailableSlots(page);

  await expect(page.locator("body")).toBeVisible();
});
