import type { NextApiRequest } from "next";
import { v4 } from "uuid";

import { generateUniqueAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { apiKeyCreateBodySchema, apiKeyPublicSchema } from "~/lib/validations/api-key";

async function postHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { neverExpires, userId: bodyUserId, ...input } = apiKeyCreateBodySchema.parse(req.body);
  const [hashedKey, apiKey] = generateUniqueAPIKey();
  const args: Prisma.ApiKeyCreateArgs = {
    data: {
      id: v4(),
      userId,
      ...input,
      // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
      expiresAt: neverExpires ? null : input.expiresAt,
      hashedKey,
    },
  };

  if (!isSystemWideAdmin && bodyUserId)
    throw new HttpError({ statusCode: 403, message: `ADMIN required for userId` });

  if (isSystemWideAdmin && bodyUserId) {
    const where: Prisma.UserWhereInput = { id: bodyUserId };
    await prisma.user.findFirstOrThrow({ where });
    args.data.userId = bodyUserId;
  }

  const result = await prisma.apiKey.create(args);
  return {
    api_key: {
      ...apiKeyPublicSchema.parse(result),
      key: `${process.env.API_KEY_PREFIX ?? "cal_"}${apiKey}`,
    },
    message: "API key created successfully. Save the `key` value as it won't be displayed again.",
  };
}

export default defaultResponder(postHandler);
