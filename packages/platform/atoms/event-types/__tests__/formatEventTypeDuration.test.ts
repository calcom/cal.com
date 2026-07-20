import { describe, expect, it } from "vitest";

import { formatEventTypeDuration, formatEventTypeDurationAriaLabel } from "../lib/formatEventTypeDuration";

describe("formatEventTypeDuration", () => {
  it("should format single digit minutes", () => {
    expect(formatEventTypeDuration(5)).toBe("5m");
  });

  it("should format double digit minutes", () => {
    expect(formatEventTypeDuration(15)).toBe("15m");
    expect(formatEventTypeDuration(30)).toBe("30m");
    expect(formatEventTypeDuration(45)).toBe("45m");
  });

  it("should format edge case at 59 minutes", () => {
    expect(formatEventTypeDuration(59)).toBe("59m");
  });

  it("should handle edge case at 61 minutes", () => {
    expect(formatEventTypeDuration(61)).toBe("1h 1m");
  });

  it("should format single hour", () => {
    expect(formatEventTypeDuration(60)).toBe("1h");
  });

  it("should format multiple hours", () => {
    expect(formatEventTypeDuration(120)).toBe("2h");
    expect(formatEventTypeDuration(180)).toBe("3h");
    expect(formatEventTypeDuration(240)).toBe("4h");
  });

  it("should format hours with minutes", () => {
    expect(formatEventTypeDuration(75)).toBe("1h 15m");
    expect(formatEventTypeDuration(150)).toBe("2h 30m");
    expect(formatEventTypeDuration(195)).toBe("3h 15m");
  });

  it("should handle 1 minute", () => {
    expect(formatEventTypeDuration(1)).toBe("1m");
  });

  it("should handle zero minutes", () => {
    expect(formatEventTypeDuration(0)).toBe("0m");
  });
});

describe("formatEventTypeDurationAriaLabel", () => {
  it("should return minutes label for sub-hour durations", () => {
    expect(formatEventTypeDurationAriaLabel(30)).toBe("30 minutes");
    expect(formatEventTypeDurationAriaLabel(15)).toBe("15 minutes");
    expect(formatEventTypeDurationAriaLabel(45)).toBe("45 minutes");
  });

  it("should return singular minute label for 1 minute", () => {
    expect(formatEventTypeDurationAriaLabel(1)).toBe("1 minute");
  });

  it("should return singular hour label for exactly 1 hour", () => {
    expect(formatEventTypeDurationAriaLabel(60)).toBe("1 hour");
  });

  it("should return plural hours label for multiple hours", () => {
    expect(formatEventTypeDurationAriaLabel(120)).toBe("2 hours");
    expect(formatEventTypeDurationAriaLabel(180)).toBe("3 hours");
  });

  it("should combine hours and minutes", () => {
    expect(formatEventTypeDurationAriaLabel(90)).toBe("1 hour 30 minutes");
    expect(formatEventTypeDurationAriaLabel(75)).toBe("1 hour 15 minutes");
    expect(formatEventTypeDurationAriaLabel(150)).toBe("2 hours 30 minutes");
  });

  it("should handle singular minute in combined label", () => {
    expect(formatEventTypeDurationAriaLabel(61)).toBe("1 hour 1 minute");
  });
});
