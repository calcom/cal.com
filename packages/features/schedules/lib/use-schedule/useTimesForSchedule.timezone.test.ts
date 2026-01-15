import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { BookerState } from "@calcom/features/bookings/Booker/types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { useTimesForSchedule } from "./useTimesForSchedule";

// Mock the booker store context
const mockUseBookerStoreContext = vi.fn();
vi.mock("@calcom/features/bookings/Booker/BookerStoreProvider", () => ({
  useBookerStoreContext: (selector: (state: { month: string | null; state: BookerState }) => unknown) =>
    mockUseBookerStoreContext(selector),
}));

// Timezone offset mapping (in minutes from UTC)
const TIMEZONE_OFFSETS = {
  "Asia/Kolkata": 330, // UTC+5:30
  "Asia/Calcutta": 330, // Legacy name for Asia/Kolkata
  UTC: 0, // UTC+0
  "Etc/UTC": 0, // Alternative UTC
  GMT: 0, // GMT is effectively UTC
  "America/Los_Angeles": -480, // UTC-8
} as const;

// Helper to get current timezone from TZ environment variable
const getCurrentTimezone = (): string | undefined => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone;
};

// Helper to check if current timezone is supported
const isTimezoneSupported = (): boolean => {
  const currentTz = getCurrentTimezone();
  return currentTz ? currentTz in TIMEZONE_OFFSETS : false;
};

// Hardcoded expected timestamps for different timezones
const TIMEZONE_EXPECTATIONS = {
  // January 1st start of month
  JAN_START: {
    UTC: "2024-01-01T00:00:00.000Z",
    "Asia/Kolkata": "2023-12-31T18:30:00.000Z",
    "Asia/Calcutta": "2023-12-31T18:30:00.000Z",
    "America/Los_Angeles": "2024-01-01T08:00:00.000Z",
  },
  // January 31st end of month
  JAN_END: {
    UTC: "2024-01-31T23:59:59.999Z",
    "Asia/Kolkata": "2024-01-31T18:29:59.999Z",
    "Asia/Calcutta": "2024-01-31T18:29:59.999Z",
    "America/Los_Angeles": "2024-02-01T07:59:59.999Z",
  },
  // February 1st start of month
  FEB_START: {
    UTC: "2024-02-01T00:00:00.000Z",
    "Asia/Kolkata": "2024-01-31T18:30:00.000Z",
    "Asia/Calcutta": "2024-01-31T18:30:00.000Z",
    "America/Los_Angeles": "2024-02-01T08:00:00.000Z",
  },
  // February 29th end of month (leap year)
  FEB_END: {
    UTC: "2024-02-29T23:59:59.999Z",
    "Asia/Kolkata": "2024-02-29T18:29:59.999Z",
    "Asia/Calcutta": "2024-02-29T18:29:59.999Z",
    "America/Los_Angeles": "2024-03-01T07:59:59.999Z",
  },
  // March 31st end of month
  MAR_END: {
    UTC: "2024-03-31T23:59:59.999Z",
    "Asia/Kolkata": "2024-03-31T18:29:59.999Z",
    "Asia/Calcutta": "2024-03-31T18:29:59.999Z",
    "America/Los_Angeles": "2024-03-31T16:29:59.999Z",
  },
  // January 15th start of day (for day count scenarios)
  JAN_15_START: {
    UTC: "2024-01-15T00:00:00.000Z",
    "Asia/Kolkata": "2024-01-14T18:30:00.000Z",
    "Asia/Calcutta": "2024-01-14T18:30:00.000Z",
    "America/Los_Angeles": "2024-01-15T08:00:00.000Z",
  },
  // January 18th start of day
  JAN_18_START: {
    UTC: "2024-01-18T00:00:00.000Z",
    "Asia/Kolkata": "2024-01-17T18:30:00.000Z",
    "Asia/Calcutta": "2024-01-17T18:30:00.000Z",
    "America/Los_Angeles": "2024-01-18T08:00:00.000Z",
  },
  // January 22nd start of day
  JAN_22_START: {
    UTC: "2024-01-22T00:00:00.000Z",
    "Asia/Kolkata": "2024-01-21T18:30:00.000Z",
    "Asia/Calcutta": "2024-01-21T18:30:00.000Z",
    "America/Los_Angeles": "2024-01-22T08:00:00.000Z",
  },
} as const;

// Helper to get expected timestamp for current timezone
const getExpectedTimestamp = (timestampKey: keyof typeof TIMEZONE_EXPECTATIONS): string => {
  const currentTz = getCurrentTimezone();
  if (!currentTz || !(currentTz in TIMEZONE_OFFSETS)) {
    throw new Error(`Unsupported timezone: ${currentTz}`);
  }

  const expectations = TIMEZONE_EXPECTATIONS[timestampKey];
  return expectations[currentTz as keyof typeof expectations];
};

