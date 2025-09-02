import { v4 as uuidv4 } from "uuid";

import { generateUniqueAPIKey as generateHashedApiKey } from "@calcom/ee/api-keys/lib/apiKeys";
import prisma from "@calcom/prisma";

export class PrismaApiKeyRepository {
  static async findApiKeysFromUserId({ userId }: { userId: number }) {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId,
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
    return apiKeys.filter((apiKey) => {
      if (apiKey.note?.startsWith("Cal AI Phone API Key")) {
        return false;
      }
      return true;
    });
  }

  static async createApiKey({
    userId,
    teamId,
    note,
    expiresAt,
  }: {
    userId: number;
    teamId?: number;
    note?: string;
    expiresAt?: Date | null;
  }) {
    const [hashedApiKey, apiKey] = generateHashedApiKey();
    await prisma.apiKey.create({
      data: {
        id: uuidv4(),
        userId,
        teamId,
        expiresAt,
        hashedKey: hashedApiKey,
        note: note,
      },
    });

    const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";

    const prefixedApiKey = `${apiKeyPrefix}${apiKey}`;

    return prefixedApiKey;
  }
}
