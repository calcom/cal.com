import { expect } from "@playwright/test";

import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "../../lib/fixtures";
import { applyFilter, createFilterSegment, selectSegment, deleteSegment } from "./filter-segment-helpers";

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

    await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,
      username: "member-user",
    });

    await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "admin-user",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await test.step("Can apply and save a role filter as a segment", async () => {
      await applyFilter(page, "role", "admin");

      await expect(page.getByTestId("member-admin-user-username")).toBeVisible();
      await expect(page.getByTestId("member-member-user-username")).toBeHidden();

      const segmentName = "Admin Users";
      await createFilterSegment(page, segmentName);

      await page.getByTestId("clear-all-filters-button").click();

      await expect(page.getByTestId("member-admin-user-username")).toBeVisible();
      await expect(page.getByTestId("member-member-user-username")).toBeVisible();

      await selectSegment(page, segmentName);

      await expect(page.getByTestId("member-admin-user-username")).toBeVisible();
      await expect(page.getByTestId("member-member-user-username")).toBeHidden();
    });

    await test.step("Can delete a filter segment", async () => {
      await deleteSegment(page, "Admin Users");

      await page.getByRole("button", { name: "Segment" }).click();
      await expect(page.getByText("Admin Users")).toBeHidden();
    });
  });

  test("Filter segments persist across page reloads", async ({ page, users, orgs }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();

    await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,
      username: "member-user",
    });

    await users.create({
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

    await expect(page.getByTestId("member-admin-user-username")).toBeVisible();
    await expect(page.getByTestId("member-member-user-username")).toBeHidden();

    await deleteSegment(page, segmentName);
  });

  test("Admin can create and use team scope filter segments", async ({ page, users, orgs }) => {
    const orgOwner = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      hasSubteam: true,
    });
    const { team: org } = await orgOwner.getOrgMembership();
    const { team: subTeam } = await orgOwner.getFirstTeamMembership();

    await users.create({
      roleInOrganization: MembershipRole.MEMBER,
      organizationId: org.id,
      username: "org-member",
    });

    await users.create({
      roleInOrganization: MembershipRole.ADMIN,
      organizationId: org.id,
      username: "org-admin",
    });

    await orgOwner.apiLogin();

    await page.goto(`/settings/organizations/${org.slug}/members`);

    const dataTable = page.getByTestId("user-list-data-table");
    await expect(dataTable).toBeVisible();

    await test.step("Can create a team scope filter segment", async () => {
      await applyFilter(page, "role", "admin");

      const segmentName = "Team Admin Filter";
      await createFilterSegment(page, segmentName, {
        teamScope: true,
        teamName: subTeam.name,
      });

      await page.getByTestId("clear-all-filters-button").click();

      await selectSegment(page, segmentName);
      await expect(page.getByTestId("member-org-admin-username")).toBeVisible();
      await expect(page.getByTestId("member-org-member-username")).toBeHidden();
    });

    await test.step("Regular member can see but not modify team segments", async () => {
      const regularMember = await users.create({
        roleInOrganization: MembershipRole.MEMBER,
        organizationId: org.id,
        username: "regular-member",
      });

      await regularMember.apiLogin();

      await page.goto(`/settings/organizations/${org.slug}/members`);
      await expect(dataTable).toBeVisible();

      await selectSegment(page, "Team Admin Filter");
      await expect(page.getByTestId("member-org-admin-username")).toBeVisible();
      await expect(page.getByTestId("member-org-member-username")).toBeHidden();

      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByText("Delete")).toBeHidden();

      await orgOwner.apiLogin();

      await page.goto(`/settings/organizations/${org.slug}/members`);
      await expect(dataTable).toBeVisible();
      await deleteSegment(page, "Team Admin Filter");
    });
  });
});
