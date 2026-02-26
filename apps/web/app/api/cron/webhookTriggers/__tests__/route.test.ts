import { NextRequest } from "next/server";
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    private _headers: Map<string, string>;

    constructor(url: string, options: { method?: string } = {}) {
      this.url = url;
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
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      json: vi.fn().mockResolvedValue(body),
      status: init?.status ?? 200,
    })),
  },
}));

vi.mock("@calcom/features/webhooks/lib/handleWebhookScheduledTriggers", () => ({
  handleWebhookScheduledTriggers: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: vi.fn((handler: (req: NextRequest) => Promise<Response>) => handler),
}));
vi.mock("@calcom/prisma", () => ({
  __esModule: true,
  default: {},
}));

async function getHandleWebhookScheduledTriggersMock() {
  const mod = await import("@calcom/features/webhooks/lib/handleWebhookScheduledTriggers");
  return vi.mocked(mod.handleWebhookScheduledTriggers);
}

describe("/api/cron/webhookTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
  });

  describe("Authentication", () => {
    test("should return 401 when no API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/webhookTriggers", { method: "POST" });

      const { POST } = await import("../route");
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Not authenticated");
      const mockFn = await getHandleWebhookScheduledTriggersMock();
      expect(mockFn).not.toHaveBeenCalled();
    });

    test("should return 401 when invalid API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/webhookTriggers", { method: "POST" });
      request.headers.set("authorization", "invalid-key");

      const { POST } = await import("../route");
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Not authenticated");
      const mockFn = await getHandleWebhookScheduledTriggersMock();
      expect(mockFn).not.toHaveBeenCalled();
    });

    test("should accept CRON_API_KEY in authorization header", async () => {
      const request = new NextRequest("http://localhost/api/cron/webhookTriggers", { method: "POST" });
      request.headers.set("authorization", "test-cron-key");

      const { POST } = await import("../route");
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      const mockFn = await getHandleWebhookScheduledTriggersMock();
      expect(mockFn).toHaveBeenCalledOnce();
    });

    test("should accept API key as query parameter", async () => {
      const request = new NextRequest(
        "http://localhost/api/cron/webhookTriggers?apiKey=test-cron-key",
        { method: "POST" }
      );

      const { POST } = await import("../route");
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      const mockFn = await getHandleWebhookScheduledTriggersMock();
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe("Happy path", () => {
    test("should call handleWebhookScheduledTriggers and return ok", async () => {
      const request = new NextRequest("http://localhost/api/cron/webhookTriggers", { method: "POST" });
      request.headers.set("authorization", "test-cron-key");

      const { POST } = await import("../route");
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ok: true });
      const mockFn = await getHandleWebhookScheduledTriggersMock();
      expect(mockFn).toHaveBeenCalledWith(expect.anything());
    });
  });
});
