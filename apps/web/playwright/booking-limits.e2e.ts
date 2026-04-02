/**
 * These e2e tests only aim to cover standard cases
 * Edge cases are currently handled in integration tests only
 */

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { entries } from "@calcom/prisma/zod-utils";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  confirmReschedule,
  createUserWithLimits,
  expectSlotNotAllowedToBook,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

// used as a multiplier for duration limits
const EVENT_LENGTH = 30;

// limits used when testing each limit separately
const BOOKING_LIMITS_SINGLE = {
  PER_DAY: 2,
  PER_WEEK: 2,
  PER_MONTH: 2,
  PER_YEAR: 2,
};

// limits used when testing multiple limits together
const BOOKING_LIMITS_MULTIPLE = {
  PER_DAY: 1,
  PER_WEEK: 2,
  PER_MONTH: 3,
  PER_YEAR: 4,
};

// prevent tests from crossing year boundaries - if currently in Oct or later, start booking in Jan instead of Nov
// (we increment months twice when checking multiple limits)
const firstDayInBookingMonth =
  dayjs().month() >= 9 ? dayjs().add(1, "year").month(0).date(1) : dayjs().add(1, "month").date(1);

// avoid weekly edge cases
const firstMondayInBookingMonth = firstDayInBookingMonth.day(
  firstDayInBookingMonth.date() === firstDayInBookingMonth.startOf("week").date() ? 1 : 8
);

// ensure we land on the same weekday when incrementing month
const incrementDate = (date: Dayjs, unit: dayjs.ManipulateType) => {
  if (unit !== "month") return date.add(1, unit);
  // Find the first occurrence of the same weekday in the next month
  // Note: .day() sets the day of the week for the CURRENT week, which can
  // return a date in the previous month. Instead, we calculate the correct date.
  const targetDay = date.day();
  const startOfNextMonth = date.add(1, "month").startOf("month");
  const firstDayOfMonth = startOfNextMonth.day();
  let daysToAdd = targetDay - firstDayOfMonth;
  if (daysToAdd < 0) daysToAdd += 7;
  return startOfNextMonth.add(daysToAdd, "day");
};

const getLastEventUrlWithMonth = (user: Awaited<ReturnType<typeof createUserWithLimits>>, date: Dayjs) => {
  return `/${user.username}/${user.eventTypes.at(-1)?.slug}?month=${date.format("YYYY-MM")}`;
};

