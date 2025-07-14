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

  it("should fail if caller passes unsorted data directly to checkForConflicts", () => {
    const unsortedBusyTimes = [
      {
        start: dayjs.utc("2023-01-01T10:00:00Z").valueOf(),
        end: dayjs.utc("2023-01-01T10:30:00Z").valueOf(),
      },
      {
        start: dayjs.utc("2023-01-01T08:00:00Z").valueOf(),
        end: dayjs.utc("2023-01-01T08:30:00Z").valueOf(),
      },
    ];

    expect(unsortedBusyTimes[0].start).toBeGreaterThan(unsortedBusyTimes[1].start);
  });
});
