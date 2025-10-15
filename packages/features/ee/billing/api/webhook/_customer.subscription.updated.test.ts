import type Stripe from "stripe";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SubscriptionStatus } from "../../repository/IBillingRepository";
import { StripeBillingService } from "../../stripe-billing-service";
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
    vi.spyOn(StripeBillingService, "mapSubscriptionStatusToCalStatus").mockReturnValue(
      SubscriptionStatus.ACTIVE
    );

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
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: expect.any(Date),
      subscriptionTrialEnd: null,
      subscriptionEnd: null,
    });
  });

  it("should handle organization subscription update", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");

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
    vi.spyOn(StripeBillingService, "mapSubscriptionStatusToCalStatus").mockReturnValue(
      SubscriptionStatus.ACTIVE
    );

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
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: expect.any(Date),
      subscriptionTrialEnd: null,
      subscriptionEnd: null,
    });
  });

  it("should prioritize org product over team product", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");

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
    vi.spyOn(StripeBillingService, "mapSubscriptionStatusToCalStatus").mockReturnValue(
      SubscriptionStatus.ACTIVE
    );

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
    const mockPhoneNumberRepoInstance = {
      findByStripeSubscriptionId: vi.fn().mockResolvedValue(mockPhoneNumber),
    };
    vi.mocked(PrismaPhoneNumberRepository).mockImplementation(
      () => mockPhoneNumberRepoInstance as unknown as InstanceType<typeof PrismaPhoneNumberRepository>
    );
    vi.mocked(prisma.calAiPhoneNumber.update).mockResolvedValue(mockPhoneNumber);

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

    expect(result).toHaveProperty("success", true);
    expect(mockPhoneNumberRepoInstance.findByStripeSubscriptionId).toHaveBeenCalledWith({
      stripeSubscriptionId: "sub_123",
    });
  });

  it("should throw error when phone number not found", async () => {
    const { PrismaPhoneNumberRepository } = await import(
      "@calcom/lib/server/repository/PrismaPhoneNumberRepository"
    );

    const mockPhoneNumberRepoInstance = {
      findByStripeSubscriptionId: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(PrismaPhoneNumberRepository).mockImplementation(
      () => mockPhoneNumberRepoInstance as unknown as InstanceType<typeof PrismaPhoneNumberRepository>
    );

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

    await expect(handler(data)).rejects.toThrow(new HttpCode(202, "Phone number not found"));
  });

  it("should throw HttpCode 202 when team subscription handler fails", async () => {
    const { TeamSubscriptionEventHandler } = await import("../../service/TeamSubscriptionEventHandler");
    const { BillingRepositoryFactory } = await import("../../repository/billingRepositoryFactory");

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
    vi.spyOn(StripeBillingService, "mapSubscriptionStatusToCalStatus").mockReturnValue(
      SubscriptionStatus.ACTIVE
    );

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
