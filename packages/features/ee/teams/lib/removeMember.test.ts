import { describe, expect, test, vi } from "vitest";

import { deleteWorkfowRemindersOfRemovedMember } from "./deleteWorkflowRemindersOfRemovedMember";
import removeMember from "./removeMember";

vi.mock("@calcom/prisma", () => {
  return {
    default: {
      $transaction: vi.fn((fn) => {
        if (Array.isArray(fn)) {
          return Promise.resolve([
            {
              userId: 123,
              teamId: 456,
              user: { id: 123 },
              team: { id: 456 },
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      membership: {
        delete: vi.fn(() =>
          Promise.resolve({
            userId: 123,
            teamId: 456,
            user: { id: 123 },
            team: { id: 456 },
          })
        ),
        deleteMany: vi.fn(() => Promise.resolve({})),
      },
      host: {
        deleteMany: vi.fn(() => Promise.resolve({})),
      },
      team: {
        findUnique: vi.fn(() =>
          Promise.resolve({
            id: 456,
            isOrganization: false,
            organizationSettings: null,
            metadata: null,
            activeOrgWorkflows: null,
            parentId: null,
          })
        ),
      },
      user: {
        findUnique: vi.fn(() =>
          Promise.resolve({
            id: 123,
            movedToProfileId: null,
            email: "test@example.com",
            username: "testuser",
            completedOnboarding: true,
            teams: [],
          })
        ),
        update: vi.fn(() => Promise.resolve({})),
      },
      eventType: {
        deleteMany: vi.fn(() => Promise.resolve({})),
      },
      tempOrgRedirect: {
        deleteMany: vi.fn(() => Promise.resolve({})),
      },
    },
  };
});

vi.mock("@calcom/lib/server/repository/profile", () => ({
  ProfileRepository: {
    findByUserIdAndOrgId: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      debug: vi.fn(),
    })),
  },
}));

vi.mock("./deleteWorkflowRemindersOfRemovedMember", () => ({
  deleteWorkfowRemindersOfRemovedMember: vi.fn(() => Promise.resolve(undefined)),
}));

describe("removeMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should remove a user from a team and delete host associations", async () => {
    const memberId = 123;
    const teamId = 456;

    const prisma = (await import("@calcom/prisma")).default;

    await removeMember({
      memberId,
      teamId,
      isOrg: false,
    });

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: memberId,
        eventType: {
          teamId: teamId,
        },
      },
    });

    expect(prisma.eventType.deleteMany).toHaveBeenCalled();
    expect(deleteWorkfowRemindersOfRemovedMember).toHaveBeenCalled();
  });

  test("should remove a user from an organization and delete host associations from all teams in the hierarchy", async () => {
    const memberId = 123;
    const orgId = 456;

    const prisma = (await import("@calcom/prisma")).default;

    vi.mocked(prisma.team.findUnique).mockReturnValueOnce({
      id: orgId,
      isOrganization: true,
      organizationSettings: null,
      metadata: null,
      activeOrgWorkflows: null,
      parentId: null,
    } as any);

    await removeMember({
      memberId,
      teamId: orgId,
      isOrg: true,
    });

    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: memberId,
        eventType: {
          team: {
            OR: [{ parentId: orgId }, { id: orgId }],
          },
        },
      },
    });

    expect(prisma.membership.deleteMany).toHaveBeenCalledWith({
      where: {
        team: {
          parentId: orgId,
        },
        userId: expect.any(Number),
      },
    });
  });
});
