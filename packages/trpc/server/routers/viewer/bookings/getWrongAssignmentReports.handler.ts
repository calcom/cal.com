import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import prisma from "@calcom/prisma";

import type { TGetWrongAssignmentReportsInputSchema } from "./getWrongAssignmentReports.schema";
import { statusToEnumMap } from "./getWrongAssignmentReports.schema";

type GetWrongAssignmentReportsOptions = {
  input: TGetWrongAssignmentReportsInputSchema;
};

export const getWrongAssignmentReportsHandler = async ({ input }: GetWrongAssignmentReportsOptions) => {
  const { teamId, isAll, status, routingFormId, reportedById, limit, offset } = input;

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
