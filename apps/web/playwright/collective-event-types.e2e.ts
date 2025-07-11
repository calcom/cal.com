import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { localize } from "./lib/localize";

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

/** Short hand to get elements by translation key */
const getByKey = async (page: Page, key: string) => page.getByText((await localize("en"))(key));

test.describe("Collective Event Types", () => {
  /** We don't use setupManagedEvent here to test the actual creation flow */
  test("Can create collective event type", async ({ page, users }) => {
    // Creating the owner user of the team
    const adminUser = await users.create(
      { name: "Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );
    // Creating the member user of the team
    // First we work with owner user, logging in
    await adminUser.apiLogin();
    // Let's create a team
    // Going to create an event type
    await page.goto("/event-types");
    const tabItem = page.getByTestId(`horizontal-tab-Owner`);
    await expect(tabItem).toBeVisible();
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.getByTestId("new-event-type").click();
    await page.getByTestId("option-team-1").click();
    // Expecting we can add a managed event type as team owner
    const locator = page.locator('div:has(input[value="COLLECTIVE"]) > button');

    await expect(locator).toBeVisible();
    // Actually creating a managed event type to test things further
    await locator.click();
    await page.fill("[name=title]", "collective");
    await page.click("[type=submit]");

    await page.waitForURL("event-types/**");
    expect(page.url()).toContain("?tabName=team");
  });
});
