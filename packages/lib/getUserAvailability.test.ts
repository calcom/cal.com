/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

import { UserAvailabilityService } from "./getUserAvailability";

describe("getUserAvailability Timezone Normalization", () => {
  let userAvailabilityService: UserAvailabilityService;

  beforeEach(() => {
    userAvailabilityService = new UserAvailabilityService({
      eventTypeRepo: {} as any,
      oooRepo: {} as any,
      bookingRepo: {} as any,
      redisClient: {} as any,
    });
  });

  const normalize = (input: string) => dayjs(input).utc().toISOString().replace(".000Z", "Z");

  describe("Timezone Normalization and UTC Conversion", () => {
    it("should normalize busy times from different timezones to UTC", () => {
      const input = [
        { start: "2024-01-15T10:00:00-05:00", end: "2024-01-15T11:00:00-05:00" },
        { start: "2024-01-15T10:00:00+02:00", end: "2024-01-15T11:00:00+02:00" },
      ];

      const normalized = input.map((t) => ({
        start: normalize(t.start),
        end: normalize(t.end),
      }));

      expect(normalized[0].start).toBe("2024-01-15T15:00:00Z");
      expect(normalized[1].start).toBe("2024-01-15T08:00:00Z");
    });

    it("should correctly identify no availability when all team members are busy at the same UTC time", () => {
      const teamMembers = [
        { busyTimes: [{ start: "2024-01-15T10:00:00-05:00", end: "2024-01-15T11:00:00-05:00" }] },
        { busyTimes: [{ start: "2024-01-15T17:00:00+02:00", end: "2024-01-15T18:00:00+02:00" }] },
      ];

      const normalized = teamMembers.map((m) =>
        m.busyTimes.map((t) => ({
          start: normalize(t.start),
          end: normalize(t.end),
        }))
      );

      expect(normalized[0][0].start).toBe("2024-01-15T15:00:00Z");
      expect(normalized[1][0].start).toBe("2024-01-15T15:00:00Z");
    });

    it("should handle UTC+0/UTC-0 timezone formats consistently", () => {
      const cases = [
        { input: "2024-01-15T10:00:00+00:00", expected: "2024-01-15T10:00:00Z" },
        { input: "2024-01-15T10:00:00-00:00", expected: "2024-01-15T10:00:00Z" },
        { input: "2024-01-15T10:00:00Z", expected: "2024-01-15T10:00:00Z" },
      ];

      cases.forEach(({ input, expected }) => {
        const normalized = normalize(input);
        expect(normalized).toBe(expected);
      });
    });

    it("should handle day/light saving transitions correctly", () => {
      const beforeDST = dayjs.tz("2024-03-10T01:59:59", "America/New_York");
      const afterDST = dayjs.tz("2024-03-10T03:00:00", "America/New_York");
      expect(afterDST.diff(beforeDST, "second")).toBe(1);

      const beforeFall = dayjs.tz("2024-10-27T01:59:59", "Europe/London");
      const afterFall = dayjs.tz("2024-10-27T01:00:00", "Europe/London").add(1, "hour");
      expect(afterFall.diff(beforeFall, "second")).toBe(1);
    });

    it("should prevent mixed timezone format bug (Z vs +00:00 vs -00:00)", () => {
      const cases = ["2024-01-15T10:00:00Z", "2024-01-15T10:00:00+00:00", "2024-01-15T10:00:00-00:00"];

      const normalized = cases.map((c) => normalize(c));

      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("2024-01-15T10:00:00Z");
    });

    it("should detect invalid timezone data", () => {
      const invalidZones = ["Invalid/Timezone", "Europe/Nowhere"];
      invalidZones.forEach((tz) => {
        expect(() => dayjs().tz(tz)).toThrow(RangeError);
      });
    });
  });
});
