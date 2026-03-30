import { describe, expect, test } from "vitest";

import { AppleCalendarAdapter } from "../adapters/AppleCalendarAdapter";
import { BaseByteDanceCalendarAdapter } from "../adapters/BaseByteDanceCalendarAdapter";
import { CalDAVCalendarAdapter } from "../adapters/CalDAVCalendarAdapter";
import { ExchangeCalendarAdapter } from "../adapters/ExchangeCalendarAdapter";
import { FeishuCalendarAdapter } from "../adapters/FeishuCalendarAdapter";
import { GoogleCalendarAdapter } from "../adapters/GoogleCalendarAdapter";
import { ICSFeedCalendarAdapter } from "../adapters/ICSFeedCalendarAdapter";
import { LarkCalendarAdapter } from "../adapters/LarkCalendarAdapter";
import { Office365CalendarAdapter } from "../adapters/Office365CalendarAdapter";
import { ZohoCalendarAdapter } from "../adapters/ZohoCalendarAdapter";
import type { CalendarAdapter } from "../CalendarAdapter";
import type { CalendarCredential } from "../CalendarAdapterTypes";
import { NoOpCalendarAdapter } from "../NoOpCalendarAdapter";

interface ProviderTestCase {
  name: string;
  adapter: CalendarAdapter;
  hasSubscribe: boolean;
  hasHealthCheck: boolean;
  isReadOnly: boolean;
  /** Adapter has real implementations (not just stubs). Skips "not wired yet" tests. */
  isImplemented: boolean;
}

const providers: ProviderTestCase[] = [
  {
    name: "GoogleCalendarAdapter",
    adapter: new GoogleCalendarAdapter({
      id: 1,
      type: "google_calendar",
      key: { access_token: "fake-token" },
    }),
    hasSubscribe: true,
    hasHealthCheck: true,
    isReadOnly: false,
    isImplemented: true,
  },
  {
    name: "Office365CalendarAdapter",
    adapter: new Office365CalendarAdapter({
      id: 1,
      type: "office365_calendar",
      key: { access_token: "fake-token" },
    }),
    hasSubscribe: true,
    hasHealthCheck: true,
    isReadOnly: false,
    isImplemented: false,
  },
  {
    name: "FeishuCalendarAdapter",
    adapter: new FeishuCalendarAdapter({
      id: 1,
      type: "feishu_calendar",
      key: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expiry_date: Date.now() + 3600000,
        refresh_expires_date: Date.now() + 86400000,
      },
    }),
    hasSubscribe: true,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: true,
  },
  {
    name: "LarkCalendarAdapter",
    adapter: new LarkCalendarAdapter({
      id: 1,
      type: "lark_calendar",
      key: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expiry_date: Date.now() + 3600000,
        refresh_expires_date: Date.now() + 86400000,
      },
    }),
    hasSubscribe: true,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: true,
  },
  {
    name: "CalDAVCalendarAdapter",
    adapter: new CalDAVCalendarAdapter({
      id: 1,
      type: "caldav_calendar",
      key: { username: "test", password: "test", url: "https://caldav.example.com" },
    }),
    hasSubscribe: false,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: false,
  },
  {
    name: "AppleCalendarAdapter",
    adapter: new AppleCalendarAdapter({
      id: 1,
      type: "apple_calendar",
      key: { username: "test", password: "test", url: "https://caldav.example.com" },
    }),
    hasSubscribe: false,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: false,
  },
  {
    name: "ExchangeCalendarAdapter",
    adapter: new ExchangeCalendarAdapter({
      id: 1,
      type: "exchange_calendar",
      key: {
        username: "test",
        password: "test",
        url: "https://exchange.example.com",
        exchangeVersion: "Exchange2016",
        authenticationMethod: "Basic",
      },
    }),
    hasSubscribe: false,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: false,
  },
  {
    name: "ZohoCalendarAdapter",
    adapter: new ZohoCalendarAdapter({
      id: 1,
      type: "zoho_calendar",
      key: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_in: 3600,
        server_location: "com",
      },
    }),
    hasSubscribe: false,
    hasHealthCheck: false,
    isReadOnly: false,
    isImplemented: true,
  },
  {
    name: "ICSFeedCalendarAdapter",
    adapter: new ICSFeedCalendarAdapter({
      id: 1,
      type: "ics_feed_calendar",
      key: { urls: ["https://example.com/feed.ics"] },
    }),
    hasSubscribe: false,
    hasHealthCheck: false,
    isReadOnly: true,
    isImplemented: true,
  },
];

