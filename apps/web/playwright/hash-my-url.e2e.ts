import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
} from "./lib/testUtils";

test.describe.configure({ mode: "serial" });

test.describe("private links creation and usage", () => {
  test.beforeEach(async ({ users }) => {
    const user = await users.create();
    await user.apiLogin();
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("generate private link and make a booking with it", async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await Promise.all([
      page.waitForURL("**/event-types"),
      page.getByTestId("event-types").locator("li a").first().click(),
    ]);

    await expect(page.locator("[data-testid=event-title]")).toBeVisible();

    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    const hashedLinkCheck = page.locator('[data-testid="multiplePrivateLinksCheck"]');
    await expect(hashedLinkCheck).toBeVisible();

    // ignore if it is already checked, and click if unchecked
    if (!(await hashedLinkCheck.isChecked())) {
      await hashedLinkCheck.click();
    }

    // Wait for the private link URL input to be visible and get its value
    const $url = await page.locator('[data-testid="private-link-url"]').inputValue();

    // click update
    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    // book using generated url hash
    await page.goto($url);
    await page.waitForURL((url) => {
      return url.searchParams.get("overlayCalendar") === "true";
    });
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    const successPage = page.getByTestId("success-page");
    await expect(successPage).toBeVisible();

    // hash regenerates after successful booking (only for usage-based links)
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
    await page.reload(); // ensure fresh state

    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    // After booking with a usage-based private link, the link should be expired
    await expect(page.locator('[data-testid="private-link-description"]')).toContainText(
      "Usage limit reached"
    );

    // Ensure that private URL is enabled after modifying the event type.
    // Additionally, if the slug is changed, ensure that the private URL is updated accordingly.
    await page.getByTestId("vertical-tab-basics").click();
    await page.locator("[data-testid=event-title]").first().fill("somethingrandom");
    await page.locator("[data-testid=event-slug]").first().fill("somethingrandom");
    await expect(page.locator('[data-testid="event-slug"]').first()).toHaveValue("somethingrandom");

    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    // Wait for the private link URL input to be visible and get its value
    const $url2 = await page.locator('[data-testid="private-link-url"]').inputValue();
    expect($url2.includes("somethingrandom")).toBeTruthy();
  });

  test("generate private link with future expiration date and make a booking with it", async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await Promise.all([
      page.waitForURL("**/event-types"),
      page.getByTestId("event-types").locator("li a").first().click(),
    ]);

    await expect(page.locator("[data-testid=event-title]")).toBeVisible();

    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    const privateLinkCheck = page.locator('[data-testid="multiplePrivateLinksCheck"]');
    await expect(privateLinkCheck).toBeVisible();

    // ignore if it is already checked, and click if unchecked
    if (!(await privateLinkCheck.isChecked())) {
      await privateLinkCheck.click();
    }

    // Wait for the private link URL input to be visible and get its value
    const $url = await page.locator('[data-testid="private-link-url"]').inputValue();
    await page.locator('[data-testid="private-link-settings"]').click();
    await expect(page.locator('[data-testid="private-link-radio-group"]')).toBeVisible();
    await page.locator('[data-testid="private-link-time"]').click();
    await page.locator('[data-testid="private-link-expiration-settings-save"]').click();
    await page.waitForLoadState("networkidle");
    // click update
    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    // book using generated url hash
    await page.goto($url);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    await expect(page.getByTestId("success-page")).toBeVisible();

    // hash regenerates after successful booking (only for usage-based links)
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
    await page.reload(); // ensure fresh state

    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    // After booking with a expiration date based private link, the link should still be valid
    await expect(page.locator('[data-testid="private-link-expired"]')).toBeHidden();
  });
  test("generate private link with 2 usages and make 2 bookings with it", async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await Promise.all([
      page.waitForURL("**/event-types"),
      page.getByTestId("event-types").locator("li a").first().click(),
    ]);

    await expect(page.locator("[data-testid=event-title]")).toBeVisible();

    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    const privateLinkCheck = page.locator('[data-testid="multiplePrivateLinksCheck"]');
    await expect(privateLinkCheck).toBeVisible();

    // ignore if it is already checked, and click if unchecked
    if (!(await privateLinkCheck.isChecked())) {
      await privateLinkCheck.click();
    }

    // Wait for the private link URL input to be visible and get its value
    const $url = await page.locator('[data-testid="private-link-url"]').inputValue();
    await page.locator('[data-testid="private-link-settings"]').click();
    await expect(page.locator('[data-testid="private-link-radio-group"]')).toBeVisible();
    await page.locator('[data-testid="private-link-usage-count"]').fill("2");
    await page.locator('[data-testid="private-link-expiration-settings-save"]').click();
    await page.waitForLoadState("networkidle");
    // click update
    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    // book using generated url hash
    await page.goto($url);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    await expect(page.getByTestId("success-page")).toBeVisible();

    // book again using generated url hash
    await page.goto($url);
    await page.waitForURL((url) => {
      return url.searchParams.get("overlayCalendar") === "true";
    });

    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    await expect(page.getByTestId("success-page")).toBeVisible();

    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
    await page.reload(); // ensure fresh state

    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator("[data-testid=vertical-tab-event_advanced_tab_title]").click();

    // After booking twice with a 2 usages based private link, the link should be expired
    await expect(page.locator('[data-testid="private-link-description"]')).toContainText(
      "Usage limit reached"
    );
  });
});
