import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TSetDestinationCalendarReminderSchema } from "./setDestinationReminder.schema";

type SetDestinationReminderHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetDestinationCalendarReminderSchema;
};

export const setDestinationReminderHandler = async ({ input }: SetDestinationReminderHandlerOptions) => {
  const { credentialId, integration, defaultReminder } = input;

  const updatedCalendar = await prisma.destinationCalendar.updateMany({
    where: {
      credentialId,
      integration,
    },
    data: {
      customCalendarReminder: defaultReminder,
    },
  });

  if (updatedCalendar.count === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Selected calendar not found",
    });
  }

  return { success: true };
};
