import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { FilterSegmentRepository } from "../../repositories/filterSegment";
import type { TCreateFilterSegmentInputSchema } from "../../repositories/filterSegment.type";

const repository = new FilterSegmentRepository();

describe("FilterSegmentRepository.create()", () => {
  const userId = 1;
  const mockUser = {
    id: userId,
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

    const result = await repository.create({
      userId,
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

    const result = await repository.create({
      userId,
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
      repository.create({
        userId,
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
      repository.create({
        userId,
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
      repository.create({
        userId,
        // @ts-expect-error - Testing invalid input where teamId is present for USER scope
        input: invalidInput,
      })
    ).rejects.toThrow("Team ID is not allowed for user scope");
  });
});