// Test Data Builders
const createBookerLayout = (
  layout: string,
  overrides?: {
    extraDays?: number;
    columnViewExtraDays?: number;
  }
) => ({
  layout,
  extraDays: overrides?.extraDays ?? 0,
  columnViewExtraDays: { current: overrides?.columnViewExtraDays ?? 0 },
});

const createWeekViewLayout = (overrides?: { extraDays?: number }) =>
  createBookerLayout(BookerLayouts.WEEK_VIEW, overrides);

const createColumnViewLayout = (overrides?: { columnViewExtraDays?: number }) =>
  createBookerLayout(BookerLayouts.COLUMN_VIEW, overrides);

const createMonthViewLayout = () => createBookerLayout(BookerLayouts.MONTH_VIEW);

const createMobileViewLayout = () => createBookerLayout("mobile");

// Test Scenario Builders
const createTimeRangeScenario = (overrides?: {
  selectedDate?: string | null;
  month?: string | null;
  bookerLayout?: ReturnType<typeof createBookerLayout>;
  dayCount?: number | null;
}) => ({
  selectedDate: overrides?.selectedDate === undefined ? "2024-01-15" : overrides?.selectedDate,
  month: overrides?.month ?? "2024-01",
  bookerLayout: overrides?.bookerLayout ?? createMonthViewLayout(),
  dayCount: overrides?.dayCount ?? null,
});

// Assertion Helpers
const expectValidTimeRange = (result: [string, string]) => {
  const [startTime, endTime] = result;
  expect(dayjs(startTime).isValid()).toBe(true);
  expect(dayjs(endTime).isValid()).toBe(true);
  expect(dayjs(endTime).isAfter(dayjs(startTime))).toBe(true);
};

// Setup mock store responses
const setupMockStore = ({
  monthFromStore = null,
  bookerState = "loading",
}: {
  monthFromStore?: string | null;
  bookerState?: BookerState;
} = {}) => {
  mockUseBookerStoreContext.mockImplementation((selector) =>
    selector({ month: monthFromStore, state: bookerState })
  );
};

