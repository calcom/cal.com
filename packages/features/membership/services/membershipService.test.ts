import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaMembershipRepository } from "../repositories/PrismaMembershipRepository";
import { MembershipService } from "./MembershipService";

const mockMembershipRepository = {
  findUniqueByUserIdAndTeamId: vi.fn(),
} as unknown as PrismaMembershipRepository;

const service = new MembershipService(mockMembershipRepository);

describe("MembershipService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkMembership", () => {
    it("should return all false when membership is not found", async () => {
      vi.mocked(mockMembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue(null);

      const result = await service.checkMembership(1, 100);

      expect(result).toEqual({
        isMember: false,
        isAdmin: false,
        isOwner: false,
        role: undefined,
      });
      expect(mockMembershipRepository.findUniqueByUserIdAndTeamId).toHaveBeenCalledWith({
        teamId: 1,
        userId: 100,
      });
    });

    it("should return all false when membership exists but is not accepted", async () => {
      vi.mocked(mockMembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        accepted: false,
        role: MembershipRole.MEMBER,
      } as Awaited<ReturnType<PrismaMembershipRepository["findUniqueByUserIdAndTeamId"]>>);

      const result = await service.checkMembership(1, 100);

      expect(result).toEqual({
        isMember: false,
        isAdmin: false,
        isOwner: false,
        role: undefined,
      });
    });

    it("should return isMember true for accepted MEMBER role", async () => {
      vi.mocked(mockMembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        accepted: true,
        role: MembershipRole.MEMBER,
      } as Awaited<ReturnType<PrismaMembershipRepository["findUniqueByUserIdAndTeamId"]>>);

      const result = await service.checkMembership(1, 100);

      expect(result).toEqual({
        isMember: true,
        isAdmin: false,
        isOwner: false,
        role: "MEMBER",
      });
    });

    it("should return isMember and isAdmin true for accepted ADMIN role", async () => {
      vi.mocked(mockMembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        accepted: true,
        role: MembershipRole.ADMIN,
      } as Awaited<ReturnType<PrismaMembershipRepository["findUniqueByUserIdAndTeamId"]>>);

      const result = await service.checkMembership(1, 100);

      expect(result).toEqual({
        isMember: true,
        isAdmin: true,
        isOwner: false,
        role: "ADMIN",
      });
    });

    it("should return isMember, isAdmin, and isOwner true for accepted OWNER role", async () => {
      vi.mocked(mockMembershipRepository.findUniqueByUserIdAndTeamId).mockResolvedValue({
        accepted: true,
        role: MembershipRole.OWNER,
      } as Awaited<ReturnType<PrismaMembershipRepository["findUniqueByUserIdAndTeamId"]>>);

      const result = await service.checkMembership(1, 100);

      expect(result).toEqual({
        isMember: true,
        isAdmin: true,
        isOwner: true,
        role: "OWNER",
      });
    });
  });
});
