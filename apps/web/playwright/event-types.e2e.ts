import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  createNewEventType,
  gotoBookingPage,
  gotoFirstEventType,
  saveEventType,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Event Types A/B tests", () => {
  test("should render the /future/event-types page", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/event-types");

    const locator = page.getByRole("heading", { name: "Event Types" });

    await expect(locator).toBeVisible();
  });
});

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

    test("new event type appears first in the list", async ({ page }) => {
      const nonce = randomString(3);
      const eventTitle = `hello ${nonce}`;
      await createNewEventType(page, { eventTitle });
      await page.goto("/event-types");
      const firstEvent = page.locator("[data-testid=event-types] > li a").first();
      const firstEventTitle = await firstEvent.getAttribute("title");
      await expect(firstEventTitle).toBe(eventTitle);
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

      await expect(page.locator("[data-testid=readonly-badge]")).toBeHidden();

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

      const submitPromise = page.waitForResponse("/api/trpc/eventTypes/duplicate?batch=1");
      await page.getByTestId("continue").click();
      const response = await submitPromise;
      expect(response.status()).toBe(200);
    });

    test("edit first event", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForURL((url) => {
        return !!url.pathname.match(/\/event-types\/.+/);
      });
      await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
        action: () => page.locator("[data-testid=update-eventtype]").click(),
      });
    });

    test("can add multiple organizer address", async ({ page }) => {
      const $eventTypes = page.locator("[data-testid=event-types] > li a");
      const firstEventTypeElement = $eventTypes.first();
      await firstEventTypeElement.click();
      await page.waitForURL((url) => {
        return !!url.pathname.match(/\/event-types\/.+/);
      });

      const locationData = ["location 1", "location 2", "location 3"];

      await fillLocation(page, locationData[0], 0);

      await page.locator("[data-testid=add-location]").click();
      await fillLocation(page, locationData[1], 1);

      await page.locator("[data-testid=add-location]").click();
      await fillLocation(page, locationData[2], 2);

      await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
        action: () => page.locator("[data-testid=update-eventtype]").click(),
      });

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

        await page.locator(`[data-fob-field-name="location"] input`).fill("19199999999");
        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("text=+19199999999")).toBeVisible();
      });

      test("Can add Organzer Phone Number location and book with it", async ({ page }) => {
        await gotoFirstEventType(page);

        await page.getByTestId("location-select").click();
        await page.locator(`text="Organizer Phone Number"`).click();
        const locationInputName = "locations[0].hostPhoneNumber";
        await page.locator(`input[name="${locationInputName}"]`).waitFor();
        await page.locator(`input[name="${locationInputName}"]`).fill("19199999999");

        await saveEventType(page);
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);

        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("text=+19199999999")).toBeVisible();
      });

      test("Can add Cal video location and book with it", async ({ page }) => {
        await gotoFirstEventType(page);

        await page.getByTestId("location-select").click();
        await page.locator(`text="Cal Video (Global)"`).click();

        await saveEventType(page);
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);

        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("[data-testid=where] ")).toContainText("Cal Video");
      });

      test("Can add Link Meeting as location and book with it", async ({ page }) => {
        await gotoFirstEventType(page);

        await page.getByTestId("location-select").click();
        await page.locator(`text="Link meeting"`).click();

        const locationInputName = `locations[0].link`;

        const testUrl = "https://cal.ai/";
        await page.locator(`input[name="${locationInputName}"]`).fill(testUrl);

        await saveEventType(page);
        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);

        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        const linkElement = await page.locator("[data-testid=where] > a");
        expect(await linkElement.getAttribute("href")).toBe(testUrl);
      });

      // TODO: This test is extremely flaky and has been failing a lot, blocking many PRs. Fix this.
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip("Can remove location from multiple locations that are saved", async ({ page }) => {
        await gotoFirstEventType(page);

        // Add Attendee Phone Number location
        await selectAttendeePhoneNumber(page);

        // Add Cal Video location
        await addAnotherLocation(page, "Cal Video (Global)");

        await saveEventType(page);

        // Remove Attendee Phone Number Location
        const removeButtomId = "delete-locations.0.type";
        await page.getByTestId(removeButtomId).click();

        await saveEventType(page);

        await gotoBookingPage(page);
        await selectFirstAvailableTimeSlotNextMonth(page);

        await bookTimeSlot(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator("[data-testid=where]")).toHaveText(/Cal Video/);
      });

      test("can add single organizer address location without display location public option", async ({
        page,
      }) => {
        const $eventTypes = page.locator("[data-testid=event-types] > li a");
        const firstEventTypeElement = $eventTypes.first();
        await firstEventTypeElement.click();
        await page.waitForURL((url) => {
          return !!url.pathname.match(/\/event-types\/.+/);
        });

        const locationAddress = "New Delhi";

        await fillLocation(page, locationAddress, 0, false);
        await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
          action: () => page.locator("[data-testid=update-eventtype]").click(),
        });

        await page.goto("/event-types");

        const previewLink = await page
          .locator("[data-testid=preview-link-button]")
          .first()
          .getAttribute("href");

        await page.goto(previewLink ?? "");
        await selectFirstAvailableTimeSlotNextMonth(page);
        await bookTimeSlot(page);
        await expect(page.locator("[data-testid=success-page]")).toBeVisible();
        await expect(page.locator(`[data-testid="where"]`)).toHaveText(locationAddress);
      });

      test("can select 'display on booking page' option when multiple organizer input type are present", async ({
        page,
      }) => {
        await gotoFirstEventType(page);

        await page.getByTestId("location-select").click();
        await page.locator(`text="Link meeting"`).click();

        const locationInputName = (idx: number) => `locations[${idx}].link`;

        const testUrl1 = "https://cal.ai/";
        await page.locator(`input[name="${locationInputName(0)}"]`).fill(testUrl1);
        await page.locator("[data-testid=display-location]").last().check();
        await checkDisplayLocation(page);
        await unCheckDisplayLocation(page);

        await page.locator("[data-testid=add-location]").click();

        const testUrl2 = "https://cal.com/ai";
        await page.locator(`text="Link meeting"`).last().click();
        await page.locator(`input[name="${locationInputName(1)}"]`).waitFor();
        await page.locator(`input[name="${locationInputName(1)}"]`).fill(testUrl2);
        await checkDisplayLocation(page);
        await unCheckDisplayLocation(page);

        // Remove Both of the locations
        const removeButtomId = "delete-locations.0.type";
        await page.getByTestId(removeButtomId).nth(0).click();
        await page.getByTestId(removeButtomId).nth(0).click();

        // Add Multiple Organizer Phone Number options
        await page.getByTestId("location-select").last().click();
        await page.locator(`text="Organizer Phone Number"`).click();

        const organizerPhoneNumberInputName = (idx: number) => `locations[${idx}].hostPhoneNumber`;

        const testPhoneInputValue1 = "9199999999";
        await page.locator(`input[name="${organizerPhoneNumberInputName(0)}"]`).waitFor();
        await page.locator(`input[name="${organizerPhoneNumberInputName(0)}"]`).fill(testPhoneInputValue1);
        await page.locator("[data-testid=display-location]").last().check();
        await checkDisplayLocation(page);
        await unCheckDisplayLocation(page);
        await page.locator("[data-testid=add-location]").click();

        const testPhoneInputValue2 = "9188888888";
        await page.locator(`text="Organizer Phone Number"`).last().click();
        await page.locator(`input[name="${organizerPhoneNumberInputName(1)}"]`).waitFor();
        await page.locator(`input[name="${organizerPhoneNumberInputName(1)}"]`).fill(testPhoneInputValue2);
        await checkDisplayLocation(page);
        await unCheckDisplayLocation(page);
      });
    });
  });
});

