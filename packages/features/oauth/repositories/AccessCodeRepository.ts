import type { PrismaClient } from "@calcom/prisma";

export class AccessCodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findValidCode(code: string, clientId: string) {
    return await this.prisma.accessCode.findFirst({
      where: {
        code: code,
        clientId: clientId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        userId: true,
        teamId: true,
        scopes: true,
        codeChallenge: true,
        codeChallengeMethod: true,
      },
    });
  }

  async deleteExpiredAndUsedCodes(code: string, clientId: string) {
    await this.prisma.accessCode.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            code: code,
            clientId: clientId,
          },
        ],
      },
    });
  }
}
