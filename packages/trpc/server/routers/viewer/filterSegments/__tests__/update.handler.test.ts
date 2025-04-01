import prismock from "../../../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { updateHandler } from "../update.handler";
import { type TUpdateFilterSegmentInputSchema } from "../update.schema";

describe("updateHandler", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
  } as NonNullable<TrpcSessionUser>;

  it("should update a user-scoped filter segment", async () => {
    // Create a user-scoped segment first
    const segment = await prismock.filterSegment.create({
      data: {
        userId: mockUser.id,
        scope: "USER",
        tableIdentifier: "bookings",
        name: "My Bookings",
        activeFilters: { f: "status" },
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 10,
      },
    });

    const input: TUpdateFilterSegmentInputSchema = {
      id: segment.id,
      scope: "USER",
      name: "Updated Bookings",
      activeFilters: { f: "status" },
      sorting: [{ id: "date", desc: true }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 20,
    };

    const result = await updateHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: segment.id,
        name: "Updated Bookings",
        activeFilters: { f: "status" },
        sorting: [{ id: "date", desc: true }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 20,
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
        userId: mockUser.id,
        teamId: team.id,
        scope: "TEAM",
        tableIdentifier: "bookings",
        name: "Team Bookings",
        activeFilters: { f: "status" },
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
      activeFilters: { f: "status" },
      sorting: [{ id: "date", desc: false }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 15,
    };

    const result = await updateHandler({
      ctx: { user: mockUser },
      input,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: segment.id,
        name: "Updated Team Bookings",
        activeFilters: { f: "status" },
        sorting: [{ id: "date", desc: false }],
        columnVisibility: {},
        columnSizing: {},
        perPage: 15,
      })
    );
  });

  it("should throw error when updating non-existent segment", async () => {
    const input: TUpdateFilterSegmentInputSchema = {
      id: 999,
      scope: "USER",
      name: "Updated Bookings",
      activeFilters: { f: "status" },
      sorting: [{ id: "date", desc: true }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
    };

    await expect(
      updateHandler({
        ctx: { user: mockUser },
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
        activeFilters: { f: "status" },
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
      activeFilters: { f: "status" },
      sorting: [{ id: "date", desc: true }],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
    };

    await expect(
      updateHandler({
        ctx: { user: mockUser },
        input,
      })
    ).rejects.toThrow("Filter segment not found or you don't have permission to update it");
  });
});
