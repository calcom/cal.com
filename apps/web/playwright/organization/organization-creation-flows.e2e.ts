import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { uuid } from "short-uuid";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";

import { test } from "../lib/fixtures";

/**
 * Utility function to complete the organization onboarding wizard steps
 * (about, add-teams, onboard-members)
 */
async function completeOnboardingWizard(
  page: Page,
  options: {
    aboutText?: string;
    teams?: string[];
    members?: string[];
  } = {}
) {
  const { aboutText = "Test organization description", teams = ["Engineering"], members = [] } = options;

  // Step 1: Complete "About" step
  await page.waitForURL("**/settings/organizations/new/about");
  await page.locator('textarea[name="about"]').fill(aboutText);
  await page.locator("button[type=submit]").click();

  // Step 2: Complete "Add Teams" step
  await page.waitForURL("**/settings/organizations/new/add-teams");
  for (let i = 0; i < teams.length; i++) {
    await page.getByTestId(`team.${i}.name`).fill(teams[i]);
    if (i < teams.length - 1) {
      await page.getByTestId("add_a_team").click();
    }
  }
  await page.locator("button[type=submit]").click();

  // Step 3: Complete "Onboard Members" step
  await page.waitForURL("**/settings/organizations/new/onboard-members");

  // Add members if provided
  for (const memberEmail of members) {
    await page.locator('[placeholder="colleague\\@company\\.com"]').fill(memberEmail);
    await page.getByTestId("invite-new-member-button").click();
    await expect(page.getByTestId("pending-member-list")).toContainText(memberEmail);
  }

  // Click publish and wait for response
  const responsePromise = page.waitForResponse("**/api/trpc/organizations/intentToCreateOrg**");
  await page.getByTestId("publish-button").click();

  const response = await responsePromise;
  const responseData = await response.json();

  // TRPC batch response is an array with one element
  const result = responseData[0].result.data.json;

  return result;
}

