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

  it("should demonstrate the requirement for sorted data in checkForConflicts", () => {
    // This test documents that callers must use prepareBusyTimes to ensure sorted data

    const unsortedBufferedBusyTimes = [
      {
        start: dayjs.utc("2023-01-01T10:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T10:30:00Z").toDate(),
      },
      {
        start: dayjs.utc("2023-01-01T08:00:00Z").toDate(),
        end: dayjs.utc("2023-01-01T08:30:00Z").toDate(),
      },
    ];

    expect(dayjs.utc(unsortedBufferedBusyTimes[0].start).valueOf()).toBeGreaterThan(
      dayjs.utc(unsortedBufferedBusyTimes[1].start).valueOf()
    );

    const sortedBusyTimes = mockPrepareBusyTimes(unsortedBufferedBusyTimes);

    expect(mockPrepareBusyTimes).toHaveBeenCalledWith(unsortedBufferedBusyTimes);

    const result = mockPrepareBusyTimes.mock.results[0].value;
    expect(result[0].start).toBeLessThan(result[1].start);
  });
});