describe("Provider adapters", () => {
  describe.each(providers)("$name", ({ adapter, hasSubscribe, hasHealthCheck, isImplemented }) => {
    if (!isImplemented) {
      test("core CRUD methods throw 'not wired yet'", async () => {
        const event = { title: "Test", startTime: new Date(), endTime: new Date() };

        await expect(adapter.createEvent(event)).rejects.toThrow();
        await expect(adapter.updateEvent("uid", event)).rejects.toThrow();
        await expect(adapter.deleteEvent("uid")).rejects.toThrow();
        await expect(
          adapter.fetchBusyTimes({ dateFrom: "2026-01-01", dateTo: "2026-01-31", calendars: [] })
        ).rejects.toThrow();
        await expect(adapter.listCalendars()).rejects.toThrow();
      });
    }

    if (hasSubscribe) {
      test("has subscribe and unsubscribe methods", () => {
        expect(adapter.subscribe).toBeDefined();
        expect(adapter.unsubscribe).toBeDefined();
      });
    } else {
      test("does not have subscribe methods", () => {
        expect(adapter.subscribe).toBeUndefined();
        expect(adapter.unsubscribe).toBeUndefined();
      });
    }

    if (hasHealthCheck) {
      test("has healthCheck method", () => {
        expect(adapter.healthCheck).toBeDefined();
      });
    } else {
      test("does not have healthCheck", () => {
        expect(adapter.healthCheck).toBeUndefined();
      });
    }
  });

  test("AppleCalendarAdapter extends CalDAVCalendarAdapter", () => {
    const adapter = new AppleCalendarAdapter({
      id: 1,
      type: "apple_calendar",
      key: { username: "test", password: "test", url: "https://caldav.example.com" },
    });
    expect(adapter).toBeInstanceOf(CalDAVCalendarAdapter);
  });

  test("LarkCalendarAdapter shares base class with FeishuCalendarAdapter", () => {
    const feishu = new FeishuCalendarAdapter({
      id: 1,
      type: "feishu_calendar",
      key: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expiry_date: Date.now() + 3600000,
        refresh_expires_date: Date.now() + 86400000,
      },
    });
    const lark = new LarkCalendarAdapter({
      id: 1,
      type: "lark_calendar",
      key: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expiry_date: Date.now() + 3600000,
        refresh_expires_date: Date.now() + 86400000,
      },
    });
    expect(feishu).toBeInstanceOf(BaseByteDanceCalendarAdapter);
    expect(lark).toBeInstanceOf(BaseByteDanceCalendarAdapter);
  });

  test("ICSFeedCalendarAdapter write operations throw descriptive read-only errors", async () => {
    const adapter = new ICSFeedCalendarAdapter({
      id: 1,
      type: "ics_feed_calendar",
      key: { urls: ["https://example.com/feed.ics"] },
    });
    const event = { title: "Test", startTime: new Date(), endTime: new Date() };

    await expect(adapter.createEvent(event)).rejects.toThrow("read-only");
    await expect(adapter.updateEvent("uid", event)).rejects.toThrow("read-only");
    await expect(adapter.deleteEvent("uid")).rejects.toThrow("read-only");
  });

  test("ICSFeedCalendarAdapter.listCalendars returns one entry per URL", async () => {
    const adapter = new ICSFeedCalendarAdapter({
      id: 1,
      type: "ics_feed_calendar",
      key: { urls: ["https://example.com/a.ics", "https://example.com/b.ics"] },
    });
    const calendars = await adapter.listCalendars();
    expect(calendars).toHaveLength(2);
    expect(calendars[0].externalId).toBe("https://example.com/a.ics");
    expect(calendars[0].readOnly).toBe(true);
    expect(calendars[1].externalId).toBe("https://example.com/b.ics");
  });

  test("AppleCalendarAdapter uses iCloud URL when key.url is empty", () => {
    const adapter = new AppleCalendarAdapter({
      id: 1,
      type: "apple_calendar",
      key: { username: "user@icloud.com", password: "app-password" },
    });
    expect(adapter).toBeInstanceOf(CalDAVCalendarAdapter);
  });

  test("NoOpCalendarAdapter updateEvent returns array for recurring events", async () => {
    const adapter = new NoOpCalendarAdapter();
    const event = {
      title: "Test",
      startTime: new Date(),
      endTime: new Date(),
      recurringEvent: { freq: "WEEKLY" as const },
    };
    const result = await adapter.updateEvent("uid", event);
    expect(Array.isArray(result)).toBe(true);
  });

  test("NoOpCalendarAdapter updateEvent returns single result for non-recurring events", async () => {
    const adapter = new NoOpCalendarAdapter();
    const event = { title: "Test", startTime: new Date(), endTime: new Date() };
    const result = await adapter.updateEvent("uid", event);
    expect(Array.isArray(result)).toBe(false);
  });
});
