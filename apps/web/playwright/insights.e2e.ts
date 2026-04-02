import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import { expect } from "@playwright/test";
import { applySelectFilter, clearFilters } from "./filter-helpers";
import { test } from "./lib/fixtures";
import { createAllPermissionsArray, enablePBACForTeam } from "./lib/test-helpers/pbac";

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

    await applySelectFilter(page, "userId", member.username || "");

    await clearFilters(page);

    await expect(page).not.toHaveURL(/[?&]userId=/);
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

  test("should render all ChartCard components with expected titles", async ({ page, users }) => {
    const owner = await users.create();
    const member = await users.create();

    await createTeamsAndMembership(owner.id, member.id);

    await owner.apiLogin();

    await page.goto("/insights");

    const expectedChartTitles = [
      "Events",
      "Performance",
      "Event trends",
      "Bookings by hour",
      "Average event duration",
      "Most bookings scheduled",
      "Least bookings scheduled",
      "Most bookings completed",
      "Least bookings completed",
      "Most cancelled",
      "Most no-show",
      "Recent no-show guests",
      "Highest rated",
      "Lowest rated",
      "Recent ratings",
      "Popular events",
    ];

    for (const title of expectedChartTitles) {
      const chartCard = page
        .locator("[data-testid='chart-card'] h2")
        .filter({ hasText: new RegExp(`^${title}$`) });
      await expect(chartCard).toBeVisible();
    }
  });

  test("should be able to access insights page with custom role lacking insights.read permission", async ({
    page,
    users,
  }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
    });

    const userOne = await users.create();
    const userTwo = await users.create();

    const { teamOne } = await createTeamsAndMembership(userOne.id, userTwo.id);

    const orgMembership = await owner.getOrgMembership();
    const orgId = orgMembership.team.id;

    await enablePBACForTeam(orgId);
    await enablePBACForTeam(teamOne.id);

    const permissions = createAllPermissionsArray().filter(
      ({ resource, action }) => !(resource === "insights" && action === "read")
    );

    const customRole = await prisma.role.create({
      data: {
        id: `e2e_no_insights_${orgId}_${Date.now()}`,
        name: "E2E Role Without Insights",
        description: "E2E role for testing - has all permissions except insights.read",
        color: "#dc2626",
        teamId: orgId,
        type: "CUSTOM",
        permissions: {
          create: permissions,
        },
      },
    });

    await prisma.membership.update({
      where: {
        userId_teamId: {
          userId: userOne.id,
          teamId: teamOne.id,
        },
      },
      data: {
        customRoleId: customRole.id,
      },
    });

    const featuresRepository = new FeaturesRepository(prisma);
    const isPBACEnabled = await featuresRepository.checkIfTeamHasFeature(orgId, "pbac");
    expect(isPBACEnabled).toBe(true);

    const permissionService = new PermissionCheckService();
    const hasPermission = await permissionService.checkPermission({
      userId: userOne.id,
      teamId: teamOne.id,
      permission: "insights.read",
      fallbackRoles: [],
    });
    expect(hasPermission).toBe(false);

    await userOne.apiLogin();
    await page.goto("/insights");

    // Verify the user can access the insights page
    await page.locator('[data-testid^="insights-filters-"]').waitFor();
    expect(page.url()).toContain("/insights");
  });
});
