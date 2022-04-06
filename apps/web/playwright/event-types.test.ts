import { expect, Locator, test } from "@playwright/test";

import { randomString } from "../lib/random";
import { deleteEventTypeByTitle } from "./lib/teardown";

test.describe("Event Types tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.describe("pro user", () => {
    let isCreated: Locator;
    let eventTitle: string;

    test.afterAll(async () => {
      if (isCreated) await deleteEventTypeByTitle(eventTitle);
    });
    test.use({ storageState: "playwright/artifacts/proStorageState.json" });

    test("has at least 2 events", async ({ page }) => {
      const $eventTypes = await page.locator("[data-testid=event-types] > *");
      const count = await $eventTypes.count();
      expect(count).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < count; i++) {
        expect(await $eventTypes.nth(i).getAttribute("data-disabled")).toBe("0");
      }
    });

    test("can add new event type", async ({ page }) => {
      await page.click("[data-testid=new-event-type]");
      const nonce = randomString(3);
      eventTitle = `hello ${nonce}`;

      await page.fill("[name=title]", eventTitle);
      await page.fill("[name=length]", "10");
      await page.click("[type=submit]");

      await page.waitForNavigation({
        url(url) {
          return url.pathname !== "/event-types";
        },
      });

      await page.goto("/event-types");

      isCreated = await expect(page.locator(`text='${eventTitle}'`)).toBeVisible();
    });

    test("can duplicate an existing event type", async ({ page }) => {
      const firstTitle = await page.locator("[data-testid=event-type-title-3]").innerText();
      const firstFullSlug = await page.locator("[data-testid=event-type-slug-3]").innerText();
      const firstSlug = firstFullSlug.split("/")[2];

      await page.click("[data-testid=event-type-options-3]");
      await page.click("[data-testid=event-type-duplicate-3]");

      const url = await page.url();
      const params = new URLSearchParams(url);

      await expect(params.get("title")).toBe(firstTitle);
      await expect(params.get("slug")).toBe(firstSlug);

      const formTitle = await page.inputValue("[name=title]");
      const formSlug = await page.inputValue("[name=slug]");

      await expect(formTitle).toBe(firstTitle);
      await expect(formSlug).toBe(firstSlug);
    });
  });

  test.describe("free user", () => {
    test.use({ storageState: "playwright/artifacts/freeStorageState.json" });

    test("has at least 2 events where first is enabled", async ({ page }) => {
      const $eventTypes = await page.locator("[data-testid=event-types] > *");
      const count = await $eventTypes.count();
      expect(count).toBeGreaterThanOrEqual(2);

      const $first = await $eventTypes.first();
      const $last = await $eventTypes.last()!;
      expect(await $first.getAttribute("data-disabled")).toBe("0");
      expect(await $last.getAttribute("data-disabled")).toBe("1");
    });

    test("can not add new event type", async ({ page }) => {
      await expect(page.locator("[data-testid=new-event-type]")).toBeDisabled();
    });
  });
});
