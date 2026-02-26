import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { parseZone } from "./parse-zone";

describe("parseZone", () => {
  it("parses ISO8601 date with positive offset", () => {
    const result = parseZone("2024-06-15T10:30:00+05:30");
    expect(result).toBeDefined();
    expect(result!.isValid()).toBe(true);
    expect(result!.utcOffset()).toBe(330);
  });

  it("parses ISO8601 date with negative offset", () => {
    const result = parseZone("2024-06-15T10:30:00-04:00");
    expect(result).toBeDefined();
    expect(result!.isValid()).toBe(true);
    expect(result!.utcOffset()).toBe(-240);
  });

  it("parses ISO8601 date with Z suffix", () => {
    const result = parseZone("2024-06-15T10:30:00Z");
    expect(result).toBeDefined();
    expect(result!.isValid()).toBe(true);
  });

  it("returns undefined for non-ISO8601 string without offset", () => {
    const result = parseZone("2024-06-15T10:30:00");
    expect(result).toBeUndefined();
  });

  it("handles non-string input (Date object)", () => {
    const date = new Date("2024-06-15T10:30:00Z");
    const result = parseZone(date);
    expect(result).toBeDefined();
    expect(result!.isValid()).toBe(true);
  });

  it("handles non-string input (dayjs object)", () => {
    const date = dayjs("2024-06-15T10:30:00Z");
    const result = parseZone(date);
    expect(result).toBeDefined();
    expect(result!.isValid()).toBe(true);
  });

  it("handles undefined input", () => {
    const result = parseZone(undefined);
    expect(result).toBeDefined();
  });

  it("preserves the original offset instead of converting to local", () => {
    const result = parseZone("2024-06-15T10:30:00+09:00");
    expect(result).toBeDefined();
    expect(result!.utcOffset()).toBe(540);
    expect(result!.hour()).toBe(10);
    expect(result!.minute()).toBe(30);
  });

  it("parses midnight offset correctly", () => {
    const result = parseZone("2024-01-01T00:00:00+00:00");
    expect(result).toBeDefined();
    expect(result!.utcOffset()).toBe(0);
  });
});
