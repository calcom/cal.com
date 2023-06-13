import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

// TODO: This test is very flaky. Feels like tossing a coin and hope that it won't fail. Needs to be revisited.
test.fixme("hash my url", () => {
  test.beforeEach(async ({ users }) => {
    const user = await users.create();
    await user.apiLogin();
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("generate url hash", async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator(".primary-navigation >> text=Advanced").click();
    // ignore if it is already checked, and click if unchecked
    const hashedLinkCheck = await page.locator('[data-testid="hashedLinkCheck"]');

    await hashedLinkCheck.click();

    // we wait for the hashedLink setting to load
    const $url = await page.locator('//*[@data-testid="generated-hash-url"]').inputValue();

    // click update
    await page.locator('[data-testid="update-eventtype"]').press("Enter");

    await page.waitForLoadState("networkidle");

    // book using generated url hash
    await page.goto($url);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // hash regenerates after successful booking
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator(".primary-navigation >> text=Advanced").click();
    // we wait for the hashedLink setting to load
    const $newUrl = await page.locator('//*[@data-testid="generated-hash-url"]').inputValue();
    expect($url !== $newUrl).toBeTruthy();
  });
});
