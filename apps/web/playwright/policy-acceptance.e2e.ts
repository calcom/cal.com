import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { PolicyType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Policy Acceptance Modal", () => {
  // Track user IDs created in this test suite for cleanup
  const createdUserIds: number[] = [];

  test.afterEach(async ({ users }) => {
    // Clean up policies created by users in this test
    for (const userId of createdUserIds) {
      await prisma.userPolicyAcceptance.deleteMany({
        where: { userId },
      });
      await prisma.policyVersion.deleteMany({
        where: { createdById: userId },
      });
    }
    createdUserIds.length = 0;
    await users.deleteAll();
  });

  test.afterAll(async () => {
    // Final cleanup to ensure no policies from this test suite remain
    // This runs after all tests complete, even if they fail
    for (const userId of createdUserIds) {
      await prisma.userPolicyAcceptance.deleteMany({
        where: { userId },
      });
      await prisma.policyVersion.deleteMany({
        where: { createdById: userId },
      });
    }
  });

  test.skip("should show blocking modal for non-US users when policy is not accepted", async ({
    page,
    users,
  }) => {
    const user = await users.create();

    const policyVersion = await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    console.log("policyVersion: ", policyVersion);

    await user.apiLogin();
    await page.goto("/event-types");

    // Check that the modal is visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).toBeVisible();

    // Check that the modal title is correct
    await expect(page.getByTestId("policy-modal-title")).toBeVisible();

    // Check that the description is shown
    await expect(page.getByTestId("policy-modal-description")).toHaveText(
      "We have updated our privacy policy."
    );

    // Check that Learn More button is visible
    await expect(page.getByTestId("policy-learn-more-button")).toBeVisible();

    // Check that Accept button is visible
    const acceptButton = page.getByTestId("policy-accept-button");
    await expect(acceptButton).toBeVisible();

    // Check that modal cannot be closed by clicking outside or ESC
    await page.keyboard.press("Escape");
    await expect(modal).toBeVisible();

    await page.mouse.click(10, 10);
    await expect(modal).toBeVisible();

    // Accept the policy
    await acceptButton.click();

    // Wait for the modal to disappear
    await expect(modal).not.toBeVisible();

    // Verify that acceptance was recorded in the database
    const acceptance = await prisma.userPolicyAcceptance.findUnique({
      where: {
        userId_policyVersion_policyType: {
          userId: user.id,
          policyVersion: policyVersion.version,
          policyType: PolicyType.PRIVACY_POLICY,
        },
      },
    });

    expect(acceptance).toBeTruthy();
    expect(acceptance?.acceptedAt).toBeInstanceOf(Date);

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should not show modal when user has already accepted the policy", async ({ page, users }) => {
    const user = await users.create();

    const policyVersion = await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    // Create acceptance record
    await prisma.userPolicyAcceptance.create({
      data: {
        userId: user.id,
        policyVersion: policyVersion.version,
        policyType: PolicyType.PRIVACY_POLICY,
        acceptedAt: new Date(),
      },
    });

    await user.apiLogin();
    await page.goto("/event-types");

    // Check that the modal is NOT visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).not.toBeVisible();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should not show modal when feature flag is disabled", async ({ page, users, features }) => {
    // Disable the global feature flag
    await features.set("policy-acceptance-modal", false);

    const user = await users.create();

    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();
    await page.goto("/event-types");

    // Check that the modal is NOT visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).not.toBeVisible();

    // Clean up
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });

    // Re-enable the feature flag for other tests
    await features.set("policy-acceptance-modal", true);
  });

  test("should show dismissible banner for US users when policy is not accepted", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    createdUserIds.push(user.id);

    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();

    // Set US country header
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "US" });
    await page.goto("/event-types");

    // Check that the banner is visible (not modal)
    const banner = page.getByTestId("policy-acceptance-banner");
    await expect(banner).toBeVisible();

    // Check that modal is NOT visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).not.toBeVisible();

    // Check that the banner title is correct
    await expect(page.getByTestId("policy-banner-title")).toBeVisible();

    // Check that the US-specific description is shown
    await expect(page.getByTestId("policy-banner-description")).toHaveText(
      "We have updated our privacy policy for US users."
    );

    // Check that Learn More button is visible
    await expect(page.getByTestId("policy-learn-more-button")).toBeVisible();

    // Clean up
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should accept policy when US user dismisses banner", async ({ page, users }) => {
    const user = await users.create();

    const policyVersion = await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();

    // Set US country header
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "US" });
    await page.goto("/event-types");

    // Check that the banner is visible
    const banner = page.getByTestId("policy-acceptance-banner");
    await expect(banner).toBeVisible();

    // Click the X button to dismiss (which auto-accepts for US users)
    const closeButton = page.getByTestId("policy-banner-close-button");
    await closeButton.click();

    // Wait for the banner to disappear
    await expect(banner).not.toBeVisible();

    // Verify that acceptance was recorded in the database
    const acceptance = await prisma.userPolicyAcceptance.findUnique({
      where: {
        userId_policyVersion_policyType: {
          userId: user.id,
          policyVersion: policyVersion.version,
          policyType: PolicyType.PRIVACY_POLICY,
        },
      },
    });

    expect(acceptance).toBeTruthy();
    expect(acceptance?.acceptedAt).toBeInstanceOf(Date);

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should not show banner again after US user dismisses it", async ({ page, users }) => {
    const user = await users.create();

    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();

    // Set US country header
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "US" });
    await page.goto("/event-types");

    // Check that the banner is visible
    const banner = page.getByTestId("policy-acceptance-banner");
    await expect(banner).toBeVisible();

    // Dismiss the banner
    const closeButton = page.getByTestId("policy-banner-close-button");
    await closeButton.click();

    // Wait for the banner to disappear
    await expect(banner).not.toBeVisible();

    // Navigate to another page
    await page.goto("/settings/my-account/profile");

    // Banner should not appear again
    await expect(banner).not.toBeVisible();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should show new banner when a new policy version is published for US users", async ({
    page,
    users,
  }) => {
    const user = await users.create();

    // Create first policy version
    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date("2024-01-01T00:00:00.000Z"),
        description: "First version - US users.",
        descriptionNonUS: "First version - we made some changes.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();

    // Set US country header
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "US" });
    await page.goto("/event-types");

    // Check that the banner is visible with the first version
    const banner = page.getByTestId("policy-acceptance-banner");
    await expect(banner).toBeVisible();

    // Check that the first version description is shown
    await expect(page.getByTestId("policy-banner-description")).toHaveText("First version - US users.");

    // Dismiss the first banner
    const closeButton = page.getByTestId("policy-banner-close-button");
    await closeButton.click();

    // Wait for the banner to disappear
    await expect(banner).not.toBeVisible();

    // Now create a second policy version (newer)
    const policyVersion2 = await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date("2024-02-01T00:00:00.000Z"),
        description: "Second version - US users.",
        descriptionNonUS: "Second version - we made important changes.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    // Navigate to a new page
    await page.goto("/settings/my-account/profile");

    // Check that the banner is visible again with the new version
    await expect(banner).toBeVisible();

    // Check that the new description is shown
    await expect(page.getByTestId("policy-banner-description")).toHaveText("Second version - US users.");

    // Dismiss the new banner
    await closeButton.click();

    // Wait for the banner to disappear
    await expect(banner).not.toBeVisible();

    // Verify that acceptance was recorded for the new version
    const acceptance = await prisma.userPolicyAcceptance.findUnique({
      where: {
        userId_policyVersion_policyType: {
          userId: user.id,
          policyVersion: policyVersion2.version,
          policyType: PolicyType.PRIVACY_POLICY,
        },
      },
    });

    expect(acceptance).toBeTruthy();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should show modal only once per session after dismissal", async ({ page, users }) => {
    const user = await users.create();

    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();
    await page.goto("/event-types");

    // Check that the modal is visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).toBeVisible();

    // Accept the policy
    const acceptButton = page.getByTestId("policy-accept-button");
    await acceptButton.click();

    // Wait for the modal to disappear
    await expect(modal).not.toBeVisible();

    // Navigate to another page
    await page.goto("/settings/my-account/profile");

    // Modal should not appear again
    await expect(modal).not.toBeVisible();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should show new modal when a new policy version is published", async ({ page, users }) => {
    const user = await users.create();

    // Create first policy version
    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date("2024-01-01T00:00:00.000Z"),
        description: "First version - US users.",
        descriptionNonUS: "First version - we made some changes.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();
    await page.goto("/event-types");

    // Check that the modal is visible with the first version
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).toBeVisible();

    // Check that the first version description is shown
    await expect(page.getByTestId("policy-modal-description")).toHaveText(
      "First version - we made some changes."
    );

    // Accept the first policy
    const acceptButton = page.getByTestId("policy-accept-button");
    await acceptButton.click();

    // Wait for the modal to disappear
    await expect(modal).not.toBeVisible();

    // Now create a second policy version (newer)
    const policyVersion2 = await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date("2024-02-01T00:00:00.000Z"),
        description: "Second version - US users.",
        descriptionNonUS: "Second version - we made important changes.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    // Navigate to a new page
    await page.goto("/settings/my-account/profile");

    // Check that the modal is visible again with the new version
    await expect(modal).toBeVisible();

    // Check that the new description is shown
    await expect(page.getByTestId("policy-modal-description")).toHaveText(
      "Second version - we made important changes."
    );

    // Accept the new policy
    await acceptButton.click();

    // Wait for the modal to disappear
    await expect(modal).not.toBeVisible();

    // Verify that acceptance was recorded for the new version
    const acceptance = await prisma.userPolicyAcceptance.findUnique({
      where: {
        userId_policyVersion_policyType: {
          userId: user.id,
          policyVersion: policyVersion2.version,
          policyType: PolicyType.PRIVACY_POLICY,
        },
      },
    });

    expect(acceptance).toBeTruthy();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });

  test.skip("should invalidate /me query after accepting policy", async ({ page, users }) => {
    const user = await users.create();

    await prisma.policyVersion.create({
      data: {
        type: PolicyType.PRIVACY_POLICY,
        version: new Date(),
        description: "We have updated our privacy policy for US users.",
        descriptionNonUS: "We have updated our privacy policy.",
        publishedAt: new Date(),
        createdById: user.id,
      },
    });

    await user.apiLogin();
    await page.goto("/event-types");

    // Wait for the modal to be visible
    const modal = page.getByTestId("policy-acceptance-modal");
    await expect(modal).toBeVisible();

    // Set up a network listener to verify /me is called after acceptance
    const meRequestPromise = page.waitForRequest(
      (request) => request.url().includes("/api/trpc/") && request.url().includes("me") && request.method() === "GET"
    );

    // Accept the policy
    const acceptButton = page.getByTestId("policy-accept-button");
    await acceptButton.click();

    // Wait for the /me query to be invalidated and refetched
    await meRequestPromise;

    // Wait for the modal to disappear
    await expect(modal).not.toBeVisible();

    // Clean up
    await prisma.userPolicyAcceptance.deleteMany({
      where: { userId: user.id },
    });
    await prisma.policyVersion.deleteMany({
      where: { createdById: user.id },
    });
  });
});
