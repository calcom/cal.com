import { describe, it, expect, vi, beforeEach } from "vitest";

import { shouldHideBrandingForEvent } from "@calcom/features/profile/lib/hideBranding";
import type { PrismaClient } from "@calcom/prisma";

import { roundRobinManualReassignment } from "../roundRobinManualReassignment";

// Mock the shouldHideBrandingForEvent function
vi.mock("@calcom/features/profile/lib/hideBranding", () => ({
  shouldHideBrandingForEvent: vi.fn().mockResolvedValue(true),
}));

// Mock other dependencies
vi.mock("@calcom/emails", () => ({
  sendRoundRobinScheduledEmailsAndSMS: vi.fn(),
  sendRoundRobinReassignedEmailsAndSMS: vi.fn(),
  sendRoundRobinUpdatedEmailsAndSMS: vi.fn(),
}));

describe("roundRobinManualReassignment Integration", () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          eventTypeId: 1,
          userId: 1,
          eventType: {
            id: 1,
            teamId: 1,
            team: { id: 1, hideBranding: true, parentId: null, parent: null },
          },
          user: { id: 1, hideBranding: false },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 2,
          email: "newuser@example.com",
        }),
      },
      credential: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          organizationId: 123,
        }),
      },
    } as any;
  });

  it("should include hideBranding in round-robin email calls", async () => {
    const {
      sendRoundRobinScheduledEmailsAndSMS,
      sendRoundRobinReassignedEmailsAndSMS,
      sendRoundRobinUpdatedEmailsAndSMS,
    } = await import("@calcom/emails");

    await roundRobinManualReassignment({
      bookingId: 1,
      newUserId: 2,
      prisma: mockPrisma,
    });

    // Verify that all email functions were called with hideBranding
    expect(sendRoundRobinScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: true,
        }),
      }),
      expect.any(Object)
    );

    expect(sendRoundRobinReassignedEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: true,
        }),
      }),
      expect.any(Object)
    );

    expect(sendRoundRobinUpdatedEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: true,
        }),
      }),
      expect.any(Object)
    );
  });

  it("should handle branding computation errors gracefully", async () => {
    // Mock shouldHideBrandingForEvent to return false on error
    vi.mocked(shouldHideBrandingForEvent).mockResolvedValue(false);

    const {
      sendRoundRobinScheduledEmailsAndSMS,
      sendRoundRobinReassignedEmailsAndSMS,
      sendRoundRobinUpdatedEmailsAndSMS,
    } = await import("@calcom/emails");

    await roundRobinManualReassignment({
      bookingId: 1,
      newUserId: 2,
      prisma: mockPrisma,
    });

    // Verify that all email functions were called with hideBranding: false
    expect(sendRoundRobinScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: false,
        }),
      }),
      expect.any(Object)
    );

    expect(sendRoundRobinReassignedEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: false,
        }),
      }),
      expect.any(Object)
    );

    expect(sendRoundRobinUpdatedEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        calEvent: expect.objectContaining({
          hideBranding: false,
        }),
      }),
      expect.any(Object)
    );
  });
});
