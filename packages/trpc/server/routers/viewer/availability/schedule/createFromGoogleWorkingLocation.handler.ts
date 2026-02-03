import type { GoogleWorkingLocationSyncConfig } from "@calcom/features/schedules/lib/working-location";
import { WorkingLocationSyncService } from "@calcom/features/schedules/lib/working-location";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateFromGoogleWorkingLocationSchema } from "./googleWorkingLocation.schema";

type CreateFromGoogleWorkingLocationOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "timeZone" | "defaultScheduleId">;
  };
  input: TCreateFromGoogleWorkingLocationSchema;
};

type CreateFromGoogleWorkingLocationResult = {
  schedule: { id: number; name: string };
};

export const createFromGoogleWorkingLocationHandler = async ({
  input,
  ctx,
}: CreateFromGoogleWorkingLocationOptions): Promise<CreateFromGoogleWorkingLocationResult> => {
  const { user } = ctx;

  // Validate the credential belongs to the user
  const credential = await prisma.credential.findFirst({
    where: {
      id: input.credentialId,
      userId: user.id,
      type: "google_calendar",
      invalid: { not: true },
    },
    select: {
      id: true,
    },
  });

  if (!credential) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Google Calendar credential not found or invalid",
    });
  }

  const syncService = new WorkingLocationSyncService(prisma);

  const config: GoogleWorkingLocationSyncConfig = {
    calendarId: input.calendarId,
    locationTypes: input.locationTypes,
    locationLabel: input.locationLabel,
  };

  try {
    const schedule = await syncService.createSyncedSchedule({
      userId: user.id,
      name: input.name,
      timeZone: user.timeZone,
      credentialId: input.credentialId,
      config,
    });

    // Set as default if user has no default schedule
    if (!user.defaultScheduleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultScheduleId: schedule.id },
      });
    }

    return { schedule };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    let errorMessage = "Failed to create synced schedule";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: errorMessage,
    });
  }
};
