import {
  Timezones,
  TestData,
  createBookingScenario,
  getDate,
} from "../../test/utils/bookingScenario/bookingScenario";

import { vi, test, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import getSlots from "@calcom/lib/slots";

expect.extend({
  toHaveTimeSlots(
    schedule: { slots?: Record<string, Array<{ time: string }>> } | Array<{ time: string }>,
    expectedTimes: string[],
    { dateString }: { dateString: string }
  ) {
    // If schedule is an array, use it directly; otherwise, use schedule.slots[dateString]
    const slotArray = Array.isArray(schedule) ? schedule : schedule.slots?.[dateString];

    const actualTimes =
      slotArray?.map((slot: { time: string }) => dayjs(slot.time).utc().format("HH:mm:ss.SSS[Z]")) || [];

    const pass = this.equals(actualTimes, expectedTimes);

    return {
      pass,
      message: () =>
        `Expected time slots ${pass ? "not " : ""}to be:\n` +
        `  ${this.utils.printExpected(expectedTimes)}\n` +
        `Received:\n` +
        `  ${this.utils.printReceived(actualTimes)}`,
    };
  },
});

test("Edge Case: Same day OOO entries that could accidentally be considered in past shouldn't crassh the getSchedule", async () => {
  vi.setSystemTime("2024-05-21T00:00:13Z");

  const { dateString: todayDateString } = getDate({ dateIncrement: 0 });
  const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

  await createBookingScenario({
    eventTypes: [
      {
        id: 1,
        slotInterval: 45,
        length: 45,
        users: [
          {
            id: 101,
          },
        ],
      },
    ],
    users: [
      {
        ...TestData.users.example,
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        outOfOffice: {
          dateRanges: [
            {
              start: `${todayDateString}T00:00:00.000Z`,
              end: `${todayDateString}T23:59:59.999Z`,
            },
          ],
        },
      },
    ],
  });

  const schedule = await getSlots({
    inviteeDate: dayjs(plus2DateString).tz(Timezones["+5:30"]),
    frequency: 45,
    minimumBookingNotice: 0,
    workingHours: TestData.schedules.IstWorkHours.availability.map((wh) => ({
      ...wh,
      startTime: 210, // 03:30 UTC = 9:00 AM IST
      endTime: 690, // 11:30 UTC = 5:00 PM IST
    })),
    eventLength: 45,
    organizerTimeZone: Timezones["+5:30"],
  });

  // Verify thst we get slots for the requested dates
  expect(schedule).toHaveTimeSlots(
    [
      "03:30:00.000Z",
      "04:15:00.000Z",
      "05:00:00.000Z",
      "05:45:00.000Z",
      "06:30:00.000Z",
      "07:15:00.000Z",
      "08:00:00.000Z",
      "08:45:00.000Z",
      "09:30:00.000Z",
      "10:15:00.000Z",
    ],
    {
      dateString: plus2DateString,
    }
  );
});

test("No Working Hours: Should return no slots when no working hours are defined", async () => {
  // Set a fixed date for testing
  vi.setSystemTime("2024-05-21T00:00:13Z");
  const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

  const schedule = await getSlots({
    inviteeDate: dayjs(plus2DateString).tz(Timezones["+5:30"]),
    frequency: 45,
    minimumBookingNotice: 0,
    workingHours: [], // No working hours defined
    eventLength: 45,
    organizerTimeZone: Timezones["+5:30"],
  });

  expect(schedule).toHaveTimeSlots(
    [], // Expect no slots
    {
      dateString: plus2DateString,
    }
  );
});

test("Working Hours with Gaps: Should handle working hours with gaps correctly", async () => {
  // Set a fixed date for testing
  vi.setSystemTime("2024-05-21T00:00:13Z");
  const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

  const schedule = await getSlots({
    inviteeDate: dayjs(plus2DateString).tz(Timezones["+5:30"]),
    frequency: 45,
    minimumBookingNotice: 0,
    workingHours: [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: 210, // 03:30 UTC = 9:00 AM IST
        endTime: 390, // 06:30 UTC = 12:00 PM IST (Gap until 2 PM)
      },
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: 510, // 08:30 UTC = 2:00 PM IST (Gap from 12 PM to 2 PM)
        endTime: 690, // 11:30 UTC = 5:00 PM IST
      },
    ],
    eventLength: 45,
    organizerTimeZone: Timezones["+5:30"],
  });

  expect(schedule).toHaveTimeSlots(
    [
      "03:30:00.000Z",
      "04:15:00.000Z",
      "05:00:00.000Z",
      "05:45:00.000Z",
      "08:30:00.000Z",
      "09:15:00.000Z",
      "10:00:00.000Z",
      "10:45:00.000Z",
    ],
    {
      dateString: plus2DateString,
    }
  );
});
