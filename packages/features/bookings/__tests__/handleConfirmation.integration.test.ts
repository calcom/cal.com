import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleConfirmation } from "../lib/handleConfirmation";
import type { PrismaClient } from "@calcom/prisma";

// Mock the BrandingApplicationService
vi.mock("@calcom/lib/branding/BrandingApplicationService", () => ({
  BrandingApplicationService: vi.fn().mockImplementation(() => ({
    computeHideBranding: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock other dependencies
vi.mock("@calcom/emails", () => ({
  sendScheduledEmailsAndSMS: vi.fn(),
}));

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn(),
}));

describe("handleConfirmation Integration", () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      eventType: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          team: { id: 1, hideBranding: true, parentId: null, parent: null },
          teamId: 1,
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          hideBranding: false,
        }),
      },
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          organizationId: 123,
        }),
      },
    } as any;
  });

  it("should include hideBranding in email calls", async () => {
    const { sendScheduledEmailsAndSMS } = await import("@calcom/emails");
    
    const mockBooking = {
      id: 1,
      userId: 1,
      eventTypeId: 1,
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
      uid: "test-uid",
    };

    const mockEventType = {
      id: 1,
      team: { id: 1, hideBranding: true, parentId: null, parent: null },
      teamId: 1,
    };

    await handleConfirmation({
      user: { id: 1, username: "testuser" },
      evt: {
        uid: "test-uid",
        title: "Test Event",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T11:00:00Z",
        attendees: [],
        organizer: { name: "Test Organizer", email: "test@example.com" },
      },
      prisma: mockPrisma,
      bookingId: 1,
      booking: mockBooking,
      eventType: mockEventType,
    });

    // Verify that sendScheduledEmailsAndSMS was called with hideBranding
    expect(sendScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        hideBranding: true,
      }),
      expect.any(Object)
    );
  });

  it("should handle branding computation errors gracefully", async () => {
    const { BrandingApplicationService } = await import("@calcom/lib/branding/BrandingApplicationService");
    const mockService = new BrandingApplicationService(mockPrisma);
    
    // Mock service to return false on error
    vi.mocked(mockService.computeHideBranding).mockResolvedValue(false);

    const { sendScheduledEmailsAndSMS } = await import("@calcom/emails");
    
    const mockBooking = {
      id: 1,
      userId: 1,
      eventTypeId: 1,
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
      uid: "test-uid",
    };

    const mockEventType = {
      id: 1,
      team: { id: 1, hideBranding: true, parentId: null, parent: null },
      teamId: 1,
    };

    await handleConfirmation({
      user: { id: 1, username: "testuser" },
      evt: {
        uid: "test-uid",
        title: "Test Event",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T11:00:00Z",
        attendees: [],
        organizer: { name: "Test Organizer", email: "test@example.com" },
      },
      prisma: mockPrisma,
      bookingId: 1,
      booking: mockBooking,
      eventType: mockEventType,
    });

    // Verify that sendScheduledEmailsAndSMS was called with hideBranding: false
    expect(sendScheduledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        hideBranding: false,
      }),
      expect.any(Object)
    );
  });
});
