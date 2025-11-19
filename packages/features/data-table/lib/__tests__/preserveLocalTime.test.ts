import { describe, it, expect } from "vitest";

import dayjs from "@calcom/dayjs";

import { preserveLocalTime } from "../preserveLocalTime";

describe("preserveLocalTime", () => {
  it("should preserve midnight (00:00) when converting from Paris to Seoul", () => {
    // Midnight in Paris (UTC+1/+2)
    const parisTime = "2024-03-15T23:00:00.000Z"; // This represents 00:00 next day in Paris
    const result = preserveLocalTime(parisTime, "Europe/Paris", "Asia/Seoul");

    const resultInSeoul = dayjs(result).tz("Asia/Seoul");
    expect(resultInSeoul.format("YYYY-MM-DD HH:mm")).toBe("2024-03-16 00:00");
  });

  it("should preserve end of day (23:59) when converting between timezones", () => {
    // 23:59 in New York
    const nyTime = "2024-03-15T03:59:00.000Z"; // This represents 23:59 previous day in NY
    const result = preserveLocalTime(nyTime, "America/New_York", "Asia/Tokyo");

    const resultInTokyo = dayjs(result).tz("Asia/Tokyo");
    expect(resultInTokyo.format("HH:mm")).toBe("23:59");
  });

  it("should handle DST transitions correctly", () => {
    // Test during US DST transition (March 10, 2024 at 2:00 AM EST -> 3:00 AM EDT)
    const beforeDST = "2024-03-10T06:59:00.000Z"; // 1:59 AM EST
    const afterDST = "2024-03-10T07:00:00.000Z"; // 3:00 AM EDT (clock jumps forward, skipping 2:00-2:59 AM)

    const resultBeforeDST = preserveLocalTime(beforeDST, "America/New_York", "Asia/Dubai");
    const resultAfterDST = preserveLocalTime(afterDST, "America/New_York", "Asia/Dubai");

    expect(dayjs(resultBeforeDST).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")).toBe("2024-03-10 01:59"); // still 1:59 AM
    expect(dayjs(resultAfterDST).tz("Asia/Dubai").format("YYYY-MM-DD HH:mm")).toBe("2024-03-10 03:00"); // still 3:00 AM

    // Calculate the time difference between before and after DST
    const diffInMinutes = dayjs(resultAfterDST).diff(dayjs(resultBeforeDST), "minute");
    expect(diffInMinutes).toBe(61); // Should be 61 minutes difference (skipping the DST hour)
  });

  it("should handle crossing the international date line", () => {
    const laTime = "2024-03-15T04:00:00.000Z"; // March 14, 9 PM in LA
    const result = preserveLocalTime(laTime, "America/Los_Angeles", "Pacific/Auckland");

    const resultInAuckland = dayjs(result).tz("Pacific/Auckland");
    expect(resultInAuckland.format("YYYY-MM-DD HH:mm")).toBe("2024-03-14 21:00"); // Should still be 9 PM
  });

  it("should preserve milliseconds", () => {
    const timeWithMs = "2024-03-15T12:30:45.123Z";
    const result = preserveLocalTime(timeWithMs, "UTC", "Asia/Shanghai");

    const resultInShanghai = dayjs(result).tz("Asia/Shanghai");
    expect(resultInShanghai.millisecond()).toBe(123);
  });

  it("should handle leap years correctly", () => {
    // February 29th in a leap year
    const leapDay = "2024-02-29T15:30:00.000Z"; // 16:30 in Berlin
    const result = preserveLocalTime(leapDay, "Europe/Berlin", "Asia/Tokyo");

    const resultInTokyo = dayjs(result).tz("Asia/Tokyo");
    expect(resultInTokyo.format("YYYY-MM-DD")).toBe("2024-02-29");
    expect(resultInTokyo.format("HH:mm")).toBe("16:30"); // should still be 16:30 in Tokyo
  });
});
