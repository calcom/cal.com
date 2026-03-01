import { describe, expect, it } from "vitest";
import { handleAppsStatus } from "./handleAppsStatus";

describe("handleAppsStatus", () => {
  it("maps results to apps status when reqAppsStatus is undefined", () => {
    const results = [
      { appName: "Google Calendar", type: "google_calendar", success: true, calWarnings: [] },
      { appName: "Zoom", type: "zoom_video", success: false, calError: "Connection failed", calWarnings: [] },
    ];
    const booking = { appsStatus: undefined };

    const status = handleAppsStatus(results as never, booking as never, undefined);
    expect(status).toHaveLength(2);
    expect(status[0].success).toBe(1);
    expect(status[0].failures).toBe(0);
    expect(status[1].success).toBe(0);
    expect(status[1].failures).toBe(1);
    expect(status[1].errors).toEqual(["Connection failed"]);
  });

  it("sets booking.appsStatus when booking is not null and reqAppsStatus is undefined", () => {
    const results = [{ appName: "Google Calendar", type: "google_calendar", success: true, calWarnings: [] }];
    const booking = { appsStatus: undefined };

    handleAppsStatus(results as never, booking as never, undefined);
    expect(booking.appsStatus).toBeDefined();
    expect(booking.appsStatus).toHaveLength(1);
  });

  it("aggregates status when reqAppsStatus is provided", () => {
    const results = [{ appName: "Google Calendar", type: "google_calendar", success: true, calWarnings: [] }];
    const existingStatus = [
      {
        appName: "Google Calendar",
        type: "google_calendar",
        success: 2,
        failures: 1,
        errors: [],
        warnings: [],
      },
    ];

    const status = handleAppsStatus(results as never, null, existingStatus as never);
    expect(status).toHaveLength(1);
    expect(status[0].success).toBe(3);
  });

  it("handles null booking gracefully", () => {
    const results = [{ appName: "Zoom", type: "zoom_video", success: true, calWarnings: [] }];

    const status = handleAppsStatus(results as never, null, undefined);
    expect(status).toHaveLength(1);
  });

  it("handles empty results array", () => {
    const status = handleAppsStatus([], null, undefined);
    expect(status).toEqual([]);
  });
});
