import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import type { Team } from "@prisma/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { TeamRepository } from "./team";

describe("TeamRepository", () => {
  let teamRepository: TeamRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    teamRepository = new TeamRepository(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should return null if team is not found", async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      const result = await teamRepository.findById({ id: 1 });
      expect(result).toBeNull();
    });

    it("should return parsed team if found", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        slug: "test-team",
        logoUrl: "test-logo-url",
        parentId: 1,
        metadata: {
          requestedSlug: null,
        },
        isOrganization: true,
        organizationSettings: {},
        isPlatform: true,
        requestedSlug: null,
      };
      prismaMock.team.findUnique.mockResolvedValue(mockTeam as unknown as Team);
      const result = await teamRepository.findById({ id: 1 });
      expect(result).toEqual(mockTeam);
    });
  });

  describe("deleteById", () => {
    it("should delete team and related data", async () => {
      const mockDeletedTeam = { id: 1, name: "Deleted Team" };
      const deleteManyEventTypeMock = vi.fn();
      const deleteManyMembershipMock = vi.fn();
      const deleteTeamMock = vi.fn().mockResolvedValue(mockDeletedTeam as unknown as Team);
      prismaMock.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...prismaMock,
          eventType: {
            ...prismaMock.eventType,
            deleteMany: deleteManyEventTypeMock,
          },
          membership: {
            ...prismaMock.membership,
            deleteMany: deleteManyMembershipMock,
          },
          team: {
            ...prismaMock.team,
            delete: deleteTeamMock,
          },
        };
        return callback(mockTx);
      });

      const result = await teamRepository.deleteById({ id: 1 });

      expect(deleteManyEventTypeMock).toHaveBeenCalledWith({
        where: {
          teamId: 1,
          schedulingType: "MANAGED",
        },
      });
      expect(deleteManyMembershipMock).toHaveBeenCalledWith({
        where: {
          teamId: 1,
        },
      });
      expect(deleteTeamMock).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(result).toEqual(mockDeletedTeam);
    });
  });

  describe("findAllByParentId", () => {
    it("should return all teams with given parentId", async () => {
      const mockTeams = [{ id: 1 }, { id: 2 }];
      prismaMock.team.findMany.mockResolvedValue(mockTeams as unknown as Team[]);
      const result = await teamRepository.findAllByParentId({ parentId: 1 });
      expect(prismaMock.team.findMany).toHaveBeenCalledWith({
        where: { parentId: 1 },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          parentId: true,
          metadata: true,
          isOrganization: true,
          organizationSettings: true,
          isPlatform: true,
        },
      });
      expect(result).toEqual(mockTeams);
    });
  });

  describe("findTeamWithMembers", () => {
    it("should return team with its members", async () => {
      const mockTeam = { id: 1, members: [] };
      prismaMock.team.findUnique.mockResolvedValue(mockTeam as unknown as Team & { members: [] });
      const result = await teamRepository.findTeamWithMembers(1);
      expect(prismaMock.team.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          members: {
            select: {
              accepted: true,
            },
          },
          id: true,
          metadata: true,
          parentId: true,
          isOrganization: true,
        },
      });
      expect(result).toEqual(mockTeam);
    });
  });
});
