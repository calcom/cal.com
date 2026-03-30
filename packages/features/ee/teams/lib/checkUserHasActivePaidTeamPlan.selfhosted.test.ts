import { describe, expect, it, vi } from "vitest";

import { checkUserHasActivePaidTeamPlan } from "./checkUserHasActivePaidTeamPlan";

vi.mock("@calcom/features/di/containers/MembershipRepository", () => ({
  getMembershipRepository: vi.fn(() => ({
    findAllAcceptedTeamMemberships: vi.fn(),
  })),
}));

vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getTeamBillingServiceFactory: () => ({
    init: vi.fn(),
  }),
}));

vi.mock("@calcom/features/ee/billing/di/containers/BillingPeriodRepository", () => ({
  getBillingPeriodRepository: () => ({
    findBillingPeriodByTeamId: vi.fn(),
  }),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    platformBilling: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  IS_SELF_HOSTED: true,
}));

describe("checkUserHasActivePaidTeamPlan (self-hosted)", () => {
  it("should return isActive true when IS_SELF_HOSTED is true", async () => {
    const result = await checkUserHasActivePaidTeamPlan(1);
    expect(result).toEqual({ isActive: true, isTrial: false, billingPeriod: null });
  });
});
