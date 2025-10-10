import { test, expect } from "@playwright/test";

test("create team event using CreateTeamEventTypeAtom", async ({ page }) => {
  await page.goto("/");

  await page.goto("/event-types");

  await expect(page).toHaveURL("/event-types");

  await expect(page.locator("body")).toBeVisible();

  await page.fill(
    '[data-testid="create-team-event-type-atom"] [data-testid="event-type-quick-chat"]',
    "Platform team e2e event"
  );

  await page.waitForSelector(
    '[data-testid="create-team-event-type-atom"] button[type="submit"]:has-text("Continue")',
    { state: "visible" }
  );
  await page.locator('[data-testid="create-team-event-type-atom"] button[value="COLLECTIVE"]').check();

  await page
    .locator('[data-testid="create-team-event-type-atom"] button[type="submit"]:has-text("Continue")')
    .click();

  await expect(page.locator('h1:has-text("Platform team e2e event")')).toBeVisible();
  await expect(page.locator('p:has-text("/platform-team-e2e-event")')).toBeVisible();

  await page.locator('[data-testid="team-event-type-card"] h1:has-text("Platform team e2e event")').click();

  await expect(page.locator("body")).toBeVisible();
});
