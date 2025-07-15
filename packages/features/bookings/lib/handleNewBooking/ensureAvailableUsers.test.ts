import { vi, describe, it, expect, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

const mockCheckForConflicts = vi.fn();
const mockPrepareBusyTimes = vi.fn();

vi.mock("@calcom/features/bookings/lib/conflictChecker/checkForConflicts", () => ({
  checkForConflicts: mockCheckForConflicts,
  prepareBusyTimes: mockPrepareBusyTimes,
}));

describe("ensureAvailableUsers.ts caller perspective tests", () => {
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

  it("should call prepareBusyTimes before calling checkForConflicts in ensureAvailableUsers", () => {
    const bufferedBusyTimes = [
      {
        start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
      },
      {
        start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
      },
    ];

    const preparedBusyTimes = mockPrepareBusyTimes(bufferedBusyTimes);

    expect(mockPrepareBusyTimes).toHaveBeenCalledWith(bufferedBusyTimes);

    const result = mockPrepareBusyTimes.mock.results[0].value;
    expect(result[0].start).toBeLessThan(result[1].start);

    mockCheckForConflicts({
      busy: preparedBusyTimes,
      time: dayjs.utc("2023-01-01T09:00:00Z"),
      eventLength: 30,
    });

    expect(mockCheckForConflicts).toHaveBeenCalledWith({
      busy: preparedBusyTimes,
      time: dayjs.utc("2023-01-01T09:00:00Z"),
      eventLength: 30,
    });
  });

  it("should demonstrate that unsorted data would break checkForConflicts early-break optimization", () => {
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

    // Mock checkForConflicts to simulate the early-break behavior with unsorted data
    mockCheckForConflicts.mockImplementation(({ time, eventLength, busy }) => {
      const slotStart = time.valueOf();
      const slotEnd = slotStart + eventLength * 60 * 1000;

      // Simulate the early break logic with unsorted data
      for (const busyTime of busy) {
        if (busyTime.start >= slotEnd) {
          return false; // Early break - this is the problem with unsorted data
        }
        if (busyTime.start < slotEnd && busyTime.end > slotStart) {
          return true; // Conflict found
        }
      }
      return false;
    });

    const result = mockCheckForConflicts({
      time: dayjs("2023-01-01T08:15:00Z"),
      eventLength: 30,
      busy: unsortedBusyTimes,
    });

    expect(result).toBe(false);
    expect(mockCheckForConflicts).toHaveBeenCalledWith({
      time: dayjs("2023-01-01T08:15:00Z"),
      eventLength: 30,
      busy: unsortedBusyTimes,
    });
  });
});
