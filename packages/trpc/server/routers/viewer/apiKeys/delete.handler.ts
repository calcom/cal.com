import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const apiKeyToDelete = await prisma.apiKey.findUnique({
    where: {
      id,
    },
  });

  await prisma.user.update({
    where: {
      id: ctx.user.id,
    },
    data: {
      apiKeys: {
        delete: {
          id,
        },
      },
    },
  });

  //remove all existing zapier webhooks, as we always have only one zapier API key and the running zaps won't work any more if this key is deleted
  if (apiKeyToDelete && apiKeyToDelete.appId === "zapier") {
    await prisma.webhook.deleteMany({
      where: {
        userId: ctx.user.id,
        appId: "zapier",
      },
    });
  }

  return {
    id,
  };
};
