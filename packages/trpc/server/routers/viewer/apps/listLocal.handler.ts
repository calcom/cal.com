import { AppRepository } from "@calcom/lib/server/repository/app";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListLocalInputSchema } from "./listLocal.schema";

type ListLocalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TListLocalInputSchema;
};

export const listLocalHandler = async ({ input }: ListLocalOptions) => {
  return await AppRepository.getAppsList({ input });
};
