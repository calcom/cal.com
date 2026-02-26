import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

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

const mockCleanupStaleCache = vi.fn();

vi.mock("@calcom/features/calendar-subscription/di/CalendarCacheEventService.container", () => ({
  getCalendarCacheEventService: vi.fn(() => ({
    cleanupStaleCache: mockCleanupStaleCache,
  })),
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock("@calcom/lib/server/perfObserver", () => ({
  performance: {
    mark: vi.fn(),
    measure: vi.fn(),
  },
}));
vi.mock("@sentry/nextjs", () => ({
  wrapApiHandlerWithSentry: vi.fn((handler) => handler),
  captureException: vi.fn(),
}));
vi.mock("@calcom/lib/server/getServerErrorFromUnknown", () => ({
  getServerErrorFromUnknown: vi.fn((error) => ({
    message: error instanceof Error ? error.message : "Unknown error",
    statusCode: 500,
    url: "test-url",
    method: "GET",
  })),
}));
vi.mock("../../defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: vi.fn((handler) => handler),
}));

describe("/api/cron/calendar-subscriptions-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  describe("Authentication", () => {
    test("should return 403 when no API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbidden");
    });

    test("should return 403 when invalid API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "invalid-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toBe("Forbidden");
    });

    test("should accept CRON_API_KEY in authorization header", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "test-cron-key");

      mockCleanupStaleCache.mockResolvedValue(undefined);

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockCleanupStaleCache).toHaveBeenCalled();
    });

    test("should accept CRON_SECRET as Bearer token", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "Bearer test-cron-secret");

      mockCleanupStaleCache.mockResolvedValue(undefined);

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockCleanupStaleCache).toHaveBeenCalled();
    });

    test("should accept API key as query parameter", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/calendar-subscriptions-cleanup?apiKey=test-cron-key"
      );

      mockCleanupStaleCache.mockResolvedValue(undefined);

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockCleanupStaleCache).toHaveBeenCalled();
    });
  });

  describe("Cleanup functionality", () => {
    test("should successfully cleanup stale cache", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "test-cron-key");

      mockCleanupStaleCache.mockResolvedValue(undefined);

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockCleanupStaleCache).toHaveBeenCalledOnce();
    });

    test("should handle cleanup errors gracefully", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "test-cron-key");

      const mockError = new Error("Database connection failed");
      mockCleanupStaleCache.mockRejectedValue(mockError);

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Database connection failed");
    });

    test("should handle non-Error exceptions", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "test-cron-key");

      mockCleanupStaleCache.mockRejectedValue("String error");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Unknown error");
    });
  });

  describe("Service instantiation", () => {
    test("should use DI container to get service instance", async () => {
      const request = new NextRequest("http://localhost/api/cron/calendar-subscriptions-cleanup");
      request.headers.set("authorization", "test-cron-key");

      mockCleanupStaleCache.mockResolvedValue(undefined);

      const { getCalendarCacheEventService } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventService.container"
      );
      const { GET } = await import("../route");
      await GET(request, { params: Promise.resolve({}) });

      expect(getCalendarCacheEventService).toHaveBeenCalled();
    });
  });
});