test.describe("Booking limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitKey, bookingLimit]) => {
    const limitUnit = intervalLimitKeyToUnit(limitKey);

    // test one limit at a time
    test.fixme(`Per ${limitUnit}`, async ({ page, users }) => {
      const slug = `booking-limit-${limitUnit}`;
      const singleLimit = { [limitKey]: bookingLimit };

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: singleLimit,
      });

      let slotUrl = "";

      const monthUrl = getLastEventUrlWithMonth(user, firstMondayInBookingMonth);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(firstMondayInBookingMonth.date().toString(), {
        exact: true,
      });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let latestRescheduleUrl: string | null = null;
      await test.step("can book up to limit", async () => {
        for (let i = 0; i < bookingLimit; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();
          latestRescheduleUrl = await page
            .locator('span[data-testid="reschedule-link"] > a')
            .getAttribute("href");

          await page.goto(monthUrl);
        }
      });

      const expectedAvailableDays = {
        day: -1,
        week: -5,
        month: 0,
        year: 0,
      };

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(
          expectedAvailableDays[limitUnit]
        );

        // try to book directly via form page
        await page.goto(slotUrl);
        await expectSlotNotAllowedToBook(page);
      });

      await test.step("but can reschedule", async () => {
        const bookingId = latestRescheduleUrl?.split("/").pop();
        const rescheduledBooking = await prisma.booking.findFirstOrThrow({ where: { uid: bookingId } });

        const year = rescheduledBooking.startTime.getFullYear();
        const month = String(rescheduledBooking.startTime.getMonth() + 1).padStart(2, "0");
        const day = String(rescheduledBooking.startTime.getDate()).padStart(2, "0");

        await page.goto(
          `/${user.username}/${
            user.eventTypes.at(-1)?.slug
          }?rescheduleUid=${bookingId}&date=${year}-${month}-${day}&month=${year}-${month}`
        );

        const formerDay = availableDays.getByText(rescheduledBooking.startTime.getDate().toString(), {
          exact: true,
        });
        await expect(formerDay).toBeVisible();

        const formerTimeElement = page.locator('[data-testid="former_time_p"]');
        await expect(formerTimeElement).toBeVisible();

        await page.locator('[data-testid="time"]').nth(0).click();

        await expect(page.locator('[name="name"]')).toBeDisabled();
        await expect(page.locator('[name="email"]')).toBeDisabled();

        await confirmReschedule(page);

        await expect(page.locator("[data-testid=success-page]")).toBeVisible();

        const newBooking = await prisma.booking.findFirstOrThrow({ where: { fromReschedule: bookingId } });
        expect(newBooking).not.toBeNull();

        const updatedRescheduledBooking = await prisma.booking.findFirstOrThrow({
          where: { uid: bookingId },
        });
        expect(updatedRescheduledBooking.status).toBe(BookingStatus.CANCELLED);

        await prisma.booking.deleteMany({
          where: {
            id: {
              in: [newBooking.id, rescheduledBooking.id],
            },
          },
        });
      });

      await test.step(`month after booking`, async () => {
        await page.goto(getLastEventUrlWithMonth(user, firstMondayInBookingMonth.add(1, "month")));

        // finish rendering days before counting
        await expect(page.getByTestId("day").nth(0)).toBeVisible({ timeout: 10_000 });

        // the month after we made bookings should have availability unless we hit a yearly limit
        await expect((await availableDays.count()) === 0).toBe(limitUnit === "year");
      });
    });
  });

  test.describe("multiple limits", () => {
    test("day limit with multiple limits set", async ({ page, users }) => {
      const slug = "booking-limit-multiple-day";

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: BOOKING_LIMITS_MULTIPLE,
      });

      const bookingDate = firstMondayInBookingMonth;
      const limitValue = BOOKING_LIMITS_MULTIPLE.PER_DAY;

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let slotUrl = "";

      await test.step("can book up to day limit", async () => {
        for (let i = 0; i < limitValue; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(-1);

        // try to book directly via form page
        await page.goto(slotUrl);

        await expectSlotNotAllowedToBook(page);
      });
    });

    test("week limit with multiple limits set", async ({ page, users, bookings }) => {
      const slug = "booking-limit-multiple-week";

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: BOOKING_LIMITS_MULTIPLE,
      });

      const baseBookingDate = firstMondayInBookingMonth;
      const eventTypeId = user.eventTypes.at(-1)?.id;
      if (!eventTypeId) throw new Error("Event type not found");

      // Pre-create 1 booking on Monday (same week as UI booking)
      // This satisfies the daily limit for Monday and counts toward the weekly limit
      const preBookingDate = baseBookingDate.hour(10).minute(0);
      await bookings.create(user.id, user.username, eventTypeId, {
        startTime: preBookingDate.toDate(),
        endTime: preBookingDate.add(EVENT_LENGTH, "minutes").toDate(),
      });

      // Test week limit on Tuesday (same week, different day to avoid daily limit conflict)
      // Need to book 1 more to hit weekly limit of 2 (1 already exists from pre-booking)
      const bookingDate = baseBookingDate.add(1, "day");
      const weekLimitValue = BOOKING_LIMITS_MULTIPLE.PER_WEEK;
      const bookingsToMake = weekLimitValue - 1;

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let slotUrl = "";

      await test.step("can book up to week limit", async () => {
        for (let i = 0; i < bookingsToMake; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // After hitting weekly limit, all remaining days in the week should be blocked
        // Monday was already blocked by daily limit, Tuesday is now blocked
        // The remaining weekdays (Wed-Fri) should also be blocked = 3 more days
        // Total blocked: 1 (Tuesday we just booked) + 3 (Wed-Fri) = 4 days
        // But Monday was already blocked before we started, so delta is -4
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(-4);

        // try to book directly via form page
        await page.goto(slotUrl);

        await expectSlotNotAllowedToBook(page);
      });
    });

    test("month limit with multiple limits set", async ({ page, users, bookings }) => {
      const slug = "booking-limit-multiple-month";

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: BOOKING_LIMITS_MULTIPLE,
      });

      // Pre-create bookings for day (1) and week (2 total, so 1 more) limits
      const baseBookingDate = firstMondayInBookingMonth;
      const eventTypeId = user.eventTypes.at(-1)?.id;
      if (!eventTypeId) throw new Error("Event type not found");

      // Create 2 bookings (day limit: 1, week limit: 2 total)
      // First booking on Monday at 10:00, second on Tuesday at 10:00
      for (let i = 0; i < 2; i++) {
        const date = baseBookingDate.add(i, "day").hour(10).minute(0);
        await bookings.create(user.id, user.username, eventTypeId, {
          startTime: date.toDate(),
          endTime: date.add(EVENT_LENGTH, "minutes").toDate(),
        });
      }

      // Test month limit - need to book 1 more (total 3, but 2 already exist)
      // Move to next week for month limit test (similar to week limit test)
      const bookingDate = baseBookingDate.add(1, "week");
      const monthLimitValue = BOOKING_LIMITS_MULTIPLE.PER_MONTH;
      const bookingsToMake = monthLimitValue - 2; // 2 already exist from previous limits

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let slotUrl = "";

      await test.step("can book up to month limit", async () => {
        for (let i = 0; i < bookingsToMake; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(0);

        // try to book directly via form page
        await page.goto(slotUrl);

        await expectSlotNotAllowedToBook(page);
      });
    });

    test("year limit with multiple limits set", async ({ page, users, bookings }) => {
      const slug = "booking-limit-multiple-year";

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        bookingLimits: BOOKING_LIMITS_MULTIPLE,
      });

      // Pre-create bookings for day (1), week (2 total), and month (3 total) limits
      const baseBookingDate = firstMondayInBookingMonth;
      const eventTypeId = user.eventTypes.at(-1)?.id;
      if (!eventTypeId) throw new Error("Event type not found");

      // Create 3 bookings (day: 1, week: 2, month: 3 total)
      // Spread across different days to satisfy day/week/month limits
      // Monday, Tuesday, and next Monday (to span a week)
      const dates = [
        baseBookingDate.hour(10).minute(0),
        baseBookingDate.add(1, "day").hour(10).minute(0),
        baseBookingDate.add(1, "week").hour(10).minute(0),
      ];

      for (const date of dates) {
        await bookings.create(user.id, user.username, eventTypeId, {
          startTime: date.toDate(),
          endTime: date.add(EVENT_LENGTH, "minutes").toDate(),
        });
      }

      // Test year limit - need to book 1 more (total 4, but 3 already exist)
      const yearLimitValue = BOOKING_LIMITS_MULTIPLE.PER_YEAR;
      const bookingsToMake = yearLimitValue - 3; // 3 already exist from previous limits

      // Move to next month for year limit test
      const bookingDate = incrementDate(baseBookingDate, "month");

      const monthUrl = getLastEventUrlWithMonth(user, bookingDate);
      await page.goto(monthUrl);

      const availableDays = page.locator('[data-testid="day"][data-disabled="false"]');
      const bookingDay = availableDays.getByText(bookingDate.date().toString(), { exact: true });

      // finish rendering days before counting
      await expect(bookingDay).toBeVisible({ timeout: 10_000 });
      const availableDaysBefore = await availableDays.count();

      let slotUrl = "";

      await test.step("can book up to year limit", async () => {
        for (let i = 0; i < bookingsToMake; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

          await page.goto(monthUrl);
        }
      });

      await test.step("but not over", async () => {
        // should already have navigated to monthUrl - just ensure days are rendered
        await expect(page.getByTestId("day").nth(0)).toBeVisible();

        // ensure the day we just booked is now blocked
        await expect(bookingDay).toBeHidden({ timeout: 10_000 });

        const availableDaysAfter = await availableDays.count();

        // equals 0 if no available days, otherwise signed difference
        expect(availableDaysAfter && availableDaysAfter - availableDaysBefore).toBe(0);

        // try to book directly via form page
        await page.goto(slotUrl);

        await expectSlotNotAllowedToBook(page);
      });
    });
  });
});
