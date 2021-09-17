import getSlots from "@lib/slots";
import { expect, it } from "@jest/globals";
import MockDate from "mockdate";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

describe("Get dates in in the same timeZone",  () => {

  beforeAll( async () => {
    MockDate.set("2021-06-20T11:59:59Z");
  });

  afterAll( async () => {
    MockDate.reset();
  });

  it("can fit 24 hourly slots for an empty day", async () => {
    expect(
      getSlots({
        date: dayjs().startOf('day').add(1, 'day'),
        frequency: 60,
      })
    ).toHaveLength(24);
  });

  it("only shows future booking slots on the same day", async () => {
    // The mock date is 1s to midday, so 12 slots should be open given 0 booking notice.
    expect(
      getSlots({
        frequency: 60,
      })
    ).toHaveLength(12); // current time is midday (see MockDate)
  });

  it("it does not allow you to book in the final hour (even without booking notice)", async () => {
    // Too late!
    expect(
      getSlots({
        frequency: 15,
        date: dayjs().endOf('day').subtract(25, 'minutes'),
        workingHours: [
          {
            days: [ 0, 1, 2, 3, 4, 5, 6 ],
            startTime: 480,
            endTime: 1380,
          }
        ]
      })
    ).toHaveLength(0); // current time is midday (see MockDate)
  });

  it('should not show the first 4 15 minute bookings because that time has already past', () => {

    MockDate.set("2021-09-17T03:38:00Z");
    expect(
      getSlots({
        frequency: 15,
        date: dayjs().utcOffset(60).startOf('day'),
        minimumBookingNotice: 0,
        workingHours: [
          {
            endTime: 1439,
            startTime: 540,
            days: [ 1, 2, 3, 4, 5 ]
          }
        ]
      })
    ).toHaveLength(56); // getting 60 at the time this test was written
  });

});

describe("Get dates for an invitee in a different timeZone",  () => {

  beforeAll( async () => {
    MockDate.set("2021-06-20T11:59:59Z");
  });

  afterAll( async () => {
    MockDate.reset();
  });

  it("different tz - multiple boundaries", async () => {
    // june 21th is a monday, midday UTC+1 should result in 00:00 & 01:00
    const slots = getSlots({
      date: dayjs().utcOffset(60).add(1, 'day').startOf('day'),
      frequency: 60,
      workingHours: [
        {
          days: [1],
          startTime: 0,
          endTime: 60,
        },
        {
          days: [0],
          startTime: 1380,
          endTime: 1440,
        }
      ]
    });

    expect(slots).toHaveLength(2);
    expect(slots[0].format()).toEqual("2021-06-21T01:00:00+01:00");
    expect(slots[1].format()).toEqual("2021-06-21T00:00:00+01:00");
  });

  it("different tz - can fit 12 hourly slots in local time as well", async () => {
    expect(
      getSlots({
        date: dayjs().utcOffset(60).startOf('day'),
        frequency: 60,
      })
    ).toHaveLength(12);
  });

});

describe("Minimum booking notices",  () => {

  /*
   * Booking notices function
   */

  beforeAll( async () => {
    MockDate.set("2021-06-20T12:00:00Z");
  });

  afterAll( async () => {
    MockDate.reset();
  });

  it("gets 10 (1h) slots when the time is 12:00:00 and the booking notice is 2h", async () => {
    // time is 1m to midday, - but there is a 2h booking notice; tests only slots past and including 2pm are returned
    expect(
      getSlots({
        date: dayjs(),
        frequency: 60,
        minimumBookingNotice: 120,
      })
    ).toHaveLength(10);
  });

  it("gets 0 slots when the booking notice runs past the current day", async () => {
    // time is 1m to midday, - but there is a 2h booking notice; tests only slots past and including 2pm are returned
    expect(
      getSlots({
        date: dayjs(),
        frequency: 60,
        minimumBookingNotice: 721, // 12h + 1m
      })
    ).toHaveLength(0);
  });

  it("should disable hours if the booking notice leapfrogs into the next date", async () => {

    expect(
      getSlots({
        date: dayjs().add(1, 'day').startOf('day'),
        frequency: 60,
        minimumBookingNotice: 1080, // 18h
      })
    ).toHaveLength(18);

    expect(
      getSlots({
        date: dayjs().add(2, 'day').startOf('day'),
        frequency: 60,
        minimumBookingNotice: 2760, // 46h
      })
    ).toHaveLength(14);
  });

});
