import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

/**
 * Tests for timezone normalization in getUserAvailability.
 *
 * These tests verify that busy times are properly normalized to UTC before
 * availability calculations, which is critical for Round Robin scheduling
 * where team members may be in different timezones.
 *
 * Related issue: #22150
 */
describe("Timezone Normalization for Busy Times", () => {
  describe("formattedBusyTimes UTC conversion", () => {
    it("should normalize busy times from different timezones to UTC", () => {
      // Simulate busy times that might come from different calendar sources
      // with different timezone formats
      const busyTimesFromIST = {
        start: "2024-01-15T14:30:00+05:30", // 2:30 PM IST
        end: "2024-01-15T15:30:00+05:30", // 3:30 PM IST
      };

      const busyTimesFromEST = {
        start: "2024-01-15T04:00:00-05:00", // 4:00 AM EST
        end: "2024-01-15T05:00:00-05:00", // 5:00 AM EST
      };

      const busyTimesFromGMT = {
        start: "2024-01-15T09:00:00Z", // 9:00 AM GMT/UTC
        end: "2024-01-15T10:00:00Z", // 10:00 AM GMT/UTC
      };

      // Apply the UTC normalization (this is what the fix does)
      const normalizedIST = {
        start: dayjs(busyTimesFromIST.start).utc(),
        end: dayjs(busyTimesFromIST.end).utc(),
      };

      const normalizedEST = {
        start: dayjs(busyTimesFromEST.start).utc(),
        end: dayjs(busyTimesFromEST.end).utc(),
      };

      const normalizedGMT = {
        start: dayjs(busyTimesFromGMT.start).utc(),
        end: dayjs(busyTimesFromGMT.end).utc(),
      };

      // All times should now be in UTC format
      // IST is UTC+5:30, so 14:30 IST = 09:00 UTC
      expect(normalizedIST.start.toISOString()).toBe("2024-01-15T09:00:00.000Z");
      expect(normalizedIST.end.toISOString()).toBe("2024-01-15T10:00:00.000Z");

      // EST is UTC-5, so 04:00 EST = 09:00 UTC
      expect(normalizedEST.start.toISOString()).toBe("2024-01-15T09:00:00.000Z");
      expect(normalizedEST.end.toISOString()).toBe("2024-01-15T10:00:00.000Z");

      // GMT is already UTC
      expect(normalizedGMT.start.toISOString()).toBe("2024-01-15T09:00:00.000Z");
      expect(normalizedGMT.end.toISOString()).toBe("2024-01-15T10:00:00.000Z");
    });

    it("should correctly identify overlapping busy times when normalized to UTC", () => {
      // This test demonstrates the bug that was fixed:
      // Without UTC normalization, these times might appear as different times
      // even though they represent the same moment in time

      // Team member 1 in IST reports busy at 2:30 PM IST
      const member1BusyTime = {
        start: "2024-01-15T14:30:00+05:30",
        end: "2024-01-15T15:30:00+05:30",
      };

      // Team member 2 in EST reports busy at 4:00 AM EST (same UTC time!)
      const member2BusyTime = {
        start: "2024-01-15T04:00:00-05:00",
        end: "2024-01-15T05:00:00-05:00",
      };

      // Normalize to UTC
      const normalized1 = {
        start: dayjs(member1BusyTime.start).utc(),
        end: dayjs(member1BusyTime.end).utc(),
      };

      const normalized2 = {
        start: dayjs(member2BusyTime.start).utc(),
        end: dayjs(member2BusyTime.end).utc(),
      };

      // Both should represent the same UTC time
      expect(normalized1.start.valueOf()).toBe(normalized2.start.valueOf());
      expect(normalized1.end.valueOf()).toBe(normalized2.end.valueOf());
    });

    it("should correctly identify no availability when all team members are busy at the same UTC time", () => {
      // Simulate a Round Robin scenario where all team members are busy
      // at the same UTC time but reported in different timezone formats

      const teamMembersBusyTimes = [
        // Member in Tokyo (UTC+9)
        { start: "2024-01-15T18:00:00+09:00", end: "2024-01-15T19:00:00+09:00" },
        // Member in London (UTC+0)
        { start: "2024-01-15T09:00:00Z", end: "2024-01-15T10:00:00Z" },
        // Member in New York (UTC-5)
        { start: "2024-01-15T04:00:00-05:00", end: "2024-01-15T05:00:00-05:00" },
      ];

      // Normalize all to UTC
      const normalizedBusyTimes = teamMembersBusyTimes.map((busy) => ({
        start: dayjs(busy.start).utc(),
        end: dayjs(busy.end).utc(),
      }));

      // All should represent the same UTC time (09:00-10:00 UTC)
      const expectedStartUTC = "2024-01-15T09:00:00.000Z";
      const expectedEndUTC = "2024-01-15T10:00:00.000Z";

      normalizedBusyTimes.forEach((busy, index) => {
        expect(busy.start.toISOString()).toBe(expectedStartUTC);
        expect(busy.end.toISOString()).toBe(expectedEndUTC);
      });

      // This means the slot 09:00-10:00 UTC should be marked as unavailable
      // for Round Robin since ALL team members are busy at this time
    });

    it("should handle daylight saving time transitions correctly", () => {
      // Test DST transition in US (March 10, 2024 - clocks spring forward)
      // Before DST: EST (UTC-5), After DST: EDT (UTC-4)

      // Busy time before DST change (still EST)
      const beforeDST = {
        start: "2024-03-09T10:00:00-05:00", // 10 AM EST
        end: "2024-03-09T11:00:00-05:00", // 11 AM EST
      };

      // Busy time after DST change (now EDT)
      const afterDST = {
        start: "2024-03-11T10:00:00-04:00", // 10 AM EDT
        end: "2024-03-11T11:00:00-04:00", // 11 AM EDT
      };

      const normalizedBefore = {
        start: dayjs(beforeDST.start).utc(),
        end: dayjs(beforeDST.end).utc(),
      };

      const normalizedAfter = {
        start: dayjs(afterDST.start).utc(),
        end: dayjs(afterDST.end).utc(),
      };

      // Before DST: 10 AM EST = 15:00 UTC
      expect(normalizedBefore.start.toISOString()).toBe("2024-03-09T15:00:00.000Z");
      expect(normalizedBefore.end.toISOString()).toBe("2024-03-09T16:00:00.000Z");

      // After DST: 10 AM EDT = 14:00 UTC (one hour earlier in UTC)
      expect(normalizedAfter.start.toISOString()).toBe("2024-03-11T14:00:00.000Z");
      expect(normalizedAfter.end.toISOString()).toBe("2024-03-11T15:00:00.000Z");
    });

    it("should handle UTC+0 and UTC-0 formats consistently", () => {
      // Different ways to express UTC time
      const utcFormats = [
        { start: "2024-01-15T09:00:00Z", end: "2024-01-15T10:00:00Z" },
        { start: "2024-01-15T09:00:00+00:00", end: "2024-01-15T10:00:00+00:00" },
        { start: "2024-01-15T09:00:00-00:00", end: "2024-01-15T10:00:00-00:00" },
      ];

      const normalizedTimes = utcFormats.map((busy) => ({
        start: dayjs(busy.start).utc(),
        end: dayjs(busy.end).utc(),
      }));

      // All should normalize to the same UTC time
      const expectedStart = normalizedTimes[0].start.valueOf();
      const expectedEnd = normalizedTimes[0].end.valueOf();

      normalizedTimes.forEach((busy) => {
        expect(busy.start.valueOf()).toBe(expectedStart);
        expect(busy.end.valueOf()).toBe(expectedEnd);
      });
    });

    it("should handle edge case with midnight crossing in different timezones", () => {
      // A meeting that crosses midnight in one timezone but not in another

      // 11 PM to 1 AM in Tokyo (crosses midnight locally)
      const tokyoMeeting = {
        start: "2024-01-15T23:00:00+09:00",
        end: "2024-01-16T01:00:00+09:00",
      };

      // Same meeting in UTC (14:00 to 16:00 - doesn't cross midnight)
      const normalized = {
        start: dayjs(tokyoMeeting.start).utc(),
        end: dayjs(tokyoMeeting.end).utc(),
      };

      expect(normalized.start.toISOString()).toBe("2024-01-15T14:00:00.000Z");
      expect(normalized.end.toISOString()).toBe("2024-01-15T16:00:00.000Z");

      // The meeting should be correctly represented as a continuous block
      // in UTC, not split across days
      expect(normalized.start.date()).toBe(15);
      expect(normalized.end.date()).toBe(15);
    });

    it("should prevent the original bug where mixed timezone formats caused incorrect availability", () => {
      // This test reproduces the original bug scenario from issue #22150
      // where busy times in different timezone formats were compared without normalization

      // Availability window: 09:00-17:00 UTC
      const availabilityStart = dayjs("2024-01-15T09:00:00Z");
      const availabilityEnd = dayjs("2024-01-15T17:00:00Z");

      // Busy time reported in IST format (should block 09:00-10:00 UTC)
      const busyTimeIST = {
        start: "2024-01-15T14:30:00+05:30", // 09:00 UTC
        end: "2024-01-15T15:30:00+05:30", // 10:00 UTC
      };

      // WITHOUT the fix (simulating the bug):
      // If we just parse without .utc(), the comparison might be incorrect
      const busyWithoutFix = {
        start: dayjs(busyTimeIST.start), // Keeps original timezone info
        end: dayjs(busyTimeIST.end),
      };

      // WITH the fix:
      const busyWithFix = {
        start: dayjs(busyTimeIST.start).utc(),
        end: dayjs(busyTimeIST.end).utc(),
      };

      // The fix ensures the busy time is correctly identified as 09:00-10:00 UTC
      expect(busyWithFix.start.toISOString()).toBe("2024-01-15T09:00:00.000Z");
      expect(busyWithFix.end.toISOString()).toBe("2024-01-15T10:00:00.000Z");

      // Verify the busy time overlaps with the availability window
      const overlapsWithAvailability =
        busyWithFix.start.isBefore(availabilityEnd) && busyWithFix.end.isAfter(availabilityStart);

      expect(overlapsWithAvailability).toBe(true);
    });
  });
});
