import { describe, test, expect, vi, beforeEach } from "vitest";

import type { VerificationToken } from "@calcom/prisma/client";

import { VerificationTokenRepository } from "../verificationToken";

vi.mock("@calcom/prisma", () => ({
  default: {
    verificationToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const prismaMock = vi.hoisted(() => ({
  verificationToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));

describe("VerificationTokenRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    test("should create a verification token", async () => {
      const identifier = "test@example.com";
      const token = "hashed-token-value";
      const expires = new Date(Date.now() + 86400 * 1000);

      const mockVerificationToken: VerificationToken = {
        identifier,
        token,
        expires,
      };

      prismaMock.verificationToken.create.mockResolvedValue(mockVerificationToken);

      const result = await VerificationTokenRepository.create({
        identifier,
        token,
        expires,
      });

      expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier,
          token,
          expires,
        },
      });
      expect(result).toEqual(mockVerificationToken);
    });

    test("should create a verification token with correct data types", async () => {
      const identifier = "user@example.com";
      const token = "sha256-hashed-token";
      const expires = new Date("2025-12-31T23:59:59.000Z");

      const mockVerificationToken: VerificationToken = {
        identifier,
        token,
        expires,
      };

      prismaMock.verificationToken.create.mockResolvedValue(mockVerificationToken);

      await VerificationTokenRepository.create({
        identifier,
        token,
        expires,
      });

      expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier,
          token,
          expires,
        },
      });
    });
  });

  describe("updateTeamInviteTokenExpirationDate", () => {
    test("should update team invite token expiration date", async () => {
      const email = "team@example.com";
      const teamId = 123;
      const expiresInDays = 7;

      const existingToken: VerificationToken = {
        identifier: email,
        token: "existing-token",
        expires: new Date(),
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(existingToken);
      prismaMock.verificationToken.update.mockResolvedValue({
        ...existingToken,
        expires: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      });

      const result = await VerificationTokenRepository.updateTeamInviteTokenExpirationDate({
        email,
        teamId,
        expiresInDays,
      });

      expect(prismaMock.verificationToken.findFirst).toHaveBeenCalledWith({
        where: {
          identifier: email,
          teamId,
        },
      });

      expect(prismaMock.verificationToken.update).toHaveBeenCalledWith({
        where: {
          identifier: email,
          teamId,
          token: existingToken.token,
        },
        data: { expires: expect.any(Date) },
      });

      expect(result.token).toBe(existingToken.token);
      expect(result.expires).toBeInstanceOf(Date);
    });

    test("should calculate correct expiration date", async () => {
      const email = "team@example.com";
      const teamId = 456;
      const expiresInDays = 3;

      const existingToken: VerificationToken = {
        identifier: email,
        token: "token-123",
        expires: new Date(),
      };

      prismaMock.verificationToken.findFirst.mockResolvedValue(existingToken);

      const expectedExpires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      prismaMock.verificationToken.update.mockImplementation(({ data }) => {
        expect(data.expires.getTime()).toBeCloseTo(expectedExpires.getTime(), -2);
        return Promise.resolve({ ...existingToken, expires: data.expires });
      });

      await VerificationTokenRepository.updateTeamInviteTokenExpirationDate({
        email,
        teamId,
        expiresInDays,
      });
    });
  });
});
