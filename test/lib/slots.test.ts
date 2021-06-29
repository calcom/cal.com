import getSlots from '@lib/slots';
import {it, expect} from '@jest/globals';
import MockDate from 'mockdate';
import dayjs, {Dayjs} from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

MockDate.set('2021-06-20T12:00:00Z');

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