import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Team Flow", () => {
  const testTeamOnboarding = (identityProvider: IdentityProvider) => {
    test(`Team onboarding flow - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      await page.goto("/onboarding/getting-started");

      await test.step("Getting started - Select Team plan", async () => {
        await page.waitForURL("/onboarding/getting-started");

        // Wait for the page to load and select Team plan
        const teamPlan = page.getByTestId("onboarding-plan-team");
        await expect(teamPlan).toBeVisible();
        await teamPlan.click();

        // Click Continue button
        await page.getByTestId("onboarding-continue").click();

        // Should navigate to team details
        await expect(page).toHaveURL(/.*\/onboarding\/teams\/details/);
      });

      await test.step("Team Details - Set team name and slug", async () => {
        // Check that we're on the details page
        await expect(page.getByText("Create your team")).toBeVisible();

        // Fill in team name
        await page.getByTestId("team-details-name").fill("Test Team");

        // The slug should auto-generate from the name
        // Wait for slug validation to complete
        await page.waitForTimeout(500);

        // Click Continue
        await page.getByTestId("team-details-continue").click();

        // Should navigate to brand page
        await expect(page).toHaveURL(/.*\/onboarding\/teams\/brand/);
      });

      await test.step("Team Brand - Skip branding", async () => {
        // Check that we're on the brand page
        await expect(page.getByText("Customize team brand")).toBeVisible();

        // Click "I'll do this later" button to skip
        await page.getByTestId("team-brand-skip").click();

        // Should navigate to invite page
        await expect(page).toHaveURL(/.*\/onboarding\/teams\/invite/);
      });

      await test.step("Team Invite - Skip invites and create team", async () => {
        // Check that we're on the invite page
        await expect(page.getByText("Invite team members")).toBeVisible();

        // Click "I'll do this later" button to skip invites
        await page.getByTestId("team-invite-skip").click();

        // Should redirect back to getting-started after team creation
        await page.waitForURL("/onboarding/getting-started");

        // Verify we're back at getting-started
        await expect(page.getByText("Welcome")).toBeVisible();
      });
    });
  };

  testTeamOnboarding(IdentityProvider.GOOGLE);
  testTeamOnboarding(IdentityProvider.CAL);
  testTeamOnboarding(IdentityProvider.SAML);
});
