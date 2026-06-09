jest.mock(
  "@calcom/platform-libraries",
  () => ({
    CreationSource: { API_V2: "API_V2" },
    credentialForCalendarServiceSelect: {},
  }),
  { virtual: true }
);

import type { Prisma, User } from "@calcom/prisma/client";
import { createMock } from "@golevelup/ts-jest";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { StripeService } from "./stripe.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { UsersRepository } from "@/modules/users/users.repository";

describe("StripeService", () => {
  let service: StripeService;
  let mockUsersRepository: ReturnType<typeof createMock<UsersRepository>>;
  let mockCustomersList: jest.Mock<
    Promise<Stripe.Response<Stripe.ApiList<Stripe.Customer>>>,
    [Stripe.CustomerListParams]
  >;
  let mockCustomersCreate: jest.Mock<
    Promise<Stripe.Response<Stripe.Customer>>,
    [Stripe.CustomerCreateParams]
  >;

  const user: Pick<User, "email" | "name" | "metadata"> = {
    email: "user@example.com",
    name: "Test User",
    metadata: {
      existing: "value",
    } satisfies Prisma.JsonObject,
  };

  beforeEach(() => {
    mockCustomersList = jest.fn();
    mockCustomersCreate = jest.fn();
    mockUsersRepository = createMock<UsersRepository>();
    const mockConfigService = createMock<ConfigService>({
      get: jest.fn().mockReturnValue(""),
    });
    service = new StripeService(
      mockConfigService,
      mockConfigService,
      createMock<AppsRepository>(),
      createMock<CredentialsRepository>(),
      createMock<MembershipsRepository>(),
      mockUsersRepository
    );
    jest.spyOn(service, "getStripe").mockReturnValue({
      customers: {
        list: mockCustomersList,
        create: mockCustomersCreate,
      },
    } as unknown as Stripe);
  });

  describe("createStripeCustomerId", () => {
    it("reuses an existing Stripe customer when lookup finds one", async () => {
      mockCustomersList.mockResolvedValue(createCustomerSearchResult([createCustomer("cus_existing")]));

      await expect(service.createStripeCustomerId(user)).resolves.toBe("cus_existing");

      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockUsersRepository.updateByEmail).toHaveBeenCalledWith(user.email, {
        metadata: {
          existing: "value",
          stripeCustomerId: "cus_existing",
        },
      });
    });

    it("creates a Stripe customer when lookup returns no customers", async () => {
      mockCustomersList.mockResolvedValue(createCustomerSearchResult([]));
      mockCustomersCreate.mockResolvedValue(createCustomer("cus_new"));

      await expect(service.createStripeCustomerId(user)).resolves.toBe("cus_new");

      expect(mockCustomersCreate).toHaveBeenCalledWith({ email: user.email });
      expect(mockUsersRepository.updateByEmail).toHaveBeenCalledWith(user.email, {
        metadata: {
          existing: "value",
          stripeCustomerId: "cus_new",
        },
      });
    });

    it("propagates Stripe lookup errors without creating duplicate customers", async () => {
      const stripeError = new Error("Stripe lookup failed");
      mockCustomersList.mockRejectedValue(stripeError);

      await expect(service.createStripeCustomerId(user)).rejects.toThrow(stripeError);

      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockUsersRepository.updateByEmail).not.toHaveBeenCalled();
    });
  });

  function createCustomer(id: string): Stripe.Response<Stripe.Customer> {
    return createMock<Stripe.Response<Stripe.Customer>>({
      id,
      object: "customer",
    });
  }

  function createCustomerSearchResult(
    customers: Stripe.Customer[]
  ): Stripe.Response<Stripe.ApiList<Stripe.Customer>> {
    return createMock<Stripe.Response<Stripe.ApiList<Stripe.Customer>>>({
      object: "list",
      data: customers,
      has_more: false,
      url: "/v1/customers",
    });
  }
});
