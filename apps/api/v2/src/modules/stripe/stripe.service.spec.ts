jest.mock("@calcom/platform-libraries", () => ({
  CreationSource: { API: "API" },
  credentialForCalendarServiceSelect: { id: true, type: true, key: true },
}));

jest.mock("@calcom/platform-constants", () => ({
  APPS_TYPE_ID_MAPPING: { stripe_payment: "stripe" },
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    oauth: { authorizeUrl: jest.fn().mockReturnValue("https://connect.stripe.com/oauth/authorize?test=1") },
    checkout: { sessions: { create: jest.fn() } },
    customers: { create: jest.fn(), list: jest.fn().mockResolvedValue({ data: [] }) },
    subscriptions: { list: jest.fn().mockResolvedValue({ data: [] }) },
  }));
});

import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UsersRepository } from "@/modules/users/users.repository";

describe("StripeService", () => {
  let service: StripeService;
  let appsRepository: AppsRepository;
  let credentialsRepository: CredentialsRepository;
  let usersRepository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                "api.url": "http://localhost:5555",
                "app.baseUrl": "http://localhost:3000",
                "env.type": "development",
                "stripe.apiKey": "sk_test_fake",
                "stripe.teamMonthlyPriceId": "price_test_123",
              };
              return config[key] ?? null;
            }),
          },
        },
        {
          provide: AppsRepository,
          useValue: {
            getAppBySlug: jest.fn(),
            deleteAppCredentials: jest.fn(),
            createAppCredential: jest.fn(),
          },
        },
        {
          provide: CredentialsRepository,
          useValue: {
            findCredentialByTypeAndUserId: jest.fn(),
            findAllCredentialsByTypeAndUserId: jest.fn(),
          },
        },
        {
          provide: MembershipsRepository,
          useValue: {},
        },
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            updateByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    appsRepository = module.get<AppsRepository>(AppsRepository);
    credentialsRepository = module.get<CredentialsRepository>(CredentialsRepository);
    usersRepository = module.get<UsersRepository>(UsersRepository);

    jest.clearAllMocks();
  });

  describe("getStripeAppKeys", () => {
    it("should return client_id and client_secret when app exists", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: {
          client_id: "ca_test",
          client_secret: "sk_secret",
          public_key: "pk_test",
          webhook_secret: "whsec_test",
        },
      });

      const result = await service.getStripeAppKeys();

      expect(result).toEqual({
        client_id: "ca_test",
        client_secret: "sk_secret",
      });
      expect(appsRepository.getAppBySlug).toHaveBeenCalledWith("stripe");
    });

    it("should throw NotFoundException when app not found", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue(null);

      await expect(service.getStripeAppKeys()).rejects.toThrow();
    });

    it("should throw when client_id is missing", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: { client_secret: "sk_secret", public_key: "pk_test", webhook_secret: "whsec_test" },
      });

      await expect(service.getStripeAppKeys()).rejects.toThrow();
    });

    it("should throw when client_secret is missing", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: { client_id: "ca_test", public_key: "pk_test", webhook_secret: "whsec_test" },
      });

      await expect(service.getStripeAppKeys()).rejects.toThrow();
    });
  });

  describe("getStripeRedirectUrl", () => {
    it("should generate redirect URL with state and user info", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: {
          client_id: "ca_test_123",
          client_secret: "sk_secret",
          public_key: "pk_test",
          webhook_secret: "whsec_test",
        },
      });

      const state = { accessToken: "tok_123", returnTo: "/dashboard" };
      const url = await service.getStripeRedirectUrl(state, "user@test.com", "Test User");

      expect(url).toContain("https://connect.stripe.com/oauth/authorize");
      expect(url).toContain("ca_test_123");
      expect(url).toContain("read_write");
    });
  });

  describe("checkIfIndividualStripeAccountConnected", () => {
    it("should throw NotFoundException when no credentials found", async () => {
      (credentialsRepository.findCredentialByTypeAndUserId as jest.Mock).mockResolvedValue(null);

      await expect(service.checkIfIndividualStripeAccountConnected(1)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when credentials are invalid", async () => {
      (credentialsRepository.findCredentialByTypeAndUserId as jest.Mock).mockResolvedValue({
        id: 1,
        invalid: true,
        key: {},
      });

      await expect(service.checkIfIndividualStripeAccountConnected(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe("saveStripeAccount", () => {
    it("should throw UnauthorizedException when userId is 0", async () => {
      await expect(service.saveStripeAccount({ accessToken: "tok" }, "code_123", 0)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe("getStripeCustomerId", () => {
    it("should return stripeCustomerId from user metadata", async () => {
      const user = {
        email: "test@test.com",
        name: "Test",
        metadata: { stripeCustomerId: "cus_123" },
      };

      const result = await service.getStripeCustomerId(user);
      expect(result).toBe("cus_123");
    });

    it("should return null when metadata has no stripeCustomerId", async () => {
      const user = { email: "test@test.com", name: "Test", metadata: {} };
      const result = await service.getStripeCustomerId(user);
      expect(result).toBeNull();
    });

    it("should return null when metadata is null", async () => {
      const user = { email: "test@test.com", name: "Test", metadata: null };
      const result = await service.getStripeCustomerId(user);
      expect(result).toBeNull();
    });
  });

  describe("getStripeCustomerIdFromUserId", () => {
    it("should return null when user not found", async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.getStripeCustomerIdFromUserId(1);
      expect(result).toBeNull();
    });

    it("should return null when user has no email", async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue({ id: 1, email: null });

      const result = await service.getStripeCustomerIdFromUserId(1);
      expect(result).toBeNull();
    });

    it("should return existing stripeCustomerId from metadata", async () => {
      (usersRepository.findById as jest.Mock).mockResolvedValue({
        id: 1,
        email: "test@test.com",
        name: "Test",
        metadata: { stripeCustomerId: "cus_existing" },
      });

      const result = await service.getStripeCustomerIdFromUserId(1);
      expect(result).toBe("cus_existing");
    });
  });

  describe("getStripe", () => {
    it("should return the Stripe instance", () => {
      const stripe = service.getStripe();
      expect(stripe).toBeDefined();
    });
  });
});
