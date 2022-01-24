import { expect, test } from "@playwright/test";

import { randomString } from "../lib/random";

test.beforeEach(async ({ page }) => {
  await page.goto("/event-types");
  // We wait until loading is finished
  await page.waitForSelector('[data-testid="event-types"]');
});

test.describe("pro user", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test("has at least 2 events", async ({ page }) => {
    const $eventTypes = await page.$$("[data-testid=event-types] > *");

    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
    for (const $el of $eventTypes) {
      expect(await $el.getAttribute("data-disabled")).toBe("0");
    }
  });

  test("can add new event type", async ({ page }) => {
    await page.click("[data-testid=new-event-type]");
    const nonce = randomString(3);
    const eventTitle = `hello ${nonce}`;

    await page.fill("[name=title]", eventTitle);
    await page.fill("[name=length]", "10");
    await page.click("[type=submit]");

    await page.waitForNavigation({
      url(url) {
        return url.pathname !== "/event-types";
      },
    });

    await page.goto("/event-types");

    await expect(page.locator(`text='${eventTitle}'`)).toBeVisible();
  });
});

test.describe("free user", () => {
  test.use({ storageState: "playwright/artifacts/freeStorageState.json" });

  test("has at least 2 events where first is enabled", async ({ page }) => {
    const $eventTypes = await page.$$("[data-testid=event-types] > *");

    expect($eventTypes.length).toBeGreaterThanOrEqual(2);
    const [$first] = $eventTypes;
    const $last = $eventTypes.pop()!;
    expect(await $first.getAttribute("data-disabled")).toBe("0");
    expect(await $last.getAttribute("data-disabled")).toBe("1");
  });

  test("can not add new event type", async ({ page }) => {
    await expect(page.locator("[data-testid=new-event-type]")).toBeDisabled();
  });
});
