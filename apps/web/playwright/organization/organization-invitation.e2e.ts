import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";
import { getInviteLink } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, emails }) => {
  await users.deleteAll();
  emails?.deleteAll();
});

test.describe("Organization", () => {
  test("Invitation (non verified)", async ({ browser, page, users, emails }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true });
    const { team: org } = await orgOwner.getOrgMembership();
    await orgOwner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (external user)", async () => {
      const invitedUserEmail = `rick@domain-${Date.now()}.com`;
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send invite")').click();
      await page.waitForLoadState("networkidle");
      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`,
        "signup?token"
      );

      // Check newly invited member exists and is pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!inviteLink) return null;

      // Follow invite link in new window
      const context = await browser.newContext();
      const newPage = await context.newPage();
      newPage.goto(inviteLink);
      await newPage.waitForLoadState("networkidle");

      // Check required fields
      await newPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await newPage.locator("button[type=submit]").click();
      await newPage.waitForURL("/getting-started?from=signup");
      await context.close();
      await newPage.close();

      // Check newly invited member is not pending anymore
      await page.bringToFront();
      await page.goto("/settings/organizations/members");
      page.locator(`[data-testid="login-form"]`);
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);
    });

    await test.step("To the organization by invite link", async () => {
      // Get the invite link
      await page.locator('button:text("Add")').click();
      await page.locator(`[data-testid="copy-invite-link-button"]`).click();

      const inviteLink = await getInviteLink(page);
      // Follow invite link in new window
      const context = await browser.newContext();
      const inviteLinkPage = await context.newPage();
      await inviteLinkPage.goto(inviteLink);
      await inviteLinkPage.waitForLoadState("networkidle");

      // Check required fields
      const button = inviteLinkPage.locator("button[type=submit][disabled]");
      await expect(button).toBeVisible(); // email + 3 password hints

      // Happy path
      await inviteLinkPage.locator("input[name=email]").fill(`rick@domain-${Date.now()}.com`);
      await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await inviteLinkPage.locator("button[type=submit]").click();
      await inviteLinkPage.waitForURL("/getting-started");
    });
  });

  test("Invitation (verified)", async ({ browser, page, users, emails }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, isOrgVerified: true });
    const { team: org } = await orgOwner.getOrgMembership();
    await orgOwner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await test.step("To the organization by email (internal user)", async () => {
      const invitedUserEmail = `rick-${Date.now()}@example.com`;
      await page.locator('button:text("Add")').click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator('button:text("Send invite")').click();
      await page.waitForLoadState("networkidle");
      await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${org.name}'s admin invited you to join the organization ${org.name} on Cal.com`
      );

      // Check newly invited member exists and is not pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(0);
    });
  });
});
