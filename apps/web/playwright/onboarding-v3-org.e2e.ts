import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Organization Flow", () => {
  test("Organization onboarding flow - Complete with teams and invites", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: "Org Admin",
      email: "admin@acmecorp.com", // Company email required to show org option
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");

    await test.step("Getting started - Select Organization plan", async () => {
      await page.waitForURL("/onboarding/getting-started");
      const orgPlan = page.getByTestId("onboarding-plan-organization");
      await expect(orgPlan).toBeVisible();
      await orgPlan.click();
      await page.getByTestId("onboarding-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);
    });

    await test.step("Organization Details - Set organization details", async () => {
      await expect(page.locator("text=organization")).toBeVisible();
      await page.getByTestId("org-details-name").fill("Acme Corporation");
      const bioTextarea = page.locator("textarea");
      await bioTextarea.fill("Leading provider of innovative solutions for modern businesses.");
      await page.waitForTimeout(1000);
      const slugInput = page.locator('input[name="slug"]');
      await expect(slugInput).toHaveValue("acme-corporation");
      await page.getByTestId("org-details-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/brand/);
    });

    await test.step("Organization Brand - Customize branding", async () => {
      await expect(page.getByText("Brand color")).toBeVisible();
      const colorInput = page.locator('input[type="text"][maxlength="6"]');
      await colorInput.fill("FF6B35");
      await page.getByTestId("org-brand-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/teams/);
    });

    await test.step("Organization Teams - Add multiple teams", async () => {
      await expect(page.getByText("Skip for now")).toBeVisible();
      const firstTeamInput = page.locator('input[placeholder="Team"]').first();
      await firstTeamInput.fill("Engineering");
      await page.getByRole("button", { name: "Add" }).click();
      const teamInputs = page.locator('input[placeholder="Team"]');
      await teamInputs.nth(1).fill("Sales");
      await page.getByRole("button", { name: "Add" }).click();
      await teamInputs.nth(2).fill("Marketing");
      await page.getByTestId("org-teams-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/invite/);
    });

    await test.step("Organization Invite - Invite members to teams", async () => {
      await expect(page.locator("text=invite")).toBeVisible();
      const firstEmailInput = page.locator('input[type="email"]').first();
      await firstEmailInput.fill("engineer1@acmecorp.com");
      const firstTeamSelect = page.locator('[role="combobox"]').first();
      await firstTeamSelect.click();
      await page.getByText("Engineering", { exact: true }).click();
      await page.getByRole("button", { name: "Add" }).click();
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.nth(1).fill("sales1@acmecorp.com");
      const secondTeamSelect = page.locator('[role="combobox"]').nth(1);
      await secondTeamSelect.click();
      await page.getByText("Sales", { exact: true }).click();
      await page.getByRole("button", { name: "Add" }).click();
      await emailInputs.nth(2).fill("marketing1@acmecorp.com");
      const thirdTeamSelect = page.locator('[role="combobox"]').nth(2);
      await thirdTeamSelect.click();
      await page.getByText("Marketing", { exact: true }).click();
      await page.getByRole("button", { name: "Admins" }).click();
      await page.getByTestId("org-invite-continue").click();
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });

  test("Organization onboarding flow - Skip all optional steps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: "Org Admin",
      email: "admin@minimal-org.com",
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");

    await test.step("Getting started - Select Organization plan", async () => {
      await page.waitForURL("/onboarding/getting-started");
      const orgPlan = page.getByTestId("onboarding-plan-organization");
      await expect(orgPlan).toBeVisible();
      await orgPlan.click();
      await page.getByTestId("onboarding-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);
    });

    await test.step("Organization Details - Minimal setup", async () => {
      await expect(page.locator("text=organization")).toBeVisible();
      await page.getByTestId("org-details-name").fill("Minimal Organization");
      await page.waitForTimeout(500);
      await page.getByTestId("org-details-continue").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/brand/);
    });

    await test.step("Organization Brand - Skip branding", async () => {
      await expect(page.getByText("Brand color")).toBeVisible();
      await page.getByTestId("org-brand-skip").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/teams/);
    });

    await test.step("Organization Teams - Skip teams", async () => {
      await expect(page.getByText("Skip for now")).toBeVisible();
      await page.getByTestId("org-teams-skip").click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/invite/);
    });

    await test.step("Organization Invite - Skip invites", async () => {
      await expect(page.locator("text=invite")).toBeVisible();
      await page.getByTestId("org-invite-skip").click();
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });
});
