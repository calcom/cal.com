import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TeamBilling } from "@calcom/features/ee/billing/teams";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { WorkflowService } from "@calcom/lib/server/service/workflows";

import { TeamService } from "./teamService";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/features/ee/billing/teams");
vi.mock("@calcom/lib/server/repository/team");
vi.mock("@calcom/lib/server/service/workflows");
vi.mock("@calcom/lib/domainManager/organization");
vi.mock("@calcom/features/ee/teams/lib/removeMember");
class Database {
  teams = new Map();
  domains = new Set();
  billings = new Map();
  workflowReminders = new Map();
  clear() {
    this.teams.clear();
    this.domains.clear();
    this.billings.clear();
    this.workflowReminders.clear();
  }
}
// In-memory database for testing
const database = new Database();

const mockTeamBilling = {
  cancel: vi.fn(),
  updateQuantity: vi.fn(),
  publish: vi.fn(),
  downgrade: vi.fn(),
};

// Mock implementations that modify the in-memory database
const mockTeamRepo = {
  deleteById: vi.fn().mockImplementation(async ({ id }) => {
    const team = database.teams.get(id);
    if (team) {
      database.teams.delete(id);
      return team;
    }
    throw new Error(`Team with id ${id} not found`);
  }),
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mocked(TeamRepository).mockImplementation(() => mockTeamRepo as any);

vi.mocked(deleteDomain).mockImplementation(async (slug) => {
  database.domains.delete(slug);
});

vi.mocked(WorkflowService.deleteWorkflowRemindersOfRemovedTeam).mockImplementation(async (teamId) => {
  database.workflowReminders.delete(teamId);
});

vi.mocked(TeamBilling.findAndInit).mockImplementation(async (teamId) => {
  // Create a team-specific billing mock
  const teamSpecificBilling = {
    ...mockTeamBilling,
    teamId,
    cancel: vi.fn().mockImplementation(() => {
      const billing = database.billings.get(teamId);
      if (billing) {
        billing.cancelled = true;
      }
    }),
  };
  return teamSpecificBilling;
});

describe("TeamService", () => {
  beforeEach(() => {
    database.clear();

    database.teams.set(1, {
      id: 1,
      name: "Deleted Team",
      isOrganization: true,
      slug: "deleted-team",
    });
    database.domains.add("deleted-team");
    database.billings.set(1, { teamId: 1, cancelled: false });
    database.workflowReminders.set(1, ["reminder1", "reminder2"]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("delete", () => {
    it("should delete team, cancel billing, and clean up", async () => {
      const result = await TeamService.delete({ id: 1 });

      // Verify the team was deleted from the database
      expect(database.teams.has(1)).toBe(false);

      // Verify the domain was deleted
      expect(database.domains.has("deleted-team")).toBe(false);

      // Verify billing was cancelled
      expect(database.billings.get(1)?.cancelled).toBe(true);

      // Verify workflow reminders were deleted
      expect(database.workflowReminders.has(1)).toBe(false);

      // Verify the returned team data
      expect(result).toEqual({
        id: 1,
        name: "Deleted Team",
        isOrganization: true,
        slug: "deleted-team",
      });
    });
  });
});
