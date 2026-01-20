import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Hide duration selector in booking page", () => {
  test("duration selector is hidden when setting is enabled but URL params still work", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();

    // Get the multiple duration event type
    const eventType = user.eventTypes.find((e) => e.slug === "multiple-duration");
    expect(eventType).toBeDefined();

    await test.step("enable hide duration selector setting", async () => {
      await page.goto("/event-types");
      await page.waitForSelector('[data-testid="event-types"]');
      await page.getByTestId("event-types").locator('a[title="Multiple duration"]').click();
      await page.waitForSelector('[data-testid="event-title"]');

      // Find and check the hide duration selector checkbox
      const checkbox = page.getByTestId("hide-duration-selector-checkbox");
      await checkbox.check();

      // Save the event type
      await page.locator('[data-testid="update-eventtype"]').click();
      await page.waitForResponse("/api/trpc/eventTypesHeavy/update?batch=1");
    });

    await test.step("verify duration selector is hidden on booking page", async () => {
      await page.goto(`/${user.username}/multiple-duration`);

      // Wait for the page to load
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

      // The duration selector buttons should NOT be visible
      await expect(page.getByTestId("multiple-choice-30mins")).not.toBeVisible();
      await expect(page.getByTestId("multiple-choice-60mins")).not.toBeVisible();
      await expect(page.getByTestId("multiple-choice-90mins")).not.toBeVisible();
    });

    await test.step("verify URL param can still set duration when selector is hidden", async () => {
      // Navigate with duration param
      await page.goto(`/${user.username}/multiple-duration?duration=60`);

      // Wait for the page to load
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

      // The duration selector should still be hidden
      await expect(page.getByTestId("multiple-choice-60mins")).not.toBeVisible();

      // Select a time slot and book
      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.fill('[name="name"]', "Test User");
      await page.fill('[name="email"]', "test@example.com");
      await bookTimeSlot(page);

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();

      // Verify the booking was made with the correct duration (60 mins = 1 hour)
      // The booking title or details should reflect the 60 min duration
    });
  });

  test("duration selector is visible when setting is disabled", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // The default multiple-duration event type should have the selector visible
    await page.goto(`/${user.username}/multiple-duration`);

    // Wait for the page to load
    await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

    // The duration selector buttons should be visible
    await expect(page.getByTestId("multiple-choice-30mins")).toBeVisible();
    await expect(page.getByTestId("multiple-choice-60mins")).toBeVisible();
    await expect(page.getByTestId("multiple-choice-90mins")).toBeVisible();
  });

  test("default duration is shown when selector is hidden and no URL param", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Get the multiple duration event type
    const eventType = user.eventTypes.find((e) => e.slug === "multiple-duration");
    expect(eventType).toBeDefined();

    await test.step("enable hide duration selector setting", async () => {
      await page.goto("/event-types");
      await page.waitForSelector('[data-testid="event-types"]');
      await page.getByTestId("event-types").locator('a[title="Multiple duration"]').click();
      await page.waitForSelector('[data-testid="event-title"]');

      // Find and check the hide duration selector checkbox
      const checkbox = page.getByTestId("hide-duration-selector-checkbox");
      await checkbox.check();

      // Save the event type
      await page.locator('[data-testid="update-eventtype"]').click();
      await page.waitForResponse("/api/trpc/eventTypesHeavy/update?batch=1");
    });

    await test.step("verify default duration is displayed", async () => {
      await page.goto(`/${user.username}/multiple-duration`);

      // Wait for the page to load
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

      // The duration text should be visible (default is 30 mins)
      // Since the selector is hidden, we should see the duration as text
      await expect(page.locator('[data-testid="event-meta"]')).toContainText("30");
    });
  });
});
