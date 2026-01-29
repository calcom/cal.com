import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { BillingPeriod } from "@calcom/prisma/zod-utils";

import {
  getTeamWithPaymentMetadata,
  purchaseTeamOrOrgSubscription,
  updateQuantitySubscriptionFromStripe,
} from "./payments";

beforeEach(async () => {
  vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "STRIPE_ORG_MONTHLY_PRICE_ID");
  vi.stubEnv("STRIPE_TEAM_MONTHLY_PRICE_ID", "STRIPE_TEAM_MONTHLY_PRICE_ID");
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
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
      prices: {
        retrieve: vi.fn(),
        create: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe("purchaseTeamOrOrgSubscription", () => {
  it("should use `seatsToChargeFor` to create price", async () => {
    const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
    const user = await prismock.user.create({
      data: {
        name: "test",
        email: "test@email.com",
      },
    });

    const checkoutSessionsCreate = mockStripeCheckoutSessionsCreate({
      url: "SESSION_URL",
    });

    mockStripeCheckoutSessionRetrieve(
      {
        currency: "USD",
        product: {
          id: "PRODUCT_ID",
        },
      },
      [FAKE_PAYMENT_ID]
    );

    mockStripeCheckoutPricesRetrieve({
      id: "PRICE_ID",
      product: {
        id: "PRODUCT_ID",
      },
    });

    mockStripePricesCreate({
      id: "PRICE_ID",
    });

    const team = await prismock.team.create({
      data: {
        name: "test",
        metadata: {
          paymentId: FAKE_PAYMENT_ID,
        },
      },
    });

    const seatsToChargeFor = 1000;
    expect(
      await purchaseTeamOrOrgSubscription({
        teamId: team.id,
        seatsUsed: 10,
        seatsToChargeFor,
        userId: user.id,
        isOrg: true,
        pricePerSeat: 100,
      })
    ).toEqual({ url: "SESSION_URL" });

    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price: "PRICE_ID",
            quantity: seatsToChargeFor,
          },
        ],
      })
    );
  });
  it("Should create a monthly subscription if billing period is set to monthly", async () => {
    const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
    const user = await prismock.user.create({
      data: {
        name: "test",
        email: "test@email.com",
      },
    });

    const checkoutSessionsCreate = mockStripeCheckoutSessionsCreate({
      url: "SESSION_URL",
    });

    mockStripeCheckoutSessionRetrieve(
      {
        currency: "USD",
        product: {
          id: "PRODUCT_ID",
        },
      },
      [FAKE_PAYMENT_ID]
    );

    mockStripeCheckoutPricesRetrieve({
      id: "PRICE_ID",
      product: {
        id: "PRODUCT_ID",
      },
    });

    const checkoutPricesCreate = mockStripePricesCreate({
      id: "PRICE_ID",
    });

    const team = await prismock.team.create({
      data: {
        name: "test",
        metadata: {
          paymentId: FAKE_PAYMENT_ID,
        },
      },
    });

    const seatsToChargeFor = 1000;
    expect(
      await purchaseTeamOrOrgSubscription({
        teamId: team.id,
        seatsUsed: 10,
        seatsToChargeFor,
        userId: user.id,
        isOrg: true,
        pricePerSeat: 100,
        billingPeriod: BillingPeriod.MONTHLY,
      })
    ).toEqual({ url: "SESSION_URL" });

    expect(checkoutPricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ recurring: { interval: "month" } })
    );

    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price: "PRICE_ID",
            quantity: seatsToChargeFor,
          },
        ],
      })
    );
  });
  it("Should create a annual subscription if billing period is set to annual", async () => {
    const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
    const user = await prismock.user.create({
      data: {
        name: "test",
        email: "test@email.com",
      },
    });

    const checkoutSessionsCreate = mockStripeCheckoutSessionsCreate({
      url: "SESSION_URL",
    });

    mockStripeCheckoutSessionRetrieve(
      {
        currency: "USD",
        product: {
          id: "PRODUCT_ID",
        },
      },
      [FAKE_PAYMENT_ID]
    );

    mockStripeCheckoutPricesRetrieve({
      id: "PRICE_ID",
      product: {
        id: "PRODUCT_ID",
      },
    });

    const checkoutPricesCreate = mockStripePricesCreate({
      id: "PRICE_ID",
    });

    const team = await prismock.team.create({
      data: {
        name: "test",
        metadata: {
          paymentId: FAKE_PAYMENT_ID,
        },
      },
    });

    const seatsToChargeFor = 1000;
    expect(
      await purchaseTeamOrOrgSubscription({
        teamId: team.id,
        seatsUsed: 10,
        seatsToChargeFor,
        userId: user.id,
        isOrg: true,
        pricePerSeat: 100,
        billingPeriod: BillingPeriod.ANNUALLY,
      })
    ).toEqual({ url: "SESSION_URL" });

    expect(checkoutPricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({ recurring: { interval: "year" } })
    );

    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          {
            price: "PRICE_ID",
            quantity: seatsToChargeFor,
          },
        ],
      })
    );
  });

  it("It should not create a custom price if price_per_seat is not set", async () => {
    const FAKE_PAYMENT_ID = "FAKE_PAYMENT_ID";
    const user = await prismock.user.create({
      data: {
        name: "test",
        email: "test@email.com",
      },
    });

    mockStripeCheckoutSessionsCreate({
      url: "SESSION_URL",
    });

    mockStripeCheckoutSessionRetrieve(
      {
        currency: "USD",
        product: {
          id: "PRODUCT_ID",
        },
      },
      [FAKE_PAYMENT_ID]
    );

    mockStripeCheckoutPricesRetrieve({
      id: "PRICE_ID",
      product: {
        id: "PRODUCT_ID",
      },
    });

    const checkoutPricesCreate = mockStripePricesCreate({
      id: "PRICE_ID",
    });

    const team = await prismock.team.create({
      data: {
        name: "test",
        metadata: {
          paymentId: FAKE_PAYMENT_ID,
        },
      },
    });

    const seatsToChargeFor = 1000;
    expect(
      await purchaseTeamOrOrgSubscription({
        teamId: team.id,
        seatsUsed: 10,
        seatsToChargeFor,
        userId: user.id,
        isOrg: true,
        billingPeriod: BillingPeriod.ANNUALLY,
        pricePerSeat: null,
      })
    ).toEqual({ url: "SESSION_URL" });

    expect(checkoutPricesCreate).not.toHaveBeenCalled();
  });
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

function mockStripePricesCreate(data) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return vi.mocked(stripe.prices.create).mockImplementation(() => new Promise((resolve) => resolve(data)));
}

function mockStripeCheckoutPricesRetrieve(data) {
  return vi.mocked(stripe.prices.retrieve).mockImplementation(
    async () =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      new Promise((resolve) => {
        resolve(data);
      })
  );
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

function mockStripeCheckoutSessionsCreate(data) {
  return vi.mocked(stripe.checkout.sessions.create).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    async () => new Promise((resolve) => resolve(data))
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
