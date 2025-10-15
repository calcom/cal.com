import type Stripe from "stripe";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { HttpCode } from "../../lib/httpCode";

vi.mock("./_customer.subscription.updated/_teamAndOrgUpdateHandler");
vi.mock("./_customer.subscription.updated/_calAIPhoneNumberUpdateHandler");

type SubscriptionData = Stripe.CustomerSubscriptionUpdatedEvent["data"];

describe("_customer.subscription.updated handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_TEAM_PRODUCT_ID", "prod_team_123");
    vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "prod_org_456");
    vi.stubEnv("STRIPE_CAL_AI_PHONE_NUMBER_PRODUCT_ID", "prod_phone_789");
  });

  const createSubscriptionData = (overrides: Partial<Stripe.Subscription> = {}): SubscriptionData => ({
    object: {
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      items: {
        data: [],
      },
      ...overrides,
    } as Stripe.Subscription,
  });

  it("should throw error if subscription ID is missing", async () => {
    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data: SubscriptionData = {
      object: {
        id: null,
        status: "active",
        customer: "cus_123",
        items: { data: [] },
      } as unknown as Stripe.Subscription,
    };

    await expect(handler(data)).rejects.toThrow(new HttpCode(400, "Subscription ID not found"));
  });

  it("should handle team subscription update", async () => {
    const mockTeamHandler = vi.fn().mockResolvedValue({
      success: true,
      subscriptionId: "sub_123",
      status: "active",
    });

    const { default: teamAndOrgHandler } = await import(
      "./_customer.subscription.updated/_teamAndOrgUpdateHandler"
    );
    vi.mocked(teamAndOrgHandler).mockImplementation(mockTeamHandler);

    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_123",
            price: {
              product: "prod_team_123",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      subscriptionId: "sub_123",
      status: "active",
    });
    expect(mockTeamHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod_team_123",
        object: expect.objectContaining({
          id: "sub_123",
        }),
      })
    );
  });

  it("should handle organization subscription update", async () => {
    const mockOrgHandler = vi.fn().mockResolvedValue({
      success: true,
      subscriptionId: "sub_123",
      status: "active",
    });

    const { default: teamAndOrgHandler } = await import(
      "./_customer.subscription.updated/_teamAndOrgUpdateHandler"
    );
    vi.mocked(teamAndOrgHandler).mockImplementation(mockOrgHandler);

    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_456",
            price: {
              product: "prod_org_456",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      subscriptionId: "sub_123",
      status: "active",
    });
    expect(mockOrgHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod_org_456",
        object: expect.objectContaining({
          id: "sub_123",
        }),
      })
    );
  });

  it("should prioritize org product over team product", async () => {
    const mockOrgHandler = vi.fn().mockResolvedValue({
      success: true,
      subscriptionId: "sub_123",
      status: "active",
    });

    const { default: teamAndOrgHandler } = await import(
      "./_customer.subscription.updated/_teamAndOrgUpdateHandler"
    );
    vi.mocked(teamAndOrgHandler).mockImplementation(mockOrgHandler);

    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_team",
            price: {
              product: "prod_team_123",
            },
          } as Stripe.SubscriptionItem,
          {
            id: "si_org",
            price: {
              product: "prod_org_456",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    await handler(data);

    expect(mockOrgHandler).toHaveBeenCalledTimes(2);
    expect(mockOrgHandler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        productId: "prod_team_123",
      })
    );
    expect(mockOrgHandler).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        productId: "prod_org_456",
      })
    );
  });

  it("should handle phone number subscription update", async () => {
    const mockPhoneHandler = vi.fn().mockResolvedValue({
      success: true,
      subscriptionId: "sub_123",
      subscriptionStatus: "active",
    });

    const { default: phoneHandler } = await import(
      "./_customer.subscription.updated/_calAIPhoneNumberUpdateHandler"
    );
    vi.mocked(phoneHandler).mockImplementation(mockPhoneHandler);

    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_phone",
            price: {
              product: "prod_phone_789",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toEqual({
      success: true,
      subscriptionId: "sub_123",
      subscriptionStatus: "active",
    });
    expect(mockPhoneHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod_phone_789",
        object: expect.objectContaining({
          id: "sub_123",
        }),
      })
    );
  });

  it("should return undefined when no matching product handler found", async () => {
    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_unknown",
            price: {
              product: "prod_unknown_999",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toBeUndefined();
  });

  it("should return undefined when subscription items is empty", async () => {
    const handler = (await import("./_customer.subscription.updated/_handler")).default;

    const data = createSubscriptionData({
      items: {
        data: [],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toBeUndefined();
  });
});
