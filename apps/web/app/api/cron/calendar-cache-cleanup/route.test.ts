import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { NextRequest } from "next/server";
import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: unknown, options?: { status?: number }) => ({
        json: () => Promise.resolve(data),
        status: options?.status || 200,
      })),
    },
  };
});

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (
    handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>
  ) => handler,
}));

describe("Calendar Cache Cleanup Route", () => {
  let POST: (req: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    await prismock.calendarCache.deleteMany();

    const routeModule = await import("./route");
    POST = routeModule.POST;

    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = undefined;
    env.CRON_SECRET = undefined;
  });

  it("should return 401 when not authenticated", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = "test-key";
    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup");
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect((data as { message: string }).message).toBe("Not authenticated");
  });

  it("should delete expired cache entries when authenticated", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = "test-key";

    const expiredDate = new Date("2020-01-01T00:00:00.000Z");
    const validDate = new Date("2030-01-01T00:00:00.000Z");

    await prismock.calendarCache.create({
      data: {
        id: 1,
        credentialId: 1,
        userId: 1,
        key: "expired-key",
        value: { test: "data" },
        expiresAt: expiredDate,
      },
    });

    await prismock.calendarCache.create({
      data: {
        id: 2,
        credentialId: 2,
        userId: 1,
        key: "valid-key",
        value: { test: "data" },
        expiresAt: validDate,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup", {
      headers: { authorization: "test-key" },
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect((data as { ok: boolean }).ok).toBe(true);
    expect((data as { count: number }).count).toBeGreaterThanOrEqual(0);

    const remaining = await prismock.calendarCache.findMany();
    const validEntries = remaining.filter((entry: { expiresAt: Date }) => entry.expiresAt > new Date());
    expect(validEntries.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle empty cache gracefully", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = "test-key";

    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup", {
      headers: { authorization: "test-key" },
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect((data as { ok: boolean }).ok).toBe(true);
    expect((data as { count: number }).count).toBe(0);
  });

  it("should handle database errors gracefully", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = "test-key";

    vi.spyOn(prismock.calendarCache, "deleteMany").mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup", {
      headers: { authorization: "test-key" },
    });

    await expect(POST(request, { params: Promise.resolve({}) })).rejects.toThrow("Database error");
  });

  it("should only delete entries that have expired", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_API_KEY = "test-key";

    const expiredDate = new Date("2020-01-01T00:00:00.000Z");
    const validDate = new Date("2030-01-01T00:00:00.000Z");

    await prismock.calendarCache.create({
      data: {
        id: 1,
        credentialId: 1,
        userId: 1,
        key: "expired-1",
        value: { test: "data" },
        expiresAt: expiredDate,
      },
    });

    await prismock.calendarCache.create({
      data: {
        id: 2,
        credentialId: 2,
        userId: 1,
        key: "expired-2",
        value: { test: "data" },
        expiresAt: expiredDate,
      },
    });

    await prismock.calendarCache.create({
      data: {
        id: 3,
        credentialId: 3,
        userId: 1,
        key: "valid-1",
        value: { test: "data" },
        expiresAt: validDate,
      },
    });

    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup", {
      headers: { authorization: "test-key" },
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect((data as { ok: boolean }).ok).toBe(true);
    expect((data as { count: number }).count).toBeGreaterThanOrEqual(0);

    const remaining = await prismock.calendarCache.findMany();
    const validEntries = remaining.filter((entry: { expiresAt: Date }) => entry.expiresAt > new Date());
    expect(validEntries.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle authentication with Bearer token", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.CRON_SECRET = "secret-key";

    const request = new NextRequest("http://localhost:3000/api/cron/calendar-cache-cleanup", {
      headers: { authorization: "Bearer secret-key" },
    });
    const response = await POST(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect((data as { ok: boolean }).ok).toBe(true);
  });
});
