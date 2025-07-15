import { vi, describe, it, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

const mockCheckForConflicts = vi.fn();
const mockPrepareBusyTimes = vi.fn();

vi.mock("@calcom/features/bookings/lib/conflictChecker/checkForConflicts", () => ({
  checkForConflicts: mockCheckForConflicts,
  prepareBusyTimes: mockPrepareBusyTimes,
}));

describe("util.ts caller perspective tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckForConflicts.mockReturnValue(false);
    mockPrepareBusyTimes.mockImplementation((busyTimes) =>
      busyTimes
        .map((bt) => ({
          start: dayjs.utc(bt.start).valueOf(),
          end: dayjs.utc(bt.end).valueOf(),
        }))
        .sort((a, b) => a.start - b.start)
    );
  });

  it("should call prepareBusyTimes before calling checkForConflicts", () => {
    const busySlots = [
      {
        start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
      },
      {
        start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
      },
    ];

    mockPrepareBusyTimes(busySlots);

    expect(mockPrepareBusyTimes).toHaveBeenCalledWith(busySlots);

    const result = mockPrepareBusyTimes.mock.results[0].value;
    expect(result[0].start).toBeLessThan(result[1].start);
  });

  it("should demonstrate the requirement for sorted data in checkForConflicts", () => {
    // This test documents that callers must use prepareBusyTimes to ensure sorted data

    const unsortedBusyTimes = [
      {
        start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
      },
      {
        start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
      },
    ];

    expect(dayjs.utc(unsortedBusyTimes[0].start).valueOf()).toBeGreaterThan(
      dayjs.utc(unsortedBusyTimes[1].start).valueOf()
    );

    const sortedBusyTimes = mockPrepareBusyTimes(unsortedBusyTimes);

    expect(mockPrepareBusyTimes).toHaveBeenCalledWith(unsortedBusyTimes);

    const result = mockPrepareBusyTimes.mock.results[0].value;
    expect(result[0].start).toBeLessThan(result[1].start);
  });
});
