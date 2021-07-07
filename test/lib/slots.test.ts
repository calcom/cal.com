import getSlots from "@lib/slots";
import { expect, it } from "@jest/globals";
import MockDate from "mockdate";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

MockDate.set('2021-06-20T11:59:59Z');

it('can fit 24 hourly slots for an empty day', async () => {
  // 24h in a day.
  expect(getSlots({
    inviteeDate: dayjs().add(1, 'day'),
    frequency: 60,
    workingHours: [
      { days: [...Array(7).keys()], startTime: 0, endTime: 1440 }
    ],
    organizerTimeZone: 'Europe/London'
  })).toHaveLength(24);
});

it('only shows future booking slots on the same day', async () => {
  // The mock date is 1s to midday, so 12 slots should be open given 0 booking notice.
  expect(getSlots({
    inviteeDate: dayjs(),
    frequency: 60,
    workingHours: [
      { days: [...Array(7).keys()], startTime: 0, endTime: 1440 }
    ],
    organizerTimeZone: 'GMT'
  })).toHaveLength(12);
});

it('can cut off dates that due to invitee timezone differences fall on the next day', async () => {
  expect(getSlots({
    inviteeDate: dayjs().tz('Europe/Amsterdam').startOf('day'), // time translation +01:00
    frequency: 60,
    workingHours: [
      { days: [0], startTime: 1380, endTime: 1440 }
    ],
    organizerTimeZone: 'Europe/London'
  })).toHaveLength(0);
});

it('can cut off dates that due to invitee timezone differences fall on the previous day', async () => {
  expect(getSlots({
    inviteeDate: dayjs().startOf('day'), // time translation -01:00
    frequency: 60,
    workingHours: [
      { days: [0], startTime: 0, endTime: 60 }
    ],
    organizerTimeZone: 'Europe/London'
  })).toHaveLength(0);
});
