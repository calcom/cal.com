import { expect } from "@playwright/test";

import { MembershipRole } from "@calcom/prisma/enums";

import {
  applySelectFilter,
  createFilterSegment,
  selectSegment,
  deleteSegment,
  listSegments,
  clearFilters,
  openSegmentSubmenu,
} from "./filter-helpers";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, orgs }) => {
  await users.deleteAll();
  await orgs.deleteAll();
});

test.describe("Filter Segment Functionality", () => {
  test("Admin can create, use, and delete filter segments in organization members list", async ({
    page,
    users,
    orgs,
  }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    const memberUser = await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,

      username: "member-user",
    });

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,

      username: "admin-user",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    const segmentName = "Admin Users";

    await test.step("Can apply and save a role filter as a segment", async () => {
      await applySelectFilter(page, "role", "admin");

      await expect(page.getByText(adminUser.email)).toBeVisible();
      await expect(page.getByText(memberUser.email)).toBeHidden();

      await createFilterSegment(page, segmentName);

      await clearFilters(page);

      await expect(page.getByText(adminUser.email)).toBeVisible();
      await expect(page.getByText(memberUser.email)).toBeVisible();

      await selectSegment(page, segmentName);

      await expect(page.getByText(adminUser.email)).toBeVisible();
      await expect(page.getByText(memberUser.email)).toBeHidden();
    });

    await test.step("Can delete a filter segment", async () => {
      await deleteSegment(page, "Admin Users");

      const segments = await listSegments(page);
      expect(segments.includes(segmentName)).toBe(false);
    });
  });

  test("Filter segments persist across page reloads", async ({ page, users, orgs }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    const memberUser = await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,

      username: "member-user",
    });

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,

      username: "admin-user",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Admin Users Persistent";
    await createFilterSegment(page, segmentName);

    await page.reload();
    await expect(dataTable).toBeVisible();

    await selectSegment(page, segmentName);

    await expect(page.getByText(adminUser.email)).toBeVisible();
    await expect(page.getByText(memberUser.email)).toBeHidden();

    await deleteSegment(page, segmentName);
  });

  test("Filter segment preferences persist in database across page reloads", async ({
    page,
    users,
    orgs,
  }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    const memberUser = await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,
      username: "member-user",
    });

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "admin-user",
    });

    await orgOwner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Database Persistent Admins";
    await createFilterSegment(page, segmentName);

    await expect(page.getByText(adminUser.email)).toBeVisible();
    await expect(page.getByText(memberUser.email)).toBeHidden();

    const baseUrl = page.url().split("?")[0];
    await page.goto(baseUrl);
    await expect(dataTable).toBeVisible();

    await page.waitForTimeout(1000); // Allow time for preference to load

    await expect(page.getByText(adminUser.email)).toBeVisible();
    await expect(page.getByText(memberUser.email)).toBeHidden();

    await deleteSegment(page, segmentName);
  });

  test("Filter segment preferences persist across different browser sessions", async ({
    browser,
    users,
    orgs,
  }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "admin-user-session",
    });

    const firstContext = await browser.newContext();
    const firstPage = await firstContext.newPage();

    await firstPage.goto("/auth/login");
    await firstPage.fill("#email", `${orgOwner.username}@example.com`);
    await firstPage.fill("#password", orgOwner.username);
    await firstPage.click('[type="submit"]');
    await firstPage.waitForURL("/**");

    await firstPage.goto(`/settings/organizations/${org.slug}/members`);

    await expect(firstPage.getByTestId("user-list-data-table")).toBeVisible();
    await applySelectFilter(firstPage, "role", "admin");
    const segmentName = "Cross Session Admins";
    await createFilterSegment(firstPage, segmentName);

    await firstContext.close();

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    await secondPage.goto("/auth/login");
    await secondPage.fill("#email", `${orgOwner.username}@example.com`);
    await secondPage.fill("#password", orgOwner.username);
    await secondPage.click('[type="submit"]');
    await secondPage.waitForURL("/**");

    await secondPage.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = secondPage.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await secondPage.waitForTimeout(1000);
    await expect(secondPage.getByText(adminUser.email)).toBeVisible();

    await deleteSegment(secondPage, segmentName);
    await secondContext.close();
  });

  test("Team segment preferences persist in database", async ({ page, users, prisma }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      hasSubteam: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();
    const { team: subTeam } = await orgOwner.getFirstTeamMembership();

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "team-admin",
    });

    await orgOwner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Team Admin Persistent";
    await createFilterSegment(page, segmentName, {
      teamScope: true,
      teamName: subTeam.name,
    });

    const baseUrl = page.url().split("?")[0];
    await page.goto(baseUrl);
    await expect(dataTable).toBeVisible();

    await page.waitForTimeout(1000);
    await expect(page.getByText(adminUser.email)).toBeVisible();

    await deleteSegment(page, segmentName);
  });

  test("Filter segment preferences are isolated per table identifier", async ({ page, users, orgs }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "admin-table-isolation",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);
    await expect(page.getByTestId("user-list-data-table")).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const membersSegmentName = "Members Table Segment";
    await createFilterSegment(page, membersSegmentName);

    const baseUrl = page.url().split("?")[0];
    await page.goto(baseUrl);
    await expect(page.getByTestId("user-list-data-table")).toBeVisible();

    await page.waitForTimeout(1000);
    await expect(page.getByText(adminUser.email)).toBeVisible();

    await deleteSegment(page, membersSegmentName);
  });

  test("Admin can create and use team scope filter segments", async ({ page, users, prisma }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,

      hasSubteam: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();
    const { team: subTeam } = await orgOwner.getFirstTeamMembership();

    const memberUser = await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,

      username: "org-member",
    });

    const adminUser = await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,

      username: "org-admin",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();
    const segmentName = "Team Admin Filter";

    await test.step("Can create a team scope filter segment", async () => {
      await applySelectFilter(page, "role", "admin");

      await createFilterSegment(page, segmentName, {
        teamScope: true,
        teamName: subTeam.name,
      });

      await clearFilters(page);
      await selectSegment(page, segmentName);
      await expect(page.getByText(adminUser.email)).toBeVisible();
      await expect(page.getByText(memberUser.email)).toBeHidden();
    });

    await test.step("Regular member can see but not modify team segments", async () => {
      const regularMember = await users.create({
        roleInOrganization: MembershipRole.MEMBER,
        organizationId: org.id,
        username: "regular-member",
      });
      await prisma.membership.create({
        data: {
          createdAt: new Date(),
          teamId: subTeam.id,
          userId: regularMember.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      await regularMember.apiLogin();

      await page.goto(`/settings/organizations/${org.slug}/members`);
      await expect(dataTable).toBeVisible();

      await selectSegment(page, "Team Admin Filter");
      await expect(page.getByText(adminUser.email)).toBeVisible();
      await expect(page.getByText(memberUser.email)).toBeHidden();

      await openSegmentSubmenu(page, segmentName);
      await expect(
        page.getByTestId("filter-segment-select-submenu-content").getByText("Delete")
      ).toBeHidden();
    });
  });
});
