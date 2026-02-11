import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { hashSync } from "bcryptjs";
import { randomBytes } from "node:crypto";

import { APP_NAME, IS_PREMIUM_USERNAME_ENABLED, IS_MAILHOG_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { localize } from "./lib/localize";
import { getEmailsReceivedByUser, getInviteLink } from "./lib/testUtils";
import { expectInvitationEmailToBeReceived } from "./team/expects";

test.describe.configure({ mode: "parallel" });

const preventFlakyTest = async (page: Page) => {
  await expect(page.locator("text=Create your account")).toBeVisible();
};
test.describe("Signup Main Page Test", async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await preventFlakyTest(page);
  });

  test("Continue with Email button must exist / work", async ({ page }) => {
    const button = page.getByTestId("continue-with-email-button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByTestId("signup-back-button")).toBeVisible();
  });

  test("Continue with google button must exist / work", async ({ page }) => {
    const button = page.getByTestId("continue-with-google-button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await page.waitForURL("/auth/sso/google");
  });

  test("Continue with SAML button must exist / work", async ({ page }) => {
    const button = page.getByTestId("continue-with-saml-button");
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByTestId("signup-back-button")).toBeVisible();
  });
});

test.describe("Email Signup Flow Test", async () => {
  test.beforeEach(async ({ features }) => {
    features.reset(); // This resets to the initial state not an empt yarray
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("Username is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      await users.create({
        username: "pro",
      });

      await page.goto("/signup");
      await preventFlakyTest(page);
      const continueWithEmailButton = page.getByTestId("continue-with-email-button");
      await expect(continueWithEmailButton).toBeVisible();
      await continueWithEmailButton.click();

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("pro");
      await page.locator('input[name="email"]').fill("pro@example.com");
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form
      const submitButton = page.getByTestId("signup-submit-button");
      await submitButton.click();

      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });
  test("Email is taken", async ({ page, users }) => {
    // log in trail user
    await test.step("Sign up", async () => {
      const user = await users.create({
        username: "pro",
      });

      await page.goto("/signup");
      await preventFlakyTest(page);
      const continueWithEmailButton = page.getByTestId("continue-with-email-button");
      await expect(continueWithEmailButton).toBeVisible();
      await continueWithEmailButton.click();

      const alertMessage = "Username or email is already taken";

      // Fill form
      await page.locator('input[name="username"]').fill("randomuserwhodoesntexist");
      await page.locator('input[name="email"]').fill(user.email);
      await page.locator('input[name="password"]').fill("Password99!");

      // Submit form
      const submitButton = page.getByTestId("signup-submit-button");
      await submitButton.click();

      const alert = await page.waitForSelector('[data-testid="alert"]');
      const alertMessageInner = await alert.innerText();

      expect(alertMessage).toBeDefined();
      expect(alertMessageInner).toContain(alertMessageInner);
    });
  });

  test("Signup with org invite token for existing user redirects to login without overwriting password", async ({
    page,
    prisma,
  }) => {
    const originalPassword = "OriginalPass99!";
    const attackerPassword = "AttackerPass99!";
    const testEmail = `existing-user-${Date.now()}@example.com`;

    // Create existing user without emailVerified to bypass server-side check
    const hashedPassword = hashSync(originalPassword, 12);
    const existingUser = await prisma.user.create({
      data: {
        email: testEmail,
        username: `existing-user-${Date.now()}`,
        password: { create: { hash: hashedPassword } },
        emailVerified: null,
      },
    });

    // Create org invite token for the existing user's email
    const token = randomBytes(32).toString("hex");
    const org = await prisma.team.create({
      data: {
        name: "Test Org",
        slug: `test-org-${Date.now()}`,
        isOrganization: true,
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: existingUser.email,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: org.id,
      },
    });

    // Clear any existing session before attempting signup
    await page.context().clearCookies();

    // Try to signup with the invite token using a different password
    await page.goto(`/signup?token=${token}`);
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();

    await page.locator('input[name="password"]').fill(attackerPassword);

    // Intercept the signup API request to verify 409 response
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/signup") && response.request().method() === "POST"
    );

    const submitButton = page.getByTestId("signup-submit-button");
    await submitButton.click();

    // Verify API returns 409 (user already exists)
    const response = await responsePromise;
    expect(response.status()).toBe(409);

    const responseBody = await response.json();
    expect(responseBody.message).toBe("user_already_exists");

    // Should redirect to login (toast shows and redirects after 3s)
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 });

    // Verify original password still works by logging in
    await page.locator('input[name="email"]').fill(existingUser.email);
    await page.locator('input[name="password"]').fill(originalPassword);
    await page.locator('button[type="submit"]').click();

    // Should successfully login with original password
    await expect(page).toHaveURL(/\/(getting-started|event-types|teams)/, { timeout: 8000 });

    // Cleanup
    await prisma.verificationToken.deleteMany({ where: { token } });
    await prisma.user.delete({ where: { id: existingUser.id } });
    await prisma.team.delete({ where: { id: org.id } });
  });
  test("Signup with valid (non premium) username", async ({ page, users }) => {
    const userToCreate = users.buildForSignup({
      username: "rick-jones",
      password: "Password99!",
      // Email intentonally kept as different from username
      email: `rickjones${Math.random()}-${Date.now()}@example.com`,
    });

    await page.goto("/signup");
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();

    // Fill form
    await page.locator('input[name="username"]').fill(userToCreate.username);
    await page.locator('input[name="email"]').fill(userToCreate.email);
    await page.locator('input[name="password"]').fill(userToCreate.password);

    // Submit form
    const submitButton = page.getByTestId("signup-submit-button");
    await submitButton.click();

    await page.waitForURL("/auth/verify-email**");

    // Check that the URL matches the expected URL
    expect(page.url()).toContain("/auth/verify-email");
    const dbUser = await prisma.user.findUnique({ where: { email: userToCreate.email } });
    // Verify that the username is the same as the one provided and isn't accidentally changed to email derived username - That happens only for organization member signup
    expect(dbUser?.username).toBe(userToCreate.username);
  });

  test("Signup fields prefilled with query params", async ({ page, users: _users }) => {
    const signupUrlWithParams = "/signup?username=rick-jones&email=rick-jones%40example.com";
    await page.goto(signupUrlWithParams);
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();

    // Fill form
    const usernameInput = page.locator('input[name="username"]');
    const emailInput = page.locator('input[name="email"]');

    expect(await usernameInput.inputValue()).toBe("rick-jones");
    expect(await emailInput.inputValue()).toBe("rick-jones@example.com");
  });
  test("Signup with token prefils correct fields", async ({ page, users, prisma }) => {
    //Create a user and create a token
    const token = randomBytes(32).toString("hex");
    const userToCreate = users.buildForSignup({
      username: "rick-team",
    });

    const createdtoken = await prisma.verificationToken.create({
      data: {
        identifier: userToCreate.email,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +1 week
        team: {
          create: {
            name: "Rick's Team",
            slug: `${userToCreate.username}-team`,
          },
        },
      },
    });

    // create a user with the same email as the token
    const rickTeamUser = await prisma.user.create({
      data: {
        email: userToCreate.email,
        username: userToCreate.username,
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
    await preventFlakyTest(page);
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();

    const usernameField = page.locator('input[name="username"]');
    const emailField = page.locator('input[name="email"]');

    expect(await usernameField.inputValue()).toBe(userToCreate.username);
    expect(await emailField.inputValue()).toBe(userToCreate.email);

    // Cleanup specific to this test
    // Clean up the user and token
    await prisma.user.deleteMany({ where: { email: userToCreate.email } });
    await prisma.verificationToken.deleteMany({ where: { identifier: createdtoken.identifier } });
    await prisma.team.deleteMany({ where: { id: createdtoken.teamId! } });
  });
  test("Email verification sent if enabled", async ({ page, prisma, emails, users, features }) => {
    const EmailVerifyFlag = features.get("email-verification")?.enabled;

    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!EmailVerifyFlag || !IS_MAILHOG_ENABLED, "Skipping check - Email verify disabled");
    // Ensure email verification before testing (TODO: this could break other tests but we can fix that later)
    await prisma.feature.update({
      where: { slug: "email-verification" },
      data: { enabled: true },
    });
    const userToCreate = users.buildForSignup({
      email: users.trackEmail({ username: "email-verify", domain: "example.com" }),
      username: "email-verify",
      password: "Password99!",
    });

    await page.goto("/signup");
    await preventFlakyTest(page);
    const continueWithEmailButton = page.getByTestId("continue-with-email-button");
    await expect(continueWithEmailButton).toBeVisible();
    await continueWithEmailButton.click();

    // Fill form
    await page.locator('input[name="username"]').fill(userToCreate.username);
    await page.locator('input[name="email"]').fill(userToCreate.email);
    await page.locator('input[name="password"]').fill(userToCreate.password);

    // Submit form
    const submitButton = page.getByTestId("signup-submit-button");
    await submitButton.click();

    await page.waitForURL((url) => url.pathname.includes("/auth/verify-email"));
    // Find the newly created user and add it to the fixture store
    const newUser = await users.set(userToCreate.email);
    expect(newUser).not.toBeNull();

    const receivedEmails = await getEmailsReceivedByUser({
      emails,
      userEmail: userToCreate.email,
    });

    expect(receivedEmails?.total).toBe(1);

    const verifyEmail = receivedEmails?.items[0];
    expect(verifyEmail?.subject).toBe(`${APP_NAME}: Verify your account`);
  });
  test("If signup is disabled allow team invites", async ({ browser, page, users, emails }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(process.env.NEXT_PUBLIC_DISABLE_SIGNUP !== "true", "Skipping due to signup being enabled");

    const t = await localize("en");
    const teamOwner = await users.create(undefined, { hasTeam: true });
    const { team } = await teamOwner.getFirstTeamMembership();
    await teamOwner.apiLogin();
    await page.goto(`/settings/teams/${team.id}/settings`);

    await test.step("Invite User to team", async () => {
      // TODO: This invite logic should live in a fixture - its used in team and orgs invites (Duplicated from team/org invites)
      const invitedUserEmail = `rick_${Date.now()}@domain-${Date.now()}.com`;
      await page.locator(`button:text("${t("add")}")`).click();
      await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
      await page.locator(`button:text("${t("send_invite")}")`).click();

      const inviteLink = await expectInvitationEmailToBeReceived(
        page,
        emails,
        invitedUserEmail,
        `${team.name}'s admin invited you to join the team ${team.name} on Cal.com`,
        "signup?token"
      );

      //Check newly invited member exists and is pending
      await expect(
        page.locator(`[data-testid="email-${invitedUserEmail.replace("@", "")}-pending"]`)
      ).toHaveCount(1);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!inviteLink) return;

      // Follow invite link to new window
      const context = await browser.newContext();
      const newPage = await context.newPage();
      await newPage.goto(inviteLink);
      await expect(newPage.locator("text=Create your account")).toBeVisible();

      const url = new URL(newPage.url());
      expect(url.pathname).toBe("/signup");
      const continueWithEmailButton = page.getByTestId("continue-with-email-button");
      await expect(continueWithEmailButton).toBeVisible();
      await continueWithEmailButton.click();
      await expect(page.getByTestId("signup-submit-button")).toBeVisible();
      // Check required fields
      await newPage.locator("input[name=password]").fill(`P4ssw0rd!`);
      await newPage.locator("button[type=submit]").click();
      await newPage.waitForURL("/getting-started?from=signup");
      await newPage.close();
      await context.close();
    });
  });

  test("Checkbox for cookie consent does not need to be checked", async ({ page, users: _users }) => {
    await page.goto("/signup");
    await preventFlakyTest(page);

    // Navigate to email form
    await page.getByTestId("continue-with-email-button").click();

    // Fill form
    await page.locator('input[name="username"]').fill("pro");
    await page.locator('input[name="email"]').fill("pro@example.com");
    await page.locator('input[name="password"]').fill("Password99!");

    const submitButton = page.getByTestId("signup-submit-button");
    const checkbox = page.getByTestId("signup-cookie-content-checkbox");

    await checkbox.check();
    await expect(submitButton).toBeEnabled();

    // the cookie consent checkbox does not need to be checked for user to proceed
    await checkbox.uncheck();
    await expect(submitButton).toBeEnabled();
  });

  test("Signup with org invite link creates user and joins organization", async ({
    page,
    users,
    browser,
  }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true });
    const { team: org } = await orgOwner.getOrgMembership();
    await orgOwner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);

    await page.getByTestId("new-organization-member-button").click();
    const inviteLink = await getInviteLink(page);

    const email = users.trackEmail({ username: "rick", domain: "domain.com" });
    const usernameDerivedFromEmail = `${email.split("@")[0]}-domain`;

    await signupFromInviteLink({ browser, inviteLink, email });

    await expectUserToBeAMemberOfOrganization({
      page,
      orgSlug: org.slug,
      username: usernameDerivedFromEmail,
      role: "member",
      isMemberShipAccepted: true,
      email,
    });
  });

  test("Signup with sub-team invite link creates user and joins both team and org", async ({
    page,
    users,
    browser,
  }) => {
    const orgOwner = await users.create(undefined, { hasTeam: true, isOrg: true, hasSubteam: true });
    await orgOwner.apiLogin();
    const { team: subTeam } = await orgOwner.getFirstTeamMembership();
    const { team: org } = await orgOwner.getOrgMembership();

    await page.goto(`/settings/teams/${subTeam.id}/members`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await page.getByTestId("new-member-button").click();
    const inviteLink = await getInviteLink(page);

    const email = users.trackEmail({ username: "rick", domain: "domain.com" });
    const usernameDerivedFromEmail = `${email.split("@")[0]}-domain`;

    await signupFromInviteLink({ browser, inviteLink, email });

    await expectUserToBeAMemberOfTeam({
      page,
      teamId: subTeam.id,
      username: usernameDerivedFromEmail,
      email,
      role: "member",
      isMemberShipAccepted: true,
    });

    await expectUserToBeAMemberOfOrganization({
      page,
      orgSlug: org.slug,
      username: usernameDerivedFromEmail,
      role: "member",
      isMemberShipAccepted: true,
      email,
    });
  });

  test("Signup with email-based token still works (regression test)", async ({ page, prisma, users }) => {
    const token = randomBytes(32).toString("hex");
    const userToCreate = users.buildForSignup({
      username: "email-token-user",
    });

    const emailToken = await prisma.verificationToken.create({
      data: {
        identifier: userToCreate.email,
        token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        team: {
          create: {
            name: "Email Token Team",
            slug: `email-token-team-${Date.now()}`,
          },
        },
      },
    });

    await page.goto(`/signup?token=${token}`);
    await preventFlakyTest(page);
    await expect(page.getByTestId("signup-submit-button")).toBeVisible();

    const emailField = page.locator('input[name="email"]');
    const usernameField = page.locator('input[name="username"]');

    expect(await emailField.inputValue()).toBe(userToCreate.email);
    const expectedUsername = userToCreate.email.split("@")[0];
    expect(await usernameField.inputValue()).toBe(expectedUsername);

    await page.locator('input[name="password"]').fill("Password99!");
    await page.getByTestId("signup-submit-button").click();

    await expect(page).toHaveURL(/\/getting-started|\/auth\/verify-email/);

    const createdUser = await prisma.user.findUnique({
      where: { email: userToCreate.email },
      select: {
        id: true,
        teams: {
          select: {
            teamId: true,
            accepted: true,
          },
        },
      },
    });

    expect(createdUser).toBeTruthy();
    const membership = createdUser?.teams.find((m) => m.teamId === emailToken.teamId);
    expect(membership).toBeTruthy();
    expect(membership?.accepted).toBe(true);

    await prisma.user.delete({ where: { id: createdUser!.id } });
    await prisma.team.delete({ where: { id: emailToken.teamId! } });
  });
});

