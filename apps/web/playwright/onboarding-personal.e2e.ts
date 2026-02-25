import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Personal Onboarding: Plan Selection", () => {
  test("defaults to personal plan and navigates to personal/settings on continue", async ({
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

    await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);
  });
});

test.describe("Personal Onboarding: Settings", () => {
  test("requires name field to submit form", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Valid Name");
    await expect(submitButton).toBeEnabled();
  });

  test("back button navigates to getting-started", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/getting-started/);
  });

  test("saves name and bio to database on continue", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("E2E Test User");

    const bioInput = page.locator('textarea[name="bio"]');
    await bioInput.fill("My test bio");

    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, bio: true, completedOnboarding: true },
    });
    expect(updatedUser?.name).toBe("E2E Test User");
    expect(updatedUser?.bio).toBe("My test bio");
    expect(updatedUser?.completedOnboarding).toBe(true);
  });

  test("completedOnboarding is set to true after personal settings step", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await test.step("Plan selection", async () => {
      await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL(/.*\/onboarding\/personal\/settings/);
    });

    await test.step("Personal settings saves completedOnboarding early", async () => {
      const nameInput = page.locator('input[name="name"]');
      await nameInput.fill("Test User E2E");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

      const userAfterSettings = await prisma.user.findUnique({
        where: { id: user.id },
        select: { completedOnboarding: true },
      });
      expect(userAfterSettings?.completedOnboarding).toBe(true);
    });
  });

  test("after completing personal settings, navigating away does not redirect to onboarding", async ({
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

    await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Test User Session");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    await page.goto("/event-types");
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/onboarding");
  });
});

test.describe("Personal Onboarding: Calendar", () => {
  test("skip button completes onboarding and redirects to event-types", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Skip Calendar User");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    const skipButton = page.locator('button:has-text("Skip")');
    await skipButton.click();
    await page.waitForURL(/.*\/event-types/);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { completedOnboarding: true },
    });
    expect(updatedUser?.completedOnboarding).toBe(true);
  });

  test("back button navigates to personal/settings", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Back Nav User");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);
  });

  test("displays calendar integration apps", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Calendar Apps User");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
  });


});

test.describe("Personal Onboarding: Redirect Logic", () => {
  test("user with completedOnboarding=false is redirected to onboarding from /event-types", async ({
    page,
    users,
  }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    await page.goto("/event-types");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url).toContain("/onboarding");
  });

  test("user with completedOnboarding=true is NOT redirected from /event-types", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: true,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();

    await page.goto("/event-types");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url).not.toContain("/onboarding");
  });
});

test.describe("Personal Onboarding: Full Flow", () => {
  test("complete flow: plan selection -> settings -> calendar skip -> event-types", async ({
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

    await test.step("Step 1: Plan selection - select personal and continue", async () => {
      await expect(page.getByTestId("onboarding-continue-btn")).toBeVisible();
      await page.getByTestId("onboarding-continue-btn").click();
      await page.waitForURL(/.*\/onboarding\/personal\/settings/);
    });

    await test.step("Step 2: Personal settings - fill name and continue", async () => {
      const nameInput = page.locator('input[name="name"]');
      await nameInput.fill("Full Flow User");
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/.*\/onboarding\/personal\/calendar/);
    });

    await test.step("Step 3: Calendar - skip and complete onboarding", async () => {
      const skipButton = page.locator('button:has-text("Skip")');
      await skipButton.click();
      await page.waitForURL(/.*\/event-types/);
    });

    await test.step("Verify: User data is saved correctly", async () => {
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, completedOnboarding: true },
      });
      expect(updatedUser?.name).toBe("Full Flow User");
      expect(updatedUser?.completedOnboarding).toBe(true);
    });

    await test.step("Verify: Default event types are created", async () => {
      const eventTypes = await prisma.eventType.findMany({
        where: { userId: user.id },
        select: { title: true, slug: true, length: true },
      });
      expect(eventTypes.length).toBeGreaterThan(0);
    });
  });
});

test.describe("Personal Onboarding: Identity Providers", () => {
  test("Google user completes onboarding flow", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.GOOGLE,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Google User E2E");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/event-types/);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { completedOnboarding: true },
    });
    expect(updatedUser?.completedOnboarding).toBe(true);
  });

  test("SAML user completes onboarding flow", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.SAML,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("SAML User E2E");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*\/onboarding\/personal\/calendar/);

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/event-types/);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { completedOnboarding: true },
    });
    expect(updatedUser?.completedOnboarding).toBe(true);
  });
});
