import { describe, expect, it, vi, beforeEach } from "vitest";

import { InternalTeamBilling } from "@calcom/ee/billing/teams/internal-team-billing";
import { prisma } from "@calcom/prisma";

import { skipTeamTrialsHandler } from "./skipTeamTrials.handler";

vi.mock("./skipTeamTrials.handler", async () => {
  return {
    skipTeamTrialsHandler: vi.fn(),
  };
});

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

const mockGetSubscriptionStatus = vi.fn();
const mockEndTrial = vi.fn().mockResolvedValue(true);

vi.mock("@calcom/ee/billing/teams/internal-team-billing", () => ({
  InternalTeamBilling: vi.fn().mockImplementation(() => ({
    getSubscriptionStatus: mockGetSubscriptionStatus,
    endTrial: mockEndTrial,
  })),
}));

describe("skipTeamTrialsHandler", () => {
  const mockCtx = {
    user: {
      id: 1,
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set user's trialEndsAt to null", async () => {
    vi.mocked(prisma.team.findMany).mockResolvedValueOnce([]);

    // @ts-expect-error - simplified context for testing
    await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        trialEndsAt: null,
      },
    });
  });

  it("should end trials for all teams where user is OWNER", async () => {
    // Mock teams where user is owner
    const mockTeams = [
      { id: 101, name: "Team 1" },
      { id: 102, name: "Team 2" },
    ];

    vi.mocked(prisma.team.findMany).mockResolvedValueOnce(mockTeams);

    mockGetSubscriptionStatus
      .mockResolvedValueOnce("trialing") // First team is in trial
      .mockResolvedValueOnce("active"); // Second team is active

    // @ts-expect-error - simplified context for testing
    await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    expect(prisma.user.update).toHaveBeenCalled();

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

    expect(InternalTeamBilling).toHaveBeenCalledTimes(2);
    expect(InternalTeamBilling).toHaveBeenNthCalledWith(1, mockTeams[0]);
    expect(InternalTeamBilling).toHaveBeenNthCalledWith(2, mockTeams[1]);

    expect(mockGetSubscriptionStatus).toHaveBeenCalledTimes(2);

    expect(mockEndTrial).toHaveBeenCalledTimes(1);
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(prisma.user.update).mockRejectedValueOnce(new Error("Database error"));

    // @ts-expect-error - simplified context for testing
    const result = await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    expect(result).toEqual({ success: false, error: "Failed to skip team trials" });
  });

  it("should return success immediately if self-hosted", async () => {
    // Temporarily mock IS_SELF_HOSTED as true
    vi.mock("@calcom/lib/constants", () => ({
      IS_SELF_HOSTED: true,
    }));

    // Reset the skipTeamTrialsHandler mock to use the new IS_SELF_HOSTED value
    vi.resetModules();
    const { skipTeamTrialsHandler: selfHostedHandler } = await import("./skipTeamTrials.handler");

    // @ts-expect-error - simplified context for testing
    const result = await selfHostedHandler({ ctx: mockCtx, input: {} });

    expect(result).toEqual({ success: true });

    vi.mock("@calcom/lib/constants", () => ({
      IS_SELF_HOSTED: false,
    }));
  });
});
