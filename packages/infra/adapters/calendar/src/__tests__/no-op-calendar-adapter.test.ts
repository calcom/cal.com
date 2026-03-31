import { describe, expect, test } from "vitest";
import { NoOpCalendarAdapter } from "../no-op-calendar-adapter";

describe("NoOpCalendarAdapter", () => {
  const adapter = new NoOpCalendarAdapter();

  describe("createEvent", () => {
    test("returns empty result with type noop", async () => {
      const result = await adapter.createEvent({
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
      });
      expect(result).toEqual({ uid: "", id: "", type: "noop" });
    });
  });

  describe("updateEvent", () => {
    test("returns result with provided uid", async () => {
      const result = await adapter.updateEvent("uid-123", {
        title: "Updated",
        startTime: new Date(),
        endTime: new Date(),
      });
      expect(result).toEqual({ uid: "uid-123", id: "uid-123", type: "noop" });
    });
  });

  describe("deleteEvent", () => {
    test("completes without error", async () => {
      await expect(adapter.deleteEvent("uid-123")).resolves.toBeUndefined();
    });

    test("accepts optional event context", async () => {
      await expect(
        adapter.deleteEvent("uid-123", { title: "Test", startTime: new Date(), endTime: new Date() })
      ).resolves.toBeUndefined();
    });
  });

  describe("fetchBusyTimes", () => {
    test("returns empty array", async () => {
      const result = await adapter.fetchBusyTimes({
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        calendars: [],
      });
      expect(result).toEqual([]);
    });
  });

  describe("listCalendars", () => {
    test("returns empty array", async () => {
      const result = await adapter.listCalendars();
      expect(result).toEqual([]);
    });
  });

  describe("subscribe", () => {
    test("returns empty channel id", async () => {
      const result = await adapter.subscribe({
        calendarId: "primary",
        webhookUrl: "https://example.com/webhook",
      });
      expect(result).toEqual({ channelId: "" });
    });
  });

  describe("unsubscribe", () => {
    test("completes without error", async () => {
      await expect(adapter.unsubscribe({ channelId: "ch-123" })).resolves.toBeUndefined();
    });
  });

  describe("healthCheck", () => {
    test("returns valid", async () => {
      const result = await adapter.healthCheck();
      expect(result).toEqual({ valid: true });
    });
  });
});
