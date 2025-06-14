import type { FilterSegmentOutput } from "@calcom/features/data-table/lib/types";
import {
  ZActiveFilters,
  ZSortingState,
  ZColumnSizing,
  ZColumnVisibility,
} from "@calcom/features/data-table/lib/types";
import { prisma } from "@calcom/prisma";
import type { FilterSegment, UserFilterSegmentPreference } from "@calcom/prisma/client";

import type { TCreateFilterSegmentInputSchema, TUpdateFilterSegmentInputSchema } from "./filterSegment.type";

export interface IFilterSegmentRepository {
  get({ userId, tableIdentifier }: { userId: number; tableIdentifier: string }): Promise<{
    segments: FilterSegmentOutput[];
    preferredSegmentId: number | null;
  }>;

  create({
    userId,
    input,
  }: {
    userId: number;
    input: TCreateFilterSegmentInputSchema;
  }): Promise<FilterSegment>;

  update({
    userId,
    input,
  }: {
    userId: number;
    input: TUpdateFilterSegmentInputSchema;
  }): Promise<FilterSegment>;

  delete({ userId, id }: { userId: number; id: number }): Promise<void>;

  setPreference({
    userId,
    tableIdentifier,
    segmentId,
  }: {
    userId: number;
    tableIdentifier: string;
    segmentId: number | null;
  }): Promise<UserFilterSegmentPreference | null>;
}

export class FilterSegmentRepository implements IFilterSegmentRepository {
  async get({ userId, tableIdentifier }: { userId: number; tableIdentifier: string }) {
    // Get all teams that the user is a member of
    const userTeamIds = await prisma.membership
      .findMany({
        where: {
          userId,
          accepted: true,
        },
        select: {
          teamId: true,
        },
      })
      .then((memberships) => memberships.map((m) => m.teamId));

    // Fetch both user-scoped and team-scoped segments
    const segments = await prisma.filterSegment.findMany({
      where: {
        tableIdentifier,
        OR: [
          // User-scoped segments created by the current user
          {
            scope: "USER",
            userId,
          },
          // Team-scoped segments for teams the user belongs to
          {
            scope: "TEAM",
            teamId: {
              in: userTeamIds,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        tableIdentifier: true,
        scope: true,
        activeFilters: true,
        sorting: true,
        columnVisibility: true,
        columnSizing: true,
        perPage: true,
        searchTerm: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { scope: "desc" }, // USER segments first, then TEAM segments
        { createdAt: "desc" }, // Newest first within each scope
      ],
    });

    const parsedSegments: FilterSegmentOutput[] = segments.map((segment) => ({
      ...segment,
      activeFilters: ZActiveFilters.catch([]).parse(segment.activeFilters),
      sorting: ZSortingState.catch([]).parse(segment.sorting),
      columnVisibility: ZColumnVisibility.catch({}).parse(segment.columnVisibility),
      columnSizing: ZColumnSizing.catch({}).parse(segment.columnSizing),
    }));

    const preference = await prisma.userFilterSegmentPreference.findUnique({
      where: {
        userId_tableIdentifier: {
          userId,
          tableIdentifier,
        },
      },
      select: {
        segmentId: true,
      },
    });

    return {
      segments: parsedSegments,
      preferredSegmentId: preference?.segmentId || null,
    };
  }

  async create({ userId, input }: { userId: number; input: TCreateFilterSegmentInputSchema }) {
    const { scope, teamId, ...filterData } = input;

    // If scope is TEAM, verify user has admin/owner permissions
    if (scope === "TEAM") {
      if (!teamId) {
        throw new Error("Team ID is required for team scope");
      }

      const membership = await prisma.membership.findFirst({
        select: {
          id: true,
        },
        where: {
          userId,
          teamId,
          accepted: true,
          role: {
            in: ["ADMIN", "OWNER"],
          },
        },
      });

      if (!membership) {
        throw new Error("You must be a team admin or owner to create team segments");
      }
    }

    // For USER scope, ensure no teamId is provided
    if (scope === "USER" && teamId) {
      throw new Error("Team ID is not allowed for user scope");
    }

    // Create the filter segment
    const filterSegment = await prisma.filterSegment.create({
      data: {
        ...filterData,
        scope,
        ...(scope === "TEAM" ? { teamId } : {}),
        userId,
      },
    });

    return filterSegment;
  }

  async update({ userId, input }: { userId: number; input: TUpdateFilterSegmentInputSchema }) {
    const { id, name, activeFilters, sorting, columnVisibility, columnSizing, perPage, searchTerm } = input;

    // First, fetch the existing segment to check permissions
    const existingSegment = await prisma.filterSegment.findFirst({
      where: {
        id,
        ...(input.scope === "TEAM"
          ? {
              scope: "TEAM",
              teamId: input.teamId,
              team: {
                members: {
                  some: {
                    userId,
                    accepted: true,
                    role: {
                      in: ["ADMIN", "OWNER"],
                    },
                  },
                },
              },
            }
          : {
              scope: "USER",
              userId,
            }),
      },
      select: {
        id: true,
      },
    });

    if (!existingSegment) {
      throw new Error("Filter segment not found or you don't have permission to update it");
    }

    // Update the filter segment with only the allowed fields
    const updatedSegment = await prisma.filterSegment.update({
      where: { id },
      data: {
        name,
        activeFilters,
        sorting,
        columnVisibility,
        columnSizing,
        perPage,
        searchTerm,
      },
    });

    return updatedSegment;
  }

  async delete({ userId, id }: { userId: number; id: number }) {
    // First, fetch the existing segment to check permissions
    const existingSegment = await prisma.filterSegment.findFirst({
      where: {
        id,
        OR: [
          {
            scope: "TEAM",
            teamId: { not: null },
            team: {
              members: {
                some: {
                  userId,
                  accepted: true,
                  role: {
                    in: ["ADMIN", "OWNER"],
                  },
                },
              },
            },
          },
          {
            scope: "USER",
            userId,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!existingSegment) {
      throw new Error("Filter segment not found or you don't have permission to delete it");
    }

    // Delete the filter segment
    await prisma.filterSegment.delete({
      where: { id },
    });
  }

  async setPreference({
    userId,
    tableIdentifier,
    segmentId,
  }: {
    userId: number;
    tableIdentifier: string;
    segmentId: number | null;
  }) {
    if (segmentId === null) {
      await prisma.userFilterSegmentPreference.deleteMany({
        where: {
          userId,
          tableIdentifier,
        },
      });
      return null;
    }

    const preference = await prisma.userFilterSegmentPreference.upsert({
      where: {
        userId_tableIdentifier: {
          userId,
          tableIdentifier,
        },
      },
      update: {
        segmentId,
      },
      create: {
        userId,
        tableIdentifier,
        segmentId,
      },
    });

    return preference;
  }
}
