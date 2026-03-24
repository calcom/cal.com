import { CalIdContactRepository } from "@calcom/lib/server/repository/calIdContact";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsGetByIdInputSchema } from "./getById.schema";

type GetByIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdContactsGetByIdInputSchema;
};

export const getByIdCalIdContactsHandler = async ({ ctx, input }: GetByIdOptions) => {
  const repository = new CalIdContactRepository();

  const contact = await repository.getById({
    id: input.id,
    userId: ctx.user.id,
  });

  if (!contact) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact not found",
    });
  }

  return contact;
};
