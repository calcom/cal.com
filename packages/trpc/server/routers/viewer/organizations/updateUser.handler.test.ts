import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserHandler } from "./updateUser.handler";

vi.mock("@calcom/prisma", () => ({
  prisma,
  default: prisma,
}));

// --- dependency mocks ---

const mockCheckPermissionToChangeRole = vi.fn().mockResolvedValue(undefined);
const mockAssignRole = vi.fn().mockResolvedValue(undefined);
let mockIsPBACEnabled = true;

vi.mock("@calcom/features/pbac/services/role-management.factory", () => ({
  RoleManagementFactory: {
    getInstance: () => ({
      createRoleManager: vi.fn().mockResolvedValue({
        checkPermissionToChangeRole: mockCheckPermissionToChangeRole,
        assignRole: mockAssignRole,
        get isPBACEnabled() {
          return mockIsPBACEnabled;
        },
      }),
    }),
  },
}));

vi.mock("@calcom/ee/organizations/lib/ensureOrganizationIsReviewed", () => ({
  ensureOrganizationIsReviewed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/profile/lib/checkRegularUsername", () => ({
  checkRegularUsername: vi.fn().mockResolvedValue({ available: true }),
}));

vi.mock("../attributes/assignUserToAttribute.handler", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadAvatar: vi.fn().mockResolvedValue("https://example.com/avatar.png"),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: vi.fn().mockResolvedValue("resized-base64"),
}));

// --- constants ---

const ORGANIZATION_ID = 100;
const ACTOR_USER_ID = 1;
const TARGET_USER_ID = 2;
const CHILD_TEAM_A_ID = 201;
const CHILD_TEAM_B_ID = 202;

// --- helpers ---

function buildCtx(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: ACTOR_USER_ID,
      organizationId: ORGANIZATION_ID,
      profile: { organization: { slug: "test-org" } },
      ...overrides,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function buildRequestedMember({
  children = [] as Array<{ members: Array<{ userId: number; teamId: number }> }>,
  profileUsername = "target-user",
} = {}) {
  return {
    id: 42,
    userId: TARGET_USER_ID,
    teamId: ORGANIZATION_ID,
    accepted: true,
    role: "MEMBER",
    team: { children },
    user: {
      username: "target-user",
      profiles: [{ username: profileUsername }],
    },
  };
}

// --- tests ---

describe("updateUserHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPBACEnabled = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.$transaction.mockResolvedValue(undefined as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.user.update.mockResolvedValue(undefined as any);
  });

  describe("query shape", () => {
    it("should scope the child-team members payload to only the target user with userId and teamId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.membership.findFirst.mockResolvedValue(buildRequestedMember() as any);

      await updateUserHandler({
        ctx: buildCtx(),
        input: {
          userId: TARGET_USER_ID,
          role: "MEMBER",
          timeZone: "UTC",
        },
      });

      expect(prisma.membership.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: TARGET_USER_ID,
            teamId: ORGANIZATION_ID,
            accepted: true,
          },
          include: expect.objectContaining({
            team: {
              include: {
                children: {
                  where: {
                    members: {
                      some: {
                        userId: TARGET_USER_ID,
                      },
                    },
                  },
                  select: {
                    members: {
                      where: {
                        userId: TARGET_USER_ID,
                      },
                      select: {
                        userId: true,
                        teamId: true,
                      },
                    },
                  },
                },
              },
            },
            user: {
              select: {
                username: true,
                profiles: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          }),
        })
      );
    });
  });

  describe("PBAC propagation", () => {
    it("should propagate role to child teams using scoped member payload", async () => {
      const scopedChildren = [
        { members: [{ userId: TARGET_USER_ID, teamId: CHILD_TEAM_A_ID }] },
        { members: [{ userId: TARGET_USER_ID, teamId: CHILD_TEAM_B_ID }] },
      ];

      prisma.membership.findFirst.mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildRequestedMember({ children: scopedChildren }) as any
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.membership.updateMany.mockResolvedValue({ count: 2 } as any);

      await updateUserHandler({
        ctx: buildCtx(),
        input: {
          userId: TARGET_USER_ID,
          role: "ADMIN",
          timeZone: "UTC",
        },
      });

      expect(prisma.membership.updateMany).toHaveBeenCalledWith({
        where: {
          userId: TARGET_USER_ID,
          teamId: {
            in: [CHILD_TEAM_A_ID, CHILD_TEAM_B_ID],
          },
        },
        data: {
          role: "ADMIN",
        },
      });
    });

    it("should call updateMany with empty teamIds when children is empty", async () => {
      prisma.membership.findFirst.mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildRequestedMember({ children: [] }) as any
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.membership.updateMany.mockResolvedValue({ count: 0 } as any);

      await updateUserHandler({
        ctx: buildCtx(),
        input: {
          userId: TARGET_USER_ID,
          role: "ADMIN",
          timeZone: "UTC",
        },
      });

      expect(prisma.membership.updateMany).toHaveBeenCalledWith({
        where: {
          userId: TARGET_USER_ID,
          teamId: {
            in: [],
          },
        },
        data: {
          role: "ADMIN",
        },
      });
    });

    it("should not propagate role when editing self", async () => {
      prisma.membership.findFirst.mockResolvedValue(
        buildRequestedMember({
          children: [{ members: [{ userId: ACTOR_USER_ID, teamId: CHILD_TEAM_A_ID }] }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
      );

      await updateUserHandler({
        ctx: buildCtx(),
        input: {
          userId: ACTOR_USER_ID,
          role: "ADMIN",
          timeZone: "UTC",
        },
      });

      expect(prisma.membership.updateMany).not.toHaveBeenCalled();
    });
  });
});
