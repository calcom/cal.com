import {
  GOOGLE_WORKING_LOCATION_SYNC_SOURCE,
  WorkingLocationSyncService,
} from "@calcom/features/schedules/lib/working-location";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TSyncGoogleWorkingLocationSchema } from "./googleWorkingLocation.schema";

type SyncGoogleWorkingLocationOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TSyncGoogleWorkingLocationSchema;
};

export const syncGoogleWorkingLocationHandler = async ({ input, ctx }: SyncGoogleWorkingLocationOptions) => {
  const { user } = ctx;

  // Verify the schedule belongs to the user and is a synced schedule
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: input.scheduleId,
      userId: user.id,
      syncSource: GOOGLE_WORKING_LOCATION_SYNC_SOURCE,
    },
    select: {
      id: true,
    },
  });

  if (!schedule) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Schedule not found or not configured for Google Working Location sync",
    });
  }

  const syncService = new WorkingLocationSyncService(prisma);

  const result = await syncService.syncSchedule(input.scheduleId);

  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.error || "Failed to sync schedule",
    });
  }

  return { success: true };
};
