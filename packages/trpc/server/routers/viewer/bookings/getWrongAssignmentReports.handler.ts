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
  const { teamId, status, limit, offset } = input;

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

  const { reports, totalCount } = await repo.findByTeamIdAndStatuses({
    teamId,
    statuses: [...statuses],
    limit,
    offset,
  });

  return {
    reports,
    totalCount,
    hasMore: offset + reports.length < totalCount,
  };
};
