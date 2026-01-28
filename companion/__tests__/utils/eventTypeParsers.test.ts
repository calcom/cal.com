import { describe, expect, test } from "bun:test";
import {
  parseBufferTime,
  parseMinimumNotice,
  parseFrequencyUnit,
  parseSlotInterval,
} from "../../utils/eventTypeParsers";

describe("parseBufferTime", () => {
  test("extracts minutes from string with 'minutes' suffix", () => {
    expect(parseBufferTime("15 minutes")).toBe(15);
    expect(parseBufferTime("30 minutes")).toBe(30);
  });

  test("extracts number from plain string", () => {
    expect(parseBufferTime("15")).toBe(15);
    expect(parseBufferTime("30")).toBe(30);
  });

  test("returns 0 for invalid input", () => {
    expect(parseBufferTime("")).toBe(0);
    expect(parseBufferTime("no numbers")).toBe(0);
  });
});

describe("parseMinimumNotice", () => {
  test("returns value as-is for Minutes", () => {
    expect(parseMinimumNotice("30", "Minutes")).toBe(30);
  });

  test("converts hours to minutes", () => {
    expect(parseMinimumNotice("2", "Hours")).toBe(120);
    expect(parseMinimumNotice("1", "Hours")).toBe(60);
  });

  test("converts days to minutes", () => {
    expect(parseMinimumNotice("1", "Days")).toBe(1440);
    expect(parseMinimumNotice("2", "Days")).toBe(2880);
  });

  test("returns 0 for invalid value", () => {
    expect(parseMinimumNotice("invalid", "Minutes")).toBe(0);
    expect(parseMinimumNotice("", "Hours")).toBe(0);
  });
});

describe("parseFrequencyUnit", () => {
  test("returns 'day' for day-related strings", () => {
    expect(parseFrequencyUnit("day")).toBe("day");
    expect(parseFrequencyUnit("Days")).toBe("day");
    expect(parseFrequencyUnit("everyday")).toBe("day");
  });

  test("returns 'week' for week-related strings", () => {
    expect(parseFrequencyUnit("Weekly")).toBe("week");
    expect(parseFrequencyUnit("week")).toBe("week");
    expect(parseFrequencyUnit("Weeks")).toBe("week");
  });

  test("returns 'month' for month-related strings", () => {
    expect(parseFrequencyUnit("Monthly")).toBe("month");
    expect(parseFrequencyUnit("month")).toBe("month");
    expect(parseFrequencyUnit("Months")).toBe("month");
  });

  test("returns 'year' for year-related strings", () => {
    expect(parseFrequencyUnit("Yearly")).toBe("year");
    expect(parseFrequencyUnit("year")).toBe("year");
    expect(parseFrequencyUnit("Years")).toBe("year");
  });

  test("returns null for unrecognized strings", () => {
    expect(parseFrequencyUnit("invalid")).toBe(null);
    expect(parseFrequencyUnit("")).toBe(null);
  });
});

describe("parseSlotInterval", () => {
  test("extracts minutes from string with 'minutes' suffix", () => {
    expect(parseSlotInterval("15 minutes")).toBe(15);
    expect(parseSlotInterval("30 minutes")).toBe(30);
  });

  test("extracts number from plain string", () => {
    expect(parseSlotInterval("15")).toBe(15);
    expect(parseSlotInterval("30")).toBe(30);
  });

  test("returns 0 for invalid input", () => {
    expect(parseSlotInterval("")).toBe(0);
    expect(parseSlotInterval("no numbers")).toBe(0);
  });
});
