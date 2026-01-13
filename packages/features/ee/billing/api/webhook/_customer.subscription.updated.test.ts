import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";
import handler from "./_customer.subscription.updated";

let prismaMock!: {
  teamBilling: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  organizationBilling: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  calAiPhoneNumber: {
    update: ReturnType<typeof vi.fn>;
  };
};

let findByStripeSubscriptionId!: ReturnType<typeof vi.fn>;

vi.mock("@calcom/features/calAIPhone/repositories/PrismaPhoneNumberRepository", () => {
  findByStripeSubscriptionId = vi.fn().mockResolvedValue(null);

  return {
    PrismaPhoneNumberRepository: class {
      findByStripeSubscriptionId = findByStripeSubscriptionId;
    },
  };
});

vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: () => ({
    extractSubscriptionDates: () => ({
      subscriptionStart: new Date("2024-01-01T00:00:00.000Z"),
      subscriptionEnd: new Date("2024-12-31T00:00:00.000Z"),
      subscriptionTrialEnd: null,
    }),
  }),
}));

vi.mock("@calcom/prisma", () => {
  prismaMock = {
    teamBilling: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organizationBilling: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    calAiPhoneNumber: {
      update: vi.fn(),
    },
  };

  return {
    default: prismaMock,
  };
});

describe("customer.subscription.updated webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates team billing on renewal", async () => {
    prismaMock.teamBilling.findUnique.mockResolvedValue({ id: "tb_1", teamId: 123 });
    prismaMock.organizationBilling.findUnique.mockResolvedValue(null);

    const data = {
      object: {
        id: "sub_123",
        status: "active",
        items: {
          data: [
            {
              quantity: 5,
              price: {
                unit_amount: 12000,
                recurring: { interval: "year" },
              },
            },
          ],
        },
      },
      previous_attributes: {
        current_period_start: 1690000000,
      },
    } as unknown as SWHMap["customer.subscription.updated"]["data"];

    const result = await handler(data);

    expect(prismaMock.teamBilling.update).toHaveBeenCalledWith({
      where: { id: "tb_1" },
      data: expect.objectContaining({
        billingPeriod: "ANNUALLY",
        pricePerSeat: 12000,
        paidSeats: 5,
        subscriptionStart: new Date("2024-01-01T00:00:00.000Z"),
        subscriptionEnd: new Date("2024-12-31T00:00:00.000Z"),
        subscriptionTrialEnd: null,
      }),
    });
    expect(result).toEqual({
      phoneNumber: null,
      teamBilling: { success: true, type: "team", teamId: 123 },
    });
  });
});
