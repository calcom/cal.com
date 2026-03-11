import { getDestinationCalendarService } from "@calcom/features/calendars/di/DestinationCalendarService.container";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
  id: SessionUser["id"];
  email: SessionUser["email"];
  userLevelSelectedCalendars: SessionUser["userLevelSelectedCalendars"];
};

type SetDestinationCalendarOptions = {
  ctx: {
    user: User;
  };
  input: TSetDestinationCalendarInputSchema;
};

export const setDestinationCalendarHandler = async ({ ctx, input }: SetDestinationCalendarOptions) => {
  const { user } = ctx;

  const service = getDestinationCalendarService();
  await service.setDestinationCalendar({
    userId: user.id,
    userEmail: user.email,
    userLevelSelectedCalendars: user.userLevelSelectedCalendars,
    ...input,
  });
};
