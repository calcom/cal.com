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
    await adminUser.apiLogin();

    // Let's create a team
    await page.goto("/settings/teams/new");

    await test.step("Managed event option exists for team admin", async () => {
      // Filling team creation form wizard
      await page.locator('input[name="name"]').waitFor();
      await page.locator('input[name="name"]').fill(`${adminUser.username}'s Team`);
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      await page.getByTestId("new-member-button").click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(`${memberUser.username}@example.com`);
      await page.getByTestId("invite-new-member-button").click();
      // wait for the second member to be added to the pending-member-list.
      await page.getByTestId("pending-member-list").locator("li:nth-child(2)").waitFor();
      // and publish
      await page.locator("text=Publish team").click();
      await page.waitForURL("/settings/teams/**");
      // Going to create an event type
      await page.goto("/event-types");
      await page.getByTestId("new-event-type-dropdown").click();
      await page.getByTestId("option-team-1").click();
      // Expecting we can add a managed event type as team owner
      await expect(page.locator('button[value="MANAGED"]')).toBeVisible();

      // Actually creating a managed event type to test things further
      await page.click('button[value="MANAGED"]');
      await page.fill("[name=title]", "managed");
      await page.click("[type=submit]");

      await page.waitForURL("event-types/**");
    });

    await test.step("Managed event type has unlocked fields for admin", async () => {
      await page.getByTestId("update-eventtype").waitFor();
      await expect(page.locator('input[name="title"]')).toBeEditable();
      await expect(page.locator('input[name="slug"]')).toBeEditable();
      await expect(page.locator('input[name="length"]')).toBeEditable();
      await adminUser.logout();
    });

    await test.step("Managed event type exists for added member", async () => {
      // Now we need to accept the invitation as member and come back in as admin to
      // assign the member in the managed event type
      await memberUser.apiLogin();

      await page.goto("/teams");
      await page.locator('button[data-testid^="accept-invitation"]').click();
      await page.getByText("Member").waitFor();

      await memberUser.logout();

      // Coming back as team owner to assign member user to managed event
      await adminUser.apiLogin();
      await page.goto("/event-types");
      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.getByTestId("vertical-tab-assignment").click();
      await page.locator('[class$="control"]').filter({ hasText: "Select..." }).click();
      await page.getByTestId(`select-option-${memberUser.id}`).click();
      await page.locator('[type="submit"]').click();
      await page.getByTestId("toast-success").waitFor();

      await adminUser.logout();
    });

    await test.step("Managed event type has locked fields for added member", async () => {
      // Coming back as member user to see if there is a managed event present after assignment
      await memberUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      await expect(page.locator('input[name="title"]')).not.toBeEditable();
      await expect(page.locator('input[name="slug"]')).not.toBeEditable();
      await expect(page.locator('input[name="length"]')).not.toBeEditable();
    });
  });
});
