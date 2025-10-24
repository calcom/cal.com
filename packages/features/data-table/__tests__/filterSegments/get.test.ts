import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { FilterSegmentRepository } from "../../repositories/filterSegment";
import { type TListFilterSegmentsInputSchema } from "../../repositories/filterSegment.type";

const repository = new FilterSegmentRepository();

describe("FilterSegmentRepository.get()", () => {
  const userId = 1;
  const mockUser = {
    id: userId,
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

    const result = await repository.get({
      userId,
      tableIdentifier: input.tableIdentifier,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments).toEqual(
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

    const result = await repository.get({
      userId,
      tableIdentifier: input.tableIdentifier,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments).toEqual(
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

    const result = await repository.get({
      userId,
      tableIdentifier: input.tableIdentifier,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments).toEqual(
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

    const result = await repository.get({
      userId,
      tableIdentifier: input.tableIdentifier,
    });

    expect(result).toEqual({
      segments: [],
      preferredSegmentId: null,
    });
  });

  it("should return segments with user preferences", async () => {
    // Create a filter segment
    const segment = await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "contacts",
        name: "Important Contacts",
        activeFilters: [{ f: "priority" }],
        sorting: [{ id: "lastContact", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 50,
      },
    });

    // Create a user preference for this segment
    await prismock.userFilterSegmentPreference.create({
      data: {
        userId: mockUser.id,
        tableIdentifier: "contacts",
        segmentId: segment.id,
      },
    });

    const result = await repository.get({
      userId: mockUser.id,
      tableIdentifier: "contacts",
    });

    expect(result.segments).toHaveLength(1);
    expect(result.preferredSegmentId).toEqual({ id: segment.id, type: "user" });
    expect(result.segments[0].name).toBe("Important Contacts");
  });

  it("should handle segments with null JSON fields gracefully", async () => {
    // Create segment with minimal data (some fields will be null/undefined)
    await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "reports",
        name: "Basic Report",
        activeFilters: undefined, // This should be parsed to []
        sorting: undefined, // This should be parsed to []
        columnVisibility: undefined, // This should be parsed to {}
        columnSizing: undefined, // This should be parsed to {}
        perPage: 10,
        searchTerm: null,
      },
    });

    const result = await repository.get({
      userId: mockUser.id,
      tableIdentifier: "reports",
    });

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        name: "Basic Report",
        activeFilters: [], // Should default to empty array
        sorting: [], // Should default to empty array
        columnVisibility: {}, // Should default to empty object
        columnSizing: {}, // Should default to empty object
        perPage: 10,
      })
    );
  });
});
