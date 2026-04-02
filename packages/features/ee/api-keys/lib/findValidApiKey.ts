import process from "node:process";
import { hashAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";
import prisma from "@calcom/prisma";

const findValidApiKey = async (apiKey: string, appId?: string) => {
  const hashedKey = hashAPIKey(apiKey.substring(process.env.API_KEY_PREFIX?.length || 0));

  const validKey = await prisma.apiKey.findFirst({
    where: {
      hashedKey,
      appId,
      OR: [
        {
          expiresAt: {
            gte: new Date(Date.now()),
          },
        },
        {
          expiresAt: null,
        },
      ],
    },
  });
  return validKey;
};

export default findValidApiKey;
