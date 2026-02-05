import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import stripe from "@calcom/features/ee/payments/server/stripe";

import { getTeamWithPaymentMetadata, updateQuantitySubscriptionFromStripe } from "./payments";

beforeEach(async () => {
  vi.resetAllMocks();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await prismock.reset();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await prismock.reset();
});

vi.mock("@calcom/app-store/stripepayment/lib/customer", () => {
  return {
    getStripeCustomerIdFromUserId: function () {
      return "CUSTOMER_ID";
    },
  };
});

vi.mock("@calcom/features/ee/payments/server/stripe", () => {
  return {
    default: {
      checkout: {
        sessions: {
          retrieve: vi.fn(),
        },
      },
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe("updateQuantitySubscriptionFromStripe", () => {
  describe("For an organization", () => {
    it("should update subscription based on actual member count (orgSeats no longer enforced)", async () => {
      const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
      const FAKE_SUBITEM_ID = "FAKE_SUBITEM_ID";
      const FAKE_SUB_ID = "FAKE_SUB_ID";
      const FAKE_SUBSCRIPTION_QTY_IN_STRIPE = 1000;
      const membersInTeam = 2;

      const organization = await createOrgWithMembersAndPaymentData({
        paymentId: FAKE_PAYMENT_ID,
        subscriptionId: FAKE_SUB_ID,
        subscriptionItemId: FAKE_SUBITEM_ID,
        membersInTeam,
        orgSeats: 5, // Even though orgSeats is 5, we should update to actual member count (2)
      });

      mockStripeCheckoutSessionRetrieve(
        {
          payment_status: "paid",
        },
        [FAKE_PAYMENT_ID]
      );

      mockStripeSubscriptionsRetrieve(
        {
          items: {
            data: [
              {
                id: "FAKE_SUBITEM_ID",
                quantity: FAKE_SUBSCRIPTION_QTY_IN_STRIPE,
              },
            ],
          },
        },
        [FAKE_SUB_ID]
      );

      const mockedSubscriptionsUpdate = mockStripeSubscriptionsUpdate(null);

      await updateQuantitySubscriptionFromStripe(organization.id);

      // Should update subscription to actual member count, regardless of orgSeats
      expect(mockedSubscriptionsUpdate).toHaveBeenCalledWith(
        FAKE_SUB_ID,
        expect.objectContaining({
          items: [{ quantity: membersInTeam, id: FAKE_SUBITEM_ID }],
        })
      );
    });

    it("should update subscription when team members are more than metadata.orgSeats", async () => {
      const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
      const FAKE_SUB_ID = "FAKE_SUB_ID";
      const FAKE_SUBITEM_ID = "FAKE_SUBITEM_ID";
      const FAKE_SUBSCRIPTION_QTY_IN_STRIPE = 1000;
      const membersInTeam = 4;
      const organization = await createOrgWithMembersAndPaymentData({
        paymentId: FAKE_PAYMENT_ID,
        subscriptionId: FAKE_SUB_ID,
        subscriptionItemId: FAKE_SUBITEM_ID,
        membersInTeam,
        orgSeats: 3,
      });

      mockStripeCheckoutSessionRetrieve(
        {
          payment_status: "paid",
        },
        [FAKE_PAYMENT_ID]
      );

      mockStripeSubscriptionsRetrieve(
        {
          items: {
            data: [
              {
                id: FAKE_SUBITEM_ID,
                quantity: FAKE_SUBSCRIPTION_QTY_IN_STRIPE,
              },
            ],
          },
        },
        [FAKE_SUB_ID]
      );

      const mockedSubscriptionsUpdate = mockStripeSubscriptionsUpdate(null);

      await updateQuantitySubscriptionFromStripe(organization.id);

      // orgSeats is more than the current number of members - So, no update in stripe
      expect(mockedSubscriptionsUpdate).toHaveBeenCalledWith(FAKE_SUB_ID, {
        items: [
          {
            quantity: membersInTeam,
            id: FAKE_SUBITEM_ID,
          },
        ],
      });
    });

    it("should update subscription regardless of member count", async () => {
      const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
      const FAKE_SUBITEM_ID = "FAKE_SUBITEM_ID";
      const FAKE_SUB_ID = "FAKE_SUB_ID";
      const FAKE_SUBSCRIPTION_QTY_IN_STRIPE = 1000;
      const membersInTeam = 2; // Even with just 2 members, should update

      const organization = await createOrgWithMembersAndPaymentData({
        paymentId: FAKE_PAYMENT_ID,
        subscriptionId: FAKE_SUB_ID,
        subscriptionItemId: FAKE_SUBITEM_ID,
        membersInTeam,
        orgSeats: null,
      });

      mockStripeSubscriptionsRetrieve(
        {
          items: {
            data: [
              {
                id: "FAKE_SUBITEM_ID",
                quantity: FAKE_SUBSCRIPTION_QTY_IN_STRIPE,
              },
            ],
          },
        },
        [FAKE_SUB_ID]
      );

      mockStripeCheckoutSessionRetrieve(
        {
          payment_status: "paid",
        },
        [FAKE_PAYMENT_ID]
      );

      const mockedSubscriptionsUpdate = mockStripeSubscriptionsUpdate(null);

      await updateQuantitySubscriptionFromStripe(organization.id);
      // Should update subscription even with low member count (no minimum enforcement)
      expect(mockedSubscriptionsUpdate).toHaveBeenCalledWith(
        FAKE_SUB_ID,
        expect.objectContaining({
          items: [{ quantity: membersInTeam, id: FAKE_SUBITEM_ID }],
        })
      );
    });

    it("should update subscription when team members count changes (no minimum enforcement)", async () => {
      const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
      const FAKE_SUB_ID = "FAKE_SUB_ID";
      const FAKE_SUBITEM_ID = "FAKE_SUBITEM_ID";
      const FAKE_SUBSCRIPTION_QTY_IN_STRIPE = 1000;
      const membersInTeam = 35;
      const organization = await createOrgWithMembersAndPaymentData({
        paymentId: FAKE_PAYMENT_ID,
        subscriptionId: FAKE_SUB_ID,
        subscriptionItemId: FAKE_SUBITEM_ID,
        membersInTeam,
        orgSeats: null,
      });

      mockStripeCheckoutSessionRetrieve(
        {
          payment_status: "paid",
        },
        [FAKE_PAYMENT_ID]
      );

      mockStripeSubscriptionsRetrieve(
        {
          items: {
            data: [
              {
                id: FAKE_SUBITEM_ID,
                quantity: FAKE_SUBSCRIPTION_QTY_IN_STRIPE,
              },
            ],
          },
        },
        [FAKE_SUB_ID]
      );

      const mockedSubscriptionsUpdate = mockStripeSubscriptionsUpdate(null);

      await updateQuantitySubscriptionFromStripe(organization.id);

      // orgSeats is more than the current number of members - So, no update in stripe
      expect(mockedSubscriptionsUpdate).toHaveBeenCalledWith(FAKE_SUB_ID, {
        items: [
          {
            quantity: membersInTeam,
            id: FAKE_SUBITEM_ID,
          },
        ],
      });
    });
  });
});

describe("getTeamWithPaymentMetadata", () => {
  it("should error if paymentId is not set", async () => {
    const team = await prismock.team.create({
      data: {
        isOrganization: true,
        name: "TestTeam",
        metadata: {
          subscriptionId: "FAKE_SUB_ID",
          subscriptionItemId: "FAKE_SUB_ITEM_ID",
        },
      },
    });
    expect(() => getTeamWithPaymentMetadata(team.id)).rejects.toThrow();
  });

  it("should error if subscriptionId is not set", async () => {
    const team = await prismock.team.create({
      data: {
        isOrganization: true,
        name: "TestTeam",
        metadata: {
          paymentId: "FAKE_PAY_ID",
          subscriptionItemId: "FAKE_SUB_ITEM_ID",
        },
      },
    });
    expect(() => getTeamWithPaymentMetadata(team.id)).rejects.toThrow();
  });

  it("should error if subscriptionItemId is not set", async () => {
    const team = await prismock.team.create({
      data: {
        isOrganization: true,
        name: "TestTeam",
        metadata: {
          paymentId: "FAKE_PAY_ID",
          subscriptionId: "FAKE_SUB_ID",
        },
      },
    });
    expect(() => getTeamWithPaymentMetadata(team.id)).rejects.toThrow();
  });

  it("should parse successfully if orgSeats is not set in metadata", async () => {
    const team = await prismock.team.create({
      data: {
        isOrganization: true,
        name: "TestTeam",
        metadata: {
          paymentId: "FAKE_PAY_ID",
          subscriptionId: "FAKE_SUB_ID",
          subscriptionItemId: "FAKE_SUB_ITEM_ID",
        },
      },
    });
    const teamWithPaymentData = await getTeamWithPaymentMetadata(team.id);
    expect(teamWithPaymentData.metadata.orgSeats).toBeUndefined();
  });

  it("should parse successfully if orgSeats is set in metadata", async () => {
    const team = await prismock.team.create({
      data: {
        isOrganization: true,
        name: "TestTeam",
        metadata: {
          orgSeats: 5,
          paymentId: "FAKE_PAY_ID",
          subscriptionId: "FAKE_SUB_ID",
          subscriptionItemId: "FAKE_SUB_ITEM_ID",
        },
      },
    });
    const teamWithPaymentData = await getTeamWithPaymentMetadata(team.id);
    expect(teamWithPaymentData.metadata.orgSeats).toEqual(5);
  });
});

async function createOrgWithMembersAndPaymentData({
  paymentId,
  subscriptionId,
  subscriptionItemId,
  orgSeats,
  membersInTeam,
}: {
  paymentId: string;
  subscriptionId: string;
  subscriptionItemId: string;
  orgSeats?: number | null;
  membersInTeam: number;
}) {
  const organization = await prismock.team.create({
    data: {
      isOrganization: true,
      name: "TestTeam",
      metadata: {
        // Make sure that payment is already done
        paymentId,
        orgSeats,
        subscriptionId,
        subscriptionItemId,
      },
    },
  });

  await Promise.all([
    Array(membersInTeam)
      .fill(0)
      .map(async (_, index) => {
        return await prismock.membership.create({
          data: {
            team: {
              connect: {
                id: organization.id,
              },
            },
            user: {
              create: {
                name: "ABC",
                email: `test-${index}@example.com`,
              },
            },
            role: "MEMBER",
          },
        });
      }),
  ]);
  return organization;
}

function mockStripeCheckoutSessionRetrieve(data, expectedArgs) {
  return vi.mocked(stripe.checkout.sessions.retrieve).mockImplementation(async (sessionId) =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      const conditionMatched = expectedArgs[0] === sessionId;
      return new Promise((resolve) => resolve(conditionMatched ? data : null));
    }
  );
}

function mockStripeSubscriptionsRetrieve(data, expectedArgs) {
  return vi.mocked(stripe.subscriptions.retrieve).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    async (subscriptionId) => {
      const conditionMatched = expectedArgs ? expectedArgs[0] === subscriptionId : true;
      return new Promise((resolve) => resolve(conditionMatched ? data : undefined));
    }
  );
}

function mockStripeSubscriptionsUpdate(data) {
  return vi.mocked(stripe.subscriptions.update).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    async () => new Promise((resolve) => resolve(data))
  );
}
