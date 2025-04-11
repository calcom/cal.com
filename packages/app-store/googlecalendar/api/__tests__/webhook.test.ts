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

vi.mock("../../../_utils/getCalendar", () => ({
  getCalendar: vi.fn(() => ({
    fetchAvailabilityAndSetCache: vi.fn(),
  })),
}));

// Helper functions for creating test data
const createUser = async ({ id, email, username }: { id: number; email: string; username: string }) => {
  return await prismock.user.create({
    data: {
      id,
      email,
      username,
    },
  });
};

const createRegularCredential = async ({ id, userId }: { id: number; userId: number }) => {
  return await prismock.credential.create({
    data: {
      id,
      type: "google_calendar",
      key: {},
      userId,
    },
  });
};

const createDelegationCredential = async ({ id, domain }: { id: string; domain: string }) => {
  return await prismock.delegationCredential.create({
    data: {
      id,
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
          client_email: `test@${domain}`,
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
      domain,
    },
  });
};

const createSelectedCalendar = async ({
  userId,
  externalId,
  credentialId,
  delegationCredentialId,
  googleChannelId,
  eventTypeId,
}: {
  userId: number;
  externalId: string;
  credentialId?: number;
  delegationCredentialId?: string;
  googleChannelId?: string | null;
  eventTypeId?: number;
}) => {
  return await prismock.selectedCalendar.create({
    data: {
      userId,
      integration: "google_calendar",
      externalId,
      ...(credentialId && { credentialId }),
      ...(delegationCredentialId && { delegationCredentialId }),
      ...(googleChannelId && { googleChannelId }),
      ...(eventTypeId && { eventTypeId }),
    },
  });
};

function createMockNextPostRequest(options: { headers?: Record<string, string> }) {
  // @ts-expect-error - NextApiRequest has some error
  return createMocks<NextApiRequest, NextApiResponse>({
    method: "POST",
    ...options,
  });
}

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

  it("should process webhook for regular user credential and call fetchAvailabilityAndSetCache for the selected calendar", async () => {
    // Create test user and credential
    const user = await createUser({
      id: 1,
      email: "test@example.com",
      username: "test-user",
    });

    const credential = await createRegularCredential({
      id: 1,
      userId: user.id,
    });

    // Create selected calendar
    const selectedCalendar1 = await createSelectedCalendar({
      userId: user.id,
      externalId: "primary",
      credentialId: credential.id,
      googleChannelId: "test-channel-id",
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

  it("should process webhook for delegation credential and call fetchAvailabilityAndSetCache for the correct selected calendars", async () => {
    const googleChannelId = "test-channel-id";
    // Create test user
    const member1 = await createUser({
      id: 1,
      email: "orgmember1@example.com",
      username: "orgmember1",
    });

    const member2 = await createUser({
      id: 2,
      email: "orgmember2@example.com",
      username: "orgmember2",
    });

    // Create delegation credential
    const delegationCredential = await createDelegationCredential({
      id: "delegation-1",
      domain: "example.com",
    });

    const member1SelectedCalendar1 = await createSelectedCalendar({
      userId: member1.id,
      externalId: "primary",
      delegationCredentialId: delegationCredential.id,
      googleChannelId,
    });

    // Selected calendar with same googleChannelId as above
    const member1SelectedCalendar2 = await createSelectedCalendar({
      userId: member1.id,
      externalId: "secondary",
      delegationCredentialId: delegationCredential.id,
      googleChannelId,
      eventTypeId: 1,
    });

    // Selected calendar with no googleChannelId but same delegationCredentialId and userId pair
    const member1SelectedCalendar3 = await createSelectedCalendar({
      userId: member1.id,
      externalId: "primary",
      delegationCredentialId: delegationCredential.id,
      eventTypeId: 2,
      googleChannelId: null,
    });

    // Selected calendar with different delegationCredentialId and userId pair
    const member2SelectedCalendar1 = await createSelectedCalendar({
      userId: member2.id,
      externalId: "primary",
      delegationCredentialId: delegationCredential.id,
      googleChannelId: null,
    });

    const { req: mockReq, res: mockRes } = createMockNextPostRequest({
      headers: {
        "x-goog-channel-token": "test-webhook-token",
        "x-goog-channel-id": googleChannelId,
      },
    });

    await handler(mockReq, mockRes);

    expect(mockFetchAvailabilityAndSetCache.mock.calls[0][0].length).toBe(3);
    expect(mockFetchAvailabilityAndSetCache).toHaveBeenCalledWith(
      expect.arrayContaining([member1SelectedCalendar1, member1SelectedCalendar2, member1SelectedCalendar3])
    );

    expect(mockFetchAvailabilityAndSetCache).not.toHaveBeenCalledWith(
      // This selected calendar is not considered because the userId is different
      expect.arrayContaining([member2SelectedCalendar1])
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
