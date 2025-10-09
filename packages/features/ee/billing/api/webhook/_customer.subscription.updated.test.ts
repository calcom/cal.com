import type Stripe from "stripe";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SubscriptionStatus } from "../../repository/IBillingRepository";
import { HttpCode } from "./__handler";
import handler from "./_customer.subscription.updated";

vi.mock("@calcom/lib/server/repository/PrismaPhoneNumberRepository");
vi.mock("@calcom/lib/server/repository/team");
vi.mock("@calcom/prisma", () => ({
  prisma: {
    calAiPhoneNumber: {
      update: vi.fn(),
    },
  },
}));
vi.mock("../../repository/billingRepositoryFactory");
vi.mock("../../service/TeamSubscriptionEventHandler");
vi.mock("./lib/mapStripeStatusToCalStatus");

type SubscriptionData = Stripe.CustomerSubscriptionUpdatedEvent["data"];

describe("_customer.subscription.updated handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_TEAM_PRODUCT_ID", "prod_team_123");
    vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "prod_org_456");
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
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");
    const { TeamRepository } = await import("@calcom/lib/server/repository/team");
    const { mapStripeStatusToCalStatus } = await import("./lib/mapStripeStatusToCalStatus");

    const mockHandleUpdate = vi.fn().mockResolvedValue(undefined);
    const mockHandler = {
      handleUpdate: mockHandleUpdate,
    };
    vi.mocked(TeamSubscriptionEventHandler).mockImplementation(() => mockHandler);

    vi.mocked(BillingRepositoryFactory.getRepository).mockReturnValue({
      create: vi.fn(),
      getBySubscriptionId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
    });
    vi.mocked(TeamRepository).mockImplementation(
      () =>
        ({
          findBySubscriptionId: vi.fn(),
        } as unknown as ReturnType<typeof TeamRepository>)
    );
    vi.mocked(mapStripeStatusToCalStatus).mockReturnValue(SubscriptionStatus.ACTIVE);

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
      subscriptionStatus: "active",
    });
    expect(mockHandleUpdate).toHaveBeenCalledWith({
      subscriptionId: "sub_123",
      subscriptionItemId: "si_123",
      customerId: "cus_123",
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });
  });

  it("should handle organization subscription update", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");
    const { mapStripeStatusToCalStatus } = await import("./lib/mapStripeStatusToCalStatus");

    const mockHandleUpdate = vi.fn().mockResolvedValue(undefined);
    const mockHandler = {
      handleUpdate: mockHandleUpdate,
    };
    vi.mocked(TeamSubscriptionEventHandler).mockImplementation(() => mockHandler);

    const mockOrgRepository = {
      create: vi.fn(),
      getBySubscriptionId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
    };
    vi.mocked(BillingRepositoryFactory.getRepository).mockReturnValue(mockOrgRepository);
    vi.mocked(mapStripeStatusToCalStatus).mockReturnValue(SubscriptionStatus.ACTIVE);

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
      subscriptionStatus: "active",
    });
    expect(BillingRepositoryFactory.getRepository).toHaveBeenCalledWith(true);
    expect(mockHandleUpdate).toHaveBeenCalledWith({
      subscriptionId: "sub_123",
      subscriptionItemId: "si_456",
      customerId: "cus_123",
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });
  });

  it("should prioritize org product over team product", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");
    const { mapStripeStatusToCalStatus } = await import("./lib/mapStripeStatusToCalStatus");

    const mockHandleUpdate = vi.fn().mockResolvedValue(undefined);
    const mockHandler = {
      handleUpdate: mockHandleUpdate,
    };
    vi.mocked(TeamSubscriptionEventHandler).mockImplementation(() => mockHandler);

    vi.mocked(BillingRepositoryFactory.getRepository).mockReturnValue({
      create: vi.fn(),
      getBySubscriptionId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
    });
    vi.mocked(mapStripeStatusToCalStatus).mockReturnValue(SubscriptionStatus.ACTIVE);

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

    expect(BillingRepositoryFactory.getRepository).toHaveBeenCalledWith(true);
    expect(mockHandleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionItemId: "si_org",
      })
    );
  });

  it("should fall through to phone number handling when no team/org product found", async () => {
    const { PrismaPhoneNumberRepository } = await import(
      "@calcom/lib/server/repository/PrismaPhoneNumberRepository"
    );
    const { prisma } = await import("@calcom/prisma");

    const mockPhoneNumber = {
      id: 1,
      phoneNumber: "+1234567890",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(PrismaPhoneNumberRepository.findByStripeSubscriptionId).mockResolvedValue(mockPhoneNumber);
    vi.mocked(prisma.calAiPhoneNumber.update).mockResolvedValue(mockPhoneNumber);

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_other",
            price: {
              product: "prod_other_999",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    const result = await handler(data);

    expect(result).toHaveProperty("success", true);
    expect(PrismaPhoneNumberRepository.findByStripeSubscriptionId).toHaveBeenCalledWith({
      stripeSubscriptionId: "sub_123",
    });
  });

  it("should throw error when phone number not found", async () => {
    const { PrismaPhoneNumberRepository } = await import(
      "@calcom/lib/server/repository/PrismaPhoneNumberRepository"
    );

    vi.mocked(PrismaPhoneNumberRepository.findByStripeSubscriptionId).mockResolvedValue(null);

    const data = createSubscriptionData({
      items: {
        data: [
          {
            id: "si_other",
            price: {
              product: "prod_other_999",
            },
          } as Stripe.SubscriptionItem,
        ],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
    });

    await expect(handler(data)).rejects.toThrow(new HttpCode(202, "Phone number not found"));
  });

  it("should throw HttpCode 202 when team subscription handler fails", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");
    const { mapStripeStatusToCalStatus } = await import("./lib/mapStripeStatusToCalStatus");

    const mockHandleUpdate = vi.fn().mockRejectedValue(new Error("Database error"));
    const mockHandler = {
      handleUpdate: mockHandleUpdate,
    };
    vi.mocked(TeamSubscriptionEventHandler).mockImplementation(() => mockHandler);

    vi.mocked(BillingRepositoryFactory.getRepository).mockReturnValue({
      create: vi.fn(),
      getBySubscriptionId: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
    });
    vi.mocked(mapStripeStatusToCalStatus).mockReturnValue(SubscriptionStatus.ACTIVE);

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

    await expect(handler(data)).rejects.toThrow(
      new HttpCode(202, "Failed to handle team subscription update")
    );
  });
});
