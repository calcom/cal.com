import { updateConfirmationStatus } from "@calcom/features/bookings/lib/updateConfirmationStatus";

import type { TrpcSessionUser } from "../../../trpc";
import type { TConfirmInputSchema } from "./confirm.schema";
import type { BookingsProcedureContext } from "./util";

type ConfirmOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  } & BookingsProcedureContext;
  input: TConfirmInputSchema;
};

export const confirmHandler = async ({ ctx, input }: ConfirmOptions) => {
  const { user } = ctx;
  const response = await updateConfirmationStatus({
    user,
    data: input,
  });
  return response;
};
