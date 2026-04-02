import { expect, test } from "@playwright/test";
import { generateRandomText } from "../../src/lib/generateRandomText";

// eslint-disable-next-line playwright/no-skipped-test
test.skip("create team event using CreateTeamEventTypeAtom", async ({ page }) => {
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

  await expect(page.locator('[data-testid="event-type-settings-atom"]')).toBeVisible();

  await expect(page.locator('[data-testid="vertical-tab-availability"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-availability"]').click();

  await expect(page.locator('[data-testid="vertical-tab-assignment"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-assignment"]').click();

  await expect(page.locator('[data-testid="vertical-tab-event_limit_tab_title"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-event_limit_tab_title"]').click();

  await expect(page.locator('[data-testid="vertical-tab-event_advanced_tab_title"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-event_advanced_tab_title"]').click();

  await expect(page.locator('[data-testid="vertical-tab-recurring"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-recurring"]').click();

  await expect(page.locator('[data-testid="vertical-tab-payments"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-payments"]').click();

  await expect(page.locator('[data-testid="vertical-tab-basics"]')).toBeVisible();
  await page.locator('[data-testid="vertical-tab-basics"]').click();

  await expect(page.locator('textarea[name="description"]')).toBeVisible();
  await page.fill('textarea[name="description"]', generateRandomText());

  await page.locator('[data-testid="update-eventtype"]').click();

  await expect(page.locator('h1:has-text("Platform team e2e event")')).toBeVisible();
  await expect(page.locator('p:has-text("/platform-team-e2e-event")')).toBeVisible();

  await page.locator('[data-testid="team-event-type-card"] h1:has-text("Platform team e2e event")').click();

  await expect(page.locator('[data-testid="event-type-settings-atom"]')).toBeVisible();

  await page.locator('button[type="button"][tooltip="Delete"]').waitFor({ state: "visible" });
  await page.locator('button[type="button"][tooltip="Delete"]').click();

  await page.locator('[data-testid="dialog-creation"]').waitFor({ state: "visible" });
  await page.locator('[data-testid="dialog-confirmation"]').click();

  await expect(page.locator("body")).toBeVisible();
});
