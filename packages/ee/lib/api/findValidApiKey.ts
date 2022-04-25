import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";
import prisma from "@calcom/prisma";

const findValidApiKey = async (apiKey: string) => {
  const hashedKey = hashAPIKey(apiKey.substring(process.env.API_KEY_PREFIX?.length || 0));
  const validKey = await prisma.apiKey.findFirst({
    where: {
      AND: [
        {
          hashedKey,
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
