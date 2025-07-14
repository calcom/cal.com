import prisma from "@calcom/prisma";

export class ApiKeyRepository {
  static async findApiKeysFromUserId({ userId }: { userId: number }) {
    return await prisma.apiKey.findMany({
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
  }
}
