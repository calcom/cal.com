import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AccessCodeRepository } from "../repositories/AccessCodeRepository";
import type { OAuthClientRepository } from "../repositories/OAuthClientRepository";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { OAuthClientStatus } from "@calcom/prisma/enums";
import { OAuthService } from "./OAuthService";

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}));

function createMockAccessCodeRepository() {
  return {
    create: vi.fn(),
    findValidCode: vi.fn(),
    deleteExpiredAndUsedCodes: vi.fn(),
    consumeCode: vi.fn(),
  } as unknown as AccessCodeRepository;
}

function createMockOAuthClientRepository() {
  return {
    findByClientId: vi.fn(),
    findByClientIdWithSecret: vi.fn(),
  } as unknown as OAuthClientRepository;
}

function createMockTeamRepository() {
  return {} as unknown as TeamRepository;
}

// Use a PUBLIC client type so that client secret validation is skipped,
// allowing us to focus on testing the atomic code consumption behavior.
const MOCK_PUBLIC_CLIENT = {
  clientId: "test-client",
  clientType: "PUBLIC",
  redirectUri: "https://example.com/callback",
  clientSecret: null,
  status: OAuthClientStatus.APPROVED,
  userId: null,
};

describe("OAuthService.exchangeCodeForTokens", () => {
  let service: OAuthService;
  let accessCodeRepo: ReturnType<typeof createMockAccessCodeRepository>;
  let oAuthClientRepo: ReturnType<typeof createMockOAuthClientRepository>;

  beforeEach(() => {
    accessCodeRepo = createMockAccessCodeRepository();
    oAuthClientRepo = createMockOAuthClientRepository();
    service = new OAuthService({
      accessCodeRepository: accessCodeRepo as unknown as AccessCodeRepository,
      oAuthClientRepository: oAuthClientRepo as unknown as OAuthClientRepository,
      teamsRepository: createMockTeamRepository(),
    });
  });

  it("uses consumeCode for atomic code consumption instead of separate find+delete", async () => {
    (oAuthClientRepo.findByClientIdWithSecret as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_PUBLIC_CLIENT
    );

    (accessCodeRepo.consumeCode as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 1,
      teamId: null,
      scopes: ["BOOKING_READ"],
      codeChallenge: "test-challenge",
      codeChallengeMethod: "S256",
    });

    try {
      // Will throw due to PKCE validation or JWT secret not configured,
      // but we only need to verify that consumeCode was called atomically.
      await service.exchangeCodeForTokens("test-client", "test-code", undefined, undefined, "test-verifier");
    } catch {
      // Expected — PKCE or JWT errors are fine for this test
    }

    expect(accessCodeRepo.consumeCode).toHaveBeenCalledWith("test-code", "test-client");
    // The old non-atomic methods should NOT be called
    expect(accessCodeRepo.findValidCode).not.toHaveBeenCalled();
    expect(accessCodeRepo.deleteExpiredAndUsedCodes).not.toHaveBeenCalled();
  });

  it("throws invalid_grant when consumeCode returns null (code already consumed by concurrent request)", async () => {
    (oAuthClientRepo.findByClientIdWithSecret as ReturnType<typeof vi.fn>).mockResolvedValue(
      MOCK_PUBLIC_CLIENT
    );

    // Simulate the code already consumed by a concurrent request —
    // consumeCode returns null because the transaction found no matching row
    (accessCodeRepo.consumeCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.exchangeCodeForTokens("test-client", "test-code", undefined, undefined, "test-verifier")
    ).rejects.toThrow("invalid_grant");
  });
});
