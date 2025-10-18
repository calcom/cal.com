import { describe, expect, it, vi, beforeEach } from "vitest";

import { InternalTeamBilling } from "@calcom/ee/billing/teams/internal-team-billing";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { prisma } from "@calcom/prisma";

import { skipTeamTrialsHandler } from "./skipTeamTrials.handler";

// Instead of completely mocking the handler, we'll use the real implementation
// and mock its dependencies
vi.mock("./skipTeamTrials.handler", async () => {
  const actual = await vi.importActual<typeof import("./skipTeamTrials.handler")>("./skipTeamTrials.handler");
  return {
    ...actual,
    // We keep this for spying purposes
    skipTeamTrialsHandler: vi.fn().mockImplementation(actual.skipTeamTrialsHandler),
  };
});

// Mock dependencies
vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: false,
  IS_PRODUCTION: false,
  CALCOM_ENV: "test",
  WEBAPP_URL: "http://localhost:3000",
  IS_CALCOM: false,
  HOSTED_CAL_FEATURES: true,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: {
    findAllAcceptedTeamMemberships: vi.fn(),
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
    vi.mocked(MembershipRepository.findAllAcceptedTeamMemberships).mockResolvedValueOnce([]);

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
    ] as any;

    vi.mocked(MembershipRepository.findAllAcceptedTeamMemberships).mockResolvedValueOnce(mockTeams);

    mockGetSubscriptionStatus
      .mockResolvedValueOnce("trialing") // First team is in trial
      .mockResolvedValueOnce("active"); // Second team is active

    // @ts-expect-error - simplified context for testing
    await skipTeamTrialsHandler({ ctx: mockCtx, input: {} });

    expect(prisma.user.update).toHaveBeenCalled();

    expect(MembershipRepository.findAllAcceptedTeamMemberships).toHaveBeenCalledWith(mockCtx.user.id, {
      role: "OWNER",
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
});
