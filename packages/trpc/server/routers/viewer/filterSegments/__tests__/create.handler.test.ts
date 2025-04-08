import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { createHandler } from "../create.handler";
import { type TCreateFilterSegmentInputSchema } from "../create.schema";

describe("createHandler", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
  } as NonNullable<TrpcSessionUser>;

  const baseInput = {
    tableIdentifier: "bookings",
    activeFilters: [
      {
        f: "status",
        v: {
          type: ColumnFilterType.SINGLE_SELECT,
          data: "active",
        },
      },
    ],
    sorting: [{ id: "date", desc: true }],
    columnVisibility: {},
    columnSizing: {},
    perPage: 10,
    searchTerm: "test search",
  };

  it("should create a user-scoped filter segment", async () => {
    const input: TCreateFilterSegmentInputSchema = {
      ...baseInput,
      scope: "USER",
      name: "My Bookings",
    };

    const result = await createHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "My Bookings",
        searchTerm: "test search",
      })
    );
  });

  it("should create a team-scoped filter segment for admin user", async () => {
    // Create team membership first
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: 1,
        accepted: true,
        role: MembershipRole.ADMIN,
      },
    });

    const input: TCreateFilterSegmentInputSchema = {
      ...baseInput,
      scope: "TEAM",
      teamId: 1,
      name: "Team Bookings",
    };

    const result = await createHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        teamId: 1,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Team Bookings",
        searchTerm: "test search",
      })
    );
  });

  it("should throw error when creating team segment without admin role", async () => {
    // Create team membership with MEMBER role
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: 1,
        accepted: true,
        role: MembershipRole.MEMBER,
      },
    });

    const input: TCreateFilterSegmentInputSchema = {
      ...baseInput,
      scope: "TEAM",
      teamId: 1,
      name: "Team Bookings",
    };

    await expect(
      createHandler({
        ctx: { user: mockUser },
        input,
      })
    ).rejects.toThrow("You must be a team admin or owner to create team segments");
  });

  it("should throw error when creating team segment without teamId", async () => {
    const invalidInput = {
      ...baseInput,
      scope: "TEAM",
      name: "Team Bookings",
    };

    await expect(
      createHandler({
        ctx: { user: mockUser },
        // @ts-expect-error - Testing invalid input where teamId is missing for TEAM scope
        input: invalidInput,
      })
    ).rejects.toThrow("Team ID is required for team scope");
  });

  it("should throw error when creating user segment with teamId", async () => {
    const invalidInput = {
      ...baseInput,
      scope: "USER",
      name: "My Bookings",
      teamId: 1,
    };

    await expect(
      createHandler({
        ctx: { user: mockUser },
        // @ts-expect-error - Testing invalid input where teamId is present for USER scope
        input: invalidInput,
      })
    ).rejects.toThrow("Team ID is not allowed for user scope");
  });
});
