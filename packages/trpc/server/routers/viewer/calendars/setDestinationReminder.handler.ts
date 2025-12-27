import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSetDestinationReminderInputSchema } from "./setDestinationReminder.schema";

type SetDestinationReminderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetDestinationReminderInputSchema;
};

export const setDestinationReminderHandler = async ({ ctx, input }: SetDestinationReminderOptions) => {
  const { user } = ctx;
  const { credentialId, integration, defaultReminder } = input;

  // Update the destination calendar's custom reminder setting
  await prisma.destinationCalendar.updateMany({
    where: {
      userId: user.id,
      credentialId,
      integration,
    },
    data: {
      customCalendarReminder: defaultReminder,
    },
  });

  return { success: true };
};
