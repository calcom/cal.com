import { expect, Locator, test } from "@playwright/test";

import { randomString } from "../lib/random";
import { deleteEventTypeByTitle } from "./lib/teardown";

test.describe.configure({ mode: "parallel" });

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
      const $eventTypes = page.locator("[data-testid=event-types] > *");
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

      isCreated = page.locator(`text='${eventTitle}'`);
      await expect(isCreated).toBeVisible();
    });

    test("enabling recurring event comes with default options", async ({ page }) => {
      await page.click("[data-testid=new-event-type]");
      const nonce = randomString(3);
      eventTitle = `my recurring event ${nonce}`;

      await page.fill("[name=title]", eventTitle);
      await page.fill("[name=length]", "15");
      await page.click("[type=submit]");

      await page.waitForNavigation({
        url(url) {
          return url.pathname !== "/event-types";
        },
      });

      await page.click("[data-testid=show-advanced-settings]");
      await expect(page.locator("[data-testid=recurring-event-collapsible]")).not.toBeVisible();
      await page.click("[data-testid=recurring-event-check]");
      isCreated = page.locator("[data-testid=recurring-event-collapsible]");
      await expect(isCreated).toBeVisible();

      expect(
        await page
          .locator("[data-testid=recurring-event-collapsible] input[type=number]")
          .nth(0)
          .getAttribute("value")
      ).toBe("1");
      expect(
        await page.locator("[data-testid=recurring-event-collapsible] div[class$=singleValue]").textContent()
      ).toBe("week");
      expect(
        await page
          .locator("[data-testid=recurring-event-collapsible] input[type=number]")
          .nth(1)
          .getAttribute("value")
      ).toBe("12");
    });

    test("can duplicate an existing event type", async ({ page }) => {
      const firstTitle = await page.locator("[data-testid=event-type-title-3]").innerText();
      const firstFullSlug = await page.locator("[data-testid=event-type-slug-3]").innerText();
      const firstSlug = firstFullSlug.split("/")[2];

      await page.click("[data-testid=event-type-options-3]");
      await page.click("[data-testid=event-type-duplicate-3]");

      const url = page.url();
      const params = new URLSearchParams(url);

      expect(params.get("title")).toBe(firstTitle);
      expect(params.get("slug")).toBe(firstSlug);

      const formTitle = await page.inputValue("[name=title]");
      const formSlug = await page.inputValue("[name=slug]");

      expect(formTitle).toBe(firstTitle);
      expect(formSlug).toBe(firstSlug);
    });
    test("edit first event", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > *");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForNavigation({
        url: (url) => {
          return !!url.pathname.match(/\/event-types\/.+/);
        },
      });
      await expect(page.locator("[data-testid=advanced-settings-content]")).not.toBeVisible();
      await page.locator("[data-testid=show-advanced-settings]").click();
      await expect(page.locator("[data-testid=advanced-settings-content]")).toBeVisible();
      await page.locator("[data-testid=update-eventtype]").click();
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname.endsWith("/event-types");
        },
      });
    });
  });

  test.describe("free user", () => {
    test.use({ storageState: "playwright/artifacts/freeStorageState.json" });

    test("has at least 2 events where first is enabled", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > *");
      const count = await $eventTypes.count();
      expect(count).toBeGreaterThanOrEqual(2);

      const $first = $eventTypes.first();
      const $last = $eventTypes.last()!;
      expect(await $first.getAttribute("data-disabled")).toBe("0");
      expect(await $last.getAttribute("data-disabled")).toBe("1");
    });

    test("can not add new event type", async ({ page }) => {
      await expect(page.locator("[data-testid=new-event-type]")).toBeDisabled();
    });

    test("edit first event", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > *");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForNavigation({
        url: (url) => {
          return !!url.pathname.match(/\/event-types\/.+/);
        },
      });
      await expect(page.locator("[data-testid=advanced-settings-content]")).not.toBeVisible();
      await page.locator("[data-testid=show-advanced-settings]").click();
      await expect(page.locator("[data-testid=advanced-settings-content]")).toBeVisible();
      await page.locator("[data-testid=update-eventtype]").click();
      await page.waitForNavigation({
        url: (url) => {
          return url.pathname.endsWith("/event-types");
        },
      });
    });
  });
});
