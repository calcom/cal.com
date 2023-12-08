import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

const createTeamsAndMembership = async (userIdOne: number, userIdTwo: number) => {
  const teamOne = await prisma.team.create({
    data: {
      name: "test-insights",
      slug: `test-insights-${Date.now()}-${randomString(5)}}`,
    },
  });

  const teamTwo = await prisma.team.create({
    data: {
      name: "test-insights-2",
      slug: `test-insights-2-${Date.now()}-${randomString(5)}}`,
    },
  });
  if (!userIdOne || !userIdTwo || !teamOne || !teamTwo) {
    throw new Error("Failed to create test data");
  }

  // create memberships
  await prisma.membership.create({
    data: {
      userId: userIdOne,
      teamId: teamOne.id,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdOne,
      accepted: true,
      role: "ADMIN",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamOne.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  await prisma.membership.create({
    data: {
      teamId: teamTwo.id,
      userId: userIdTwo,
      accepted: true,
      role: "MEMBER",
    },
  });
  return { teamOne, teamTwo };
};

test.afterAll(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Insights", async () => {
  test("should be able to go to insights as admins", async ({ page, users }) => {
    const user = await users.create();
    const userTwo = await users.create();
    await createTeamsAndMembership(user.id, userTwo.id);

    await user.apiLogin();

    // go to insights page
    await page.goto("/insights");
    await page.waitForLoadState("networkidle");

    // expect url to have isAll and TeamId in query params
    expect(page.url()).toContain("isAll=false");
    expect(page.url()).toContain("teamId=");
  });

  test("should be able to go to insights as members", async ({ page, users }) => {
    const user = await users.create();
    const userTwo = await users.create();

    await userTwo.apiLogin();

    await createTeamsAndMembership(user.id, userTwo.id);
    // go to insights page
    await page.goto("/insights");

    await page.waitForLoadState("networkidle");

    // expect url to have isAll and TeamId in query params

    expect(page.url()).toContain("isAll=false");
    expect(page.url()).not.toContain("teamId=");
  });

  test("team select filter should have 2 teams and your account option only as member", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    const userTwo = await users.create();

    await user.apiLogin();

    await createTeamsAndMembership(user.id, userTwo.id);
    // go to insights page
    await page.goto("/insights");

    await page.waitForLoadState("networkidle");

    // get div from team select filter with this class flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1
    await page.getByTestId("dashboard-shell").getByText("Team: test-insights").click();
    await page
      .locator('div[class="flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1"]')
      .click();
    const teamSelectFilter = await page.locator(
      'div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]'
    );

    await expect(teamSelectFilter).toHaveCount(3);
  });

  test("Insights Organization should have isAll option true", async ({ users, page }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    await owner.apiLogin();

    await page.goto("/insights");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("dashboard-shell").getByText("All").nth(1).click();

    const teamSelectFilter = await page.locator(
      'div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]'
    );

    await expect(teamSelectFilter).toHaveCount(4);
  });

  test("should have all option in team-and-self filter as admin", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    // get div from team select filter with this class flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1
    await page.getByTestId("dashboard-shell").getByText("Team: test-insights").click();
    await page
      .locator('div[class="flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1"]')
      .click();
    const teamSelectFilter = await page.locator(
      'div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]'
    );

    await expect(teamSelectFilter).toHaveCount(3);
  });

  test("should be able to switch between teams and self profile for insights", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    // get div from team select filter with this class flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1
    await page.getByTestId("dashboard-shell").getByText("Team: test-insights").click();
    await page
      .locator('div[class="flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1"]')
      .click();
    const teamSelectFilter = await page.locator(
      'div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]'
    );

    await expect(teamSelectFilter).toHaveCount(3);

    // switch to self profile
    await page.getByTestId("dashboard-shell").getByText("Your Account").click();

    // switch to team 1
    await page.getByTestId("dashboard-shell").getByText("test-insights").nth(0).click();

    // switch to team 2
    await page.getByTestId("dashboard-shell").getByText("test-insights-2").click();
  });

  test("should be able to switch between memberUsers", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    await page.getByText("Add filter").click();

    await page.getByRole("button", { name: "User" }).click();
    // <div class="flex select-none truncate font-medium" data-state="closed">People</div>
    await page.locator('div[class="flex select-none truncate font-medium"]').getByText("People").click();

    await page
      .locator('div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]')
      .nth(0)
      .click();
    await page.waitForLoadState("networkidle");

    await page
      .locator('div[class="hover:bg-muted flex items-center py-2 pl-3 pr-2.5 hover:cursor-pointer"]')
      .nth(1)
      .click();
    await page.waitForLoadState("networkidle");
    // press escape button to close the filter
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Clear" }).click();

    // expect for "Team: test-insight" text in page
    expect(await page.locator("text=Team: test-insights").isVisible()).toBeTruthy();
  });

  test("should test download button", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");
    await page.waitForLoadState("networkidle");

    const downloadPromise = page.waitForEvent("download");

    // Expect download button to be visible
    expect(await page.locator("text=Download").isVisible()).toBeTruthy();

    // Click on Download button
    await page.getByText("Download").click();

    // Expect as csv option to be visible
    expect(await page.locator("text=as CSV").isVisible()).toBeTruthy();

    // Start waiting for download before clicking. Note no await.
    await page.getByText("as CSV").click();
    const download = await downloadPromise;

    // Wait for the download process to complete and save the downloaded file somewhere.
    await download.saveAs("./" + "test-insights.csv");
  });
});
