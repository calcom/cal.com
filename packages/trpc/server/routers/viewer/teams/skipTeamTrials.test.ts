import { describe, expect, it, vi } from "vitest";

import { InternalTeamBilling } from "@calcom/ee/billing/teams/internal-team-billing";
import { prisma } from "@calcom/prisma";

import { skipTeamTrialsHandler } from "./skipTeamTrials.handler";

// Mock dependencies
vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
    team: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/ee/billing/teams/internal-team-billing", () => ({
  InternalTeamBilling: vi.fn().mockImplementation(() => ({
    getSubscriptionStatus: vi.fn(),
    endTrial: vi.fn().mockResolvedValue(true),
  })),
}));

describe("skipTeamTrialsHandler", () => {
  const mockCtx = {
    user: {
      id: 1,
      email: "test@example.com",
    },
  };

  it("should set user's trialEndsAt to null", async () => {
    // Setup mocks for this test
    vi.mocked(prisma.team.findMany).mockResolvedValueOnce([]);

    // Call the handler
    const result = await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    // Verify user update was called with correct parameters
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        trialEndsAt: null,
      },
    });

    // Verify success result
    expect(result).toEqual({ success: true });
  });

  it("should end trials for all teams where user is OWNER", async () => {
    // Mock teams where user is owner
    const mockTeams = [
      { id: 101, name: "Team 1" },
      { id: 102, name: "Team 2" },
    ];

    vi.mocked(prisma.team.findMany).mockResolvedValueOnce(mockTeams);

    const mockTeamBilling = vi.mocked(InternalTeamBilling).mock.instances[0];
    const mockGetSubscriptionStatus = mockTeamBilling.getSubscriptionStatus as any;
    const mockEndTrial = mockTeamBilling.endTrial as any;

    // First team has trialing status
    mockGetSubscriptionStatus.mockResolvedValueOnce("trialing");
    // Second team has active status
    mockGetSubscriptionStatus.mockResolvedValueOnce("active");

    // Call the handler
    const result = await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    // Verify user update was called
    expect(prisma.user.update).toHaveBeenCalled();

    // Verify team search was called with correct parameters
    expect(prisma.team.findMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: {
            userId: mockCtx.user.id,
            accepted: true,
            role: "OWNER",
          },
        },
      },
    });

    // Verify TeamBilling was instantiated for each team
    expect(InternalTeamBilling).toHaveBeenCalledTimes(2);

    // Verify endTrial was called only for the team with trialing status
    expect(mockEndTrial).toHaveBeenCalledTimes(1);

    // Verify success result
    expect(result).toEqual({ success: true });
  });

  it("should handle errors gracefully", async () => {
    // Setup mocks to throw an error
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("Database error"));

    // Call the handler
    const result = await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    // Verify error handling
    expect(result).toEqual({ success: false, error: "Failed to skip team trials" });
  });

  it("should return success immediately if self-hosted", async () => {
    // Temporarily mock IS_SELF_HOSTED as true
    vi.mock("@calcom/lib/constants", () => ({
      IS_SELF_HOSTED: true,
    }));

    // Import the handler again with the new mock
    const { skipTeamTrialsHandler: selfHostedHandler } = await import("./skipTeamTrials.handler");

    // Call the handler
    const result = await selfHostedHandler({ ctx: mockCtx, input: {} });

    // Verify it returns success without calling any services
    expect(result).toEqual({ success: true });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.team.findMany).not.toHaveBeenCalled();

    // Reset the mock
    vi.mock("@calcom/lib/constants", () => ({
      IS_SELF_HOSTED: false,
    }));
  });
});
