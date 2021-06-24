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
    length: 60,
  })).toHaveLength(24);
});

it('has slots that be in the same timezone as the invitee', async() => {
  expect(getSlots({
    inviteeDate: dayjs().add(1, 'day'),
    length: 60
  })[0].utcOffset()).toBe(-0);

  expect(getSlots({
    inviteeDate: dayjs().tz('Europe/London').add(1, 'day'),
    length: 60
  })[0].utcOffset()).toBe(dayjs().tz('Europe/London').utcOffset());
})

it('excludes slots that have already passed when invitee day equals today', async () => {
  expect(getSlots({ inviteeDate: dayjs(), length: 60 })).toHaveLength(12);
});

it('supports having slots in different utc offset than the invitee', async () => {
  expect(getSlots({ inviteeDate: dayjs(), length: 60 })).toHaveLength(12);
  expect(getSlots({ inviteeDate: dayjs().tz('Europe/Brussels'), length: 60 })).toHaveLength(14);
});