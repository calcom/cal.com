import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { parseBookingTime } from "./page";

describe("parseBookingTime", () => {
  it("returns null for null input", () => {
    expect(parseBookingTime(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseBookingTime(undefined)).toBeNull();
  });

  it("parses UTC ISO string (ending with Z) using dayjs.utc()", () => {
    const utcString = "2026-03-31T00:30:00.000Z";
    const result = parseBookingTime(utcString);

    expect(result).not.toBeNull();
    expect(result!.isUTC()).toBe(true);
    expect(result!.format()).toBe("2026-03-31T00:30:00Z");
  });

  it("parses non-UTC string using dayjs()", () => {
    const nonUtcString = "2026-03-31T02:30:00+02:00";
    const result = parseBookingTime(nonUtcString);

    expect(result).not.toBeNull();
    // Non-UTC strings are parsed in local mode
    expect(result!.isUTC()).toBe(false);
  });

  it("parses Date object using dayjs()", () => {
    const dateObj = new Date("2026-03-31T00:30:00.000Z");
    const result = parseBookingTime(dateObj);

    expect(result).not.toBeNull();
    expect(result!.isValid()).toBe(true);
  });

  it("handles DST transition correctly for Europe/Berlin", () => {
    // March 29, 2026 02:00 - DST starts in Europe/Berlin (clocks move forward)
    const utcTime = "2026-03-29T01:30:00.000Z"; // 01:30 UTC = 02:30 CET, but DST kicks in at 02:00
    const result = parseBookingTime(utcTime);

    expect(result).not.toBeNull();

    // Convert to Berlin timezone - should correctly apply DST
    const berlinTime = result!.tz("Europe/Berlin");
    // 01:30 UTC on March 29 = 03:30 CEST (after DST transition)
    expect(berlinTime.format("HH:mm")).toBe("03:30");
  });

  it("handles time before DST transition correctly", () => {
    // March 28, 2026 - before DST in Europe/Berlin
    const utcTime = "2026-03-28T01:30:00.000Z";
    const result = parseBookingTime(utcTime);

    expect(result).not.toBeNull();

    const berlinTime = result!.tz("Europe/Berlin");
    // 01:30 UTC on March 28 = 02:30 CET (no DST yet)
    expect(berlinTime.format("HH:mm")).toBe("02:30");
  });

  it("preserves correct UTC time when converting to different timezones", () => {
    const utcTime = "2026-06-15T14:00:00.000Z";
    const result = parseBookingTime(utcTime);

    expect(result).not.toBeNull();

    // Same UTC time should show different local times
    const nyTime = result!.tz("America/New_York");
    const londonTime = result!.tz("Europe/London");
    const tokyoTime = result!.tz("Asia/Tokyo");

    // NYC is UTC-4 in summer (EDT)
    expect(nyTime.format("HH:mm")).toBe("10:00");
    // London is UTC+1 in summer (BST)
    expect(londonTime.format("HH:mm")).toBe("15:00");
    // Tokyo is UTC+9 (no DST)
    expect(tokyoTime.format("HH:mm")).toBe("23:00");
  });
});
