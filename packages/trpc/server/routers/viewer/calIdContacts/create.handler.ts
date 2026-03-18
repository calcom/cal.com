import { CalIdContactRepository } from "@calcom/lib/server/repository/calIdContact";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdContactsCreateInputSchema;
};

export const createCalIdContactsHandler = async ({ ctx, input }: CreateOptions) => {
  const repository = new CalIdContactRepository();

  return repository.create({
    userId: ctx.user.id,
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
    },
  });
};
