import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("./constants", () => ({
  CONSOLE_URL: "https://console.cal.com",
}));

import { collectPageParameters, extendEventData, telemetryEventTypes } from "./telemetry";

describe("telemetryEventTypes", () => {
  it("contains all expected event types", () => {
    expect(telemetryEventTypes.pageView).toBe("page_view");
    expect(telemetryEventTypes.bookingConfirmed).toBe("booking_confirmed");
    expect(telemetryEventTypes.bookingCancelled).toBe("booking_cancelled");
    expect(telemetryEventTypes.login).toBe("login");
    expect(telemetryEventTypes.signup).toBe("signup");
    expect(telemetryEventTypes.team_created).toBe("team_created");
    expect(telemetryEventTypes.org_created).toBe("org_created");
  });
});

describe("collectPageParameters", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      location: {
        host: "app.cal.com",
        protocol: "https:",
      },
      characterSet: "UTF-8",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns page parameters with route", () => {
    const result = collectPageParameters("/booking/123");

    expect(result.page_url).toBe("/booking/123");
    expect(result.doc_encoding).toBe("UTF-8");
    expect(result.url).toBe("https://app.cal.com/booking/123");
  });

  it("returns empty doc_path when route is undefined", () => {
    const result = collectPageParameters();

    expect(result.page_url).toBeUndefined();
    expect(result.url).toBe("https://app.cal.com");
  });

  it("merges extra data", () => {
    const result = collectPageParameters("/test", { customField: "value" });

    expect(result.customField).toBe("value");
    expect(result.page_url).toBe("/test");
  });
});

describe("extendEventData", () => {
  beforeEach(() => {
    vi.stubEnv("CALCOM_LICENSE_KEY", "test-license-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects Vercel environment from NextApiRequest headers", () => {
    const req = {
      headers: { "x-vercel-id": "iad1::abc123" },
      cookies: {},
      url: "/api/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.onVercel).toBe(true);
  });

  it("detects non-Vercel environment", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/api/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.onVercel).toBe(false);
  });

  it("detects authorized session from next-auth cookie", () => {
    const req = {
      headers: {},
      cookies: { "next-auth.session-token": "session-123" },
      url: "/api/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.isAuthorized).toBe(true);
  });

  it("detects authorized session from secure cookie", () => {
    const req = {
      headers: {},
      cookies: { "__Secure-next-auth.session-token": "session-456" },
      url: "/api/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.isAuthorized).toBe(true);
  });

  it("detects unauthorized when no session cookies", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/api/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.isAuthorized).toBe(false);
  });

  it("uses original page_url when available", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/api/fallback",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/booking/team/abc", isTeamBooking: false }
    );

    expect(result.page_url).toBe("/booking/team/abc");
  });

  it("falls back to req.url when page_url is empty", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/api/fallback",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "", isTeamBooking: false }
    );

    expect(result.page_url).toBe("/api/fallback");
  });

  it("infers isTeamBooking from URL when original is undefined", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/booking/team/my-team",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/booking/team/my-team", isTeamBooking: undefined as unknown as boolean }
    );

    expect(result.isTeamBooking).toBe(true);
  });

  it("preserves explicit isTeamBooking value", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/booking/team/my-team",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/booking/team/my-team", isTeamBooking: false }
    );

    expect(result.isTeamBooking).toBe(false);
  });

  it("includes license key and UTC time", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.licensekey).toBe("test-license-key");
    expect(result.utc_time).toBeDefined();
    // Should be a valid ISO date string
    expect(new Date(result.utc_time).toISOString()).toBe(result.utc_time);
  });

  it("sanitizes PII fields to empty strings", () => {
    const req = {
      headers: {},
      cookies: {},
      url: "/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.title).toBe("");
    expect(result.ipAddress).toBe("");
    expect(result.queryString).toBe("");
    expect(result.referrer).toBe("");
  });

  it("handles NextRequest with .get() headers", () => {
    const req = {
      headers: {
        get: (name: string) => (name === "x-vercel-id" ? "iad1::xyz" : null),
      },
      cookies: {},
      url: "/test",
    };
    const res = {};

    const result = extendEventData(
      req as never,
      res as never,
      { page_url: "/test", isTeamBooking: false }
    );

    expect(result.onVercel).toBe(true);
  });
});
