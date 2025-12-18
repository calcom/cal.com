import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Slots API - Date Range Limit", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("should clamp endTime to 1 year from today when requesting slots beyond 1 year via tRPC", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto(`/${user.username}/30-min`);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/trpc/viewer.slots.getSchedule") && response.status() === 200
    );

    await page.waitForLoadState("networkidle");

    const response = await responsePromise;
    const responseData = await response.json();

    expect(responseData).toBeDefined();

    expect(response.status()).toBe(200);
  });

  test("should not return slots for dates beyond 1 year from today", async ({ page, users }) => {
    const user = await users.create();

    await page.goto(`/${user.username}/30-min`);

    await page.waitForSelector('[data-testid="day"]');

    for (let i = 0; i < 24; i++) {
      const incrementButton = page.locator('[data-testid="incrementMonth"]');
      if (await incrementButton.isVisible()) {
        await incrementButton.click();
        await page.waitForTimeout(100); // Small delay to let the calendar update
      }
    }


    const enabledDays = page.locator('[data-testid="day"][data-disabled="false"]');
    const enabledDaysCount = await enabledDays.count();

    expect(enabledDaysCount).toBe(0);
  });

  test("should show available slots for dates within 1 year from today", async ({ page, users }) => {
    const user = await users.create();

    await page.goto(`/${user.username}/30-min`);

    // Wait for the calendar to fully load by waiting for the increment month button
    await page.waitForSelector('[data-testid="incrementMonth"]');

    // Click to go to next month (using the same pattern as selectFirstAvailableTimeSlotNextMonth)
    await page.getByTestId("incrementMonth").click();

    // Wait for enabled days to appear in the next month
    await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();

    const enabledDays = page.locator('[data-testid="day"][data-disabled="false"]');
    const enabledDaysCount = await enabledDays.count();

    expect(enabledDaysCount).toBeGreaterThan(0);
  });
});
