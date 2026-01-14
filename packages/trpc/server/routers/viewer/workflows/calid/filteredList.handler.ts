import { CalIdWorkflowRepository } from "@calcom/lib/server/repository/workflow.calid";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdFilteredListInputSchema } from "./filteredList.schema";

type CalIdFilteredListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCalIdFilteredListInputSchema;
};

export const calIdFilteredListHandler = async ({ ctx, input }: CalIdFilteredListOptions) => {
  return await CalIdWorkflowRepository.getFilteredList({ userId: ctx.user.id, input });
};
