import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const cleanupMock = vi.fn();
const processQueueMock = vi.fn();

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    private _headers: Map<string, string>;

    constructor(url: string) {
      this.url = url;
      this._headers = new Map();
    }

    headers = {
      get: (key: string): string | null => this._headers.get(key.toLowerCase()) ?? null,
      set: (key: string, value: string): void => {
        this._headers.set(key.toLowerCase(), value);
      },
    };
  },
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: vi.fn().mockResolvedValue(body),
      status: init?.status ?? 200,
    })),
  },
}));

// The routes under test import from "..", which resolves to packages/features/tasker
// relative to those files. From this test file that module is "../../index".
vi.mock("../../index", () => ({
  default: {
    cleanup: cleanupMock,
  },
}));

vi.mock("../../task-processor", () => ({
  TaskProcessor: class {
    processQueue = processQueueMock;
  },
}));

const buildRequest = (authorization?: string) => {
  const request = new NextRequest("http://localhost/api/tasks");
  if (authorization !== undefined) {
    request.headers.set("authorization", authorization);
  }
  return request;
};

describe("tasker api auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("cleanup route", () => {
    test("rejects 'Bearer undefined' when CRON_SECRET is unset", async () => {
      vi.stubEnv("CRON_SECRET", undefined);
      const { GET } = await import("../cleanup");

      const response = await GET(buildRequest("Bearer undefined"));

      expect(response.status).toBe(401);
      expect(cleanupMock).not.toHaveBeenCalled();
    });

    test("rejects a request with no authorization header when CRON_SECRET is unset", async () => {
      vi.stubEnv("CRON_SECRET", undefined);
      const { GET } = await import("../cleanup");

      const response = await GET(buildRequest());

      expect(response.status).toBe(401);
      expect(cleanupMock).not.toHaveBeenCalled();
    });

    test("accepts the correct Bearer token when CRON_SECRET is set", async () => {
      vi.stubEnv("CRON_SECRET", "super-secret");
      const { GET } = await import("../cleanup");

      const response = await GET(buildRequest("Bearer super-secret"));

      expect(response.status).toBe(200);
      expect(cleanupMock).toHaveBeenCalledOnce();
    });

    test("rejects an incorrect Bearer token when CRON_SECRET is set", async () => {
      vi.stubEnv("CRON_SECRET", "super-secret");
      const { GET } = await import("../cleanup");

      const response = await GET(buildRequest("Bearer wrong"));

      expect(response.status).toBe(401);
      expect(cleanupMock).not.toHaveBeenCalled();
    });
  });

  describe("cron route", () => {
    test("rejects 'Bearer undefined' when CRON_SECRET is unset", async () => {
      vi.stubEnv("CRON_SECRET", undefined);
      const { GET } = await import("../cron");

      const response = await GET(buildRequest("Bearer undefined"));

      expect(response.status).toBe(401);
      expect(processQueueMock).not.toHaveBeenCalled();
    });

    test("accepts the correct Bearer token via POST when CRON_SECRET is set", async () => {
      vi.stubEnv("CRON_SECRET", "super-secret");
      const { POST } = await import("../cron");

      const response = await POST(buildRequest("Bearer super-secret"));

      expect(response.status).toBe(200);
      expect(processQueueMock).toHaveBeenCalledOnce();
    });

    test("rejects an incorrect Bearer token when CRON_SECRET is set", async () => {
      vi.stubEnv("CRON_SECRET", "super-secret");
      const { GET } = await import("../cron");

      const response = await GET(buildRequest("Bearer wrong"));

      expect(response.status).toBe(401);
      expect(processQueueMock).not.toHaveBeenCalled();
    });
  });
});
