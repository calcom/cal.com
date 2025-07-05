import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TBulkUpdateToDefaultAvailabilityInputSchema } from "./bulkUpdateDefaultAvailability.schema";

type BulkUpdateToDefaultAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUpdateToDefaultAvailabilityInputSchema;
};

export const bulkUpdateToDefaultAvailabilityHandler = async ({
  ctx,
  input,
}: BulkUpdateToDefaultAvailabilityOptions) => {
  const { eventTypeIds, selectedDefaultScheduleId } = input;
  const defaultScheduleId = ctx.user.defaultScheduleId;

  if (!selectedDefaultScheduleId && !defaultScheduleId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default schedule not set",
    });
  }

  // Check if user is a member of any team with locked default availability
  const userTeams = await prisma.membership.findMany({
    where: {
      userId: ctx.user.id,
      accepted: true,
    },
    select: {
      team: {
        select: {
          lockDefaultAvailability: true,
        },
      },
      role: true,
    },
  });

  // Check if user is a member (not admin/owner) of any team with locked default availability
  const hasLockedTeamMembership = userTeams.some(
    (membership) => membership.team.lockDefaultAvailability && membership.role === MembershipRole.MEMBER
  );

  if (hasLockedTeamMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot edit default availability when team has locked default availability setting enabled",
    });
  }

  return await prisma.eventType.updateMany({
    where: {
      id: {
        in: eventTypeIds,
      },
      userId: ctx.user.id,
    },
    data: {
      scheduleId: selectedDefaultScheduleId || defaultScheduleId,
    },
  });
};
