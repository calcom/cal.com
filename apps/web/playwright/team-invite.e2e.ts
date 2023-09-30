import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Team invites", () => {
  test("Can invite a non-existing email address", async ({ page, users }) => {
    // Creating the owner user of the team
    const adminUser = await users.create();
    // Creating the member user of the team
    const memberUser = await users.create();
    // First we work with owner user, logging in
    await adminUser.apiLogin();

    // Let's create a team
    await page.goto("/settings/teams/new");

    await test.step("Creating the team and inviting from wizard", async () => {
      // Filling team creation form wizard
      await page.locator('input[name="name"]').waitFor();
      await page.locator('input[name="name"]').fill(`${adminUser.username}'s Team`);
      await page.locator("text=Continue").click();
      await page.waitForURL(/\/settings\/teams\/(\d+)\/onboard-members$/i);
      await page.getByTestId("new-member-button").click();
      await page.locator('[placeholder="email\\@example\\.com"]').fill(`${memberUser.username}@example.com`);
      await page.getByTestId("invite-new-member-button").click();
      // wait for the second member to be added to the pending-member-list.
      await page.getByTestId("pending-member-list").locator("li:nth-child(2)").waitFor();
      // and publish
      await page.locator("text=Publish team").click();
      await page.waitForURL("/settings/teams/**");
    });

    // TODO
    /*await test.step("Trying to invite same email from settings", async () => {

    });*/
  });
});
