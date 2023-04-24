import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import { testBothBookers } from "./lib/new-booker";
import { bookTimeSlot, createNewEventType, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Event Types tests", () => {
  testBothBookers.describe("user", (bookerVariant) => {
    test.beforeEach(async ({ page, users }) => {
      const user = await users.create();
      await user.login();
      await page.goto("/event-types");
      // We wait until loading is finished
      await page.waitForSelector('[data-testid="event-types"]');
    });

    test.afterEach(async ({ users }) => {
      await users.deleteAll();
    });

    test("has at least 2 events", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const count = await $eventTypes.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test("can add new event type", async ({ page }) => {
      const nonce = randomString(3);
      const eventTitle = `hello ${nonce}`;
      await createNewEventType(page, { eventTitle });
      await page.goto("/event-types");
      await expect(page.locator(`text='${eventTitle}'`)).toBeVisible();
    });

    test("enabling recurring event comes with default options", async ({ page }) => {
      const nonce = randomString(3);
      const eventTitle = `my recurring event ${nonce}`;
      await createNewEventType(page, { eventTitle });

      await page.click("[data-testid=vertical-tab-recurring]");
      await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeHidden();
      await page.click("[data-testid=recurring-event-check]");
      await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();

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
      const firstElement = await page.waitForSelector(
        '[data-testid="event-types"] a[href^="/event-types/"] >> nth=0'
      );
      const href = await firstElement.getAttribute("href");
      if (!href) throw new Error("No href found for event type");
      const [eventTypeId] = new URL(WEBAPP_URL + href).pathname.split("/").reverse();
      const firstTitle = await page.locator(`[data-testid=event-type-title-${eventTypeId}]`).innerText();
      const firstFullSlug = await page.locator(`[data-testid=event-type-slug-${eventTypeId}]`).innerText();
      const firstSlug = firstFullSlug.split("/")[2];

      await page.click(`[data-testid=event-type-options-${eventTypeId}]`);
      await page.click(`[data-testid=event-type-duplicate-${eventTypeId}]`);

      const url = page.url();
      const params = new URLSearchParams(url);

      expect(params.get("title")).toBe(firstTitle);
      expect(params.get("slug")).toContain(firstSlug);

      const formTitle = await page.inputValue("[name=title]");
      const formSlug = await page.inputValue("[name=slug]");

      expect(formTitle).toBe(firstTitle);
      expect(formSlug).toContain(firstSlug);
    });
    test("edit first event", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForNavigation({
        url: (url) => {
          return !!url.pathname.match(/\/event-types\/.+/);
        },
      });
      await page.locator("[data-testid=update-eventtype]").click();
      const toast = await page.waitForSelector("div[class*='data-testid-toast-success']");
      expect(toast).toBeTruthy();
    });

    test("can add multiple organizer address", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForNavigation({
        url: (url) => {
          return !!url.pathname.match(/\/event-types\/.+/);
        },
      });

      const locationData = ["location 1", "location 2", "location 3"];

      const fillLocation = async (inputText: string) => {
        await page.locator("#location-select").click();
        await page.locator("text=In Person (Organizer Address)").click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(1000);
        await page.locator('input[name="locationAddress"]').fill(inputText);
        await page.locator("[data-testid=display-location]").check();
        await page.locator("[data-testid=update-location]").click();
      };

      await fillLocation(locationData[0]);

      await page.locator("[data-testid=add-location]").click();
      await fillLocation(locationData[1]);

      await page.locator("[data-testid=add-location]").click();
      await fillLocation(locationData[2]);

      await page.locator("[data-testid=update-eventtype]").click();

      await page.goto("/event-types");

      const previewLink = await page
        .locator("[data-testid=preview-link-button]")
        .first()
        .getAttribute("href");

      await page.goto(previewLink ?? "");

      await selectFirstAvailableTimeSlotNextMonth(page);

      // Navigate to book page
      // Kept in if statement here, since it's only temporary
      // until the old booker isn't used anymore, and I wanted
      // to change the test as little as possible.
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (bookerVariant === "old-booker") {
        await page.waitForNavigation({
          url(url) {
            return url.pathname.endsWith("/book");
          },
        });
      }

      for (const location of locationData) {
        await page.locator(`span:has-text("${location}")`).click();
      }

      await bookTimeSlot(page);

      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    });
  });
});
