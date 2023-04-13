import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Managed Event Types tests", () => {
  test("Can create managed event type", async ({ page, users }) => {
    // Creating the owner user of the team
    const adminUser = await users.create();
    // Creating the member user of the team
    const memberUser = await users.create();
    // First we work with owner user, logging in
    await adminUser.login();
    // Making sure page loads completely
    await page.waitForLoadState("networkidle");
    // Let's create a team
    await page.goto("/teams");

    await test.step("Managed event option exists for team admin", async () => {
      // Proceed to create a team
      await page.locator("text=Create Team").click();
      await page.waitForURL("/settings/teams/new");

      // Filling team creation form wizard
      await page.locator('input[name="name"]').fill(`${adminUser.username}'s Team`);
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      await page.locator('[data-testid="new-member-button"]').click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(`${memberUser.username}@example.com`);
      await page.locator('[data-testid="invite-new-member-button"]').click();
      await page.waitForLoadState("networkidle");
      await page.locator("text=Publish team").click();
      await page.waitForLoadState("networkidle");

      // Going to create an event type
      await page.goto("/event-types");
      await page.waitForLoadState("networkidle");
      await page.click("[data-testid=new-event-type-dropdown]");
      await page.click("[data-testid=option-team-1]");
      // Expecting we can add a managed event type as team owner
      await expect(page.locator('input[value="MANAGED"]')).toBeVisible();

      // Actually creating a managed event type to test things further
      await page.click('input[value="MANAGED"]');
      await page.fill("[name=title]", "managed");
      await page.click("[type=submit]");
    });

    await test.step("Managed event type has unlocked fields for admin", async () => {
      await page.waitForSelector('[data-testid="update-eventtype"]');
      await expect(page.locator('input[name="title"]')).toBeEditable();
      await expect(page.locator('input[name="slug"]')).toBeEditable();
      await expect(page.locator('input[name="length"]')).toBeEditable();
    });

    await test.step("Managed event type exists for added member", async () => {
      // Now we need to accept the invitation as member and come back in as admin to
      // assign the member in the managed event type
      await adminUser.logout();
      await memberUser.login();
      await page.waitForSelector('[data-testid="event-types"]');
      await page.goto("/teams");
      await page.waitForLoadState("networkidle");
      await page.locator('button[data-testid^="accept-invitation"]').click();
      await page.waitForLoadState("networkidle");
      await memberUser.logout();

      // Coming back as team owner to assign member user to managed event
      await adminUser.login();
      await page.waitForLoadState("networkidle");
      await page.locator('[data-testid="event-types"] a[title="managed"]').click();
      await page.locator('[data-testid="vertical-tab-assignment"]').click();
      await page.locator('[class$="control"]').filter({ hasText: "Select..." }).click();
      await page.locator("#react-select-5-option-1").click();
      await page.locator('[type="submit"]').click();
      await page.waitForLoadState("networkidle");
      await adminUser.logout();

      // Coming back as member user to see if there is a managed event present after assignment
      await memberUser.login();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('[data-testid="event-types"] a[title="managed"]')).toBeVisible();
    });

    await test.step("Managed event type has locked fields for added member", async () => {
      page.locator('[data-testid="event-types"] a[title="managed"]').click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('input[name="title"]')).not.toBeEditable();
      await expect(page.locator('input[name="slug"]')).not.toBeEditable();
      await expect(page.locator('input[name="length"]')).not.toBeEditable();
    });
  });
});
