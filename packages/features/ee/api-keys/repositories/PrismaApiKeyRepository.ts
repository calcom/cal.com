import { v4 as uuidv4 } from "uuid";

import type { PrismaClient } from "@calcom/prisma";

import { generateUniqueAPIKey as generateHashedApiKey } from "../lib/apiKeys";

export class PrismaApiKeyRepository {
  constructor(private prismaClient: PrismaClient) {}

  static async withGlobalPrisma() {
    return new PrismaApiKeyRepository((await import("@calcom/prisma")).prisma);
  }

  async findByHashedKey(hashedKey: string) {
    return this.prismaClient.apiKey.findUnique({
      where: { hashedKey },
      select: {
        id: true,
        hashedKey: true,
        userId: true,
        expiresAt: true,
        user: {
          select: {
            role: true,
            locked: true,
            email: true,
          },
        },
      },
    });
  }

  async findApiKeysFromUserId({ userId }: { userId: number }) {
    const apiKeys = await this.prismaClient.apiKey.findMany({
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
      if (apiKey.note?.startsWith("Cal.ai Phone API Key")) {
        return false;
      }
      return true;
    });
  }

  async createApiKey({
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
    await this.prismaClient.apiKey.create({
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
