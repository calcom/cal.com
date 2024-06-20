import prisma from "@calcom/prisma";
import { AuditLogApiKeysTriggerEvents } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      userId: ctx.user.id,
      OR: [
        {
          NOT: {
            appId: "zapier",
          },
        },
        {
          appId: null,
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    result: apiKeys,
    auditLogData: {
      trigger: AuditLogApiKeysTriggerEvents.API_KEY_LIST_ALL_KEYS,
      apiKeys,
    },
  };
};
