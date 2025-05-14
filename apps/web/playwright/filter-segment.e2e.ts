import { expect } from "@playwright/test";

import { MembershipRole } from "@calcom/prisma/enums";

import {
  applyFilter,
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
      await applyFilter(page, "role", "admin");

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

    await applyFilter(page, "role", "admin");
    const segmentName = "Admin Users Persistent";
    await createFilterSegment(page, segmentName);

    await page.reload();
    await expect(dataTable).toBeVisible();

    await selectSegment(page, segmentName);

    await expect(page.getByText(adminUser.email)).toBeVisible();
    await expect(page.getByText(memberUser.email)).toBeHidden();

    await deleteSegment(page, segmentName);
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
      await applyFilter(page, "role", "admin");

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
