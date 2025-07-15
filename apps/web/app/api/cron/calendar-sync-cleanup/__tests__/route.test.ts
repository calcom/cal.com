import type { NextRequest } from "next/server";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type { Calendar } from "@calcom/types/Calendar";

import { POST } from "../route";

vi.mock("app/api/defaultResponderForAppDir", () => ({
  defaultResponderForAppDir: (handler: any) => handler,
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/server/repository/selectedCalendar", () => ({
  SelectedCalendarRepository: {
    delete: vi.fn(),
  },
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

vi.mock("@calcom/lib/delegationCredential/server", () => ({
  getCredentialForCalendarCache: vi.fn(),
}));

const mockPrisma = prisma as any;
const mockSelectedCalendarRepository = SelectedCalendarRepository as any;

describe("/api/cron/calendar-sync-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_API_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const createMockRequest = (apiKey?: string): NextRequest => {
    const url = new URL("http://localhost:3000/api/cron/calendar-sync-cleanup");
    if (apiKey) {
      url.searchParams.set("apiKey", apiKey);
    }

    const mockRequest = {
      method: "POST",
      url: url.toString(),
      headers: new Headers(),
      nextUrl: url,
    } as NextRequest;

    mockRequest.headers.get = vi.fn((name: string) => {
      if (name === "authorization" && !apiKey) {
        return null;
      }
      return null;
    });

    return mockRequest;
  };

  const createMockContext = () => ({
    params: Promise.resolve({}),
  });

  it("should return 401 when API key is missing", async () => {
    const request = createMockRequest();
    const context = createMockContext();
    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe("Not authenticated");
  });

  it("should return 401 when API key is invalid", async () => {
    const request = createMockRequest("invalid-key");
    const context = createMockContext();
    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe("Not authenticated");
  });

  it("should return success when API key is valid", async () => {
    mockPrisma.credential.findMany.mockResolvedValue([]);

    const request = createMockRequest("test-api-key");
    const context = createMockContext();
    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.totalUsersProcessed).toBe(0);
    expect(data.totalOrphanedRemoved).toBe(0);
    expect(data.totalErrors).toBe(0);
  });

  it("should process credentials and remove orphaned calendars", async () => {
    const mockCredentials = [
      {
        id: 1,
        type: "google_calendar",
        userId: 1,
        user: { id: 1, email: "user@example.com" },
        selectedCalendars: [
          { id: "cal1", externalId: "calendar1@gmail.com" },
          { id: "cal2", externalId: "calendar2@gmail.com" },
        ],
      },
    ];

    const mockCalendarService: Partial<Calendar> = {
      listCalendars: vi.fn().mockResolvedValue([{ externalId: "calendar1@gmail.com" }]),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getAvailability: vi.fn(),
    };

    mockPrisma.credential.findMany.mockResolvedValue(mockCredentials);

    const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
    const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");

    vi.mocked(getCredentialForCalendarCache).mockResolvedValue({} as any);
    vi.mocked(getCalendar).mockResolvedValue(mockCalendarService as Calendar);
    mockSelectedCalendarRepository.delete.mockResolvedValue({});

    const request = createMockRequest("test-api-key");
    const context = createMockContext();
    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.totalUsersProcessed).toBe(1);
    expect(data.totalOrphanedRemoved).toBe(1);
    expect(data.totalErrors).toBe(0);

    expect(mockSelectedCalendarRepository.delete).toHaveBeenCalledWith({
      where: { id: "cal2" },
    });
  });

  it("should handle errors gracefully", async () => {
    const mockCredentials = [
      {
        id: 1,
        type: "google_calendar",
        userId: 1,
        user: { id: 1, email: "user@example.com" },
        selectedCalendars: [{ id: "cal1", externalId: "calendar1@gmail.com" }],
      },
    ];

    mockPrisma.credential.findMany.mockResolvedValue(mockCredentials);

    const { getCredentialForCalendarCache } = await import("@calcom/lib/delegationCredential/server");
    vi.mocked(getCredentialForCalendarCache).mockRejectedValue(new Error("Credential error"));

    const request = createMockRequest("test-api-key");
    const context = createMockContext();
    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.totalUsersProcessed).toBe(1);
    expect(data.totalOrphanedRemoved).toBe(0);
    expect(data.totalErrors).toBe(1);
  });
});
