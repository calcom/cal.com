import { BadRequestException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import Stripe from "stripe";

import { OAuthCallbackState, StripeService } from "./stripe.service";

const mockOAuthToken = jest.fn();
const mockAccountsRetrieve = jest.fn();

const mockFindAllCredentialsByTypeAndUserId = jest.fn().mockResolvedValue([]);
const mockDeleteAppCredentials = jest.fn();
const mockCreateAppCredential = jest.fn();

jest.mock("@/modules/credentials/credentials.repository", () => {
  return {
    CredentialsRepository: jest.fn().mockImplementation(() => ({
      findAllCredentialsByTypeAndUserId: mockFindAllCredentialsByTypeAndUserId,
      findCredentialByTypeAndUserId: jest.fn(),
    })),
  };
});

jest.mock("@/modules/users/users.repository", () => {
  return {
    UsersRepository: jest.fn().mockImplementation(() => ({})),
    UserWithProfile: {},
  };
});

jest.mock("@/modules/memberships/memberships.repository", () => {
  return {
    MembershipsRepository: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock("@/modules/apps/apps.repository", () => {
  return {
    AppsRepository: jest.fn().mockImplementation(() => ({
      getAppBySlug: jest.fn(),
      deleteAppCredentials: mockDeleteAppCredentials,
      createAppCredential: mockCreateAppCredential,
    })),
  };
});

jest.mock("@/modules/stripe/utils/newStripeInstance", () => ({
  stripeInstance: {
    oauth: { token: (...args: unknown[]) => mockOAuthToken(...args) },
    accounts: { retrieve: (...args: unknown[]) => mockAccountsRetrieve(...args) },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CredentialsRepository } = require("@/modules/credentials/credentials.repository");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppsRepository } = require("@/modules/apps/apps.repository");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MembershipsRepository } = require("@/modules/memberships/memberships.repository");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { UsersRepository } = require("@/modules/users/users.repository");

describe("StripeService", () => {
  let service: StripeService;

  const mockState: OAuthCallbackState = {
    accessToken: "test-token",
    returnTo: "/settings",
  };

  const mockConfigGet = jest.fn((key: string) => {
    const config: Record<string, string> = {
      "stripe.apiKey": "sk_test_fake",
      "api.url": "https://api.test.com",
      "app.baseUrl": "https://app.test.com",
      "env.type": "test",
      "stripe.teamMonthlyPriceId": "price_test",
    };
    return config[key] ?? "";
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: { get: mockConfigGet } },
        { provide: AppsRepository, useValue: { getAppBySlug: jest.fn(), deleteAppCredentials: mockDeleteAppCredentials, createAppCredential: mockCreateAppCredential } },
        { provide: CredentialsRepository, useValue: { findAllCredentialsByTypeAndUserId: mockFindAllCredentialsByTypeAndUserId } },
        { provide: MembershipsRepository, useValue: {} },
        { provide: UsersRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);

    jest.clearAllMocks();
    mockFindAllCredentialsByTypeAndUserId.mockResolvedValue([]);
  });

  describe("saveStripeAccount", () => {
    it("throws UnauthorizedException when userId is falsy", async () => {
      await expect(service.saveStripeAccount(mockState, "code_123", 0)).rejects.toThrow(UnauthorizedException);
    });

    it("succeeds with valid OAuth code and no stripe_user_id", async () => {
      mockOAuthToken.mockResolvedValue({ access_token: "tok_123" });

      const result = await service.saveStripeAccount(mockState, "code_123", 1);

      expect(mockOAuthToken).toHaveBeenCalledWith({
        grant_type: "authorization_code",
        code: "code_123",
      });
      expect(result).toEqual({ url: "/settings" });
    });

    it("retrieves account details when stripe_user_id is present", async () => {
      mockOAuthToken.mockResolvedValue({ access_token: "tok_123", stripe_user_id: "acct_123" });
      mockAccountsRetrieve.mockResolvedValue({ default_currency: "usd" });

      const result = await service.saveStripeAccount(mockState, "code_123", 1);

      expect(mockAccountsRetrieve).toHaveBeenCalledWith("acct_123");
      expect(result).toEqual({ url: "/settings" });
    });

    it("throws BadRequestException on StripeInvalidGrantError (expired/invalid code)", async () => {
      mockOAuthToken.mockRejectedValue(
        new Stripe.errors.StripeInvalidGrantError({
          message: "Authorization code has been revoked",
          type: "invalid_grant",
        })
      );

      await expect(service.saveStripeAccount(mockState, "expired_code", 1)).rejects.toThrow(BadRequestException);
      await expect(service.saveStripeAccount(mockState, "expired_code", 1)).rejects.toThrow(
        "Invalid or expired Stripe authorization code"
      );
    });

    it("throws InternalServerErrorException on unexpected Stripe OAuth error", async () => {
      mockOAuthToken.mockRejectedValue(new Error("network timeout"));

      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(
        "Failed to exchange Stripe authorization code"
      );
    });

    it("throws BadRequestException on StripeInvalidRequestError (deleted account)", async () => {
      mockOAuthToken.mockResolvedValue({ access_token: "tok_123", stripe_user_id: "acct_deleted" });
      mockAccountsRetrieve.mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          message: "No such account",
          type: "invalid_request_error",
        })
      );

      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(BadRequestException);
      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(
        "Stripe account could not be found"
      );
    });

    it("throws InternalServerErrorException on unexpected Stripe account retrieval error", async () => {
      mockOAuthToken.mockResolvedValue({ access_token: "tok_123", stripe_user_id: "acct_123" });
      mockAccountsRetrieve.mockRejectedValue(new Error("connection reset"));

      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.saveStripeAccount(mockState, "code_123", 1)).rejects.toThrow(
        "Failed to retrieve Stripe account details"
      );
    });

    it("deletes existing credentials before creating new ones", async () => {
      mockOAuthToken.mockResolvedValue({ access_token: "tok_123" });
      mockFindAllCredentialsByTypeAndUserId.mockResolvedValue([{ id: 10 }, { id: 20 }]);

      await service.saveStripeAccount(mockState, "code_123", 1);

      expect(mockDeleteAppCredentials).toHaveBeenCalledWith([10, 20], 1);
      expect(mockCreateAppCredential).toHaveBeenCalledWith(
        "stripe_payment",
        expect.any(Object),
        1,
        "stripe"
      );
    });
  });
});
