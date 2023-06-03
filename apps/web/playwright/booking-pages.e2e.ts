import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { testBothBookers } from "./lib/new-booker";
import {
  bookFirstEvent,
  bookOptinEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
  testEmail,
  testName,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => users.deleteAll());

testBothBookers.describe("free user", (bookerVariant) => {
  test.beforeEach(async ({ page, users }) => {
    const free = await users.create();
    await page.goto(`/${free.username}`);
  });

  test("cannot book same slot multiple times", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    // Kept in if statement here, since it's only temporary
    // until the old booker isn't used anymore, and I wanted
    // to change the test as little as possible.
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (bookerVariant !== "new-booker") {
      // Navigate to book page
      await page.waitForURL((url) => {
        return url.pathname.endsWith("/book");
      });
    }

    // save booking url
    const bookingUrl: string = page.url();

    // book same time spot twice
    await bookTimeSlot(page);

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // return to same time spot booking page
    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot(page);

    // check for error message
    await expect(page.locator("[data-testid=booking-fail]")).toBeVisible();
  });
});

testBothBookers.describe("pro user", () => {
  test.beforeEach(async ({ page, users }) => {
    const pro = await users.create();
    await page.goto(`/${pro.username}`);
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    const $eventTypes = page.locator("[data-testid=event-types] > *");
    expect(await $eventTypes.count()).toBeGreaterThanOrEqual(2);
  });

  test("book an event first day in next month", async ({ page }) => {
    await bookFirstEvent(page);
  });

  test("can reschedule a booking", async ({ page, users, bookings }) => {
    const [pro] = users.get();
    const [eventType] = pro.eventTypes;
    await bookings.create(pro.id, pro.username, eventType.id);

    await pro.login();
    await page.goto("/bookings/upcoming");
    await page.waitForSelector('[data-testid="bookings"]');
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectSecondAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.locator('[data-testid="confirm-reschedule-button"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking");
    });
  });

  test("Can cancel the recently created booking and rebook the same timeslot", async ({
    page,
    users,
  }, testInfo) => {
    // Because it tests the entire booking flow + the cancellation + rebooking
    test.setTimeout(testInfo.timeout * 3);
    await bookFirstEvent(page);
    await expect(page.locator(`[data-testid="attendee-email-${testEmail}"]`)).toHaveText(testEmail);
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    const [pro] = users.get();
    await pro.login();

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').first().click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking/");
    });
    await page.locator('[data-testid="cancel"]').click();

    const cancelledHeadline = await page.locator('[data-testid="cancelled-headline"]').innerText();

    expect(cancelledHeadline).toBe("This event is cancelled");

    await expect(page.locator(`[data-testid="attendee-email-${testEmail}"]`)).toHaveText(testEmail);
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    await page.goto(`/${pro.username}`);
    await bookFirstEvent(page);
  });

  test("can book an event that requires confirmation and then that booking can be accepted by organizer", async ({
    page,
    users,
  }) => {
    await bookOptinEvent(page);
    const [pro] = users.get();
    await pro.login();

    await page.goto("/bookings/unconfirmed");
    await Promise.all([
      page.click('[data-testid="confirm"]'),
      page.waitForResponse((response) => response.url().includes("/api/trpc/bookings/confirm")),
    ]);
    // This is the only booking in there that needed confirmation and now it should be empty screen
    await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
  });

  test("can book with multiple guests", async ({ page, users }) => {
    const additionalGuests = ["test@gmail.com", "test2@gmail.com"];

    await page.click('[data-testid="event-type-link"]');
    await selectFirstAvailableTimeSlotNextMonth(page);
    await page.fill('[name="name"]', "test1234");
    await page.fill('[name="email"]', "test1234@example.com");
    await page.locator('[data-testid="add-guests"]').click();

    await page.locator('input[type="email"]').nth(1).fill(additionalGuests[0]);
    await page.locator('[data-testid="add-another-guest"]').click();
    await page.locator('input[type="email"]').nth(2).fill(additionalGuests[1]);

    await page.locator('[data-testid="confirm-book-button"]').click();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    additionalGuests.forEach(async (email) => {
      await expect(page.locator(`[data-testid="attendee-email-${email}"]`)).toHaveText(email);
    });
  });
});
