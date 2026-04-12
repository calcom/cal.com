import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@calcom/prisma/client";

const credentialForCalendarRepositorySelect = {
  id: true,
  appId: true,
  type: true,
  userId: true,
  user: {
    select: {
      email: true,
    },
  },
  teamId: true,
  key: true,
  invalid: true,
} satisfies Prisma.CredentialSelect;

@Injectable()
export class CalendarsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getCalendarCredentials(credentialId: number, userId: number) {
    return await this.dbRead.prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId,
      },
      select: {
        ...credentialForCalendarRepositorySelect,
        app: {
          select: {
            slug: true,
            categories: true,
            dirName: true,
          },
        },
      },
    });
  }

  async deleteCredentials(credentialId: number) {
    return await this.dbWrite.prisma.credential.delete({
      where: {
        id: credentialId,
      },
    });
  }
}
