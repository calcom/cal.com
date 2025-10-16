import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCancelBooking } from "../lib/handleCancelBooking";
import type { PrismaClient } from "@calcom/prisma";

// Mock the BrandingApplicationService
vi.mock("@calcom/lib/branding/BrandingApplicationService", () => ({
  BrandingApplicationService: vi.fn().mockImplementation(() => ({
    computeHideBranding: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock other dependencies
vi.mock("@calcom/emails", () => ({
  sendCancelledEmailsAndSMS: vi.fn(),
}));

vi.mock("@calcom/features/webhooks/lib/sendOrSchedulePayload", () => ({
  default: vi.fn(),
}));

describe("handleCancelBooking Integration", () => {
  let mockPrisma: PrismaClient;

  beforeEach(() => {
    mockPrisma = {
      booking: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          eventTypeId: 1,
          userId: 1,
          eventType: {
            team: { id: 1, hideBranding: true, parentId: null, parent: null },
          },
          user: { id: 1, hideBranding: false },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      profile: {
        findFirst: vi.fn().mockResolvedValue({
          organizationId: 123,
        }),
      },
    } as any;
  });

  it("should include hideBranding in cancellation email calls", async () => {
    const { sendCancelledEmailsAndSMS } = await import("@calcom/emails");
    
    await handleCancelBooking({
      bookingId: 1,
      reason: "Test cancellation",
      prisma: mockPrisma,
    });

    // Verify that sendCancelledEmailsAndSMS was called with hideBranding
    expect(sendCancelledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        hideBranding: true,
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it("should handle branding computation errors gracefully", async () => {
    const { BrandingApplicationService } = await import("@calcom/lib/branding/BrandingApplicationService");
    const mockService = new BrandingApplicationService(mockPrisma);
    
    // Mock service to return false on error
    vi.mocked(mockService.computeHideBranding).mockResolvedValue(false);

    const { sendCancelledEmailsAndSMS } = await import("@calcom/emails");
    
    await handleCancelBooking({
      bookingId: 1,
      reason: "Test cancellation",
      prisma: mockPrisma,
    });

    // Verify that sendCancelledEmailsAndSMS was called with hideBranding: false
    expect(sendCancelledEmailsAndSMS).toHaveBeenCalledWith(
      expect.objectContaining({
        hideBranding: false,
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });
});
