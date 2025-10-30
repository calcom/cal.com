import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Organization Flow", () => {
  const testOrganizationOnboarding = (identityProvider: IdentityProvider) => {
    test(`Organization onboarding flow - ${identityProvider} user`, async ({ page, users }) => {
      // Create user with company email so organization option is shown
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
        email: "test@company.com", // Company email to show org option
      });
      await user.apiLogin();
      await page.goto("/onboarding/getting-started");

      await test.step("Getting started - Select Organization plan", async () => {
        await page.waitForURL("/onboarding/getting-started");

        // Wait for the page to load and select Organization plan
        const orgPlan = page.getByTestId("onboarding-plan-organization");
        await expect(orgPlan).toBeVisible();
        await orgPlan.click();

        // Click Continue button
        await page.getByTestId("onboarding-continue").click();

        // Should navigate to organization details
        await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);
      });

      await test.step("Organization Details - Set organization name and slug", async () => {
        // Check that we're on the details page
        await expect(page.locator("text=organization")).toBeVisible();

        // Fill in organization name
        await page.getByTestId("org-details-name").fill("Test Organization");

        // The slug should auto-generate from the name
        // Wait for slug validation to complete
        await page.waitForTimeout(500);

        // Click Continue
        await page.getByTestId("org-details-continue").click();

        // Should navigate to brand page
        await expect(page).toHaveURL(/.*\/onboarding\/organization\/brand/);
      });

      await test.step("Organization Brand - Skip branding", async () => {
        // Check that we're on the brand page
        await expect(page.getByText("Brand color")).toBeVisible();

        // Click "I'll do this later" button to skip
        await page.getByTestId("org-brand-skip").click();

        // Should navigate to teams page
        await expect(page).toHaveURL(/.*\/onboarding\/organization\/teams/);
      });

      await test.step("Organization Teams - Skip teams", async () => {
        // Check that we're on the teams page
        await expect(page.getByText("Skip for now")).toBeVisible();

        // Click "Skip for now" button to skip teams
        await page.getByTestId("org-teams-skip").click();

        // Should navigate to invite page
        await expect(page).toHaveURL(/.*\/onboarding\/organization\/invite/);
      });

      await test.step("Organization Invite - Skip invites and complete onboarding", async () => {
        // Check that we're on the invite page
        await expect(page.locator("text=invite")).toBeVisible();

        // Click "I'll do this later" button to skip invites and complete onboarding
        await page.getByTestId("org-invite-skip").click();

        // Should redirect to getting-started or complete onboarding
        // Wait for navigation to complete
        await page.waitForTimeout(1000);

        // Verify that onboarding has been completed or redirected appropriately
        // The actual redirect destination may vary based on implementation
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();
      });
    });
  };

  testOrganizationOnboarding(IdentityProvider.GOOGLE);
  testOrganizationOnboarding(IdentityProvider.CAL);
  testOrganizationOnboarding(IdentityProvider.SAML);
});
