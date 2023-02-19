import { test } from "../lib/fixtures";
import { todo } from "../lib/testUtils";

test.describe("Can signup from a team invite", async () => {
  test.beforeEach(async ({ users }) => {
    const proUser = await users.create();
    await proUser.login();
  });
  test.afterEach(async ({ users }) => users.deleteAll());

  test("Team invites validations work and can accept invite", async ({ browser, page, users, prisma }) => {
    const [proUser] = users.get();
    const teamName = `${proUser.username}'s Team`;
    const testUser = {
      username: `${proUser.username}-member`,
      password: `${proUser.username}-member`,
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
    await page.click('[data-testid="invite-new-member-button"]');

    // TODO: Adapt to new flow

    // Wait for the invite to be sent
    /*await page.waitForSelector(`[data-testid="member-email"][data-email="${testUser.email}"]`);

    const tokenObj = await prisma.verificationToken.findFirstOrThrow({
      where: { identifier: testUser.email },
      select: { token: true },
    });

    if (!proUser.username) throw Error("Test username is null, can't continue");

    // Open a new user window to accept the invite
    const newPage = await browser.newPage();
    await newPage.goto(`/auth/signup?token=${tokenObj.token}&callbackUrl=${WEBAPP_URL}/settings/teams`);

    // Fill in form
    await newPage.fill('input[name="username"]', proUser.username); // Invalid username
    await newPage.fill('input[name="email"]', testUser.email);
    await newPage.fill('input[name="password"]', testUser.password);
    await newPage.fill('input[name="passwordcheck"]', testUser.password);
    await newPage.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit

    await expect(newPage.locator('text="Username already taken"')).toBeVisible();

    // Email address is already registered
    // TODO: Form errors don't disappear when corrected and resubmitted, so we need to refresh
    await newPage.reload();
    await newPage.fill('input[name="username"]', testUser.username);
    await newPage.fill('input[name="email"]', `${proUser.username}@example.com`); // Taken email
    await newPage.fill('input[name="password"]', testUser.password);
    await newPage.fill('input[name="passwordcheck"]', testUser.password);
    await newPage.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit
    await expect(newPage.locator('text="Email address is already registered"')).toBeVisible();

    // Successful signup
    // TODO: Form errors don't disappear when corrected and resubmitted, so we need to refresh
    await newPage.reload();
    await newPage.fill('input[name="username"]', testUser.username);
    await newPage.fill('input[name="email"]', testUser.email);
    await newPage.fill('input[name="password"]', testUser.password);
    await newPage.fill('input[name="passwordcheck"]', testUser.password);
    await newPage.press('input[name="passwordcheck"]', "Enter"); // Press Enter to submit
    await expect(newPage.locator(`[data-testid="login-form"]`)).toBeVisible();

    // We don't need the new browser anymore
    await newPage.close();

    const createdUser = await prisma.user.findUniqueOrThrow({
      where: { email: testUser.email },
      include: { teams: { include: { team: true } } },
    });

    console.log("createdUser", createdUser);

    // Check that the user was created
    expect(createdUser).not.toBeNull();
    expect(createdUser.username).toBe(testUser.username);
    expect(createdUser.password).not.toBeNull();
    expect(createdUser.emailVerified).not.toBeNull();
    // Check that the user accepted the team invite
    expect(createdUser.teams).toHaveLength(1);
    expect(createdUser.teams[0].team.name).toBe(teamName);
    expect(createdUser.teams[0].role).toBe("MEMBER");
    expect(createdUser.teams[0].accepted).toBe(true);*/
  });
});

todo("Can login using 2FA");