const selectAttendeePhoneNumber = async (page: Page) => {
  const locationOptionText = "Attendee Phone Number";
  await page.getByTestId("location-select").click();
  await page.locator(`text=${locationOptionText}`).click();
};

/**
 * Adds n+1 location to the event type
 */
async function addAnotherLocation(page: Page, locationOptionText: string) {
  await page.locator("[data-testid=add-location]").click();
  // When adding another location, the dropdown opens automatically. So, we don't need to open it here.
  //
  await page.locator(`text="${locationOptionText}"`).click();
}

const fillLocation = async (page: Page, inputText: string, index: number, selectDisplayLocation = true) => {
  // Except the first location, dropdown automatically opens when adding another location
  if (index == 0) {
    await page.getByTestId("location-select").last().click();
  }
  await page.locator("text=In Person (Organizer Address)").last().click();

  const locationInputName = `locations[${index}].address`;
  await page.locator(`input[name="${locationInputName}"]`).waitFor();
  await page.locator(`input[name="locations[${index}].address"]`).fill(inputText);
  if (selectDisplayLocation) {
    await page.locator("[data-testid=display-location]").last().check();
  }
};

const checkDisplayLocation = async (page: Page) => {
  await page.locator("[data-testid=display-location]").last().check();
  await expect(page.locator("[data-testid=display-location]").last()).toBeChecked();
};

const unCheckDisplayLocation = async (page: Page) => {
  await page.locator("[data-testid=display-location]").last().uncheck();
  await expect(page.locator("[data-testid=display-location]").last()).toBeChecked({ checked: false });
};
