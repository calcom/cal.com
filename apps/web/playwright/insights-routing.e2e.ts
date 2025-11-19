import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Insights > Routing", () => {
  test("applies routing form filter by default", async ({ page, users, routingForms }) => {
    const owner = await users.create(undefined, {
      hasTeam: true,
      isUnpublished: true,
      isOrg: true,
      hasSubteam: true,
    });
    await owner.apiLogin();

    const membership = await owner.getOrgMembership();

    const formName = "Test Form 1234";
    await routingForms.create({
      name: formName,
      userId: owner.id,
      teamId: membership.teamId,
      fields: [
        {
          type: "text",
          label: "Name",
          identifier: "name",
          required: true,
        },
      ],
    });

    await page.goto(`/insights/routing`);
    await page.locator('[data-testid="filter-popover-trigger-formId"]').getByText(formName).waitFor();

    // The routing form filter is persisted
    // even if user tries to clear it.
    await page.locator('[data-testid="clear-filters-button"]').click();
    await page.locator('[data-testid="filter-popover-trigger-formId"]').getByText(formName).waitFor();
  });
});
