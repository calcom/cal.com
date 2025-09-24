import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { WEBAPP_URL } from "@calcom/lib/constants";

import * as billingModule from "..";
import { InternalTeamBilling } from "./internal-team-billing";
import { TeamBillingPublishResponseStatus } from "./team-billing";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    WEBAPP_URL: "http://localhost:3000",
  };
});

vi.mock("..", () => ({
  default: {
    handleSubscriptionCancel: vi.fn(),
    handleSubscriptionUpdate: vi.fn(),
    checkoutSessionIsPaid: vi.fn(),
  },
}));

vi.mock("@calcom/features/ee/teams/lib/payments", () => ({
  purchaseTeamOrOrgSubscription: vi.fn(),
}));
const mockTeam = {
  id: 1,
  metadata: {
    subscriptionId: "sub_123",
    subscriptionItemId: "si_456",
    paymentId: "cs_789",
  },
  isOrganization: true,
  parentId: null,
};

describe("InternalTeamBilling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cancel", () => {
    const internalTeamBilling = new InternalTeamBilling(mockTeam);
    it("should cancel the subscription and downgrade the team", async () => {
      await internalTeamBilling.cancel();

      expect(billingModule.default.handleSubscriptionCancel).toHaveBeenCalledWith("sub_123");
      expect(prismaMock.team.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          metadata: {},
        },
      });
    });
  });

  describe("publish", () => {
    const internalTeamBilling = new InternalTeamBilling(mockTeam);
    it("should create a checkout session and update the team", async () => {
      vi.spyOn(billingModule.default, "checkoutSessionIsPaid").mockResolvedValue(false);
      vi.mocked(purchaseTeamOrOrgSubscription).mockResolvedValue({
        url: "http://checkout.url",
      });
      prismaMock.membership.count.mockResolvedValue(5);
      prismaMock.membership.findFirstOrThrow.mockResolvedValue({ userId: 123 });

      const result = await internalTeamBilling.publish();
      expect(result).toEqual({
        redirectUrl: "http://checkout.url",
        status: TeamBillingPublishResponseStatus.REQUIRES_PAYMENT,
      });

      expect(prismaMock.membership.count).toHaveBeenCalledWith({ where: { teamId: 1 } });
      expect(prismaMock.membership.findFirstOrThrow).toHaveBeenCalledWith({
        where: { teamId: 1, role: "OWNER" },
        select: { userId: true },
      });
    });
    it("should return upgrade url if upgrade is required", async () => {
      const internalTeamBilling = new InternalTeamBilling(mockTeam);
      const mockUrl = `${WEBAPP_URL}/api/teams/${mockTeam.id}/upgrade?session_id=cs_789`;
      vi.spyOn(internalTeamBilling, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: mockUrl,
        paymentId: "cs_789",
        paymentRequired: false,
      });

      const result = await internalTeamBilling.publish();

      expect(result).toEqual({
        redirectUrl: mockUrl,
        status: TeamBillingPublishResponseStatus.REQUIRES_UPGRADE,
      });
      expect(internalTeamBilling.checkIfTeamPaymentRequired).toHaveBeenCalled();
    });
  });

  describe("updateQuantity", () => {
    it("should update the subscription quantity", async () => {
      const mockTeamNotOrg = {
        ...mockTeam,
        isOrganization: false,
      };
      const internalTeamBilling = new InternalTeamBilling(mockTeamNotOrg);
      prismaMock.membership.count.mockResolvedValue(10);
      vi.spyOn(internalTeamBilling, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: "http://checkout.url",
        paymentId: "cs_789",
        paymentRequired: false,
      });

      await internalTeamBilling.updateQuantity();

      expect(billingModule.default.handleSubscriptionUpdate).toHaveBeenCalledWith({
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        membershipCount: 10,
      });
    });

    it("should not update if membership count is less than minimum for organizations", async () => {
      const internalTeamBilling = new InternalTeamBilling(mockTeam);
      prismaMock.membership.count.mockResolvedValue(2);
      vi.spyOn(internalTeamBilling, "checkIfTeamPaymentRequired").mockResolvedValue({
        url: "http://checkout.url",
        paymentId: "cs_789",
        paymentRequired: false,
      });

      await internalTeamBilling.updateQuantity();

      expect(billingModule.default.handleSubscriptionUpdate).not.toHaveBeenCalled();
    });
  });

  describe("checkIfTeamPaymentRequired", () => {
    const internalTeamBilling = new InternalTeamBilling(mockTeam);
    it("should return payment required if no paymentId", async () => {
      internalTeamBilling.team.metadata.paymentId = undefined;

      const result = await internalTeamBilling.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: null, paymentRequired: true });
    });

    it("should return payment required if checkout session is not paid", async () => {
      vi.spyOn(billingModule.default, "checkoutSessionIsPaid").mockResolvedValue(false);
      const internalTeamBilling = new InternalTeamBilling(mockTeam);

      const result = await internalTeamBilling.checkIfTeamPaymentRequired();

      expect(result).toEqual({ url: null, paymentId: "cs_789", paymentRequired: true });
    });

    it("should return upgrade URL if checkout session is paid", async () => {
      vi.spyOn(billingModule.default, "checkoutSessionIsPaid").mockResolvedValue(true);
      const internalTeamBilling = new InternalTeamBilling(mockTeam);
      const result = await internalTeamBilling.checkIfTeamPaymentRequired();

      expect(result).toEqual({
        url: `${WEBAPP_URL}/api/teams/1/upgrade?session_id=cs_789`,
        paymentId: "cs_789",
        paymentRequired: false,
      });
    });
  });
});
