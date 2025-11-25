import type { PrismaClient } from "@calcom/prisma";

interface AccessCodeData {
  userId: number;
  teamId: number | null;
  scopes: string[];
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

export class AccessCodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findValidCode(code: string, clientId: string): Promise<AccessCodeData | null> {
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

  async deleteExpiredAndUsedCodes(code: string, clientId: string): Promise<void> {
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