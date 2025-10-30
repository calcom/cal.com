import { test, expect } from "@playwright/test";

test("connect calendar using the apple connect atom", async ({ page }) => {
  const appleId = process.env.ATOMS_E2E_APPLE_ID;
  const appSpecificPassword = process.env.ATOMS_E2E_APPLE_CONNECT_APP_SPECIFIC_PASSCODE;

  await page.goto("/");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator('[data-testid="connect-atoms"]')).toBeVisible();

  await page.locator('[data-testid="connect-atoms"] button:has-text("Connect Apple Calendar")').click();

  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await expect(page.locator('[role="dialog"] fieldset[data-testid="apple-calendar-form"]')).toBeVisible();

  await expect(page.locator('[data-testid="apple-calendar-email"]')).toBeVisible();
  await page.locator('[data-testid="apple-calendar-email"]').fill(appleId ?? "");

  await expect(page.locator('[data-testid="apple-calendar-password"]')).toBeVisible();
  await page.locator('[data-testid="apple-calendar-password"]').fill(appSpecificPassword ?? "");

  await page.locator('[data-testid="apple-calendar-login-button"]').click();

  await expect(page).toHaveURL("/calendars");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator('[data-testid="calendars-settings-atom"]')).toBeVisible();

  await expect(page.locator('h2:has-text("Add to calendar")')).toBeVisible();

  await expect(page.locator('label:has-text("Add events to")')).toBeVisible();

  await expect(page.locator('[data-testid="select-control"]')).toBeVisible();
  await page.locator('[data-testid="select-control"]').click();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(page.locator('h4:has-text("Check for conflicts")')).toBeVisible();

  await expect(page.locator('[data-testid="list"]')).toBeVisible();
  await page.locator('[data-testid="list"] button:has(svg[data-name="start-icon"])').click();
  await page.locator('[data-testid="dialog-rejection"]').click();

  await expect(page.locator('[data-testid="list"] button[role="switch"]').first()).toBeVisible();
  await page.locator('[data-testid="list"] button[role="switch"]').first().click();

  await expect(page.locator('[data-testid="list"] button[role="switch"]').last()).toBeVisible();
  await page.locator('[data-testid="list"] button[role="switch"]').last().click();

  await expect(page.locator('[data-testid="list"] button[role="switch"]').first()).toBeVisible();
  await page.locator('[data-testid="list"] button[role="switch"]').first().click();

  await page.locator('[data-testid="list"] button:has(svg[data-name="start-icon"])').click();
  await page.locator('[data-testid="dialog-confirmation"]').click();
});
