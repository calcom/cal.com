import prisma from "@calcom/prisma";

export class PrismaApiKeyRepository {
  static async findApiKeysFromUserId({ userId }: { userId: number }) {
    return await prisma.calIdApiKey.findMany({
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
