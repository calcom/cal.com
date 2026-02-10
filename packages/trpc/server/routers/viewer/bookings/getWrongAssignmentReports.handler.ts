import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
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

  const membershipRepository = new MembershipRepository();
  const hasMembership = await membershipRepository.hasMembership({ userId: user.id, teamId });

  if (!hasMembership) {
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
    const teamRepository = new TeamRepository(prisma);
    const childTeams = await teamRepository.findAllByParentId({ parentId: teamId, select: { id: true } });
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
