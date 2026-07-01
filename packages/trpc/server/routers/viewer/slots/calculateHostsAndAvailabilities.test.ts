import dayjs from "@calcom/dayjs";
import { getDefinedBufferTimes } from "@calcom/features/eventtypes/lib/getDefinedBufferTimes";
import { describe, expect, it } from "vitest";
import { getBookingPrefetchWindow } from "./util";

describe("getBookingPrefetchWindow", () => {
  it("widens the booking prefetch window by the max defined buffer on both sides", () => {
    const startTime = dayjs("2026-06-11T09:20:00.000Z").toDate();
    const endTime = dayjs("2026-06-11T10:00:00.000Z").toDate();
    const maxBuffer = Math.max(...getDefinedBufferTimes());

    const { startDate, endDate } = getBookingPrefetchWindow(startTime, endTime);

    expect(startDate.getTime()).toBe(startTime.getTime() - maxBuffer * 60 * 1000);
    expect(endDate.getTime()).toBe(endTime.getTime() + maxBuffer * 60 * 1000);
  });
});
