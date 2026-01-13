import { describe, expect, it } from "vitest";

import "@calcom/dayjs/locales";

import { formatDateTime, formatDateTimeRange, formatWeekday, getWeekdayNames } from "./dateTimeFormatter";

describe("dateTimeFormatter", () => {
  describe("formatDateTime", () => {
    describe("supported locales (Intl path)", () => {
      it("formats full date style in English", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "en-US",
          timeZone: "UTC",
          dateStyle: "full",
        });

        // Validate actual content
        expect(result).toContain("Monday");
        expect(result).toContain("December");
        expect(result).toContain("1");
        expect(result).toContain("2025");
      });

      it("formats time with 12h format", () => {
        const date = new Date("2025-12-01T14:30:00Z");

        const result = formatDateTime(date, {
          locale: "en-US",
          timeZone: "UTC",
          timeStyle: "short",
          hour12: true,
        });

        expect(result).toMatch(/2:30\s*PM/);
      });

      it("formats month only", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "en-US",
          month: "long",
        });

        expect(result).toBe("December");
      });
    });

    describe("unsupported locales (dayjs fallback)", () => {
      it("formats Icelandic date correctly", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "is",
          dateStyle: "long",
        });

        // Validate Icelandic content
        expect(result).toMatch(/desember/i); // December in Icelandic
        expect(result).toContain("1");
        expect(result).toContain("2025");
      });

      it("formats Lithuanian date correctly", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "lt",
          dateStyle: "long",
        });

        // Validate Lithuanian content
        expect(result).toMatch(/gruod/i); // December in Lithuanian
        expect(result).toContain("1");
        expect(result).toContain("2025");
      });

      it("formats Norwegian Bokmål date correctly", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "nb",
          dateStyle: "long",
        });

        // Validate Norwegian content
        expect(result).toMatch(/desember/i); // December in Norwegian
        expect(result).toContain("1");
        expect(result).toContain("2025");
      });

      it("formats month-only in Icelandic", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "is",
          month: "long",
        });

        expect(result).toMatch(/desember/i);
      });

      it("formats narrow month (first character)", () => {
        const date = new Date("2025-12-01T10:30:00Z");

        const result = formatDateTime(date, {
          locale: "is",
          month: "narrow",
        });

        expect(result).toHaveLength(1);
      });

      it("formats time with 12h format in Icelandic", () => {
        const date = new Date("2025-12-01T14:30:00Z");

        const result = formatDateTime(date, {
          locale: "is",
          timeStyle: "short",
          hour12: true,
        });

        expect(result).toMatch(/2:30/);
        expect(result).toMatch(/(PM|e\.h\.)/i); // English PM or Icelandic "eftir hádegi"
      });

      it("formats combined date and time", () => {
        const date = new Date("2025-12-01T14:30:00Z");

        const result = formatDateTime(date, {
          locale: "is",
          dateStyle: "medium",
          timeStyle: "short",
          hour12: false,
        });

        expect(result).toContain("1");
        expect(result).toMatch(/14:30/);
      });
    });
  });

  describe("formatDateTimeRange", () => {
    describe("supported locales", () => {
      it("formats time range on same day", () => {
        const startDate = new Date("2025-12-01T10:30:00Z");
        const endDate = new Date("2025-12-01T11:30:00Z");

        const result = formatDateTimeRange(startDate, endDate, {
          locale: "en-US",
          timeZone: "UTC",
          timeStyle: "short",
        });

        expect(result).toMatch(/10:30/);
        expect(result).toMatch(/11:30/);
      });

      it("formats date range across different days", () => {
        const startDate = new Date("2025-12-01T10:30:00Z");
        const endDate = new Date("2025-12-02T11:30:00Z");

        const result = formatDateTimeRange(startDate, endDate, {
          locale: "en-US",
          timeZone: "UTC",
          dateStyle: "short",
        });

        expect(result).toContain("12/1");
        expect(result).toContain("12/2");
      });
    });

    describe("unsupported locales (dayjs fallback)", () => {
      it("formats time range in Icelandic", () => {
        const startDate = new Date("2025-12-01T10:30:00Z");
        const endDate = new Date("2025-12-01T11:30:00Z");

        const result = formatDateTimeRange(startDate, endDate, {
          locale: "is",
          timeZone: "UTC",
          timeStyle: "short",
          hour12: false,
        });

        expect(result).toContain("10:30");
        expect(result).toContain("11:30");
        expect(result).toContain("–"); // En dash separator
      });

      it("formats date range in Lithuanian", () => {
        const startDate = new Date("2025-12-01T10:30:00Z");
        const endDate = new Date("2025-12-02T10:30:00Z");

        const result = formatDateTimeRange(startDate, endDate, {
          locale: "lt",
          dateStyle: "medium",
        });

        expect(result).toContain("–");
        expect(result).toContain("1");
        expect(result).toContain("2");
      });
    });
  });

  describe("formatWeekday", () => {
    describe("supported locales", () => {
      it("formats long weekday names in English", () => {
        expect(formatWeekday("en-US", 0, "long")).toBe("Sunday");
        expect(formatWeekday("en-US", 1, "long")).toBe("Monday");
        expect(formatWeekday("en-US", 6, "long")).toBe("Saturday");
      });

      it("formats short weekday names in English", () => {
        expect(formatWeekday("en-US", 0, "short")).toBe("Sun");
        expect(formatWeekday("en-US", 1, "short")).toBe("Mon");
      });
    });

    describe("unsupported locales (dayjs fallback)", () => {
      it("formats long weekday names in Icelandic", () => {
        const monday = formatWeekday("is", 1, "long");
        expect(monday).toMatch(/mánudagur/i);
      });

      it("formats short weekday names in Icelandic", () => {
        const monday = formatWeekday("is", 1, "short");
        expect(monday).toMatch(/mán/i);
      });

      it("formats weekdays in Lithuanian", () => {
        const monday = formatWeekday("lt", 1, "long");
        expect(monday).toMatch(/pirmadienis/i); // Monday in Lithuanian
      });

      it("formats weekdays in Norwegian Bokmål", () => {
        const monday = formatWeekday("nb", 1, "long");
        expect(monday).toMatch(/mandag/i); // Monday in Norwegian
      });
    });
  });

  describe("getWeekdayNames", () => {
    it("returns 7 weekday names starting Sunday by default", () => {
      const result = getWeekdayNames("en-US");

      expect(result).toHaveLength(7);
      expect(result[0]).toBe("Sunday");
      expect(result[1]).toBe("Monday");
      expect(result[6]).toBe("Saturday");
    });

    it("supports custom week start (Monday)", () => {
      const result = getWeekdayNames("en-US", 1);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe("Monday");
      expect(result[6]).toBe("Sunday");
    });

    it("supports short format", () => {
      const result = getWeekdayNames("en-US", 0, "short");

      expect(result).toHaveLength(7);
      expect(result[0]).toBe("Sun");
      expect(result[1]).toBe("Mon");
    });

    it("returns Icelandic weekday names", () => {
      const result = getWeekdayNames("is", 0, "long");

      expect(result).toHaveLength(7);
      // Validate at least one Icelandic weekday
      expect(result.some((day) => day.match(/dagur$/i))).toBe(true);
    });
  });

  describe("timezone handling", () => {
    it("formats in UTC correctly for both Intl and dayjs paths", () => {
      const date = new Date("2025-12-01T10:30:00Z");

      // Intl path (supported locale)
      const intlResult = formatDateTime(date, {
        locale: "en",
        timeZone: "UTC",
        timeStyle: "short",
        hour12: false,
      });
      expect(intlResult).toContain("10:30");

      // Dayjs path (unsupported locale)
      const dayjsResult = formatDateTime(date, {
        locale: "is",
        timeZone: "UTC",
        timeStyle: "short",
        hour12: false,
      });
      expect(dayjsResult).toContain("10:30");
    });

    it("applies Tokyo timezone offset correctly", () => {
      const date = new Date("2025-12-01T10:30:00Z");

      // Intl path
      const intlResult = formatDateTime(date, {
        locale: "en",
        timeZone: "Asia/Tokyo",
        timeStyle: "short",
        hour12: false,
      });
      expect(intlResult).toContain("19:30"); // UTC+9

      // Test timezone respect in dayjs fallback
      const dayjsResult = formatDateTime(date, {
        locale: "is",
        timeZone: "Asia/Tokyo",
        timeStyle: "short",
        hour12: false,
      });
      expect(dayjsResult).toContain("19:30"); // UTC+9
    });

    it("handles day boundary crossing with timezone offset", () => {
      const date = new Date("2025-12-01T20:30:00Z");

      const result = formatDateTime(date, {
        locale: "is",
        timeZone: "Asia/Tokyo",
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
      });
      // 20:30 UTC + 9h = 05:30 next day
      expect(result).toContain("05:30");
      expect(result).toContain("2"); // December 2nd
    });
  });
});
