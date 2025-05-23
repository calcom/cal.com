import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";

import { addFilter, openFilter, clearFilters } from "./filter-helpers";
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

test.afterEach(async ({ users }) => {
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

    await page.locator('[data-testid^="insights-filters-false-"]').waitFor();
  });

  test("should be able to go to insights as members", async ({ page, users }) => {
    const user = await users.create();
    const userTwo = await users.create();

    await userTwo.apiLogin();

    await createTeamsAndMembership(user.id, userTwo.id);
    // go to insights page
    await page.goto("/insights");

    await page.locator('[data-testid^="insights-filters-false-"]').waitFor();
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
    await page.locator(`[data-testid=insights-filters-false-undefined-${user.id}]`).waitFor();

    await page.getByTestId("dashboard-shell").getByText("Your account").click();

    await expect(await page.locator('[data-testid="org-teams-filter-item"]')).toHaveCount(3);

    await expect(await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "All" })).toHaveCount(
      0
    );

    await expect(
      await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "Your account" })
    ).toHaveCount(1);
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
    await page.locator('[data-testid^="insights-filters-true-"]').waitFor();

    await page.locator('[data-testid^="insights-filters-true-"]').getByText("All").click();

    await expect(await page.locator('[data-testid="org-teams-filter-item"]')).toHaveCount(3);

    await expect(
      await page
        .locator('[data-testid="org-teams-filter-item"]', { hasText: "All" })
        .locator('input[type="checkbox"]')
    ).toBeChecked();
  });

  test("should not have all option as admin in non-org", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    await page.getByTestId("dashboard-shell").getByText("Your account").click();

    await expect(await page.locator('[data-testid="org-teams-filter-item"]')).toHaveCount(3);

    await expect(await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "All" })).toHaveCount(
      0
    );
  });

  test("should be able to switch between teams and self profile for insights", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    await page.getByTestId("dashboard-shell").getByText("Your account").click();

    await expect(await page.locator('[data-testid="org-teams-filter-item"]')).toHaveCount(3);

    // switch to self profile
    await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "Your account" }).click();

    // switch to team 1
    await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "test-insights" }).first().click();

    // switch to team 2
    await page.locator('[data-testid="org-teams-filter-item"]', { hasText: "test-insights-2" }).click();
  });

  test("should be able to switch between memberUsers", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    // Choose a team
    await page.getByTestId("dashboard-shell").getByText("Your account").click();
    await page.locator('[data-testid="org-teams-filter-item"]').nth(1).click();
    await page.keyboard.press("Escape");

    // Choose User filter item from dropdown
    await addFilter(page, "bookingUserId");

    // Wait for the URL to include bookingUserId
    await page.waitForURL((url) => url.toString().includes("bookingUserId"));

    // Click User filter to see a user list
    await openFilter(page, "bookingUserId");

    await page
      .locator('[data-testid="select-filter-options-bookingUserId"]')
      .getByRole("option")
      .nth(0)
      .click();

    await page
      .locator('[data-testid="select-filter-options-bookingUserId"]')
      .getByRole("option")
      .nth(1)
      .click();

    // press escape button to close the filter
    await page.keyboard.press("Escape");

    await clearFilters(page);

    await expect(page.url()).not.toContain("bookingUserId");
  });

  test("should test download button", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    const downloadPromise = page.waitForEvent("download");

    // Expect download button to be visible
    await expect(page.locator("text=Download")).toBeVisible();

    // Click on Download button
    await page.getByText("Download").click();

    // Expect as csv option to be visible
    await expect(page.locator("text=as CSV")).toBeVisible();

    // Start waiting for download before clicking. Note no await.
    await page.getByText("as CSV").click();
    const download = await downloadPromise;

    // Wait for the download process to complete and save the downloaded file somewhere.
    await download.saveAs("./" + "test-insights.csv");
  });
});
