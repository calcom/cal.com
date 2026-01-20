import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { credentialForCalendarServiceSelect } from "@calcom/platform-libraries";
import { paymentDataSelect } from "@calcom/platform-libraries";

@Injectable()
export class AtomsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getRawPayment(uid: string) {
    return await this.dbRead.prisma.payment.findFirst({
      where: { uid },
      select: paymentDataSelect,
    });
  }

  async getUserTeams(userId: number) {
    const userTeams = await this.dbRead.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        name: true,
        logoUrl: true,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        parent: {
          select: {
            id: true,
            credentials: {
              select: credentialForCalendarServiceSelect,
            },
            name: true,
            logoUrl: true,
            members: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    return userTeams;
  }
}
