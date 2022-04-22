import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";

import prisma from "@lib/prisma";

const findValidApiKey = async (apiKey: string) => {
  const hashedKey = hashAPIKey(apiKey.substring(4));
  const validKey = await prisma.apiKey.findFirst({
    where: {
      AND: [
        {
          hashedKey,
        },
        {
          createdAt: {
            lt: new Date(Date.now()),
          },
        },
        {
          expiresAt: {
            gte: new Date(Date.now()),
          },
        },
      ],
    },
  });

  return validKey;
};

export default findValidApiKey;
