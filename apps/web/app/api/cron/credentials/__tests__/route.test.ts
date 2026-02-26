import { NextRequest } from "next/server";
import { describe, test, expect, vi, beforeEach } from "vitest";

const [mockFindAllEnabled, mockFindAllDisabled] = vi.hoisted(() => [
  vi.fn().mockResolvedValue([]),
  vi.fn().mockResolvedValue([]),
]);

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

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));
vi.mock("../../../defaultResponderForAppDir", () => {
  const { NextResponse } = require("next/server");
  return {
    defaultResponderForAppDir: (
      handler: (req: NextRequest) => Promise<Response>,
      _endpointRoute?: string
    ) =>
      async (req: NextRequest, _ctx: { params: Promise<Record<string, string>> }) => {
        try {
          return await handler(req);
        } catch (error: unknown) {
          const err = error as { statusCode?: number; message?: string };
          const status = err?.statusCode ?? 500;
          const message = err?.message ?? "Unknown";
          return NextResponse.json({ message }, { status });
        }
      },
  };
});
vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    findAllEnabledIncludeDelegatedMembers: mockFindAllEnabled,
    findAllDisabledAndIncludeNextBatchOfMembersToProcess: mockFindAllDisabled,
  },
}));
vi.mock("@calcom/features/credentials/repositories/CredentialRepository");

describe("/api/cron/credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-cron-key");
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mockFindAllEnabled.mockResolvedValue([]);
    mockFindAllDisabled.mockResolvedValue([]);
  });

  describe("Authentication", () => {
    test("should return 401 when no API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    test("should return 401 when invalid API key is provided", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "invalid-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    test("should accept CRON_API_KEY in authorization header", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    test("should accept CRON_SECRET as Bearer token", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "Bearer test-cron-secret");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    test("should accept API key as query parameter", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials?apiKey=test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("Success path", () => {
    test("should return 200 with create and delete results when no credentials to process", async () => {
      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveLength(2);
      expect(body[0]).toHaveProperty("message");
      expect(body[1]).toHaveProperty("message");
    });
  });

  describe("Error handling", () => {
    test("should return 200 with failure message when create throws", async () => {
      mockFindAllEnabled.mockRejectedValueOnce(new Error("Create failed"));

      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body[0]).toMatchObject({
        message: "Failed to execute create credentials",
      });
    });

    test("should return 200 with failure message when delete throws", async () => {
      mockFindAllDisabled.mockRejectedValueOnce(new Error("Delete failed"));

      const request = new NextRequest("http://localhost/api/cron/credentials");
      request.headers.set("authorization", "test-cron-key");

      const { GET } = await import("../route");
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body[1]).toMatchObject({
        message: "Failed to execute delete credentials",
      });
    });
  });
});
