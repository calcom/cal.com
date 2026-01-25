import dayjs from "@calcom/dayjs";
import type { PrismaClient } from "@calcom/prisma";
import type { AccessScope } from "@calcom/prisma/enums";

interface CreateAccessCodeInput {
  code: string;
  clientId: string;
  userId?: number;
  teamId?: number;
  scopes: AccessScope[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
}
export class AccessCodeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAccessCodeInput): Promise<void> {
    await this.prisma.accessCode.create({
      data: {
        code: input.code,
        clientId: input.clientId,
        userId: input.userId,
        teamId: input.teamId,
        expiresAt: dayjs().add(10, "minutes").toDate(),
        scopes: input.scopes,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
      },
    });
  }

  async findValidCode(code: string, clientId: string) {
    return this.prisma.accessCode.findFirst({
      where: {
        code,
        clientId,
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
            code,
            clientId,
          },
        ],
      },
    });
  }
}
