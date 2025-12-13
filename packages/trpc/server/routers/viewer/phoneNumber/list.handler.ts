import { getPhoneNumberRepository } from "@calcom/features/di/containers/RepositoryContainer";

import type { TrpcSessionUser } from "../../../types";
import type { TListInputSchema } from "./list.schema";

type ListHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInputSchema;
};

export const listHandler = async ({ ctx, input }: ListHandlerOptions) => {
  const phoneNumberRepo = getPhoneNumberRepository();
  return await phoneNumberRepo.findManyWithUserAccess({
    userId: ctx.user.id,
    teamId: input?.teamId,
    scope: input?.scope || "all",
  });
};