async function expectUserToBeAMemberOfOrganization({
  page,
  orgSlug,
  username,
  email,
  role,
  isMemberShipAccepted,
}: {
  page: Page;
  orgSlug: string | null;
  username: string;
  role: string;
  isMemberShipAccepted: boolean;
  email: string;
}) {
  await page.goto(`/settings/organizations/${orgSlug}/members`);
  await expect(page.locator(`[data-testid="member-${username}-username"]`)).toHaveText(username);
  await expect(page.locator(`[data-testid="member-${username}-email"]`)).toHaveText(email);
  expect((await page.locator(`[data-testid="member-${username}-role"]`).textContent())?.toLowerCase()).toBe(
    role.toLowerCase()
  );
  if (isMemberShipAccepted) {
    await expect(page.locator(`[data-testid2="member-${username}-pending"]`)).toBeHidden();
  } else {
    await expect(page.locator(`[data-testid2="member-${username}-pending"]`)).toBeVisible();
  }
}

async function expectUserToBeAMemberOfTeam({
  page,
  teamId,
  email,
  role: _role,
  username,
  isMemberShipAccepted,
}: {
  page: Page;
  username: string;
  role: string;
  teamId: number;
  isMemberShipAccepted: boolean;
  email: string;
}) {
  await page.goto(`/settings/teams/${teamId}/members`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
  expect(
    (
      await page
        .locator(
          `[data-testid="member-${username}"] [data-testid="${
            isMemberShipAccepted ? "member-email" : `email-${email.replace("@", "")}-pending`
          }"]`
        )
        .textContent()
    )?.toLowerCase()
  ).toBe(email.toLowerCase());
  if (isMemberShipAccepted) {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeHidden();
  } else {
    await expect(page.locator(`[data-testid="email-${email.replace("@", "")}-pending"]`)).toBeVisible();
  }
}

async function signupFromInviteLink({
  browser,
  inviteLink,
  email,
}: {
  browser: Browser;
  inviteLink: string;
  email: string;
}) {
  const context = await browser.newContext();
  const inviteLinkPage = await context.newPage();
  await inviteLinkPage.goto(inviteLink);
  await expect(inviteLinkPage.locator("text=Create your account")).toBeVisible();

  const button = inviteLinkPage.locator("button[type=submit][disabled]");
  await expect(button).toBeVisible();

  await inviteLinkPage.locator("input[name=email]").fill(email);
  await inviteLinkPage.locator("input[name=password]").fill(`P4ssw0rd!`);
  await inviteLinkPage.locator("button[type=submit]").click();
  await inviteLinkPage.waitForURL("/getting-started");
  await context.close();
}
