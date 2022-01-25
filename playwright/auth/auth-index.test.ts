import { expect, test } from "@playwright/test";

import { BASE_URL } from "@lib/config/constants";
import prisma from "@lib/prisma";

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

    // Create New Team
    await page.click('button[type="button"]');
    await page.fill('input[name="name"]', team);
    await page.click('button[type="submit"]');

    // Click the team link
    await page.click(`a[title="${team}"]`);

    // Send invite to team
    await page.click('[data-testid="new-member-button"]');
    await page.fill('input[id="inviteUser"]', email);
    await page.click('[data-testid="invite-new-member-button"]');

    const tokenObj = await prisma.verificationRequest.findFirst({
      where: { identifier: email },
      select: { token: true },
    });
    token = tokenObj?.token;
    signupFromInviteURL = `/auth/signup?token=${token}&callbackUrl=${BASE_URL}/settings/teams`;
  });

  test.afterAll(async () => {
    // Delete test user
    await prisma.user.delete({
      where: { email },
    });
    // Delete verification request
    await prisma.verificationRequest.delete({
      where: { token },
    });
    // Delete membership of pro user with the "test-team" team
    // First, let's find the userId of the pro user
    const proUserId = (
      await prisma.user.findUnique({
        where: { username: usernameAlreadyTaken },
        select: { id: true },
      })
    )?.id;
    if (!proUserId) return;
    // Then, let's find the teamId of the "test-team" team
    const teamId = (
      await prisma.team.findUnique({
        where: { slug: team },
        select: { id: true },
      })
    )?.id;
    if (!teamId) return;

    // Now, let's delete the membership
    await prisma.membership.delete({
      where: {
        userId_teamId: { userId: proUserId, teamId },
      },
    });
    // And finally, delete the team
    await prisma.team.delete({ where: { slug: team } });
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