if (!isTimezoneSupported()) {
  throw new Error(`Unsupported timezone: ${getCurrentTimezone()}`);
}
describe("useTimesForSchedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set consistent hardcoded system time for all tests
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    setupMockStore(); // Default setup
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("when using MONTH_VIEW layout", () => {
    const testData = {
      layout: createMonthViewLayout(),
      bookerState: "selecting_time" as BookerState,
    };

    describe("and when current date is before mid-month", () => {
      describe("and when viewing current month", () => {
        it("with a specific selected date, should not prefetch and thus return time range of current month", () => {
          vi.setSystemTime(new Date("2024-01-05T10:00:00Z"));
          const currentMonth = "2024-01";
          setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

          const scenario = createTimeRangeScenario({
            selectedDate: "2024-01-15",
            month: currentMonth,
            bookerLayout: testData.layout,
          });

          const result = useTimesForSchedule(scenario);
          const [startTime, endTime] = result;

          expectValidTimeRange(result);

          expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
          expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
        });

        it("without a specific selected date, should not prefetch and thus return time range of current month", () => {
          vi.setSystemTime(new Date("2024-01-05T10:00:00Z"));
          const currentMonth = "2024-01";
          setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

          const scenario = createTimeRangeScenario({
            selectedDate: null,
            month: currentMonth,
            bookerLayout: testData.layout,
          });

          const result = useTimesForSchedule(scenario);
          const [startTime, endTime] = result;

          expectValidTimeRange(result);

          expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
          expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
        });
      });
    });

    describe("and when current date is after mid-month", () => {
      describe("and when viewing current month", () => {
        it("with a specific selected date, should return time range that prefetches the next month(thus total 2 months) ", () => {
          const currentMonth = "2024-01";
          vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

          setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

          const scenario = createTimeRangeScenario({
            selectedDate: "2024-01-22",
            month: currentMonth,
            bookerLayout: testData.layout,
          });

          const result = useTimesForSchedule(scenario);
          const [startTime, endTime] = result;

          expectValidTimeRange(result);

          expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
          expect(endTime).toBe(getExpectedTimestamp("FEB_END"));
        });

        it("without a specific selected date, should return time range that prefetches the next month(thus total 2 months) ", () => {
          const currentMonth = "2024-01";
          vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

          setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

          const scenario = createTimeRangeScenario({
            selectedDate: null,
            month: currentMonth,
            bookerLayout: testData.layout,
          });

          const result = useTimesForSchedule(scenario);
          const [startTime, endTime] = result;

          expectValidTimeRange(result);
          // Past mid-month, so prefetch to March
          expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
          expect(endTime).toBe(getExpectedTimestamp("FEB_END")); // 2024 is leap year
        });
      });
    });

    it.skip("and in loading state, should not prefetch and thus return time range of current month even when column view extra days are present(which keeps the date in the current month)", () => {
      setupMockStore({ monthFromStore: "2024-01", bookerState: "loading" });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-01",
        bookerLayout: createBookerLayout(BookerLayouts.MONTH_VIEW, { columnViewExtraDays: 5 }),
      });

      const [startTime, endTime] = useTimesForSchedule(scenario);

      expectValidTimeRange([startTime, endTime]);
      expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
      // The test is failing currently here for endTime as endTime is coming out to be FEB_END
      expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
    });

    it("should return time range of the next month(no prefetch) when user is viewing next month", () => {
      // Set time to next month (February) while viewing January
      const nextMonth = "2024-02";
      setupMockStore({ monthFromStore: nextMonth, bookerState: testData.bookerState });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-02-15",
        month: nextMonth,
        bookerLayout: testData.layout,
      });

      const result = useTimesForSchedule(scenario);
      const [startTime, endTime] = result;

      expectValidTimeRange(result);
      // Viewing different month, so no prefetch
      expect(startTime).toBe(getExpectedTimestamp("FEB_START"));
      expect(endTime).toBe(getExpectedTimestamp("FEB_END"));
    });
  });

  describe("when using WEEK_VIEW layout", () => {
    const testData = {
      layout: createWeekViewLayout,
      bookerState: "selecting_time" as BookerState,
    };

    describe("and when current date is before mid-month", () => {
      it("should not prefetch and thus return time range of current month when extra days remain within current month", () => {
        const currentMonth = "2024-01";
        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-05",
          month: currentMonth,
          bookerLayout: testData.layout({ extraDays: 5 }),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        // Should stay within January (no prefetch triggered)
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
      });

      it("should not prefetch and thus return time range of current month when week view has no extra days configured", () => {
        const currentMonth = "2024-01";
        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-05",
          month: currentMonth,
          bookerLayout: testData.layout({ extraDays: 0 }),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        // Should stay within January (no extra days, no prefetch)
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
      });
    });

    describe("and when current date is after mid-month", () => {
      it("with extra days that push date into following month, should prefetch and thus return time range that prefetches the next month(thus total 2 months)", () => {
        const currentMonth = "2024-01";
        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-27",
          month: currentMonth,
          bookerLayout: testData.layout({ extraDays: 5 }),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);

        // Should span from start of Jan to end of Feb (prefetch triggered)
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("FEB_END")); // 2024 is leap year
      });

      it("without a specific selected date, should not prefetch and thus return time range of current month", () => {
        const currentMonth = "2024-01";
        vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: null,
          month: currentMonth,
          bookerLayout: testData.layout(),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
      });
    });
  });

  describe("when using COLUMN_VIEW layout", () => {
    const testData = {
      layout: createColumnViewLayout,
      bookerState: "selecting_time" as BookerState,
    };

    describe("and when current date is before mid-month", () => {
      it("should not prefetch and thus return time range of current month when column view extra days remain within current month", () => {
        const currentMonth = "2024-01";
        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });
        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-05",
          month: currentMonth,
          bookerLayout: testData.layout({ columnViewExtraDays: 5 }),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
      });
    });

    describe("and when current date is after mid-month", () => {
      it("with extra days that push date into following month, should prefetch and thus return time range that prefetches the next month(thus total 2 months)", () => {
        const currentMonth = "2024-01";
        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-28",
          month: currentMonth,
          bookerLayout: testData.layout({ columnViewExtraDays: 5 }),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        // Should span from start of Jan to end of Feb (prefetch triggered)
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("FEB_END"));
      });

      it("without a specific selected date, should not prefetch and thus return time range of current month", () => {
        const currentMonth = "2024-01";
        vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: null,
          month: currentMonth,
          bookerLayout: testData.layout(),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
      });
    });

    it("and in loading state, should not prefetch and thus return time range of current month even when column view extra days are present(which keeps the date in the current month)", () => {
      setupMockStore({ monthFromStore: "2024-01", bookerState: "loading" });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-01",
        bookerLayout: createBookerLayout(BookerLayouts.COLUMN_VIEW, { columnViewExtraDays: 5 }),
      });

      const [startTime, endTime] = useTimesForSchedule(scenario);

      expectValidTimeRange([startTime, endTime]);
      expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
      // The test is failing currently here for endTime as endTime is coming out to be FEB_END
      expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
    });
  });

  describe("when using mobile layout", () => {
    const testData = {
      layout: createMobileViewLayout,
      bookerState: "selecting_time" as BookerState,
    };

    describe("and when current date is after mid-month", () => {
      it("with a specific selected date, should return time range that prefetches the next month(thus total 2 months) ", () => {
        const currentMonth = "2024-01";
        vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: "2024-01-22",
          month: currentMonth,
          bookerLayout: testData.layout(),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);

        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("FEB_END"));
      });

      it("without a specific selected date, should return time range that prefetches the next month(thus total 2 months) ", () => {
        const currentMonth = "2024-01";
        vi.setSystemTime(new Date("2024-01-20T10:00:00Z"));

        setupMockStore({ monthFromStore: currentMonth, bookerState: testData.bookerState });

        const scenario = createTimeRangeScenario({
          selectedDate: null,
          month: currentMonth,
          bookerLayout: testData.layout(),
        });

        const result = useTimesForSchedule(scenario);
        const [startTime, endTime] = result;

        expectValidTimeRange(result);
        // Past mid-month, so prefetch to March
        expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
        expect(endTime).toBe(getExpectedTimestamp("FEB_END")); // 2024 is leap year
      });
    });

    it.skip("and in loading state, should not prefetch and thus return time range of current month even when column view extra days are present(which keeps the date in the current month)", () => {
      setupMockStore({ monthFromStore: "2024-01", bookerState: "loading" });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-01",
        bookerLayout: createBookerLayout("mobile", { columnViewExtraDays: 5 }),
      });

      const [startTime, endTime] = useTimesForSchedule(scenario);

      expectValidTimeRange([startTime, endTime]);
      expect(startTime).toBe(getExpectedTimestamp("JAN_START"));
      // The test is failing currently here for endTime as endTime is coming out to be FEB_END
      expect(endTime).toBe(getExpectedTimestamp("JAN_END"));
    });
  });

  describe("when handling day count scenarios", () => {
    it("should return specific day range when dayCount is provided", () => {
      setupMockStore({ monthFromStore: "2024-01", bookerState: "selecting_time" });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-15",
        dayCount: 7, // 7 days
        bookerLayout: createMonthViewLayout(),
      });

      const result = useTimesForSchedule(scenario);
      const [startTime, endTime] = result;

      expectValidTimeRange(result);
      // Should span exactly 7 days from selectedDate
      expect(startTime).toBe(getExpectedTimestamp("JAN_15_START"));
      expect(endTime).toBe(getExpectedTimestamp("JAN_22_START"));
    });

    it("should return current day + dayCount when no selectedDate provided and current month", () => {
      const testMonth = "2024-01";
      setupMockStore({ monthFromStore: testMonth, bookerState: "selecting_time" });

      const scenario = createTimeRangeScenario({
        selectedDate: null as unknown as string,
        dayCount: 3,
        month: testMonth,
        bookerLayout: createMonthViewLayout(),
      });

      const result = useTimesForSchedule(scenario);
      const [startTime, endTime] = result;

      expectValidTimeRange(result);
      // Should start from current system time (2024-01-15) + 3 days
      expect(startTime).toBe(getExpectedTimestamp("JAN_15_START"));
      expect(endTime).toBe(getExpectedTimestamp("JAN_18_START"));
    });
  });

  describe("when store month differs from prop month", () => {
    it("should prioritize store month over prop month", () => {
      const storeMonth = "2024-02";
      const propMonth = "2024-01";
      setupMockStore({ monthFromStore: storeMonth, bookerState: "selecting_time" });

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-15",
        month: propMonth, // This should be overridden by store month
        bookerLayout: createMonthViewLayout(),
      });

      const result = useTimesForSchedule(scenario);

      expectValidTimeRange(result);

      // Start time should be based on store month (February), not prop month (January)
      const [startTime] = result;
      expect(dayjs(startTime).format("YYYY-MM")).toBe(storeMonth);
    });

    it("should use prop month when store month is null", () => {
      const propMonth = "2024-01";
      setupMockStore({ monthFromStore: null, bookerState: "selecting_time" }); // Store month is null

      const scenario = createTimeRangeScenario({
        selectedDate: "2024-01-15",
        month: propMonth,
        bookerLayout: createMonthViewLayout(),
      });

      const result = useTimesForSchedule(scenario);

      expectValidTimeRange(result);

      // Should fall back to prop month
      const [startTime] = result;
      expect(dayjs(startTime).format("YYYY-MM")).toBe(propMonth);
    });
  });
});
