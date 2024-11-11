import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as constants from "@calcom/lib/constants";

import { TeamBillingRepository } from "./team-billing.repository";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: vi.fn(),
    IS_PRODUCTION: false,
  };
});

describe("TeamBillingRepository", () => {
  const mockTeam = { id: 1, metadata: null, isOrganization: true, parentId: null };
  const mockTeams = [mockTeam, { id: 2, metadata: null, isOrganization: false, parentId: 1 }];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("find", () => {
    it("should return stubTeam when team billing is disabled", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = false;

      const tbr = new TeamBillingRepository();
      const result = await tbr.find(1);
      expect(result).toEqual({ id: -1, metadata: expect.any(Object), isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findUniqueOrThrow when team billing is enabled", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const tbr = new TeamBillingRepository();
      const result = await tbr.find(1);
      expect(result).toEqual(mockTeam);
    });
  });

  describe("findBySubscriptionId", () => {
    it("should return stubTeam when team billing is disabled", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = false;

      const tbr = new TeamBillingRepository();
      const result = await tbr.findBySubscriptionId("sub_123");
      expect(result).toEqual({ id: -1, metadata: {}, isOrganization: true, parentId: -1 });
    });

    it("should call prisma.team.findFirstOrThrow when team billing is enabled", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findFirstOrThrow.mockResolvedValue({
        id: 1,
        metadata: { subscriptionId: "sub_123" },
        isOrganization: true,
        parentId: null,
      });

      const tbr = new TeamBillingRepository();
      await tbr.findBySubscriptionId("sub_123");
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
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = false;
      const tbr = new TeamBillingRepository();
      const result = await tbr.findMany([1, 2]);
      expect(result).toEqual([]);
    });

    it("should call prisma.team.findMany when IS_TEAM_BILLING_ENABLED is true", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findMany.mockResolvedValue([mockTeam]);

      const tbr = new TeamBillingRepository();
      await tbr.findMany([1, 2]);
      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, metadata: true, isOrganization: true, parentId: true },
      });
    });
  });
});
