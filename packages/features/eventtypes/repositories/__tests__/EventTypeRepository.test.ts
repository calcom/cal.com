import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { readonlyPrisma } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  readonlyPrisma: {
    eventType: {
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
  },
}));

describe("EventTypeRepository", () => {
  let eventTypeRepository: EventTypeRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    eventTypeRepository = new EventTypeRepository(readonlyPrisma);
  });

  const mockUser = {
    id: 1,
    organizationId: 10,
    isOwnerAdminOfParentTeam: false,
  };

  const mockEventTypes = [
    {
      id: 1,
      slug: "personal-event",
      title: "Personal Event",
      teamId: null,
      userId: 1,
      team: null,
    },
    {
      id: 2,
      slug: "team-event",
      title: "Team Event",
      teamId: 5,
      userId: null,
      team: { name: "Team A" },
    },
  ];

  describe("getEventTypeList", () => {
    describe("Early return scenarios", () => {
      it("should return empty array when no teamId, userId, or isAll provided", async () => {
        const result = await eventTypeRepository.getEventTypeList({
          teamId: null,
          userId: null,
          isAll: false,
          user: mockUser,
        });

        expect(result).toEqual([]);
        expect(readonlyPrisma.eventType.findMany).not.toHaveBeenCalled();
      });
    });

    describe("Personal events filtering", () => {
      it("should return only user's personal events when userId provided", async () => {
        const personalEvents = [mockEventTypes[0]];
        vi.mocked(readonlyPrisma.eventType.findMany).mockResolvedValue(personalEvents);

        const result = await eventTypeRepository.getEventTypeList({
          teamId: null,
          userId: 1,
          isAll: false,
          user: mockUser,
        });

        expect(readonlyPrisma.eventType.findMany).toHaveBeenCalledWith({
          select: {
            id: true,
            slug: true,
            title: true,
            teamId: true,
            userId: true,
            team: {
              select: {
                name: true,
              },
            },
          },
          where: {
            userId: mockUser.id,
            teamId: null,
          },
        });
        expect(result).toEqual(personalEvents);
      });
    });

    describe("Organization-wide view (isAll = true)", () => {
      it("should return team events and user's personal events for owner/admin", async () => {
        const childTeams = [{ id: 11 }, { id: 12 }];
        const allEvents = [...mockEventTypes];

        vi.mocked(readonlyPrisma.team.findMany).mockResolvedValue(childTeams);
        vi.mocked(readonlyPrisma.eventType.findMany).mockResolvedValue(allEvents);

        const ownerUser = { ...mockUser, isOwnerAdminOfParentTeam: true };

        const result = await eventTypeRepository.getEventTypeList({
          teamId: null,
          userId: null,
          isAll: true,
          user: ownerUser,
        });

        expect(readonlyPrisma.eventType.findMany).toHaveBeenCalledWith({
          select: {
            id: true,
            slug: true,
            title: true,
            teamId: true,
            userId: true,
            team: {
              select: {
                name: true,
              },
            },
          },
          where: {
            OR: [
              {
                teamId: {
                  in: [10, 11, 12],
                },
              },
              {
                userId: ownerUser.id,
                teamId: null,
              },
            ],
          },
        });
        expect(result).toEqual(allEvents);
      });
    });

    describe("Team-specific view", () => {
      it("should return team events for team members", async () => {
        const membership = { teamId: 5, userId: 1, role: "MEMBER" };
        vi.mocked(readonlyPrisma.membership.findFirst).mockResolvedValue(membership);
        vi.mocked(readonlyPrisma.eventType.findMany).mockResolvedValue([mockEventTypes[1]]);

        const result = await eventTypeRepository.getEventTypeList({
          teamId: 5,
          userId: null,
          isAll: false,
          user: mockUser,
        });

        expect(readonlyPrisma.eventType.findMany).toHaveBeenCalledWith({
          select: {
            id: true,
            slug: true,
            title: true,
            teamId: true,
            userId: true,
            team: {
              select: {
                name: true,
              },
            },
          },
          where: {
            teamId: 5,
            OR: [{ userId: mockUser.id }, { users: { some: { id: mockUser.id } } }],
          },
        });
        expect(result).toEqual([mockEventTypes[1]]);
      });

      it("should throw error when user is not part of team and not owner/admin", async () => {
        vi.mocked(readonlyPrisma.membership.findFirst).mockResolvedValue(null);

        await expect(
          eventTypeRepository.getEventTypeList({
            teamId: 5,
            userId: null,
            isAll: false,
            user: mockUser,
          })
        ).rejects.toThrow("User is not part of a team/org");
      });
    });
  });

  // TODO: Add tests for other EventTypeRepository methods as they are added
  // Examples:
  // - describe("findById", () => { ... })
  // - describe("create", () => { ... })
  // - describe("findAllByUpId", () => { ... })
  // etc.
});
