import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

import { generateAuthCodeHandler } from "./generateAuthCode.handler";

const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
};

const mockCtx = {
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
    };

    it("should generate authorization code for PUBLIC client with valid PKCE", async () => {
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);
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
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);

      const input = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: "S256" as const,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge required for public clients",
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should reject PUBLIC client without code_challenge_method", async () => {
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);

      const input = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: undefined,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 for public clients",
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });

    it("should reject PUBLIC client with invalid code_challenge_method", async () => {
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);

      // Test with MD5 (invalid method)
      const inputMD5 = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "MD5",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputMD5 })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 for public clients",
        })
      );

      // Test with plain (should be rejected)
      const inputPlain = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "plain",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputPlain })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 for public clients",
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
    };

    it("should generate authorization code for CONFIDENTIAL client without PKCE", async () => {
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockConfidentialClient);
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
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockConfidentialClient);
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
      };

      const result = await generateAuthCodeHandler({ ctx: mockCtx, input });

      expect(result.authorizationCode).toBeDefined();
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
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockConfidentialClient);

      const input = {
        clientId: "confidential_client_456",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: undefined,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 when PKCE is used",
        })
      );

      expect(prismaMock.accessCode.create).not.toHaveBeenCalled();
    });
  });

  describe("Client validation", () => {
    it("should reject invalid client ID", async () => {
      prismaMock.oAuthClient.findUnique.mockResolvedValue(null);

      const input = {
        clientId: "invalid_client",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: undefined,
        codeChallengeMethod: undefined,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input })).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "Client ID not valid",
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
      };

      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);
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
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "S256" as const,
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputS256 })).resolves.toBeDefined();

      // Reset mocks for next test
      vi.clearAllMocks();
      prismaMock.oAuthClient.findUnique.mockResolvedValue(mockPublicClient);

      // Test invalid method
      const inputInvalid = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "SHA1",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputInvalid })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 for public clients",
        })
      );

      // Test plain method (should be rejected)
      const inputPlain = {
        clientId: "public_client_123",
        scopes: [],
        teamSlug: undefined,
        codeChallenge: "test_challenge",
        codeChallengeMethod: "plain",
      };

      await expect(generateAuthCodeHandler({ ctx: mockCtx, input: inputPlain })).rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "code_challenge_method must be S256 for public clients",
        })
      );
    });
  });
});
