import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { FilterSegmentRepository } from "../../repositories/filterSegment";
import { type TDeleteFilterSegmentInputSchema } from "../../repositories/filterSegment.type";

const repository = new FilterSegmentRepository();

describe("FilterSegmentRepository.delete()", () => {
  const userId = 1;
  const mockUser = {
    id: userId,
    name: "Test User",
  } as NonNullable<TrpcSessionUser>;

  it("should delete a user-scoped filter segment", async () => {
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

    const input: TDeleteFilterSegmentInputSchema = {
      id: segment.id,
    };

    await expect(
      repository.delete({
        userId,
        id: segment.id,
      })
    ).resolves.not.toThrow();

    // Verify segment is deleted
    const deletedSegment = await prismock.filterSegment.findUnique({
      where: { id: segment.id },
    });
    expect(deletedSegment).toBeNull();
  });

  it("should delete a team-scoped filter segment for admin user", async () => {
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

    const input: TDeleteFilterSegmentInputSchema = {
      id: segment.id,
    };

    await expect(
      repository.delete({
        userId,
        id: segment.id,
      })
    ).resolves.not.toThrow();

    // Verify segment is deleted
    const deletedSegment = await prismock.filterSegment.findUnique({
      where: { id: segment.id },
    });
    expect(deletedSegment).toBeNull();
  });

  it("should throw error when deleting non-existent segment", async () => {
    const input: TDeleteFilterSegmentInputSchema = {
      id: 999,
    };

    await expect(
      repository.delete({
        userId,
        id: 999,
      })
    ).rejects.toThrow("Filter segment not found or you don't have permission to delete it");
  });

  it("should throw error when deleting team segment without admin role", async () => {
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

    const input: TDeleteFilterSegmentInputSchema = {
      id: segment.id,
    };

    await expect(
      repository.delete({
        userId,
        id: segment.id,
      })
    ).rejects.toThrow("Filter segment not found or you don't have permission to delete it");
  });
});
