import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookFirstEvent,
  bookOptinEvent,
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => users.deleteAll());

test.describe("free user", () => {
  test.beforeEach(async ({ page, users }) => {
    const free = await users.create();
    await page.goto(`/${free.username}`);
  });

  test("cannot book same slot multiple times", async ({ page }) => {
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    // Navigate to book page
    await page.waitForNavigation({
      url(url) {
        return url.pathname.endsWith("/book");
      },
    });

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

test.describe("pro user", () => {
  test.beforeEach(async ({ page, users }) => {
    const pro = await users.create();
    await page.goto(`/${pro.username}`);
  });

  test("pro user's page has at least 2 visible events", async ({ page }) => {
    // await page.pause();
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
    await page.waitForNavigation({
      url: (url) => {
        const bookingId = url.searchParams.get("rescheduleUid");
        return !!bookingId;
      },
    });
    await selectSecondAvailableTimeSlotNextMonth(page);
    // --- fill form
    await page.locator('[data-testid="confirm-reschedule-button"]').click();
    await page.waitForNavigation({
      url(url) {
        return url.pathname.startsWith("/booking");
      },
    });
  });

  test("Can cancel the recently created booking and rebook the same timeslot", async ({ page, users }) => {
    await bookFirstEvent(page);

    const [pro] = users.get();
    await pro.login();

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').first().click();
    await page.waitForNavigation({
      url: (url) => {
        return url.pathname.startsWith("/booking");
      },
    });
    await page.locator('[data-testid="cancel"]').click();

    const cancelledHeadline = await page.locator('[data-testid="cancelled-headline"]').innerText();

    await expect(cancelledHeadline).toBe("This event is cancelled");

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
      page.waitForResponse((response) => response.url().includes("/api/trpc/viewer.bookings.confirm")),
    ]);
    // This is the only booking in there that needed confirmation and now it should be empty screen
    await expect(page.locator('[data-testid="empty-screen"]')).toBeVisible();
  });
});
