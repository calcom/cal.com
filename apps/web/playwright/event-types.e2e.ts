import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import { bookTimeSlot, createNewEventType, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Event Types tests", () => {
  test.describe("user", () => {
    test.beforeEach(async ({ page, users }) => {
      const user = await users.create();
      await user.apiLogin();
      await page.goto("/event-types");
      // We wait until loading is finished
      await page.waitForSelector('[data-testid="event-types"]');
    });

    test.afterEach(async ({ users }) => {
      await users.deleteAll();
    });

    test("sees proper metadata", async ({ page }) => {
      {
        const locator = page.locator('meta[name="viewport"]');

        await expect(locator).toHaveAttribute(
          "content",
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        );
      }

      {
        const locator = page.locator('meta[name="twitter:card"]');

        await expect(locator).toHaveAttribute("content", "summary_large_image");
      }

      {
        const locator = page.locator('meta[name="twitter:site"]');

        await expect(locator).toHaveAttribute("content", "@calcom");
      }

      {
        const locator = page.locator('meta[name="twitter:creator"]');

        await expect(locator).toHaveAttribute("content", "@calcom");
      }

      {
        const locator = page.locator('meta[name="robots"]');

        await expect(locator).toHaveAttribute("content", "index,follow");
      }

      {
        const locator = page.locator('meta[property="og:description"]');

        await expect(locator).toHaveAttribute(
          "content",
          "Create events to share for people to book on your calendar."
        );
      }

      {
        const locator = page.locator('meta[property="og:url"]');

        await expect(locator).toHaveAttribute("content", "http://localhost:3000/event-types");
      }

      {
        const locator = page.locator('meta[property="og:type"]');

        await expect(locator).toHaveAttribute("content", "website");
      }

      {
        const locator = page.locator('meta[property="og:site_name"]');

        await expect(locator).toHaveAttribute("content", "Cal.com");
      }

      {
        const locator = page.locator('link[rel="canonical"]');

        await expect(locator).toHaveAttribute("href", "http://localhost:3000/event-types");
      }

      {
        const locator = page.locator('meta[property="og:title"]');

        const content = await locator.getAttribute("content");

        expect(content).toMatch(/(Event Types|Cal\.com) \| Cal\.com/);
      }

      {
        const locator = page.locator('meta[property="og:image"]');
        const content = await locator.getAttribute("content");

        const optionA =
          "http://localhost:3000/_next/image?w=1200&q=100&url=%2Fapi%2Fsocial%2Fog%2Fimage%3Ftype%3Dgeneric%26title%3DCal.com%26description%3D";

        const optionB =
          "http://localhost:3000/_next/image?w=1200&q=100&url=%2Fapi%2Fsocial%2Fog%2Fimage%3Ftype%3Dgeneric%26title%3DEvent%2520Types%26description%3DCreate%2520events%2520to%2520share%2520for%2520people%2520to%2520book%2520on%2520your%2520calendar.";

        expect(content === optionA || content === optionB).toBeTruthy();
      }

      {
        const locator = page.locator("title");

        const innerText = await locator.innerText();

        expect(innerText).toMatch(/(Event Types|Cal\.com) \| Cal\.com/);
      }

      {
        const locator = page.locator('link[rel="apple-touch-icon"]');

        const href = await locator.getAttribute("href");

        expect(href).toEqual("/api/logo?type=apple-touch-icon");
      }

      {
        const locator = page.locator('link[sizes="32x32"]');

        const href = await locator.getAttribute("href");

        expect(href).toEqual("/api/logo?type=favicon-32");
      }

      {
        const locator = page.locator('link[sizes="16x16"]');

        const href = await locator.getAttribute("href");

        expect(href).toEqual("/api/logo?type=favicon-16");
      }

      {
        const locator = page.locator('link[rel="manifest"]');

        const href = await locator.getAttribute("href");

        expect(href).toEqual("/site.webmanifest");
      }

      {
        const locator = page.locator('link[rel="mask-icon"]');

        const href = await locator.getAttribute("href");

        expect(href).toEqual("/safari-pinned-tab.svg");

        const color = await locator.getAttribute("color");

        expect(color).toEqual("#000000");
      }

      {
        const locator = page.locator('meta[name="msapplication-TileColor"]');

        const content = await locator.getAttribute("content");

        expect(content).toEqual("#ff0000");
      }

      {
        const locator = page.locator('meta[media="(prefers-color-scheme: light)"]');

        const name = await locator.getAttribute("name");

        expect(name).toEqual("theme-color");

        const content = await locator.getAttribute("content");

        expect(content).toEqual("#f9fafb");
      }

      {
        const locator = page.locator('meta[media="(prefers-color-scheme: dark)"]');

        const name = await locator.getAttribute("name");

        expect(name).toEqual("theme-color");

        const content = await locator.getAttribute("content");

        expect(content).toEqual("#1C1C1C");
      }
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
      expect(href).toBeTruthy();
      const [eventTypeId] = new URL(WEBAPP_URL + href).pathname.split("/").reverse();
      const firstTitle = await page.locator(`[data-testid=event-type-title-${eventTypeId}]`).innerText();
      const firstFullSlug = await page.locator(`[data-testid=event-type-slug-${eventTypeId}]`).innerText();
      const firstSlug = firstFullSlug.split("/")[2];

      await page.click(`[data-testid=event-type-options-${eventTypeId}]`);
      await page.click(`[data-testid=event-type-duplicate-${eventTypeId}]`);
      // Wait for the dialog to appear so we can get the URL
      await page.waitForSelector('[data-testid="dialog-title"]');

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
      await page.waitForURL((url) => {
        return !!url.pathname.match(/\/event-types\/.+/);
      });
      await page.locator("[data-testid=update-eventtype]").click();
      const toast = await page.waitForSelector('[data-testid="toast-success"]');
      expect(toast).toBeTruthy();
    });

    test("can add multiple organizer address", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForURL((url) => {
        return !!url.pathname.match(/\/event-types\/.+/);
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

      /**
       * Verify first organizer address
       */
      await page.goto(previewLink ?? "");
      await selectFirstAvailableTimeSlotNextMonth(page);
      await page.locator(`span:has-text("${locationData[0]}")`).click();
      await bookTimeSlot(page);
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      await expect(page.locator(`[data-testid="where"]`)).toHaveText(locationData[0]);

      /**
       * Verify second organizer address
       */
      await page.goto(previewLink ?? "");
      await selectFirstAvailableTimeSlotNextMonth(page);
      await page.locator(`span:has-text("${locationData[1]}")`).click();
      await bookTimeSlot(page);
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
      await expect(page.locator(`[data-testid="where"]`)).toHaveText(locationData[1]);
    });

    test.describe("Different Locations Tests", () => {
      test("can add Attendee Phone Number location and book with it", async ({ page }) => {
        await gotoFirstEventType(page);
        await selectAttendeePhoneNumber(page);
        await saveEventType(page);
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);

        await page.locator(`[data-fob-field-name="location"] input`).fill("9199999999");
        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("text=+19199999999")).toBeVisible();
      });
    });
  });
});

const selectAttendeePhoneNumber = async (page: Page) => {
  const locationOptionText = "Attendee Phone Number";
  await page.locator("#location-select").click();
  await page.locator(`text=${locationOptionText}`).click();
};

async function gotoFirstEventType(page: Page) {
  const $eventTypes = page.locator("[data-testid=event-types] > li a");
  const firstEventTypeElement = $eventTypes.first();
  await firstEventTypeElement.click();
  await page.waitForURL((url) => {
    return !!url.pathname.match(/\/event-types\/.+/);
  });
}

async function saveEventType(page: Page) {
  await page.locator("[data-testid=update-eventtype]").click();
}

async function gotoBookingPage(page: Page) {
  const previewLink = await page.locator("[data-testid=preview-button]").getAttribute("href");

  await page.goto(previewLink ?? "");
}
