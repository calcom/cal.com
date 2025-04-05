import prismock from "../../../../../tests/libs/__mocks__/prisma";

import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

import { getCalendar } from "../../../_utils/getCalendar";
import handler from "../webhook";

vi.mock("@calcom/lib/server/serviceAccountKey", () => ({
  serviceAccountKeySchema: z.any(),
  decryptServiceAccountKey: vi.fn((input) => ({
    ...input,
  })),
}));

function createMockNextPostRequest(options: { headers?: Record<string, string> }) {
  // @ts-expect-error - NextApiRequest has some error
  return createMocks<NextApiRequest, NextApiResponse>({
    method: "POST",
    ...options,
  });
}
vi.mock("../../../_utils/getCalendar", () => ({
  getCalendar: vi.fn(() => ({
    fetchAvailabilityAndSetCache: vi.fn(),
  })),
}));

describe("Google Calendar Webhook Handler", () => {
  const mockFetchAvailabilityAndSetCache = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("GOOGLE_WEBHOOK_TOKEN", "test-webhook-token");
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCalendar as unknown as any).mockResolvedValue({
      fetchAvailabilityAndSetCache: mockFetchAvailabilityAndSetCache,
    });
    // @ts-expect-error - reset is a method missing types
    await prismock.reset();
  });

  it("should return 403 for invalid token", async () => {
    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "invalid-token",
        "x-goog-channel-id": "test-channel-id",
      },
    });

    await handler(mockReq, mockRes);

    expect(mockRes._getStatusCode()).toBe(403);
    expect(JSON.parse(mockRes._getData())).toEqual({
      message: "Invalid token",
    });
  });

  it("should return 403 for missing channel ID", async () => {
    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "test-webhook-token",
      },
    });

    await handler(mockReq, mockRes);

    expect(mockRes._getStatusCode()).toBe(403);
    expect(JSON.parse(mockRes._getData())).toEqual({
      message: "Missing Channel ID",
    });
  });

  it("should handle non-delegation credential successfully", async () => {
    // Create test user
    const user = await prismock.user.create({
      data: {
        id: 1,
        email: "test@example.com",
        username: "test-user",
      },
    });

    // Create credential
    const credential = await prismock.credential.create({
      data: {
        id: 1,
        type: "google_calendar",
        key: {},
        userId: user.id,
      },
    });

    // Create selected calendar
    const selectedCalendar1 = await prismock.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: "primary",
        credentialId: credential.id,
        googleChannelId: "test-channel-id",
      },
    });

    const mockFetchAvailabilityAndSetCache = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCalendar as unknown as any).mockResolvedValue({
      fetchAvailabilityAndSetCache: mockFetchAvailabilityAndSetCache,
    });

    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": "test-channel-id",
      },
    });

    await handler(mockReq, mockRes);
    expect(mockFetchAvailabilityAndSetCache).toHaveBeenCalledWith([selectedCalendar1]);
    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({ message: "ok" });
  });

  it("should handle delegation credential successfully", async () => {
    // Create test user
    const member1 = await prismock.user.create({
      data: {
        id: 1,
        email: "orgmember1@example.com",
        username: "orgmember1",
      },
    });

    const member2 = await prismock.user.create({
      data: {
        id: 2,
        email: "orgmember2@example.com",
        username: "orgmember2",
      },
    });

    // Create delegation credential
    const delegationCredential = await prismock.delegationCredential.create({
      data: {
        id: "delegation-1",
        workspacePlatform: {
          create: {
            slug: "google",
            name: "Google",
            description: "Google",
            defaultServiceAccountKey: {},
          },
        },
        serviceAccountKey: {
          create: {
            client_email: "test@example.com",
          },
        },
        enabled: true,
        organization: {
          create: {
            id: 1,
            name: "Test Org",
            slug: "test-org",
          },
        },
        domain: "example.com",
      },
    });

    // Create selected calendar with delegation
    const member1SelectedCalendar1 = await prismock.selectedCalendar.create({
      data: {
        userId: member1.id,
        integration: "google_calendar",
        externalId: "primary",
        delegationCredentialId: delegationCredential.id,
        googleChannelId: "test-channel-id",
      },
    });

    const member1SelectedCalendar2 = await prismock.selectedCalendar.create({
      data: {
        userId: member1.id,
        integration: "google_calendar",
        externalId: "secondary",
        delegationCredentialId: delegationCredential.id,
        eventTypeId: 1,
        googleChannelId: "test-channel-id",
      },
    });

    const member1SelectedCalendar3 = await prismock.selectedCalendar.create({
      data: {
        userId: member1.id,
        integration: "google_calendar",
        externalId: "primary",
        delegationCredentialId: delegationCredential.id,
        // This selectedCalendar would also be considered even though it has googleChannelId as null because the userI and delegationCredentialId is same
        googleChannelId: null,
        eventTypeId: 2,
      },
    });

    const member2SelectedCalendar1 = await prismock.selectedCalendar.create({
      data: {
        userId: member2.id,
        integration: "google_calendar",
        externalId: "primary",
        delegationCredentialId: delegationCredential.id,
        // This selectedCalendar would not be considered because the userId is different
        googleChannelId: null,
      },
    });

    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": "test-channel-id",
      },
    });

    await handler(mockReq, mockRes);

    expect(mockFetchAvailabilityAndSetCache.mock.calls[0][0].length).toBe(3);
    expect(mockFetchAvailabilityAndSetCache).toHaveBeenCalledWith(
      expect.arrayContaining([member1SelectedCalendar1, member1SelectedCalendar2, member1SelectedCalendar3])
    );
    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({ message: "ok" });
  });

  it("should handle no selected calendar found", async () => {
    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": "test-channel-id",
      },
    });

    await handler(mockReq, mockRes);

    expect(mockRes._getStatusCode()).toBe(200);
    expect(JSON.parse(mockRes._getData())).toEqual({
      message: "No selected calendar found for googleChannelId: test-channel-id",
    });
  });
});
