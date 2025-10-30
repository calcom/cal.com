import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as constants from "@calcom/lib/constants";

import { StubTeamBillingService } from "./stubTeamBillingService";
import { TeamBillingService } from "./teamBillingService";
import { TeamBillingServiceFactory } from "./teamBillingServiceFactory";

vi.mock("@calcom/lib/constants", async () => {
  const actual = await vi.importActual("@calcom/lib/constants");
  return {
    ...actual,
    IS_TEAM_BILLING_ENABLED: vi.fn(),
    IS_PRODUCTION: false,
  };
});

describe("TeamBilling", () => {
  const mockTeam = { id: 1, metadata: null, isOrganization: true, parentId: null, name: "" };
  const mockTeams = [mockTeam, { id: 2, metadata: null, isOrganization: false, parentId: 1, name: "" }];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("init", () => {
    it("should return TeamBillingService when team billing is enabled", () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;
      const result = TeamBillingServiceFactory.init(mockTeam);
      expect(result).toBeInstanceOf(TeamBillingService);
    });

    it("should return StubTeamBillingService when team billing is disabled", () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = false;

      const result = TeamBillingServiceFactory.init(mockTeam);
      expect(result).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("initMany", () => {
    it("should initialize multiple TeamBillingServices", () => {
      const result = TeamBillingServiceFactory.initMany(mockTeams);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(StubTeamBillingService);
      expect(result[1]).toBeInstanceOf(StubTeamBillingService);
    });
  });

  describe("findAndInit", () => {
    it("should find and initialize a single TeamBillingService", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const result = await TeamBillingServiceFactory.findAndInit(1);
      expect(result).toBeInstanceOf(TeamBillingService);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findMany.mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);

      const result = await TeamBillingServiceFactory.findAndInitMany([1, 2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TeamBillingService);
      expect(result[1]).toBeInstanceOf(TeamBillingService);
    });
  });
});
