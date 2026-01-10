import { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";
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
  await DestinationCalendarRepository.getInstance().updateCustomReminder({
    userId: user.id,
    credentialId,
    integration,
    customCalendarReminder: defaultReminder,
  });

  return { success: true };
};
