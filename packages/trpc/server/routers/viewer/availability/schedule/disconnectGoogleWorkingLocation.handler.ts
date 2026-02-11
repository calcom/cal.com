import {
  GOOGLE_WORKING_LOCATION_SYNC_SOURCE,
  WorkingLocationSyncService,
} from "@calcom/features/schedules/lib/working-location";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TDisconnectGoogleWorkingLocationSchema } from "./googleWorkingLocation.schema";

type DisconnectGoogleWorkingLocationOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TDisconnectGoogleWorkingLocationSchema;
};

export const disconnectGoogleWorkingLocationHandler = async ({
  input,
  ctx,
}: DisconnectGoogleWorkingLocationOptions) => {
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

  await syncService.disconnectSync(input.scheduleId);

  return { success: true };
};
