import { expect, it } from "@jest/globals";
import MockDate from "mockdate";

import dayjs from "@calcom/dayjs";
import getSlots from "@calcom/lib/slots";

import { MINUTES_DAY_END, MINUTES_DAY_START } from "@lib/availability";
import { getFilteredTimes } from "@lib/hooks/useSlots";

MockDate.set("2021-06-20T11:59:59Z");

it("can fit 24 hourly slots for an empty day", async () => {
  // 24h in a day.
  expect(
    getSlots({
      inviteeDate: dayjs.utc().add(1, "day"),
      frequency: 60,
      minimumBookingNotice: 0,
      workingHours: [
        {
          days: Array.from(Array(7).keys()),
          startTime: MINUTES_DAY_START,
          endTime: MINUTES_DAY_END,
        },
      ],
      eventLength: 60,
    })
  ).toHaveLength(24);
});

// TODO: This test is sound; it should pass!
it("only shows future booking slots on the same day", async () => {
  // The mock date is 1s to midday, so 12 slots should be open given 0 booking notice.
  expect(
    getSlots({
      inviteeDate: dayjs.utc(),
      frequency: 60,
      minimumBookingNotice: 0,
      workingHours: [
        {
          days: Array.from(Array(7).keys()),
          startTime: MINUTES_DAY_START,
          endTime: MINUTES_DAY_END,
        },
      ],
      eventLength: 60,
    })
  ).toHaveLength(12);
});

it("can cut off dates that due to invitee timezone differences fall on the next day", async () => {
  expect(
    getSlots({
      inviteeDate: dayjs().tz("Europe/Amsterdam").startOf("day"), // time translation +01:00
      frequency: 60,
      minimumBookingNotice: 0,
      workingHours: [
        {
          days: [0],
          startTime: 23 * 60, // 23h
          endTime: MINUTES_DAY_END,
        },
      ],
      eventLength: 60,
    })
  ).toHaveLength(0);
});

it("can cut off dates that due to invitee timezone differences fall on the previous day", async () => {
  const workingHours = [
    {
      days: [0],
      startTime: MINUTES_DAY_START,
      endTime: 1 * 60, // 1h
    },
  ];
  expect(
    getSlots({
      inviteeDate: dayjs().tz("Atlantic/Cape_Verde").startOf("day"), // time translation -01:00
      frequency: 60,
      minimumBookingNotice: 0,
      workingHours,
      eventLength: 60,
    })
  ).toHaveLength(0);
});

it("adds minimum booking notice correctly", async () => {
  // 24h in a day.
  expect(
    getSlots({
      inviteeDate: dayjs.utc().add(1, "day").startOf("day"),
      frequency: 60,
      minimumBookingNotice: 1500,
      workingHours: [
        {
          days: Array.from(Array(7).keys()),
          startTime: MINUTES_DAY_START,
          endTime: MINUTES_DAY_END,
        },
      ],
      eventLength: 60,
    })
  ).toHaveLength(11);
});

it("adds buffer time", async () => {
  expect(
    getFilteredTimes({
      times: getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 60,
        minimumBookingNotice: 0,
        workingHours: [
          {
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      }),
      busy: [
        {
          start: dayjs.utc("2021-06-21 12:50:00", "YYYY-MM-DD HH:mm:ss").toDate(),
          end: dayjs.utc("2021-06-21 13:50:00", "YYYY-MM-DD HH:mm:ss").toDate(),
        },
      ],
      eventLength: 60,
      beforeBufferTime: 15,
      afterBufferTime: 15,
    })
  ).toHaveLength(20);
});

it("adds buffer time with custom slot interval", async () => {
  expect(
    getFilteredTimes({
      times: getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 5,
        minimumBookingNotice: 0,
        workingHours: [
          {
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      }),
      busy: [
        {
          start: dayjs.utc("2021-06-21 12:50:00", "YYYY-MM-DD HH:mm:ss").toDate(),
          end: dayjs.utc("2021-06-21 13:50:00", "YYYY-MM-DD HH:mm:ss").toDate(),
        },
      ],
      eventLength: 60,
      beforeBufferTime: 15,
      afterBufferTime: 15,
    })
  ).toHaveLength(239);
});
