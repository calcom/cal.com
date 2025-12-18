import { expect } from "@playwright/test";

import { IdentityProvider } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Onboarding V3 - Personal Flow", () => {
  const testPersonalOnboarding = (identityProvider: IdentityProvider) => {
    test(`Personal Onboarding Flow - ${identityProvider} user`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      
      await test.step("Navigate to getting-started and select personal plan", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");
        
        // Wait for page to load and select personal plan
        await expect(page.locator('text="Personal"')).toBeVisible();
        
        // Click on personal plan radio option
        await page.locator('input[value="personal"]').click();
        
        // Click continue button
        await page.locator('button:has-text("Continue")').click();
        
        // Should navigate to personal settings
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("Step 1 - Personal Settings - Validation", async () => {
        // Test required field validation
        await page.locator('button[type="submit"]').click();
        
        // Should show validation error for name field
        await expect(page.locator('form').locator('text=/name.*required/i')).toBeVisible();
      });

      await test.step("Step 1 - Personal Settings - Happy Path", async () => {
        // Fill in name
        await page.locator('input[name="name"]').fill("John Doe");
        
        // Username field should be visible (disabled for personal onboarding)
        await expect(page.locator('input[name="username"]')).toBeVisible();
        
        // Fill in bio
        await page.locator('textarea[name="bio"]').fill("Software engineer and scheduling enthusiast");
        
        // Test avatar upload functionality (optional - we can skip actual upload)
        await expect(page.locator('text="Profile picture"')).toBeVisible();
        
        // Click continue button
        await page.locator('button[type="submit"]').click();
        
        // Should navigate to calendar page
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
        
        // Verify user data was saved
        const userComplete = await user.self();
        expect(userComplete.name).toBe("John Doe");
      });

      await test.step("Step 2 - Calendar Integration - Test Skip", async () => {
        // Wait for calendar integrations to load
        await expect(page.locator('text="Connect your calendar"')).toBeVisible();
        
        // Verify back button exists
        await expect(page.locator('button:has-text("Back")')).toBeVisible();
        
        // Verify skip button exists and is enabled
        const skipButton = page.locator('button:has-text("Skip")').first();
        await expect(skipButton).toBeVisible();
        await expect(skipButton).toBeEnabled();
        
        // Click skip button
        await skipButton.click();
        
        // Should complete onboarding and redirect to event-types
        await page.waitForURL(/.*\/event-types/);
        
        // Verify user has completedOnboarding = true
        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Test Back Navigation`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      
      await test.step("Navigate to settings step", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");
        
        await page.locator('input[value="personal"]').click();
        await page.locator('button:has-text("Continue")').click();
        
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
      });

      await test.step("Test back navigation from settings to getting-started", async () => {
        // Click back button
        await page.locator('button:has-text("Back")').click();
        
        // Should navigate back to getting-started
        await expect(page).toHaveURL(/.*\/onboarding\/getting-started/);
        
        // Personal plan should still be selected
        await expect(page.locator('input[value="personal"]')).toBeChecked();
      });

      await test.step("Navigate forward and test back from calendar step", async () => {
        // Continue to settings
        await page.locator('button:has-text("Continue")').click();
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
        
        // Fill in required fields
        await page.locator('input[name="name"]').fill("Jane Smith");
        await page.locator('button[type="submit"]').click();
        
        // Should be on calendar page
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
        
        // Click back button
        await page.locator('button:has-text("Back")').click();
        
        // Should navigate back to settings
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
        
        // Previously entered data should be preserved
        await expect(page.locator('input[name="name"]')).toHaveValue("Jane Smith");
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Test Calendar Continue`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      
      await test.step("Navigate through to calendar step", async () => {
        await page.goto("/onboarding/getting-started");
        await page.waitForURL("/onboarding/getting-started");
        
        await page.locator('input[value="personal"]').click();
        await page.locator('button:has-text("Continue")').click();
        
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
        
        await page.locator('input[name="name"]').fill("Test User");
        await page.locator('button[type="submit"]').click();
        
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Test continue button without calendar integration", async () => {
        await expect(page.locator('text="Connect your calendar"')).toBeVisible();
        
        // Click continue button (not skip)
        const continueButton = page.locator('button:has-text("Continue")').last();
        await expect(continueButton).toBeVisible();
        await expect(continueButton).toBeEnabled();
        
        await continueButton.click();
        
        // Should complete onboarding and redirect to event-types
        await page.waitForURL(/.*\/event-types/);
        
        // Verify user has completedOnboarding = true
        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });

    test(`Personal Onboarding Flow - ${identityProvider} user - Direct URL Access`, async ({ page, users }) => {
      const user = await users.create({
        completedOnboarding: false,
        name: null,
        identityProvider,
      });
      await user.apiLogin();
      
      await test.step("Direct access to settings page", async () => {
        // Navigate directly to settings page
        await page.goto("/onboarding/personal/settings");
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/settings/);
        
        // Form should be visible and functional
        await expect(page.locator('input[name="name"]')).toBeVisible();
        
        // Fill form and continue
        await page.locator('input[name="name"]').fill("Direct Access User");
        await page.locator('button[type="submit"]').click();
        
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
      });

      await test.step("Direct access to calendar page", async () => {
        // Navigate directly to calendar page
        await page.goto("/onboarding/personal/calendar");
        await expect(page).toHaveURL(/.*\/onboarding\/personal\/calendar/);
        
        // Calendar integrations should load
        await expect(page.locator('text="Connect your calendar"')).toBeVisible();
        
        // Should be able to complete onboarding
        const skipButton = page.locator('button:has-text("Skip")').first();
        await skipButton.click();
        
        await page.waitForURL(/.*\/event-types/);
        
        const userComplete = await user.self();
        expect(userComplete.completedOnboarding).toBe(true);
      });
    });
  };

  // Test with different identity providers
  testPersonalOnboarding(IdentityProvider.CAL);
  testPersonalOnboarding(IdentityProvider.GOOGLE);
  testPersonalOnboarding(IdentityProvider.SAML);
});