test.describe("Organization Creation Flows - Comprehensive Suite", () => {
  test.afterEach(({ users, orgs }) => {
    users.deleteAll();
    orgs.deleteAll();
  });

  test.describe("Admin Handover Flow (Billing Disabled)", () => {
    test("Admin creates org for existing user - handover and complete", async ({ page, users }) => {
      // Setup: Create admin and future owner
      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      const ownerEmail = users.trackEmail({
        username: "orgowner",
        domain: "example.com",
      });
      const ownerUser = await users.create({
        username: "orgowner",
        email: ownerEmail,
      });

      const orgName = "Test Organization";
      const orgSlug = `test-org-${uuid()}`.toLowerCase();

      // Step 1: Admin fills form
      await page.goto("/settings/organizations/new");

      await page.locator("input[name=orgOwnerEmail]").fill(ownerEmail);
      await page.locator("input[name=name]").fill(orgName);
      await page.locator("input[name=slug]").fill(orgSlug);

      // If billing enabled, admin sees billing fields but we're testing billing disabled scenario
      if (IS_TEAM_BILLING_ENABLED) {
        await page.locator("input[name=seats]").fill("10");
        await page.locator("input[name=pricePerSeat]").fill("15");
      }

      // Submit and wait for intentToCreateOrg
      await Promise.all([
        page.waitForResponse("**/api/trpc/organizations/intentToCreateOrg**"),
        page.locator("button[type=submit]").click(),
      ]);

      // Step 2: Verify admin is on handover page
      await page.waitForURL("**/settings/organizations/new/handover");

      const onboardingUrlElement = page.getByTestId("onboarding-url");
      await expect(onboardingUrlElement).toBeVisible();

      const onboardingUrl = await onboardingUrlElement.textContent();
      expect(onboardingUrl).toContain("/settings/organizations/new/resume?onboardingId=");

      // Extract onboardingId from URL
      const onboardingIdMatch = onboardingUrl?.match(/onboardingId=([\w-]+)/);
      expect(onboardingIdMatch).toBeTruthy();
      const onboardingId = onboardingIdMatch?.[1];

      // Step 3: Switch to owner user
      await page.context().clearCookies();
      await ownerUser.apiLogin();

      // Step 4: Owner opens resume URL and completes the onboarding wizard
      await page.goto(`/settings/organizations/new/resume?onboardingId=${onboardingId}`);

      const memberEmail = users.trackEmail({ username: "member1", domain: "example.com" });
      const result = await completeOnboardingWizard(page, {
        aboutText: "This is our test organization",
        teams: ["Engineering", "Marketing"],
        members: [memberEmail],
      });

      // Verify the organization was created successfully in the API response
      expect(result.organizationId).toBeTruthy();
      expect(result.name).toBe(orgName);
      expect(result.slug).toBe(orgSlug);
    });

    test("Admin creates org for self - immediate creation", async ({ page, users }) => {
      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      const orgName = "Admin Org";
      const orgSlug = `admin-org-${uuid()}`.toLowerCase();

      await page.goto("/settings/organizations/new");

      // Fill form with admin's own email
      await page.locator("input[name=orgOwnerEmail]").fill(admin.email);
      await page.locator("input[name=name]").fill(orgName);
      await page.locator("input[name=slug]").fill(orgSlug);

      if (IS_TEAM_BILLING_ENABLED) {
        await page.locator("input[name=seats]").fill("5");
        await page.locator("input[name=pricePerSeat]").fill("20");
      }

      // Submit - admin creating for self goes through wizard
      await page.locator("button[type=submit]").click();

      // Admin creating for self goes through the onboarding wizard
      const result = await completeOnboardingWizard(page, {
        aboutText: "Admin's organization",
        teams: ["Operations"],
        members: [],
      });

      // Verify the organization was created successfully
      expect(result.organizationId).toBeTruthy();
      expect(result.name).toBe(orgName);
      expect(result.slug).toBe(orgSlug);
    });

    test("Admin handover URL structure is correct", async ({ page, users }) => {
      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      const ownerEmail = users.trackEmail({
        username: "testowner",
        domain: "example.com",
      });
      await users.create({
        username: "testowner",
        email: ownerEmail,
      });

      const orgName = "Handover Test";
      const orgSlug = `handover-${uuid()}`.toLowerCase();

      await page.goto("/settings/organizations/new");

      await page.locator("input[name=orgOwnerEmail]").fill(ownerEmail);
      await page.locator("input[name=name]").fill(orgName);
      await page.locator("input[name=slug]").fill(orgSlug);

      if (IS_TEAM_BILLING_ENABLED) {
        await page.locator("input[name=seats]").fill("10");
        await page.locator("input[name=pricePerSeat]").fill("15");
      }

      const responsePromise = page.waitForResponse("**/api/trpc/organizations/intentToCreateOrg**");
      await page.locator("button[type=submit]").click();

      // Wait for the response
      await responsePromise;

      // Wait for redirect to handover page
      await page.waitForURL("**/settings/organizations/new/handover");

      // Wait for handover page elements to be visible (with longer timeout for store to populate)
      await expect(page.getByTestId("onboarding-url")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("copy-onboarding-url")).toBeVisible();

      const onboardingUrl = await page.getByTestId("onboarding-url").textContent();

      // Verify URL format
      expect(onboardingUrl).toMatch(/\/settings\/organizations\/new\/resume\?onboardingId=[\w-]+/);

      // Verify copy button is clickable (toast message may vary by locale)
      await page.getByTestId("copy-onboarding-url").click();
    });
  });

  test.describe("Non-Admin User Flow", () => {
    test("Regular user creates org through full wizard", async ({ page, users }) => {
      test.skip(process.env.NEXT_PUBLIC_ORG_SELF_SERVE_ENABLED !== "1", "Org self serve is not enabled");

      const user = await users.create({
        username: "regularuser",
        email: users.trackEmail({ username: "regularuser", domain: "example.com" }),
      });
      await user.apiLogin();

      const orgName = "User Organization";
      const orgSlug = `user-org-${uuid()}`.toLowerCase();

      await page.goto("/settings/organizations/new");

      // Verify user email is pre-filled and disabled
      const emailInput = page.locator("input[name=orgOwnerEmail]");
      await expect(emailInput).toBeDisabled();
      await expect(emailInput).toHaveValue(user.email);

      // Verify billing fields are NOT visible to regular users
      if (IS_TEAM_BILLING_ENABLED) {
        await expect(page.locator("input[name=seats]")).not.toBeVisible();
        await expect(page.locator("input[name=pricePerSeat]")).not.toBeVisible();

        // Verify "Upgrade to Organizations" UI is shown
        await expect(page.getByText(/upgrade to organizations/i)).toBeVisible();
      }

      // Fill form
      await page.locator("input[name=name]").fill(orgName);
      await page.locator("input[name=slug]").fill(orgSlug);

      await page.locator("button[type=submit]").click();

      // Verify navigated to /about step
      await page.waitForURL("**/settings/organizations/new/about");

      // Complete about step
      await page.locator('textarea[name="about"]').fill("User's organization description");
      await page.locator("button[type=submit]").click();

      // Complete add-teams step
      await page.waitForURL("**/settings/organizations/new/add-teams");
      await page.getByTestId("team.0.name").fill("Team Alpha");
      await page.locator("button[type=submit]").click();

      // Complete onboard-members step
      await page.waitForURL("**/settings/organizations/new/onboard-members");
      await Promise.all([
        page.waitForResponse("**/api/trpc/organizations/intentToCreateOrg**"),
        page.getByTestId("publish-button").click(),
      ]);

      // In billing enabled mode, should redirect to Stripe or payment
      // In billing disabled mode, org created immediately
      if (IS_TEAM_BILLING_ENABLED) {
        // Would redirect to Stripe checkout
        await page.waitForURL(/checkout\.stripe\.com|\/settings\/organizations/);
      } else {
        // After org creation, session update causes redirect to profile page
        // Wait for it to load, then navigate to organizations
        await page.waitForURL("**/settings/my-account/profile");
        await page.goto("/settings/organizations");
        await page.waitForURL(/\/settings\/organizations/);
      }
    });

    test("Regular user - email field is disabled", async ({ page, users }) => {
      test.skip(process.env.NEXT_PUBLIC_ORG_SELF_SERVE_ENABLED !== "1", "Org self serve is not enabled");

      const user = await users.create({
        username: "testuser",
        email: users.trackEmail({ username: "testuser", domain: "company.com" }),
      });
      await user.apiLogin();

      await page.goto("/settings/organizations/new");

      // Verify email field state
      const emailInput = page.locator("input[name=orgOwnerEmail]");
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toBeDisabled();
      await expect(emailInput).toHaveValue(user.email);

      // Verify name and slug are derived from email domain
      const nameInput = page.locator("input[name=name]");
      const slugInput = page.locator("input[name=slug]");

      // Name should be capitalized version of domain
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toBeTruthy();
      expect(nameValue).toMatch(/company/i);

      // Slug should be domain-based
      const slugValue = await slugInput.inputValue();
      expect(slugValue).toBeTruthy();
      expect(slugValue).toContain("company");
    });
  });

  test.describe("Form Validation", () => {
    test("Admin form - required fields validation", async ({ page, users }) => {
      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      await page.goto("/settings/organizations/new");

      // Submit empty form
      await page.locator("button[type=submit]").click();

      // Should show validation errors
      await expect(page.getByTestId("field-error")).toHaveCount(2); // name and slug required
    });

    test("Slug already taken shows error", async ({ page, users, orgs }) => {
      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      // Create an existing org with a specific slug
      const existingSlug = `existing-${uuid()}`.toLowerCase();
      await orgs.create({
        name: "Existing Org",
        slug: existingSlug,
      });

      await page.goto("/settings/organizations/new");

      const ownerEmail = users.trackEmail({ username: "owner", domain: "example.com" });
      await users.create({ username: "owner", email: ownerEmail });

      await page.locator("input[name=orgOwnerEmail]").fill(ownerEmail);
      await page.locator("input[name=name]").fill("New Org");
      await page.locator("input[name=slug]").fill(existingSlug);

      if (IS_TEAM_BILLING_ENABLED) {
        await page.locator("input[name=seats]").fill("5");
        await page.locator("input[name=pricePerSeat]").fill("10");
      }

      await page.locator("button[type=submit]").click();

      // Should show slug taken error
      await expect(page.getByText(/url.*taken|already.*exists/i)).toBeVisible();
    });
  });

  test.describe("Navigation Between Steps", () => {
    test("User can navigate through wizard steps", async ({ page, users }) => {
      test.skip(process.env.NEXT_PUBLIC_ORG_SELF_SERVE_ENABLED !== "1", "Org self serve is not enabled");

      const user = await users.create({
        username: "wizarduser",
        email: users.trackEmail({ username: "wizarduser", domain: "example.com" }),
      });
      await user.apiLogin();

      await page.goto("/settings/organizations/new");

      const orgName = "Wizard Test";
      const orgSlug = `wizard-${uuid()}`.toLowerCase();

      // Step 1
      await page.locator("input[name=name]").fill(orgName);
      await page.locator("input[name=slug]").fill(orgSlug);
      await page.locator("button[type=submit]").click();

      // Step 2: About
      await page.waitForURL("**/settings/organizations/new/about");
      await page.locator('textarea[name="about"]').fill("Wizard test org");
      await page.locator("button[type=submit]").click();

      // Step 3: Add teams
      await page.waitForURL("**/settings/organizations/new/add-teams");
      await page.getByTestId("team.0.name").fill("Team 1");
      await page.locator("button[type=submit]").click();

      // Step 4: Onboard members
      await page.waitForURL("**/settings/organizations/new/onboard-members");

      // Verify wizard shows correct step numbers
      // The WizardLayout component shows currentStep/maxSteps
      // Just verify we reached the last step
      await expect(page.getByTestId("publish-button")).toBeVisible();
    });
  });

  test.describe("Billing Field Visibility", () => {
    test("Admin sees billing fields when billing enabled", async ({ page, users }) => {
      test.skip(!IS_TEAM_BILLING_ENABLED, "Billing is not enabled");

      const admin = await users.create({ role: "ADMIN" });
      await admin.apiLogin();

      await page.goto("/settings/organizations/new");

      // Verify billing fields are visible for admin
      await expect(page.locator("input[name=seats]")).toBeVisible();
      await expect(page.locator("input[name=pricePerSeat]")).toBeVisible();
      await expect(page.locator("#billingPeriod")).toBeVisible();

      // Verify toggle between monthly/annual
      await expect(page.getByText("Monthly")).toBeVisible();
      await expect(page.getByText("Annually")).toBeVisible();
    });

    test("Non-admin sees pricing UI but not billing fields", async ({ page, users }) => {
      test.skip(!IS_TEAM_BILLING_ENABLED, "Billing is not enabled");
      test.skip(process.env.NEXT_PUBLIC_ORG_SELF_SERVE_ENABLED !== "1", "Org self serve is not enabled");

      const user = await users.create({
        username: "pricinguser",
        email: users.trackEmail({ username: "pricinguser", domain: "example.com" }),
      });
      await user.apiLogin();

      await page.goto("/settings/organizations/new");

      // Should NOT see admin billing fields
      await expect(page.locator("input[name=seats]")).not.toBeVisible();
      await expect(page.locator("input[name=pricePerSeat]")).not.toBeVisible();
      await expect(page.locator("#billingPeriod")).not.toBeVisible();

      // Should see upgrade/pricing UI
      await expect(page.getByText(/upgrade to organizations/i)).toBeVisible();
      await expect(page.getByText(/organization/i)).toBeVisible();
    });
  });
});
