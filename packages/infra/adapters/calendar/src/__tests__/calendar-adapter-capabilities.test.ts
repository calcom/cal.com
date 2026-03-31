import { describe, expect, test } from "vitest";
import type { CalendarAdapter } from "../calendar-adapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  HealthCheckResult,
  SubscribeResult,
} from "../calendar-adapter-types";

/**
 * Adapter that only supports core CRUD — no optional methods.
 * Simulates a CalDAV or ICS provider.
 */
class CalDAVLikeAdapter implements CalendarAdapter {
  async createEvent(_event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid: "caldav-uid", id: "caldav-id", type: "caldav" };
  }

  async updateEvent(uid: string, _event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid, id: uid, type: "caldav" };
  }

  async deleteEvent(): Promise<void> {}

  async fetchBusyTimes(_params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    return [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [];
  }
}

/**
 * Adapter that supports all optional methods.
 * Simulates Google Calendar.
 */
class FullAdapter implements CalendarAdapter {
  async createEvent(_event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid: "full-uid", id: "full-id", type: "google" };
  }

  async updateEvent(uid: string, _event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid, id: uid, type: "google" };
  }

  async deleteEvent(): Promise<void> {}

  async fetchBusyTimes(_params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    return [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [];
  }

  async subscribe(): Promise<SubscribeResult> {
    return { channelId: "ch-1", expiration: new Date("2026-04-01") };
  }

  async unsubscribe(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    return { valid: true };
  }
}

describe("CalendarAdapter optional method checking", () => {
  test("consumers gate watch operations by checking method existence", async () => {
    const adapter: CalendarAdapter = new FullAdapter();

    if (adapter.subscribe) {
      const result = await adapter.subscribe({
        calendarId: "primary",
        webhookUrl: "https://example.com/webhook",
      });
      expect(result.channelId).toBe("ch-1");
    }
  });

  test("consumers skip watch for adapters without the method", () => {
    const adapter: CalendarAdapter = new CalDAVLikeAdapter();

    expect(adapter.subscribe).toBeUndefined();
    expect(adapter.unsubscribe).toBeUndefined();
  });

  test("consumers gate health checks by checking method existence", async () => {
    const adapter: CalendarAdapter = new FullAdapter();

    if (adapter.healthCheck) {
      const result = await adapter.healthCheck();
      expect(result.valid).toBe(true);
    }
  });

  test("all adapters implement core CRUD regardless of optional methods", async () => {
    const adapters: CalendarAdapter[] = [new CalDAVLikeAdapter(), new FullAdapter()];

    for (const adapter of adapters) {
      const event: CalendarEventInput = {
        title: "Test",
        startTime: new Date("2026-03-23T10:00:00Z"),
        endTime: new Date("2026-03-23T11:00:00Z"),
      };

      const created = await adapter.createEvent(event);
      expect(created.uid).toBeTruthy();

      const updated = await adapter.updateEvent(created.uid, event);
      expect(updated).toBeTruthy();

      await expect(adapter.deleteEvent(created.uid)).resolves.toBeUndefined();

      const availability = await adapter.fetchBusyTimes({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        calendars: [],
      });
      expect(Array.isArray(availability)).toBe(true);

      const calendars = await adapter.listCalendars();
      expect(Array.isArray(calendars)).toBe(true);
    }
  });
});
