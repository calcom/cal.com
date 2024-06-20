import prisma from "@calcom/prisma";
import { AuditLogApiKeysTriggerEvents } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import type { TEditInputSchema } from "./edit.schema";

type EditOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TEditInputSchema;
};

export const editHandler = async ({ ctx, input }: EditOptions) => {
  const { id, ...data } = input;

  const {
    apiKeys: [updatedApiKey],
  } = await prisma.user.update({
    where: {
      id: ctx.user.id,
    },
    data: {
      apiKeys: {
        update: {
          where: {
            id,
          },
          data,
        },
      },
    },
    select: {
      apiKeys: {
        where: {
          id,
        },
      },
    },
  });

  return {
    result: updatedApiKey,
    auditLogData: {
      trigger: AuditLogApiKeysTriggerEvents.API_KEY_UPDATED,
      apiKey: updatedApiKey,
    },
  };
};
