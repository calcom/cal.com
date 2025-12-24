/**
 * These e2e tests only aim to cover standard cases
 * Edge cases are currently handled in integration tests only
 */
import { expect } from "@playwright/test";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { entries } from "@calcom/prisma/zod-utils";

import { test } from "./lib/fixtures";
import { bookTimeSlot, createUserWithLimits, expectSlotNotAllowedToBook } from "./lib/testUtils";

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
  return date.add(1, "month").day(date.day());
};

const getLastEventUrlWithMonth = (user: Awaited<ReturnType<typeof createUserWithLimits>>, date: Dayjs) => {
  return `/${user.username}/${user.eventTypes.at(-1)?.slug}?month=${date.format("YYYY-MM")}`;
};

test.describe("Duration limits", () => {
  entries(BOOKING_LIMITS_SINGLE).forEach(([limitKey, bookingLimit]) => {
    const limitUnit = intervalLimitKeyToUnit(limitKey);

    // test one limit at a time
    test(limitUnit, async ({ page, users }) => {
      const slug = `duration-limit-${limitUnit}`;
      const singleLimit = { [limitKey]: bookingLimit * EVENT_LENGTH };

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits: singleLimit,
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

      await test.step("can book up to limit", async () => {
        for (let i = 0; i < bookingLimit; i++) {
          await bookingDay.click();

          await page.getByTestId("time").nth(0).click();
          await bookTimeSlot(page);

          slotUrl = page.url();

          await expect(page.getByTestId("success-page")).toBeVisible();

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
      const slug = "duration-limit-multiple-day";

      const durationLimits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitKey, bookingLimit]) => {
        return {
          ...limits,
          [limitKey]: bookingLimit * EVENT_LENGTH,
        };
      }, {} as Record<keyof IntervalLimit, number>);

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits,
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
      const slug = "duration-limit-multiple-week";

      const durationLimits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitKey, bookingLimit]) => {
        return {
          ...limits,
          [limitKey]: bookingLimit * EVENT_LENGTH,
        };
      }, {} as Record<keyof IntervalLimit, number>);

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits,
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
      const slug = "duration-limit-multiple-month";

      const durationLimits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitKey, bookingLimit]) => {
        return {
          ...limits,
          [limitKey]: bookingLimit * EVENT_LENGTH,
        };
      }, {} as Record<keyof IntervalLimit, number>);

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits,
      });

      const baseBookingDate = firstMondayInBookingMonth;
      const eventTypeId = user.eventTypes.at(-1)?.id;
      if (!eventTypeId) throw new Error("Event type not found");

      for (let i = 0; i < 2; i++) {
        const date = baseBookingDate.add(i, "day").hour(10).minute(0);
        await bookings.create(user.id, user.username, eventTypeId, {
          startTime: date.toDate(),
          endTime: date.add(EVENT_LENGTH, "minutes").toDate(),
        });
      }

      // Move to next week for month limit test (similar to booking-limits test)
      const bookingDate = baseBookingDate.add(1, "week");
      const monthLimitValue = BOOKING_LIMITS_MULTIPLE.PER_MONTH;
      const bookingsToMake = monthLimitValue - 2;

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
      const slug = "duration-limit-multiple-year";

      const durationLimits = entries(BOOKING_LIMITS_MULTIPLE).reduce((limits, [limitKey, bookingLimit]) => {
        return {
          ...limits,
          [limitKey]: bookingLimit * EVENT_LENGTH,
        };
      }, {} as Record<keyof IntervalLimit, number>);

      const user = await createUserWithLimits({
        users,
        slug,
        length: EVENT_LENGTH,
        durationLimits,
      });

      const baseBookingDate = firstMondayInBookingMonth;
      const eventTypeId = user.eventTypes.at(-1)?.id;
      if (!eventTypeId) throw new Error("Event type not found");

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

      const yearLimitValue = BOOKING_LIMITS_MULTIPLE.PER_YEAR;
      const bookingsToMake = yearLimitValue - 3;

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
