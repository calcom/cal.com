import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { type TypedColumnFilter, ColumnFilterType } from "@calcom/features/data-table/lib/types";

import { listMembersHandler } from "./listMembers.handler";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

const prismaMock = {
  membership: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue({ role: "ADMIN" }),
  },
  attributeOption: {
    findMany: vi.fn().mockResolvedValue([
      { id: "1", value: "value1", isGroup: false },
      { id: "2", value: "value2", isGroup: false },
    ]),
  },
  attributeToUser: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

vi.spyOn(prisma.membership, "findMany").mockImplementation(prismaMock.membership.findMany);
vi.spyOn(prisma.membership, "count").mockImplementation(prismaMock.membership.count);
vi.spyOn(prisma.membership, "findFirst").mockImplementation(prismaMock.membership.findFirst);
vi.spyOn(prisma.attributeOption, "findMany").mockImplementation(prismaMock.attributeOption.findMany);
vi.spyOn(prisma.attributeToUser, "findMany").mockImplementation(prismaMock.attributeToUser.findMany);

// Mock FeaturesRepository
const mockCheckIfTeamHasFeature = vi.fn();
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfTeamHasFeature: mockCheckIfTeamHasFeature,
  })),
}));

// Mock PBAC permissions
vi.mock("@calcom/features/pbac/lib/resource-permissions", () => ({
  getSpecificPermissions: vi.fn().mockResolvedValue({
    listMembers: true,
  }),
}));

// Mock UserRepository
vi.mock("@calcom/lib/server/repository/user", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    enrichUserWithItsProfile: vi.fn().mockImplementation(({ user }) => user),
  })),
}));

const ORGANIZATION_ID = 123;

const mockUser = {
  id: 1,
  timeZone: "UTC",
  locale: "en",
  organizationId: ORGANIZATION_ID,
  organization: {
    id: ORGANIZATION_ID,
    isOrgAdmin: true,
    isPrivate: false,
  },
  profiles: [
    {
      id: 1,
      userId: 1,
      organizationId: ORGANIZATION_ID,
    },
  ],
};

describe("listMembersHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter by customRoleId when PBAC is enabled", async () => {
    // Mock PBAC enabled
    mockCheckIfTeamHasFeature.mockResolvedValue(true);

    const roleFilter: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "role",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["ADMIN"],
      },
    };

    await listMembersHandler({
      ctx: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: mockUser as any,
      },
      input: {
        limit: 25,
        offset: 0,
        filters: [roleFilter],
      },
    });

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customRoleId: {
            in: ["ADMIN"],
          },
          teamId: ORGANIZATION_ID,
          user: {
            isPlatformManaged: false,
          },
        }),
      })
    );
  });

  it("should filter by role when PBAC is disabled", async () => {
    // Mock PBAC disabled
    mockCheckIfTeamHasFeature.mockResolvedValue(false);

    const roleFilter: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "role",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["ADMIN"],
      },
    };

    await listMembersHandler({
      ctx: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: mockUser as any,
      },
      input: {
        limit: 25,
        offset: 0,
        filters: [roleFilter],
      },
    });

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: {
            in: ["ADMIN"],
          },
        }),
      })
    );
  });

  it("should combine multiple attribute filters with AND logic", async () => {
    // Mock PBAC disabled for this test
    mockCheckIfTeamHasFeature.mockResolvedValue(false);

    const roleFilter: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "role",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["ADMIN"],
      },
    };

    const teamFilter: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "teams",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["team1"],
      },
    };

    const attributeFilter1: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "1",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["value1"],
      },
    };

    const attributeFilter2: TypedColumnFilter<ColumnFilterType.MULTI_SELECT> = {
      id: "2",
      value: {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["value2"],
      },
    };

    await listMembersHandler({
      ctx: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: mockUser as any,
      },
      input: {
        limit: 25,
        offset: 0,
        filters: [roleFilter, teamFilter, attributeFilter1, attributeFilter2],
      },
    });

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: {
            in: ["ADMIN"],
          },
          teamId: ORGANIZATION_ID,
          user: {
            isPlatformManaged: false,
            teams: {
              some: {
                team: {
                  name: {
                    in: ["team1"],
                  },
                },
              },
            },
          },
          AND: [
            {
              AttributeToUser: {
                some: {
                  attributeOption: {
                    attribute: { id: "1" },
                    value: { in: ["value1"] },
                  },
                },
              },
            },
            {
              AttributeToUser: {
                some: {
                  attributeOption: {
                    attribute: { id: "2" },
                    value: { in: ["value2"] },
                  },
                },
              },
            },
          ],
        }),
      })
    );
  });
});
