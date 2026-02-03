import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetWrongAssignmentReportsInputSchema } from "./getWrongAssignmentReports.schema";
import { statusToEnumMap } from "./getWrongAssignmentReports.schema";

type GetWrongAssignmentReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWrongAssignmentReportsInputSchema;
};

export const getWrongAssignmentReportsHandler = async ({ ctx, input }: GetWrongAssignmentReportsOptions) => {
  const { user } = ctx;
  const { teamId, isAll, status, routingFormId, reportedById, limit, offset } = input;

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      teamId,
      accepted: true,
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this team",
    });
  }

  const repo = new WrongAssignmentReportRepository(prisma);
  const statuses = statusToEnumMap[status];

  let teamIds: number[];

  if (isAll) {
    // Org-level view: include the org itself and all child teams
    const childTeams = await prisma.team.findMany({
      where: { parentId: teamId },
      select: { id: true },
    });
    teamIds = [teamId, ...childTeams.map((t) => t.id)];
  } else {
    teamIds = [teamId];
  }

  const { reports, totalCount } = await repo.findByTeamIdsAndStatuses({
    teamIds,
    statuses: [...statuses],
    routingFormId: routingFormId ?? undefined,
    reportedById: reportedById ?? undefined,
    limit,
    offset,
  });

  return {
    reports,
    totalCount,
    hasMore: offset + reports.length < totalCount,
  };
};
