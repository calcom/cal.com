import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Buy Credits E2E Tests", () => {
  test("should display buy credits option for personal account", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/settings/billing");

    await expectBuyCreditsButtonVisibleAndEnabled(page);
  });

  test("should display buy credits option for team account", async ({ page, users }) => {
    const teamOwner = await users.create(
      { username: "team-owner", name: "Team Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );
    await teamOwner.apiLogin();

    const { team } = await teamOwner.getFirstTeamMembership();

    await page.goto(`/settings/teams/${team.id}/billing`);

    await expectBuyCreditsButtonVisibleAndEnabled(page);
  });
});

async function expectBuyCreditsButtonVisibleAndEnabled(page: Page) {
  const buyCreditsButton = page.getByTestId("buy-credits");
  await expect(buyCreditsButton).toBeVisible();
  await expect(buyCreditsButton).toBeEnabled();
}
