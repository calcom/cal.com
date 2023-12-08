import { expect } from "@playwright/test";
import path from "path";

import { test } from "../lib/fixtures";
import { generateTotpCode } from "../lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./expects";

test.afterAll(({ users, emails }) => {
  users.deleteAll();
  emails?.deleteAll();
});

function capitalize(text: string) {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

test.describe("Organization", () => {
  test("should be able to create an organization and complete onboarding", async ({
    page,
    users,
    emails,
  }) => {
    const orgOwner = await users.create();
    const orgDomain = `${orgOwner.username}-org`;
    const orgName = capitalize(`${orgOwner.username}-org`);
    await orgOwner.apiLogin();
    await page.goto("/settings/organizations/new");
    await page.waitForLoadState("networkidle");

    await test.step("Basic info", async () => {
      // Check required fields
      await page.locator("button[type=submit]").click();
      await expect(page.locator(".text-red-700")).toHaveCount(3);

      // Happy path
      await page.locator("input[name=adminEmail]").fill(`john@${orgDomain}.com`);
      expect(await page.locator("input[name=name]").inputValue()).toEqual(orgName);
      expect(await page.locator("input[name=slug]").inputValue()).toEqual(orgDomain);
      await page.locator("button[type=submit]").click();
      await page.waitForLoadState("networkidle");

      // Check admin email about code verification
      await expectInvitationEmailToBeReceived(
        page,
        emails,
        `john@${orgOwner.username}-org.com`,
        "Verify your email to create an organization"
      );

      await test.step("Verification", async () => {
        // Code verification
        await expect(page.locator("#modal-title")).toBeVisible();
        await page.locator("input[name='2fa1']").fill(generateTotpCode(`john@${orgDomain}.com`));

        // Check admin email about DNS pending action
        await expectInvitationEmailToBeReceived(
          page,
          emails,
          "admin@example.com",
          "New organization created: pending action"
        );

        // Waiting to be in next step URL
        await page.waitForURL("/settings/organizations/*/set-password");
      });
    });

    await test.step("Admin password", async () => {
      // Check required fields
      await page.locator("button[type=submit]").click();
      await expect(page.locator(".text-red-700")).toHaveCount(3); // 3 password hints

      // Happy path
      await page.locator("input[name='password']").fill("ADMIN_user2023$");
      await page.locator("button[type=submit]").click();

      // Waiting to be in next step URL
      await page.waitForURL("/settings/organizations/*/about");
    });

    await test.step("About the organization", async () => {
      // Choosing an avatar
      await page.locator('button:text("Upload")').click();
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.getByText("Choose a file...").click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(path.join(__dirname, "../../public/apple-touch-icon.png"));
      await page.locator('button:text("Save")').click();

      // About text
      await page.locator('textarea[name="about"]').fill("This is a testing org");
      await page.locator("button[type=submit]").click();

      // Waiting to be in next step URL
      await page.waitForURL("/settings/organizations/*/onboard-admins");
    });

    await test.step("On-board administrators", async () => {
      // Required field
      await page.locator("button[type=submit]").click();

      // Happy path
      await page.locator('textarea[name="emails"]').fill(`rick@${orgDomain}.com`);
      await page.locator("button[type=submit]").click();

      // Check if invited admin received the invitation email
      await expectInvitationEmailToBeReceived(
        page,
        emails,
        `rick@${orgDomain}.com`,
        `${orgName}'s admin invited you to join the organization ${orgName} on Cal.com`
      );

      // Waiting to be in next step URL
      await page.waitForURL("/settings/organizations/*/add-teams");
    });

    await test.step("Create teams", async () => {
      // Initial state
      await expect(page.locator('input[name="teams.0.name"]')).toHaveCount(1);
      await expect(page.locator('button:text("Continue")')).toBeDisabled();

      // Filling one team
      await page.locator('input[name="teams.0.name"]').fill("Marketing");
      await expect(page.locator('button:text("Continue")')).toBeEnabled();

      // Adding another team
      await page.locator('button:text("Add a team")').click();
      await expect(page.locator('button:text("Continue")')).toBeDisabled();
      await expect(page.locator('input[name="teams.1.name"]')).toHaveCount(1);
      await page.locator('input[name="teams.1.name"]').fill("Sales");
      await expect(page.locator('button:text("Continue")')).toBeEnabled();

      // Finishing the creation wizard
      await page.locator('button:text("Continue")').click();
      await page.waitForURL("/event-types");
    });
  });
});
