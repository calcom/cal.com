import { describe, expect, test } from "bun:test";
import { formatDuration, truncateTitle, formatAppIdToDisplayName } from "../../utils/formatters";

describe("formatDuration", () => {
  test("returns '0m' for zero or negative values", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(-5)).toBe("0m");
  });

  test("returns minutes only for durations less than 60", () => {
    expect(formatDuration(30)).toBe("30m");
    expect(formatDuration(45)).toBe("45m");
  });

  test("returns hours only for exact hour durations", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  test("returns hours and minutes for mixed durations", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(150)).toBe("2h 30m");
  });

  test("handles string input", () => {
    expect(formatDuration("30")).toBe("30m");
    expect(formatDuration("90")).toBe("1h 30m");
  });

  test("handles undefined input", () => {
    expect(formatDuration(undefined)).toBe("0m");
  });

  test("handles invalid string input", () => {
    expect(formatDuration("invalid")).toBe("0m");
  });
});

describe("truncateTitle", () => {
  test("returns original text if shorter than maxLength", () => {
    expect(truncateTitle("Short", 20)).toBe("Short");
  });

  test("truncates text and adds ellipsis if longer than maxLength", () => {
    expect(truncateTitle("This is a very long title", 10)).toBe("This is a ...");
  });

  test("uses default maxLength of 20", () => {
    expect(truncateTitle("This is exactly twenty")).toBe("This is exactly twen...");
  });

  test("handles exact length match", () => {
    expect(truncateTitle("12345", 5)).toBe("12345");
  });
});

describe("formatAppIdToDisplayName", () => {
  test("converts kebab-case to Title Case", () => {
    expect(formatAppIdToDisplayName("google-meet")).toBe("Google Meet");
    expect(formatAppIdToDisplayName("cal-video")).toBe("Cal Video");
  });

  test("handles single word", () => {
    expect(formatAppIdToDisplayName("zoom")).toBe("Zoom");
  });

  test("handles multiple dashes", () => {
    expect(formatAppIdToDisplayName("my-app-name")).toBe("My App Name");
  });
});
