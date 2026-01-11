import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { FilterSegmentRepository } from "../../repositories/filterSegment";
import { type TUpdateFilterSegmentInputSchema } from "../../repositories/filterSegment.type";

const repository = new FilterSegmentRepository();

describe("FilterSegmentRepository.update()", () => {
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

  it("should update a user-scoped filter segment", async () => {
    // Create a user-scoped segment first
    const segment = await prismock.filterSegment.create({
      data: {
        ...baseInput,
        userId: mockUser.id,
        scope: "USER",
        name: "My Bookings",
      },
    });

    const input: TUpdateFilterSegmentInputSchema = {
      ...baseInput,
      id: segment.id,
      scope: "USER",
      name: "Updated Bookings",
      searchTerm: "updated search",
      activeFilters: [
        {
          f: "status",
          v: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: "inactive",
          },
        },
      ],
    };

    const result = await repository.update({
      userId,
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "Updated Bookings",
        searchTerm: "updated search",
        activeFilters: [
          {
            f: "status",
            v: { type: ColumnFilterType.SINGLE_SELECT, data: "inactive" },
          },
        ],
      })
    );
  });

  it("should update a team-scoped filter segment for admin user", async () => {
    // Create team first
    const team = await prismock.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    // Create team membership first
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        accepted: true,
        role: MembershipRole.ADMIN,
      },
    });

    // Create a team-scoped segment
    const segment = await prismock.filterSegment.create({
      data: {
        ...baseInput,
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        name: "Team Bookings",
      },
    });

    const input: TUpdateFilterSegmentInputSchema = {
      id: segment.id,
      scope: "TEAM",
      teamId: team.id,
      name: "Updated Team Bookings",
      searchTerm: "updated search",
      activeFilters: [
        {
          f: "status",
          v: {
            type: ColumnFilterType.SINGLE_SELECT,
            data: "inactive",
          },
        },
      ],
    };

    const result = await repository.update({
      userId,
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: segment.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Updated Team Bookings",
        searchTerm: "updated search",
        activeFilters: [
          {
            f: "status",
            v: { type: ColumnFilterType.SINGLE_SELECT, data: "inactive" },
          },
        ],
      })
    );
  });

  it("should throw error when updating non-existent segment", async () => {
    const input: TUpdateFilterSegmentInputSchema = {
      id: 999,
      scope: "USER",
      name: "Updated Bookings",
      activeFilters: [
        {
          f: "status",
          v: { type: ColumnFilterType.SINGLE_SELECT, data: "inactive" },
        },
      ],
      sorting: [{ id: "date", desc: true }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
    };

    await expect(
      repository.update({
        userId,
        input,
      })
    ).rejects.toThrow("Filter segment not found or you don't have permission to update it");
  });

  it("should throw error when updating team segment without admin role", async () => {
    // Create team first
    const team = await prismock.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    // Create team membership with MEMBER role
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        accepted: true,
        role: MembershipRole.MEMBER,
      },
    });

    // Create a team-scoped segment
    const segment = await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Team Bookings",
        activeFilters: [
          {
            f: "status",
            v: { type: ColumnFilterType.SINGLE_SELECT, data: "active" },
          },
        ],
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 10,
      },
    });

    const input: TUpdateFilterSegmentInputSchema = {
      id: segment.id,
      scope: "TEAM",
      teamId: team.id,
      name: "Updated Team Bookings",
      activeFilters: [
        {
          f: "status",
          v: { type: ColumnFilterType.SINGLE_SELECT, data: "inactive" },
        },
      ],
      sorting: [{ id: "date", desc: true }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
    };

    await expect(
      repository.update({
        userId,
        input,
      })
    ).rejects.toThrow("Filter segment not found or you don't have permission to update it");
  });
});
