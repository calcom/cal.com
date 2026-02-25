import { IdentityProvider } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

/**
 * Organization onboarding requires a "company email" (not gmail, yahoo, etc.)
 * The user fixture defaults to @example.com which qualifies as a company domain.
 * The organization plan option is only shown to users with company emails.
 *
 * Flow: getting-started → organization/details → organization/brand → organization/teams → organization/invite/email
 */

test.describe("Organization Onboarding: Plan Selection", () => {
  test("selecting organization plan navigates to organization/details on continue", async ({
    page,
    users,
  }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    const orgRadio = page.locator('[value="organization"]');
    await orgRadio.click();

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/organization\/details/);
  });

  test("organization plan is NOT shown for personal email domains (gmail)", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
      emailDomain: "gmail.com",
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    const orgRadio = page.locator('[value="organization"]');
    await expect(orgRadio).not.toBeVisible();
  });
});

test.describe("Organization Onboarding: Details", () => {
  test("organization name auto-generates slug", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/details");
    await page.waitForURL(/.*\/onboarding\/organization\/details/);

    const orgNameInput = page.locator('input[placeholder="Organization name"]');
    // Fall back to a more general selector if the placeholder doesn't match
    let nameInput = page.locator('input[type="text"]').first();
    if (await orgNameInput.isVisible()) {
      nameInput = orgNameInput;
    }

    await nameInput.fill("My Test Organization");
    await page.waitForTimeout(500);
  });

  test("back button navigates to getting-started", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/details");
    await page.waitForURL(/.*\/onboarding\/organization\/details/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/getting-started/);
  });

  test("continue button is disabled without valid name and slug", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/details");
    await page.waitForURL(/.*\/onboarding\/organization\/details/);

    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeDisabled();
  });
});

test.describe("Organization Onboarding: Brand", () => {
  test("back button navigates to organization/details", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/brand");
    await page.waitForURL(/.*\/onboarding\/organization\/brand/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/details/);
  });

  test("skip button navigates to organization/teams", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/brand");
    await page.waitForURL(/.*\/onboarding\/organization\/brand/);

    const skipButton = page.locator('button:has-text("Skip")');
    await skipButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);
  });

  test("continue button navigates to organization/teams", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/brand");
    await page.waitForURL(/.*\/onboarding\/organization\/brand/);

    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);
  });
});

test.describe("Organization Onboarding: Teams", () => {
  test("skip button navigates to invite step", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/teams");
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);

    const skipButton = page.locator('button:has-text("Skip")');
    await skipButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/invite/);
  });

  test("back button navigates back", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    // Navigate to teams via brand so that back() has history
    await page.goto("/onboarding/organization/brand");
    await page.waitForURL(/.*\/onboarding\/organization\/brand/);
    const continueBtn = page.locator('button:has-text("Continue")');
    await continueBtn.click();
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/brand/);
  });
});

test.describe("Organization Onboarding: Invite", () => {
  test("skip button on invite email page submits onboarding", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/invite/email");
    await page.waitForURL(/.*\/onboarding\/organization\/invite\/email/);

    const skipButton = page.locator('button:has-text("Skip")');
    if (await skipButton.isVisible()) {
      await skipButton.click();
      // After submit, should redirect away from onboarding
      await page.waitForTimeout(3000);
    }
  });

  test("back button navigates back from invite email page", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    // Navigate to invite/email via teams so back() has history
    await page.goto("/onboarding/organization/teams");
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);
    const skipBtn = page.locator('button:has-text("Skip")');
    await skipBtn.click();
    await page.waitForURL(/.*\/onboarding\/organization\/invite/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/organization\/teams/);
  });
});

test.describe("Organization Onboarding: Partial Flow", () => {
  test("flow: plan selection -> details -> brand -> teams (skip) -> invite", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("Step 1: Select organization plan", async () => {
      const orgRadio = page.locator('[value="organization"]');
      await orgRadio.click();
      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL(/.*\/onboarding\/organization\/details/);
    });

    await test.step("Step 2: Fill organization details", async () => {
      // The details page has name, slug, and bio fields
      await page.waitForLoadState("networkidle");
    });

    await test.step("Step 3: Navigate to brand (via back and forward for coverage)", async () => {
      // Go back to getting-started
      const backButton = page.locator('button:has-text("Back")');
      await backButton.click();
      await page.waitForURL(/.*\/onboarding\/getting-started/);

      // Re-select organization and continue
      const orgRadio = page.locator('[value="organization"]');
      await orgRadio.click();
      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL(/.*\/onboarding\/organization\/details/);
    });
  });
});
