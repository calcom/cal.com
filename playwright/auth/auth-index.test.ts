import { expect, test } from "@playwright/test";

import { BASE_URL } from "../../lib/config/constants";
import prisma from "../../lib/prisma";
import { todo } from "../lib/testUtils";

test.describe("Can signup from a team invite", async () => {
  let page;
  let token: string | undefined;
  let signupFromInviteURL = "";
  const team = "test-team";
  const email = "test@test.com";
  const password = "secretpassword123";
  const validUsername = "test-user";
  const usernameAlreadyTaken = "pro";
  const emailAlreadyTaken = "pro@example.com";

  test.use({ storageState: "playwright/artifacts/proStorageState.json" });
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await page.goto("/settings/teams");

    // If team does not exist, create it
    try {
      await page.waitForSelector(`a[title="${team}"]`, { timeout: 3000 });
    } catch (error) {
      // Create New Team
      await page.click('button[type="button"]');
      await page.fill('input[name="name"]', team);
      await page.click('button[type="submit"]');
    }

    // Click the team link
    await page.click(`a[title="${team}"]`);

    try {
      await page.waitForSelector(`[data-testid="member-email"][data-email="${email}"]`, { timeout: 3000 });
    } catch (error) {
      // Send invite to team
      await page.click('[data-testid="new-member-button"]');
      await page.fill('input[id="inviteUser"]', email);
      await page.click('[data-testid="invite-new-member-button"]');
    }

    const tokenObj = await prisma.verificationRequest.findFirst({
      where: { identifier: email },
      select: { token: true },
    });
    token = tokenObj?.token;
    signupFromInviteURL = `/auth/signup?token=${token}&callbackUrl=${BASE_URL}/settings/teams`;
  });

  test.afterAll(async () => {
    // Delete user with email
    await prisma.user.delete({
      where: { email },
    });
    // Delete verification request with token
    await prisma.verificationRequest.delete({
      where: { token },
    });
  });

  test("Username already taken", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', usernameAlreadyTaken);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="passwordcheck"]', password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await expect(page.locator('text="Username already taken"')).toBeVisible();
  });

  test("Email address is already registered", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', validUsername);
    await page.fill('input[name="email"]', emailAlreadyTaken);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="passwordcheck"]', password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await expect(page.locator('text="Email address is already registered"')).toBeVisible();
  });

  test("Successful signup", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', validUsername);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="passwordcheck"]', password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await page.waitForNavigation();

    const createdUser = await prisma.user.findUnique({
      where: { email },
    });
    expect(createdUser).not.toBeNull();
    expect(createdUser?.username).toBe(validUsername);
    expect(createdUser?.password).not.toBeNull();
    expect(createdUser?.emailVerified).not.toBeNull();
  });
});

todo("Can login using 2FA");
