import { expect } from "@playwright/test";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { randomString } from "@calcom/lib/random";
import { entries } from "@calcom/prisma/zod-utils";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { test } from "./lib/fixtures";
import {
  bookFirstEvent,
  bookOptinEvent,
  bookTimeSlot,
  expectEmailsToHaveSubject,
  selectFirstAvailableTimeSlotNextMonth,
  testEmail,
  testName,
} from "./lib/testUtils";

const freeUserObj = { name: `Free-user-${randomString(3)}` };
test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("free user", () => {
  test.beforeEach(async ({ page, users }) => {
    const free = await users.create(freeUserObj);
    await page.goto(`/${free.username}`);
  });

  test("cannot book same slot multiple times", async ({ page, users, emails }) => {
    const [user] = users.get();
    const bookerObj = { email: `testEmail-${randomString(4)}@example.com`, name: "testBooker" };
    // Click first event type
    await page.click('[data-testid="event-type-link"]');

    await selectFirstAvailableTimeSlotNextMonth(page);

    await bookTimeSlot(page, bookerObj);

    // save booking url
    const bookingUrl: string = page.url();

    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    const { title: eventTitle } = await user.getFirstEventAsOwner();

    await expectEmailsToHaveSubject({
      emails,
      organizer: user,
      booker: bookerObj,
      eventTitle,
    });
    await page.goto(bookingUrl);

    // book same time spot again
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=booking-fail]")).toBeVisible({ timeout: 1000 });
  });
});

test.describe("pro user", () => {
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

    await pro.apiLogin();
    await page.goto("/bookings/upcoming");
    await page.waitForSelector('[data-testid="bookings"]');
    await page.locator('[data-testid="edit_booking"]').nth(0).click();
    await page.locator('[data-testid="reschedule"]').click();
    await page.waitForURL((url) => {
      const bookingId = url.searchParams.get("rescheduleUid");
      return !!bookingId;
    });
    await selectFirstAvailableTimeSlotNextMonth(page);

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
    await pro.apiLogin();

    await page.goto("/bookings/upcoming");
    await page.locator('[data-testid="cancel"]').click();
    await page.waitForURL((url) => {
      return url.pathname.startsWith("/booking/");
    });
    await page.locator('[data-testid="confirm_cancel"]').click();

    const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
    await expect(cancelledHeadline).toBeVisible();

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
    await pro.apiLogin();

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

  test("Time slots should be reserved when selected", async ({ context, page }) => {
    await page.click('[data-testid="event-type-link"]');

    const initialUrl = page.url();
    await selectFirstAvailableTimeSlotNextMonth(page);
    const pageTwo = await context.newPage();
    await pageTwo.goto(initialUrl);
    await pageTwo.waitForURL(initialUrl);

    await pageTwo.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLink = pageTwo.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();

    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="incrementMonth"]').waitFor();
    await pageTwo.click('[data-testid="incrementMonth"]');
    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

    // 9:30 should be the first available time slot
    await pageTwo.locator('[data-testid="time"]').nth(0).waitFor();
    const firstSlotAvailable = pageTwo.locator('[data-testid="time"]').nth(0);
    // Find text inside the element
    const firstSlotAvailableText = await firstSlotAvailable.innerText();
    expect(firstSlotAvailableText).toContain("9:30");
  });

  test("Time slots are not reserved when going back via Cancel button on Event Form", async ({
    context,
    page,
  }) => {
    const initialUrl = page.url();
    await page.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLink = page.locator('[data-testid="event-type-link"]').first();
    await eventTypeLink.click();
    await selectFirstAvailableTimeSlotNextMonth(page);

    const pageTwo = await context.newPage();
    await pageTwo.goto(initialUrl);
    await pageTwo.waitForURL(initialUrl);

    await pageTwo.waitForSelector('[data-testid="event-type-link"]');
    const eventTypeLinkTwo = pageTwo.locator('[data-testid="event-type-link"]').first();
    await eventTypeLinkTwo.click();

    await page.locator('[data-testid="back"]').waitFor();
    await page.click('[data-testid="back"]');

    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="incrementMonth"]').waitFor();
    await pageTwo.click('[data-testid="incrementMonth"]');
    await pageTwo.waitForLoadState("networkidle");
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
    await pageTwo.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

    await pageTwo.locator('[data-testid="time"]').nth(0).waitFor();
    const firstSlotAvailable = pageTwo.locator('[data-testid="time"]').nth(0);

    // Find text inside the element
    const firstSlotAvailableText = await firstSlotAvailable.innerText();
    expect(firstSlotAvailableText).toContain("9:00");
  });
});

