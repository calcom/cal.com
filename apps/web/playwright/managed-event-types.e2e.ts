import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  fillStripeTestCheckout,
  localize,
  selectFirstAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.afterAll(({ users }) => users.deleteAll());

test.describe("Managed Event Types", () => {
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
      await page.locator('input[name="name"]').fill(`${adminUser.username}'s Team`);
      await page.click("[type=submit]");
      // TODO: Figure out a way to make this more reliable
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (IS_TEAM_BILLING_ENABLED) await fillStripeTestCheckout(page);
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members.*$/i);
      await page.getByTestId("new-member-button").click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(`${memberUser.username}@example.com`);
      await page.getByTestId("invite-new-member-button").click();
      // wait for the second member to be added to the pending-member-list.
      await page.getByTestId("pending-member-list").locator("li:nth-child(2)").waitFor();
      // and publish
      await page.locator("[data-testid=publish-button]").click();
      await expect(page).toHaveURL(/\/settings\/teams\/(\d+)\/profile$/i);
      // Going to create an event type
      await page.goto("/event-types");
      await page.getByTestId("new-event-type").click();
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
      await page.getByTestId("vertical-tab-event_setup_tab_title").click();
      await page.getByTestId("update-eventtype").waitFor();
      await expect(page.locator('input[name="title"]')).toBeEditable();
      await expect(page.locator('input[name="slug"]')).toBeEditable();
      await expect(page.locator('input[name="length"]')).toBeEditable();
      await adminUser.apiLogin();
    });

    await test.step("Managed event type exists for added member", async () => {
      // Now we need to accept the invitation as member and come back in as admin to
      // assign the member in the managed event type
      await memberUser.apiLogin();

      await page.goto("/teams");
      await page.locator('button[data-testid^="accept-invitation"]').click();
      await page.getByText("Member").waitFor();

      await page.goto("/auth/logout");

      // Coming back as team owner to assign member user to managed event
      await adminUser.apiLogin();
      await page.goto("/event-types");
      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.getByTestId("vertical-tab-assignment").click();
      await page.getByTestId("assignment-dropdown").click();

      await page.getByTestId(`select-option-${memberUser.id}`).click();
      await page.locator('[type="submit"]').click();
      await page.getByTestId("toast-success").waitFor();
    });

    await test.step("Managed event type can use Organizer's default app as location", async () => {
      await page.getByTestId("vertical-tab-event_setup_tab_title").click();

      await page.locator("#location-select").click();
      const optionText = (await localize("en"))("organizer_default_conferencing_app");
      await page.locator(`text=${optionText}`).click();
      await page.locator("[data-testid=update-eventtype]").click();
      await page.getByTestId("toast-success").waitFor();
      await page.waitForLoadState("networkidle");

      await page.getByTestId("vertical-tab-assignment").click();
      await gotoBookingPage(page);
      await selectFirstAvailableTimeSlotNextMonth(page);
      await bookTimeSlot(page);

      await expect(page.getByTestId("success-page")).toBeVisible();
    });

    await test.step("Managed event type has locked fields for added member", async () => {
      await adminUser.logout();
      // Coming back as member user to see if there is a managed event present after assignment
      await memberUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      await expect(page.locator('input[name="title"]')).not.toBeEditable();
      await expect(page.locator('input[name="slug"]')).not.toBeEditable();
      await expect(page.locator('input[name="length"]')).not.toBeEditable();

      await page.goto("/auth/logout");
    });

    await test.step("Managed event type provides discrete field lock/unlock state for admin", async () => {
      await adminUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      // Locked by default
      const titleLockIndicator = page.getByTestId("locked-indicator-title");
      await expect(titleLockIndicator).toBeVisible();
      await expect(titleLockIndicator.locator("[data-state='checked']")).toHaveCount(1);

      // Proceed to unlock and check that it got unlocked
      titleLockIndicator.click();
      await expect(titleLockIndicator.locator("[data-state='checked']")).toHaveCount(0);
      await expect(titleLockIndicator.locator("[data-state='unchecked']")).toHaveCount(1);

      // Save changes
      await page.locator('[type="submit"]').click();
      await page.waitForLoadState("networkidle");

      await page.goto("/auth/logout");
    });

    await test.step("Managed event type shows discretionally unlocked field to member", async () => {
      await memberUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      await expect(page.locator('input[name="title"]')).toBeEditable();
      await page.waitForLoadState("networkidle");

      await page.goto("/auth/logout");
    });

    await test.step("Managed event type should only update the unlocked fields modified by Admin", async () => {
      await memberUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      await expect(page.locator('input[name="title"]')).toBeEditable();
      await page.locator('input[name="title"]').fill(`Managed Event Title`);
      // Save changes
      await page.locator('[type="submit"]').click();
      await page.getByTestId("toast-success").waitFor();
      await page.waitForLoadState("networkidle");

      await page.goto("/auth/logout");

      await adminUser.apiLogin();
      await page.goto("/event-types");
      await page.getByTestId("event-types").locator('a[title="managed"]').click();
      await page.waitForURL("event-types/**");

      await page.locator('input[name="length"]').fill(`45`);
      // Save changes
      await page.locator('[type="submit"]').click();
      await page.getByTestId("toast-success").waitFor();
      await page.waitForLoadState("networkidle");

      await page.goto("/auth/logout");

      await memberUser.apiLogin();
      await page.goto("/event-types");

      await page.getByTestId("event-types").locator('a[title="Managed Event Title"]').click();
      await page.waitForURL("event-types/**");

      //match length
      expect(await page.locator("[data-testid=duration]").getAttribute("value")).toBe("45");
      //ensure description didn't update
      expect(await page.locator(`input[name="title"]`).getAttribute("value")).toBe(`Managed Event Title`);
      await page.locator('input[name="title"]').fill(`managed`);
      // Save changes
      await page.locator('[type="submit"]').click();
      await page.getByTestId("toast-success").waitFor();
    });
  });
});

async function gotoBookingPage(page: Page) {
  const previewLink = await page.getByTestId("preview-button").getAttribute("href");

  await page.goto(previewLink ?? "");
}
