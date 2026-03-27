import { CalIdContactRepository } from "@calcom/lib/server/repository/calIdContact";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdContactsUpdateInputSchema;
};

export const updateCalIdContactsHandler = async ({ ctx, input }: UpdateOptions) => {
  const repository = new CalIdContactRepository();

  const contact = await repository.updateById({
    id: input.id,
    userId: ctx.user.id,
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  if (!contact) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact not found",
    });
  }

  return contact;
};
