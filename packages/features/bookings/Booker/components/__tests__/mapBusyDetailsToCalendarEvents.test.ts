import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { mapBusyDetailsToCalendarEvents, type BusyDetail } from "../mapBusyDetailsToCalendarEvents";

describe("mapBusyDetailsToCalendarEvents", () => {
  it("maps timed events with title", () => {
    const start = dayjs("2025-10-15T09:00:00").toDate();
    const end = dayjs("2025-10-15T10:00:00").toDate();
    const result = mapBusyDetailsToCalendarEvents([{ start, end, title: "Meeting" } satisfies BusyDetail]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Meeting");
    expect(result[0].options?.hideTime).toBeFalsy();
  });

  it("renders all-day-like events as compact banners", () => {
    const start = dayjs("2025-10-15T00:00:00").toDate();
    const end = dayjs("2025-10-16T00:00:00").toDate();
    const result = mapBusyDetailsToCalendarEvents([{ start, end, title: "All Day" } satisfies BusyDetail]);
    expect(result).toHaveLength(1);
    const evt = result[0];
    expect(evt.options?.hideTime).toBeTruthy();
    expect(evt.options?.className).toContain("bg-muted");
    // 30min banner between start of day and +30m
    expect(dayjs(evt.end).diff(dayjs(evt.start), "minute")).toBe(30);
  });
});
