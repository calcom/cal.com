import { checkLockedDefaultAvailabilityRestriction } from "@calcom/lib/lockedDefaultAvailability";
import { prisma } from "@calcom/prisma";

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

  const user = ctx.user;

  // Only block if user has locked team membership AND is not an admin/owner of any team
  await checkLockedDefaultAvailabilityRestriction(user.id);

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
