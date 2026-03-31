import { describe, it, expect } from "vitest";

import { bookingTable } from "../tables/booking";
import {
  FAILED_STATUSES,
  STATUS_VARIANTS,
  shortTaskName,
  formatDuration,
  formatCost,
  formatRunDate,
} from "../lib/trigger-run-utils";

describe("Booking table panel registration", () => {
  it("has a trigger-runs panel defined", () => {
    expect(bookingTable.panels).toBeDefined();
    const triggerPanel = bookingTable.panels?.find((p) => p.id === "trigger-runs");
    expect(triggerPanel).toBeDefined();
    expect(triggerPanel?.label).toBe("Trigger.dev Runs");
  });

  it("has uid field for tag lookup", () => {
    const uidField = bookingTable.fields.find((f) => f.column === "uid");
    expect(uidField).toBeDefined();
    expect(uidField?.type).toBe("string");
  });
});

describe("shortTaskName", () => {
  it("returns short names unchanged", () => {
    expect(shortTaskName("webhook.deliver")).toBe("webhook.deliver");
  });

  it("returns 3-part names unchanged", () => {
    expect(shortTaskName("booking.send.confirm")).toBe("booking.send.confirm");
  });

  it("abbreviates names with 4+ parts", () => {
    expect(shortTaskName("booking.send.confirm.notifications")).toBe("booking…confirm.notifications");
  });

  it("abbreviates deeply nested names", () => {
    expect(shortTaskName("a.b.c.d.e")).toBe("a…d.e");
  });

  it("handles single-part names", () => {
    expect(shortTaskName("task")).toBe("task");
  });
});

describe("formatDuration", () => {
  it("formats sub-second as ms", () => {
    expect(formatDuration(150)).toBe("150ms");
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(2500)).toBe("2.5s");
    expect(formatDuration(59999)).toBe("60.0s");
  });

  it("formats minutes", () => {
    expect(formatDuration(60_000)).toBe("1.0m");
    expect(formatDuration(90_000)).toBe("1.5m");
    expect(formatDuration(300_000)).toBe("5.0m");
  });
});

describe("formatCost", () => {
  it("returns dash for zero cost", () => {
    expect(formatCost(0)).toBe("—");
  });

  it("formats cents as dollars", () => {
    expect(formatCost(1)).toBe("$0.0100");
    expect(formatCost(150)).toBe("$1.5000");
    expect(formatCost(5)).toBe("$0.0500");
  });
});

describe("formatRunDate", () => {
  it("returns dash for null", () => {
    expect(formatRunDate(null)).toBe("—");
  });

  it("formats a valid date string", () => {
    const result = formatRunDate("2026-03-15T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});

describe("STATUS_VARIANTS", () => {
  it("maps success status to green", () => {
    expect(STATUS_VARIANTS.COMPLETED).toBe("green");
  });

  it("maps failure statuses to red", () => {
    expect(STATUS_VARIANTS.FAILED).toBe("red");
    expect(STATUS_VARIANTS.CRASHED).toBe("red");
    expect(STATUS_VARIANTS.SYSTEM_FAILURE).toBe("red");
    expect(STATUS_VARIANTS.TIMED_OUT).toBe("red");
  });

  it("maps in-progress statuses to blue", () => {
    expect(STATUS_VARIANTS.EXECUTING).toBe("blue");
    expect(STATUS_VARIANTS.WAITING).toBe("blue");
  });

  it("maps queued statuses to gray", () => {
    expect(STATUS_VARIANTS.QUEUED).toBe("gray");
    expect(STATUS_VARIANTS.DEQUEUED).toBe("gray");
    expect(STATUS_VARIANTS.DELAYED).toBe("gray");
  });
});

describe("FAILED_STATUSES", () => {
  it("includes all failure statuses", () => {
    expect(FAILED_STATUSES.has("FAILED")).toBe(true);
    expect(FAILED_STATUSES.has("CRASHED")).toBe(true);
    expect(FAILED_STATUSES.has("SYSTEM_FAILURE")).toBe(true);
    expect(FAILED_STATUSES.has("TIMED_OUT")).toBe(true);
  });

  it("excludes non-failure statuses", () => {
    expect(FAILED_STATUSES.has("COMPLETED")).toBe(false);
    expect(FAILED_STATUSES.has("QUEUED")).toBe(false);
    expect(FAILED_STATUSES.has("EXECUTING")).toBe(false);
    expect(FAILED_STATUSES.has("CANCELED")).toBe(false);
    expect(FAILED_STATUSES.has("EXPIRED")).toBe(false);
  });
});

describe("tag format compatibility", () => {
  it("booking tag format matches expected pattern", () => {
    const bookingUid = "ssXaggYq5Vp8Xf6wi37epU";
    const tag = `booking:${bookingUid}`;
    expect(tag).toBe("booking:ssXaggYq5Vp8Xf6wi37epU");
    expect(tag.startsWith("booking:")).toBe(true);
  });

  it("trigger_event tag can be parsed from tags array", () => {
    const tags = [
      "trigger_event:BOOKING_CREATED",
      "team:123286",
      "booking:ssXaggYq5Vp8Xf6wi37epU",
      "eventtype:4667380",
    ];

    const eventTag = tags.find((t) => t.startsWith("trigger_event:"));
    expect(eventTag).toBe("trigger_event:BOOKING_CREATED");

    const bookingTag = tags.find((t) => t.startsWith("booking:"));
    expect(bookingTag).toBe("booking:ssXaggYq5Vp8Xf6wi37epU");
  });
});
