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
}
