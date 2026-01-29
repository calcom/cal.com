import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcSessionUser } from "../../../types";
import sendPasswordResetHandler from "./sendPasswordReset.handler";

const { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository } = vi.hoisted(() => {
  const mockFindUniqueByUserIdAndTeamId = vi.fn();

  class MockMembershipRepository {
    findUniqueByUserIdAndTeamId = mockFindUniqueByUserIdAndTeamId;
  }

  return { mockFindUniqueByUserIdAndTeamId, MockMembershipRepository };
});

const { mockFindForPasswordReset, MockUserRepository } = vi.hoisted(() => {
  const mockFindForPasswordReset = vi.fn();

  class MockUserRepository {
    findForPasswordReset = mockFindForPasswordReset;
  }

  return { mockFindForPasswordReset, MockUserRepository };
});

const { mockPasswordResetRequest } = vi.hoisted(() => {
  const mockPasswordResetRequest = vi.fn();
  return { mockPasswordResetRequest };
});

vi.mock("@calcom/features/membership/repositories/MembershipRepository", () => ({
  MembershipRepository: MockMembershipRepository,
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: MockUserRepository,
}));

vi.mock("@calcom/features/auth/lib/passwordResetRequest", () => ({
  passwordResetRequest: mockPasswordResetRequest,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

describe("sendPasswordResetHandler", () => {
  const mockUser: NonNullable<TrpcSessionUser> = {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
  } as NonNullable<TrpcSessionUser>;

  const organizationId = 100;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("self-reset prevention", () => {
    it("should throw BAD_REQUEST when user tries to reset their own password", async () => {
      await expect(
        sendPasswordResetHandler({
          ctx: { user: mockUser, organizationId },
          input: { userId: mockUser.id },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "You cannot reset your own password through this endpoint.",
      });

      expect(mockFindUniqueByUserIdAndTeamId).not.toHaveBeenCalled();
    });
  });

  describe("membership validation", () => {
    it("should throw NOT_FOUND when target user is not a member of the organization", async () => {
      mockFindUniqueByUserIdAndTeamId.mockResolvedValue(null);

      await expect(
        sendPasswordResetHandler({
          ctx: { user: mockUser, organizationId },
          input: { userId: 2 },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "User is not a member of this organization.",
      });

      expect(mockFindUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        userId: 2,
        teamId: organizationId,
      });
      expect(mockFindForPasswordReset).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN when target user is an organization OWNER", async () => {
      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        userId: 2,
        teamId: organizationId,
        role: MembershipRole.OWNER,
      });

      await expect(
        sendPasswordResetHandler({
          ctx: { user: mockUser, organizationId },
          input: { userId: 2 },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reset password for an organization owner.",
      });

      expect(mockFindForPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe("user validation", () => {
    it("should throw NOT_FOUND when user does not exist", async () => {
      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        userId: 2,
        teamId: organizationId,
        role: MembershipRole.MEMBER,
      });
      mockFindForPasswordReset.mockResolvedValue(null);

      await expect(
        sendPasswordResetHandler({
          ctx: { user: mockUser, organizationId },
          input: { userId: 2 },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "User not found.",
      });

      expect(mockFindForPasswordReset).toHaveBeenCalledWith({ id: 2 });
      expect(mockPasswordResetRequest).not.toHaveBeenCalled();
    });
  });

  describe("successful password reset", () => {
    it("should send password reset for a MEMBER", async () => {
      const targetUser = { id: 2, email: "member@example.com", name: "Member User" };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        userId: 2,
        teamId: organizationId,
        role: MembershipRole.MEMBER,
      });
      mockFindForPasswordReset.mockResolvedValue(targetUser);
      mockPasswordResetRequest.mockResolvedValue(undefined);

      const result = await sendPasswordResetHandler({
        ctx: { user: mockUser, organizationId },
        input: { userId: 2 },
      });

      expect(result).toEqual({ success: true });
      expect(mockPasswordResetRequest).toHaveBeenCalledWith(targetUser);
    });

    it("should send password reset for an ADMIN", async () => {
      const targetUser = { id: 3, email: "admin2@example.com", name: "Admin User 2" };

      mockFindUniqueByUserIdAndTeamId.mockResolvedValue({
        userId: 3,
        teamId: organizationId,
        role: MembershipRole.ADMIN,
      });
      mockFindForPasswordReset.mockResolvedValue(targetUser);
      mockPasswordResetRequest.mockResolvedValue(undefined);

      const result = await sendPasswordResetHandler({
        ctx: { user: mockUser, organizationId },
        input: { userId: 3 },
      });

      expect(result).toEqual({ success: true });
      expect(mockPasswordResetRequest).toHaveBeenCalledWith(targetUser);
    });
  });
});
