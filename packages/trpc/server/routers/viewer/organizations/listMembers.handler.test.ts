import { describe, expect, it, vi } from "vitest";

import { type TypedColumnFilter, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { prisma } from "@calcom/prisma";

import { listMembersHandler } from "./listMembers.handler";

const prismaMock = {
  membership: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  attributeOption: {
    findMany: vi.fn().mockResolvedValue([
      { id: "1", value: "value1", isGroup: false },
      { id: "2", value: "value2", isGroup: false },
    ]),
  },
};

vi.spyOn(prisma.membership, "findMany").mockImplementation(prismaMock.membership.findMany);
vi.spyOn(prisma.membership, "count").mockImplementation(prismaMock.membership.count);
vi.spyOn(prisma.attributeOption, "findMany").mockImplementation(prismaMock.attributeOption.findMany);

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
  it("should combine multiple attribute filters with AND logic", async () => {
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
