import { CalIdContactRepository } from "@calcom/lib/server/repository/calIdContact";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdContactsDeleteInputSchema;
};

export const deleteCalIdContactsHandler = async ({ ctx, input }: DeleteOptions) => {
  const repository = new CalIdContactRepository();

  const deleted = await repository.deleteById({
    id: input.id,
    userId: ctx.user.id,
  });

  if (!deleted) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact not found",
    });
  }

  return {
    id: input.id,
  };
};
