import prisma from "@calcom/prisma";
import { expect } from "@playwright/test";
import { test } from "../lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, orgs }) => {
  await users.deleteAll();
  await orgs.deleteAll();
});

test.describe("Organization - Privacy", () => {
  test(`Private Org \n 
        1) Org Member cannot see members of orgs\n
        2) Org Owner/Admin can see members`, async ({ page, browser, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
      isPrivate: true,
    });
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      {
        username: "pro-user",
        name: "pro-user",
        organizationId: org.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teammates: teamMatesObj,
      }
    );
    const memberInOrg = await users.create({
      username: "org-member-user",
      name: "org-member-user",
      organizationId: org.id,
      roleInOrganization: "MEMBER",
    });

    await owner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);
    await page.waitForLoadState("domcontentloaded");

    const tableLocator = page.getByTestId("user-list-data-table").first();

    await expect(tableLocator).toBeVisible();

    const [secondContext, secondPage] = await memberInOrg.apiLoginOnNewBrowser(browser);
    await secondPage.goto(`/settings/organizations/${org.slug}/members`);
    await secondPage.waitForLoadState("domcontentloaded");
    const userDataTable = secondPage.getByTestId("user-list-data-table").first();
    const membersPrivacyWarning = secondPage.getByTestId("members-privacy-warning").first();
    await expect(userDataTable).toBeHidden();
    await expect(membersPrivacyWarning).toBeVisible();
    await secondContext.close();
  });
  test(`Private Org - Private Team\n 
        1) Team Member cannot see members in team\n
        2) Team Admin/Owner can see members in team`, async ({ page, browser, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
      isPrivate: true,
    });
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      {
        username: "pro-user",
        name: "pro-user",
        organizationId: org.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teammates: teamMatesObj,
      }
    );

    await owner.apiLogin();
    const membership = await owner.getFirstTeamMembership();
    const teamId = membership.team.id;

    // Update team to be private
    await page.goto(`/settings/teams/${teamId}/settings`);
    await page.waitForLoadState("domcontentloaded");
    const togglePrivateSwitch = await page.getByTestId("make-team-private-check");
    await togglePrivateSwitch.click();

    // As admin/owner we can see the privacy settings
    await expect(page.getByTestId("make-team-private-check")).toBeVisible();

    const memberUser = await prisma.membership.findFirst({
      where: {
        teamId,
        role: "MEMBER",
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    expect(memberUser?.user.email).toBeDefined();
    // @ts-expect-error expect doesnt assert on a type level
    const memberOfTeam = await users.set(memberUser?.user.email);
    const [secondContext, secondPage] = await memberOfTeam.apiLoginOnNewBrowser(browser);

    await secondPage.goto(`/settings/teams/${teamId}/settings`);
    await secondPage.waitForLoadState("domcontentloaded");

    // As a user we can not see the privacy settings when a team is private
    await expect(secondPage.getByTestId("make-team-private-check")).toBeHidden();

    await secondPage.goto(`/settings/teams/${teamId}/members`);
    await secondPage.waitForLoadState("domcontentloaded");
    await secondPage.waitForTimeout(500); // Add a small delay to ensure UI is fully loaded

    // As a user we can not see the member list when a team is private
    const hiddenTableLocator = secondPage.getByTestId("team-member-list-container");
    await expect(hiddenTableLocator).toBeHidden();
    await secondContext.close();
  });
  test(`Private Org - Public Team\n 
        1) All team members can see members in team \n
        2) Privacy settings are hidden to non-admin members \n
        3) Admin/Owner can see members in team \n
        4) Only Team Admin/Owner can see privacy settings`, async ({ page, browser, users, orgs }) => {
    const org = await orgs.create({
      name: "TestOrg",
    });
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(
      {
        username: "pro-user",
        name: "pro-user",
        organizationId: org.id,
        roleInOrganization: "OWNER",
      },
      {
        hasTeam: true,
        teammates: teamMatesObj,
      }
    );

    const membership = await owner.getFirstTeamMembership();
    const teamId = membership.team.id;

    const memberUser = await prisma.membership.findFirst({
      where: {
        teamId,
        role: "MEMBER",
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    expect(memberUser?.user.email).toBeDefined();
    // @ts-expect-error expect doesnt assert on a type level
    const memberOfTeam = await users.set(memberUser?.user.email);
    await memberOfTeam.apiLogin();

    // 1) All team members can see members in team
    await page.goto(`/settings/teams/${teamId}/members`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    const memberTableLocator = page.getByTestId("team-member-list-container");
    await expect(memberTableLocator).toBeVisible();

    // 2) Privacy settings are hidden to non-admin members
    await page.goto(`/settings/teams/${teamId}/settings`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("make-team-private-check")).toBeHidden();

    const [secondContext, secondPage] = await owner.apiLoginOnNewBrowser(browser);

    // 3) Admin/Owner can see members in team
    await secondPage.goto(`/settings/teams/${teamId}/members`);
    await secondPage.waitForLoadState("domcontentloaded");
    await secondPage.waitForTimeout(500);
    const adminTableLocator = secondPage.getByTestId("team-member-list-container");
    await expect(adminTableLocator).toBeVisible();

    // 4) Only Team Admin/Owner can see privacy settings
    await secondPage.goto(`/settings/teams/${teamId}/settings`);
    await secondPage.waitForLoadState("domcontentloaded");
    await expect(secondPage.getByTestId("make-team-private-check")).toBeVisible();
    await secondContext.close();
  });
});
