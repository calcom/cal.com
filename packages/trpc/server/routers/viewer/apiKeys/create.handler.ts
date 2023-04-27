import { v4 } from "uuid";

import { generateUniqueAPIKey } from "@calcom/ee/api-keys/lib/apiKeys";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateHandlerOptions) => {
  const [hashedApiKey, apiKey] = generateUniqueAPIKey();

  // Here we snap never expires before deleting it so it's not passed to prisma create call.
  const { neverExpires, ...rest } = input;

  await prisma.apiKey.create({
    data: {
      id: v4(),
      userId: ctx.user.id,
      ...rest,
      // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
      expiresAt: neverExpires ? null : rest.expiresAt,
      hashedKey: hashedApiKey,
    },
  });

  const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";

  const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

  return prefixedApiKey;
};
