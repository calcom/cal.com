import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { listHandler } from "../list.handler";
import { type TListFilterSegmentsInputSchema } from "../list.schema";

describe("listHandler", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
  } as NonNullable<TrpcSessionUser>;

  it("should return user-scoped filter segments", async () => {
    // Create user-scoped segments
    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "My Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 10,
      },
    });

    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "My Other Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: false }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 20,
      },
    });

    const input: TListFilterSegmentsInputSchema = {
      tableIdentifier: "bookings",
    };

    const result = await listHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "My Other Bookings",
          scope: "USER",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: false }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 20,
        }),
        expect.objectContaining({
          name: "My Bookings",
          scope: "USER",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: true }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 10,
        }),
      ])
    );
  });

  it("should return team-scoped filter segments for team member", async () => {
    // Create team first
    const team = await prismock.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    // Create team membership
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        accepted: true,
        role: MembershipRole.MEMBER,
      },
    });

    // Create team-scoped segments
    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Team Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 10,
      },
    });

    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Other Team Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: false }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 15,
      },
    });

    const input: TListFilterSegmentsInputSchema = {
      tableIdentifier: "bookings",
    };

    const result = await listHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Other Team Bookings",
          scope: "TEAM",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: false }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 15,
        }),
        expect.objectContaining({
          name: "Team Bookings",
          scope: "TEAM",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: true }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 10,
        }),
      ])
    );
  });

  it("should return both user-scoped and team-scoped segments", async () => {
    // Create team first
    const team = await prismock.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
      },
    });

    // Create team membership
    await prismock.membership.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        accepted: true,
        role: MembershipRole.MEMBER,
      },
    });

    // Create user-scoped segment
    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "My Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 10,
      },
    });

    // Create team-scoped segment
    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Team Bookings",
        activeFilters: [{ f: "status" }],
        sorting: [{ id: "date", desc: false }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 15,
      },
    });

    const input: TListFilterSegmentsInputSchema = {
      tableIdentifier: "bookings",
    };

    const result = await listHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "My Bookings",
          scope: "USER",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: true }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 10,
        }),
        expect.objectContaining({
          name: "Team Bookings",
          scope: "TEAM",
          activeFilters: [{ f: "status" }],
          sorting: [{ id: "date", desc: false }],
          columnVisibility: {},
          columnSizing: {},
          perPage: 15,
        }),
      ])
    );
  });

  it("should return empty array when no segments exist", async () => {
    const input: TListFilterSegmentsInputSchema = {
      tableIdentifier: "bookings",
    };

    const result = await listHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toEqual([]);
  });
});
