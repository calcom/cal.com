import { describe, it, expect, vi, beforeEach } from "vitest";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { TeamBilling } from "./index";
import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";

vi.mock("@calcom/lib/constants", () => ({
  IS_TEAM_BILLING_ENABLED: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findUniqueOrThrow: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("TeamBilling", () => {
  const mockTeam = { id: 1, metadata: {}, isOrganization: true, parentId: null };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("init", () => {
    it("should return InternalTeamBilling when IS_TEAM_BILLING_ENABLED is true", () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      const result = TeamBilling.init(mockTeam);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });

    it("should return StubTeamBilling when IS_TEAM_BILLING_ENABLED is false", () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(false);
      const result = TeamBilling.init(mockTeam);
      expect(result).toBeInstanceOf(StubTeamBilling);
    });
  });

  describe("initMany", () => {
    it("should initialize multiple team billings", () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      const teams = [mockTeam, { ...mockTeam, id: 2 }];
      const result = TeamBilling.initMany(teams);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(InternalTeamBilling);
      expect(result[1]).toBeInstanceOf(InternalTeamBilling);
    });
  });

  describe("find", () => {
    it("should return stubTeam when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(false);
      const result = await TeamBilling.find(1);
      expect(result).toEqual({ id: -1, metadata: {}, isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findUniqueOrThrow when IS_TEAM_BILLING_ENABLED is true", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue(mockTeam);
      await TeamBilling.find(1);
      expect(prisma.team.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, metadata: true, isOrganization: true, parentId: true },
      });
    });
  });

  describe("findBySubscriptionId", () => {
    it("should return stubTeam when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(false);
      const result = await TeamBilling.findBySubscriptionId("sub_123");
      expect(result).toEqual({ id: -1, metadata: {}, isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findFirstOrThrow when IS_TEAM_BILLING_ENABLED is true", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      vi.mocked(prisma.team.findFirstOrThrow).mockResolvedValue(mockTeam);
      await TeamBilling.findBySubscriptionId("sub_123");
      expect(prisma.team.findFirstOrThrow).toHaveBeenCalledWith({
        where: {
          metadata: {
            path: ["subscriptionId"],
            equals: "sub_123",
          },
        },
        select: { id: true, metadata: true, isOrganization: true, parentId: true },
      });
    });
  });

  describe("findMany", () => {
    it("should return an empty array when IS_TEAM_BILLING_ENABLED is false", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(false);
      const result = await TeamBilling.findMany([1, 2]);
      expect(result).toEqual([]);
    });

    it("should call prisma.team.findMany when IS_TEAM_BILLING_ENABLED is true", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      vi.mocked(prisma.team.findMany).mockResolvedValue([mockTeam]);
      await TeamBilling.findMany([1, 2]);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, metadata: true, isOrganization: true, parentId: true },
      });
    });
  });

  describe("findAndInit", () => {
    it("should find and initialize a single team billing", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      vi.mocked(prisma.team.findUniqueOrThrow).mockResolvedValue(mockTeam);
      const result = await TeamBilling.findAndInit(1);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      vi.mocked(IS_TEAM_BILLING_ENABLED).mockReturnValue(true);
      vi.mocked(prisma.team.findMany).mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);
      const result = await TeamBilling.findAndInitMany([1, 2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(InternalTeamBilling);
      expect(result[1]).toBeInstanceOf(InternalTeamBilling);
    });
  });
});
