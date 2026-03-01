import type { AppsStatus } from "@calcom/types/Calendar";
import { describe, expect, it } from "vitest";
import { handleAppsStatus } from "./handleAppsStatus";

function makeResult(
  overrides: Partial<Parameters<typeof handleAppsStatus>[0][number]> = {}
): Parameters<typeof handleAppsStatus>[0][number] {
  return {
    type: "daily_video",
    appName: "Daily.co",
    success: true,
    calError: undefined,
    calWarnings: [],
    createdEvent: undefined,
    updatedEvent: undefined,
    originalEvent: undefined,
    ...overrides,
  } as Parameters<typeof handleAppsStatus>[0][number];
}

describe("handleAppsStatus", () => {
  describe("when reqAppsStatus is undefined (first booking in series)", () => {
    it("returns result status array mapped from event results", () => {
      const results = [makeResult({ success: true })];
      const booking = {} as Parameters<typeof handleAppsStatus>[1];

      const status = handleAppsStatus(results, booking, undefined);

      expect(status).toHaveLength(1);
      expect(status[0]).toMatchObject({
        appName: "Daily.co",
        type: "daily_video",
        success: 1,
        failures: 0,
      });
    });

    it("sets appsStatus on booking object", () => {
      const results = [makeResult()];
      const booking = {} as Parameters<typeof handleAppsStatus>[1];

      handleAppsStatus(results, booking, undefined);

      expect(booking?.appsStatus).toBeDefined();
      expect(booking?.appsStatus).toHaveLength(1);
    });

    it("handles null booking gracefully", () => {
      const results = [makeResult()];
      const status = handleAppsStatus(results, null, undefined);

      expect(status).toHaveLength(1);
    });

    it("maps failed results correctly", () => {
      const results = [makeResult({ success: false, calError: "Connection failed" })];
      const status = handleAppsStatus(results, null, undefined);

      expect(status[0]).toMatchObject({
        success: 0,
        failures: 1,
        errors: ["Connection failed"],
      });
    });
  });

  describe("when reqAppsStatus is provided (last booking in recurring series)", () => {
    it("aggregates status from previous bookings with current results", () => {
      const previousStatus: AppsStatus[] = [
        {
          appName: "Daily.co",
          type: "daily_video",
          success: 2,
          failures: 0,
          errors: [],
          warnings: [],
        },
      ];
      const results = [makeResult({ success: true })];

      const status = handleAppsStatus(results, null, previousStatus);

      expect(status).toHaveLength(1);
      expect(status[0].success).toBe(3);
    });

    it("aggregates errors across bookings", () => {
      const previousStatus: AppsStatus[] = [
        {
          appName: "Daily.co",
          type: "daily_video",
          success: 1,
          failures: 1,
          errors: ["First error"],
          warnings: [],
        },
      ];
      const results = [makeResult({ success: false, calError: "Second error" })];

      const status = handleAppsStatus(results, null, previousStatus);

      expect(status[0].errors).toEqual(["First error", "Second error"]);
    });

    it("handles multiple app types separately", () => {
      const previousStatus: AppsStatus[] = [
        { appName: "Daily.co", type: "daily_video", success: 1, failures: 0, errors: [], warnings: [] },
      ];
      const results = [makeResult({ type: "google_calendar", appName: "Google Calendar", success: true })];

      const status = handleAppsStatus(results, null, previousStatus);

      expect(status).toHaveLength(2);
    });
  });
});
