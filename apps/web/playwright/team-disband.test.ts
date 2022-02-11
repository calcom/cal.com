import { expect, test } from "@playwright/test";
import { randomString } from "../lib/random";

test.beforeEach(async ({ page }) => {
  await page.goto("/settings/teams");
  await page.waitForSelector("[data-testid=teams]");
});

test.describe("owner user", () => {
  test.use({ storageState: "playwright/artifacts/trialStorageState.json" });

  test("can disband a team", async ({ page }) => {
    // Creata a new team
    const nonce = randomString(5);
    const teamName = `Team ${nonce}`;
    await page.locator("[data-testid=new-team]").click();
    await page.fill("[name=name]", teamName);
    await page.click("[type=submit]");
    await expect(page.locator(`text='${teamName}'`)).toBeVisible();

    // select created team
    const $teams = await page.$$("[data-testid=teams] > *");
    expect($teams.length).toBeGreaterThanOrEqual(0);
    const [, $second] = $teams;
    $second.click();

    await page.click("[data-testid=disband-team]");
    await page.click("[data-testid=confirmbt-disband-team]");

    await expect(page).toHaveURL("/settings/teams", { timeout: 2000 });
  });
});
