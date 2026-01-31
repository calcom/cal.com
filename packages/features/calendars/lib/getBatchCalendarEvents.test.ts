import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { describe, expect, it, vi } from "vitest";
import { getBatchCalendarEvents } from "./getBatchCalendarEvents";

vi.mock("@calcom/app-store/_utils/getCalendar");
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));
vi.mock("@calcom/lib/server/perfObserver", () => ({
  performance: {
    mark: vi.fn(),
    measure: vi.fn(),
  },
}));

describe("getBatchCalendarEvents", () => {
  it("should batch credentials and distribute results by source", async () => {
    const mockGetAvailability = vi.fn().mockResolvedValue([
      { start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z", source: "cal1" },
      { start: "2023-01-01T12:00:00Z", end: "2023-01-01T13:00:00Z", source: "cal2" },
    ]);

    (getCalendar as any).mockResolvedValue({
      getAvailability: mockGetAvailability,
    });

    const requests = [
      {
        credential: { id: 1, type: "google_calendar" } as any,
        externalIds: ["cal1", "cal2"],
      },
      {
        credential: { id: 2, type: "google_calendar" } as any,
        externalIds: ["cal3"],
      },
    ];

    const result = await getBatchCalendarEvents(requests, "2023-01-01T00:00:00Z", "2023-01-01T23:59:59Z");

    expect(getCalendar).toHaveBeenCalledTimes(2);
    expect(mockGetAvailability).toHaveBeenCalledTimes(2);

    expect(result["cal1"]).toHaveLength(1);
    expect(result["cal1"][0].source).toBe("cal1");
    expect(result["cal2"]).toHaveLength(1);
    expect(result["cal2"][0].source).toBe("cal2");
  });

  it("should handle single calendar fallback when source is missing", async () => {
    const mockGetAvailability = vi.fn().mockResolvedValue([
      { start: "2023-01-01T10:00:00Z", end: "2023-01-01T11:00:00Z" }, // No source
    ]);

    (getCalendar as any).mockResolvedValue({
      getAvailability: mockGetAvailability,
    });

    const requests = [
      {
        credential: { id: 1, type: "other_calendar" } as any,
        externalIds: ["cal1"],
      },
    ];

    const result = await getBatchCalendarEvents(requests, "2023-01-01T00:00:00Z", "2023-01-01T23:59:59Z");

    expect(result["cal1"]).toHaveLength(1);
  });
});
