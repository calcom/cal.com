import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users, orgs }) => {
  await users.deleteAll();
  await orgs.deleteAll();
});

test.describe("Organization - Privacy", () => {
  test(`Private Org \n 
  1) Org Member cannot see members\n
  2) Org Owner/Admin can see members`, async ({ page, users, orgs }) => {
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
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("domcontentloaded");

    const tableLocator = await page.getByTestId("user-list-data-table");

    await expect(tableLocator).toBeVisible();

    await memberInOrg.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("domcontentloaded");
    const userDataTable = await page.getByTestId("user-list-data-table");
    const membersPrivacyWarning = await page.getByTestId("members-privacy-warning");
    await expect(userDataTable).toBeHidden();
    await expect(membersPrivacyWarning).toBeVisible();
  });
});
