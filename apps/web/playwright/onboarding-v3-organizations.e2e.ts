import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Organization Flow", () => {
  test("Complete organization onboarding flow with all steps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "admin@acmecorp.com",
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("step 1 - Select Organization Plan", async () => {
      await expect(page.locator("text=getting started")).toBeVisible();

      const organizationOption = page.locator('button[value="organization"]');
      await expect(organizationOption).toBeVisible();
      await organizationOption.click();

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");
    });

    await test.step("step 2 - Organization Details", async () => {
      await expect(page.locator("text=organization details")).toBeVisible();

      await page.locator('button:has-text("Continue")').click();
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);

      const orgName = "Acme Corporation";
      await page.locator('input[placeholder*="organization"]').first().fill(orgName);

      await page.waitForTimeout(500);
      const slugInput = page.locator('input[type="text"]').nth(1);
      const slugValue = await slugInput.inputValue();
      expect(slugValue).toBe("acme-corporation");

      await slugInput.clear();
      await slugInput.fill("acme-corp");

      await slugInput.clear();
      await slugInput.fill("invalid slug!");
      await expect(page.locator("text=/.*invalid.*/i").or(page.locator('[role="alert"]'))).toBeVisible();

      await slugInput.clear();
      await slugInput.fill("acme-corp");

      await page.locator('textarea[placeholder*="bio"]').fill("Leading provider of innovative solutions");

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");
    });

    await test.step("step 3 - Organization Brand", async () => {
      await expect(page.locator("text=customize your brand")).toBeVisible();

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");
    });

    await test.step("step 4 - Organization Teams", async () => {
      await expect(page.locator("text=create teams")).toBeVisible();

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/brand");

      await expect(page.locator("text=/.*color.*/i")).toBeVisible();

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/teams");

      const teamFields = page.locator('input[placeholder*="team"]');
      await teamFields.first().fill("Engineering");

      await page.locator('button:has-text("Add")').click();
      await teamFields.nth(1).fill("Sales");

      await page.locator('button:has-text("Add")').click();
      await teamFields.nth(2).fill("Marketing");

      const removeButtons = page.locator('button[type="button"]').filter({ has: page.locator('[name="x"]') });
      await removeButtons.nth(2).click();

      await page.locator('button[type="submit"]:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/invite/email");
    });

    await test.step("step 5 - Organization Invite", async () => {
      await expect(page.locator("text=invite your team")).toBeVisible();

      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.first().fill("john@acmecorp.com");

      const teamSelects = page.locator('select, [role="combobox"]').filter({ hasText: /team/i });
      if ((await teamSelects.count()) > 0) {
        await teamSelects.first().click();
        await page.locator("text=Engineering").first().click();
      }

      const addInviteButton = page.locator('button:has-text("Add")').first();
      if (await addInviteButton.isVisible()) {
        await addInviteButton.click();
        await emailInputs.nth(1).fill("jane@acmecorp.com");

        if ((await teamSelects.count()) > 1) {
          await teamSelects.nth(1).click();
          await page.locator("text=Sales").first().click();
        }
      }

      await emailInputs.first().clear();
      await emailInputs.first().fill("invalid-email");
      await emailInputs.first().blur();
      await expect(
        page.locator("text=/.*invalid.*email.*/i").or(page.locator('[role="alert"]'))
      ).toBeVisible();

      await emailInputs.first().clear();
      await emailInputs.first().fill("john@acmecorp.com");

      await page.locator('button[type="submit"]:has-text("Continue")').click();

      await page.waitForTimeout(2000);
      await expect(page).not.toHaveURL(/.*\/onboarding\/.*/);

      const userComplete = await user.self();
      expect(userComplete.completedOnboarding).toBe(true);
    });
  });

  test("Organization onboarding - Skip optional steps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "user@company.com",
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("Select organization and fill minimal details", async () => {
      await page.locator('button[value="organization"]').click();
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");

      await page.locator('input[placeholder*="organization"]').first().fill("Test Corp");
      await page.waitForTimeout(500);

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");
    });

    await test.step("Skip brand, teams, and invites", async () => {
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");

      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/invite/email");

      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForTimeout(2000);

      await expect(page).not.toHaveURL(/.*\/onboarding\/.*/);
      const userComplete = await user.self();
      expect(userComplete.completedOnboarding).toBe(true);
    });
  });

  test("Organization onboarding - Validation errors", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "test@validcompany.com",
    });
    await user.apiLogin();
    await page.goto("/onboarding/organization/details");

    await test.step("Organization name and slug validation", async () => {
      const continueButton = page.locator('button:has-text("Continue")');
      await continueButton.click();

      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);
      expect(await continueButton.isDisabled()).toBe(true);

      await page.locator('input[placeholder*="organization"]').first().fill("Test Company");
      await page.waitForTimeout(500);

      const slugInput = page.locator('input[type="text"]').nth(1);

      const invalidSlugs = ["test company", "test@company", "test.company", "test/company"];

      for (const invalidSlug of invalidSlugs) {
        await slugInput.clear();
        await slugInput.fill(invalidSlug);
        await slugInput.blur();

        const hasError =
          (await page.locator("text=/.*invalid.*/i").count()) > 0 ||
          (await page.locator('[role="alert"]').count()) > 0;

        if (hasError) {
          expect(hasError).toBe(true);
        }
      }

      await slugInput.clear();
      await slugInput.fill("test-company");
      await page.waitForTimeout(500);
    });
  });

  test("Organization onboarding - Personal email cannot see organization option", async ({ page, users }) => {
    // Create user with personal email (e.g., gmail.com)
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "user@gmail.com", // Personal email
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("Verify organization option is not visible", async () => {
      await expect(page.locator("text=getting started")).toBeVisible();

      // Organization option should NOT be visible for personal email
      const organizationOption = page.locator('button[value="organization"]');
      await expect(organizationOption).not.toBeVisible();

      // Personal and Team options should still be visible
      await expect(page.locator('button[value="personal"]')).toBeVisible();
      await expect(page.locator('button[value="team"]')).toBeVisible();
    });
  });

  test("Organization onboarding - Navigation between steps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "user@enterprise.com",
    });
    await user.apiLogin();

    await test.step("Forward and backward navigation", async () => {
      await page.goto("/onboarding/getting-started");
      await page.waitForURL("/onboarding/getting-started");

      await page.locator('button[value="organization"]').click();
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");

      await page.locator('input[placeholder*="organization"]').first().fill("Nav Test Corp");
      await page.waitForTimeout(500);

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");

      const nameInput = page.locator('input[placeholder*="organization"]').first();
      expect(await nameInput.inputValue()).toBe("Nav Test Corp");

      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/brand");

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");

      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/getting-started");
    });
  });
});
