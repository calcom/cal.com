import { describe, test, expect, vi, beforeEach } from "vitest";

import type { CalendarAdapter } from "../calendar-adapter";
import type { CalendarAdapterLogger, CalendarAdapterMetrics } from "../observable-calendar-adapter";
import { ObservableCalendarAdapter } from "../observable-calendar-adapter";
import { CalendarAdapterError } from "../lib/calendar-adapter-error";

function createMockAdapter(opts?: { withOptional?: boolean }): CalendarAdapter {
  const base: CalendarAdapter = {
    createEvent: vi.fn().mockResolvedValue({ uid: "uid-1", id: "id-1", type: "google_calendar" }),
    updateEvent: vi.fn().mockResolvedValue({ uid: "uid-1", id: "id-1", type: "google_calendar" }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    fetchBusyTimes: vi.fn().mockResolvedValue([
      { start: new Date("2026-01-01T09:00:00Z"), end: new Date("2026-01-01T10:00:00Z") },
    ]),
    listCalendars: vi.fn().mockResolvedValue([
      { externalId: "cal-1", name: "Work", integration: "google_calendar" },
    ]),
  };

  if (opts?.withOptional) {
    base.fetchEvents = vi.fn().mockResolvedValue({
      events: [{ uid: "e1", start: new Date(), end: new Date(), status: "confirmed" }],
      nextSyncToken: "token-2",
      fullSyncRequired: false,
    });
    base.subscribe = vi.fn().mockResolvedValue({
      channelId: "ch-1",
      resourceId: "res-1",
      expiration: new Date("2026-04-01T00:00:00Z"),
    });
    base.unsubscribe = vi.fn().mockResolvedValue(undefined);
    base.healthCheck = vi.fn().mockResolvedValue({ valid: true });
  }

  return base;
}

function createMockLogger(): CalendarAdapterLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockMetrics(): CalendarAdapterMetrics {
  return {
    count: vi.fn(),
    distribution: vi.fn(),
  };
}

function wrap(inner: CalendarAdapter, logger?: CalendarAdapterLogger, metrics?: CalendarAdapterMetrics) {
  return new ObservableCalendarAdapter(inner, {
    provider: "google_calendar",
    credentialId: 123,
    logger: logger ?? createMockLogger(),
    metrics: metrics ?? createMockMetrics(),
  });
}

describe("ObservableCalendarAdapter", () => {
  let inner: CalendarAdapter;
  let logger: CalendarAdapterLogger;
  let metrics: CalendarAdapterMetrics;
  let adapter: ObservableCalendarAdapter;

  beforeEach(() => {
    inner = createMockAdapter({ withOptional: true });
    logger = createMockLogger();
    metrics = createMockMetrics();
    adapter = wrap(inner, logger, metrics);
  });

  // -----------------------------------------------------------------------
  // Delegates to inner
  // -----------------------------------------------------------------------

  test("delegates createEvent to inner adapter", async () => {
    const event = { title: "Test", startTime: new Date(), endTime: new Date() };
    await adapter.createEvent(event, "primary");
    expect(inner.createEvent).toHaveBeenCalledWith(event, "primary");
  });

  test("delegates fetchBusyTimes to inner adapter", async () => {
    const params = { dateFrom: "2026-01-01", dateTo: "2026-01-31", calendars: [] };
    const result = await adapter.fetchBusyTimes(params);
    expect(inner.fetchBusyTimes).toHaveBeenCalledWith(params);
    expect(result).toHaveLength(1);
  });

  test("delegates listCalendars to inner adapter", async () => {
    const result = await adapter.listCalendars();
    expect(inner.listCalendars).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // Logging
  // -----------------------------------------------------------------------

  test("logs info on successful call", async () => {
    await adapter.fetchBusyTimes({ dateFrom: "2026-01-01", dateTo: "2026-01-31", calendars: [] });

    expect(logger.info).toHaveBeenCalledWith(
      "google_calendar.fetchBusyTimes",
      expect.objectContaining({
        credentialId: 123,
        durationMs: expect.any(Number),
      })
    );
  });

  test("logs error on failed call", async () => {
    const error = new CalendarAdapterError({ provider: "Google", message: "Auth failed", status: 401, transient: false });
    (inner.fetchBusyTimes as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(
      adapter.fetchBusyTimes({ dateFrom: "2026-01-01", dateTo: "2026-01-31", calendars: [] })
    ).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalledWith(
      "google_calendar.fetchBusyTimes",
      expect.objectContaining({
        credentialId: 123,
        status: 401,
        transient: false,
        error: "[Google] Auth failed",
      })
    );
  });

  // -----------------------------------------------------------------------
  // Metrics
  // -----------------------------------------------------------------------

  test("emits success count and duration on successful call", async () => {
    await adapter.createEvent({ title: "Test", startTime: new Date(), endTime: new Date() });

    expect(metrics.count).toHaveBeenCalledWith(
      "calendar.adapter.call.success",
      1,
      expect.objectContaining({
        attributes: expect.objectContaining({
          provider: "google_calendar",
          method: "createEvent",
        }),
      })
    );

    expect(metrics.distribution).toHaveBeenCalledWith(
      "calendar.adapter.call.duration_ms",
      expect.any(Number),
      expect.objectContaining({
        attributes: expect.objectContaining({
          provider: "google_calendar",
          method: "createEvent",
        }),
      })
    );
  });

  test("emits error count on failed call", async () => {
    const error = new CalendarAdapterError({ provider: "Google", message: "Rate limited", status: 429, transient: true });
    (inner.createEvent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(
      adapter.createEvent({ title: "Test", startTime: new Date(), endTime: new Date() })
    ).rejects.toThrow(error);

    expect(metrics.count).toHaveBeenCalledWith(
      "calendar.adapter.call.error",
      1,
      expect.objectContaining({
        attributes: expect.objectContaining({
          provider: "google_calendar",
          method: "createEvent",
          status: "429",
          transient: "true",
        }),
      })
    );
  });

  test("emits busy_slots distribution for fetchBusyTimes", async () => {
    await adapter.fetchBusyTimes({ dateFrom: "2026-01-01", dateTo: "2026-01-31", calendars: [] });

    expect(metrics.distribution).toHaveBeenCalledWith(
      "calendar.adapter.busy_slots",
      1,
      expect.objectContaining({
        attributes: expect.objectContaining({ method: "fetchBusyTimes" }),
      })
    );
  });

  test("emits calendars_listed distribution for listCalendars", async () => {
    await adapter.listCalendars();

    expect(metrics.distribution).toHaveBeenCalledWith(
      "calendar.adapter.calendars_listed",
      1,
      expect.objectContaining({
        attributes: expect.objectContaining({ method: "listCalendars" }),
      })
    );
  });

  // -----------------------------------------------------------------------
  // Optional methods
  // -----------------------------------------------------------------------

  test("exposes optional methods when inner adapter has them", () => {
    expect(adapter.fetchEvents).toBeDefined();
    expect(adapter.subscribe).toBeDefined();
    expect(adapter.unsubscribe).toBeDefined();
    expect(adapter.healthCheck).toBeDefined();
  });

  test("does NOT expose optional methods when inner adapter lacks them", () => {
    const minimal = wrap(createMockAdapter({ withOptional: false }));
    expect(minimal.fetchEvents).toBeUndefined();
    expect(minimal.subscribe).toBeUndefined();
    expect(minimal.unsubscribe).toBeUndefined();
    expect(minimal.healthCheck).toBeUndefined();
  });

  test("logs and emits metrics for fetchEvents", async () => {
    await adapter.fetchEvents!({ calendarId: "primary" });

    expect(logger.info).toHaveBeenCalledWith(
      "google_calendar.fetchEvents",
      expect.objectContaining({ credentialId: 123 })
    );
    expect(metrics.distribution).toHaveBeenCalledWith(
      "calendar.adapter.events_fetched",
      1,
      expect.any(Object)
    );
  });

  test("logs subscribe with channelId and expiration", async () => {
    await adapter.subscribe!({ calendarId: "primary", webhookUrl: "https://example.com" });

    expect(logger.info).toHaveBeenCalledWith(
      "google_calendar.subscribe",
      expect.objectContaining({
        channelId: "ch-1",
        expiration: "2026-04-01T00:00:00.000Z",
      })
    );
  });

  test("logs healthCheck valid=true as info", async () => {
    await adapter.healthCheck!();

    expect(logger.info).toHaveBeenCalledWith(
      "google_calendar.healthCheck",
      expect.objectContaining({ valid: true })
    );
    expect(metrics.count).toHaveBeenCalledWith(
      "calendar.adapter.health.valid",
      1,
      expect.any(Object)
    );
  });

  test("logs healthCheck valid=false as warn", async () => {
    (inner.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      valid: false,
      reason: "invalid_grant",
    });

    await adapter.healthCheck!();

    expect(logger.warn).toHaveBeenCalledWith(
      "google_calendar.healthCheck",
      expect.objectContaining({ valid: false, reason: "invalid_grant" })
    );
    expect(metrics.count).toHaveBeenCalledWith(
      "calendar.adapter.health.invalid",
      1,
      expect.objectContaining({
        attributes: expect.objectContaining({ reason: "invalid_grant" }),
      })
    );
  });

  // -----------------------------------------------------------------------
  // Error propagation
  // -----------------------------------------------------------------------

  test("re-throws errors from inner adapter without swallowing", async () => {
    const error = new Error("Unexpected");
    (inner.deleteEvent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    await expect(adapter.deleteEvent("uid-1")).rejects.toThrow("Unexpected");
  });
});
