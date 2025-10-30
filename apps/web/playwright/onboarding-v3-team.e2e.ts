import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Team Flow", () => {
  test("Team onboarding flow - Complete with invites", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: "Team Owner",
      email: "team-owner@example.com",
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");

    await test.step("Getting started - Select Team plan", async () => {
      await page.waitForURL("/onboarding/getting-started");
      const teamPlan = page.getByTestId("onboarding-plan-team");
      await expect(teamPlan).toBeVisible();
      await teamPlan.click();
      await page.getByTestId("onboarding-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/details/);
    });

    await test.step("Team Details - Set team name and slug", async () => {
      await expect(page.getByText("Create your team")).toBeVisible();
      await page.getByTestId("team-details-name").fill("Engineering Team");
      await page.waitForTimeout(1000);
      const slugInput = page.locator('input[name="slug"]');
      await expect(slugInput).toHaveValue("engineering-team");
      await page.getByTestId("team-details-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/brand/);
    });

    await test.step("Team Brand - Customize branding", async () => {
      await expect(page.getByText("Customize team brand")).toBeVisible();
      const colorInput = page.locator('input[type="text"][maxlength="6"]');
      await colorInput.fill("4F46E5");
      await page.getByTestId("team-brand-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/invite/);
    });

    await test.step("Team Invite - Add team members", async () => {
      await expect(page.getByText("Invite team members")).toBeVisible();
      const firstEmailInput = page.locator('input[type="email"]').first();
      await firstEmailInput.fill("member1@example.com");
      await page.getByRole("button", { name: "Add" }).click();
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.nth(1).fill("member2@example.com");
      await page.getByRole("button", { name: "Admins" }).click();
      await page.getByTestId("team-invite-continue").click();
      await page.waitForURL("/onboarding/getting-started");
      await expect(page.getByText("Welcome")).toBeVisible();
    });
  });

  test("Team onboarding flow - Skip all optional steps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: "Team Owner",
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");

    await test.step("Getting started - Select Team plan", async () => {
      await page.waitForURL("/onboarding/getting-started");
      const teamPlan = page.getByTestId("onboarding-plan-team");
      await expect(teamPlan).toBeVisible();
      await teamPlan.click();
      await page.getByTestId("onboarding-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/details/);
    });

    await test.step("Team Details - Set team name", async () => {
      await expect(page.getByText("Create your team")).toBeVisible();
      await page.getByTestId("team-details-name").fill("Minimal Team");
      await page.waitForTimeout(500);
      await page.getByTestId("team-details-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/brand/);
    });

    await test.step("Team Brand - Skip branding", async () => {
      await expect(page.getByText("Customize team brand")).toBeVisible();
      await page.getByTestId("team-brand-skip").click();
      await expect(page).toHaveURL(/.*\/onboarding\/teams\/invite/);
    });

    await test.step("Team Invite - Skip invites", async () => {
      await expect(page.getByText("Invite team members")).toBeVisible();
      await page.getByTestId("team-invite-skip").click();
      await page.waitForURL("/onboarding/getting-started");
      await expect(page.getByText("Welcome")).toBeVisible();
    });
  });
});
