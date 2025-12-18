import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TNoShowInputSchema } from "./markNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const markNoShow = async ({ ctx, input }: NoShowOptions) => {
  const { bookingUid, attendees, noShowHost } = input;

  return handleMarkNoShow({
    bookingUid,
    attendees,
    noShowHost,
    userId: ctx.user.id,
    userRole: ctx.user.role,
    locale: ctx.user.locale,
  });
};
