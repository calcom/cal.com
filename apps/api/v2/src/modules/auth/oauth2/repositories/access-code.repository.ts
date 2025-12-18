import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import dayjs from "@calcom/dayjs";
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

@Injectable()
export class AccessCodeRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async create(input: CreateAccessCodeInput): Promise<void> {
    await this.dbWrite.prisma.accessCode.create({
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
    return this.dbRead.prisma.accessCode.findFirst({
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
    await this.dbWrite.prisma.accessCode.deleteMany({
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
