import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import stripe from "@calcom/app-store/stripepayment/lib/server";

import { purchaseTeamOrOrgSubscription } from "./payments";

beforeAll(() => {
  vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "STRIPE_ORG_MONTHLY_PRICE_ID");
  vi.stubEnv("STRIPE_TEAM_MONTHLY_PRICE_ID", "STRIPE_TEAM_MONTHLY_PRICE_ID");
});

afterAll(() => {
  vi.unstubAllEnvs();
});
vi.mock("@calcom/app-store/stripepayment/lib/customer", () => {
  return {
    getStripeCustomerIdFromUserId: function () {
      return "CUSTOMER_ID";
    },
  };
});

vi.mock("@calcom/app-store/stripepayment/lib/server", () => {
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
    },
  };
});

describe("purchaseTeamOrOrgSubscription", () => {
  it("should use `seatsToChargeFor` to create price", async () => {
    const user = await prismock.user.create({
      data: {
        name: "test",
        email: "test@email.com",
      },
    });

    const checkoutSessionsCreate = mockStripeCheckoutSessionsCreate({
      url: "SESSION_URL",
    });

    mockStripeCheckoutSessionRetrieve({
      currency: "USD",
      product: {
        id: "PRODUCT_ID",
      },
    });

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
});

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

function mockStripeCheckoutSessionRetrieve(data) {
  return vi.mocked(stripe.checkout.sessions.retrieve).mockImplementation(
    async () =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      new Promise((resolve) => resolve(data))
  );
}

function mockStripeCheckoutSessionsCreate(data) {
  return vi.mocked(stripe.checkout.sessions.create).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    async () => new Promise((resolve) => resolve(data))
  );
}