test.describe("prefill", () => {
  test("logged in", async ({ page, users }) => {
    const prefill = await users.create({ name: "Prefill User" });
    await prefill.apiLogin();
    await page.goto("/pro/30min");

    await test.step("from session", async () => {
      await selectFirstAvailableTimeSlotNextMonth(page);
      await expect(page.locator('[name="name"]')).toHaveValue(prefill.name || "");
      await expect(page.locator('[name="email"]')).toHaveValue(prefill.email);
    });

    await test.step("from query params", async () => {
      const url = new URL(page.url());
      url.searchParams.set("name", testName);
      url.searchParams.set("email", testEmail);
      await page.goto(url.toString());

      await expect(page.locator('[name="name"]')).toHaveValue(testName);
      await expect(page.locator('[name="email"]')).toHaveValue(testEmail);
    });
  });

  test("logged out", async ({ page, users }) => {
    await page.goto("/pro/30min");

    await test.step("from query params", async () => {
      await selectFirstAvailableTimeSlotNextMonth(page);

      const url = new URL(page.url());
      url.searchParams.set("name", testName);
      url.searchParams.set("email", testEmail);
      await page.goto(url.toString());

      await expect(page.locator('[name="name"]')).toHaveValue(testName);
      await expect(page.locator('[name="email"]')).toHaveValue(testEmail);
    });
  });
});

const EVENT_LENGTH = 30;
const BOOKING_LIMITS_SINGLE = {
  day: 2,
  week: 2,
  month: 2,
  year: 2,
};
const BOOKING_LIMITS_MULTIPLE = {
  day: 1,
  week: 2,
  month: 3,
  year: 4,
};

// prevent tests from crossing year boundaries (if already in Nov, start booking in Jan instead of Dec)
const firstDayInBookingMonth =
  dayjs().month() === 10 ? dayjs().add(1, "year").month(0).date(1) : dayjs().add(1, "month").date(1);

// avoid weekly edge cases
const firstMondayInBookingMonth = firstDayInBookingMonth.day(
  firstDayInBookingMonth.date() === firstDayInBookingMonth.startOf("week").date() ? 1 : 8
);

// ensure we land on the same weekday when incrementing month
const incrementDate = (date: Dayjs, unit: dayjs.ManipulateType) => {
  if (unit !== "month") return date.add(1, unit);
  return date.add(1, "month").day(date.day());
};

// TODO: verify that past bookings count towards limits
// TODO: consider edge cases, e.g. partial weeks

