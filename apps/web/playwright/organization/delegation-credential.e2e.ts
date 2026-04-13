import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";

import { test } from "../lib/fixtures";

async function seedGoogleWorkspacePlatform() {
  return prisma.workspacePlatform.upsert({
    where: { slug: "google" },
    update: {},
    create: {
      name: "Google Workspace",
      slug: "google",
      enabled: true,
      description: "Google Workspace",
      defaultServiceAccountKey: null,
    },
  });
}

async function seedDelegationCredential({
  organizationId,
  workspacePlatformId,
  domain = "testorg.com",
  enabled = false,
}: {
  organizationId: number;
  workspacePlatformId: number;
  domain?: string;
  enabled?: boolean;
}) {
  return prisma.delegationCredential.create({
    data: {
      domain,
      enabled,
      organizationId,
      workspacePlatformId,
      serviceAccountKey: {
        client_id: "test-client-id-123",
        encrypted_credentials: "fake-encrypted-creds",
      },
    },
  });
}

async function createOrgAdminAndLogin(users: any) {
  const orgAdmin = await users.create(undefined, {
    hasTeam: true,
    isOrg: true,
    isOrgVerified: true,
    isDnsSetup: true,
    teamFeatureFlags: ["delegation-credential"],
  });
  await orgAdmin.apiLogin();
  return orgAdmin;
}

test.describe("Delegation Credential Settings", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("org admin sees empty state with option to add a delegation credential", async ({ page, users }) => {
    await createOrgAdminAndLogin(users);
    await seedGoogleWorkspacePlatform();

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/add delegation credential/i).first()).toBeVisible();
    await expect(
      page.getByText("Delegation credential allows you to manage access to Google Workspace calendars").first()
    ).toBeVisible();
  });

  test("org admin can open the create delegation credential dialog", async ({ page, users }) => {
    await createOrgAdminAndLogin(users);
    await seedGoogleWorkspacePlatform();

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    // Click add button in the empty state
    await page.getByRole("button", { name: /add delegation credential/i }).click();

    // Dialog should appear with form fields
    await expect(page.locator('[data-testid="dialog-title"], [role="dialog"]').first()).toBeVisible();
    await expect(page.locator('input[name="domain"]')).toBeVisible();
    await expect(page.locator('textarea[name="serviceAccountKey"]')).toBeVisible();
  });

  test("submitting invalid JSON as service account key shows a validation error", async ({
    page,
    users,
  }) => {
    await createOrgAdminAndLogin(users);
    await seedGoogleWorkspacePlatform();

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    // Open create dialog
    await page.getByRole("button", { name: /add delegation credential/i }).click();

    // Fill domain
    await page.locator('input[name="domain"]').fill("example.com");

    // Select workspace platform (react-select)
    const platformSelect = page.locator('[id$="-workspacePlatformSlug"]').first();
    if (await platformSelect.isVisible()) {
      await platformSelect.click();
      await page.getByText("Google Workspace").first().click();
    }

    // Enter invalid JSON in service account key
    await page.locator('textarea[name="serviceAccountKey"]').fill("not valid json");

    // Submit — form should NOT close because the JSON is invalid
    await page.getByRole("button", { name: /create/i }).click();

    // Dialog should remain open with the textarea still visible (validation prevented submission)
    await expect(page.locator('textarea[name="serviceAccountKey"]')).toBeVisible({ timeout: 5000 });

    // The textarea should still contain the invalid input (form was not reset)
    await expect(page.locator('textarea[name="serviceAccountKey"]')).toHaveValue("not valid json");
  });

  test("org admin can cancel the create dialog without changes", async ({ page, users }) => {
    await createOrgAdminAndLogin(users);
    await seedGoogleWorkspacePlatform();

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    // Open create dialog
    await page.getByRole("button", { name: /add delegation credential/i }).click();

    // Wait for dialog to be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Dialog should be closed - still showing empty state
    await expect(page.getByRole("button", { name: /add delegation credential/i })).toBeVisible();
  });

  test("org admin sees credential details in the list including client ID, platform, and domain", async ({
    page,
    users,
  }) => {
    const orgAdmin = await createOrgAdminAndLogin(users);
    const { team: org } = await orgAdmin.getOrgMembership();
    const workspacePlatform = await seedGoogleWorkspacePlatform();

    await seedDelegationCredential({
      organizationId: org.id,
      workspacePlatformId: workspacePlatform.id,
    });

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    // Should show the credential details in the list
    await expect(page.getByText("test-client-id-123")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Google Workspace").first()).toBeVisible();
    await expect(page.getByText("testorg.com")).toBeVisible();
    await expect(page.getByText("https://www.googleapis.com/auth/calendar")).toBeVisible();
  });

  test("clicking the toggle switch shows a confirmation dialog to enable the credential", async ({
    page,
    users,
  }) => {
    const orgAdmin = await createOrgAdminAndLogin(users);
    const { team: org } = await orgAdmin.getOrgMembership();
    const workspacePlatform = await seedGoogleWorkspacePlatform();

    await seedDelegationCredential({
      organizationId: org.id,
      workspacePlatformId: workspacePlatform.id,
    });

    await page.goto("/settings/organizations/delegation-credential");
    await page.waitForLoadState("networkidle");

    // Wait for credential to be visible first
    await expect(page.getByText("test-client-id-123")).toBeVisible({ timeout: 10000 });

    // Click the toggle switch
    const toggleSwitch = page.locator('[role="switch"]').first();
    await toggleSwitch.click();

    // Confirmation dialog should appear with enable text
    await expect(page.getByText("Enable Delegation Credential")).toBeVisible({ timeout: 10000 });
  });
});
