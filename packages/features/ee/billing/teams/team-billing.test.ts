import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as constants from "@calcom/lib/constants";

import { TeamBilling } from "./index";
import { InternalTeamBilling } from "./internal-team-billing";
import { StubTeamBilling } from "./stub-team-billing";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: vi.fn(),
    IS_PRODUCTION: false,
  };
});

describe("TeamBilling", () => {
  const mockTeam = { id: 1, metadata: null, isOrganization: true, parentId: null };
  const mockTeams = [mockTeam, { id: 2, metadata: null, isOrganization: false, parentId: 1 }];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("init", () => {
    it("should return InternalTeamBilling when team billing is enabled", () => {
      constants.IS_TEAM_BILLING_ENABLED = true;
      const result = TeamBilling.init(mockTeam);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });

    it("should return StubTeamBilling when team billing is disabled", () => {
      constants.IS_TEAM_BILLING_ENABLED = false;

      const result = TeamBilling.init(mockTeam);
      expect(result).toBeInstanceOf(StubTeamBilling);
    });
  });

  describe("initMany", () => {
    it("should initialize multiple team billings", () => {
      const result = TeamBilling.initMany(mockTeams);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(StubTeamBilling);
      expect(result[1]).toBeInstanceOf(StubTeamBilling);
    });
  });

  describe("find", () => {
    it("should return stubTeam when team billing is disabled", async () => {
      constants.IS_TEAM_BILLING_ENABLED = false;

      const result = await TeamBilling.find(1);
      expect(result).toEqual({ id: -1, metadata: expect.any(Object), isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findUniqueOrThrow when team billing is enabled", async () => {
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const result = await TeamBilling.find(1);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("findBySubscriptionId", () => {
    it("should return stubTeam when team billing is disabled", async () => {
      constants.IS_TEAM_BILLING_ENABLED = false;

      const result = await TeamBilling.findBySubscriptionId("sub_123");
      expect(result).toEqual({ id: -1, metadata: {}, isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findFirstOrThrow when team billing is enabled", async () => {
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findFirstOrThrow.mockResolvedValue({
        id: 1,
        metadata: { subscriptionId: "sub_123" },
        isOrganization: true,
        parentId: null,
      });

      await TeamBilling.findBySubscriptionId("sub_123");
      expect(prismaMock.team.findFirstOrThrow).toHaveBeenCalledWith({
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
      constants.IS_TEAM_BILLING_ENABLED = false;
      const result = await TeamBilling.findMany([1, 2]);
      expect(result).toEqual([]);
    });

    it("should call prisma.team.findMany when IS_TEAM_BILLING_ENABLED is true", async () => {
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findMany.mockResolvedValue([mockTeam]);

      await TeamBilling.findMany([1, 2]);
      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, metadata: true, isOrganization: true, parentId: true },
      });
    });
  });

  describe("findAndInit", () => {
    it("should find and initialize a single team billing", async () => {
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const result = await TeamBilling.findAndInit(1);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findMany.mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);

      const result = await TeamBilling.findAndInitMany([1, 2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(InternalTeamBilling);
      expect(result[1]).toBeInstanceOf(InternalTeamBilling);
    });
  });
});
