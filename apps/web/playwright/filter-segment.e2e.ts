import { MembershipRole } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import {
  applySelectFilter,
  clearFilters,
  createFilterSegment,
  deleteSegment,
  expectSegmentCleared,
  expectSegmentSelected,
  getByTableColumnText,
  listSegments,
  locateSelectedSegmentName,
  openSegmentSubmenu,
  selectSegment,
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

    const dataTable = page.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();

    const segmentName = "Admin Users";

    await test.step("Can apply and save a role filter as a segment", async () => {
      await applySelectFilter(page, "role", "admin");

      await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
      await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();

      await createFilterSegment(page, segmentName);

      await clearFilters(page);

      await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
      await expect(getByTableColumnText(page, "member", memberUser.email)).toBeVisible();

      await selectSegment(page, segmentName);

      await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
      await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();
    });

    await test.step("Can delete a filter segment", async () => {
      await deleteSegment(page, "Admin Users");
      await page.reload();

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

    const dataTable = page.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Admin Users Persistent";
    await createFilterSegment(page, segmentName);

    await page.reload();
    await expect(dataTable).toBeVisible();
    await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
    await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();

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

    const dataTable = page.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Admin Only";
    await createFilterSegment(page, segmentName);

    await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
    await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();

    await page.goto(`/settings/organizations/${org.slug}/members`);
    await expect(locateSelectedSegmentName(page, segmentName)).toBeVisible();
    // Redefine dataTable after navigation as page context may have changed
    const dataTableAfterNav = page.getByTestId("user-list-data-table").first();
    await expect(dataTableAfterNav).toBeVisible();

    await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
    await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();

    await deleteSegment(page, segmentName);
  });

  test("Filter segment preferences persist across different browser sessions", async ({
    browser,
    page,
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

    await orgOwner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);

    await expect(page.getByTestId("user-list-data-table").first()).toBeVisible();
    await applySelectFilter(page, "role", "admin");
    const segmentName = "Cross Session Admins";
    await createFilterSegment(page, segmentName);

    const [secondContext, secondPage] = await orgOwner.apiLoginOnNewBrowser(browser);
    await secondPage.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = secondPage.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();
    await expect(locateSelectedSegmentName(secondPage, segmentName)).toBeVisible();
    await expect(getByTableColumnText(secondPage, "member", adminUser.email)).toBeVisible();

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

    const dataTable = page.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Team Admin";
    await createFilterSegment(page, segmentName, {
      teamScope: true,
      teamName: subTeam.name,
    });

    await page.goto(`/settings/organizations/${org.slug}/members`);
    // Redefine dataTable after navigation as page context may have changed
    const dataTableAfterNav = page.getByTestId("user-list-data-table").first();
    await expect(dataTableAfterNav).toBeVisible();
    await expect(locateSelectedSegmentName(page, segmentName)).toBeVisible();

    await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();

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
    await expect(page.getByTestId("user-list-data-table").first()).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const membersSegmentName = "Members Table Segment";
    await createFilterSegment(page, membersSegmentName);

    await page.goto(`/settings/organizations/${org.slug}/members`);
    await expect(page.getByTestId("user-list-data-table").first()).toBeVisible();
    await expect(locateSelectedSegmentName(page, membersSegmentName)).toBeVisible();
    await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();

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

    const dataTable = page.getByTestId("user-list-data-table").first();
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
      await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
      await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();
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
      // Redefine dataTable after login change as page context may have changed
      const dataTableAfterLogin = page.getByTestId("user-list-data-table").first();
      await expect(dataTableAfterLogin).toBeVisible();

      await selectSegment(page, "Team Admin Filter");
      await expect(getByTableColumnText(page, "member", adminUser.email)).toBeVisible();
      await expect(getByTableColumnText(page, "member", memberUser.email)).toBeHidden();

      await openSegmentSubmenu(page, segmentName);
      await expect(
        page.getByTestId("filter-segment-select-submenu-content").getByText("Delete")
      ).toBeHidden();
    });
  });

  test("Deselecting a segment clears all active filters", async ({ page, users }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    await orgOwner.apiLogin();
    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table").first();
    await expect(dataTable).toBeVisible();

    await applySelectFilter(page, "role", "admin");
    const segmentName = "Test Deselect Segment";
    await createFilterSegment(page, segmentName);

    await expectSegmentSelected(page, segmentName);
    const urlWithSegment = page.url();
    expect(urlWithSegment).toContain("activeFilters");

    await selectSegment(page, segmentName);
    await expectSegmentCleared(page);

    const urlAfterDeselect = page.url();
    expect(urlAfterDeselect).not.toContain("activeFilters");

    await deleteSegment(page, segmentName);
  });
});