["booking", "duration"].forEach((limitType) => {
  test.describe(`${limitType} limits`, () => {
    entries(BOOKING_LIMITS_SINGLE).forEach(([limitUnit, bookingLimit]) => {
      const limitValue = limitType === "duration" ? bookingLimit * EVENT_LENGTH : bookingLimit;

      // test one limit at a time
      test(limitUnit, async ({ page, users }) => {
        const slug = `${limitType}-limit-${limitUnit}`;
        const limit = { [`PER_${limitUnit.toUpperCase()}`]: limitValue };
        const user = await users.create({
          eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, [`${limitType}Limits`]: limit }],
        });

        let dayUrl = "";
        let slotUrl = "";

        await page.goto(`/${user.username}/${slug}?month=${firstMondayInBookingMonth.format("YYYY-MM")}`);

        const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
        const bookingDay = availableDays.getByText(firstMondayInBookingMonth.date().toString(), {
          exact: true,
        });

        // finish rendering days before counting
        await expect(bookingDay).toBeVisible({ timeout: 10_000 });
        const availableDaysBefore = await availableDays.count();

        await test.step("can book up to limit", async () => {
          for (let i = 0; i < bookingLimit; i++) {
            await bookingDay.click();

            dayUrl = page.url();

            await page.getByTestId("time").nth(0).click();
            await bookTimeSlot(page);

            slotUrl = page.url();

            await expect(page.getByTestId("success-page")).toBeVisible();

            await page.goto(`/${user.username}/${slug}?month=${firstMondayInBookingMonth.format("YYYY-MM")}`);
          }
        });

        const expectedAvailableDays = {
          day: -1,
          week: -5,
          month: 0,
          year: 0,
        };

        await test.step("but not over", async () => {
          await page.goto(dayUrl);

          // ensure the day we just booked is now blocked
          await expect(page.getByTestId("day").nth(0)).toBeVisible();
          await expect(page.getByTestId("time")).toBeHidden();

          const availableDaysAfter = await availableDays.count();

          // equals 0 if no available days, otherwise signed difference
          expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
            expectedAvailableDays[limitUnit]
          );

          // try to book directly via form page
          await page.goto(slotUrl);
          await bookTimeSlot(page);

          await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
        });

        await test.step(`month after booking`, async () => {
          await page.goto(
            `/${user.username}/${slug}?month=${firstMondayInBookingMonth.add(1, "month").format("YYYY-MM")}`
          );

          // finish rendering days before counting
          await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

          // the month after we made bookings should have availability unless we hit a yearly limit
          await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
        });
      });
    });

    test("multiple", async ({ page, users }) => {
      const slug = `${limitType}-limit-multiple`;
      const limits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitUnit, bookingLimit]) => {
        const limitValue = limitType === "duration" ? bookingLimit * EVENT_LENGTH : bookingLimit;
        return {
          ...limits,
          [`PER_${limitUnit.toUpperCase()}`]: limitValue,
        };
      }, {} as Record<keyof IntervalLimit, number>);

      const user = await users.create({
        eventTypes: [{ title: slug, slug, length: EVENT_LENGTH, [`${limitType}Limits`]: limits }],
      });

      let dayUrl = "";
      let slotUrl = "";

      let bookingDate = firstMondayInBookingMonth;

      // keep track of total bookings across multiple limits
      let bookingCount = 0;

      for (const [limitUnit, limitValue] of entries(BOOKING_LIMITS_MULTIPLE)) {
        await page.goto(`/${user.username}/${slug}?month=${bookingDate.format("YYYY-MM")}`);

        const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
        const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

        // finish rendering days before counting
        await expect(bookingDay).toBeVisible({ timeout: 10_000 });

        const availableDaysBefore = await availableDays.count();

        await test.step(`can book up ${limitUnit} to limit`, async () => {
          for (let i = 0; i + bookingCount < limitValue; i++) {
            await bookingDay.click();

            dayUrl = page.url();

            await page.getByTestId("time").nth(0).click();
            await bookTimeSlot(page);
            bookingCount++;

            slotUrl = page.url();

            await expect(page.getByTestId("success-page")).toBeVisible();

            await page.goto(`/${user.username}/${slug}?month=${bookingDate.format("YYYY-MM")}`);
          }
        });

        const expectedAvailableDays = {
          day: -1,
          week: -4, // one day will already be blocked by daily limit
          month: 0,
          year: 0,
        };

        await test.step("but not over", async () => {
          await page.goto(dayUrl);

          // ensure the day we just booked is now blocked
          await expect(page.getByTestId("day").nth(0)).toBeVisible();
          await expect(page.getByTestId("time")).toBeHidden();

          const availableDaysAfter = await availableDays.count();

          // equals 0 if no available days, otherwise signed difference
          expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
            expectedAvailableDays[limitUnit]
          );

          // try to book directly via form page
          await page.goto(slotUrl);
          await bookTimeSlot(page);

          await expect(page.getByTestId("booking-fail")).toBeVisible({ timeout: 1000 });
        });

        await test.step(`month after booking`, async () => {
          await page.goto(`/${user.username}/${slug}?month=${bookingDate.add(1, "month").format("YYYY-MM")}`);

          // finish rendering days before counting
          await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

          // the month after we made bookings should have availability unless we hit a yearly limit
          await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
        });

        // increment date by unit after hitting each limit
        bookingDate = incrementDate(bookingDate, limitUnit);
      }
    });
  });
});
