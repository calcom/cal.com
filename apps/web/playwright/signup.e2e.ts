import { expect } from "@playwright/test";
import { randomBytes } from "crypto";

import { IS_CALCOM } from "@calcom/lib/constants";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Signup Flow Test", async () => {
  test.afterAll(async ({ users }) => {
    await users.deleteAll();
    /**
     * Delete specicially created users for this test
     * as they are not deleted by the above fixture
     * (As they are not created by the fixture)
     */
    await users.deleteByEmail("rick@example.com");
    await users.deleteByEmail("rick-jones@example.com");
    // Clean up the user and token
    await prisma.user.deleteMany({
      where: {
        email: "rick-team@example.com",
      },
    });
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: "rick-team@example.com",
      },
    });

    await prisma.team.deleteMany({
      where: {
        name: "Rick's Team",
      },
    });
  });
  test("Username is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      await users.create({
        username: "pro",
      });

      await page.goto("/signup");

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("pro");
      await page.locator('input[name="email"]').fill("pro@example.com");
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form
      await page.click('button[type="submit"]');

      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });
  test("Email is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      await users.create({
        username: "pro",
      });

      await page.goto("/signup");

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("randomuserwhodoesntexist");
      await page.locator('input[name="email"]').fill("pro@example.com");
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form

      await page.click('button[type="submit"]');
      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });
  test("Premium Username Flow - creates stripe checkout", async ({ page, users }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_CALCOM, "Only run on Cal.com");

    // Signup with premium username name
    await page.goto("/signup");

    // Fill form
    await page.locator('input[name="username"]').fill("rick");
    await page.locator('input[name="email"]').fill("rick@example.com");
    await page.locator('input[name="password"]').fill("Password99!");

    await page.click('button[type="submit"]');

    // Check that stripe checkout is present
    const expectedUrl = "https://checkout.stripe.com"; // Adjust the expected URL

    await page.waitForURL((url) => url.pathname.includes(expectedUrl));
    const url = page.url();

    // Check that the URL matches the expected URL
    expect(url).toContain(expectedUrl);
    // TODO: complete the stripe checkout flow
  });
  test("Premium Username Flow - SelfHosted", async ({ page, users }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(IS_CALCOM, "Only run on Selfhosted Instances");

    // Signup with premium username name
    await page.goto("/signup");

    // Fill form
    await page.locator('input[name="username"]').fill("rick");
    await page.locator('input[name="email"]').fill("rick@example.com");
    await page.locator('input[name="password"]').fill("Password99!");

    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes("/auth/verify-email"));

    expect(page.url()).toContain("/auth/verify-email");
  });

  test("Signup with valid (non premium) username", async ({ page, users }) => {
    await page.goto("/signup");

    // Fill form
    await page.locator('input[name="username"]').fill("rick-jones");
    await page.locator('input[name="email"]').fill("rick-jones@example.com");
    await page.locator('input[name="password"]').fill("Password99!");

    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes("/auth/verify-email"));

    // Check that the URL matches the expected URL
    expect(page.url()).toContain("/auth/verify-email");
  });
  test("Signup with token prefils correct fields", async ({ page, users, prisma }) => {
    //Create a user and create a token
    const token = randomBytes(32).toString("hex");

    // @shivram we can probably create a fixture for this logic.
    const createdtoken = await prisma.verificationToken.create({
      data: {
        identifier: "rick-team@example.com",
        token,
        expires: new Date(new Date().setHours(168)), // +1 week
        team: {
          create: {
            name: "Rick's Team",
            slug: "ricks-team",
          },
        },
      },
    });

    // create a user with the same email as the token
    const rickTeamUser = await prisma.user.create({
      data: {
        email: "rick-team@example.com",
        username: "rick-team",
      },
    });

    // Create provitional membership
    await prisma.membership.create({
      data: {
        teamId: createdtoken.teamId ?? -1,
        userId: rickTeamUser.id,
        role: "ADMIN",
        accepted: false,
      },
    });

    const signupUrlWithToken = `/signup?token=${token}`;

    await page.goto(signupUrlWithToken);

    const usernameField = page.locator('input[name="username"]');
    const emailField = page.locator('input[name="email"]');

    expect(await usernameField.inputValue()).toBe("rick-team");
    expect(await emailField.inputValue()).toBe("rick-team@example.com");
  });
});
