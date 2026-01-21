import { NextRequest } from "next/server";
import { describe, test, expect, vi, beforeEach } from "vitest";

import { runCalendarSubscriptionRollout } from "@calcom/features/calendar-subscription/lib/runCalendarSubscriptionRollout";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    nextUrl: { searchParams: URLSearchParams };
    private _headers: Map<string, string>;

    constructor(url: string, options: { method?: string } = {}) {
      this.url = url;
      this.method = options.method || "GET";
      this._headers = new Map();
      this.nextUrl = { searchParams: new URLSearchParams(url.split("?")[1] || "") };
    }

    headers = {
      get: (key: string): string | null => this._headers.get(key.toLowerCase()) || null,
      set: (key: string, value: string): void => {
        this._headers.set(key.toLowerCase(), value);
      },
      has: (key: string): boolean => this._headers.has(key.toLowerCase()),
    };
  },
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: vi.fn().mockResolvedValue(body),
      status: init?.status || 200,
    })),
  },
}));

vi.mock("@calcom/features/calendar-subscription/lib/runCalendarSubscriptionRollout");

const mockRunCalendarSubscriptionRollout = vi.mocked(runCalendarSubscriptionRollout);

describe("/api/cron/calendar-subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  describe("Authentication", () => {
    test("should return 403 when no API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbiden");
      expect(mockRunCalendarSubscriptionRollout).not.toHaveBeenCalled();
    });

    test("should return 403 when invalid API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "invalid-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbiden");
      expect(mockRunCalendarSubscriptionRollout).not.toHaveBeenCalled();
    });

    test("should accept valid API key and trigger rollout", async () => {
      mockRunCalendarSubscriptionRollout.mockResolvedValue({ skipped: false });
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.skipped).toBe(false);
      expect(mockRunCalendarSubscriptionRollout).toHaveBeenCalledOnce();
    });

    test("should propagate rollout errors", async () => {
      mockRunCalendarSubscriptionRollout.mockRejectedValue(new Error("boom"));

      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("boom");
    });
  });
});
