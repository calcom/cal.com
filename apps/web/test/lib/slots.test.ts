import { expect, it, describe } from "@jest/globals";

import dayjs from "@calcom/dayjs";
import { getTimeSlotsCompact } from "@calcom/lib/slots";

describe("getTimeSlotsCompact", () => {
  it("should return an empty array if the slotDay is not in the days array", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [6, 7];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const busyTimes = [{ startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });

  it("should return time slots that are not blocked by busy times", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [0, 1, 2, 3, 4, 5, 6];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const busyTimes = [
      { startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") },
      { startTime: dayjs("2022-02-01 14:00"), endTime: dayjs("2022-02-01 15:00") },
    ];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([
      dayjs("2022-02-01 10:00"),
      dayjs("2022-02-01 10:30"),
      dayjs("2022-02-01 12:00"),
      dayjs("2022-02-01 12:30"),
      dayjs("2022-02-01 13:00"),
      dayjs("2022-02-01 13:30"),
      dayjs("2022-02-01 15:00"),
      dayjs("2022-02-01 15:30"),
      dayjs("2022-02-01 16:00"),
      dayjs("2022-02-01 16:30"),
    ]);
  });

  it("should return an empty array if all the slots are blocked by busy times", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [0, 1, 2, 3, 4, 5, 6];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const busyTimes = [{ startTime: dayjs("2022-02-01 10:00"), endTime: dayjs("2022-02-01 17:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });

  it("should return an empty array if the eventLength is not matched with minStartTime", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [1, 2, 3, 4, 5];
    const minStartTime = dayjs("2022-02-01 17:35");
    const eventLength = 60;
    const busyTimes = [{ startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });
});
