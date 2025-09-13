import { expect, test, describe } from "vitest";

import dayjs from "@calcom/dayjs";

import {
  convertUtcToTimezone,
  convertBetweenTimezones,
  getTimezoneOffset,
  timezoneSupportsDst,
  getDstOffsetDifference,
  isDateInDst,
  getDayBoundariesInTimezone,
  formatTimeInTimezone,
  createTimeInTimezone,
  isValidTimezone,
} from "./timezone-utils";

describe("Enhanced Timezone Utilities", () => {
  describe("Chile (America/Santiago) DST handling", () => {
    test("should correctly identify America/Santiago timezone status", () => {
      // Chile does observe DST transitions
      expect(timezoneSupportsDst("America/Santiago")).toBe(true);
      expect(timezoneSupportsDst("America/Santiago", 2024)).toBe(true);
    });

    test("should correctly handle Chile timezone with DST", () => {
      // Chile observes DST: UTC-4 in winter, UTC-3 in summer (Southern Hemisphere seasons)

      // Winter time (July - should be UTC-4, no DST)
      const winterTime = "2024-08-15T15:00:00Z"; // 11:00 AM in Santiago (UTC-4)
      const winterInSantiago = convertUtcToTimezone(winterTime, "America/Santiago");
      expect(winterInSantiago.format("HH:mm")).toBe("11:00");
      expect(winterInSantiago.utcOffset()).toBe(-240); // UTC-4
      expect(isDateInDst(winterTime, "America/Santiago")).toBe(false);

      // Summer time (January - should be UTC-3, DST active)
      const summerTime = "2024-12-15T15:00:00Z"; // 12:00 PM in Santiago (UTC-3)
      const summerInSantiago = convertUtcToTimezone(summerTime, "America/Santiago");
      expect(summerInSantiago.format("HH:mm")).toBe("12:00");
      expect(summerInSantiago.utcOffset()).toBe(-180); // UTC-3
      expect(isDateInDst(summerTime, "America/Santiago")).toBe(true);
    });

    test("should demonstrate timezone handling benefits", () => {
      // This test shows why IANA zones are important for DST handling
      const testDate = "2024-09-01"; // September - spring in Southern Hemisphere

      // Create times at different hours of the day
      const morning = createTimeInTimezone(testDate, "09:00", "America/Santiago");
      const afternoon = createTimeInTimezone(testDate, "15:00", "America/Santiago");

      // Both should use UTC-4 offset (spring time, DST not yet active)
      expect(morning.utcOffset()).toBe(-240); // UTC-4
      expect(afternoon.utcOffset()).toBe(-240); // UTC-4

      // Times should be properly formatted
      expect(morning.format("YYYY-MM-DD HH:mm")).toBe("2024-09-01 09:00");
      expect(afternoon.format("YYYY-MM-DD HH:mm")).toBe("2024-09-01 15:00");
    });

    test("should get correct DST characteristics for Chile", () => {
      // Chile has 1-hour DST difference
      const dstDiff = getDstOffsetDifference("America/Santiago", 2024);
      expect(dstDiff).toBe(60); // 1 hour difference
    });

    test("should handle availability slots correctly across DST transitions", () => {
      // Test that 9 AM in Santiago is always 9 AM regardless of DST
      const winterDate = "2024-08-15";
      const summerDate = "2024-12-15";

      const winterSlot = createTimeInTimezone(winterDate, "09:00", "America/Santiago");
      const summerSlot = createTimeInTimezone(summerDate, "09:00", "America/Santiago");

      // Both should show 9 AM locally
      expect(winterSlot.format("HH:mm")).toBe("09:00");
      expect(summerSlot.format("HH:mm")).toBe("09:00");

      // But different UTC times due to DST
      expect(winterSlot.utc().format()).toBe("2024-08-15T13:00:00Z"); // UTC-4
      expect(summerSlot.utc().format()).toBe("2024-12-15T12:00:00Z"); // UTC-3
    });

    test("should correctly convert between timezones during DST", () => {
      // Summer time: 3 PM UTC = 12 PM Santiago (UTC-3)
      const utcTime = "2024-12-15T15:00:00Z";
      const santiagoTime = convertBetweenTimezones(utcTime, "UTC", "America/Santiago");

      expect(santiagoTime.format("HH:mm")).toBe("12:00");
      expect(santiagoTime.utcOffset()).toBe(-180);
    });

    test("should handle day boundaries correctly during DST", () => {
      const testDate = "2024-12-15"; // During DST
      const boundaries = getDayBoundariesInTimezone(testDate, "America/Santiago");

      expect(boundaries.startOfDay.format("HH:mm:ss")).toBe("00:00:00");
      expect(boundaries.endOfDay.format("HH:mm:ss")).toBe("23:59:59");

      // Should be in DST
      expect(boundaries.startOfDay.utcOffset()).toBe(-180);
      expect(boundaries.endOfDay.utcOffset()).toBe(-180);
    });
  });

  describe("General timezone functionality", () => {
    test("should validate timezone identifiers", () => {
      expect(isValidTimezone("America/Santiago")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
    });

    test("should handle non-DST timezones", () => {
      expect(timezoneSupportsDst("America/La_Paz")).toBe(false);
      expect(getDstOffsetDifference("America/La_Paz")).toBe(0);
      expect(isDateInDst("2024-06-15T12:00:00Z", "America/La_Paz")).toBe(false);
    });

    test("should format times correctly in different timezones", () => {
      const utcTime = "2024-12-15T15:00:00Z";

      const santiagoFormatted = formatTimeInTimezone(utcTime, "America/Santiago", "HH:mm");
      const newYorkFormatted = formatTimeInTimezone(utcTime, "America/New_York", "HH:mm");

      expect(santiagoFormatted).toBe("12:00"); // UTC-3 during DST
      expect(newYorkFormatted).toBe("10:00"); // UTC-5 during EST
    });

    test("should get current timezone offset correctly", () => {
      const testDate = "2024-12-15T12:00:00Z";

      // America/Santiago during DST should be UTC-3
      const santiagoOffset = getTimezoneOffset("America/Santiago", testDate);
      expect(santiagoOffset).toBe(-180);

      // America/La_Paz should always be UTC-4
      const laPazOffset = getTimezoneOffset("America/La_Paz", testDate);
      expect(laPazOffset).toBe(-240);
    });
  });

  describe("Edge cases and DST transitions", () => {
    test("should handle Lord Howe Island 30-minute DST", () => {
      // Lord Howe Island has a 30-minute DST offset
      const dstDiff = getDstOffsetDifference("Australia/Lord_Howe", 2024);
      expect(dstDiff).toBe(30);
    });

    test("should handle year boundaries correctly", () => {
      // Test DST detection around year boundary for Southern Hemisphere
      const newYearWinter = "2024-01-01T12:00:00Z"; // January = summer in Southern Hemisphere
      const newYearSummer = "2024-07-01T12:00:00Z"; // July = winter in Southern Hemisphere

      // Chile observes DST: summer (Jan) = DST on, winter (July) = DST off
      expect(isDateInDst(newYearWinter, "America/Santiago")).toBe(true); // Summer in Southern Hemisphere
      expect(isDateInDst(newYearSummer, "America/Santiago")).toBe(false); // Winter in Southern Hemisphere

      // For comparison, Northern Hemisphere timezone like New York
      expect(isDateInDst(newYearWinter, "America/New_York")).toBe(false); // Winter, no DST
      expect(isDateInDst(newYearSummer, "America/New_York")).toBe(true); // Summer, DST active
    });

    test("should maintain consistency across multiple conversions", () => {
      const originalUtc = "2024-12-15T15:00:00Z";

      // Convert UTC -> Santiago -> UTC should give us back the original time
      const santiagoTime = convertUtcToTimezone(originalUtc, "America/Santiago");
      const backToUtc = santiagoTime.utc().format();

      expect(backToUtc).toBe(originalUtc);
    });
  });

  describe("Integration with existing Cal.com patterns", () => {
    test("should work with dayjs.tz() calls", () => {
      // This should integrate seamlessly with existing patterns
      const time = dayjs.tz("2024-12-15T09:00:00", "America/Santiago");
      const formatted = formatTimeInTimezone(time, "America/Santiago", "HH:mm");

      expect(formatted).toBe("09:00");
    });

    test("should handle availability time ranges", () => {
      // Simulate working hours: 9 AM - 5 PM Santiago time
      const workStart = createTimeInTimezone("2024-12-15", "09:00", "America/Santiago");
      const workEnd = createTimeInTimezone("2024-12-15", "17:00", "America/Santiago");

      // Convert to UTC for storage
      const startUtc = workStart.utc();
      const endUtc = workEnd.utc();

      // Should maintain the 8-hour duration
      const duration = endUtc.diff(startUtc, "hours");
      expect(duration).toBe(8);
    });

    test("should handle slot generation patterns", () => {
      // Test pattern similar to how slots are generated in Cal.com
      const baseDate = "2024-12-15";
      const timeZone = "America/Santiago";

      // Generate 30-minute slots from 9 AM to 12 PM
      const slots = [];
      let slotTime = createTimeInTimezone(baseDate, "09:00", timeZone);
      const endTime = createTimeInTimezone(baseDate, "12:00", timeZone);

      while (slotTime.isBefore(endTime)) {
        slots.push({
          time: slotTime,
          utc: slotTime.utc().format(),
          local: slotTime.format("HH:mm"),
        });
        slotTime = slotTime.add(30, "minutes");
      }

      expect(slots).toHaveLength(6); // 6 slots: 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
      expect(slots[0].local).toBe("09:00");
      expect(slots[5].local).toBe("11:30");

      // All slots should be in DST (UTC-3)
      slots.forEach((slot) => {
        expect(slot.time.utcOffset()).toBe(-180);
      });
    });
  });
});

describe("General timezone functionality", () => {
  test("should validate timezone identifiers", () => {
    expect(isValidTimezone("America/Santiago")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
    expect(isValidTimezone("Invalid/Timezone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });

  test("should handle non-DST timezones", () => {
    expect(timezoneSupportsDst("America/La_Paz")).toBe(false);
    expect(getDstOffsetDifference("America/La_Paz")).toBe(0);
    expect(isDateInDst("2024-06-15T12:00:00Z", "America/La_Paz")).toBe(false);
  });

  test("should format times correctly in different timezones", () => {
    const utcTime = "2024-12-15T15:00:00Z";

    const santiagoFormatted = formatTimeInTimezone(utcTime, "America/Santiago", "HH:mm");
    const newYorkFormatted = formatTimeInTimezone(utcTime, "America/New_York", "HH:mm");

    expect(santiagoFormatted).toBe("12:00"); // UTC-3 during DST
    expect(newYorkFormatted).toBe("10:00"); // UTC-5 during EST
  });

  test("should get current timezone offset correctly", () => {
    const testDate = "2024-12-15T12:00:00Z";

    // America/Santiago during DST should be UTC-3
    const santiagoOffset = getTimezoneOffset("America/Santiago", testDate);
    expect(santiagoOffset).toBe(-180);

    // America/La_Paz should always be UTC-4
    const laPazOffset = getTimezoneOffset("America/La_Paz", testDate);
    expect(laPazOffset).toBe(-240);
  });
});

describe("Edge cases and DST transitions", () => {
  test("should handle Lord Howe Island 30-minute DST", () => {
    // Lord Howe Island has a 30-minute DST offset
    const dstDiff = getDstOffsetDifference("Australia/Lord_Howe", 2024);
    expect(dstDiff).toBe(30);
  });

  test("should handle year boundaries correctly", () => {
    // Test DST detection around year boundary for Southern Hemisphere
    const newYearWinter = "2024-01-01T12:00:00Z"; // January = summer in Southern Hemisphere
    const newYearSummer = "2024-07-01T12:00:00Z"; // July = winter in Southern Hemisphere

    // Chile observes DST: summer (Jan) = DST on, winter (July) = DST off
    expect(isDateInDst(newYearWinter, "America/Santiago")).toBe(true); // Summer in Southern Hemisphere
    expect(isDateInDst(newYearSummer, "America/Santiago")).toBe(false); // Winter in Southern Hemisphere

    // For comparison, Northern Hemisphere timezone like New York
    expect(isDateInDst(newYearWinter, "America/New_York")).toBe(false); // Winter, no DST
    expect(isDateInDst(newYearSummer, "America/New_York")).toBe(true); // Summer, DST active
  });

  test("should maintain consistency across multiple conversions", () => {
    const originalUtc = "2024-12-15T15:00:00Z";

    // Convert UTC -> Santiago -> UTC should give us back the original time
    const santiagoTime = convertUtcToTimezone(originalUtc, "America/Santiago");
    const backToUtc = santiagoTime.utc().format();

    expect(backToUtc).toBe(originalUtc);
  });
});

describe("Integration with existing Cal.com patterns", () => {
  test("should work with dayjs.tz() calls", () => {
    // This should integrate seamlessly with existing patterns
    const time = dayjs.tz("2024-12-15T09:00:00", "America/Santiago");
    const formatted = formatTimeInTimezone(time, "America/Santiago", "HH:mm");

    expect(formatted).toBe("09:00");
  });

  test("should handle availability time ranges", () => {
    // Simulate working hours: 9 AM - 5 PM Santiago time
    const workStart = createTimeInTimezone("2024-12-15", "09:00", "America/Santiago");
    const workEnd = createTimeInTimezone("2024-12-15", "17:00", "America/Santiago");

    // Convert to UTC for storage
    const startUtc = workStart.utc();
    const endUtc = workEnd.utc();

    // Should maintain the 8-hour duration
    const duration = endUtc.diff(startUtc, "hours");
    expect(duration).toBe(8);
  });

  test("should handle slot generation patterns", () => {
    // Test pattern similar to how slots are generated in Cal.com
    const baseDate = "2024-12-15";
    const timeZone = "America/Santiago";

    // Generate 30-minute slots from 9 AM to 12 PM
    const slots = [];
    let slotTime = createTimeInTimezone(baseDate, "09:00", timeZone);
    const endTime = createTimeInTimezone(baseDate, "12:00", timeZone);

    while (slotTime.isBefore(endTime)) {
      slots.push({
        time: slotTime,
        utc: slotTime.utc().format(),
        local: slotTime.format("HH:mm"),
      });
      slotTime = slotTime.add(30, "minutes");
    }

    expect(slots).toHaveLength(6); // 6 slots: 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
    expect(slots[0].local).toBe("09:00");
    expect(slots[5].local).toBe("11:30");

    // All slots should be in DST (UTC-3)
    slots.forEach((slot) => {
      expect(slot.time.utcOffset()).toBe(-180);
    });
  });
});
