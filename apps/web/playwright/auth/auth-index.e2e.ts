import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";
import { submitAndWaitForResponse } from "../lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Can signup from a team invite", async () => {
  test.beforeEach(async ({ users }) => {
    const proUser = await users.create();
    await proUser.apiLogin();
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Team invites validations work and can accept invite", async ({ browser, page, users, prisma }) => {
    const [proUser] = users.get();
    const teamName = `${proUser.username}'s Team`;
    const testUser = {
      username: `${proUser.username}-member`,
      // At least one number, lower and uppercase letters
      password: `${proUser.username}-MEMBER`,
      email: `${proUser.username}-member@example.com`,
    };
    await page.goto("/settings/teams/new");
    await page.waitForLoadState("networkidle");

    // Create a new team
    await page.locator('input[name="name"]').fill(teamName);
    await page.locator('input[name="slug"]').fill(teamName);
    await page.locator('button[type="submit"]').click();

    // Add new member to team
    await page.click('[data-testid="new-member-button"]');
    await page.fill('input[id="inviteUser"]', testUser.email);
    const submitPromise = page.waitForResponse("/api/trpc/teams/inviteMember?batch=1");
    await page.getByTestId("invite-new-member-button").click();
    const response = await submitPromise;
    expect(response.status()).toBe(200);

    // TODO: Adapt to new flow
    const tokenObj = await prisma.verificationToken.findFirstOrThrow({
      where: { identifier: testUser.email },
      select: { token: true },
    });

    if (!proUser.username) throw Error("Test username is null, can't continue");

    // Open a new user window to accept the invite
    const context = await browser.newContext();
    const newPage = await context.newPage();
    await newPage.goto(`/auth/signup?token=${tokenObj.token}&callbackUrl=/settings/teams`);
    // We wait on locales so we prevent password lost on re-render
    await newPage.locator('text="Create your account"').waitFor();

    // Fill in form
    await newPage.fill('input[name="username"]', proUser.username); // Invalid username
    await newPage.fill('input[name="password"]', testUser.password);
    await submitAndWaitForResponse(newPage, "/api/auth/signup", { expectedStatusCode: 409 });
    await expect(newPage.locator('text="Username or email is already taken"')).toBeVisible();

    // Successful signup
    // TODO: Form errors don't disappear when corrected and resubmitted, so we need to refresh
    await newPage.reload();
    await newPage.fill('input[name="username"]', testUser.username);
    await newPage.fill('input[name="password"]', testUser.password);
    await submitAndWaitForResponse(newPage, "/api/auth/signup", { expectedStatusCode: 201 });
    // Since it's a new user, it should be redirected to the onboarding
    await newPage.locator('text="Welcome to Cal.com!"').waitFor();
    await expect(newPage.locator('text="Welcome to Cal.com!"')).toBeVisible();
    // We don't need the new browser anymore
    await newPage.close();

    const createdUser = await prisma.user.findUniqueOrThrow({
      where: { email: testUser.email },
      include: {
        teams: { include: { team: true } },
        password: {
          select: { hash: true },
        },
      },
    });

    console.log("createdUser", createdUser);

    // Check that the user was created
    expect(createdUser).not.toBeNull();
    expect(createdUser.username).toBe(testUser.username);
    expect(createdUser.password?.hash).not.toBeNull();
    expect(createdUser.emailVerified).not.toBeNull();
    // Check that the user accepted the team invite
    expect(createdUser.teams).toHaveLength(1);
    expect(createdUser.teams[0].team.name).toBe(teamName);
    expect(createdUser.teams[0].role).toBe("MEMBER");
    expect(createdUser.teams[0].accepted).toBe(true);
  });
});
