import createEventType from "@calcom/lib/createEventType";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  return await createEventType({
    ...ctx,
    ...input,
  });
};
