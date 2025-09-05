import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSetDestinationCalendarReminderSchema } from "./setDestinationReminder.schema";

type SetDestinationReminderHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetDestinationCalendarReminderSchema;
};

export const setDestinationReminderHandler = async ({ ctx, input }: SetDestinationReminderHandlerOptions) => {
  const { credentialId, integration, externalId, defaultReminder } = input;

  const updatedCalendar = await ctx.prisma.destinationCalendar.updateMany({
    where: {
      credentialId,
      integration,
      externalId,
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
