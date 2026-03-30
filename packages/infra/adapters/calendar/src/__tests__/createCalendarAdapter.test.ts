import { afterEach, describe, expect, test } from "vitest";
import type { CalendarAdapter } from "../CalendarAdapter";
import type {
  BusyTimeslot,
  CalendarCredential,
  GoogleCalendarCredential,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
} from "../CalendarAdapterTypes";
import {
  clearCustomProviders,
  createCalendarAdapter,
  getRegisteredProviders,
  hasCalendarAdapterProvider,
  registerCalendarAdapterProvider,
} from "../createCalendarAdapter";
import { NoOpCalendarAdapter } from "../NoOpCalendarAdapter";
import { GoogleCalendarAdapter } from "../adapters/GoogleCalendarAdapter";
import { Office365CalendarAdapter } from "../adapters/Office365CalendarAdapter";
import { CalDAVCalendarAdapter } from "../adapters/CalDAVCalendarAdapter";
import { AppleCalendarAdapter } from "../adapters/AppleCalendarAdapter";
import { ExchangeCalendarAdapter } from "../adapters/ExchangeCalendarAdapter";
import { FeishuCalendarAdapter } from "../adapters/FeishuCalendarAdapter";
import { LarkCalendarAdapter } from "../adapters/LarkCalendarAdapter";
import { ZohoCalendarAdapter } from "../adapters/ZohoCalendarAdapter";
import { ICSFeedCalendarAdapter } from "../adapters/ICSFeedCalendarAdapter";

// Helper to create typed credential mocks for each provider
function mockGoogleCredential(overrides: Partial<GoogleCalendarCredential["key"]> = {}): CalendarCredential {
  return { id: 1, type: "google_calendar", key: { access_token: "test", ...overrides } };
}
function mockOffice365Credential(): CalendarCredential {
  return { id: 1, type: "office365_calendar", key: { access_token: "test" } };
}
function mockCalDAVCredential(): CalendarCredential {
  return { id: 1, type: "caldav_calendar", key: { username: "user", password: "pass", url: "https://dav.example.com" } };
}
function mockAppleCredential(): CalendarCredential {
  return { id: 1, type: "apple_calendar", key: { username: "user", password: "pass", url: "https://caldav.icloud.com" } };
}
function mockExchangeCredential(): CalendarCredential {
  return { id: 1, type: "exchange_calendar", key: { username: "user", password: "pass", url: "https://exchange.example.com", exchangeVersion: "Exchange2013_SP1", authenticationMethod: "Basic" } };
}
function mockFeishuCredential(): CalendarCredential {
  return { id: 1, type: "feishu_calendar", key: { access_token: "test", refresh_token: "test", expiry_date: Date.now() + 3600000, refresh_expires_date: Date.now() + 86400000 } };
}
function mockLarkCredential(): CalendarCredential {
  return { id: 1, type: "lark_calendar", key: { access_token: "test", refresh_token: "test", expiry_date: Date.now() + 3600000, refresh_expires_date: Date.now() + 86400000 } };
}
function mockZohoCredential(): CalendarCredential {
  return { id: 1, type: "zoho_calendar", key: { access_token: "test", refresh_token: "test", expires_in: 3600, server_location: "com" } };
}
function mockICSFeedCredential(): CalendarCredential {
  return { id: 1, type: "ics_feed_calendar", key: { urls: ["https://example.com/feed.ics"] } };
}

/** Minimal fake adapter for testing custom provider registration */
class FakeAdapter implements CalendarAdapter {
  constructor(public readonly label: string) {}

  async createEvent(_event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid: "fake-uid", id: "fake-id", type: "fake" };
  }

  async updateEvent(uid: string, _event: CalendarEventInput): Promise<CalendarEventResult> {
    return { uid, id: uid, type: "fake" };
  }

  async deleteEvent(): Promise<void> {}

  async fetchBusyTimes(_params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    return [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    return [];
  }

  async subscribe(_input: SubscribeInput): Promise<SubscribeResult> {
    return { channelId: "fake-ch" };
  }

  async unsubscribe(): Promise<void> {}

  async healthCheck(): Promise<HealthCheckResult> {
    return { valid: true };
  }
}

const BUILT_IN_PROVIDERS = [
  "google_calendar",
  "office365_calendar",
  "caldav_calendar",
  "apple_calendar",
  "exchange_calendar",
  "feishu_calendar",
  "lark_calendar",
  "zoho_calendar",
  "ics_feed_calendar",
];

