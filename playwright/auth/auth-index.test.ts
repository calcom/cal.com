import { expect, test } from "@playwright/test";

import { BASE_URL } from "@lib/config/constants";
import prisma from "@lib/prisma";

import { todo } from "../lib/testUtils";

test.describe("Can signup from a team invite", async () => {
  let page;
  let token: string | undefined;
  let signupFromInviteURL = "";
  const team = { name: "Seeded Team", slug: "seeded-team" };
  const testUser = {
    email: "test@test.com",
    password: "secretpassword123",
    validUsername: "test-user",
  };
  const usernameAlreadyTaken = "teampro";
  const emailAlreadyTaken = "teampro@example.com";

  test.use({ storageState: "playwright/artifacts/teamproStorageState.json" });
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await page.goto("/settings/teams");

    await page.waitForSelector(`a[title="${team.name}"]`);
    await page.click(`a[title="${team.name}"]`);

    // Send invite to team
    await page.click('[data-testid="new-member-button"]');
    await page.fill('input[id="inviteUser"]', testUser.email);
    await page.click('[data-testid="invite-new-member-button"]');

    // Wait for the invite to be sent
    await page.waitForSelector(`[data-testid="member-email"][data-email="${testUser.email}"]`);

    const tokenObj = await prisma.verificationRequest.findFirst({
      where: { identifier: testUser.email },
      select: { token: true },
    });
    token = tokenObj?.token;
    signupFromInviteURL = `/auth/signup?token=${token}&callbackUrl=${BASE_URL}/settings/teams`;
  });

  test.afterAll(async () => {
    // Delete test user
    await prisma.user.delete({
      where: { email: testUser.email },
    });
    // Delete verification request
    await prisma.verificationRequest.delete({
      where: { token },
    });
  });

  test("Username already taken", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', usernameAlreadyTaken);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="passwordcheck"]', testUser.password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await expect(page.locator('text="Username already taken"')).toBeVisible();
  });

  test("Email address is already registered", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', testUser.validUsername);
    await page.fill('input[name="email"]', emailAlreadyTaken);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="passwordcheck"]', testUser.password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await expect(page.locator('text="Email address is already registered"')).toBeVisible();
  });

  test("Successful signup", async ({ page }) => {
    expect(token).toBeDefined();
    await page.goto(signupFromInviteURL);
    // Fill in form
    await page.fill('input[name="username"]', testUser.validUsername);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="passwordcheck"]', testUser.password);
    await page.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await page.waitForNavigation();

    const createdUser = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });
    // Check that the user was created
    expect(createdUser).not.toBeNull();
    expect(createdUser?.username).toBe(testUser.validUsername);
    expect(createdUser?.password).not.toBeNull();
    expect(createdUser?.emailVerified).not.toBeNull();
    // Check that the user accepted the team invite
    expect(createdUser?.teams).toHaveLength(1);
    expect(createdUser?.teams[0].team.name).toBe(team.name);
    expect(createdUser?.teams[0].team.slug).toBe(team.slug);
    expect(createdUser?.teams[0].role).toBe("MEMBER");
    expect(createdUser?.teams[0].accepted).toBe(true);
  });
});

todo("Can login using 2FA");
