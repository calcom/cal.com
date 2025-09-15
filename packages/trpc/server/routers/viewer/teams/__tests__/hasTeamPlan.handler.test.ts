import { describe, expect, it, beforeEach, vi } from "vitest";

import { BillingPlans } from "@calcom/ee/billing/constants";
import { BillingPlanService } from "@calcom/features/ee/billing/domain/billing-plans";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { Plans } from "@calcom/prisma/enums";

import { hasTeamPlanHandler } from "../hasTeamPlan.handler";

vi.mock("@calcom/features/ee/billing/domain/billing-plans");
vi.mock("@calcom/lib/server/repository/membership");

describe("hasTeamPlan handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return false for hasTeamPlan when user has no memberships", async () => {
    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue([]);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(BillingPlans.INDIVIDUALS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(false);
    expect(result.plan).toBe(BillingPlans.INDIVIDUALS);

    expect(MembershipRepository.findAllMembershipsByUserIdForBilling).toHaveBeenCalledWith({
      userId: 123,
    });
  });

  it("should return true for hasTeamPlan when user has accepted team membership", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: "test-team",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(Plans.TEAMS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(true);
    expect(result.plan).toBe(Plans.TEAMS);
  });

  it("should return false for hasTeamPlan when user has unaccepted team membership", async () => {
    const mockMemberships = [
      {
        accepted: false,
        team: {
          slug: "test-team",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(BillingPlans.INDIVIDUALS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(false);
    expect(result.plan).toBe(BillingPlans.INDIVIDUALS);
  });

  it("should return false for hasTeamPlan when team has no slug", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: null,
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(BillingPlans.INDIVIDUALS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(false);
    expect(result.plan).toBe(BillingPlans.INDIVIDUALS);
  });

  it("should return ORGANIZATIONS plan for organization membership", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: "test-org",
          plan: Plans.ORGANIZATIONS,
          isOrganization: true,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(Plans.ORGANIZATIONS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(true);
    expect(result.plan).toBe(Plans.ORGANIZATIONS);
  });

  it("should handle multiple memberships correctly", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: "team-1",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
      {
        accepted: true,
        team: {
          slug: "organization",
          plan: Plans.ORGANIZATIONS,
          isOrganization: true,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(Plans.ORGANIZATIONS);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(true);
    expect(result.plan).toBe(Plans.ORGANIZATIONS);
  });

  it("should handle platform teams correctly", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: "platform-team",
          plan: null,
          isOrganization: false,
          isPlatform: true,
          parent: null,
          platformBilling: {
            plan: "STARTER",
          },
        },
        user: {
          isPlatformManaged: true,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(BillingPlans.PLATFORM_STARTER);

    const result = await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(result.hasTeamPlan).toBe(true);
    expect(result.plan).toBe(BillingPlans.PLATFORM_STARTER);
  });

  it("should call BillingPlanService with correct membership data", async () => {
    const mockMemberships = [
      {
        accepted: true,
        team: {
          slug: "test-team",
          plan: Plans.TEAMS,
          isOrganization: false,
          isPlatform: false,
          parent: null,
          platformBilling: null,
        },
        user: {
          isPlatformManaged: false,
        },
      },
    ];

    vi.mocked(MembershipRepository.findAllMembershipsByUserIdForBilling).mockResolvedValue(mockMemberships);
    vi.mocked(BillingPlanService.getUserPlanByMemberships).mockResolvedValue(Plans.TEAMS);

    await hasTeamPlanHandler({
      ctx: { user: { id: 123 } },
    });

    expect(BillingPlanService.getUserPlanByMemberships).toHaveBeenCalledWith(mockMemberships);
  });
});
