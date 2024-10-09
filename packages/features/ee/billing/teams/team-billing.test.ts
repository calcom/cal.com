import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;
      const result = TeamBilling.init(mockTeam);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });

    it("should return StubTeamBilling when team billing is disabled", () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
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

  describe("findAndInit", () => {
    it("should find and initialize a single team billing", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findUniqueOrThrow.mockResolvedValue(mockTeam);

      const result = await TeamBilling.findAndInit(1);
      expect(result).toBeInstanceOf(InternalTeamBilling);
    });
  });

  describe("findAndInitMany", () => {
    it("should find and initialize multiple team billings", async () => {
      // @ts-expect-error - IS_TEAM_BILLING_ENABLED is not writable
      constants.IS_TEAM_BILLING_ENABLED = true;

      prismaMock.team.findMany.mockResolvedValue([mockTeam, { ...mockTeam, id: 2 }]);

      const result = await TeamBilling.findAndInitMany([1, 2]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(InternalTeamBilling);
      expect(result[1]).toBeInstanceOf(InternalTeamBilling);
    });
  });
});
