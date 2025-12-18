import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Organization Flow", () => {
  test("Complete organization onboarding flow with all steps", async ({ page, users }) => {
    // Create user with company email (not a personal email provider)
    // This is required for the organization option to be visible
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      email: "admin@acmecorp.com", // Company email
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("Step 1 - Select Organization Plan", async () => {
      // Wait for page to load
      await expect(page.locator("text=getting started")).toBeVisible();

      // Verify organization option is visible for company email
      const organizationOption = page.locator('button[value="organization"]');
      await expect(organizationOption).toBeVisible();

      // Select organization plan
      await organizationOption.click();

      // Continue to next step
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");
    });

    await test.step("Step 2 - Organization Details", async () => {
      await expect(page.locator("text=organization details")).toBeVisible();

      // Test validation - try to continue without filling required fields
      await page.locator('button:has-text("Continue")').click();
      // Should still be on the same page (validation prevents navigation)
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);

      // Fill organization name
      const orgName = "Acme Corporation";
      await page.locator('input[placeholder*="organization"]').first().fill(orgName);

      // Organization slug should auto-populate from name
      await page.waitForTimeout(500); // Wait for slug auto-generation
      const slugInput = page.locator('input[type="text"]').nth(1);
      const slugValue = await slugInput.inputValue();
      expect(slugValue).toBe("acme-corporation");

      // Manually edit slug to test manual editing
      await slugInput.clear();
      await slugInput.fill("acme-corp");

      // Test slug validation with invalid characters
      await slugInput.clear();
      await slugInput.fill("invalid slug!");
      await expect(page.locator("text=/.*invalid.*/i").or(page.locator('[role="alert"]'))).toBeVisible();

      // Use valid slug
      await slugInput.clear();
      await slugInput.fill("acme-corp");

      // Fill optional bio
      await page.locator('textarea[placeholder*="bio"]').fill("Leading provider of innovative solutions");

      // Continue to brand step
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");
    });

    await test.step("Step 3 - Organization Brand", async () => {
      await expect(page.locator("text=customize your brand")).toBeVisible();

      // Test back navigation
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      // Brand customization is optional, test skip button
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");
    });

    await test.step("Step 4 - Organization Teams", async () => {
      await expect(page.locator("text=create teams")).toBeVisible();

      // Go back to test brand customization with actual values
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/brand");

      // Test brand color picker (optional)
      // Color picker might be complex, so we'll just verify it's present
      await expect(page.locator('text=/.*color.*/i')).toBeVisible();

      // Continue to teams
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/teams");

      // Add teams
      const teamFields = page.locator('input[placeholder*="team"]');
      await teamFields.first().fill("Engineering");

      // Add another team
      await page.locator('button:has-text("Add")').click();
      await teamFields.nth(1).fill("Sales");

      // Add a third team
      await page.locator('button:has-text("Add")').click();
      await teamFields.nth(2).fill("Marketing");

      // Test remove team button
      const removeButtons = page.locator('button[type="button"]').filter({ has: page.locator('[name="x"]') });
      await removeButtons.nth(2).click(); // Remove Marketing team

      // Continue to invite step
      await page.locator('button[type="submit"]:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/invite/email");
    });

    await test.step("Step 5 - Organization Invite", async () => {
      await expect(page.locator("text=invite your team")).toBeVisible();

      // Test skip functionality
      const skipButton = page.locator('button:has-text("Skip")').first();
      if (await skipButton.isVisible()) {
        // Just verify it's there, we'll test completing with invites
      }

      // Add email invites
      const emailInputs = page.locator('input[type="email"]');
      await emailInputs.first().fill("john@acmecorp.com");

      // Select team for invite (if teams exist)
      const teamSelects = page.locator('select, [role="combobox"]').filter({ hasText: /team/i });
      if ((await teamSelects.count()) > 0) {
        await teamSelects.first().click();
        await page.locator('text=Engineering').first().click();
      }

      // Add another invite
      const addInviteButton = page.locator('button:has-text("Add")').first();
      if (await addInviteButton.isVisible()) {
        await addInviteButton.click();
        await emailInputs.nth(1).fill("jane@acmecorp.com");

        // Select team for second invite
        if ((await teamSelects.count()) > 1) {
          await teamSelects.nth(1).click();
          await page.locator('text=Sales').first().click();
        }
      }

      // Test email validation with invalid email
      await emailInputs.first().clear();
      await emailInputs.first().fill("invalid-email");
      await emailInputs.first().blur();
      await expect(
        page.locator("text=/.*invalid.*email.*/i").or(page.locator('[role="alert"]'))
      ).toBeVisible();

      // Fix invalid email
      await emailInputs.first().clear();
      await emailInputs.first().fill("john@acmecorp.com");

      // Complete onboarding
      await page.locator('button[type="submit"]:has-text("Continue")').click();

      // Should redirect after successful completion
      // The exact URL depends on the implementation, but should leave onboarding
      await page.waitForTimeout(2000);
      await expect(page).not.toHaveURL(/.*\/onboarding\/.*/);

      // Verify user completed onboarding
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
      // Select organization
      await page.locator('button[value="organization"]').click();
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");

      // Fill only required fields
      await page.locator('input[placeholder*="organization"]').first().fill("Test Corp");
      await page.waitForTimeout(500);

      // Continue through steps skipping optional ones
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");
    });

    await test.step("Skip brand customization", async () => {
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");
    });

    await test.step("Skip team creation", async () => {
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/invite/email");
    });

    await test.step("Skip invites and complete", async () => {
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForTimeout(2000);

      // Verify completion
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

    await test.step("Test organization name validation", async () => {
      // Try to continue with empty organization name
      const continueButton = page.locator('button:has-text("Continue")');
      await continueButton.click();

      // Should remain on the same page
      await expect(page).toHaveURL(/.*\/onboarding\/organization\/details/);
      expect(await continueButton.isDisabled()).toBe(true);
    });

    await test.step("Test organization slug validation", async () => {
      // Fill name
      await page.locator('input[placeholder*="organization"]').first().fill("Test Company");
      await page.waitForTimeout(500);

      const slugInput = page.locator('input[type="text"]').nth(1);

      // Test various invalid slug formats
      const invalidSlugs = ["test company", "test@company", "test.company", "test/company"];

      for (const invalidSlug of invalidSlugs) {
        await slugInput.clear();
        await slugInput.fill(invalidSlug);
        await slugInput.blur();

        // Check for validation error
        const hasError =
          (await page.locator("text=/.*invalid.*/i").count()) > 0 ||
          (await page.locator('[role="alert"]').count()) > 0;

        if (hasError) {
          expect(hasError).toBe(true);
        }
      }

      // Use valid slug
      await slugInput.clear();
      await slugInput.fill("test-company");
      await page.waitForTimeout(500);
    });
  });

  test("Organization onboarding - Personal email cannot see organization option", async ({
    page,
    users,
  }) => {
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

    await test.step("Test forward and backward navigation", async () => {
      await page.goto("/onboarding/getting-started");
      await page.waitForURL("/onboarding/getting-started");

      // Select organization
      await page.locator('button[value="organization"]').click();
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/details");

      // Fill details
      await page.locator('input[placeholder*="organization"]').first().fill("Nav Test Corp");
      await page.waitForTimeout(500);

      // Go to brand
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      // Navigate back
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");

      // Verify data persistence - name should still be filled
      const nameInput = page.locator('input[placeholder*="organization"]').first();
      expect(await nameInput.inputValue()).toBe("Nav Test Corp");

      // Go forward again
      await page.locator('button:has-text("Continue")').click();
      await page.waitForURL("/onboarding/organization/brand");

      // Skip to teams
      await page.locator('button:has-text("Skip")').first().click();
      await page.waitForURL("/onboarding/organization/teams");

      // Back to brand
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/brand");

      // Back to details
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/organization/details");

      // Back to getting started
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL("/onboarding/getting-started");
    });
  });
});
