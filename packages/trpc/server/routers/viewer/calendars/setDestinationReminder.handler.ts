import { getDestinationCalendarRepository } from "@calcom/features/di/containers/DestinationCalendar";
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

  const destinationCalendarRepository = getDestinationCalendarRepository();

  // Update the destination calendar's custom reminder setting
  await destinationCalendarRepository.updateCustomReminder({
    userId: user.id,
    credentialId,
    integration,
    customCalendarReminder: defaultReminder,
  });

  return { success: true };
};
