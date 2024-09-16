import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { getRollingWindowEndDate } from "./isOutOfBounds";

const getDayJsTimeWithUtcOffset = ({
  dateStringWithOffset,
  utcOffset,
}: {
  dateStringWithOffset: string;
  utcOffset: number;
}) => {
  if (!dateStringWithOffset.includes("+")) {
    throw new Error(
      "dateStringWithOffset should have a +. That specifies the offset. Format: YYYY-MM-DDTHH:mm:ss+HH:mm"
    );
  }
  return dayjs(dateStringWithOffset).utcOffset(utcOffset);
};

describe("getRollingWindowEndDate", () => {
  it("should return the startDate itself when that date is bookable and 0 days in future are needed", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 0,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: true },
        "2024-05-03": { isBookable: false },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-02T23:59:59+11:00");
  });

  it("should return the last possible time of the date so that all the timeslots of the last day are considered within range ", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 2,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: true },
        "2024-05-03": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-03T23:59:59+11:00");
  });

  it("Input startDate normalization - should return the startDate with 00:00 time when that date is bookable and only 1 day is needed", () => {
    const endDay = getRollingWindowEndDate({
      // startDate has a time other than 00:00
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-11T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 1,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-10": { isBookable: true },
        "2024-05-11": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-11T23:59:59+11:00");
  });

  it("should return the first bookable date when only 1 day is needed and the startDate is unavailable", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 1,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: false },
        "2024-05-03": { isBookable: false },
        "2024-05-04": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-04T23:59:59+11:00");
  });

  it("can give endDay farther than daysNeeded if countNonBusinessDays=false", () => {
    // 2024-05-02 is Thursday
    // 2024-05-03 is Friday
    // 2024-05-04 is Saturday(Non business Day)
    // 2024-05-05 is Sunday(Non Business Day)
    // 2024-05-06 is Monday

    testWhenNonBusinessDaysAreBooked();
    testWhenNonBusinessDaysAreNotBooked();

    return;
    function testWhenNonBusinessDaysAreBooked() {
      const endDay = getRollingWindowEndDate({
        startDateInBookerTz: getDayJsTimeWithUtcOffset({
          dateStringWithOffset: "2024-05-02T15:09:46+11:00",
          utcOffset: 11,
        }),
        daysNeeded: 3,
        allDatesWithBookabilityStatusInBookerTz: {
          "2024-05-02": { isBookable: true },
          "2024-05-03": { isBookable: true },
          // Skipped because Saturday is non-business day
          "2024-05-04": { isBookable: true },
          // Skipped because Sunday is non-business day
          "2024-05-05": { isBookable: true },
          "2024-05-06": { isBookable: true },
          "2024-05-07": { isBookable: true },
        },
        countNonBusinessDays: false,
      });

      // Instead of 4th, it gives 6th because 2 days in b/w are non-business days which aren't counted
      expect(endDay?.format()).toEqual("2024-05-06T23:59:59+11:00");
    }

    function testWhenNonBusinessDaysAreNotBooked() {
      const endDay2 = getRollingWindowEndDate({
        startDateInBookerTz: getDayJsTimeWithUtcOffset({
          dateStringWithOffset: "2024-05-02T15:09:46+11:00",
          utcOffset: 11,
        }),
        daysNeeded: 3,
        allDatesWithBookabilityStatusInBookerTz: {
          "2024-05-02": { isBookable: true },
          "2024-05-03": { isBookable: true },
          "2024-05-04": { isBookable: false },
          "2024-05-05": { isBookable: false },
          "2024-05-06": { isBookable: true },
        },
        countNonBusinessDays: false,
      });

      // Instead of 4th, it gives 6th because 2 days in b/w are non-business days which aren't counted
      expect(endDay2?.format()).toEqual("2024-05-06T23:59:59+11:00");
    }
  });

  it("should return the first `daysNeeded` bookable days", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 3,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: false },
        "2024-05-03": { isBookable: false },
        "2024-05-04": { isBookable: true },
        "2024-05-05": { isBookable: true },
        "2024-05-06": { isBookable: true },
        "2024-05-07": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-06T23:59:59+11:00");
  });

  it("should return the last bookable day if enough `daysNeeded` bookable days aren't found", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 30,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: false },
        "2024-05-03": { isBookable: false },
        "2024-05-04": { isBookable: true },
        "2024-05-05": { isBookable: true },
        "2024-05-06": { isBookable: false },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-05T23:59:59+11:00");
  });

  it("should treat non existing dates in `allDatesWithBookabilityStatusInBookerTz` as having isBookable:false  the first `daysNeeded` bookable days", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 3,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: true },
        "2024-05-03": { isBookable: false },
        "2024-05-04": { isBookable: true },
        "2024-05-07": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-05-07T23:59:59+11:00");
  });

  it("should return the last day in maximum window(that would be ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK days ahead) if no bookable day is found at all", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 3,
      allDatesWithBookabilityStatusInBookerTz: {},
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-07-02T23:59:59+11:00");
  });

  it("should consider the bookable day very close to ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK but not beyond it", () => {
    const endDay = getRollingWindowEndDate({
      startDateInBookerTz: getDayJsTimeWithUtcOffset({
        dateStringWithOffset: "2024-05-02T05:09:46+11:00",
        utcOffset: 11,
      }),
      daysNeeded: 3,
      allDatesWithBookabilityStatusInBookerTz: {
        "2024-05-02": { isBookable: true },
        "2024-06-04": { isBookable: true },
        "2024-07-01": { isBookable: true },
        "2024-07-07": { isBookable: true },
      },
      countNonBusinessDays: true,
    });
    expect(endDay?.format()).toEqual("2024-07-01T23:59:59+11:00");
  });
});