describe("Built-in provider registration", () => {
  test("all built-in providers are pre-registered", () => {
    for (const provider of BUILT_IN_PROVIDERS) {
      expect(hasCalendarAdapterProvider(provider)).toBe(true);
    }
  });

  test("getRegisteredProviders returns all built-in providers", () => {
    const providers = getRegisteredProviders();
    for (const provider of BUILT_IN_PROVIDERS) {
      expect(providers).toContain(provider);
    }
  });

  test("creates GoogleCalendarAdapter for google_calendar", () => {
    const adapter = createCalendarAdapter("google_calendar", mockGoogleCredential());
    expect(adapter).toBeInstanceOf(GoogleCalendarAdapter);
  });

  test("creates Office365CalendarAdapter for office365_calendar", () => {
    const adapter = createCalendarAdapter("office365_calendar", mockOffice365Credential());
    expect(adapter).toBeInstanceOf(Office365CalendarAdapter);
  });

  test("creates CalDAVCalendarAdapter for caldav_calendar", () => {
    const adapter = createCalendarAdapter("caldav_calendar", mockCalDAVCredential());
    expect(adapter).toBeInstanceOf(CalDAVCalendarAdapter);
  });

  test("creates AppleCalendarAdapter for apple_calendar", () => {
    const adapter = createCalendarAdapter("apple_calendar", mockAppleCredential());
    expect(adapter).toBeInstanceOf(AppleCalendarAdapter);
  });

  test("creates ExchangeCalendarAdapter for exchange_calendar", () => {
    const adapter = createCalendarAdapter("exchange_calendar", mockExchangeCredential());
    expect(adapter).toBeInstanceOf(ExchangeCalendarAdapter);
  });

  test("creates FeishuCalendarAdapter for feishu_calendar", () => {
    const adapter = createCalendarAdapter("feishu_calendar", mockFeishuCredential());
    expect(adapter).toBeInstanceOf(FeishuCalendarAdapter);
  });

  test("creates LarkCalendarAdapter for lark_calendar", () => {
    const adapter = createCalendarAdapter("lark_calendar", mockLarkCredential());
    expect(adapter).toBeInstanceOf(LarkCalendarAdapter);
  });

  test("creates ZohoCalendarAdapter for zoho_calendar", () => {
    const adapter = createCalendarAdapter("zoho_calendar", mockZohoCredential());
    expect(adapter).toBeInstanceOf(ZohoCalendarAdapter);
  });

  test("creates ICSFeedCalendarAdapter for ics_feed_calendar", () => {
    const adapter = createCalendarAdapter("ics_feed_calendar", mockICSFeedCredential());
    expect(adapter).toBeInstanceOf(ICSFeedCalendarAdapter);
  });
});

describe("createCalendarAdapter", () => {
  test("returns NoOpCalendarAdapter for unknown provider", () => {
    const adapter = createCalendarAdapter("unknown_provider", mockGoogleCredential());
    expect(adapter).toBeInstanceOf(NoOpCalendarAdapter);
  });
});

describe("Custom provider registration", () => {
  afterEach(() => {
    clearCustomProviders();
  });

  test("can register a custom provider", () => {
    registerCalendarAdapterProvider("custom_calendar", () => new FakeAdapter("my-custom"));

    const adapter = createCalendarAdapter("custom_calendar", mockGoogleCredential());
    expect(adapter).toBeInstanceOf(FakeAdapter);
    expect((adapter as FakeAdapter).label).toBe("my-custom");
  });

  test("custom provider can override a built-in", () => {
    registerCalendarAdapterProvider("google_calendar", () => new FakeAdapter("overridden"));

    const adapter = createCalendarAdapter("google_calendar", mockGoogleCredential());
    expect(adapter).toBeInstanceOf(FakeAdapter);
  });

  test("clearCustomProviders removes custom but keeps built-in", () => {
    registerCalendarAdapterProvider("custom_calendar", () => new FakeAdapter("custom"));

    expect(hasCalendarAdapterProvider("custom_calendar")).toBe(true);

    clearCustomProviders();

    expect(hasCalendarAdapterProvider("custom_calendar")).toBe(false);
    expect(hasCalendarAdapterProvider("google_calendar")).toBe(true);
  });
});

describe("hasCalendarAdapterProvider", () => {
  test("returns true for built-in providers", () => {
    expect(hasCalendarAdapterProvider("google_calendar")).toBe(true);
  });

  test("returns false for unregistered provider", () => {
    expect(hasCalendarAdapterProvider("nonexistent")).toBe(false);
  });
});
