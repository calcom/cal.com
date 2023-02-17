import type { Booking } from "@prisma/client";

import dayjs from "@calcom/dayjs";
import { validateDurationLimitOrder } from "@calcom/lib";
import { checkDurationLimit, checkDurationLimits } from "@calcom/lib/server";
import type { DurationLimit } from "@calcom/types/Calendar";

import { prismaMock } from "../../../../tests/config/singleton";

type MockData = {
  id: number;
  startDate: Date;
  durationLimits: DurationLimit;
};

const MOCK_DATA: MockData = {
  id: 1,
  startDate: dayjs("2022-09-30T09:00:00+01:00").toDate(),
  durationLimits: {
    PER_DAY: 60,
  },
};

const generateMockBookingData = (startTime: Date, endTime: Date): Booking => ({
  id: Math.floor(Math.random() * 1000),
  uid: Math.floor(Math.random() * 1000).toString(),
  userId: null,
  eventTypeId: null,
  title: "test title",
  description: null,
  customInputs: null,
  startTime,
  endTime,
  location: null,
  createdAt: new Date(),
  updatedAt: null,
  status: "PENDING",
  paid: false,
  destinationCalendarId: null,
  cancellationReason: null,
  rejectionReason: null,
  dynamicEventSlugRef: null,
  dynamicGroupSlugRef: null,
  rescheduled: null,
  fromReschedule: null,
  recurringEventId: null,
  smsReminderNumber: null,
  scheduledJobs: [],
  metadata: null,
});

// Path: apps/web/test/lib/checkDurationLimits.ts
describe("Check Duration Limits Tests", () => {
  it("Should return no errors if limit is not reached", async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);
    await expect(
      checkDurationLimits(MOCK_DATA.durationLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).resolves.toBeTruthy();
  });
  it("Should throw an error if limit is reached", async () => {
    const mockBookingData = [
      generateMockBookingData(
        dayjs("2022-09-30T09:00:00+01:00").toDate(),
        dayjs("2022-09-30T10:00:00+01:00").toDate()
      ),
      generateMockBookingData(
        dayjs("2022-09-30T10:00:00+01:00").toDate(),
        dayjs("2022-09-30T11:00:00+01:00").toDate()
      ),
    ];
    prismaMock.booking.findMany.mockResolvedValue(mockBookingData);
    await expect(
      checkDurationLimits(MOCK_DATA.durationLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).rejects.toThrowError();
  });
  it("Should pass with multiple duration limits", async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);
    await expect(
      checkDurationLimits(
        {
          PER_DAY: 60,
          PER_WEEK: 120,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should pass with multiple duration limits with one undefined", async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);
    await expect(
      checkDurationLimits(
        {
          PER_DAY: 60,
          PER_WEEK: undefined,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should return no errors if limit is not reached with multiple bookings", async () => {
    const mockBookingData = [
      generateMockBookingData(
        dayjs("2022-09-30T09:00:00+01:00").toDate(),
        dayjs("2022-09-30T09:30:00+01:00").toDate()
      ),
      generateMockBookingData(
        dayjs("2022-09-30T09:30:00+01:00").toDate(),
        dayjs("2022-09-30T10:00:00+01:00").toDate()
      ),
    ];
    prismaMock.booking.findMany.mockResolvedValue(mockBookingData);
    await expect(
      checkDurationLimits(
        {
          PER_DAY: 90,
          PER_WEEK: 120,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should throw an error if one of the limit is reached with multiple bookings", async () => {
    const mockBookingData = [
      generateMockBookingData(
        dayjs("2022-09-30T09:00:00+01:00").toDate(),
        dayjs("2022-09-30T10:00:00+01:00").toDate()
      ),
      generateMockBookingData(
        dayjs("2022-09-30T10:00:00+01:00").toDate(),
        dayjs("2022-09-30T10:30:00+01:00").toDate()
      ),
    ];
    prismaMock.booking.findMany.mockResolvedValue(mockBookingData);
    await expect(
      checkDurationLimits(
        {
          PER_DAY: 60,
          PER_WEEK: 120,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).rejects.toThrowError();
  });
});

// Path: apps/web/test/lib/checkDurationLimits.ts
describe("Check Duration Limit Tests", () => {
  it("Should return no busyTimes and no error if limit is not reached", async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);
    await expect(
      checkDurationLimit({
        key: "PER_DAY",
        limitingNumber: 90,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
      })
    ).resolves.toBeUndefined();
  });
  it("Should return busyTimes when set and limit is reached", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      generateMockBookingData(
        dayjs("2022-09-30T09:00:00+01:00").toDate(),
        dayjs("2022-09-30T10:00:00+01:00").toDate()
      ),
    ]);
    await expect(
      checkDurationLimit({
        key: "PER_DAY",
        limitingNumber: 60,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
        returnBusyTimes: true,
      })
    ).resolves.toEqual({
      start: dayjs(MOCK_DATA.startDate).startOf("day").toDate(),
      end: dayjs(MOCK_DATA.startDate).endOf("day").toDate(),
    });
  });
});

describe("Duration limit validation", () => {
  it("Should validate limit where ranges have ascending values", () => {
    expect(validateDurationLimitOrder({ PER_DAY: 30, PER_MONTH: 60 })).toBe(true);
  });
  it("Should invalidate limit where ranges does not have a strict ascending values", () => {
    expect(validateDurationLimitOrder({ PER_DAY: 60, PER_WEEK: 30 })).toBe(false);
  });
  it("Should validate a correct limit with 'gaps'", () => {
    expect(validateDurationLimitOrder({ PER_DAY: 60, PER_YEAR: 120 })).toBe(true);
  });
  it("Should validate empty limit", () => {
    expect(validateDurationLimitOrder({})).toBe(true);
  });
});
