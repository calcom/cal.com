import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { OAUTH_ERROR_REASONS } from "@calcom/features/oauth/services/OAuthService";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { generateAuthCodeHandler } from "./generateAuthCode.handler";

const mockUser = { id: 1 } as unknown as NonNullable<TrpcSessionUser>;

const mockCtx: { user: NonNullable<TrpcSessionUser> } = {
  user: mockUser,
};

describe("generateAuthCodeHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUBLIC clients", () => {
    const mockPublicClient = {
      clientId: "public_client_123",
      redirectUri: "https://app.example.com/callback",
      name: "Test Public Client",
      clientType: "PUBLIC" as const,
      status: "APPROVED" as const,
    };

    it("should generate authorization code for PUBLIC client with valid PKCE", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);
      prismaMock.accessCode.create.mockResolvedValue({
        id: 1,
        code: "test_auth_code",
        clientId: "public_client_123",
        userId: 1,
        teamId: null,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const input = {
        clientId: "public_client_123",
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256" as const,
        scopes: [],
        redirectUri: "https://app.example.com/callback",
      };

      const result = await generateAuthCodeHandler({ ctx: mockCtx, input });

      expect(result.client).toEqual(mockPublicClient);
      expect(result.authorizationCode).toBeDefined();
      expect(prismaMock.accessCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: "public_client_123",
          userId: 1,
          teamId: undefined,
          scopes: [],
          codeChallenge: "test_challenge",
          codeChallengeMethod: "S256",
        }),
      });
    });

    it("should reject PUBLIC client without code_challenge", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);

      const input = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: "S256" as const,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.pkce_required,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should reject PUBLIC client without code_challenge_method", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);

      const input = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should reject PUBLIC client with invalid code_challenge_method", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);

      // Test with MD5 (invalid method)
      const inputMD5 = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "MD5",
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputMD5 })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );

      // Test with plain (should be rejected)
      const inputPlain = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "plain",
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputPlain })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });
  });

  describe("CONFIDENTIAL clients", () => {
    const mockConfidentialClient = {
      clientId: "confidential_client_456",
      redirectUri: "https://app.example.com/callback",
      name: "Test Confidential Client",
      clientType: "CONFIDENTIAL" as const,
      isTrusted: undefined,
      logo: undefined,
      status: "APPROVED" as const,
    };

    it("should generate authorization code for CONFIDENTIAL client without PKCE", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockConfidentialClient);
      prismaMock.accessCode.create.mockResolvedValue({
        id: 1,
        code: "test_auth_code",
        clientId: "confidential_client_456",
        userId: 1,
        teamId: null,
        scopes: [],
        codeChallenge: null,
        codeChallengeMethod: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const input = {
        clientId: "confidential_client_456",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      const result = await generateAuthCodeHandler({ ctx: mockCtx, input });

      expect(result.client).toEqual(mockConfidentialClient);
      expect(result.authorizationCode).toBeDefined();
      expect(prismaMock.accessCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: "confidential_client_456",
          userId: 1,
          teamId: undefined,
          scopes: [],
          codeChallenge: undefined,
          codeChallengeMethod: undefined,
        }),
      });
    });

    it("should accept CONFIDENTIAL client with valid PKCE for enhanced security", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockConfidentialClient);
      prismaMock.accessCode.create.mockResolvedValue({
        id: 1,
        code: "test_auth_code",
        clientId: "confidential_client_456",
        userId: 1,
        teamId: null,
        scopes: [],
        expiresAt: new Date(),
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256",
      });

      const input = {
        clientId: "confidential_client_456",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256" as const,
        redirectUri: "https://app.example.com/callback",
        state: "1234",
      };

      const result = await generateAuthCodeHandler({ ctx: mockCtx, input });

      expect(result.authorizationCode).toBeDefined();
      expect(result.redirectUrl).toEqual(
        `https://app.example.com/callback?code=${result.authorizationCode}&state=1234`
      );
      expect(prismaMock.accessCode.create).toHaveBeenCalledWith({
        data: {
          code: expect.any(String),
          clientId: "confidential_client_456",
          userId: 1,
          teamId: undefined,
          scopes: [],
          expiresAt: expect.any(Date),
          codeChallenge: "test_challenge",
          codeChallengeMethod: "S256",
        },
      });
    });

    it("should reject CONFIDENTIAL client with code_challenge but missing method", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockConfidentialClient);

      const input = {
        clientId: "confidential_client_456",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });
  });

  describe("Client validation", () => {
    it("should reject invalid client ID", async () => {
      prismaMock.oAuthClient.findFirst.mockResolvedValue(null);

      const input = {
        clientId: "invalid_client",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: OAUTH_ERROR_REASONS.client_not_found,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should accept only supported PKCE methods", async () => {
      const mockPublicClient = {
        clientId: "public_client_123",
        redirectUri: "https://app.example.com/callback",
        name: "Test Public Client",
        clientType: "PUBLIC" as const,
        status: "APPROVED" as const,
      };

      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);
      prismaMock.accessCode.create.mockResolvedValue({
        id: 1,
        code: "test_auth_code",
        clientId: "public_client_123",
        userId: 1,
        teamId: null,
        scopes: [],
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Test S256
      const inputS256 = {
        clientId: "public_client_123",
        redirectUri: "https://app.example.com/callback",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256" as const,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputS256 })).resolves.toBeDefined();

      // Reset mocks for next test
      vi.clearAllMocks();
      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPublicClient);

      // Test invalid method
      const inputInvalid = {
        clientId: "public_client_123",
        redirectUri: "https://app.example.com/callback",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "SHA1",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputInvalid })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );

      // Test plain method (should be rejected)
      const inputPlain = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "plain",
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputPlain })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: OAUTH_ERROR_REASONS.invalid_code_challenge_method,
        })
      );
    });

    it("should reject PENDING client", async () => {
      const mockPendingClient = {
        clientId: "pending_client_123",
        redirectUri: "https://app.example.com/callback",
        name: "Test Pending Client",
        clientType: "CONFIDENTIAL" as const,
        status: "PENDING" as const,
      };

      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockPendingClient);

      const input = {
        clientId: "pending_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: OAUTH_ERROR_REASONS.client_not_approved,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should reject REJECTED client", async () => {
      const mockRejectedClient = {
        clientId: "rejected_client_123",
        redirectUri: "https://app.example.com/callback",
        name: "Test Rejected Client",
        clientType: "CONFIDENTIAL" as const,
        status: "REJECTED" as const,
      };

      prismaMock.oAuthClient.findFirst.mockResolvedValue(mockRejectedClient);

      const input = {
        clientId: "rejected_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
        redirectUri: "https://app.example.com/callback",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: OAUTH_ERROR_REASONS.client_not_approved,
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });
  });
});
