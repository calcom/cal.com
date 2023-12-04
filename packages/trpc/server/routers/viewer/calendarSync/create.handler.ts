import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateCalendarSyncInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateCalendarSyncInputSchema;
};
export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { user } = ctx;

  const {
    sourceCredentialId,
    toCredentialId,
    color,
    privacy,
    allDayEventConfig,
    sourceExternalId,
    toExternalId,
  } = input;

  const createdSyncTask = await prisma.calendarSyncTask.create({
    data: {
      userId: user.id,
      sourceExternalId,
      sourceCredentialId,
      toCredentialId,
      toExternalId,
      color,
      privacy,
      allDayEventConfig,
      enabled: true,
    },
  });

  return createdSyncTask;
};
